<script lang="ts">
  import { rules } from '../store'
  import { Button } from '$lib/components/ui/button'
  import { TrashIcon } from 'lucide-svelte'
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/ui/table'
  import { uniqBy } from 'lodash-es'
  import { toast } from 'svelte-sonner'

  function deleteRule(index: number) {
    $rules = $rules.filter((_, i) => i !== index)
  }

  function exportRules() {
    const json = JSON.stringify($rules, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rules.json'
    a.click()
    toast.success('Exported rules')
  }

  function importRules() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const json = JSON.parse(e.target?.result as string)
          $rules = uniqBy([...json, ...$rules], (it) => it.from)
          toast.success('Imported rules')
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }
</script>

<div class="flex items-center justify-between gap-2">
  <h2 class="text-lg font-bold mr-auto">Rules</h2>
  <Button variant="secondary" size="sm" on:click={exportRules}>Export</Button>
  <Button variant="secondary" size="sm" on:click={importRules}>Import</Button>
</div>
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>From</TableHead>
      <TableHead>To</TableHead>
      <TableHead class="text-right">Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each $rules as rule, index (index)}
      <TableRow>
        <TableCell>{rule.from}</TableCell>
        <TableCell>{rule.to}</TableCell>
        <TableCell class="text-right">
          <Button
            variant="destructive"
            size="icon"
            on:click={() => deleteRule(index)}
          >
            <TrashIcon class="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
