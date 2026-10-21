import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import type { MatchRule } from '$lib/url'
import RuleDialog from './RuleDialog'

describe('Test URL preview', () => {
  it('reflects the chosen Position, not just a head-insert', async () => {
    await page.viewport(1280, 800)
    const existingRule: MatchRule = {
      mode: 'regex',
      from: '^https://example.com/race$',
      to: 'https://example.com/from-existing',
    }
    const screen = await render(
      <RuleDialog
        open
        allRules={[existingRule]}
        onClose={() => {}}
        onSave={() => {}}
      />,
    )

    await screen.getByTitle('Match URL').fill('^https://example.com/race$')
    await screen.getByTitle('Redirect URL').fill('https://example.com/from-new')
    await screen.getByTitle('Test URL').fill('https://example.com/race')

    // Default position (head-insert): the draft rule matches first.
    await expect
      .element(screen.getByText('https://example.com/from-new'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('https://example.com/from-existing'))
      .not.toBeInTheDocument()

    // Move the draft rule to the end: the existing rule now intercepts the
    // URL first, so the preview must show ITS result instead.
    await screen.getByTitle('Expand advanced options').click()
    await screen.getByTitle('Position').fill('2')

    await expect
      .element(screen.getByText('https://example.com/from-existing'))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText('https://example.com/from-new'))
      .not.toBeInTheDocument()
  })

  it('previews an edit respecting both the new position and the new content', async () => {
    await page.viewport(1280, 800)
    const testUrl = 'https://example.com/race'
    const ruleA: MatchRule = {
      mode: 'regex',
      from: '^https://example.com/race$',
      to: 'https://example.com/to-a',
    }
    const ruleB: MatchRule = {
      mode: 'regex',
      from: '^https://example.com/race$',
      to: 'https://example.com/to-b',
    }
    // Editing B (index 1): both rules match the same Test URL, so whichever
    // one sits first in the saved order is the one that actually fires.
    const screen = await render(
      <RuleDialog
        open
        index={1}
        rule={ruleB}
        allRules={[ruleA, ruleB]}
        onClose={() => {}}
        onSave={() => {}}
      />,
    )

    await screen.getByTitle('Test URL').fill(testUrl)

    // Position defaults to 2 (unchanged): A is still first, so it wins.
    await expect.element(screen.getByText(ruleA.to)).toBeInTheDocument()
    await expect.element(screen.getByText(ruleB.to)).not.toBeInTheDocument()

    // Move B to the front: B now wins instead.
    await screen.getByTitle('Expand advanced options').click()
    await screen.getByTitle('Position').fill('1')
    await expect.element(screen.getByText(ruleB.to)).toBeInTheDocument()
    await expect.element(screen.getByText(ruleA.to)).not.toBeInTheDocument()

    // With B still first, editing its Redirect URL should show the new
    // value in the preview, not the original ruleB.to. (Deliberately not a
    // substring of ruleB.to, so the text query below can't match both.)
    const editedTo = 'https://example.com/edited-destination'
    await screen.getByTitle('Redirect URL').fill(editedTo)
    await expect.element(screen.getByText(editedTo)).toBeInTheDocument()
    await expect.element(screen.getByText(ruleB.to)).not.toBeInTheDocument()
  })
})

describe('Position field', () => {
  it('clamps an out-of-range value on blur, not on every keystroke', async () => {
    await page.viewport(1280, 800)
    const allRules: MatchRule[] = [
      { mode: 'regex', from: 'https://example.com/a', to: 'https://example.com/a2' },
      { mode: 'regex', from: 'https://example.com/b', to: 'https://example.com/b2' },
    ]
    const screen = await render(
      <RuleDialog open allRules={allRules} onClose={() => {}} onSave={() => {}} />,
    )
    await screen.getByTitle('Expand advanced options').click()
    const position = screen.getByTitle('Position')

    await position.fill('-1')
    // Still showing the raw typed value while focused — no onChange clamp.
    await expect.element(position).toHaveValue(-1)
    position.element().blur()
    await expect.element(position).toHaveValue(1)

    await position.fill('999')
    await expect.element(position).toHaveValue(999)
    position.element().blur()
    // Adding a new rule on top of 2 existing ones: max is length + 1 = 3.
    await expect.element(position).toHaveValue(3)
  })
})
