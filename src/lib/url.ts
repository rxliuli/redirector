import Mustache from 'mustache'
import 'urlpattern-polyfill'

export interface MatchResult {
  match: boolean
  url: string
}

function isRegexMatch(from: string, to: string, url: string): MatchResult {
  let regex: RegExp
  try {
    regex = new RegExp(from, 'ig')
  } catch (error) {
    // console.error('Invalid regex', from, error)
    return { match: false, url: url }
  }
  const r = regex.exec(url)
  if (r) {
    return { match: true, url: url.replace(regex, to) }
  }
  return { match: false, url: url }
}

function isGlobMatch(from: string, to: string, url: string): MatchResult {
  if (!from.includes('*')) {
    return { match: false, url: url }
  }
  const regex = new RegExp(
    from
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('?', '\\?')
      .replaceAll('*', '(.*)'),
  )
  const r = regex.exec(url)
  if (r) {
    return {
      match: true,
      url: to.replaceAll(/\$(\d+)/g, (_s, p1) => {
        const i = Number.parseInt(p1)
        if (r[i]) {
          return r[i]
        }
        return ''
      }),
    }
  }
  return { match: false, url: url }
}

function isURLPatternMatch(
  pattern: string,
  to: string,
  url: string,
): MatchResult {
  const r = new URLPattern(pattern)
  Mustache.escape = (t) => t
  if (r.test(url)) {
    return { match: true, url: Mustache.render(to, r.exec(url)) }
  }
  return { match: false, url: url }
}

export function matchRule(
  rule: {
    from: string
    to: string
  },
  url: string,
): MatchResult {
  const list = [isURLPatternMatch, isRegexMatch]
  for (const fn of list) {
    try {
      const r = fn(rule.from, rule.to, url)
      if (r.match) {
        return r
      }
    } catch {}
  }
  return { match: false, url: url }
}
