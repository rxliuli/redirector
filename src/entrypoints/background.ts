import { getRedirectUrl, store } from '$lib/redirect'
import {
  migrateRulesStorage,
  normalizeRules,
  readRulesFromMode,
  readRulesStorageMode,
  RULES_KEY,
  RULES_STORAGE_MODE_KEY,
  type RulesStorageMode,
  type StoredMatchRule,
} from '$lib/storage'

export default defineBackground(() => {
  let activeStorageMode: RulesStorageMode = 'sync'

  async function reloadRulesFromActiveMode() {
    store.rules = await readRulesFromMode(activeStorageMode)
  }

  // MV3 wakes the service worker on navigation events and dispatches them
  // right after the script evaluates — before this async load resolves,
  // store.rules is still empty. Rule evaluation must await this promise or
  // cold-start navigations are checked against zero rules. See issue #39.
  const rulesReady = readRulesStorageMode().then(async (mode) => {
    activeStorageMode = mode
    await reloadRulesFromActiveMode()
  })

  void rulesReady.then(() => migrateRulesStorage())

  // A URL passed on the command line (open -a / xdg-open with the browser
  // not yet running) can finish loading before this script even evaluates —
  // those navigation events are lost entirely — so once rules are loaded,
  // sweep the already-open tabs and redirect any that match.
  const sweepOpenTabs = () => {
    void rulesReady.then(async () => {
      const tabs = await browser.tabs.query({})
      for (const tab of tabs) {
        if (tab.id === undefined || !tab.url) continue
        handleRedirect(
          { tabId: tab.id, url: tab.url, frameId: 0 },
          'startupSweep',
        )
      }
    })
  }
  // Registering onStartup also makes Chrome/Firefox wake the service worker
  // as soon as the browser process launches, instead of waiting for the
  // first navigation to do it. That gives rulesReady a head start on cold
  // start, shrinking the "real page loads before the redirect kicks in"
  // race (issue #40).
  browser.runtime.onStartup.addListener(sweepOpenTabs)
  // Command-line-loaded unpacked extensions (dev / e2e) never get onStartup:
  // every browser launch re-installs them and fires onInstalled with
  // reason 'install' instead, so treat that as the cold-start signal too.
  // Deliberately not on 'update' — a mid-session extension update must not
  // suddenly redirect tabs the user is sitting on.
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') sweepOpenTabs()
  })

  browser.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes[RULES_STORAGE_MODE_KEY]) {
      const nextMode = changes[RULES_STORAGE_MODE_KEY].newValue as
        | RulesStorageMode
        | undefined
      activeStorageMode = nextMode === 'local' ? 'local' : 'sync'
      await reloadRulesFromActiveMode()
      return
    }
    if (areaName === activeStorageMode && changes[RULES_KEY]) {
      // Sync can deliver rules written by an older extension version, so
      // this path needs the same legacy-field normalization as reads.
      store.rules = normalizeRules(
        (changes[RULES_KEY].newValue as StoredMatchRule[] | undefined) ?? [],
      )
    }
  })

  // Track original URLs per tab for "navigate to original" feature
  const tabOriginalUrls = new Map<number, string>()
  // Track which tab+URL combos should skip redirection
  const tabSkippedUrls = new Map<number, string>()

  // Detect cross-call redirect loops where the extension redirects A→B but the
  // server 302s B back to A, causing handleRedirect to fire on A again.
  // checkRuleChain only catches loops within a single getRedirectUrl call, so
  // this counter is needed for server-bounce cases. See issue #29.
  const LOOP_WINDOW_MS = 3000
  const LOOP_THRESHOLD = 3
  const redirectCounters = new Map<
    string,
    { count: number; timestamp: number }
  >()

  function isLoopingRedirect(tabId: number, url: string): boolean {
    const key = `${tabId}|${url}`
    const entry = redirectCounters.get(key)
    const now = Date.now()
    if (!entry || now - entry.timestamp > LOOP_WINDOW_MS) {
      redirectCounters.set(key, { count: 1, timestamp: now })
      return false
    }
    entry.count++
    entry.timestamp = now
    return entry.count >= LOOP_THRESHOLD
  }

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
    if (isLoopingRedirect(details.tabId, details.url)) {
      console.warn(
        `[handleRedirect] redirect-loop detected (tab=${details.tabId}, url=${details.url}, source=${source}) — suppressing redirect to ${redirectUrl}`,
      )
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
    if (details.frameId !== 0) return
    const key = `${details.tabId}|${details.url}`
    // Confirmation bookkeeping must stay synchronous with the event —
    // onBeforeRequest checks it right after this listener fires.
    confirmedNavigations.add(key)
    await rulesReady
    handleRedirect(details, 'onBeforeNavigate')
  })
  if (!import.meta.env.SAFARI) {
    // Track requestIds of confirmed navigations so that server-side redirects
    // (302) only propagate confirmation for real navigations, not prefetches.
    const confirmedRequestIds = new Set<string>()

    // fixed: https://discord.com/channels/1376360845344374784/1380033039681196102/1445806872790696067
    browser.webRequest.onBeforeRedirect.addListener(
      (details) => {
        if (!confirmedRequestIds.has(details.requestId)) {
          return
        }
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
        // Register the requestId before any await: if the server redirect
        // arrives while rules are still loading, onBeforeRedirect must
        // already see this request as confirmed or the chain breaks.
        confirmedRequestIds.add(details.requestId)
        void (async () => {
          await rulesReady
          const result = handleRedirect(details, 'onBeforeRequest')
          if (result.redirectUrl) {
            confirmedRequestIds.delete(details.requestId)
          }
        })()
        // Not a blocking listener — the return value is ignored; the actual
        // redirect happens via tabs.update inside handleRedirect.
        return {}
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    // For externally-initiated navigations (command-line URL, another app)
    // Chrome can idle-freeze this worker right after the network events:
    // timers stop and the queued webNavigation/tabs events are not delivered
    // until something else wakes the worker — the commit is never seen and
    // the redirect silently skips (the user's "refresh makes it work" case).
    // After a main-frame request finishes, poll the tab's REAL url through
    // sequential API roundtrips: each call doubles as a keep-alive that lets
    // the queued events flush (setTimeout would never fire while frozen).
    // Checking tabs.get rather than details.url keeps prefetches that never
    // became tab content untouched (issue #19).
    const COMPLETED_CHECK_ROUNDTRIPS = 300
    browser.webRequest.onCompleted.addListener(
      (details) => {
        confirmedRequestIds.delete(details.requestId)
        if (details.tabId === -1) return
        void (async () => {
          await rulesReady
          let lastUrl: string | undefined
          for (let i = 0; i < COMPLETED_CHECK_ROUNDTRIPS; i++) {
            const tab = await browser.tabs
              .get(details.tabId)
              .catch(() => undefined)
            if (!tab) return
            if (tab.url && tab.url !== lastUrl) {
              lastUrl = tab.url
              const { redirectUrl } = handleRedirect(
                { tabId: details.tabId, url: tab.url, frameId: 0 },
                'onCompletedCheck',
              )
              if (redirectUrl) return
            }
            if (tab.url && tab.status === 'complete') return
          }
        })()
      },
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    browser.webRequest.onErrorOccurred.addListener(
      (details) => confirmedRequestIds.delete(details.requestId),
      { urls: ['<all_urls>'], types: ['main_frame'] },
    )
    // TODO: https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility#:~:text=onHistoryStateUpdated
    browser.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
      if (details.frameId !== 0) return
      await rulesReady
      handleRedirect(details, 'onHistoryStateUpdated')
    })
    // URLs opened from outside the browser (command line, another app) get
    // their webNavigation events dispatched only AFTER the whole webRequest
    // chain has already run, so the confirmation chain above never sees them
    // and a server 302's target commits without being checked. onCommitted
    // reliably carries the committed (post-redirect) URL — re-check it here
    // as a catch-all. Normal navigations that already redirected never commit
    // the matching URL, so this stays a no-op for them.
    browser.webNavigation.onCommitted.addListener(async (details) => {
      if (details.frameId !== 0) return
      await rulesReady
      handleRedirect(details, 'onCommitted')
    })
  } else {
    browser.tabs.onUpdated.addListener(async (tabId, _changeInfo, tab) => {
      await rulesReady
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
    const prefix = `${tabId}|`
    for (const key of redirectCounters.keys()) {
      if (key.startsWith(prefix)) {
        redirectCounters.delete(key)
      }
    }
  })

  browser.action.onClicked.addListener(async () => {
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
