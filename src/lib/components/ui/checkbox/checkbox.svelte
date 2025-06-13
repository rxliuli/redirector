<script lang="ts">
	import { cn } from "$lib/utils";
	import { Checkbox } from "bits-ui";

    export let checked: boolean | undefined
    
</script>

<Checkbox.Root
    class={cn("border-muted bg-background peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]")}
    bind:checked
    {...$$restProps}
>
	<slot />
</Checkbox.Root>