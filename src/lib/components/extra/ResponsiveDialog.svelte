<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog'
  import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
  } from '$lib/components/ui/drawer'
  import { onMount } from 'svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    open: boolean
    title: string
    description?: string | Snippet
    children: Snippet
    footer?: Snippet
    maxWidth?: string
  }

  let {
    open = $bindable(),
    title,
    description,
    children,
    footer,
    maxWidth = 'max-w-4xl',
  }: Props = $props()

  let isMobile = $state(false)

  onMount(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      isMobile = window.innerWidth < 768 // md breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  })
</script>

{#if isMobile}
  <!-- Mobile: Drawer (bottom sheet) -->
  <Drawer bind:open>
    <DrawerContent class="max-h-[96vh]">
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
        {#if description}
          <DrawerDescription>
            {#if typeof description === 'string'}
              {description}
            {:else}
              {@render description()}
            {/if}
          </DrawerDescription>
        {/if}
      </DrawerHeader>

      <div class="overflow-y-auto px-4">
        {@render children()}
      </div>

      {#if footer}
        <DrawerFooter class="pt-2">
          {@render footer()}
        </DrawerFooter>
      {/if}
    </DrawerContent>
  </Drawer>
{:else}
  <!-- Desktop: Dialog (modal) -->
  <Dialog bind:open>
    <DialogContent class="{maxWidth} max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {#if description}
          <DialogDescription>
            {#if typeof description === 'string'}
              {description}
            {:else}
              {@render description()}
            {/if}
          </DialogDescription>
        {/if}
      </DialogHeader>

      {@render children()}

      {#if footer}
        <DialogFooter>
          {@render footer()}
        </DialogFooter>
      {/if}
    </DialogContent>
  </Dialog>
{/if}
