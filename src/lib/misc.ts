export const DEDUPE_WINDOW_MS = 100

/**
 * Returns a copy of `list` with the item at `fromIndex` relocated to
 * `toIndex`. This is a splice-move (items in between shift by one slot),
 * not a swap. Both indexes are clamped to the valid range
 * `[0, list.length - 1]`; an empty list is returned unchanged.
 */
export function moveItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (list.length === 0) {
    return list.slice()
  }
  const maxIndex = list.length - 1
  const from = Math.min(Math.max(fromIndex, 0), maxIndex)
  const to = Math.min(Math.max(toIndex, 0), maxIndex)
  const next = list.slice()
  if (from === to) {
    return next
  }
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}

/**
 * Returns a copy of `list` with `item` inserted at `index`. The index is
 * clamped to `[0, list.length]`, so an out-of-range index appends to the
 * end rather than throwing or being dropped.
 */
export function insertAt<T>(list: T[], index: number, item: T): T[] {
  const clamped = Math.min(Math.max(index, 0), list.length)
  const next = list.slice()
  next.splice(clamped, 0, item)
  return next
}
