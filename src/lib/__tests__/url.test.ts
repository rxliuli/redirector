import { matchRule } from '../url'
import { describe, expect, it } from 'vitest'

describe('regex match', () => {
  it('should match rule', () => {
    expect(
      matchRule(
        {
          from: '^https://duckduckgo.com/\\?.*&q=(.*?)(&.*)?$',
          to: 'https://www.google.com/search?q=$1',
        },
        'https://duckduckgo.com/?t=h_&q=js&ia=web',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.google.com/search?q=js',
    })
  })

  it('should not match rule', () => {
    expect(
      matchRule(
        {
          from: '^https://duckduckgo.com/\\?.*&q=(.*?)(&.*)?$',
          to: 'https://www.google.com/search?q=$1',
        },
        'https://duckduckgo.com/?q=js&ia=web',
      ),
    ).toEqual({
      match: false,
      url: 'https://duckduckgo.com/?q=js&ia=web',
    })
  })
})

describe('glob match', () => {
  it('should match rule', () => {
    expect(
      matchRule(
        {
          from: 'https://duckduckgo.com/?*&q=*&*',
          to: 'https://www.google.com/search?q=$2',
        },
        'https://duckduckgo.com/?t=h_&q=js&ia=web',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.google.com/search?q=js',
    })
  })
  it('should not match rule', () => {
    expect(
      matchRule(
        {
          from: 'https://duckduckgo.com/?*&q=*&*',
          to: 'https://www.google.com/search?q=$2',
        },
        'https://duckduckgo.com/?q=js&ia=web',
      ),
    ).toEqual({
      match: false,
      url: 'https://duckduckgo.com/?q=js&ia=web',
    })
  })
})

describe('match real rule', () => {
  it('youtube', () => {
    expect(
      matchRule(
        {
          from: 'https://youtu.be/*',
          to: 'https://www.youtube.com/watch?v=$1',
        },
        'https://youtu.be/sRHOrI59tRQ',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.youtube.com/watch?v=sRHOrI59tRQ',
    })
  })
})
