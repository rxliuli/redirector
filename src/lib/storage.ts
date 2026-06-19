import { MatchRule } from "./url";

export type RulesStorageMode = "sync" | "local";

export const RULES_KEY = "rules";
export const RULES_STORAGE_MODE_KEY = "rules-storage-mode";

export function normalizeRules(rules: MatchRule[]): MatchRule[] {
  return rules.map((rule) => ({ ...rule, enabled: rule.enabled ?? true }));
}

function hasBrowserStorageApi() {
  return typeof browser !== "undefined" && !!browser.storage;
}

export function getStorageArea(mode: RulesStorageMode) {
  return browser.storage[mode];
}

export async function readRulesStorageMode(): Promise<RulesStorageMode> {
  if (!hasBrowserStorageApi()) {
    return "sync";
  }
  const result = await browser.storage.local.get(RULES_STORAGE_MODE_KEY);
  const mode = result[RULES_STORAGE_MODE_KEY];
  return mode === "local" ? "local" : "sync";
}

export async function writeRulesStorageMode(
  mode: RulesStorageMode,
): Promise<void> {
  if (!hasBrowserStorageApi()) {
    return;
  }
  await browser.storage.local.set({ [RULES_STORAGE_MODE_KEY]: mode });
}

export async function readRulesFromMode(
  mode: RulesStorageMode,
): Promise<MatchRule[]> {
  if (!hasBrowserStorageApi()) {
    return [];
  }
  const result = await getStorageArea(mode).get(RULES_KEY);
  return normalizeRules(
    (result[RULES_KEY] as MatchRule[] | undefined) ?? [],
  );
}

export async function writeRulesToMode(
  mode: RulesStorageMode,
  rules: MatchRule[],
): Promise<void> {
  if (!hasBrowserStorageApi()) {
    return;
  }
  await getStorageArea(mode).set({ [RULES_KEY]: normalizeRules(rules) });
}

export async function readActiveRules(): Promise<MatchRule[]> {
  const mode = await readRulesStorageMode();
  return readRulesFromMode(mode);
}
