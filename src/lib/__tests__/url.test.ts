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

describe.skip('glob match', () => {
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

describe.skip('match real rule', () => {
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

describe('should using url params', () => {
  it('url pathname', () => {
    expect(
      matchRule(
        {
          from: 'https://youtu.be/:id',
          to: 'https://www.youtube.com/watch?v={{pathname.groups.id}}',
        },
        'https://youtu.be/sRHOrI59tRQ',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.youtube.com/watch?v=sRHOrI59tRQ',
    })
  })
  it('url query', () => {
    expect(
      matchRule(
        {
          from: 'https://www.google.com/url?q=:url&(.*)',
          to: '{{search.groups.url}}',
        },
        'https://www.google.com/url?q=https://archiveofourown.org/works/46606894&amp;sa=D&amp;source=editors&amp;ust=1730028678389922&amp;usg=AOvVaw0bnG9SKYDnSYYyEmj-X1c-',
      ),
    ).toEqual({
      match: true,
      url: 'https://archiveofourown.org/works/46606894',
    })
  })
  it('duckduckgo', () => {
    expect(
      matchRule(
        {
          from: 'https://duckduckgo.com/?*&q=:id&*',
          to: 'https://www.google.com/search?q={{search.groups.id}}',
        },
        'https://duckduckgo.com/?t=h_&q=js&ia=web',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.google.com/search?q=js',
    })
  })
  it('youtube', () => {
    expect(
      matchRule(
        {
          from: 'https://youtu.be/:id',
          to: 'https://www.youtube.com/watch?v={{pathname.groups.id}}',
        },
        'https://youtu.be/sRHOrI59tRQ',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.youtube.com/watch?v=sRHOrI59tRQ',
    })
  })
})
