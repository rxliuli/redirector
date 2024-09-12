import { writable } from 'svelte/store'

export interface Rule {
  from: string
  to: string
}

function createSyncStorage<T>(key: string, initialValue: T) {
  const { subscribe, set, update } = writable<T>(initialValue, () => {
    browser.storage.sync.get(key).then((result) => {
      set(result[key] || initialValue)
    })
  })

  return {
    subscribe,
    set: (value: T) => {
      set(value)
      browser.storage.sync.set({ [key]: value })
    },
    update: (value: T) => {
      update((value) => value)
      browser.storage.sync.set({ [key]: value })
    },
  }
}

export const rules = createSyncStorage<Rule[]>('rules', [])
