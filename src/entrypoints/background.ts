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

  // Track original URLs per tab for "navigate to original" feature
  const tabOriginalUrls = new Map<number, string>()
  // Track which tab+URL combos should skip redirection
  const tabSkippedUrls = new Map<number, string>()

  function handleRedirect(
    details: { tabId: number; url?: string; frameId?: number },
    source?: string,
  ): {
    redirectUrl?: string
  } {
    if (details.tabId === -1 || !details.url) {
      return {}
    }
    // Only check/clear skip for main frame navigations (frameId === 0).
    // Sub-frame navigations (iframes) share the same tabId but should not
    // affect the skip state. frameId is undefined for Safari's onTabUpdated,
    // which is already main-frame only.
    const isMainFrame = details.frameId === undefined || details.frameId === 0
    if (isMainFrame) {
      const skippedUrl = tabSkippedUrls.get(details.tabId)
      if (skippedUrl === details.url) {
        console.log(
          `[handleRedirect] skip (tab=${details.tabId}, url=${details.url}, source=${source})`,
        )
        return {}
      }
      // URL changed, clear the skip record
      if (skippedUrl) {
        console.log(
          `[handleRedirect] clear skip (tab=${details.tabId}, skipped=${skippedUrl}, newUrl=${details.url}, source=${source})`,
        )
        tabSkippedUrls.delete(details.tabId)
      }
    }
    const { redirectUrl } = getRedirectUrl(details.url)
    if (!redirectUrl) {
      return {}
    }
    console.log(
      `[handleRedirect] redirect (tab=${details.tabId}, from=${details.url}, to=${redirectUrl}, source=${source})`,
    )
    // Save original URL before redirecting
    tabOriginalUrls.set(details.tabId, details.url)
    browser.tabs.update(details.tabId, { url: redirectUrl })
    return { redirectUrl }
  }

  const confirmedNavigations = new Set<string>()

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const key = `${details.tabId}|${details.url}`
    confirmedNavigations.add(key)
    handleRedirect(details, 'onBeforeNavigate')
  })
  if (!import.meta.env.SAFARI) {
    // fixed: https://discord.com/channels/1376360845344374784/1380033039681196102/1445806872790696067
    browser.webRequest.onBeforeRedirect.addListener(
      (details) => {
        // console.log('onBeforeRedirect', details.redirectUrl)
        const key = `${details.tabId}|${details.redirectUrl}`
        confirmedNavigations.add(key)
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    // TODO: https://developer.apple.com/forums/thread/735111
    browser.webRequest.onBeforeRequest.addListener(
      (details) => {
        const key = `${details.tabId}|${details.url}`
        // fixed: https://github.com/rxliuli/redirector/issues/19
        if (!confirmedNavigations.has(key)) {
          return {}
        }
        confirmedNavigations.delete(key)
        return handleRedirect(details, 'onBeforeRequest')
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    // TODO: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility#:~:text=onHistoryStateUpdated
    browser.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
      handleRedirect(details, 'onHistoryStateUpdated')
    })
  } else {
    browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
      handleRedirect(
        {
          tabId,
          url: tab.url,
        },
        'onTabUpdated',
      )
    })
  }

  // Navigate to original page (before redirect) for the active tab
  async function navigateToOriginal() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tab?.id) {
      console.log('[navigateToOriginal] no active tab')
      return
    }
    const originalUrl = tabOriginalUrls.get(tab.id)
    if (!originalUrl) {
      console.log(
        `[navigateToOriginal] no original URL for tab=${tab.id}, current=${tab.url}`,
      )
      return
    }
    console.log(
      `[navigateToOriginal] tab=${tab.id}, original=${originalUrl}, current=${tab.url}`,
    )
    tabSkippedUrls.set(tab.id, originalUrl)
    tabOriginalUrls.delete(tab.id)
    await browser.tabs.update(tab.id, { url: originalUrl })
  }

  // Keyboard shortcut
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'navigate-to-original') {
      await navigateToOriginal()
    }
  })

  // Expose for e2e testing
  Object.assign(self, { navigateToOriginal })

  // Clean up state when tabs are closed
  browser.tabs.onRemoved.addListener((tabId) => {
    tabOriginalUrls.delete(tabId)
    tabSkippedUrls.delete(tabId)
  })

  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
