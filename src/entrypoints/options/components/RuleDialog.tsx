import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { checkRuleChain, type CheckResult } from "$lib/check";
import ResponsiveDialog from "$lib/components/extra/ResponsiveDialog";
import SelectGroup from "$lib/components/extra/SelectGroup";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { insertAt, moveItem } from "$lib/misc";
import type { MatchRule } from "$lib/url";
import RuleCheckResult from "./RuleCheckResult";

interface RuleDialogProps {
	open: boolean;
	rule?: MatchRule;
	index?: number;
	allRules: MatchRule[];
	onClose: () => void;
	// `position` is the 0-based index the rule should end up at: for a new
	// rule it's where to insert among `allRules`; for an edit it's the
	// target index to move the rule (currently at `index`) to.
	onSave: (
		rule: MatchRule,
		index?: number,
		position?: number,
	) => void | Promise<void>;
}

export default function RuleDialog({
	open,
	rule,
	index,
	allRules,
	onClose,
	onSave,
}: RuleDialogProps) {
	// 1-based position shown to the user. Editing a rule defaults to its
	// current spot; adding one defaults to the top (matching the historical
	// head-insert behavior).
	const defaultPosition = index !== undefined ? index + 1 : 1;
	// Edits reorder within a fixed-size list ([1, length]); new rules can
	// also land just past the end ([1, length + 1]).
	const maxPosition = index !== undefined ? allRules.length : allRules.length + 1;

	const [formState, setFormState] = useState({
		name: rule?.name ?? "",
		from: rule?.from ?? "",
		to: rule?.to ?? "",
		exclude: rule?.exclude ?? "",
		testUrl: rule?.testUrl ?? "",
		mode: (rule?.mode ?? "regex") as MatchRule["mode"],
		disabled: rule?.disabled ?? false,
		position: String(defaultPosition),
	});
	const [advancedOpen, setAdvancedOpen] = useState(Boolean(rule?.exclude));

	// Blank or non-integer input is treated as "unchanged" (keeps the
	// default position); anything else is clamped into the valid range.
	function resolvePositionFromInput(raw: string): number {
		const trimmed = raw.trim();
		if (trimmed === "") {
			return defaultPosition;
		}
		const parsed = Number(trimmed);
		if (!Number.isInteger(parsed)) {
			return defaultPosition;
		}
		return Math.min(Math.max(parsed, 1), maxPosition);
	}
	function resolvePosition(): number {
		return resolvePositionFromInput(formState.position);
	}
	// The preview should answer "if I save this now, does it still fire at
	// this position?" — so it runs the match against the rule list as it
	// would look right after saving (draft rule inserted/moved to the
	// resolved position), not just the draft rule prepended.
	const ruleCheckResult: CheckResult | null = useMemo(() => {
		if (formState.from && formState.to && formState.testUrl) {
			const currentRule = {
				from: formState.from.trim(),
				to: formState.to.trim(),
				exclude: formState.exclude.trim() || undefined,
				mode: formState.mode,
			};
			const targetIndex = resolvePosition() - 1;
			const tempRules =
				index !== undefined
					? moveItem(
							allRules.map((r, i) => (i === index ? currentRule : r)),
							index,
							targetIndex,
						)
					: insertAt(allRules, targetIndex, currentRule);
			return checkRuleChain(tempRules, formState.testUrl.trim());
		}
		return null;
	}, [formState, index, allRules]);

	async function handleSave() {
		if (formState.from && formState.to) {
			try {
				await onSave(
					{
						name: formState.name.trim() || undefined,
						from: formState.from.trim(),
						to: formState.to.trim(),
						exclude: formState.exclude.trim() || undefined,
						disabled: formState.disabled || undefined,
						mode: formState.mode,
						testUrl: formState.testUrl.trim() || undefined,
					},
					index,
					resolvePosition() - 1,
				);
				onClose();
			} catch {
				// The parent handler reports save errors via toast.
			}
		}
	}

	const trimOnBlur = (field: "name" | "from" | "to" | "exclude") => () => {
		setFormState((prev) => ({ ...prev, [field]: prev[field].trim() }));
	};

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
			title={index !== undefined ? "Edit redirect rule" : "Add redirect rule"}
			description={
				index !== undefined ? (
					"Edit your redirect rule and test it with a URL"
				) : (
					<>
						Create a new redirect rule and test it with a URL.{" "}
						<a
							href="https://github.com/rxliuli/redirector#quick-start--your-first-rule-in-30-seconds"
							target="_blank"
							rel="noreferrer"
							className="text-primary underline"
						>
							Guide
						</a>
					</>
				)
			}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} title="Cancel">
						Cancel
					</Button>
					<Button
						variant="default"
						disabled={!formState.from || !formState.to}
						title={
							!formState.from || !formState.to
								? "Please fill in both fields"
								: "Save"
						}
						onClick={handleSave}
					>
						{index !== undefined ? "Save" : "Add"}
					</Button>
				</>
			}
		>
			<div className="grid gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="ruleName">Name (optional)</Label>
					<Input
						id="ruleName"
						placeholder="YouTube Shorts → Regular Player"
						value={formState.name}
						onChange={(e) => {
							setFormState((prev) => ({ ...prev, name: e.target.value }));
						}}
						onBlur={trimOnBlur("name")}
						title="Rule name"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="mode">Mode</Label>
					<SelectGroup
						value={formState.mode}
						onValueChange={(mode) => {
							setFormState((prev) => ({
								...prev,
								mode: mode as MatchRule["mode"],
							}));
						}}
						options={[
							{ label: "Regex", value: "regex" },
							{ label: "URL Pattern", value: "url-pattern" },
						]}
						placeholder="Select mode"
						className="w-full"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="matchUrl">Match URL</Label>
					<Input
						id="matchUrl"
						placeholder={
							formState.mode === "regex"
								? "^https://www.google.com/search\\?q=(.*?)&.*$"
								: "https://www.google.com/search?q=:id&(.*)"
						}
						value={formState.from}
						onChange={(e) => {
							setFormState((prev) => ({ ...prev, from: e.target.value }));
						}}
						onBlur={trimOnBlur("from")}
						title="Match URL"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="redirectUrl">Redirect To</Label>
					<Input
						id="redirectUrl"
						placeholder={
							formState.mode === "regex"
								? "https://duckduckgo.com/?q=$1"
								: "https://duckduckgo.com/?q={{search.groups.id}}"
						}
						value={formState.to}
						onChange={(e) => {
							setFormState((prev) => ({ ...prev, to: e.target.value }));
						}}
						onBlur={trimOnBlur("to")}
						title="Redirect URL"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="testUrl">Test URL (optional)</Label>
					<Input
						id="testUrl"
						value={formState.testUrl}
						onChange={(e) => {
							setFormState((prev) => ({ ...prev, testUrl: e.target.value }));
						}}
						placeholder="https://www.google.com/search?q=js&oq=js"
						title="Test URL"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="w-fit justify-start gap-1 px-1 text-muted-foreground"
						onClick={() => {
							setAdvancedOpen((prev) => !prev);
						}}
						title={
							advancedOpen
								? "Collapse advanced options"
								: "Expand advanced options"
						}
					>
						{advancedOpen ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
						Advanced
					</Button>

					{advancedOpen && (
						<div className="flex flex-col gap-4 rounded-md border p-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="rulePosition">Position</Label>
								<Input
									id="rulePosition"
									type="number"
									inputMode="numeric"
									min={1}
									max={maxPosition}
									value={formState.position}
									onChange={(e) => {
										setFormState((prev) => ({
											...prev,
											position: e.target.value,
										}));
									}}
									onBlur={() => {
										setFormState((prev) => ({
											...prev,
											position: String(resolvePositionFromInput(prev.position)),
										}));
									}}
									title="Position"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="excludePattern">
									Exclude Pattern (optional)
								</Label>
								<Input
									id="excludePattern"
									placeholder={
										formState.mode === "regex"
											? "https://(twitter|x)\\.com/home"
											: "https://x.com/home"
									}
									value={formState.exclude}
									onChange={(e) => {
										setFormState((prev) => ({
											...prev,
											exclude: e.target.value,
										}));
									}}
									onBlur={trimOnBlur("exclude")}
									title="URLs matching this pattern are never redirected by this rule"
								/>
							</div>
						</div>
					)}
				</div>

				{ruleCheckResult && <RuleCheckResult result={ruleCheckResult} />}
			</div>
		</ResponsiveDialog>
	);
}
