import type { MatchRule } from "./url";

export type RulesStorageMode = "sync" | "local";

export const RULES_KEY = "rules";
export const RULES_STORAGE_MODE_KEY = "rules-storage-mode";

// Rules as they may appear in storage or import files. `enabled` is the
// pre-0.18 inverse of `disabled`; exported backups have unbounded lifetime,
// so imports must accept it permanently.
export type StoredMatchRule = MatchRule & { enabled?: boolean };

export function normalizeRules(rules: StoredMatchRule[]): MatchRule[] {
  return rules.map(({ enabled, disabled, ...rule }) =>
    (disabled ?? enabled === false) ? { ...rule, disabled: true } : rule,
  );
}

// One-time rewrite of stored rules into the disabled-field format (0.18).
// Reads normalize in memory either way; this makes the data at rest match.
// Safe to remove once pre-0.18 installs are negligible — normalizeRules
// keeps accepting the legacy field for imports regardless.
export async function migrateRulesStorage(): Promise<void> {
  if (!hasBrowserStorageApi()) {
    return;
  }
  for (const mode of ["sync", "local"] as const) {
    try {
      const result = await getStorageArea(mode).get(RULES_KEY);
      const raw = (result[RULES_KEY] as StoredMatchRule[] | undefined) ?? [];
      const needsRewrite = raw.some(
        (rule) => "enabled" in rule || rule.disabled === false,
      );
      if (needsRewrite) {
        await getStorageArea(mode).set({ [RULES_KEY]: normalizeRules(raw) });
      }
    } catch (error) {
      console.error(`Failed to migrate ${mode} rules storage`, error);
    }
  }
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
    (result[RULES_KEY] as StoredMatchRule[] | undefined) ?? [],
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
