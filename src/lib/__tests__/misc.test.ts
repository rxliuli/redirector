import { describe, expect, it } from 'vitest'
import { insertAt, moveItem } from '../misc'

describe('moveItem', () => {
  it('moves an item forward, shifting the rules in between', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item backward, shifting the rules in between', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('is a no-op when from and to are the same index', () => {
    const list = ['a', 'b', 'c']
    expect(moveItem(list, 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('returns a new array rather than mutating the input', () => {
    const list = ['a', 'b', 'c']
    const next = moveItem(list, 0, 2)
    expect(next).not.toBe(list)
    expect(list).toEqual(['a', 'b', 'c'])
  })

  it('clamps an out-of-range fromIndex into [0, length - 1]', () => {
    expect(moveItem(['a', 'b', 'c'], 99, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], -5, 0)).toEqual(['a', 'b', 'c'])
  })

  it('clamps an out-of-range toIndex into [0, length - 1]', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b'])
  })

  it('returns an empty array unchanged', () => {
    expect(moveItem([], 0, 1)).toEqual([])
  })
})

describe('insertAt', () => {
  it('inserts at the start', () => {
    expect(insertAt(['a', 'b'], 0, 'x')).toEqual(['x', 'a', 'b'])
  })

  it('inserts in the middle', () => {
    expect(insertAt(['a', 'b', 'c'], 1, 'x')).toEqual(['a', 'x', 'b', 'c'])
  })

  it('inserts at the end when index equals the length', () => {
    expect(insertAt(['a', 'b'], 2, 'x')).toEqual(['a', 'b', 'x'])
  })

  it('clamps an index past the end to the end', () => {
    expect(insertAt(['a', 'b'], 99, 'x')).toEqual(['a', 'b', 'x'])
  })

  it('clamps a negative index to the start', () => {
    expect(insertAt(['a', 'b'], -5, 'x')).toEqual(['x', 'a', 'b'])
  })

  it('works on an empty list', () => {
    expect(insertAt([], 0, 'x')).toEqual(['x'])
  })

  it('returns a new array rather than mutating the input', () => {
    const list = ['a', 'b']
    const next = insertAt(list, 0, 'x')
    expect(next).not.toBe(list)
    expect(list).toEqual(['a', 'b'])
  })
})
