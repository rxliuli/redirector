<script lang="ts">
  import {
    ArrowRightIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
  } from '@lucide/svelte'
  import type { CheckResult } from '$lib/check'
  import * as Alert from '$lib/components/ui/alert'

  interface Props {
    result: CheckResult
  }

  let { result }: Props = $props()
</script>

{#if result.status === 'matched'}
  <Alert.Root variant="default">
    <CheckCircleIcon class="w-4 h-4" />
    <Alert.Description>
      <div class="space-y-2">
        <p class="text-green-600 font-medium">
          Valid redirect chain ({result.urls.length} redirect{result.urls
            .length === 1
            ? ''
            : 's'})
        </p>
        <div class="text-sm text-muted-foreground">
          <p class="font-medium mb-1">Redirect chain:</p>
          <div class="space-y-1">
            {#each result.urls as url, index}
              <div class="flex items-start gap-2">
                <div
                  class="text-xs font-mono bg-muted p-2 rounded flex-1 break-all overflow-hidden"
                >
                  {url}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </Alert.Description>
  </Alert.Root>
{:else if result.status === 'not-matched'}
  <Alert.Root variant="default">
    <AlertTriangleIcon class="w-4 h-4" />
    <Alert.Description>
      <p class="text-yellow-600 font-medium">
        Redirect does not match any rules
      </p>
    </Alert.Description>
  </Alert.Root>
{:else if result.status === 'circular-redirect'}
  <Alert.Root variant="destructive">
    <AlertTriangleIcon class="w-4 h-4" />
    <Alert.Description>
      <div class="space-y-2">
        <p class="font-medium">Circular redirect detected!</p>
        <div class="text-sm">
          <p class="font-medium mb-1">Redirect chain:</p>
          <div class="space-y-1">
            {#each result.urls as url, index}
              <div class="flex items-start gap-2">
                <div
                  class="text-xs font-mono bg-muted p-2 rounded flex-1 break-all overflow-hidden {index ===
                  result.urls.length - 1
                    ? 'bg-red-100 border border-red-200'
                    : ''}"
                >
                  {url}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </Alert.Description>
  </Alert.Root>
{:else if result.status === 'infinite-redirect'}
  <Alert.Root variant="destructive">
    <AlertTriangleIcon class="w-4 h-4" />
    <Alert.Description>
      <div class="space-y-2">
        <p class="font-medium">Infinite redirect detected!</p>
        <p class="text-sm">
          Too many redirects (>{result.urls.length})
        </p>
        <div class="text-sm">
          <p class="font-medium mb-1">Redirect chain (partial):</p>
          <div class="space-y-1">
            {#each result.urls.slice(0, 3) as url, index}
              <div class="flex items-start gap-2">
                <div
                  class="text-xs font-mono bg-muted p-2 rounded flex-1 break-all overflow-hidden"
                >
                  {url}
                </div>
              </div>
            {/each}
            {#if result.urls.length > 3}
              <div class="text-xs text-muted-foreground text-center py-1">
                ... and {result.urls.length - 3} more redirects
              </div>
            {/if}
          </div>
        </div>
      </div>
    </Alert.Description>
  </Alert.Root>
{/if}
