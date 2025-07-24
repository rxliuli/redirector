import { matchRule } from '$lib/url'

export default defineBackground(() => {
  interface Rule {
    from: string
    to: string
    enabled?: boolean
  }

  let rules: Rule[] = []

  browser.storage.sync.get('rules').then((data: { rules?: Rule[] }) => {
    rules = data.rules || []
  })

  browser.storage.sync.onChanged.addListener((changes) => {
    if (changes.rules) {
      rules = changes.rules.newValue as Rule[]
    }
  })

  const redirected = new Map<
    string,
    {
      count: number
      timestamp: number
    }
  >()

  function getRedirectUrl(tabId: number, url: string) {
    const rule = rules.filter((rule) => rule.enabled ?? true).find((rule) => matchRule(rule, url).match)
    if (!rule) {
      return {}
    }
    const data = redirected.get(url)
    if (!data || Date.now() - data.timestamp > 3000) {
      redirected.set(url, { count: 1, timestamp: Date.now() })
    } else {
      data.count++
      redirected.set(url, data)
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

  async function handleRedirect(details: {
    tabId: number
    url?: string
  }): Promise<{
    redirectUrl?: string
  }> {
    if (details.tabId === -1 || !details.url) {
      return {}
    }
    const { redirectUrl } = getRedirectUrl(details.tabId, details.url)
    if (!redirectUrl) {
      return {}
    }
    await browser.tabs.update(details.tabId, { url: redirectUrl })
    return { redirectUrl }
  }

  if (!import.meta.env.SAFARI) {
    // TODO: https://developer.apple.com/forums/thread/735111
    browser.webRequest.onBeforeRequest.addListener(
      async (details) => {
        return handleRedirect(details)
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    // TODO: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility#:~:text=onHistoryStateUpdated
    browser.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
      await handleRedirect(details)
    })
  } else {
    browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
      await handleRedirect(details)
    })
    browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
      await handleRedirect({
        tabId,
        url: tab.url,
      })
    })
  }

  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
