import { beforeEach, afterEach, vi, it, describe, expect } from 'vitest'
import { fakeBrowser } from '@webext-core/fake-browser'
import { rules } from '../store'
import { MatchRule } from '$lib/url'
import Form from './Form.svelte'
import { render } from 'vitest-browser-svelte'

beforeEach(() => {
  Reflect.set(globalThis, 'browser', fakeBrowser)
  rules.set([])
})
afterEach(() => {
  rules.set([])
  Reflect.deleteProperty(globalThis, 'browser')
  vi.clearAllMocks()
})

describe('Regex', () => {
  async function fillForm(rule: MatchRule, origin: string) {
    const screen = render(Form)
    await screen.getByTitle('from').fill(rule.from)
    await screen.getByTitle('to').fill(rule.to)
    await screen.getByTitle('Test URL').fill(origin)
    return screen
  }
  it('Success Matched', async () => {
    const screen = await fillForm(
      {
        mode: 'regex',
        from: '^https://www.google.com/search\\?q=(.*?)&.*$',
        to: 'https://duckduckgo.com/?q=$1',
      },
      'https://www.google.com/search?q=js&oq=js',
    )
    await expect
      .element(screen.getByText('Valid redirect chain'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('https://duckduckgo.com/?q=js'))
      .toBeInTheDocument()
  })
  it('No Matched', async () => {
    const screen = await fillForm(
      {
        mode: 'regex',
        from: 'https://www.reddit.com/r/(.*?)/',
        to: 'https://www.reddit.com/r/$1/top/',
      },
      'https://www.google.com/',
    )
    await expect
      .element(screen.getByText('Redirect does not match any rules'))
      .toBeInTheDocument()
  })
  it('Infinite Redirect', async () => {
    const screen = await fillForm(
      {
        mode: 'regex',
        from: 'https://www.reddit.com/r/(.*)/',
        to: 'https://www.reddit.com/r/$1/top/',
      },
      'https://www.reddit.com/r/MadeMeSmile/',
    )
    await expect
      .element(screen.getByText('Infinite redirect detected'))
      .toBeInTheDocument()
    await expect
      .element(
        screen.getByText('https://www.reddit.com/r/MadeMeSmile/top/top/top/'),
      )
      .toBeInTheDocument()
  })
  it('Circular Redirect', async () => {
    rules.set([
      {
        from: 'https://a.com/(.*)',
        to: 'https://b.com/$1',
      },
      {
        from: 'https://b.com/(.*)',
        to: 'https://c.com/$1',
      },
    ])
    const screen = await fillForm(
      {
        mode: 'regex',
        from: 'https://c.com/(.*)',
        to: 'https://a.com/$1',
      },
      'https://a.com/test',
    )
    await expect
      .element(screen.getByText('Circular redirect detected'))
      .toBeInTheDocument()
  })
})
