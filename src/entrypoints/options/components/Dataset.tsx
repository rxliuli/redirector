import {
	ChevronDown,
	ChevronUp,
	EllipsisVertical,
	SquarePenIcon,
	TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "$lib/components/ui/button";
import { Checkbox } from "$lib/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "$lib/components/ui/table";
import type { MatchRule } from "$lib/url";
import { uniqBy } from "es-toolkit";
import {
	isStorageQuotaExceededError,
	replaceRules,
	rules,
	setRulesStorageMode,
	useRules,
	useRulesStorageMode,
} from "../store";
import RuleDialog from "./RuleDialog";

interface DatasetProps {
	onAddRule: () => void;
}

export default function Dataset({ onAddRule }: DatasetProps) {
	const allRules = useRules();
	const storageMode = useRulesStorageMode();

	const [editDialog, setEditDialog] = useState<{
		open: boolean;
		index?: number;
		rule?: MatchRule;
	}>({ open: false });
	const [switchingStorageMode, setSwitchingStorageMode] = useState(false);

	function sortRules(upOrDown: "up" | "down", index: number) {
		rules.update((list) => {
			const target = upOrDown === "up" ? index - 1 : index + 1;
			const a = list[index];
			const b = list[target];
			if (a === undefined || b === undefined) {
				return list;
			}
			const next = [...list];
			next[index] = b;
			next[target] = a;
			return next;
		});
	}

	function setRuleEnabled(index: number, enabled: boolean) {
		rules.update((list) =>
			list.map((r, i) => (i === index ? { ...r, enabled } : r)),
		);
	}

	function openEdit(index: number) {
		const rule = allRules[index];
		if (!rule) {
			return;
		}
		setEditDialog({
			open: true,
			index,
			rule: { ...rule },
		});
	}

	async function handleSave(rule: MatchRule, index?: number) {
		if (index !== undefined) {
			const nextRules = [...allRules];
			nextRules[index] = rule;
			try {
				await replaceRules(nextRules);
				toast.success("Rule updated");
			} catch (error) {
				if (isStorageQuotaExceededError(error)) {
					toast.error(
						"Storage quota exceeded. You can switch to Local mode in the menu.",
					);
					throw error;
				}
				toast.error("Failed to update rule");
				console.error("Failed to update rule", error);
				throw error;
			}
		}
	}

	function deleteRule(index: number) {
		rules.set(allRules.filter((_, i) => i !== index));
		toast.success("Rule deleted");
	}

	function deleteAllRules() {
		if (!allRules.length) {
			return;
		}
		const confirmDelete = globalThis.confirm
			? globalThis.confirm("Delete all rules? This action cannot be undone.")
			: true;
		if (!confirmDelete) {
			return;
		}
		rules.set([]);
		setEditDialog({ open: false });
		toast.success("All rules deleted");
	}

	function exportRules() {
		const json = JSON.stringify(allRules, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Redirector-${new Date().toISOString()}.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		toast.success("Exported rules");
	}

	async function toggleStorageMode() {
		if (switchingStorageMode) {
			return;
		}
		setSwitchingStorageMode(true);
		const nextMode = storageMode === "sync" ? "local" : "sync";
		try {
			await setRulesStorageMode(nextMode);
			toast.success(
				nextMode === "local"
					? "Switched to local storage"
					: "Switched to sync storage",
			);
		} catch (error) {
			if (isStorageQuotaExceededError(error)) {
				toast.error("Failed to switch storage mode. Storage quota exceeded.");
				console.error("Failed to switch storage mode", error);
				return;
			}
			toast.error("Failed to switch storage mode");
			console.error("Failed to switch storage mode", error);
		} finally {
			setSwitchingStorageMode(false);
		}
	}

	async function importRules() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				try {
					const text = await file.text();
					const json = JSON.parse(text);
					const nextRules = uniqBy(
						[...json, ...rules.get()],
						(it) => it.from,
					).map((rule) => {
						rule.enabled = rule.enabled ?? true;
						return rule;
					});
					await replaceRules(nextRules);
					toast.success("Imported rules");
				} catch (error) {
					if (isStorageQuotaExceededError(error)) {
						toast.error(
							"Storage quota exceeded. You can switch to Local mode in the menu.",
						);
						return;
					}
					toast.error("Failed to import rules");
					console.error("Failed to import rules", error);
				}
			}
		};
		input.click();
	}

	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-2">
				<h2 className="mr-auto text-lg font-bold">Rules</h2>
				<Button size="sm" onClick={onAddRule} title="Add Rule">
					Add Rule
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="secondary"
							size="icon"
							title="Actions"
							aria-label="Actions"
						>
							<EllipsisVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56" align="end" sideOffset={8}>
						<div className="flex items-center gap-1 px-1 pb-1">
							<DropdownMenuCheckboxItem
								checked={storageMode === "sync"}
								onSelect={(e) => {
									e.preventDefault();
									void toggleStorageMode();
								}}
								className="flex-1"
								title="Use sync storage"
								disabled={switchingStorageMode}
							>
								Sync Storage
							</DropdownMenuCheckboxItem>
						</div>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={exportRules} title="Export">
							Export
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => {
								void importRules();
							}}
							title="Import"
						>
							Import
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={deleteAllRules}
							title="Wipe Rules"
							disabled={allRules.length === 0}
						>
							Delete All
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<Table className="min-w-4xl w-full table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead className="w-24">Mode</TableHead>
						<TableHead className="w-16">Enabled</TableHead>
						<TableHead className="w-1/2">From</TableHead>
						<TableHead className="w-1/2">To</TableHead>
						<TableHead className="w-32 text-right">Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{allRules.map((rule, index) => (
						<TableRow key={index}>
							<TableCell>
								{rule.mode === "regex"
									? "Regex"
									: rule.mode === "url-pattern"
										? "URL Pattern"
										: "Auto"}
							</TableCell>
							<TableCell>
								<Checkbox
									checked={rule.enabled}
									onCheckedChange={(checked) => {
										setRuleEnabled(index, checked === true);
									}}
									title="Enabled"
								/>
							</TableCell>
							<TableCell className="truncate" title={rule.from}>
								{rule.from}
							</TableCell>
							<TableCell className="truncate" title={rule.to}>
								{rule.to}
							</TableCell>
							<TableCell className="flex justify-end gap-1">
								<div className="flex flex-col">
									<Button
										className="h-4.5 w-9 rounded-b-none"
										disabled={!index}
										onClick={() => {
											sortRules("up", index);
										}}
										variant="default"
										size="icon"
										title="Move up"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-4.5 w-9 rounded-t-none border-t-0"
										disabled={index === allRules.length - 1}
										onClick={() => {
											sortRules("down", index);
										}}
										variant="default"
										size="icon"
										title="Move down"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
								</div>
								<Button
									variant="default"
									size="icon"
									onClick={() => openEdit(index)}
									title="Edit"
								>
									<SquarePenIcon className="h-4 w-4" />
								</Button>
								<Button
									variant="destructive"
									size="icon"
									onClick={() => deleteRule(index)}
									title="Delete"
								>
									<TrashIcon className="h-4 w-4" />
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{editDialog.open && (
				<RuleDialog
					open={editDialog.open}
					rule={editDialog.rule}
					index={editDialog.index}
					allRules={allRules}
					onClose={() => {
						setEditDialog({ open: false });
					}}
					onSave={handleSave}
				/>
			)}
		</>
	);
}
