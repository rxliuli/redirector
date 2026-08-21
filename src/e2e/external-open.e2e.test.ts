/// <reference types="chrome" />
import {
  test,
  expect,
  chromium,
  type BrowserContext,
  type Worker,
} from '@playwright/test'
import { findUp } from 'find-up'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type { MatchRule } from '$lib/url'
import { createTestServer } from './test-server'

// Scenario tests for URLs opened from OUTSIDE the browser (command line /
// another app, e.g. `open -a "Google Chrome" <url>` on macOS).
//
// Chromium dispatches extension events for these navigations in a different
// order than for in-browser navigations: the whole webRequest chain
// (onBeforeRequest → onBeforeRedirect → onBeforeRequest) runs BEFORE
// webNavigation.onBeforeNavigate is delivered. The extension's server-302
// confirmation chain assumes the documented order, so a rule whose URL is
// only reached via a server 302 never fired for externally opened URLs.
// Three fallbacks in background.ts cover this family of quirks: the
// webNavigation.onCommitted catch-all (late but delivered events), the
// onStartup/onInstalled tab sweep (events fired before the service worker
// even evaluated), and the post-onCompleted tabs.get polling (navigations
// served from Chrome's search prefetch that emit no webNavigation at all).
//
// Uses its own port so it can run in parallel with redirect.e2e.test.ts.
const PORT = 3458

async function extensionPath(): Promise<string> {
  const rootPath = path.dirname((await findUp('package.json'))!)
  return path.join(rootPath, '.output/chrome-mv3')
}

// Headed on purpose: process-singleton URL forwarding (what `open -a` relies
// on) is not available in headless mode, and the reported bug is a real
// headed-browser scenario.
async function launchWithExtension(
  profileDir: string,
): Promise<BrowserContext> {
  const pathToExtension = await extensionPath()
  return chromium.launchPersistentContext(profileDir, {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  })
}

async function getServiceWorker(context: BrowserContext): Promise<Worker> {
  return context.serviceWorkers()[0] ?? context.waitForEvent('serviceworker')
}

// The rule only matches the /url?q= hop, which /search?btnI reaches via a
// server 302 — mirroring Google's "I'm Feeling Lucky" Redirect Notice case.
async function seedUrlExtractionRule(sw: Worker, testServerUrl: string) {
  await sw.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/url\\?q=(.*)`,
          mode: 'regex',
          to: '{{$1 | decodeURIComponent}}',
        },
      ] satisfies MatchRule[],
    })
  }, testServerUrl)
}

// Spawning the same binary with the same --user-data-dir makes Chromium's
// process singleton forward the URL to the already-running instance and exit
// — the same code path an external `open -a` / xdg-open invocation takes.
// --use-mock-keychain keeps raw-spawned Chromium off the macOS keychain
// (Playwright adds it for its own launches); without it every spawn pops a
// "access Safe Storage in your keychain" dialog.
function externalOpen(profileDir: string, url: string) {
  spawn(
    chromium.executablePath(),
    [`--user-data-dir=${profileDir}`, '--use-mock-keychain', url],
    { stdio: 'ignore' },
  )
}

test('external open: URL reached via server 302 still redirects', async () => {
  const server = createTestServer(PORT)
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirector-e2e-'))
  const context = await launchWithExtension(profileDir)
  try {
    const sw = await getServiceWorker(context)
    await seedUrlExtractionRule(sw, server.url)
    await context.pages()[0]!.waitForTimeout(500)

    // Keep the service worker warm so the failure can't be blamed on wake-up
    const warm = await context.newPage()
    await warm.goto(`${server.url}/destination`, { timeout: 5000 })

    const pagePromise = context.waitForEvent('page', { timeout: 10000 })
    externalOpen(profileDir, `${server.url}/search?q=uw&btnI`)
    const page = await pagePromise

    await expect
      .poll(() => page.url(), { timeout: 8000 })
      .toBe(`${server.url}/destination`)
  } finally {
    await context.close()
    server.close()
    fs.rmSync(profileDir, { recursive: true, force: true })
  }
})

test('external open: directly matching URL redirects', async () => {
  const server = createTestServer(PORT)
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirector-e2e-'))
  const context = await launchWithExtension(profileDir)
  try {
    const sw = await getServiceWorker(context)
    await seedUrlExtractionRule(sw, server.url)
    await context.pages()[0]!.waitForTimeout(500)

    const warm = await context.newPage()
    await warm.goto(`${server.url}/destination`, { timeout: 5000 })

    const target = encodeURIComponent(`${server.url}/destination`)
    const pagePromise = context.waitForEvent('page', { timeout: 10000 })
    externalOpen(profileDir, `${server.url}/url?q=${target}`)
    const page = await pagePromise

    await expect
      .poll(() => page.url(), { timeout: 8000 })
      .toBe(`${server.url}/destination`)
  } finally {
    await context.close()
    server.close()
    fs.rmSync(profileDir, { recursive: true, force: true })
  }
})

// Cold start: the browser is launched with the URL already on the command
// line, so the navigation races extension initialization itself — events that
// fire before the service worker script evaluates are lost entirely. The
// onStartup tab sweep (plus onCommitted for late commits) must still land the
// tab on the rule's target.
test('cold browser launch with command-line URL redirects', async () => {
  const server = createTestServer(PORT)
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirector-e2e-'))

  // First launch: install the extension and persist the rule to the profile
  {
    const context = await launchWithExtension(profileDir)
    const sw = await getServiceWorker(context)
    await seedUrlExtractionRule(sw, server.url)
    await context.pages()[0]!.waitForTimeout(1000)
    await context.close()
  }

  // Second launch: spawn the browser directly (Playwright refuses URL args)
  // with the URL on the command line, then attach over CDP to observe it.
  const pathToExtension = await extensionPath()
  const portFile = path.join(profileDir, 'DevToolsActivePort')
  fs.rmSync(portFile, { force: true })
  const child = spawn(
    chromium.executablePath(),
    [
      `--user-data-dir=${profileDir}`,
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--remote-debugging-port=0',
      '--no-first-run',
      '--no-default-browser-check',
      '--use-mock-keychain',
      `${server.url}/search?q=uw&btnI`,
    ],
    { stdio: 'ignore' },
  )
  try {
    await expect
      .poll(
        () => {
          try {
            return fs.readFileSync(portFile, 'utf-8').split('\n')[0]
          } catch {
            return ''
          }
        },
        { timeout: 10000 },
      )
      .not.toBe('')
    const port = fs.readFileSync(portFile, 'utf-8').split('\n')[0]
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
    try {
      const pages = () =>
        browser.contexts().flatMap((c) => c.pages().map((p) => p.url()))
      await expect
        .poll(pages, { timeout: 10000 })
        .toContain(`${server.url}/destination`)
    } finally {
      await browser.close()
    }
  } finally {
    child.kill()
    server.close()
    fs.rmSync(profileDir, { recursive: true, force: true })
  }
})
