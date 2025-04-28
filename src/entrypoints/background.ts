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
  const redirectCounts = new Map<
    number,
    {
      count: number
      lastTime: number
    }
  >()

  function getRedirectUrl(tabId: number, url: string) {
    const rule = rules.find((rule) => matchRule(rule, url).match)
    if (!rule) {
      return {}
    }
    const currentCount = redirectCounts.get(tabId) ?? { count: 0, lastTime: 0 }
    if (Date.now() - currentCount.lastTime > 3000) {
      currentCount.count = 0
    }
    if (currentCount.count >= 5) {
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
    redirectCounts.set(tabId, {
      lastTime: Date.now(),
      count: currentCount.count + 1,
    })
    extensionRedirects.set(tabId, true)
    return { redirectUrl }
  }

  async function gotoRedirectUrl(tabId: number, url: string) {
    // console.log('[gotoRedirectUrl] Redirecting to', url)
    await browser.tabs.update(tabId, { url })
  }

  // TODO: https://developer.apple.com/forums/thread/735111
  if (!import.meta.env.SAFARI) {
    browser.webRequest.onBeforeRequest.addListener(
      async (details) => {
        if (details.tabId === -1) {
          return {}
        }

        const { redirectUrl, cancel } = getRedirectUrl(
          details.tabId,
          details.url,
        )
        if (cancel) {
          return { cancel: true }
        }
        if (!redirectUrl) {
          return {}
        }
        new Promise((resolve) => setTimeout(resolve, 10)).then(async () => {
          await gotoRedirectUrl(details.tabId, redirectUrl)
        })
        return { cancel: true, redirectUrl }
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
  }
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
        redirectCounts.set(tabId, {
          count: 0,
          lastTime: Date.now(),
        })
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
        await gotoRedirectUrl(details.tabId, redirectUrl)
      }
    }
  })
  if (!import.meta.env.SAFARI) {
    // TODO: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility#:~:text=onHistoryStateUpdated
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
      await gotoRedirectUrl(details.tabId, redirectUrl)
    })
  } else {
    // https://stackoverflow.com/a/69938797/8409380
    browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
      if (tabId === -1 || !tab.url) {
        return
      }
      const { redirectUrl, cancel } = getRedirectUrl(tabId, tab.url)
      if (cancel) {
        return
      }
      if (!redirectUrl) {
        return
      }
      await gotoRedirectUrl(tabId, redirectUrl)
    })
  }

  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
