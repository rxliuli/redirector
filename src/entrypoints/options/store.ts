import {
  normalizeRules,
  readRulesFromMode,
  readRulesStorageMode,
  type RulesStorageMode,
  writeRulesStorageMode,
  writeRulesToMode,
} from "$lib/storage";
import { MatchRule } from "$lib/url";
import { get, writable } from "svelte/store";

const STORAGE_QUOTA_EXCEEDED_RE = /quota/i;

const rulesStorageModeState = writable<RulesStorageMode>("sync");
const rulesState = writable<MatchRule[]>([]);

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
  const mode = get(rulesStorageModeState);
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

export const rulesStorageMode = {
  subscribe: rulesStorageModeState.subscribe,
};

export async function setRulesStorageMode(
  mode: RulesStorageMode,
): Promise<void> {
  await ensureInitialized();
  const previousMode = get(rulesStorageModeState);
  if (previousMode === mode) {
    return;
  }
  const currentRules = await readRulesFromMode(previousMode);
  await writeRulesToMode(mode, currentRules);
  await writeRulesStorageMode(mode);
  rulesStorageModeState.set(mode);
  rulesState.set(currentRules);
}

export const rules = {
  subscribe(run: (value: MatchRule[]) => void) {
    ensureInitialized().catch((error) => {
      console.error("Failed to initialize rules store", error);
    });
    return rulesState.subscribe(run);
  },
  set(value: MatchRule[]) {
    const normalized = normalizeRules(value);
    rulesState.set(normalized);
    void persistRules(normalized).catch((error) => {
      console.error("Failed to persist rules", error);
    });
  },
  update(updater: (value: MatchRule[]) => MatchRule[]) {
    const nextValue = updater(get(rulesState));
    rules.set(nextValue);
  },
};

export async function addRule(rule: MatchRule): Promise<void> {
  await ensureInitialized();
  const normalized = await persistRules([rule, ...get(rulesState)]);
  rulesState.set(normalized);
}

export async function replaceRules(nextRules: MatchRule[]): Promise<void> {
  const normalized = await persistRules(nextRules);
  rulesState.set(normalized);
}
