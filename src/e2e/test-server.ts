import { serve } from '@hono/node-server'
import { Hono } from 'hono'

export function createTestServer(port = 3456) {
  const app = new Hono()

  app.get('/search', (c) => {
    const query = c.req.query('q')
    const btnI = c.req.query('btnI')

    if (btnI !== undefined) {
      const targetUrl = getFirstResult(query || '')
      return c.redirect(`/url?q=${encodeURIComponent(targetUrl)}`, 302)
    }

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Search Results</title></head>
        <body>
          <h1>Search Results for: ${query}</h1>
        </body>
      </html>
    `)
  })

  app.get('/url', (c) => {
    const targetUrl = c.req.query('q')
    if (targetUrl) {
      return c.redirect(targetUrl, 302)
    }
    return c.text('No redirect URL', 400)
  })

  app.get('/destination', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Destination Site</title></head>
        <body>
          <h1>You reached the destination!</h1>
          <p>This is the final page after 302 redirects</p>
        </body>
      </html>
    `)
  })

  app.get('/loop-a', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Page A</title></head>
        <body>
          <h1>Page A (would cause circular redirect)</h1>
        </body>
      </html>
    `)
  })

  app.get('/loop-b', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Page B</title></head>
        <body>
          <h1>Page B (would cause circular redirect)</h1>
        </body>
      </html>
    `)
  })

  // Multi-rule redirect chain test: Step 1 - Email click tracker
  app.get('/click-tracker', (c) => {
    const targetUrl = c.req.query('url')
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Click Tracker</title></head>
        <body>
          <h1>Click Tracker (like redditmail.com)</h1>
          <p>Tracking URL: ${targetUrl}</p>
          <p>This would normally redirect to: ${targetUrl ? decodeURIComponent(targetUrl) : 'N/A'}</p>
        </body>
      </html>
    `)
  })

  // Multi-rule redirect chain test: Step 2 - Reddit with tracking params
  app.get('/reddit/comment', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Reddit Comment</title></head>
        <body>
          <h1>Reddit Comment (with tracking params)</h1>
          <p>URL: ${c.req.url}</p>
        </body>
      </html>
    `)
  })

  // Multi-rule redirect chain test: Step 3 - Clean Reddit page (final destination)
  app.get('/reddit/clean', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Clean Reddit Comment</title></head>
        <body>
          <h1>Clean Reddit Comment (no tracking)</h1>
          <p>This is the final clean URL</p>
        </body>
      </html>
    `)
  })

  // General reddit catch-all page
  app.get('/reddit/general', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>General Reddit Page</title></head>
        <body>
          <h1>General Reddit Page</h1>
          <p>Caught by general rule</p>
        </body>
      </html>
    `)
  })

  app.get('/youtube', (c) => {
    const url = c.req.url
    if (!url.endsWith('/')) {
      return c.redirect('/youtube/', 302)
    }

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>YouTube Home</title></head>
        <body>
          <h1>YouTube Home</h1>
        </body>
      </html>
    `)
  })

  // Test page with preload links - should NOT trigger extension redirects
  app.get('/page-with-preload', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Page with Preload</title>
          <link rel="preload" href="/preload-target" as="document">
        </head>
        <body>
          <h1>Page with Preload Links</h1>
          <p>This page has preload links that should not trigger redirects</p>
        </body>
      </html>
    `)
  })

  app.get('/preload-target', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Preload Target</title></head>
        <body>
          <h1>Preload Target Page</h1>
          <p>This page was preloaded</p>
        </body>
      </html>
    `)
  })

  app.get('/final-destination', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Final Destination</title></head>
        <body>
          <h1>Final Destination After Redirect</h1>
        </body>
      </html>
    `)
  })

  // Navigate-to-original test pages
  app.get('/original', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Original Page</title></head>
        <body>
          <h1>Original Page (before redirect)</h1>
          <iframe src="/iframe-a" width="100" height="100"></iframe>
          <iframe src="/iframe-b" width="100" height="100"></iframe>
        </body>
      </html>
    `)
  })

  app.get('/iframe-a', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html><body><p>iframe A</p></body></html>
    `)
  })

  app.get('/iframe-b', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html><body><p>iframe B</p></body></html>
    `)
  })

  app.get('/redirected', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Redirected Page</title></head>
        <body><h1>Redirected Page (after redirect)</h1></body>
      </html>
    `)
  })

  app.get('/source-b', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Source B</title></head>
        <body><h1>Source B Page</h1></body>
      </html>
    `)
  })

  app.get('/target-b', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Target B</title></head>
        <body><h1>Target B Page</h1></body>
      </html>
    `)
  })

  // Regex query param redirect test
  app.get('/result', (c) => {
    const q = c.req.query('q')
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Result</title></head>
        <body><h1>Result for: ${q}</h1></body>
      </html>
    `)
  })

  // Server-side bounce-back loop test (issue #29).
  // /bounce-target unconditionally 302s back to /bounce-source, simulating
  // Tumblr's behavior where the subdomain post URL bounces back to www.
  app.get('/bounce-source', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Bounce Source</title></head>
        <body><h1>Bounce Source</h1></body>
      </html>
    `)
  })

  app.get('/bounce-target', (c) => {
    return c.redirect('/bounce-source', 302)
  })

  // Convergent/idempotent redirect test (many-to-one pattern)
  app.get('/region-:region/:path', (c) => {
    const region = c.req.param('region')
    const path = c.req.param('path')
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Region ${region}</title></head>
        <body><h1>Region: ${region}, Path: ${path}</h1></body>
      </html>
    `)
  })

  // Regex anchor test: simulate YouTube-like "redirect homepage to feed" rule
  app.get('/site', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Site Home</title></head>
        <body><h1>Site Home (no trailing slash)</h1></body>
      </html>
    `)
  })

  app.get('/site/feed', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Site Feed</title></head>
        <body><h1>Site Feed</h1></body>
      </html>
    `)
  })

  app.get('/site/page', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Site Page</title></head>
        <body><h1>Site Page (should not redirect)</h1></body>
      </html>
    `)
  })

  // Page whose iframe src matches a redirect rule — the main frame must NOT redirect
  app.get('/page-with-matching-iframe', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Page with Matching Iframe</title></head>
        <body>
          <h1>Host page (should stay here)</h1>
          <iframe src="/iframe-redirect-target" width="100" height="100"></iframe>
        </body>
      </html>
    `)
  })

  app.get('/iframe-redirect-target', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html><body><p>iframe content</p></body></html>
    `)
  })

  app.get('/iframe-redirected', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html><body><p>iframe redirected</p></body></html>
    `)
  })

  // Speculation Rules prefetch + 302 test: simulates Google Search prefetching
  // an Instagram URL that 302-redirects to a login page
  app.get('/page-with-speculation', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Search Results</title>
          <script type="speculationrules">
          {
            "prefetch": [{
              "urls": ["/speculation-target"]
            }]
          }
          </script>
        </head>
        <body>
          <h1>Search results (should stay here)</h1>
          <a href="/speculation-target">Result link</a>
        </body>
      </html>
    `)
  })

  let speculationTargetHit = false

  app.get('/speculation-target', (c) => {
    speculationTargetHit = true
    return c.redirect('/speculation-login', 302)
  })

  app.get('/speculation-target-hit', (c) => {
    const hit = speculationTargetHit
    speculationTargetHit = false
    return c.json({ hit })
  })

  app.get('/speculation-login', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Login</title></head>
        <body><h1>Login page</h1></body>
      </html>
    `)
  })

  app.get('/speculation-redirected', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Redirected</title></head>
        <body><h1>Redirected (should not reach)</h1></body>
      </html>
    `)
  })

  const server = serve({ fetch: app.fetch, port })

  return {
    url: `http://localhost:${port}`,
    close: () => {
      server.close()
    },
  }
}

function getFirstResult(query: string): string {
  const results: Record<string, string> = {
    uw: 'http://localhost:3456/destination',
    test: 'http://localhost:3456/destination',
  }
  return results[query.toLowerCase()] || 'http://localhost:3456/destination'
}
