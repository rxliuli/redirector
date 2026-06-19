import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from '@webext-core/fake-browser'
import type { MatchRule } from '$lib/url'

describe('setRulesStorageMode', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'browser', fakeBrowser)
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
      enabled: true,
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
