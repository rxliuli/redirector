import { StarIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "$lib/components/ui/button";
import {
	FEEDBACK_URL,
	getReviewPromptMeta,
	getStoreReviewUrl,
	markReviewDismissed,
	markReviewReviewed,
	type ReviewPromptMeta,
	snoozeReviewPrompt,
} from "$lib/review";

export default function ReviewPrompt() {
	const [meta, setMeta] = useState<ReviewPromptMeta | null>(null);

	useEffect(() => {
		let cancelled = false;
		void getReviewPromptMeta().then((result) => {
			if (!cancelled) {
				setMeta(result);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!meta?.visible) {
		return null;
	}

	const reviewUrl = getStoreReviewUrl();

	function handleRate() {
		setMeta(null);
		void markReviewReviewed().catch((error) => {
			console.error("Failed to persist review state", error);
		});
	}

	function handleSnooze() {
		setMeta(null);
		void snoozeReviewPrompt().catch((error) => {
			console.error("Failed to snooze review prompt", error);
		});
	}

	function handleDismiss() {
		setMeta(null);
		void markReviewDismissed().catch((error) => {
			console.error("Failed to dismiss review prompt", error);
		});
	}

	return (
		<div
			role="region"
			aria-label="Review Redirector"
			className="bg-card text-card-foreground relative mb-4 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex items-start gap-3 pr-8 sm:pr-0">
				<StarIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
				<div className="text-sm">
					<p className="font-medium">Enjoying Redirector?</p>
					<p className="text-muted-foreground">
						Built and maintained by an indie developer. If Redirector has been
						saving you time, a quick review on the store really helps!
					</p>
				</div>
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-2">
				<Button size="sm" asChild>
					<a
						href={reviewUrl}
						target="_blank"
						rel="noopener noreferrer"
						onClick={handleRate}
					>
						Leave a Review
					</a>
				</Button>
				<Button variant="outline" size="sm" asChild>
					<a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
						Send Feedback
					</a>
				</Button>
				{meta.canSnooze && (
					<Button variant="ghost" size="sm" onClick={handleSnooze}>
						Later
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleDismiss}
					aria-label="Dismiss review prompt"
					title="Don't ask again"
					className="absolute top-2 right-2 sm:static"
				>
					<XIcon className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
