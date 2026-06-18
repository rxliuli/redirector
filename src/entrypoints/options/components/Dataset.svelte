<script lang="ts">
  import { rules } from '../store'
  import { Button } from '$lib/components/ui/button'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    CheckIcon,
    ChevronDown,
    ChevronUp,
    SquarePenIcon,
    TrashIcon,
    EllipsisVertical
  } from '@lucide/svelte'
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table'
  import { uniqBy } from 'es-toolkit'
  import { toast } from 'svelte-sonner'
  import { type MatchRule } from '$lib/url'
  import RuleDialog from './RuleDialog.svelte'

  interface Props {
    onAddRule: () => void
  }

  let { onAddRule }: Props = $props()

  let editDialog = $state<{
    open: boolean
    index?: number
    rule?: MatchRule
  }>({ open: false })
  let actionsMenuOpen = $state(false)

  function sortRules(upOrDown: string, index: number) {
    if (upOrDown == 'up') {
      let tmp = $rules[index - 1]
      $rules[index - 1] = $rules[index]
      $rules[index] = tmp
    } else if (upOrDown == 'down') {
      let tmp = $rules[index + 1]
      $rules[index + 1] = $rules[index]
      $rules[index] = tmp
    }
  }

  function openEdit(index: number) {
    editDialog = {
      open: true,
      index,
      rule: { ...$rules[index] },
    }
  }

  function handleSave(rule: MatchRule, index?: number) {
    if (index !== undefined) {
      $rules[index] = rule
      toast.success('Rule updated')
    }
  }

  function deleteRule(index: number) {
    $rules = $rules.filter((_, i) => i !== index)
    toast.success('Rule deleted')
  }

  function deleteAllRules() {
    if (!$rules.length) {
      return
    }
    const confirmDelete = globalThis.confirm
      ? globalThis.confirm('Delete all rules? This action cannot be undone.')
      : true
    if (!confirmDelete) {
      return
    }
    $rules = []
    editDialog = { open: false }
    actionsMenuOpen = false
    toast.success('All rules deleted')
  }

  function exportRules() {
    const json = JSON.stringify($rules, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Redirector-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    actionsMenuOpen = false
    toast.success('Exported rules')
  }

  function importRules() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        const json = JSON.parse(text)
        $rules = uniqBy([...json, ...$rules], (it) => it.from).map((rule) => {
          rule.enabled = rule.enabled ?? true
          return rule
        })
        actionsMenuOpen = false
        toast.success('Imported rules')
      }
    }
    input.click()
  }
</script>

<div class="flex items-center justify-between gap-2 mb-4">
  <h2 class="text-lg font-bold mr-auto">Rules</h2>
  <Button size="sm" onclick={onAddRule} title="Add Rule">Add Rule</Button>
  <DropdownMenu.Root bind:open={actionsMenuOpen}>
    <DropdownMenu.Trigger>
      <Button
        variant="secondary"
        size="icon"
        title="Actions"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={actionsMenuOpen}
      >
        <EllipsisVertical class="h-4 w-4" />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40" sideOffset={8}>
      <DropdownMenu.Item onclick={exportRules} title="Export">Export</DropdownMenu.Item>
      <DropdownMenu.Item onclick={importRules} title="Import">Import</DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        onclick={deleteAllRules}
        title="Wipe Rules"
        disabled={$rules.length === 0}
      >
        Delete All
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<Table class="table-fixed w-full min-w-4xl">
  <TableHeader>
    <TableRow>
      <TableHead class="w-24">Mode</TableHead>
      <TableHead class="w-16">Enabled</TableHead>
      <TableHead class="w-1/2">From</TableHead>
      <TableHead class="w-1/2">To</TableHead>
      <TableHead class="w-32 text-right">Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each $rules as rule, index (index)}
      <TableRow>
        <TableCell>
          {rule.mode === 'regex'
            ? 'Regex'
            : rule.mode === 'url-pattern'
              ? 'URL Pattern'
              : 'Auto'}
        </TableCell>
        <TableCell>
          <Checkbox bind:checked={rule.enabled} title="Enabled">
            {#if rule.enabled}
              <CheckIcon class="h-4 w-4" />
            {/if}
          </Checkbox>
        </TableCell>
        <TableCell class="truncate" title={rule.from}>
          {rule.from}
        </TableCell>
        <TableCell class="truncate" title={rule.to}>
          {rule.to}
        </TableCell>
        <TableCell class="flex gap-1 justify-end">
          <div class="flex flex-col">
            <Button
              class="rounded-b-none h-4.5 w-9"
              disabled={!index}
              onclick={() => {
                sortRules('up', index)
              }}
              variant="default"
              size="icon"
              title="Move up"
            >
              <ChevronUp class="h-4 w-4" />
            </Button>
            <Button
              class="rounded-t-none border-t-0 h-4.5 w-9"
              disabled={index == $rules.length - 1}
              onclick={() => {
                sortRules('down', index)
              }}
              variant="default"
              size="icon"
              title="Move down"
            >
              <ChevronDown class="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="default"
            size="icon"
            onclick={() => openEdit(index)}
            title="Edit"
          >
            <SquarePenIcon class="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onclick={() => deleteRule(index)}
            title="Delete"
          >
            <TrashIcon class="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>

<!-- Edit Rule Dialog -->
{#if editDialog.open}
  <RuleDialog
    bind:open={editDialog.open}
    rule={editDialog.rule}
    index={editDialog.index}
    allRules={$rules}
    onClose={() => {
      editDialog.open = false
    }}
    onSave={handleSave}
  />
{/if}
