# Privacy Policy for Redirector

> Last updated: 2026-08-01

## Data Collection

Redirector's core function — matching a visited URL against your rules and redirecting — runs **entirely on your device**. No URL, no page content, and no browsing data is ever sent anywhere by this feature. Your rules are stored locally (or synced via your browser's own sync storage, entirely under the browser vendor's — not our — privacy policy).

### Anonymous Usage Statistics

The extension sends **at most one anonymous ping per day** to our own infrastructure (extport, running on Cloudflare) so we can see how many installs are active and which versions are in use. Each ping contains exactly:

- a random install identifier (generated locally, not linked to you or your account on any service)
- the extension version
- your browser's UI language (e.g. `en-US`)

From the network request itself our server derives the browser, operating system, and country (the IP address is used only for the country lookup and is **not stored**). Raw pings are deleted after 90 days; only aggregate daily counts are kept. No URL you visit, no rule you configure, and no other behavioral data is ever included.

This is a fixed part of the extension, not a setting inside it. Firefox users get their browser's own control over it — decline "Share technical and interaction data" in the install prompt, or manage it later under `about:addons` → Redirector → Permissions.

## Data Sharing

We do **not** sell, trade, or share any data with third parties.

## Open Source

This extension is fully open source. You can review the complete source code at https://github.com/rxliuli/redirector.

## Contact

If you have questions about this privacy policy, contact us at: rxliuli@gmail.com
