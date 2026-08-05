import { useMemo, useState } from "react";

import { checkRuleChain, type CheckResult } from "$lib/check";
import ResponsiveDialog from "$lib/components/extra/ResponsiveDialog";
import SelectGroup from "$lib/components/extra/SelectGroup";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import type { MatchRule } from "$lib/url";
import RuleCheckResult from "./RuleCheckResult";

const templates: { label: string; value: MatchRule & { testUrl: string } }[] = [
	{
		label: "Reddit → Old Reddit",
		value: {
			from: "^https://www.reddit.com/(.*)",
			to: "https://old.reddit.com/$1",
			mode: "regex",
			testUrl: "https://www.reddit.com/r/cats",
		},
	},
	{
		label: "Google → DuckDuckGo",
		value: {
			from: "^https://www.google.com/search\\?q=(.*?)&.*$",
			to: "https://duckduckgo.com/?q=$1",
			mode: "regex",
			testUrl: "https://www.google.com/search?q=js&oq=js",
		},
	},
	{
		label: "X/Twitter → Nitter",
		value: {
			from: "^https://(x|twitter)\\.com/(.*)",
			to: "https://nitter.net/$2",
			mode: "regex",
			testUrl: "https://x.com/elonmusk/status/2047881966268117064",
		},
	},
];

interface RuleDialogProps {
	open: boolean;
	rule?: MatchRule;
	index?: number;
	allRules: MatchRule[];
	onClose: () => void;
	onSave: (rule: MatchRule, index?: number) => void | Promise<void>;
}

export default function RuleDialog({
	open,
	rule,
	index,
	allRules,
	onClose,
	onSave,
}: RuleDialogProps) {
	const [formState, setFormState] = useState({
		from: rule?.from ?? "",
		to: rule?.to ?? "",
		exclude: rule?.exclude ?? "",
		testUrl: rule?.testUrl ?? "",
		mode: (rule?.mode ?? "regex") as MatchRule["mode"],
		disabled: rule?.disabled ?? false,
	});
	const [selectedTemplate, setSelectedTemplate] = useState<
		string | undefined
	>(undefined);

	function applyTemplate(label: string) {
		setSelectedTemplate(label);
		const template = templates.find((t) => t.label === label);
		if (template) {
			setFormState((prev) => ({
				...prev,
				from: template.value.from,
				to: template.value.to,
				exclude: template.value.exclude ?? "",
				mode: template.value.mode ?? "regex",
				testUrl: template.value.testUrl ?? "",
			}));
		}
	}

	const ruleCheckResult: CheckResult | null = useMemo(() => {
		if (formState.from && formState.to && formState.testUrl) {
			const currentRule = {
				from: formState.from.trim(),
				to: formState.to.trim(),
				exclude: formState.exclude.trim() || undefined,
				mode: formState.mode,
			};
			const tempRules =
				index !== undefined
					? allRules.map((r, i) => (i === index ? currentRule : r))
					: [currentRule, ...allRules];
			return checkRuleChain(tempRules, formState.testUrl.trim());
		}
		return null;
	}, [formState, index, allRules]);

	async function handleSave() {
		if (formState.from && formState.to) {
			try {
				await onSave(
					{
						from: formState.from.trim(),
						to: formState.to.trim(),
						exclude: formState.exclude.trim() || undefined,
						disabled: formState.disabled || undefined,
						mode: formState.mode,
						testUrl: formState.testUrl.trim() || undefined,
					},
					index,
				);
				onClose();
			} catch {
				// The parent handler reports save errors via toast.
			}
		}
	}

	const trimOnBlur = (field: "from" | "to" | "exclude") => () => {
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
				{index === undefined && (
					<div className="flex flex-col gap-2">
						<Label>Template</Label>
						<SelectGroup
							value={selectedTemplate}
							onValueChange={applyTemplate}
							options={templates.map((t) => ({
								label: t.label,
								value: t.label,
							}))}
							placeholder="Start from a template (optional)"
							className="w-full"
						/>
					</div>
				)}

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
					<Label htmlFor="excludePattern">Exclude Pattern (optional)</Label>
					<Input
						id="excludePattern"
						placeholder={
							formState.mode === "regex"
								? "https://(twitter|x)\\.com/home"
								: "https://x.com/home"
						}
						value={formState.exclude}
						onChange={(e) => {
							setFormState((prev) => ({ ...prev, exclude: e.target.value }));
						}}
						onBlur={trimOnBlur("exclude")}
						title="URLs matching this pattern are never redirected by this rule"
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

				{ruleCheckResult && <RuleCheckResult result={ruleCheckResult} />}
			</div>
		</ResponsiveDialog>
	);
}
