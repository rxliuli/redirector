import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "$lib/components/ui/select";

interface SelectGroupProps {
	value: string | undefined;
	onValueChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	options: { label: string; value: string }[];
}

export default function SelectGroup({
	value,
	onValueChange,
	placeholder,
	className,
	options,
}: SelectGroupProps) {
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
