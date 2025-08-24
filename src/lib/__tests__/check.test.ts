import { describe, expect, it, vi } from 'vitest'
import { checkRuleChain } from '../check'
import { MatchRule } from '../url'

describe('checkRule', () => {
  it('valid rule', async () => {
    const rule: MatchRule = {
      from: '^https://duckduckgo.com/\\?.*&q=(.*?)(&.*)?$',
      to: 'https://www.google.com/search?q=$1',
    }
    const result = checkRuleChain(
      [rule],
      'https://duckduckgo.com/?t=h_&q=js&ia=web',
    )
    expect(result).toEqual({
      status: 'matched',
      urls: ['https://www.google.com/search?q=js'],
    })
  })
  it('no match', () => {
    const rule: MatchRule = {
      from: 'https://www.reddit.com/r/(.*?)/',
      to: 'https://www.reddit.com/r/$1/top/',
    }

    const result = checkRuleChain([rule], 'https://www.google.com/')
    expect(result).toEqual({
      status: 'not-matched',
      urls: [],
    })
  })

  it('infinite redirect', async () => {
    const rule: MatchRule = {
      from: 'https://www.reddit.com/r/(.*)/',
      to: 'https://www.reddit.com/r/$1/top/',
    }
    const url = 'https://www.reddit.com/r/MadeMeSmile/'
    const result = checkRuleChain([rule], url)
    expect(result).toEqual({
      status: 'infinite-redirect',
      urls: [
        url + 'top/',
        url + 'top/'.repeat(2),
        url + 'top/'.repeat(3),
        url + 'top/'.repeat(4),
        url + 'top/'.repeat(5),
      ],
    })
  })
  it('self-redirect', () => {
    const rule: MatchRule = {
      from: '(.*)',
      to: '$1',
    }

    const result = checkRuleChain([rule], 'https://example.com/')
    expect(result).toEqual({
      status: 'circular-redirect',
      urls: ['https://example.com/', 'https://example.com/'],
    })
  })
  it('circular redirect in chain', () => {
    const rules: MatchRule[] = [
      {
        from: 'https://a.com/(.*)',
        to: 'https://b.com/$1',
      },
      {
        from: 'https://b.com/(.*)',
        to: 'https://c.com/$1',
      },
      {
        from: 'https://c.com/(.*)',
        to: 'https://a.com/$1',
      },
    ]

    const result = checkRuleChain(rules, 'https://a.com/test')
    expect(result.status).toBe('circular-redirect')
    expect(result.urls).toEqual([
      'https://b.com/test',
      'https://c.com/test',
      'https://a.com/test',
      'https://b.com/test',
    ])
  })
})

describe('Real-world', () => {
  it('Reddit example: problematic rule /r/subreddit/ to /r/subreddit/top/', () => {
    const rule: MatchRule = {
      from: 'https://www.reddit.com/r/(.*?)/',
      to: 'https://www.reddit.com/r/$1/top/',
    }

    const result = checkRuleChain(
      [rule],
      'https://www.reddit.com/r/MadeMeSmile/',
    )
    expect(result).toEqual({
      status: 'circular-redirect',
      urls: [
        'https://www.reddit.com/r/MadeMeSmile/top/',
        'https://www.reddit.com/r/MadeMeSmile/top/',
      ],
    })
  })

  it('Reddit example: correct rule /r/subreddit/ to /r/subreddit/top/', () => {
    // 修正后的规则，避免循环
    const rule: MatchRule = {
      from: 'https://www.reddit.com/r/([^/]+)/$',
      to: 'https://www.reddit.com/r/$1/top/',
    }

    // 测试基本重定向
    expect(
      checkRuleChain([rule], 'https://www.reddit.com/r/MadeMeSmile/'),
    ).toEqual({
      status: 'matched',
      urls: ['https://www.reddit.com/r/MadeMeSmile/top/'],
    })
  })

  it('YouTube shortener example', () => {
    const rule: MatchRule = {
      from: 'https://youtu.be/(.*)',
      to: 'https://www.youtube.com/watch?v=$1',
    }

    expect(checkRuleChain([rule], 'https://youtu.be/dQw4w9WgXcQ')).toEqual({
      status: 'matched',
      urls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    })
  })

  it('Reddit email notification example', () => {
    const pathname =
      'https://www.reddit.com/r/chrome/comments/1mr4kcr/why_is_chrome_listing_my_extensions_at_the_bottom/n9oca19/?%24deep_link=true&ref=email_comment_reply&ref_campaign=email_comment_reply'
    const url =
      'https://click.redditmail.com/CL0/' + encodeURIComponent(pathname)

    const rule1: MatchRule = {
      from: '(https://www.reddit.com/r/.*/comments/.*)\\?.*&ref=email_comment_reply&.*',
      to: '$1',
    }
    const rule2: MatchRule = {
      from: 'https://click.redditmail.com/CL0/(.*)',
      to: '$1',
    }
    const result = checkRuleChain([rule1, rule2], url)
    expect(result).toEqual({
      status: 'matched',
      urls: [
        'https://www.reddit.com/r/chrome/comments/1mr4kcr/why_is_chrome_listing_my_extensions_at_the_bottom/n9oca19/?%24deep_link=true&ref=email_comment_reply&ref_campaign=email_comment_reply',
        'https://www.reddit.com/r/chrome/comments/1mr4kcr/why_is_chrome_listing_my_extensions_at_the_bottom/n9oca19/',
      ],
    })
  })
})
