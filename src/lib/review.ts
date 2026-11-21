export const REVIEW_USAGE_KEY = 'review-usage'
export const REVIEW_STATE_KEY = 'review-state'

export const REVIEW_MIN_REDIRECTS = 15
export const REVIEW_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const REVIEW_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
export const REVIEW_MAX_SNOOZES = 1

export const STORE_REVIEW_URLS = {
  chrome:
    'https://chromewebstore.google.com/detail/redirector/lioaeidejmlpffbndjhaameocfldlhin/reviews',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/redirector/jhdjcofnjfeljeekjklhgfmfocfgibmm',
  firefox:
    'https://addons.mozilla.org/en-US/firefox/addon/redirector-url/reviews/',
  safari:
    'https://apps.apple.com/app/url-redirector/id6743197230?action=write-review',
} as const

export const FEEDBACK_URL = 'https://discord.gg/gFhKUthc88'

const EDGE_EXTENSION_ID = 'jhdjcofnjfeljeekjklhgfmfocfgibmm'

export interface ReviewUsage {
  installedAt: number
  redirectCount: number
}

export interface ReviewPromptState {
  status: 'reviewed' | 'dismissed' | 'snoozed'
  snoozedUntil?: number
  snoozeCount?: number
}

export interface ReviewPromptMeta {
  visible: boolean
  canSnooze: boolean
  redirectCount: number
}

let thresholdReachedInSession = false

export function resetReviewThresholdCache() {
  thresholdReachedInSession = false
}

function hasBrowserStorageApi() {
  return typeof browser !== 'undefined' && !!browser.storage
}

async function readReviewUsage(): Promise<ReviewUsage | undefined> {
  if (!hasBrowserStorageApi()) {
    return undefined
  }
  const result = await browser.storage.local.get(REVIEW_USAGE_KEY)
  const raw = result[REVIEW_USAGE_KEY] as Partial<ReviewUsage> | undefined
  if (
    !raw ||
    typeof raw.installedAt !== 'number' ||
    typeof raw.redirectCount !== 'number'
  ) {
    return undefined
  }
  return {
    installedAt: raw.installedAt,
    redirectCount: raw.redirectCount,
  }
}

async function writeReviewUsage(usage: ReviewUsage): Promise<void> {
  if (!hasBrowserStorageApi()) {
    return
  }
  await browser.storage.local.set({ [REVIEW_USAGE_KEY]: usage })
}

async function readReviewState(): Promise<ReviewPromptState | undefined> {
  if (!hasBrowserStorageApi()) {
    return undefined
  }
  try {
    const result = await browser.storage.sync.get(REVIEW_STATE_KEY)
    const raw = result[REVIEW_STATE_KEY] as ReviewPromptState | undefined
    if (raw) {
      return raw
    }
  } catch {
    // Fall back to local storage if sync is unavailable
  }
  const localResult = await browser.storage.local.get(REVIEW_STATE_KEY)
  return localResult[REVIEW_STATE_KEY] as ReviewPromptState | undefined
}

async function writeReviewState(state: ReviewPromptState): Promise<void> {
  if (!hasBrowserStorageApi()) {
    return
  }
  try {
    await browser.storage.sync.set({ [REVIEW_STATE_KEY]: state })
  } catch {
    await browser.storage.local.set({ [REVIEW_STATE_KEY]: state })
  }
}

export async function ensureReviewInstallTime(
  now = Date.now(),
): Promise<ReviewUsage | undefined> {
  if (!hasBrowserStorageApi()) {
    return undefined
  }
  try {
    const existing = await readReviewUsage()
    if (existing) {
      return existing
    }
    const initial: ReviewUsage = { installedAt: now, redirectCount: 0 }
    await writeReviewUsage(initial)
    return initial
  } catch (error) {
    console.error('Failed to initialize review install time', error)
    return undefined
  }
}

let pendingRecord: Promise<void> = Promise.resolve()

export function recordRedirectSuccess(now = Date.now()): Promise<void> {
  if (thresholdReachedInSession || !hasBrowserStorageApi()) {
    return Promise.resolve()
  }
  pendingRecord = pendingRecord
    .then(async () => {
      if (thresholdReachedInSession) {
        return
      }
      const existing = await readReviewUsage()
      if (existing && existing.redirectCount >= REVIEW_MIN_REDIRECTS) {
        thresholdReachedInSession = true
        return
      }
      const next: ReviewUsage = {
        installedAt: existing?.installedAt ?? now,
        redirectCount: (existing?.redirectCount ?? 0) + 1,
      }
      await writeReviewUsage(next)
      if (next.redirectCount >= REVIEW_MIN_REDIRECTS) {
        thresholdReachedInSession = true
      }
    })
    .catch((error) => {
      console.error('Failed to record redirect success', error)
    })
  return pendingRecord
}

export async function getReviewPromptMeta(
  now = Date.now(),
): Promise<ReviewPromptMeta> {
  const hidden: ReviewPromptMeta = {
    visible: false,
    canSnooze: false,
    redirectCount: 0,
  }
  if (!hasBrowserStorageApi()) {
    return hidden
  }
  try {
    const state = await readReviewState()
    if (state?.status === 'reviewed' || state?.status === 'dismissed') {
      return hidden
    }
    if (
      state?.status === 'snoozed' &&
      typeof state.snoozedUntil === 'number' &&
      now < state.snoozedUntil
    ) {
      return hidden
    }
    const usage = await ensureReviewInstallTime(now)
    if (!usage) {
      return hidden
    }
    const eligible =
      usage.redirectCount >= REVIEW_MIN_REDIRECTS &&
      now - usage.installedAt >= REVIEW_MIN_AGE_MS
    const snoozeCount = state?.snoozeCount ?? 0
    return {
      visible: eligible,
      canSnooze: snoozeCount < REVIEW_MAX_SNOOZES,
      redirectCount: usage.redirectCount,
    }
  } catch (error) {
    console.error('Failed to check review prompt eligibility', error)
    return hidden
  }
}

export async function markReviewReviewed(): Promise<void> {
  await writeReviewState({ status: 'reviewed' })
}

export async function markReviewDismissed(): Promise<void> {
  await writeReviewState({ status: 'dismissed' })
}

export async function snoozeReviewPrompt(now = Date.now()): Promise<void> {
  const existing = await readReviewState()
  const nextCount = (existing?.snoozeCount ?? 0) + 1
  if (nextCount > REVIEW_MAX_SNOOZES) {
    await writeReviewState({ status: 'dismissed', snoozeCount: nextCount })
    return
  }
  await writeReviewState({
    status: 'snoozed',
    snoozedUntil: now + REVIEW_SNOOZE_MS,
    snoozeCount: nextCount,
  })
}

export function getStoreReviewUrl(options?: {
  browserTarget?: 'chrome' | 'edge' | 'firefox' | 'safari'
  userAgent?: string
  runtimeId?: string
}): string {
  if (options?.browserTarget) {
    return STORE_REVIEW_URLS[options.browserTarget]
  }
  if (import.meta.env.FIREFOX) {
    return STORE_REVIEW_URLS.firefox
  }
  if (import.meta.env.SAFARI) {
    return STORE_REVIEW_URLS.safari
  }
  const runtimeId =
    options?.runtimeId ??
    (typeof browser !== 'undefined' ? browser.runtime?.id : undefined)
  const ua =
    options?.userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  if (runtimeId === EDGE_EXTENSION_ID || /\bEdg\//.test(ua)) {
    return STORE_REVIEW_URLS.edge
  }
  return STORE_REVIEW_URLS.chrome
}
