<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { ArrowRightIcon } from 'lucide-svelte'
  import { rules } from '../store'
  import { isMatch, replaceUrl } from '$lib/url'

  let from = ''
  let to = ''
  let origin = ''
  let redirect = {
    match: false,
    to: '',
  }

  function addRedirect() {
    if (from && to) {
      $rules = [{ from: from.trim(), to: to.trim() }, ...$rules]
      from = ''
      to = ''
    }
  }

  $: {
    if (from && to && origin && isMatch(from.trim(), origin)) {
      redirect = {
        match: true,
        to: replaceUrl(origin, from.trim(), to.trim()),
      }
    } else {
      redirect = {
        match: false,
        to: '',
      }
    }
  }
</script>

<div class="grid w-full items-center gap-4 mb-4">
  <div class="flex flex-col space-y-1.5">
    <Label for="matchUrl">Add a redirect URL</Label>
    <div class="flex flex-row space-x-2 items-center mb-2">
      <Input
        id="matchUrl"
        placeholder="^https://www.google.com/search\?q=(.*?)&.*$"
        bind:value={from}
      />
      <ArrowRightIcon class="w-10 h-10" />
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
    <!-- 添加一个测试输入框，并显示重定向后的 URL，不需要点击按钮，只需要输入 URL 后自动显示 -->
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
      <span class="text-green-600 font-semibold">{redirect.to}</span>
    {:else}
      <span class="text-yellow-600 font-semibold">No match</span>
    {/if}
  </p>
</div>
