# Privacy Policy

Cache Status does not collect, store, or transmit any personal data.

## What the extension does

- Reads HTTP response headers from pages you visit to detect cache status
- Reads performance timing data from the browser's Navigation Timing API
- Displays this information locally in the toolbar badge and popup

## What the extension does NOT do

- No data is sent to any server
- No analytics or tracking
- No cookies or local storage persistence
- No third-party services

All processing happens locally in your browser. When you close a tab, that tab's data is discarded.

## Permissions explained

Safari requires extensions to explicitly declare which capabilities they need to access. Because this extension monitors network traffic to detect cache headers, it must request the following permissions in its manifest file.

## Permissions explained

| Permission      | Why it's needed            |
| --------------- | -------------------------- |
| `webRequest`    | Read HTTP response headers |
| `webNavigation` | Detect page loads          |
| `activeTab`     | Access current tab info    |
| `<all_urls>`    | Work on any website        |
