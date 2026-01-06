# Redirector

[Chrome](https://chromewebstore.google.com/detail/redirector/lioaeidejmlpffbndjhaameocfldlhin), [Safari](https://apps.apple.com/cn/app/url-redirector/id6743197230), [Edge](https://microsoftedge.microsoft.com/addons/detail/redirector/jhdjcofnjfeljeekjklhgfmfocfgibmm), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/redirector-url/)

## Introduction

Redirector is a powerful and flexible browser extension that allows users to customize URL redirection rules. Using regular expressions, users can create complex redirection rules applicable to various websites and URL patterns.

## Key Features

- Create custom redirection rules using regular expressions
- Support for multiple redirection rules
- Real-time URL match testing
- Intuitive user interface for easy addition, editing, and deletion of rules
- Support for wildcards and complex URL patterns

## Installation

Install from the Chrome Web Store.

## How to Use

1. Click on the Redirector icon in the browser toolbar to open the options page
2. In the "Add a redirect URL" section:
   - Enter the source URL pattern (using regular expression) in the left input box
   - Enter the target URL in the right input box (you can use $1, $2, etc., to reference capture groups in the regular expression)
   - Click the "Add" button to add a new rule
3. You can test your redirection rules in the "Test URL" section
4. Added rules will be displayed in the "Rules" list, where you can delete unnecessary rules at any time

## Example Rule

### Regular Expression Mode

Regular expression is a powerful tool for matching URL patterns. Here are some examples:

- Redirect Google search to DuckDuckGo:
  - From: `^https://www.google.com/search\?q=(.*?)&.*$`
  - To: `https://duckduckgo.com/?q=$1`

- Decode URL-encoded redirect links:
  - From: `https://click.redditmail.com/CL0/(.*)`
  - To: `{{$1|decodeURIComponent}}`

- Decode base64-encoded URLs:
  - From: `https://mail.yandex.ru/re.jsx\?.*&l=(.*)`
  - To: `{{$1|atob}}`

- Chain multiple transformations:
  - From: `https://example.com/redirect\?data=(.*)`
  - To: `{{$1|atob|decodeURIComponent}}`

### URL Pattern Mode

URLPattern is a more powerful and flexible tool for matching URL patterns. Here are some examples:

- Redirect Google search to DuckDuckGo:
  - From: `https://www.google.com/search?q=:id&(.*)`
  - To: `https://duckduckgo.com/?q={{search.groups.id|decodeURIComponent}}`

- Decode URL parameters:
  - From: `https://link.zhihu.com/?target=:url`
  - To: `{{search.groups.url|decodeURIComponent}}`

- Base64 decode and URL decode:
  - From: `https://redirect.example.com/go/:encoded`
  - To: `{{pathname.groups.encoded|atob|decodeURIComponent}}`

Reference: <https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/URLPattern>

### Pipeline Syntax

The `{{}}` syntax supports pipeline transformations for processing captured values:

**Available Pipelines:**

- `decodeURIComponent` - Decode URL-encoded strings
- `atob` - Decode base64-encoded strings

**Syntax:**

- Single pipeline: `{{$1|decodeURIComponent}}`
- Multiple pipelines: `{{$1|atob|decodeURIComponent}}`
- With spaces: `{{ $1 | atob | decodeURIComponent }}`

**Note:** The traditional `$1`, `$2` syntax (without `{{}}`) does not support pipelines. Use `{{$1}}` syntax for pipeline support.

## Privacy

This extension processes all redirection rules locally and does not collect or transmit any user data.

## Contributions

Contributions are welcome! If you have any suggestions for improvements or have found a bug, please open an issue or submit a pull request.

## License

[MIT License](./LICENSE)

## Contact

If you have any questions or suggestions, please contact us at [rxliuli@gmail.com](mailto:rxliuli@gmail.com).
