import { matchRule } from '$lib/url'

export default defineBackground(() => {
  interface Rule {
    from: string
    to: string
  }

  let rules: Rule[] = []

  browser.storage.sync.get('rules').then((data) => {
    rules = data.rules || []
    console.log('Rules', rules)
  })

  browser.storage.sync.onChanged.addListener((changes) => {
    if (changes.rules) {
      rules = changes.rules.newValue
    }
  })

  const extensionRedirects = new Map<number, boolean>()
  const redirectCounts = new Map<number, number>()

  function getRedirectUrl(tabId: number, url: string) {
    const rule = rules.find((rule) => matchRule(rule, url).match)
    if (!rule) {
      return {}
    }
    const currentCount = redirectCounts.get(tabId) ?? 0
    if (currentCount >= 5) {
      console.error(
        `Circular redirect detection: tab ${url} has reached the maximum number of redirects, rule: ${JSON.stringify(
          rule,
        )}`,
      )
      return { cancel: true }
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
    redirectCounts.set(tabId, currentCount + 1)
    extensionRedirects.set(tabId, true)
    return { redirectUrl }
  }

  browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
      if (details.tabId === -1) {
        return {}
      }

      const { redirectUrl, cancel } = getRedirectUrl(details.tabId, details.url)
      if (cancel) {
        return { cancel: true }
      }
      if (!redirectUrl) {
        return {}
      }
      new Promise((resolve) => setTimeout(resolve, 10)).then(async () => {
      await browser.tabs.update(details.tabId, {
        url: redirectUrl,
      })
      })
      return { cancel: true, redirectUrl }
    },
    { urls: ['<all_urls>'], types: ['main_frame'] },
  )
  browser.tabs.onRemoved.addListener((tabId) => {
    extensionRedirects.delete(tabId)
    redirectCounts.delete(tabId)
  })
  browser.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId === 0) {
      const tabId = details.tabId
      if (extensionRedirects.has(tabId)) {
        extensionRedirects.delete(tabId)
      } else {
        redirectCounts.set(tabId, 0)
      }
      // TODO: https://developer.apple.com/forums/thread/727388
      if (import.meta.env.SAFARI) {
        const { redirectUrl, cancel } = getRedirectUrl(
          details.tabId,
          details.url,
        )
        if (cancel || !redirectUrl) {
          return
        }
        await browser.tabs.update(details.tabId, {
          url: redirectUrl,
        })
      }
    }
  })
  browser.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    if (details.tabId === -1) {
      return
    }
    const { redirectUrl, cancel } = getRedirectUrl(details.tabId, details.url)
    if (cancel) {
      return
    }
    if (!redirectUrl) {
      return
    }
    await browser.tabs.update(details.tabId, {
      url: redirectUrl,
    })
  })
  browser.action.onClicked.addListener(async (tab) => {
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
