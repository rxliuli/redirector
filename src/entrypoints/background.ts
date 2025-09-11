import { getRedirectUrl, store } from '$lib/redirect'
import { MatchRule } from '$lib/url'

export default defineBackground(() => {
  browser.storage.sync.get('rules').then((data: { rules?: MatchRule[] }) => {
    store.rules = data.rules || []
  })

  browser.storage.sync.onChanged.addListener((changes) => {
    if (changes.rules) {
      store.rules = changes.rules.newValue as MatchRule[]
    }
  })

  function handleRedirect(details: { tabId: number; url?: string }): {
    redirectUrl?: string
  } {
    if (details.tabId === -1 || !details.url) {
      return {}
    }
    const { redirectUrl } = getRedirectUrl(details.tabId, details.url)
    if (!redirectUrl) {
      return {}
    }
    browser.tabs.update(details.tabId, { url: redirectUrl })
    return { redirectUrl }
  }

  const confirmedNavigations = new Set<string>()

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const key = `${details.tabId}|${details.url}`
    confirmedNavigations.add(key)
    if (import.meta.env.SAFARI) {
      handleRedirect(details)
    }
  })
  if (!import.meta.env.SAFARI) {
    // TODO: https://developer.apple.com/forums/thread/735111
    browser.webRequest.onBeforeRequest.addListener(
      (details) => {
        const key = `${details.tabId}|${details.url}`
        // fixed: https://github.com/rxliuli/redirector/issues/19
        if (!confirmedNavigations.has(key)) {
          return {}
        }
        confirmedNavigations.delete(key)
        return handleRedirect(details)
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    // TODO: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility#:~:text=onHistoryStateUpdated
    browser.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
      handleRedirect(details)
    })
  } else {
    browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
      handleRedirect({
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
