import {
	migrateRulesStorage,
	normalizeRules,
	readRulesFromMode,
	readRulesStorageMode,
	type RulesStorageMode,
	writeRulesStorageMode,
	writeRulesToMode,
} from "$lib/storage";
import type { MatchRule } from "$lib/url";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_QUOTA_EXCEEDED_RE = /quota/i;

function createStore<T>(initial: T) {
	let value = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => value,
		set(next: T) {
			value = next;
			listeners.forEach((listener) => listener());
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

const rulesStorageModeState = createStore<RulesStorageMode>("sync");
const rulesState = createStore<MatchRule[]>([]);

let initialized = false;
let loadingPromise: Promise<void> | undefined;

async function ensureInitialized() {
	if (initialized) {
		return;
	}
	if (loadingPromise) {
		return loadingPromise;
	}
	loadingPromise = (async () => {
		// Idempotent; also runs in the background at startup. Called here too
		// in case the options page beats the background service worker to it.
		await migrateRulesStorage();
		const mode = await readRulesStorageMode();
		rulesStorageModeState.set(mode);
		rulesState.set(await readRulesFromMode(mode));
		initialized = true;
	})().finally(() => {
		loadingPromise = undefined;
	});
	return loadingPromise;
}

async function persistRules(nextRules: MatchRule[]) {
	await ensureInitialized();
	const mode = rulesStorageModeState.get();
	const normalized = normalizeRules(nextRules);
	await writeRulesToMode(mode, normalized);
	return normalized;
}

export function isStorageQuotaExceededError(error: unknown): boolean {
	if (error instanceof Error) {
		return STORAGE_QUOTA_EXCEEDED_RE.test(error.message);
	}
	if (typeof error === "string") {
		return STORAGE_QUOTA_EXCEEDED_RE.test(error);
	}
	return false;
}

export async function setRulesStorageMode(
	mode: RulesStorageMode,
): Promise<void> {
	await ensureInitialized();
	const previousMode = rulesStorageModeState.get();
	if (previousMode === mode) {
		return;
	}
	const currentRules = await readRulesFromMode(previousMode);
	await writeRulesToMode(mode, currentRules);
	await writeRulesStorageMode(mode);
	rulesStorageModeState.set(mode);
	rulesState.set(currentRules);
}

// Optimistic writer: updates the in-memory state synchronously and persists
// in the background; the Dataset tests rely on the synchronous update.
export const rules = {
	get: rulesState.get,
	set(value: MatchRule[]) {
		const normalized = normalizeRules(value);
		rulesState.set(normalized);
		void persistRules(normalized).catch((error) => {
			console.error("Failed to persist rules", error);
		});
	},
	update(updater: (value: MatchRule[]) => MatchRule[]) {
		rules.set(updater(rulesState.get()));
	},
};

export async function addRule(rule: MatchRule): Promise<void> {
	await ensureInitialized();
	const normalized = await persistRules([rule, ...rulesState.get()]);
	rulesState.set(normalized);
}

export async function replaceRules(nextRules: MatchRule[]): Promise<void> {
	const normalized = await persistRules(nextRules);
	rulesState.set(normalized);
}

export function useRules(): MatchRule[] {
	useEffect(() => {
		ensureInitialized().catch((error) => {
			console.error("Failed to initialize rules store", error);
		});
	}, []);
	return useSyncExternalStore(rulesState.subscribe, rulesState.get);
}

export function useRulesStorageMode(): RulesStorageMode {
	return useSyncExternalStore(
		rulesStorageModeState.subscribe,
		rulesStorageModeState.get,
	);
}
