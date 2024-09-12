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

  function deleteRule(index: number) {
    $rules = $rules.filter((_, i) => i !== index)
  }
</script>

<h2 class="text-lg font-bold">Rules</h2>
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
