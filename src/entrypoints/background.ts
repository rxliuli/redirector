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

  browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
      if (details.tabId === -1) {
        return {}
      }
      const rule = rules.find((rule) => matchRule(rule, details.url).match)
      if (!rule) {
        return {}
      }
      const currentCount = redirectCounts.get(details.tabId) ?? 0
      if (currentCount >= 5) {
        console.error(
          `Circular redirect detection: tab ${
            details.url
          } has reached the maximum number of redirects, rule: ${JSON.stringify(
            rule,
          )}`,
        )
        return { cancel: true }
      }
      const redirectUrl = matchRule(rule, details.url).url
      if (redirectUrl === details.url) {
        return {}
      }

      console.log(
        '[webRequest] Redirecting from',
        details.url,
        'to',
        rule.to,
        'redirectUrl',
        redirectUrl,
      )
      redirectCounts.set(details.tabId, currentCount + 1)
      extensionRedirects.set(details.tabId, true)
      await browser.tabs.update(details.tabId, {
        url: redirectUrl,
      })
      return { cancel: true }
    },
    { urls: ['<all_urls>'], types: ['main_frame'] },
  )
  browser.tabs.onRemoved.addListener((tabId) => {
    extensionRedirects.delete(tabId)
    redirectCounts.delete(tabId)
  })
  browser.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
      const tabId = details.tabId
      if (extensionRedirects.has(tabId)) {
        extensionRedirects.delete(tabId)
      } else {
        redirectCounts.set(tabId, 0)
      }
    }
  })
  browser.action.onClicked.addListener(async (tab) => {
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
