import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from '@webext-core/fake-browser'
import type { MatchRule } from '$lib/url'

describe('setRulesStorageMode', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'browser', fakeBrowser)
    fakeBrowser.reset()
    vi.resetModules()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'browser')
    vi.restoreAllMocks()
  })

  it('switching storage mode migrates rules into the target mode', async () => {
    const storage = await import('$lib/storage')
    const optionsStore = await import('./store')

    const localRule: MatchRule = {
      mode: 'regex',
      from: 'https://example.com/from-local',
      to: 'https://example.com/to-local',
    }

    await storage.writeRulesStorageMode('local')
    await storage.writeRulesToMode('local', [localRule])

    await optionsStore.setRulesStorageMode('sync')

    await expect(storage.readRulesStorageMode()).resolves.toBe('sync')
    await expect(storage.readRulesFromMode('sync')).resolves.toEqual([localRule])
  })
})

describe('addRule', () => {
  const ruleA: MatchRule = { from: 'https://a.example.com', to: 'https://a2.example.com' }
  const ruleB: MatchRule = { from: 'https://b.example.com', to: 'https://b2.example.com' }
  const ruleC: MatchRule = { from: 'https://c.example.com', to: 'https://c2.example.com' }

  beforeEach(() => {
    Reflect.set(globalThis, 'browser', fakeBrowser)
    fakeBrowser.reset()
    vi.resetModules()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'browser')
    vi.restoreAllMocks()
  })

  it('defaults to inserting at the head', async () => {
    const optionsStore = await import('./store')
    // `fakeBrowser.reset()` clears storage, but the store module itself is
    // a singleton reused across tests in this file; force a known starting
    // state explicitly rather than assuming a pristine, uninitialized store.
    await optionsStore.replaceRules([])
    await optionsStore.addRule(ruleA)
    await optionsStore.addRule(ruleB)
    expect(optionsStore.rules.get()).toEqual([ruleB, ruleA])
  })

  it('inserts at the given 0-based position', async () => {
    const optionsStore = await import('./store')
    // Seed with `replaceRules` (fully awaited) rather than `rules.set`
    // (which persists optimistically in the background) so there is no
    // race with the store's own lazy initialization.
    await optionsStore.replaceRules([ruleA, ruleB])
    await optionsStore.addRule(ruleC, 1)
    expect(optionsStore.rules.get()).toEqual([ruleA, ruleC, ruleB])
  })

  it('clamps an out-of-range position to the end', async () => {
    const optionsStore = await import('./store')
    await optionsStore.replaceRules([ruleA, ruleB])
    await optionsStore.addRule(ruleC, 99)
    expect(optionsStore.rules.get()).toEqual([ruleA, ruleB, ruleC])
  })
})

describe('moveRule', () => {
  const ruleA: MatchRule = { from: 'https://a.example.com', to: 'https://a2.example.com' }
  const ruleB: MatchRule = { from: 'https://b.example.com', to: 'https://b2.example.com' }
  const ruleC: MatchRule = { from: 'https://c.example.com', to: 'https://c2.example.com' }

  beforeEach(() => {
    Reflect.set(globalThis, 'browser', fakeBrowser)
    fakeBrowser.reset()
    vi.resetModules()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'browser')
    vi.restoreAllMocks()
  })

  it('moves a rule from one index to another and persists the result', async () => {
    const storage = await import('$lib/storage')
    const optionsStore = await import('./store')
    await optionsStore.replaceRules([ruleA, ruleB, ruleC])
    await optionsStore.moveRule(0, 2)
    expect(optionsStore.rules.get()).toEqual([ruleB, ruleC, ruleA])
    await expect(storage.readActiveRules()).resolves.toEqual([ruleB, ruleC, ruleA])
  })

  it('clamps out-of-range indexes', async () => {
    const optionsStore = await import('./store')
    await optionsStore.replaceRules([ruleA, ruleB, ruleC])
    await optionsStore.moveRule(99, -99)
    expect(optionsStore.rules.get()).toEqual([ruleC, ruleA, ruleB])
  })
})
