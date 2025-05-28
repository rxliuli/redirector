<script lang="ts">
	import { cn } from "$lib/utils";
	import { Checkbox } from "bits-ui";
	// import { HTMLInputAttributes } from "svelte/elements";
    // import { CheckboxProps } from "bits-ui";

    // type $$Props = CheckboxProps;
    // type $$Props = HTMLInputAttributes;

    // export let checked: $$Props["checked"] = undefined;
    // export let disabled: $$Props["disabled"] = undefined;
    // let className: $$Props["class"] = undefined;
    export let checked: boolean | undefined
    
</script>

<Checkbox.Root
    class={cn("border-muted bg-background peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]")}
    bind:checked
    {...$$restProps}
>
	<slot />
</Checkbox.Root>