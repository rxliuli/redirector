import { test, expect } from './fixtures'

test.describe('Chrome Storage API', () => {
  test('set and get data from chrome.storage.sync', async ({
    serviceWorker,
  }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({ key: 'testValue', count: 42 })
    })

    const data = await serviceWorker.evaluate(async () => {
      const result = await chrome.storage.sync.get(['key', 'count'])
      return result
    })

    expect(data.key).toBe('testValue')
    expect(data.count).toBe(42)
  })

  test('get all data from storage', async ({ serviceWorker }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({
        setting1: 'value1',
        setting2: 'value2',
        enabled: true,
      })
    })

    const allData = await serviceWorker.evaluate(async () => {
      return await chrome.storage.sync.get(null)
    })

    expect(allData).toHaveProperty('setting1', 'value1')
    expect(allData).toHaveProperty('setting2', 'value2')
    expect(allData).toHaveProperty('enabled', true)
  })

  test('remove data from storage', async ({ serviceWorker }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({ toRemove: 'value' })
    })

    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.remove('toRemove')
    })

    const data = await serviceWorker.evaluate(async () => {
      return await chrome.storage.sync.get('toRemove')
    })

    expect(data.toRemove).toBeUndefined()
  })

  test('clear all storage', async ({ serviceWorker }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({ key1: 'value1', key2: 'value2' })
    })

    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.clear()
    })

    const allData = await serviceWorker.evaluate(async () => {
      return await chrome.storage.sync.get(null)
    })

    expect(Object.keys(allData)).toHaveLength(0)
  })

  test('use chrome.storage.local instead', async ({ serviceWorker }) => {
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({ localKey: 'localValue' })
    })

    const data = await serviceWorker.evaluate(async () => {
      return await chrome.storage.local.get('localKey')
    })

    expect(data.localKey).toBe('localValue')
  })

  test('listen to storage changes', async ({ serviceWorker, page }) => {
    await serviceWorker.evaluate(() => {
      ;(globalThis as any).storageChanges = []
      chrome.storage.onChanged.addListener((changes, areaName) => {
        ;(globalThis as any).storageChanges.push({ changes, areaName })
      })
    })

    await serviceWorker.evaluate(async () => {
      await chrome.storage.sync.set({ watchedKey: 'newValue' })
    })

    await page.waitForTimeout(100)

    const changes = await serviceWorker.evaluate(() => {
      return (globalThis as any).storageChanges
    })

    expect(changes).toHaveLength(1)
    expect(changes[0].areaName).toBe('sync')
    expect(changes[0].changes.watchedKey.newValue).toBe('newValue')
  })
})
