import Mustache from 'mustache'
import 'urlpattern-polyfill'

export interface MatchRule {
  from: string
  to: string
}

export interface MatchResult {
  match: boolean
  url: string
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
    return { match: true, url: url.replace(regex, rule.to) }
  }
  return { match: false, url: url }
}

function isGlobMatch(rule: MatchRule, url: string): MatchResult {
  if (!rule.from.includes('*')) {
    return { match: false, url: url }
  }
  const regex = new RegExp(
    rule.from
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('?', '\\?')
      .replaceAll('*', '(.*)'),
  )
  const r = regex.exec(url)
  if (r) {
    return {
      match: true,
      url: rule.to.replaceAll(/\$(\d+)/g, (_s, p1) => {
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

function isURLPatternMatch(rule: MatchRule, url: string): MatchResult {
  const r = new URLPattern(rule.from)
  Mustache.escape = (t) => t
  if (r.test(url)) {
    return { match: true, url: Mustache.render(rule.to, r.exec(url)) }
  }
  return { match: false, url: url }
}

export function matchRule(rule: MatchRule, url: string): MatchResult {
  const list = [isURLPatternMatch, isRegexMatch]
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
