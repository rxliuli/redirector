<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select'

  interface Props {
    value: string | undefined
    placeholder?: string | undefined
    class?: string | undefined
    options: { label: string; value: string }[]
  }

  let {
    value = $bindable(),
    placeholder = undefined,
    class: className = undefined,
    options,
  }: Props = $props()
</script>

<Select
  type="single"
  {value}
  onValueChange={(selected) => {
    value = selected
  }}
>
  <SelectTrigger class={className}>
    {options.find((option) => option.value === value)?.label ?? placeholder}
  </SelectTrigger>
  <SelectContent>
    {#each options as option}
      <SelectItem value={option.value}>{option.label}</SelectItem>
    {/each}
  </SelectContent>
</Select>
