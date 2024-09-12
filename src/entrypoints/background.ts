function isMatch(from: string, url: string): boolean {
  let regex: RegExp
  try {
    regex = new RegExp(from, 'ig')
  } catch (error) {
    console.error('Invalid regex', from, error)
    return false
  }
  return regex.test(url)
}

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
    const rule = rules.find((rule) => isMatch(rule.from, details.url))
    console.log('Before navigate', details.url, rule)
    if (!rule) {
      return
    }
    console.log('Redirecting to', rule.to)
    const redirectUrl = details.url.replace(
      new RegExp(rule.from, 'ig'),
      rule.to,
    )
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
