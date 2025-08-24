import { MatchRule, matchRule } from '../url'
import { describe, expect, it } from 'vitest'

describe('regex match', () => {
  it('should match rule', () => {
    expect(
      matchRule(
        {
          from: '^https://duckduckgo.com/\\?.*&q=(.*?)(&.*)?$',
          to: 'https://www.google.com/search?q=$1',
          enabled: true,
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
          enabled: true,
        },
        'https://duckduckgo.com/?q=js&ia=web',
      ),
    ).toEqual({
      match: false,
      url: 'https://duckduckgo.com/?q=js&ia=web',
    })
  })

  it('should auto decode url', () => {
    const params = 'https://www.reddit.com/r/chrome/comments/1mr4kcr'
    const url = 'https://click.redditmail.com/CL0/' + encodeURIComponent(params)
    const rule: MatchRule = {
      mode: 'regex',
      from: 'https://click.redditmail.com/CL0/(.*)',
      to: '$1',
    }
    const r = matchRule(rule, url)
    expect(r.url).eq(params)
  })
})

describe('match real rule', () => {
  it('youtube', () => {
    expect(
      matchRule(
        {
          from: 'https://youtu.be/(.*)',
          to: 'https://www.youtube.com/watch?v=$1',
          enabled: true,
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
  it('google docs', () => {
    const rule: MatchRule = {
      from: 'https:\\/\\/www.google.com\\/url\\?q=(((?!google.com).)*?)&.*',
      to: '$1',
    }
    expect(
      matchRule(
        rule,
        'https://www.google.com/url?q=https://www.google.com/url?q%3Dhttps://archiveofourown.org/works/46606894%26amp;sa%3DD%26amp;source%3Deditors%26amp;ust%3D1730032801876547%26amp;usg%3DAOvVaw1sQgvzpIHgk4ky36GUr0Qg&sa=D&source=docs&ust=1730032804915522&usg=AOvVaw0EzJyyDgDMcHFs2nxdHMBo',
      ).match,
    ).false
    expect(
      matchRule(
        rule,
        'https://www.google.com/url?q=https://archiveofourown.org/works/46606894&amp;sa=D&amp;source=editors&amp;ust=1730028678389922&amp;usg=AOvVaw0bnG9SKYDnSYYyEmj-X1c-',
      ),
    ).toEqual({
      match: true,
      url: 'https://archiveofourown.org/works/46606894',
    })
  })
  it('decode url', () => {
    const rule: MatchRule = {
      from: 'https://link.zhihu.com/?target=:url',
      to: '{{search.groups.url}}',
    }
    expect(
      matchRule(
        rule,
        'https://link.zhihu.com/?target=https%3A//www.fanfiction.net/s/7406866/1/To-the-Stars',
      ),
    ).toEqual({
      match: true,
      url: 'https://www.fanfiction.net/s/7406866/1/To-the-Stars',
    })
  })
  it('nested url', () => {
    const rule: MatchRule = {
      from: 'https://www.google.com/url?q=:url&*',
      to: '{{search.groups.url}}',
    }
    let url =
      'https://www.google.com/url?q=https://www.google.com/url?q%3Dhttps://archiveofourown.org/works/46606894%26amp;sa%3DD%26amp;source%3Deditors%26amp;ust%3D1730032801876547%26amp;usg%3DAOvVaw1sQgvzpIHgk4ky36GUr0Qg&sa=D&source=docs&ust=1730032804915522&usg=AOvVaw0EzJyyDgDMcHFs2nxdHMBo'

    expect(matchRule(rule, url)).toEqual({
      match: true,
      url: new URL(url).searchParams.get('q'),
    })
    url = new URL(url).searchParams.get('q')!
    expect(matchRule(rule, url)).toEqual({
      match: true,
      url: new URL(url).searchParams.get('q'),
    })
  })
  it('regex match first', () => {
    const rule: MatchRule = {
      from: 'https://www.bilibili.com/video/(.+?)\\?',
      to: 'https://www.bilibili.com/video/$1',
    }
    expect(
      matchRule(rule, 'https://www.bilibili.com/video/BV1Qy4y1o71y?test=123'),
    ).toEqual({
      match: true,
      url: 'https://www.bilibili.com/video/BV1Qy4y1o71y',
    })
    expect(
      matchRule(rule, 'https://www.bilibili.com/video/BV1Qy4y1o71y'),
    ).toEqual({
      match: true,
      url: 'https://www.bilibili.com/video/$1',
    })
    expect(
      matchRule(
        {
          ...rule,
          mode: 'regex',
        },
        'https://www.bilibili.com/video/BV1Qy4y1o71y',
      ),
    ).toEqual({
      match: false,
      url: 'https://www.bilibili.com/video/BV1Qy4y1o71y',
    })
  })
})

describe('capture group replacement in regex', () => {
  // revert https://github.com/rxliuli/redirector/issues/17#issuecomment-3194934103
  it.skip('should replace single capture group in regex', () => {
    const rule: MatchRule = {
      from: '(#43poj5)',
      to: 'newsite.com/$1',
      mode: 'regex',
      enabled: true,
    }
    expect(matchRule(rule, '#43poj5')).toEqual({
      match: true,
      url: 'https://newsite.com/#43poj5',
    })
  })
  it('should replace multiple capture groups in regex', () => {
    const rule: MatchRule = {
      from: 'https://example.com/(\\w+)/(\\d+)',
      to: 'https://newsite.com/$1?id=$2',
      mode: 'regex',
      enabled: true,
    }
    expect(matchRule(rule, 'https://example.com/user/12345')).toEqual({
      match: true,
      url: 'https://newsite.com/user?id=12345',
    })
  })
  it('should support custom protocol', () => {
    expect(
      matchRule(
        {
          from: '^https://duckduckgo.com/\\?.*&q=(.*?)(&.*)?$',
          to: 'custom://www.google.com/search?q=$1',
          enabled: true,
        },
        'https://duckduckgo.com/?t=h_&q=js&ia=web',
      ),
    ).toEqual({
      match: true,
      url: 'custom://www.google.com/search?q=js',
    })
  })
})

// https://github.com/rxliuli/redirector/issues/17#issuecomment-3194934103
describe('fixed 17', () => {
  it('include protocol of url from', () => {
    const rule: MatchRule = {
      mode: 'regex',
      from: '(^https://static-cdn\\.jtvnw\\.net/emoticons/(?:[^/]+/)*)(?:dark/[1-4]|light/[1-3]).0$',
      to: '$1light/4.0',
    }
    const r = matchRule(
      rule,
      'https://static-cdn.jtvnw.net/emoticons/v2/521050/default/light/1.0',
    )
    expect(r.match).true
    expect(r.url).eq(
      'https://static-cdn.jtvnw.net/emoticons/v2/521050/default/light/4.0',
    )
  })
})

describe('url-pattern', () => {
  it('should encode URL correctly', () => {
    const params = 'https://www.reddit.com/r/chrome/comments/1mr4kcr'
    const url = 'https://click.redditmail.com/CL0/' + encodeURIComponent(params)
    const rule: MatchRule = {
      mode: 'url-pattern',
      from: 'https://click.redditmail.com/CL0/*',
      to: '{{pathname.groups.0}}',
    }
    const r = matchRule(rule, url)
    expect(r.url).eq(params)
  })
})

// https://github.com/rxliuli/redirector/issues/18
describe('fixed 18', () => {
  it('should handle URL with query parameters', () => {
    const rule: MatchRule = {
      mode: 'regex',
      from: '^https://(a|b)(-c)?.test.com',
      to: 'https://d$2.test.com/$1',
    }
    const r = matchRule(rule, 'https://a.test.com')
    expect(r.url).eq('https://d.test.com/a')
  })
})
