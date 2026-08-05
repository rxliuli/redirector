import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPortal,
	DialogTitle,
} from "$lib/components/ui/dialog";
import { cn } from "$lib/utils";

interface ResponsiveDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
}

// One dialog for every screen size: fullscreen below md, a centered modal
// above. The old bottom-sheet (vaul) variant is gone on purpose — its
// visualViewport height juggling shrank the sheet a little more every time
// the mobile keyboard opened (issue #41). A fullscreen dialog needs no
// height compensation: the browser scrolls the focused input into view
// inside the scrollable middle section.
//
// The content is composed from Radix primitives instead of the ui/dialog
// DialogContent so that components/ui stays untouched CLI output: this
// variant needs a click-through backdrop and its own responsive layout.
export default function ResponsiveDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
}: ResponsiveDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange} modal={false}>
			<DialogPortal>
				{/* Radix renders no overlay when modal={false}; this dim layer is
				    decorative only. Clicks pass through it to the page, which both
				    dismisses the dialog and activates the element underneath —
				    the same semantics the old drawer had. */}
				<div
					aria-hidden
					className="pointer-events-none fixed inset-0 z-50 bg-black/50"
				/>
				<DialogPrimitive.Content
					data-slot="dialog-content"
					className={cn(
						"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed z-50 flex flex-col shadow-lg duration-200 outline-none",
						// Below md: fullscreen.
						"inset-0 h-full w-full",
						// md and up: centered, one fixed max width.
						"md:inset-auto md:top-[50%] md:left-[50%] md:h-auto md:max-h-[90vh] md:w-full md:max-w-lg md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-lg md:border",
					)}
				>
					<DialogHeader className="shrink-0 p-4 pb-2 text-left md:p-6 md:pb-2">
						<DialogTitle>{title}</DialogTitle>
						{description ? (
							<DialogDescription>{description}</DialogDescription>
						) : null}
					</DialogHeader>

					{/* No flex-grow: when the form is short the footer sits right
					    below it instead of being pinned to the bottom edge. */}
					<div className="min-h-0 overflow-y-auto px-4 py-2 md:px-6">
						{children}
					</div>

					{footer ? (
						<DialogFooter className="shrink-0 p-4 pt-2 md:p-6 md:pt-2">
							{footer}
						</DialogFooter>
					) : null}

					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	);
}
