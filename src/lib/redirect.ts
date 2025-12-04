import { checkRuleChain } from './check'
import { MatchRule } from './url'

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

export function getRedirectUrl(url: string) {
  const r = checkRuleChain(store.rules, url)
  if (r.status === 'matched') {
    return {
      redirectUrl: r.urls[r.urls.length - 1],
    }
  }
  console.error(`No matching rule for url: ${url}, status: ${r.status}`)
  return {}
}
