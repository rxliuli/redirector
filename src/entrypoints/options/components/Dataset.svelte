<script lang="ts">
  import { rules } from '../store'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Checkbox } from '$lib/components/ui/checkbox'
  import {
    CheckIcon,
    ChevronDown,
    ChevronUp,
    SquarePenIcon,
    TrashIcon,
    XIcon,
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
  import { SelectGroup } from '$lib/components/extra/select'
  import { type MatchRule } from '$lib/url'

  let edit: {
    index: number
    rule: MatchRule
  } | null = $state(null)

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
    edit = {
      index,
      rule: { ...$rules[index] },
    }
  }

  function saveEdit() {
    if (!edit) {
      return
    }
    $rules[edit.index] = edit.rule
    edit = null
  }

  function cancelEdit() {
    edit = null
  }

  function deleteRule(index: number) {
    $rules = $rules.filter((_, i) => i !== index)
    if (edit) {
      cancelEdit()
    }
  }

  function exportRules() {
    const json = JSON.stringify($rules, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Redirector-${new Date().toISOString()}.json`
    a.click()
    toast.success('Exported rules')
  }

  function importRules() {
    if (edit) {
      const ok = confirm('Import will cancel edit mode, are you sure?')
      if (!ok) {
        return
      }
      cancelEdit()
    }
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
        toast.success('Imported rules')
      }
    }
    input.click()
  }
</script>

<div class="flex items-center justify-between gap-2">
  <h2 class="text-lg font-bold mr-auto">Rules</h2>
  <Button variant="secondary" size="sm" onclick={exportRules} title="Export"
    >Export</Button
  >
  <Button variant="secondary" size="sm" onclick={importRules} title="Import"
    >Import</Button
  >
</div>

<Table class="table-fixed w-full min-w-4xl">
  <TableHeader>
    <TableRow>
      <TableHead class="w-32">Mode</TableHead>
      <TableHead class="w-20">Enabled</TableHead>
      <TableHead class="w-1/2">From</TableHead>
      <TableHead class="w-1/2">To</TableHead>
      <TableHead class="w-32 text-right">Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each $rules as rule, index (index)}
      <TableRow>
        {#if edit && edit.index === index}
          <TableCell class="w-32">
            <SelectGroup
              bind:value={edit.rule.mode}
              options={[
                { label: 'Regex', value: 'regex' },
                { label: 'URL Pattern', value: 'url-pattern' },
              ]}
              placeholder="Select mode"
              class="w-full"
            />
          </TableCell>
          <TableCell class="w-20">
            <Checkbox bind:checked={edit.rule.enabled} title="Enabled">
              {#if edit.rule.enabled}
                <CheckIcon class="h-4 w-4" />
              {/if}
            </Checkbox>
          </TableCell>
          <TableCell class="w-1/2">
            <Input
              type="text"
              class="w-full"
              bind:value={edit.rule.from}
              title="From"
            />
          </TableCell>
          <TableCell class="w-1/2">
            <Input
              type="text"
              class="w-full"
              bind:value={edit.rule.to}
              title="To"
            />
          </TableCell>
          <TableCell class="w-32 flex gap-1 justify-end">
            <Button
              variant="default"
              size="icon"
              onclick={() => saveEdit()}
              title="Save"
              disabled={!edit.rule.from.trim() || !edit.rule.to.trim()}
            >
              <CheckIcon class="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onclick={() => cancelEdit()}
              title="Cancel"
            >
              <XIcon class="h-4 w-4" />
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
        {:else}
          <TableCell class="w-32">
            {rule.mode === 'regex'
              ? 'Regex'
              : rule.mode === 'url-pattern'
                ? 'URL Pattern'
                : 'Auto'}
          </TableCell>
          <TableCell class="w-20">
            <Checkbox bind:checked={rule.enabled} title="Enabled">
              {#if rule.enabled}
                <CheckIcon class="h-4 w-4" />
              {/if}
            </Checkbox>
          </TableCell>
          <TableCell class="w-1/2 truncate" title={rule.from}>
            {rule.from}
          </TableCell>
          <TableCell class="w-1/2 truncate" title={rule.to}>
            {rule.to}
          </TableCell>
          <TableCell class="w-32 flex gap-1 justify-end">
            <div class="flex flex-col">
              <Button
                class="rounded-b-none h-4.5 w-9"
                disabled={edit || !index}
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
                disabled={edit || index == $rules.length - 1}
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
        {/if}
      </TableRow>
    {/each}
  </TableBody>
</Table>
