import * as storage from "$lib/storage";
import type { MatchRule } from "$lib/url";
import { commands } from "@vitest/browser/context";
import { fakeBrowser } from "@webext-core/fake-browser";
import { toast } from "svelte-sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import App from "./App.svelte";

describe("quota handling", () => {
  beforeEach(async () => {
    Reflect.set(globalThis, "browser", fakeBrowser);

    const existingRule: MatchRule = {
      mode: "regex",
      enabled: true,
      from: "https://example.com/from-existing",
      to: "https://example.com/to-existing",
    };
    await storage.writeRulesStorageMode("sync");
    await storage.writeRulesToMode("sync", [existingRule]);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "browser");
    vi.restoreAllMocks();
  });

  it("shows local mode suggestion toast when add, edit, and import fail in sync mode due to quota", async () => {
    const quotaMessage =
      "Storage quota exceeded. You can switch to Local mode in the menu.";
    const quotaError = new Error(
      "Resource::kQuotaBytesPerItem quota exceeded",
    );
    const originalSyncSet = browser.storage.sync.set.bind(
      browser.storage.sync,
    );
    vi.spyOn(browser.storage.sync, "set").mockImplementation(
      async (value) => {
        if ("rules" in value) {
          throw quotaError;
        }
        return originalSyncSet(value);
      },
    );
    const toastErrorSpy = vi.spyOn(toast, "error");

    const screen = render(App);

    await screen.getByTitle("Add Rule").click();
    await screen
      .getByTitle("Match URL")
      .fill("https://example.com/from-add");
    await screen
      .getByTitle("Redirect URL")
      .fill("https://example.com/to-add");
    await screen.getByTitle("Save").click();

    await screen.getByTitle("Edit").click();
    await screen
      .getByTitle("Match URL")
      .fill("https://example.com/from-edit");
    await screen.getByTitle("Save").click();
    await screen.getByTitle("Cancel").click();

    await Promise.all([
      commands.waitForUpload({
        name: "rules.json",
        mimeType: "application/json",
        text: JSON.stringify([
          {
            mode: "regex",
            enabled: true,
            from: "https://example.com/from-import",
            to: "https://example.com/to-import",
          } satisfies MatchRule,
        ]),
      }),
      screen.getByTitle("Actions").click(),
      screen.getByTitle("Import").click(),
    ]);

    expect(toastErrorSpy).toHaveBeenCalledTimes(3);
    expect(
      toastErrorSpy.mock.calls.every(
        ([message]) => message === quotaMessage,
      ),
    ).toBe(true);
  });
});
