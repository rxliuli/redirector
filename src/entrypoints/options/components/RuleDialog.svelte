<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { ArrowDownIcon, ArrowRightIcon } from '@lucide/svelte'
  import type { MatchRule } from '$lib/url'
  import { SelectGroup } from '$lib/components/extra/select'
  import { checkRuleChain, type CheckResult } from '$lib/check'
  import RuleCheckResult from './RuleCheckResult.svelte'
  import ResponsiveDialog from '$lib/components/extra/ResponsiveDialog.svelte'

  interface Props {
    open: boolean
    rule?: MatchRule
    index?: number
    allRules: MatchRule[]
    onClose: () => void
    onSave: (rule: MatchRule, index?: number) => void
  }

  let { open = $bindable(), rule, index, allRules, onClose, onSave }: Props = $props()

  let formState = $state({
    from: '',
    to: '',
    testUrl: '',
    mode: 'regex' as MatchRule['mode'],
    enabled: true,
  })
  let ruleCheckResult: CheckResult | null = $state(null)

  $effect(() => {
    if (open) {
      formState = {
        from: rule?.from ?? '',
        to: rule?.to ?? '',
        mode: rule?.mode ?? 'regex',
        enabled: rule?.enabled ?? true,
        testUrl: rule?.testUrl ?? '',
      }
      ruleCheckResult = null
    }
  })

  $effect(() => {
    if (formState.from && formState.to && formState.testUrl) {
      const currentRule = {
        from: formState.from.trim(),
        to: formState.to.trim(),
        enabled: formState.enabled,
        mode: formState.mode,
      }
      const tempRules =
        index !== undefined
          ? allRules.map((r, i) => (i === index ? currentRule : r))
          : [currentRule, ...allRules]
      ruleCheckResult = checkRuleChain(tempRules, formState.testUrl.trim())
    } else {
      ruleCheckResult = null
    }
  })

  function handleSave() {
    if (formState.from && formState.to) {
      onSave(
        {
          from: formState.from.trim(),
          to: formState.to.trim(),
          enabled: formState.enabled,
          mode: formState.mode,
          testUrl: formState.testUrl.trim() || undefined,
        },
        index,
      )
      onClose()
    }
  }
</script>

<ResponsiveDialog
  bind:open
  title={index !== undefined ? 'Edit redirect rule' : 'Add redirect rule'}
  description={index !== undefined
    ? 'Edit your redirect rule and test it with a URL'
    : 'Create a new redirect rule and test it with a URL'}
>
  {#snippet children()}
    <div class="grid gap-4">
      <!-- Mode Selection -->
      <div class="flex flex-col gap-2">
        <Label for="mode">Mode</Label>
        <SelectGroup
          bind:value={formState.mode}
          options={[
            { label: 'Regex', value: 'regex' },
            { label: 'URL Pattern', value: 'url-pattern' },
          ]}
          placeholder="Select mode"
          class="w-full"
        />
      </div>

      <!-- From URL -->
      <div class="flex flex-col gap-2">
        <Label for="matchUrl">Match URL</Label>
        <Input
          id="matchUrl"
          placeholder={formState.mode === 'regex'
            ? '^https://www.google.com/search\\?q=(.*?)&.*$'
            : 'https://www.google.com/search?q=:id&(.*)'}
          bind:value={formState.from}
          onblur={() => {
            formState.from = formState.from.trim()
          }}
          title="Match URL"
        />
      </div>

      <!-- To URL -->
      <div class="flex flex-col gap-2">
        <Label for="redirectUrl">Redirect To</Label>
        <Input
          id="redirectUrl"
          placeholder={formState.mode === 'regex'
            ? 'https://duckduckgo.com/?q=$1'
            : 'https://duckduckgo.com/?q={{search.groups.id}}'}
          bind:value={formState.to}
          onblur={() => {
            formState.to = formState.to.trim()
          }}
          title="Redirect URL"
        />
      </div>

      <!-- Test URL -->
      <div class="flex flex-col gap-2">
        <Label for="testUrl">Test URL (optional)</Label>
        <Input
          id="testUrl"
          bind:value={formState.testUrl}
          placeholder="https://www.google.com/search?q=js&oq=js"
          title="Test URL"
        />
      </div>

      <!-- Rule chain check results -->
      {#if ruleCheckResult}
        <RuleCheckResult result={ruleCheckResult} />
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <Button variant="secondary" onclick={onClose} title="Cancel">Cancel</Button>
    <Button
      variant="default"
      disabled={!formState.from || !formState.to}
      title={!formState.from || !formState.to ? 'Please fill in both fields' : 'Save'}
      onclick={handleSave}
    >
      {index !== undefined ? 'Save' : 'Add'}
    </Button>
  {/snippet}
</ResponsiveDialog>
