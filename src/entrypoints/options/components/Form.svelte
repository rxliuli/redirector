<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '$lib/components/ui/select'
  import { ArrowDownIcon, ArrowRightIcon } from 'lucide-svelte'
  import { rules } from '../store'
  import { matchRule } from '$lib/url'
  import type { MatchResult, MatchRule } from '$lib/url'
  import { SelectGroup } from '$lib/components/extra/select'

  let from = ''
  let to = ''
  let origin = ''
  let mode: MatchRule['mode'] = 'regex'
  let redirect: MatchResult = {
    match: false,
    url: '',
  }

  function addRedirect() {
    if (from && to) {
      $rules = [{ from: from.trim(), to: to.trim(), disabled: false, mode }, ...$rules]
      from = ''
      to = ''
    }
  }

  $: {
    redirect = {
      match: false,
      url: '',
    }
    if (from && to && origin) {
      const r = matchRule(
        { from: from.trim(), to: to.trim(), disabled: false, mode },
        origin.trim(),
      )
      console.log(from, origin, to, r)
      if (r.match) {
        redirect = r
      }
    }
  }
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
        class="max-w-96 w-full"
      />
      <Input
        id="matchUrl"
        placeholder="^https://www.google.com/search\?q=(.*?)&.*$"
        bind:value={from}
      />
      <div>
        <ArrowDownIcon class="w-4 h-4 md:hidden" />
        <ArrowRightIcon class="w-4 h-4 hidden md:block" />
      </div>
      <Input
        id="redirectUrl"
        placeholder="https://duckduckgo.com/?q=$1"
        bind:value={to}
      />
      <Button
        variant="secondary"
        disabled={!from || !to}
        title={!from || !to ? 'Please fill in both fields' : 'Add redirect'}
        on:click={addRedirect}
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
      placeholder="https://www.google.com?q=js"
    />
  </div>
  <p class="text-sm break-all">
    Redirect URL:
    {#if redirect.match}
      <span class="text-green-600 font-semibold">{redirect.url}</span>
    {:else}
      <span class="text-yellow-600 font-semibold">No match</span>
    {/if}
  </p>
</div>
