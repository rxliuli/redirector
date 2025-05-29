import Mustache from 'mustache'
import 'urlpattern-polyfill'

export interface MatchRule {
  from: string
  to: string
  mode?: 'regex' | 'url-pattern'
  enabled: boolean
}

export interface MatchResult {
  match: boolean
  url: string
}

function enhancedReplace(match: RegExpExecArray, replacement: string) {
  let replaced = replacement
  for (let i = 1; i < match.length; i++) {
    replaced = replaced.replaceAll('$' + i, match[i] ?? '')
  }
  return replaced
}

function isRegexMatch(rule: MatchRule, url: string): MatchResult {
  let regex: RegExp
  try {
    regex = new RegExp(rule.from, 'ig')
  } catch (error) {
    // console.error('Invalid regex', from, error)
    return { match: false, url: url }
  }
  const r = regex.exec(url)
  if (r) {
    return { match: true, url: enhancedReplace(r, rule.to) }
  }
  return { match: false, url: url }
}

function isURLPatternMatch(rule: MatchRule, url: string): MatchResult {
  const r = new URLPattern(rule.from)
  Mustache.escape = (t) => t
  if (r.test(url)) {
    const matched = r.exec(url)
    if (matched?.search.groups) {
      Object.keys(matched?.search.groups).forEach((k) => {
        const value = matched?.search.groups[k]
        if (value) {
          matched.search.groups[k] = decodeURIComponent(value)
        }
      })
    }
    return { match: true, url: Mustache.render(rule.to, matched) }
  }
  return { match: false, url: url }
}

export function matchRule(rule: MatchRule, url: string): MatchResult {
  const list =
    rule.mode === 'regex'
      ? [isRegexMatch]
      : rule.mode === 'url-pattern'
      ? [isURLPatternMatch]
      : [isRegexMatch, isURLPatternMatch]
  for (const fn of list) {
    try {
      const r = fn(rule, url)
      if (r.match) {
        return r
      }
    } catch {}
  }
  return { match: false, url: url }
}
