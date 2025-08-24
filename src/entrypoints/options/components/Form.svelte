<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { ArrowDownIcon, ArrowRightIcon } from '@lucide/svelte'
  import { rules } from '../store'
  import type { MatchRule } from '$lib/url'
  import { SelectGroup } from '$lib/components/extra/select'
  import { checkRuleChain, type CheckResult } from '$lib/check'
  import RuleCheckResult from './RuleCheckResult.svelte'

  let from = $state('')
  let to = $state('')
  let origin = $state('')
  let mode: MatchRule['mode'] = $state('regex')
  let enabled: boolean = true
  let ruleCheckResult: CheckResult | null = $state(null)

  function addRedirect() {
    if (from && to) {
      $rules = [{ from: from.trim(), to: to.trim(), enabled, mode }, ...$rules]
      from = ''
      to = ''
    }
  }

  $effect(() => {
    if (from && to && origin) {
      const currentRule = { from: from.trim(), to: to.trim(), enabled, mode }
      const tempRules = [currentRule, ...$rules]
      ruleCheckResult = checkRuleChain(tempRules, origin.trim())
    } else {
      ruleCheckResult = null
    }
  })
</script>

<div class="grid w-full items-center gap-4 mb-4">
  <div class="flex flex-col gap-1.5">
    <Label for="matchUrl">Add a redirect URL</Label>
    <div class="flex flex-col md:flex-row gap-2 items-center">
      <SelectGroup
        bind:value={mode}
        options={[
          { label: 'Regex', value: 'regex' },
          { label: 'URL Pattern', value: 'url-pattern' },
        ]}
        placeholder="Select mode"
        class="md:w-96 w-full"
      />
      <Input
        id="matchUrl"
        placeholder={mode === 'regex'
          ? '^https://www.google.com/search\\?q=(.*?)&.*$'
          : 'https://www.google.com/search?q=:id&(.*)'}
        bind:value={from}
        onblur={() => {
          from = from.trim()
        }}
        title="from"
      />
      <div>
        <ArrowDownIcon class="w-4 h-4 md:hidden" />
        <ArrowRightIcon class="w-4 h-4 hidden md:block" />
      </div>
      <Input
        id="redirectUrl"
        placeholder={mode === 'regex'
          ? 'https://duckduckgo.com/?q=$1'
          : 'https://duckduckgo.com/?q={{search.groups.id}}'}
        bind:value={to}
        onblur={() => {
          to = to.trim()
        }}
        title="to"
      />
      <Button
        variant="secondary"
        disabled={!from || !to}
        title={!from || !to ? 'Please fill in both fields' : 'Add redirect'}
        onclick={addRedirect}
      >
        Add
      </Button>
    </div>
  </div>
  <div class="flex flex-col space-y-1.5 mb-2">
    <Label for="testUrl">Test URL</Label>
    <Input
      id="testUrl"
      bind:value={origin}
      placeholder="https://www.google.com/search?q=js&oq=js"
      title="Test URL"
    />
  </div>

  <!-- Rule chain check results -->
  {#if ruleCheckResult}
    <RuleCheckResult result={ruleCheckResult} />
  {/if}
</div>
