# Redirector

[Chrome](https://chromewebstore.google.com/detail/redirector/lioaeidejmlpffbndjhaameocfldlhin), [Safari](https://apps.apple.com/cn/app/url-redirector/id6743197230), [Edge](https://microsoftedge.microsoft.com/addons/detail/redirector/jhdjcofnjfeljeekjklhgfmfocfgibmm), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/redirector-url/)

## What does Redirector do?

Redirector automatically redirects URLs from one site to another based on rules you set up. Once a rule is active, every time you visit a matching URL, you'll be instantly sent to the destination you configured — no extra clicks needed.

**Common use cases:**

- Always use Old Reddit instead of the redesign
- Switch Google search results to DuckDuckGo
- Skip tracking redirects (e.g. email click-tracking links) and go straight to the destination
- Redirect a deprecated internal tool URL to its replacement

## Quick Start — Your first rule in 30 seconds

Let's set up a rule that automatically redirects `reddit.com` to `old.reddit.com`:

1. Click the Redirector icon in your browser toolbar — the options page will open
2. Click **Add Rule**
3. Fill in the two fields:
   - **Match URL:** `^https://www.reddit.com/(.*)`
   - **Redirect To:** `https://old.reddit.com/$1`
4. (Optional) Paste a test URL like `https://www.reddit.com/r/cats` to verify the result — you should see it redirect to `https://old.reddit.com/r/cats`
5. Click **Add** — done!

Now visit any `reddit.com` page and you'll be automatically redirected to `old.reddit.com`.

### How the pattern works

- `^https://www.reddit.com/` matches the beginning of any Reddit URL
- `(.*)` captures everything after the domain (e.g. `r/cats`)
- `$1` in the Redirect To field inserts that captured part into the new URL

That's the basic idea: **match a URL, capture the parts you need, and build a new URL with them.**

## Managing Rules

- **Enable / Disable** — Toggle individual rules on or off without deleting them
- **Reorder** — Rules are checked from top to bottom; drag to change priority
- **Test** — Paste any URL in the Test URL field to see which rule matches and where it redirects
- **Import / Export** — Back up your rules as a JSON file, or share them with others

## More Examples

### Redirect Google search to DuckDuckGo

- Match URL: `^https://www.google.com/search\?q=(.*?)&.*$`
- Redirect To: `https://duckduckgo.com/?q=$1`

### Skip email click-tracking redirects

- Match URL: `https://click.redditmail.com/CL0/(.*)`
- Redirect To: `{{$1|decodeURIComponent}}`

The `{{$1|decodeURIComponent}}` syntax decodes the URL-encoded destination so you go straight to the real link.

### Decode base64-encoded redirect URLs

- Match URL: `https://mail.yandex.ru/re.jsx\?.*&l=(.*)`
- Redirect To: `{{$1|atob}}`

## Advanced: URL Pattern Mode

In addition to regular expressions, Redirector supports [URL Pattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/URLPattern) mode — a more readable syntax for matching URLs. Select "URL Pattern" in the Mode dropdown when creating a rule.

- Redirect Google search to DuckDuckGo:
  - From: `https://www.google.com/search?q=:id&(.*)`
  - To: `https://duckduckgo.com/?q={{search.groups.id|decodeURIComponent}}`

- Decode URL parameters (e.g. Zhihu outbound links):
  - From: `https://link.zhihu.com/?target=:url`
  - To: `{{search.groups.url|decodeURIComponent}}`

## Advanced: Pipeline Syntax

The `{{}}` syntax supports chaining transformations on captured values:

| Pipeline             | What it does                             |
| -------------------- | ---------------------------------------- |
| `decodeURIComponent` | Decode URL-encoded strings (`%2F` → `/`) |
| `atob`               | Decode base64-encoded strings            |

**Examples:**

- Single: `{{$1|decodeURIComponent}}`
- Chained: `{{$1|atob|decodeURIComponent}}`

**Note:** The plain `$1` syntax does not support pipelines. Use `{{$1}}` when you need transformations.

## Privacy

This extension processes all redirection rules locally and does not collect or transmit any user data.

## Contributions

Contributions are welcome! If you have any suggestions for improvements or have found a bug, please open an issue or submit a pull request.

## License

[MIT License](./LICENSE)

## Contact

If you have any questions or suggestions, please contact us at [rxliuli@gmail.com](mailto:rxliuli@gmail.com).
