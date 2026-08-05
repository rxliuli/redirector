import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import type { CheckResult } from "$lib/check";
import { Alert, AlertDescription } from "$lib/components/ui/alert";
import { cn } from "$lib/utils";

interface RuleCheckResultProps {
	result: CheckResult;
}

function UrlChain({
	urls,
	highlightLast = false,
}: {
	urls: string[];
	highlightLast?: boolean;
}) {
	return (
		<div className="space-y-1">
			{urls.map((url, index) => (
				<div key={index} className="flex items-start gap-2">
					<div
						className={cn(
							"bg-muted flex-1 overflow-hidden rounded p-2 font-mono text-xs break-all",
							highlightLast &&
								index === urls.length - 1 &&
								"border border-red-200 bg-red-100",
						)}
					>
						{url}
					</div>
				</div>
			))}
		</div>
	);
}

export default function RuleCheckResult({ result }: RuleCheckResultProps) {
	if (result.status === "matched") {
		return (
			<Alert variant="default">
				<CircleCheckIcon className="h-4 w-4" />
				<AlertDescription>
					<div className="space-y-2">
						<p className="font-medium text-green-600">
							Valid redirect chain ({result.urls.length} redirect
							{result.urls.length === 1 ? "" : "s"})
						</p>
						<div className="text-muted-foreground text-sm">
							<p className="mb-1 font-medium">Redirect chain:</p>
							<UrlChain urls={result.urls} />
						</div>
					</div>
				</AlertDescription>
			</Alert>
		);
	}
	if (result.status === "not-matched") {
		return (
			<Alert variant="default">
				<TriangleAlertIcon className="h-4 w-4" />
				<AlertDescription>
					<p className="font-medium text-yellow-600">
						Redirect does not match any rules
					</p>
				</AlertDescription>
			</Alert>
		);
	}
	if (result.status === "excluded") {
		return (
			<Alert variant="default">
				<TriangleAlertIcon className="h-4 w-4" />
				<AlertDescription>
					<p className="font-medium text-yellow-600">
						Matches the rule, but the exclude pattern blocks the redirect
					</p>
				</AlertDescription>
			</Alert>
		);
	}
	if (result.status === "circular-redirect") {
		return (
			<Alert variant="destructive">
				<TriangleAlertIcon className="h-4 w-4" />
				<AlertDescription>
					<div className="space-y-2">
						<p className="font-medium">Circular redirect detected!</p>
						<div className="text-sm">
							<p className="mb-1 font-medium">Redirect chain:</p>
							<UrlChain urls={result.urls} highlightLast />
						</div>
					</div>
				</AlertDescription>
			</Alert>
		);
	}
	if (result.status === "infinite-redirect") {
		return (
			<Alert variant="destructive">
				<TriangleAlertIcon className="h-4 w-4" />
				<AlertDescription>
					<div className="space-y-2">
						<p className="font-medium">Infinite redirect detected!</p>
						<p className="text-sm">
							Too many redirects (&gt;{result.urls.length})
						</p>
						<div className="text-sm">
							<p className="mb-1 font-medium">Redirect chain (partial):</p>
							<UrlChain urls={result.urls.slice(0, 3)} />
							{result.urls.length > 3 && (
								<div className="text-muted-foreground py-1 text-center text-xs">
									... and {result.urls.length - 3} more redirects
								</div>
							)}
						</div>
					</div>
				</AlertDescription>
			</Alert>
		);
	}
	return null;
}
