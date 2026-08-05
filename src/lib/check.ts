import { matchRule, type MatchResult, type MatchRule } from './url'

export type CheckResult = {
  status:
    | 'matched'
    | 'not-matched'
    | 'excluded'
    | 'circular-redirect'
    | 'infinite-redirect'
  urls: string[]
}

export interface CheckOptions {
  maxRedirects: number
}

export function checkRuleChain(
  rules: MatchRule[],
  url: string,
  options?: CheckOptions,
): CheckResult {
  const redirectUrls: string[] = []
  let currentUrl = url
  const enabledRules = rules.filter((rule) => !rule.disabled)

  for (let i = 0; i < (options?.maxRedirects ?? 5); i++) {
    let excluded = false
    let result: MatchResult | undefined
    for (const rule of enabledRules) {
      const r = matchRule(rule, currentUrl)
      if (r.match) {
        result = r
        break
      }
      if (r.excluded) {
        excluded = true
      }
    }
    if (!result) {
      // 如果第一条就不匹配，则返回不匹配（区分被 exclude 拦截的情况）
      if (i === 0) {
        return { status: excluded ? 'excluded' : 'not-matched', urls: [] }
      }
      // 如果是第二条及之后不匹配，则返回匹配，
      else {
        return { status: 'matched', urls: redirectUrls }
      }
    }
    // 幂等：规则匹配了，但 URL 没变化，这是终止点
    if (currentUrl === result.url && result.url !== url) {
      return { status: 'matched', urls: redirectUrls }
    }
    if (redirectUrls.includes(result.url)) {
      return {
        status: 'circular-redirect',
        urls: redirectUrls,
      }
    }
    redirectUrls.push(result.url)
    currentUrl = result.url
  }

  // 如果循环结束，则视为无限重定向
  return {
    status: 'infinite-redirect',
    urls: redirectUrls,
  }
}
