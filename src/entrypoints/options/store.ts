import { MatchRule } from '$lib/url'
import { writable } from 'svelte/store'

function createSyncStorage<T>(
  key: string,
  initialValue: T,
  transform?: (value: T) => T,
) {
  const { subscribe, set, update } = writable<T>(initialValue, () => {
    browser.storage.sync.get(key).then((result) => {
      set(
        transform
          ? transform(result[key] as T || initialValue)
          : result[key] as T || initialValue,
      )
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

export const rules = createSyncStorage<MatchRule[]>('rules', [], (value) =>
  value.map((rule) => ({ ...rule, enabled: rule.enabled ?? true })),
)
