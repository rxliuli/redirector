import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureReviewInstallTime,
  getReviewPromptMeta,
  getStoreReviewUrl,
  markReviewDismissed,
  markReviewReviewed,
  recordRedirectSuccess,
  resetReviewThresholdCache,
  REVIEW_MIN_AGE_MS,
  REVIEW_MIN_REDIRECTS,
  REVIEW_SNOOZE_MS,
  REVIEW_STATE_KEY,
  REVIEW_USAGE_KEY,
  snoozeReviewPrompt,
  STORE_REVIEW_URLS,
} from '$lib/review'

describe('review prompt logic', () => {
  const T0 = 1_700_000_000_000

  beforeEach(() => {
    Reflect.set(globalThis, 'browser', fakeBrowser)
    fakeBrowser.reset()
    resetReviewThresholdCache()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'browser')
    vi.restoreAllMocks()
  })

  it('initializes installedAt once and preserves it on subsequent calls', async () => {
    const first = await ensureReviewInstallTime(T0)
    expect(first).toEqual({ installedAt: T0, redirectCount: 0 })

    const second = await ensureReviewInstallTime(T0 + 60_000)
    expect(second).toEqual({ installedAt: T0, redirectCount: 0 })
  })

  it('increments redirectCount up to REVIEW_MIN_REDIRECTS and stops writing afterward', async () => {
    await ensureReviewInstallTime(T0)
    const setSpy = vi.spyOn(browser.storage.local, 'set')

    for (let i = 0; i < REVIEW_MIN_REDIRECTS + 5; i++) {
      await recordRedirectSuccess(T0 + i * 1000)
    }

    expect(setSpy).toHaveBeenCalledTimes(REVIEW_MIN_REDIRECTS)
    const stored = await browser.storage.local.get(REVIEW_USAGE_KEY)
    expect(stored[REVIEW_USAGE_KEY]).toEqual({
      installedAt: T0,
      redirectCount: REVIEW_MIN_REDIRECTS,
    })
  })

  it('stays hidden until both min age and min redirects are met', async () => {
    await ensureReviewInstallTime(T0)

    // Enough age, not enough redirects
    expect(
      await getReviewPromptMeta(T0 + REVIEW_MIN_AGE_MS + 1000),
    ).toMatchObject({ visible: false })

    // Enough redirects, not enough age
    for (let i = 0; i < REVIEW_MIN_REDIRECTS; i++) {
      await recordRedirectSuccess(T0 + i * 1000)
    }
    expect(
      await getReviewPromptMeta(T0 + REVIEW_MIN_AGE_MS - 1000),
    ).toMatchObject({ visible: false })

    // Both met
    expect(await getReviewPromptMeta(T0 + REVIEW_MIN_AGE_MS)).toEqual({
      visible: true,
      canSnooze: true,
      redirectCount: REVIEW_MIN_REDIRECTS,
    })
  })

  it('hides permanently after marking reviewed or dismissed', async () => {
    await browser.storage.local.set({
      [REVIEW_USAGE_KEY]: {
        installedAt: T0,
        redirectCount: REVIEW_MIN_REDIRECTS,
      },
    })

    await markReviewReviewed()
    expect(
      await getReviewPromptMeta(T0 + REVIEW_MIN_AGE_MS * 10),
    ).toMatchObject({ visible: false })

    await browser.storage.sync.remove(REVIEW_STATE_KEY)
    await markReviewDismissed()
    expect(
      await getReviewPromptMeta(T0 + REVIEW_MIN_AGE_MS * 10),
    ).toMatchObject({ visible: false })
  })

  it('supports snoozing once for 14 days and disables further snoozes', async () => {
    const eligibleAt = T0 + REVIEW_MIN_AGE_MS
    await browser.storage.local.set({
      [REVIEW_USAGE_KEY]: {
        installedAt: T0,
        redirectCount: REVIEW_MIN_REDIRECTS,
      },
    })

    await snoozeReviewPrompt(eligibleAt)

    // Hidden during cooldown
    expect(
      await getReviewPromptMeta(eligibleAt + REVIEW_SNOOZE_MS - 1000),
    ).toMatchObject({ visible: false })

    // Visible again after cooldown, without snooze button
    expect(await getReviewPromptMeta(eligibleAt + REVIEW_SNOOZE_MS)).toEqual({
      visible: true,
      canSnooze: false,
      redirectCount: REVIEW_MIN_REDIRECTS,
    })

    // Calling snooze again exceeds max snoozes and permanently dismisses
    await snoozeReviewPrompt(eligibleAt + REVIEW_SNOOZE_MS)
    expect(
      await getReviewPromptMeta(eligibleAt + REVIEW_SNOOZE_MS * 5),
    ).toMatchObject({ visible: false })
  })

  it('returns the right store review URL per browser', () => {
    expect(getStoreReviewUrl({ browserTarget: 'chrome' })).toBe(
      STORE_REVIEW_URLS.chrome,
    )
    expect(getStoreReviewUrl({ browserTarget: 'firefox' })).toBe(
      STORE_REVIEW_URLS.firefox,
    )
    expect(getStoreReviewUrl({ browserTarget: 'safari' })).toBe(
      STORE_REVIEW_URLS.safari,
    )
    expect(
      getStoreReviewUrl({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      }),
    ).toBe(STORE_REVIEW_URLS.edge)
    expect(
      getStoreReviewUrl({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      }),
    ).toBe(STORE_REVIEW_URLS.chrome)
  })
})
