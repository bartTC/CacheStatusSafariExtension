# Release Notes

What's new in each version of Cache Status.

---

## Version 0.0.9

- Badge now shows full "MISS" instead of "MIS"
- Added "Reload Required" indicator for pages opened from bookmarks or external apps
- Safari cannot capture headers for these navigations - simply reload to see cache status

---

## Version 0.0.8

- Fixed: `x-cache-status` header now displayed (used by nginx and other servers)
- Added: `x-cache-date` header support
- Renamed app from "CF Cache Status" to "Cache Status"

---

## Version 0.0.7

- Popup updates live as headers and performance metrics arrive
- "No Data" message now explains to navigate or reload

---

## Version 0.0.6

- Redesigned popup with hero section showing status at a glance
- Performance metrics displayed in a grid layout
- Improved dark mode colors

---

## Version 0.0.5

- Fixed CDN detection not working in some cases
- New app icon

---

## Version 0.0.4

- Added edge location display (e.g., "Frankfurt, DE" from FRA56)
- Improved Akamai detection via `server` header
- Fixed URL showing redirect URL instead of final page URL

---

## Version 0.0.3

- Fixed app icon not showing in Safari extension preferences

---

## Version 0.0.2

- Added performance metrics: TTFB, DNS, TCP, TLS, download time, transfer size
- Added CloudFront Origin Shield explanation on MISS
- Added Fastly tiered cache diagram showing X-Cache layer breakdown
- Headers now displayed in Title-Case

---

## Version 0.0.1

Initial release.

- Toolbar badge showing cache status (HIT/MISS/EXPIRED/BYPASS/DYNAMIC)
- Popup with cache headers and response metadata
- Edge location mapping (IATA codes → city names)
- Multi-CDN support: Cloudflare, CloudFront, Fastly, Akamai, Bunny CDN, Varnish
- Dark mode support
