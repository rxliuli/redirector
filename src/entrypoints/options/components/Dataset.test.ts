import { it, expect, beforeEach, afterEach, describe, vi } from 'vitest'
import Dataset from './Dataset.svelte'
import { render } from 'vitest-browser-svelte'
import { fakeBrowser } from '@webext-core/fake-browser'
import { rules } from '../store'
import { MatchRule } from '$lib/url'
import { commands } from '@vitest/browser/context'

beforeEach(() => {
  Reflect.set(globalThis, 'browser', fakeBrowser)
  rules.set([])
})
afterEach(() => {
  rules.set([])
  Reflect.deleteProperty(globalThis, 'browser')
  vi.clearAllMocks()
})

describe('List', () => {
  it('should render rules', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await expect.element(screen.getByText(rule.from)).toBeInTheDocument()
    await expect.element(screen.getByText(rule.to)).toBeInTheDocument()
    await expect.element(screen.getByText('Regex')).toBeInTheDocument()
    await expect
      .element(screen.getByRole('checkbox'))
      .toHaveAttribute('data-state', 'checked')
  })
  it('default mode is auto', async () => {
    const rule: MatchRule = {
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await expect.element(screen.getByText('Auto')).toBeInTheDocument()
  })
  it('mode is url-pattern', async () => {
    const rule: MatchRule = {
      mode: 'url-pattern',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await expect.element(screen.getByText('URL Pattern')).toBeInTheDocument()
  })
  it('render large dataset', async () => {
    const list = Array.from(
      { length: 1000 },
      (_, i) =>
        ({
          mode: 'regex',
          enabled: true,
          from: `https://example.com/from${i}`,
          to: `https://example.com/new${i}`,
        } satisfies MatchRule),
    )
    rules.set(list)
    const screen = render(Dataset)
    const rows = document.querySelectorAll('table > tbody > tr')
    expect(rows).toHaveLength(list.length)
    rows.forEach((row, i) => {
      expect(row.textContent)
        .contain(`https://example.com/from${i}`)
        .contain(`https://example.com/new${i}`)
        .contain('Regex')
    })
  })
}, 5000)

describe('Action', () => {
  it('toggle rule enabled in view', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    const loc = screen.getByTitle('Enabled')
    await expect.element(loc).toHaveAttribute('data-state', 'checked')
    await loc.click()
    await expect.element(loc).toHaveAttribute('data-state', 'unchecked')
    // TODO: https://github.com/vitest-dev/vitest/issues/7742
    // await loc.click()
    loc.element().click()
    await expect.element(loc).toHaveAttribute('data-state', 'checked')
  })
  it('edit rule', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await screen.getByTitle('Edit').click()
    await screen.getByTitle('From').fill('https://example.com/from2')
    await screen.getByTitle('To').fill('https://example.com/new2')
    await screen.getByTitle('Enabled').click()
    await screen.getByTitle('Save').click()
    await expect
      .element(screen.getByText('https://example.com/from2'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('https://example.com/new2'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByTitle('Enabled'))
      .toHaveAttribute('data-state', 'unchecked')
  })
  it('edit rule cancel', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await screen.getByTitle('Edit').click()
    await screen.getByTitle('From').fill('https://example.com/from2')
    await screen.getByTitle('Cancel').click()
    await expect
      .element(screen.getByText('https://example.com/from'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('https://example.com/new'))
      .toBeInTheDocument()
  })
  it('delete rule on view', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    const rule2: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/1',
      to: 'https://example.com/2',
    }
    rules.set([rule, rule2])
    const screen = render(Dataset)
    await screen.getByTitle('Delete').nth(0).click()
    await expect.element(screen.getByText(rule.from)).not.toBeInTheDocument()
    await expect.element(screen.getByText(rule2.from)).toBeInTheDocument()
    await screen.getByTitle('Delete').nth(0).click()
    await expect.element(screen.getByText(rule2.from)).not.toBeInTheDocument()
  })
  it('delete rule on edit', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    const rule2: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/1',
      to: 'https://example.com/2',
    }
    rules.set([rule, rule2])
    const screen = render(Dataset)
    await screen.getByTitle('Edit').nth(0).click()
    await screen.getByTitle('Delete').nth(0).click()
    await expect.element(screen.getByText(rule.from)).not.toBeInTheDocument()
  })
  it('auto quit edit mode when delete rule', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    const rule2: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/1',
      to: 'https://example.com/2',
    }
    rules.set([rule, rule2])
    const screen = render(Dataset)
    await screen.getByTitle('Edit').nth(0).click()
    await expect.element(screen.getByTitle('From')).toBeInTheDocument()
    await expect.element(screen.getByTitle('Save')).toBeInTheDocument()
    await expect.element(screen.getByTitle('Cancel')).toBeInTheDocument()
    await screen.getByTitle('Delete').nth(0).click()
    await expect.element(screen.getByTitle('From')).not.toBeInTheDocument()
    await expect.element(screen.getByTitle('Save')).not.toBeInTheDocument()
    await expect.element(screen.getByTitle('Cancel')).not.toBeInTheDocument()
  })
  it('move rule down', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from-1',
      to: 'https://example.com/new-1',
    }
    const rule2: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from-2',
      to: 'https://example.com/new-2',
    }
    rules.set([rule, rule2])
    const screen = render(Dataset)
    await expect.element(screen.getByTitle('Move up').nth(0)).toBeDisabled()
    await expect.element(screen.getByTitle('Move down').nth(0)).toBeEnabled()
    await expect.element(screen.getByTitle('Move up').nth(1)).toBeEnabled()
    await expect.element(screen.getByTitle('Move down').nth(1)).toBeDisabled()
    expect(
      screen
        .getByText('https://example.com/from')
        .elements()
        .map((it) => it.textContent),
    ).toEqual(['https://example.com/from-1', 'https://example.com/from-2'])
    await screen.getByTitle('Move down').nth(0).click()
    expect(
      screen
        .getByText('https://example.com/from')
        .elements()
        .map((it) => it.textContent),
    ).toEqual(['https://example.com/from-2', 'https://example.com/from-1'])
  })
}, 5000)

describe('Export and Import', () => {
  it('export', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    rules.set([rule])
    const screen = render(Dataset)
    const [download] = await Promise.all([
      commands.waitForDownload(),
      screen.getByTitle('Export').click(),
    ])
    expect(JSON.parse(download.text)).toEqual([rule])
  })
  it('import', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    const screen = render(Dataset)
    await expect.element(screen.getByText(rule.from)).not.toBeInTheDocument()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await Promise.all([
      commands.waitForUpload({
        name: 'rules.json',
        mimeType: 'application/json',
        text: JSON.stringify([rule]),
      }),
      screen.getByTitle('Import').click(),
    ])
    await expect.element(screen.getByText(rule.from)).toBeInTheDocument()
    await expect.element(screen.getByText(rule.to)).toBeInTheDocument()
    await expect
      .element(screen.getByTitle('Enabled'))
      .toHaveAttribute('data-state', 'checked')
  })
  it('import on edit mode(confirm)', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    const rule2: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/1',
      to: 'https://example.com/2',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await screen.getByTitle('Edit').click()
    expect(screen.getByTitle('From')).toHaveValue(rule.from)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await Promise.all([
      commands.waitForUpload({
        name: 'rules.json',
        mimeType: 'application/json',
        text: JSON.stringify([rule2]),
      }),
      screen.getByTitle('Import').click(),
    ])
    await expect
      .element(screen.getByTitle('From', { exact: true }))
      .not.toBeInTheDocument()
    await expect.element(screen.getByText(rule2.from)).toBeInTheDocument()
    const rows = [...document.querySelectorAll('table > tbody > tr')]
    expect(rows).length(2)
  })
  it('import on edit mode(reject)', async () => {
    const rule: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/from',
      to: 'https://example.com/new',
    }
    const rule2: MatchRule = {
      mode: 'regex',
      enabled: true,
      from: 'https://example.com/1',
      to: 'https://example.com/2',
    }
    rules.set([rule])
    const screen = render(Dataset)
    await screen.getByTitle('Edit').click()
    expect(screen.getByTitle('From')).toHaveValue(rule.from)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await screen.getByTitle('Import').click()
    await expect.element(screen.getByTitle('From')).toBeInTheDocument()
    await expect.element(screen.getByText(rule2.from)).not.toBeInTheDocument()
    const rows = [...document.querySelectorAll('table > tbody > tr')]
    expect(rows).length(1)
  })
}, 5000)
