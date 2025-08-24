import { matchRule, MatchRule } from './url'

export type CheckResult = {
  status: 'matched' | 'not-matched' | 'circular-redirect' | 'infinite-redirect'
  urls: string[]
}

export async function getEnabledRules() {
  return (
    (
      await browser.storage.sync.get<{
        rules?: MatchRule[]
      }>('rules')
    ).rules ?? []
  ).filter((it) => it.enabled ?? true)
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

  for (let i = 0; i < (options?.maxRedirects ?? 5); i++) {
    const rule = rules
      .filter((rule) => rule.enabled ?? true)
      .find((rule) => matchRule(rule, currentUrl).match)
    if (!rule) {
      // 如果第一条就不匹配，则返回不匹配
      if (i === 0) {
        return { status: 'not-matched', urls: [] }
      }
      // 如果是第二条及之后不匹配，则返回匹配，
      else {
        return { status: 'matched', urls: redirectUrls }
      }
    }
    const result = matchRule(rule, currentUrl)
    // 如果上面找到匹配的规则，但这里不匹配，说明发生了意外情况
    if (!result.match) {
      throw new Error('Unexpected non-match after finding matching rule')
    }
    if (redirectUrls.includes(result.url)) {
      return {
        status: 'circular-redirect',
        urls: [...redirectUrls, result.url],
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
