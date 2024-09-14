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

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.parentFrameId !== -1) {
      return
    }
    const rule = rules.find((rule) => matchRule(rule, details.url).match)
    console.log('Before navigate', details.url, rule)
    if (!rule) {
      return
    }
    console.log('Redirecting to', rule.to)
    const redirectUrl = matchRule(rule, details.url).url
    if (redirectUrl === details.url) {
      return
    }
    await browser.tabs.update(details.tabId, {
      url: redirectUrl,
    })
  })

  browser.action.onClicked.addListener(async (tab) => {
    console.log('Action clicked', tab)
    await browser.tabs.create({
      url: browser.runtime.getURL('/options.html'),
    })
  })
})
