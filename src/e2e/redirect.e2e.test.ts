import { MatchRule } from '$lib/url'
import { test, expect, BrowserTestContext } from './fixtures'

interface RedirectRule {
  rule: MatchRule
  from: string
  to: string
}

function testRule(options: RedirectRule, only?: boolean) {
  const testFn = only ? test.only : test
  testFn(
    `redirect rule: ${options.from} -> ${options.to}`,
    async ({ serviceWorker, context }) => {
      // Set up redirect rule: Google Search -> DuckDuckGo
      await serviceWorker.evaluate(async (rule) => {
        await chrome.storage.sync.set({
          rules: [rule] satisfies MatchRule[],
        })
      }, options.rule)

      // Wait for storage change event to propagate to background script
      await context.pages()[0].waitForTimeout(500)

      // Navigate to test pages
      // Note: The redirect will abort the original request, throwing an ERR_ABORTED error
      const { from, to } = options

      const page = await context.newPage()

      await page.goto(from, { timeout: 5000 }).catch(() => {
        // Expected ERR_ABORTED error when redirect happens, ignore it
      })

      // Wait for redirect to complete
      await page.waitForTimeout(1000)

      // Verify successful redirect
      expect(page.url()).toEqual(to)

      await page.close()
    },
  )
}

// Test regex capture group redirect with query params (local server, no external dependency)
test('redirect with regex capture groups on query params', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/search\\?q=(.+?)(&.*)?$`,
          mode: 'regex',
          to: `${testServerUrl}/result?q=$1`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()
  await page
    .goto(`${testServer.url}/search?q=playwright&oq=playwright`, {
      timeout: 5000,
    })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/result?q=playwright`)

  await page.close()
})
;[
  {
    from: 'https://www.youtube.com',
    to: 'https://www.youtube.com/feed/you',
  },
  {
    from: 'https://www.youtube.com/',
    to: 'https://www.youtube.com/feed/you',
  },
  {
    from: 'https://www.youtube.com/watch?v=cIlghWDd7RU',
    to: 'https://www.youtube.com/watch?v=cIlghWDd7RU',
  },
].forEach((testUrl) =>
  testRule({
    rule: {
      from: 'https://www.youtube.com/?$',
      mode: 'regex',
      to: 'https://www.youtube.com/feed/you',
    },
    from: testUrl.from,
    to: testUrl.to,
  }),
)

// Test with local test server to avoid Google's bot detection
// This test validates the fix for handling extension redirects after website 302 redirections
// Fix: https://discord.com/channels/1376360845344374784/1380033039681196102/1445806872790696067
// Context: When a website returns a 302 redirect, the extension needs to listen to
// webRequest.onBeforeRedirect to add the redirected URL to confirmedNavigations,
// so that the extension can properly intercept and redirect the subsequent request
test('handle 302 redirect chain with url-pattern', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Setup rule to extract URL from query parameter
  // Use decodeURIComponent pipe to decode the URL-encoded query parameter
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/url?q=:url`,
          mode: 'url-pattern',
          to: '{{search.groups.url | decodeURIComponent}}',
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()

  // Navigate to search with btnI (I'm Feeling Lucky)
  // This triggers a 302 redirect chain:
  // 1. /search?q=uw&btnI -> 302 to /url?q=http://localhost:3456/destination
  // 2. /url?q=... -> Extension intercepts and redirects to /destination
  await page
    .goto(`${testServer.url}/search?q=uw&btnI`, {
      timeout: 5000,
    })
    .catch(() => {
      // Expected ERR_ABORTED when extension redirects
    })

  await page.waitForTimeout(1000)

  const finalUrl = page.url()

  // Verify we ended up at the destination, not at the /url intermediate page
  expect(finalUrl).toBe(`${testServer.url}/destination`)

  await page.close()
})

// Test circular redirect detection
test('prevent circular redirects', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Setup rules that would cause a circular redirect:
  // /loop-a -> /loop-b
  // /loop-b -> /loop-a
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/loop-a`,
          mode: 'regex',
          to: `${testServerUrl}/loop-b`,
        },
        {
          from: `${testServerUrl}/loop-b`,
          mode: 'regex',
          to: `${testServerUrl}/loop-a`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  // Enable console logging to verify circular redirect detection
  const consoleMessages: string[] = []
  serviceWorker.on('console', (msg) => {
    consoleMessages.push(msg.text())
  })

  const page = await context.newPage()

  // Navigate to loop-a, which should trigger the circular redirect detection
  await page
    .goto(`${testServer.url}/loop-a`, {
      timeout: 5000,
    })
    .catch(() => {
      // May have ERR_ABORTED
    })

  // Wait a bit for all redirects to attempt
  await page.waitForTimeout(2000)

  const finalUrl = page.url()

  // The extension should detect the circular redirect and stop after 3 attempts
  // So we should end up on one of the loop pages instead of infinitely redirecting
  const isOnLoopPage =
    finalUrl === `${testServer.url}/loop-a` ||
    finalUrl === `${testServer.url}/loop-b`

  expect(isOnLoopPage).toBe(true)

  // Verify that the circular redirect detection was triggered
  const hasCircularRedirectError = consoleMessages.some((msg) =>
    msg.includes('circular-redirect'),
  )

  expect(hasCircularRedirectError).toBe(true)

  await page.close()

  // Wait for the redirect counter to reset (3 seconds)
  await context.pages()[0].waitForTimeout(3500)
})

// Test that circular redirect detection resets after timeout
test('circular redirect detection resets after timeout', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Setup a rule that redirects to itself
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/loop-a`,
          mode: 'regex',
          to: `${testServerUrl}/loop-b`,
        },
        {
          from: `${testServerUrl}/loop-b`,
          mode: 'regex',
          to: `${testServerUrl}/loop-a`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const consoleMessages: string[] = []
  serviceWorker.on('console', (msg) => {
    consoleMessages.push(msg.text())
  })

  const page = await context.newPage()

  // First attempt - should trigger circular redirect detection
  await page.goto(`${testServer.url}/loop-a`, { timeout: 5000 }).catch(() => {})

  await page.waitForTimeout(1000)

  // Verify circular redirect was detected
  expect(
    consoleMessages.some((msg) => msg.includes('circular-redirect')),
  ).toBe(true)

  // Clear console messages
  consoleMessages.length = 0

  // Wait for the redirect counter to reset (3 seconds + buffer)
  await page.waitForTimeout(3500)

  // Second attempt - after reset, should trigger circular redirect detection again
  // This proves the counter was reset
  await page.goto(`${testServer.url}/loop-a`, { timeout: 5000 }).catch(() => {})

  await page.waitForTimeout(1000)

  // Verify circular redirect was detected again (proving reset worked)
  expect(
    consoleMessages.some((msg) => msg.includes('circular-redirect')),
  ).toBe(true)

  await page.close()
})

// Test detection of server-side bounce-back loops.
// Issue: https://github.com/rxliuli/redirector/issues/29
// Scenario: extension redirects A→B, but the server 302s B back to A.
// Without cross-call loop detection, handleRedirect would fire on A forever.
test('prevent server-side bounce-back redirect loops', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Rule: /bounce-source → /bounce-target
  // Server: /bounce-target 302s back to /bounce-source (the loop)
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/bounce-source`,
          mode: 'regex',
          to: `${testServerUrl}/bounce-target`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const consoleMessages: string[] = []
  serviceWorker.on('console', (msg) => {
    consoleMessages.push(msg.text())
  })

  const page = await context.newPage()

  await page
    .goto(`${testServer.url}/bounce-source`, { timeout: 8000 })
    .catch(() => {
      // Expected ERR_ABORTED while the loop is in progress
    })

  // Wait long enough for the loop to be detected and the page to settle.
  await page.waitForTimeout(2500)

  // After detection, the navigation chain stops; the page should rest on one
  // of the two URLs rather than hanging or hitting ERR_TOO_MANY_REDIRECTS.
  expect([
    `${testServer.url}/bounce-source`,
    `${testServer.url}/bounce-target`,
  ]).toContain(page.url())

  // Verify the extension actually triggered loop detection (not just lucky timing)
  expect(
    consoleMessages.some((msg) => msg.includes('redirect-loop detected')),
  ).toBe(true)

  await page.close()

  // Allow the per-(tab,url) counter window to lapse before the next test
  await context.pages()[0].waitForTimeout(3500)
})

// Test multiple rules chaining redirects (like Reddit email link cleanup)
// This test validates that intermediate redirects are computed internally by the extension
// and do NOT appear in browser history. Only the initial URL and final destination are recorded.
// Example: Rules define a → b → c → d, but browser history only shows [a, d]
test('chain multiple redirect rules', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Setup multiple rules that should apply in sequence:
  // Rule 1: Remove click tracker - extract the target URL
  // Rule 2: Clean up tracking parameters from Reddit URL
  // Rule 3: Normalize the final URL
  // Expected internal chain: /click-tracker → /reddit/comment?ref=... → /reddit/comment → /reddit/clean
  // Browser history should only contain: /click-tracker (initial) and /reddit/clean (final)
  await serviceWorker.evaluate(
    async (testServerUrl) => {
      await chrome.storage.sync.set({
        rules: [
          // First rule: Extract URL from click tracker and decode it
          {
            from: `${testServerUrl}/click-tracker\\?url=(.*)`,
            mode: 'regex',
            to: '{{$1 | decodeURIComponent}}',
          },
          // Second rule: Remove tracking params from Reddit URLs
          {
            from: `(${testServerUrl}/reddit/comment)\\?.*ref=email.*`,
            mode: 'regex',
            to: '$1',
          },
          // Third rule: Normalize the final URL
          {
            from: `${testServerUrl}/reddit/comment`,
            mode: 'regex',
            to: `${testServerUrl}/reddit/clean`,
          },
        ] satisfies MatchRule[],
      })
    },
    testServer.url,
  )

  await context.pages()[0].waitForTimeout(500)

  // Track redirects via console logs to verify internal chain processing
  const redirectLogs: string[] = []
  serviceWorker.on('console', (msg) => {
    const text = msg.text()
    redirectLogs.push(text)
  })

  const page = await context.newPage()

  // Record initial history length
  const initialHistoryLength = await page.evaluate(() => window.history.length)

  // Track navigation events to detect intermediate page loads
  const navigationUrls: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigationUrls.push(frame.url())
    }
  })

  // Simulate clicking a Reddit email link with tracking
  // This should trigger multiple redirects internally:
  // 1. /click-tracker?url=...reddit/comment?ref=email... (initial navigation)
  // 2. → /reddit/comment?ref=email... (rule 1: extract from click tracker and decode)
  // 3. → /reddit/comment (rule 2: remove tracking params)
  // 4. → /reddit/clean (rule 3: normalize URL - final destination)

  const trackedRedditUrl = encodeURIComponent(
    `${testServer.url}/reddit/comment?correlation_id=abc123&ref=email_comment_reply&ref_campaign=email`,
  )

  const initialUrl = `${testServer.url}/click-tracker?url=${trackedRedditUrl}`

  await page.goto(initialUrl, { timeout: 5000 }).catch(() => {
    // Expected ERR_ABORTED during redirects
  })

  await page.waitForTimeout(2000)

  const finalUrl = page.url()

  // Verify we ended up at the clean URL after all redirects
  expect(finalUrl).toBe(`${testServer.url}/reddit/clean`)

  // Get final history length
  const finalHistoryLength = await page.evaluate(() => window.history.length)

  // CRITICAL ASSERTION: Browser history should only contain 2 entries:
  // 1. The initial URL (/click-tracker?url=...)
  // 2. The final destination (/reddit/clean)
  // The intermediate redirects (/reddit/comment?ref=..., /reddit/comment) should NOT be in history
  // because they were computed internally by the extension via checkRuleChain()
  const historyEntriesAdded = finalHistoryLength - initialHistoryLength

  // Should only have added 1 entry (the final destination)
  // The initial navigation was attempted but redirected before completing
  expect(historyEntriesAdded).toBeLessThanOrEqual(1)

  // Verify that only the final URL was actually loaded in the browser
  // The intermediate URLs should not have been navigated to
  expect(navigationUrls).toHaveLength(1)
  expect(navigationUrls[0]).toBe(finalUrl)

  // Verify the extension processed the request
  // After the chain is computed, getRedirectUrl returns the final URL directly
  // and logs "No matching rule" for the final destination (since it doesn't match any more rules)
  const hasRedirectProcessing = redirectLogs.some(
    (log) =>
      log.includes('onBeforeNavigate') || log.includes('handleRedirect'),
  )
  expect(hasRedirectProcessing).toBe(true)

  await page.close()

  // Wait for redirect counter to reset
  await context.pages()[0].waitForTimeout(3500)
})

// Test that multiple rules with overlapping patterns chain correctly
test('multiple rules with overlapping patterns chain correctly', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Setup rules where cascading happens
  // Note: After the first redirect, the URL may match another rule
  await serviceWorker.evaluate(
    async (testServerUrl) => {
      await chrome.storage.sync.set({
        rules: [
          // First rule: Remove tracking params
          {
            from: `${testServerUrl}/reddit/comment\\?.*ref=email.*`,
            mode: 'regex',
            to: `${testServerUrl}/reddit/clean`,
          },
          // Second rule: Catch all reddit URLs and redirect to general
          // This will also match /reddit/clean after the first redirect
          {
            from: `${testServerUrl}/reddit/.*`,
            mode: 'regex',
            to: `${testServerUrl}/reddit/general`,
          },
        ] satisfies MatchRule[],
      })
    },
    testServer.url,
  )

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()

  // Test URL with ref=email will trigger chain:
  // 1. /reddit/comment?ref=email -> /reddit/clean (first rule)
  // 2. /reddit/clean -> /reddit/general (second rule catches it)
  await page
    .goto(`${testServer.url}/reddit/comment?ref=email_test`, {
      timeout: 5000,
    })
    .catch(() => {})

  await page.waitForTimeout(1000)

  // Should end up at /general because second rule catches /reddit/clean
  expect(page.url()).toBe(`${testServer.url}/reddit/general`)

  await page.close()
})

// Test that preload requests do NOT trigger redirects
// Fix for: https://github.com/rxliuli/redirector/issues/19
// Context: Browser preload requests trigger webRequest.onBeforeRequest but NOT webNavigation.onBeforeNavigate
// The extension must filter these out to avoid redirecting resources that are only being preloaded
test('preload requests should not trigger redirects', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  // Setup a rule that would redirect /preload-target
  await serviceWorker.evaluate(
    async (testServerUrl) => {
      await chrome.storage.sync.set({
        rules: [
          {
            from: `${testServerUrl}/preload-target`,
            mode: 'regex',
            to: `${testServerUrl}/final-destination`,
          },
        ] satisfies MatchRule[],
      })
    },
    testServer.url,
  )

  await context.pages()[0].waitForTimeout(500)

  // Track what the extension tries to redirect
  const consoleMessages: string[] = []
  serviceWorker.on('console', (msg) => {
    consoleMessages.push(msg.text())
  })

  const page = await context.newPage()

  // Navigate to page that has preload link for /preload-target
  await page.goto(`${testServer.url}/page-with-preload`, { timeout: 5000 })

  // Wait for preload to happen
  await page.waitForTimeout(1500)

  // Verify the preload request did NOT trigger a redirect
  // The extension should NOT have logged a redirect for the preload request
  const preloadRedirects = consoleMessages.filter(
    (msg) =>
      msg.includes('handleRedirect') && msg.includes('/preload-target'),
  )

  expect(preloadRedirects.length).toBe(0)

  // Now actually navigate to the preload target - this SHOULD trigger redirect
  await page
    .goto(`${testServer.url}/preload-target`, { timeout: 5000 })
    .catch(() => {})

  await page.waitForTimeout(1000)

  // Should be redirected to final-destination
  expect(page.url()).toBe(`${testServer.url}/final-destination`)

  // Verify the actual navigation DID trigger a redirect
  const actualRedirects = consoleMessages.filter(
    (msg) =>
      msg.includes('handleRedirect') && msg.includes('/preload-target'),
  )

  expect(actualRedirects.length).toBeGreaterThan(0)

  await page.close()
})

// Test navigate-to-original: pressing shortcut navigates back to the original URL
test('navigate to original page via shortcut', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/original`,
          mode: 'regex',
          to: `${testServerUrl}/redirected`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()

  // Navigate to /original, should be redirected to /redirected
  await page
    .goto(`${testServer.url}/original`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/redirected`)

  // Trigger navigate-to-original via service worker
  await serviceWorker.evaluate(async () => {
    await (self as any).navigateToOriginal()
  })
  await page.waitForTimeout(1000)

  expect(page.url()).toBe(`${testServer.url}/original`)

  await page.close()
})

// Test that refreshing after navigate-to-original stays on the original page
test('refresh stays on original after navigate-to-original', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/original`,
          mode: 'regex',
          to: `${testServerUrl}/redirected`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()

  // Navigate and get redirected
  await page
    .goto(`${testServer.url}/original`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/redirected`)

  // Go back to original
  await serviceWorker.evaluate(async () => {
    await (self as any).navigateToOriginal()
  })
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/original`)

  // Refresh - should stay on original, not be redirected again
  await page.reload({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/original`)

  await page.close()
})

// Test that navigating to a different URL in the same tab clears the skip
test('different URL in same tab redirects after navigate-to-original', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/original`,
          mode: 'regex',
          to: `${testServerUrl}/redirected`,
        },
        {
          from: `${testServerUrl}/source-b`,
          mode: 'regex',
          to: `${testServerUrl}/target-b`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()

  // Navigate and get redirected
  await page
    .goto(`${testServer.url}/original`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/redirected`)

  // Go back to original
  await serviceWorker.evaluate(async () => {
    await (self as any).navigateToOriginal()
  })
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/original`)

  // Navigate to a different URL in the same tab - should be redirected normally
  await page
    .goto(`${testServer.url}/source-b`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/target-b`)

  await page.close()
})

// Test that new tab still redirects after navigate-to-original in another tab
test('new tab still redirects after navigate-to-original', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/original`,
          mode: 'regex',
          to: `${testServerUrl}/redirected`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page1 = await context.newPage()

  // Tab 1: navigate and get redirected
  await page1
    .goto(`${testServer.url}/original`, { timeout: 5000 })
    .catch(() => {})
  await page1.waitForTimeout(1000)
  expect(page1.url()).toBe(`${testServer.url}/redirected`)

  // Tab 1: go back to original
  await serviceWorker.evaluate(async () => {
    await (self as any).navigateToOriginal()
  })
  await page1.waitForTimeout(1000)
  expect(page1.url()).toBe(`${testServer.url}/original`)

  // Tab 2: navigate to same URL - should still redirect
  const page2 = await context.newPage()
  await page2
    .goto(`${testServer.url}/original`, { timeout: 5000 })
    .catch(() => {})
  await page2.waitForTimeout(1000)
  expect(page2.url()).toBe(`${testServer.url}/redirected`)

  await page1.close()
  await page2.close()
})

// Test that iframe navigations don't clear the skip record
// Regression test: pages with iframes (e.g. Google's cookie rotation, YouTube embeds)
// fire onBeforeNavigate with the same tabId but different URLs.
// These sub-frame navigations must NOT clear the tabSkippedUrls entry.
test('iframe navigations do not break navigate-to-original', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/original`,
          mode: 'regex',
          to: `${testServerUrl}/redirected`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()

  // Navigate and get redirected
  await page
    .goto(`${testServer.url}/original`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/redirected`)

  // Go back to original (which has iframes loading /iframe-a and /iframe-b)
  await serviceWorker.evaluate(async () => {
    await (self as any).navigateToOriginal()
  })
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/original`)

  // Wait for iframes to load — their onBeforeNavigate events must not clear the skip
  await page.waitForTimeout(1000)

  // Refresh — should still stay on original, not be redirected again
  await page.reload({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/original`)

  await page.close()
})

// Test convergent/idempotent redirects (A → B → B)
// Simulates "many-to-one" pattern (e.g., jp.v2ex.com → us.v2ex.com)
// Uses local test server paths instead of external domains to avoid flakiness
test('convergent redirect: different region redirects to target', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/region-\\w+/(.*)`,
          mode: 'regex',
          to: `${testServerUrl}/region-us/$1`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  const page = await context.newPage()
  await page
    .goto(`${testServer.url}/region-jp/test`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/region-us/test`)

  await page.close()
})

test('convergent redirect: target region is idempotent (no redirect)', async ({
  serviceWorker,
  context,
  testServer,
}) => {
  await serviceWorker.evaluate(async (testServerUrl) => {
    await chrome.storage.sync.set({
      rules: [
        {
          from: `${testServerUrl}/region-\\w+/(.*)`,
          mode: 'regex',
          to: `${testServerUrl}/region-us/$1`,
        },
      ] satisfies MatchRule[],
    })
  }, testServer.url)

  await context.pages()[0].waitForTimeout(500)

  // Idempotent case: /region-us/test matches the rule but produces the same URL
  // This should NOT be treated as a circular error - just stop the chain
  const page = await context.newPage()
  await page
    .goto(`${testServer.url}/region-us/test`, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(1000)
  expect(page.url()).toBe(`${testServer.url}/region-us/test`)

  await page.close()
})
