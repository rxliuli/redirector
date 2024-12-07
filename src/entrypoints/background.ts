import { matchRule } from '$lib/url'

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id })

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

  browser.webRequest.onBeforeRequest.addListener(
    async (details) => {
      // console.log('[webRequest] Before request', details)
      const rule = rules.find((rule) => matchRule(rule, details.url).match)
      if (!rule) {
        return {}
      }
      const redirectUrl = matchRule(rule, details.url).url
      if (redirectUrl === details.url) {
        return {}
      }
      console.log('[webRequest] Redirecting to', rule.to, redirectUrl)
      await browser.tabs.update(details.tabId, {
        url: redirectUrl,
      })
      return {}
    },
    { urls: ['<all_urls>'], types: ['main_frame'] },
  )

  browser.action.onClicked.addListener(async (tab) => {
    console.log('Action clicked', tab)
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
