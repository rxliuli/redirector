import { matchRule, MatchRule } from './url'

export const store = {
  rules: [] as MatchRule[],
  redirected: new Map<
    string,
    {
      count: number
      timestamp: number
    }
  >(),
}

export function getRedirectUrl(tabId: number, url: string) {
  const rule = store.rules
    .filter((rule) => rule.enabled ?? true)
    .find((rule) => matchRule(rule, url).match)
  if (!rule) {
    return {}
  }
  const data = store.redirected.get(url)
  if (!data || Date.now() - data.timestamp > 3000) {
    store.redirected.set(url, { count: 1, timestamp: Date.now() })
  } else {
    data.count++
    store.redirected.set(url, data)
    if (data.count >= 3) {
      console.error(
        `Circular redirect detection: url ${url} has reached the maximum number of redirects, rule: ${JSON.stringify(
          rule,
        )}`,
      )
      return {}
    }
  }
  const redirectUrl = matchRule(rule, url).url
  if (redirectUrl === url) {
    return {}
  }
  console.log(
    '[webRequest] Redirecting from',
    url,
    'to',
    rule.to,
    'redirectUrl',
    redirectUrl,
  )
  return { redirectUrl }
}
