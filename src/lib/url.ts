import 'urlpattern-polyfill'

export interface MatchRule {
  from: string
  to: string
  mode?: 'regex' | 'url-pattern'
  enabled?: boolean
}

export interface MatchResult {
  match: boolean
  url: string
}

const pipeFunctions: Record<string, (value: string) => string> = {
  decodeURIComponent: (value: string) => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  },
  atob: (value: string) => {
    try {
      return atob(value)
    } catch {
      return value
    }
  },
}

function templateReplace(
  template: string,
  getValue: (path: string) => string | undefined,
): string {
  return template.replace(
    /\{\{\s*([\w.$]+)\s*(?:\|\s*([\w|\s]+?)\s*)?\}\}/g,
    (fullMatch, path, pipelineStr) => {
      let value = getValue(path)

      if (value === undefined) {
        return fullMatch
      }

      if (pipelineStr) {
        const pipeNames = pipelineStr
          .split('|')
          .map((name: string) => name.trim())
        for (const pipeName of pipeNames) {
          if (pipeFunctions[pipeName]) {
            value = pipeFunctions[pipeName](value)
          }
        }
      }

      return value
    },
  )
}

function isRegexMatch(rule: MatchRule, url: string): MatchResult {
  let regex: RegExp
  try {
    regex = new RegExp(rule.from, 'ig')
  } catch (error) {
    return { match: false, url: url }
  }
  const r = regex.exec(url)
  if (r) {
    let replaced = rule.to

    replaced = templateReplace(replaced, (path) => {
      if (path.startsWith('$')) {
        const groupNum = parseInt(path.substring(1))
        return r[groupNum] ?? undefined
      }
      return undefined
    })

    for (let i = 1; i < r.length; i++) {
      replaced = replaced.replaceAll('$' + i, r[i] ?? '')
    }

    return { match: true, url: replaced }
  }
  return { match: false, url: url }
}

function isURLPatternMatch(rule: MatchRule, url: string): MatchResult {
  const r = new URLPattern(rule.from)
  if (r.test(url)) {
    const matched = r.exec(url)!

    const replaced = templateReplace(rule.to, (path) => {
      const parts = path.split('.')
      let value: any = matched

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part]
        } else {
          return undefined
        }
      }

      if (typeof value !== 'string') {
        return undefined
      }

      return value
    })

    return { match: true, url: replaced }
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
