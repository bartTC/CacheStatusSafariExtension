# Changelog

All notable changes to this project will be documented in this file.

## [v0.0.3] - 2026-01-04

### Fixed
- Safari extension preferences now displays the colorful app icon instead of the toolbar icon

### Changed
- Updated Xcode project configuration (macOS 11.0 deployment target, dead code stripping)

## [v0.0.2] - 2026-01-03

### Added
- Performance metrics via Navigation Timing API (TTFB, DNS, TCP, TLS, download time, transfer size)
- CloudFront Origin Shield info note explaining edge MISS behavior
- Fastly multi-layer cache explanation with visual diagram
- CI workflow for build validation on push/PR

### Changed
- Headers now displayed in Title-Case (e.g., Cache-Control instead of cache-control)
- New app icon
- Simplified and cleaned up popup.js code
- Replaced WebView-based container app with native SwiftUI (~290 lines → 91 lines)

### Fixed
- Toolbar icon appearing blue instead of gray (Safari grayscale tinting workaround)

## [v0.0.1] - 2026-01-02

### Added
- Toolbar badge with color-coded cache status (HIT, MISS, EXPIRED, etc.)
- Popup showing detailed cache headers and response metadata
- Edge location mapping (IATA airport codes to city names)
- Multi-CDN support:
  - Cloudflare
  - CloudFront
  - Fastly
  - Akamai
  - Bunny CDN
  - Varnish
  - Generic CDN (x-cache header)
- Dark mode support
- iOS Settings-inspired UI design
- GitHub Actions workflow for automated builds and notarization
