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
import { createAnalyticsPinger } from "@extport/sdk/analytics";

// No extensionId passed — @extport/wxt injects it as globalThis.__EXTPORT__
// in every entrypoint, options.html included. Same storage key as the
// background's own pinger, so this toggle and the daily ping agree without
// any message-passing between contexts.
const analyticsPinger = createAnalyticsPinger();
const analyticsEnabledState = writable(true);
analyticsPinger.getEnabled().then((enabled) => analyticsEnabledState.set(enabled));

export const analyticsEnabled = {
  subscribe: analyticsEnabledState.subscribe,
};

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  await analyticsPinger.setEnabled(enabled);
  analyticsEnabledState.set(enabled);
  // Firefox gates the ping itself on its own technicalAndInteraction
  // permission (checked fresh on every ping, independent of this flag) — a
  // click here is a real user gesture, the only context that permission
  // API accepts a request in, so this is the toggle's one chance to grant
  // it without sending the user to about:addons.
  if (enabled && import.meta.env.FIREFOX) {
    try {
      // `data_collection` is a Firefox 140+ addition to the permissions API
      // not yet in @types/webextension-polyfill — request() typing widened
      // locally rather than waiting on upstream types.
      const request = browser.permissions.request as (permissions: {
        data_collection?: string[];
      }) => Promise<boolean>;
      await request({ data_collection: ["technicalAndInteraction"] });
    } catch {
      // Older Firefox without the data_collection permission key — the
      // manifest-level declaration already governs; nothing to request.
    }
  }
}

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
