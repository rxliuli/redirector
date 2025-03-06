<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '$lib/components/ui/select'

  export let value: string | undefined
  export let placeholder: string | undefined = undefined
  let className: string | undefined = undefined
  export { className as class }
  export let options: { label: string; value: string }[]
</script>

<Select
  selected={{
    value: value,
  }}
  onSelectedChange={(selected) => {
    if (selected?.value) {
      value = selected?.value
    }
  }}
>
  <SelectTrigger class={className}>
    <SelectValue
      placeholder={options.find((option) => option.value === value)?.label ??
        placeholder}
    />
  </SelectTrigger>
  <SelectContent>
    {#each options as option}
      <SelectItem value={option.value}>{option.label}</SelectItem>
    {/each}
  </SelectContent>
</Select>
