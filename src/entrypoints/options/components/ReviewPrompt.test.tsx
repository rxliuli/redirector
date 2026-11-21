import { fakeBrowser } from "@webext-core/fake-browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import {
	resetReviewThresholdCache,
	REVIEW_MIN_AGE_MS,
	REVIEW_MIN_REDIRECTS,
	REVIEW_STATE_KEY,
	REVIEW_USAGE_KEY,
} from "$lib/review";
import ReviewPrompt from "./ReviewPrompt";

describe("ReviewPrompt", () => {
	beforeEach(() => {
		Reflect.set(globalThis, "browser", fakeBrowser);
		fakeBrowser.reset();
		resetReviewThresholdCache();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, "browser");
		vi.restoreAllMocks();
	});

	it("does not render when the user has not reached the milestone", async () => {
		const screen = await render(<ReviewPrompt />);
		await expect
			.element(screen.getByRole("region", { name: "Review Redirector" }))
			.not.toBeInTheDocument();
	});

	it("renders when eligible and hides + persists reviewed state on click", async () => {
		await browser.storage.local.set({
			[REVIEW_USAGE_KEY]: {
				installedAt: Date.now() - REVIEW_MIN_AGE_MS - 1000,
				redirectCount: REVIEW_MIN_REDIRECTS,
			},
		});

		const screen = await render(<ReviewPrompt />);
		const region = screen.getByRole("region", { name: "Review Redirector" });
		await expect.element(region).toBeVisible();

		const rateLink = screen.getByRole("link", { name: "Leave a Review" });
		await expect.element(rateLink).toBeVisible();
		await expect
			.element(screen.getByRole("link", { name: "Send Feedback" }))
			.toBeVisible();

		// Prevent navigation from opening a tab during click
		rateLink.element().addEventListener("click", (e) => e.preventDefault());
		await rateLink.click();

		await expect.element(region).not.toBeInTheDocument();
		const stored = await browser.storage.sync.get(REVIEW_STATE_KEY);
		expect(stored[REVIEW_STATE_KEY]).toEqual({ status: "reviewed" });
	});

	it("snoozes on Later click and hides Later after max snoozes", async () => {
		await browser.storage.local.set({
			[REVIEW_USAGE_KEY]: {
				installedAt: Date.now() - REVIEW_MIN_AGE_MS - 1000,
				redirectCount: REVIEW_MIN_REDIRECTS,
			},
		});

		const screen = await render(<ReviewPrompt />);
		await screen.getByRole("button", { name: "Later" }).click();

		await expect
			.element(screen.getByRole("region", { name: "Review Redirector" }))
			.not.toBeInTheDocument();

		const stored = await browser.storage.sync.get(REVIEW_STATE_KEY);
		expect(stored[REVIEW_STATE_KEY]).toMatchObject({
			status: "snoozed",
			snoozeCount: 1,
		});
	});

	it("permanently dismisses when clicking the close button", async () => {
		await browser.storage.local.set({
			[REVIEW_USAGE_KEY]: {
				installedAt: Date.now() - REVIEW_MIN_AGE_MS - 1000,
				redirectCount: REVIEW_MIN_REDIRECTS,
			},
		});

		const screen = await render(<ReviewPrompt />);
		await screen.getByRole("button", { name: "Dismiss review prompt" }).click();

		await expect
			.element(screen.getByRole("region", { name: "Review Redirector" }))
			.not.toBeInTheDocument();

		const stored = await browser.storage.sync.get(REVIEW_STATE_KEY);
		expect(stored[REVIEW_STATE_KEY]).toEqual({ status: "dismissed" });
	});
});
