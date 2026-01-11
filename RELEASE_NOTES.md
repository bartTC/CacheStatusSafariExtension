# Release Notes

## Version 1.0.2

- Added debug logging to service worker for easier troubleshooting
- Content script no longer logs to browser console

## Version 1.0.1

- Fixed: Dark mode toolbar icon now displays correctly when Safari launches in dark mode

## Version 1.0

Initial release.

- Toolbar badge showing cache status (HIT, MISS, EXPIRED, BYPASS, DYNAMIC)
- Detailed popup with cache headers and response metadata
- Performance metrics: TTFB, DNS, TCP, TLS, download time, transfer size
- Edge location display (CDN POP identification)
- Dark mode support
- Multi-CDN support: Cloudflare, CloudFront, Fastly, Akamai, Bunny CDN, Varnish
