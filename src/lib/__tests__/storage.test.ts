import { fakeBrowser } from '@webext-core/fake-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  migrateRulesStorage,
  normalizeRules,
  RULES_KEY,
  type StoredMatchRule,
} from '$lib/storage'

describe('normalizeRules', () => {
  const base = { from: 'https://a.com/(.*)', to: 'https://b.com/$1' }

  it('leaves active rules without a flag field', () => {
    expect(normalizeRules([base])).toEqual([base])
  })

  it('strips legacy enabled: true', () => {
    expect(normalizeRules([{ ...base, enabled: true }])).toEqual([base])
  })

  it('converts legacy enabled: false to disabled: true', () => {
    expect(normalizeRules([{ ...base, enabled: false }])).toEqual([
      { ...base, disabled: true },
    ])
  })

  it('strips disabled: false', () => {
    expect(normalizeRules([{ ...base, disabled: false }])).toEqual([base])
  })

  it('keeps disabled: true', () => {
    expect(normalizeRules([{ ...base, disabled: true }])).toEqual([
      { ...base, disabled: true },
    ])
  })

  it('prefers the new field over the legacy one when both exist', () => {
    expect(normalizeRules([{ ...base, disabled: true, enabled: true }])).toEqual(
      [{ ...base, disabled: true }],
    )
    expect(
      normalizeRules([{ ...base, disabled: false, enabled: false }]),
    ).toEqual([base])
  })
})

describe('migrateRulesStorage', () => {
  beforeEach(async () => {
    Reflect.set(globalThis, 'browser', fakeBrowser)
    fakeBrowser.reset()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'browser')
    vi.restoreAllMocks()
  })

  it('rewrites legacy rules in both storage areas', async () => {
    const legacy: StoredMatchRule[] = [
      { from: 'https://a.com/(.*)', to: 'https://b.com/$1', enabled: true },
      { from: 'https://c.com/(.*)', to: 'https://d.com/$1', enabled: false },
    ]
    await browser.storage.sync.set({ [RULES_KEY]: legacy })
    await browser.storage.local.set({ [RULES_KEY]: legacy })

    await migrateRulesStorage()

    const expected = [
      { from: 'https://a.com/(.*)', to: 'https://b.com/$1' },
      { from: 'https://c.com/(.*)', to: 'https://d.com/$1', disabled: true },
    ]
    await expect(browser.storage.sync.get(RULES_KEY)).resolves.toEqual({
      [RULES_KEY]: expected,
    })
    await expect(browser.storage.local.get(RULES_KEY)).resolves.toEqual({
      [RULES_KEY]: expected,
    })
  })

  it('does not write when the data is already migrated', async () => {
    await browser.storage.sync.set({
      [RULES_KEY]: [
        { from: 'https://a.com/(.*)', to: 'https://b.com/$1' },
        { from: 'https://c.com/(.*)', to: 'https://d.com/$1', disabled: true },
      ],
    })
    const syncSet = vi.spyOn(browser.storage.sync, 'set')
    const localSet = vi.spyOn(browser.storage.local, 'set')

    await migrateRulesStorage()

    expect(syncSet).not.toHaveBeenCalled()
    expect(localSet).not.toHaveBeenCalled()
  })

  it('is a no-op with empty storage', async () => {
    const syncSet = vi.spyOn(browser.storage.sync, 'set')
    await expect(migrateRulesStorage()).resolves.toBeUndefined()
    expect(syncSet).not.toHaveBeenCalled()
  })
})
