# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- "Reload Required" state now uses a dedicated icon (cloud with question mark) instead of "RLD" text badge
- App icon now uses Xcode Icon Composer format (.icon) with layered composition
- Renamed internal ToolbarIcon asset to HeroIcon for clarity
- Moved toolbar icon SVG source to `assets/toolbarIcon.svg`

### Fixed
- Fastly tiered cache diagram arrow alignment in popup

### Removed
- Unused LargeIcon asset from Xcode project

## [v0.0.9] - 2026-01-07

### Added
- Detection of Safari limitation for bookmarks and external links
- "Reload Required" message when headers unavailable (with explanation)
- "RLD" badge indicator when reload is needed
- KNOWN_ISSUES.md documenting Safari webRequest API limitations

### Changed
- Badge now shows full "MISS" instead of truncated "MIS"
- Release scripts now use shared `config.sh` for app name and paths
- `just release` no longer waits for notarization (async workflow)
- Version and build number now auto-derived from git tag and commit count

## [v0.0.8] - 2026-01-07

### Added
- Privacy Policy document (PRIVACY.md)
- DMG installer with drag-to-Applications window (`just dmg`)
- Support for `x-cache-date` header

### Changed
- App renamed from "CF Cache Status" to "Cache Status"

### Fixed
- `x-cache-status` header now displayed in popup (was captured but not shown)

## [v0.0.7] - 2026-01-05

### Added
- Mac App Store release pipeline (`just archive-appstore`, `just upload-appstore`)
- Release documentation moved to dedicated RELEASE.md

### Changed
- Popup now uses reactive updates via port connection (no more polling)
- "No Data" message now says "Navigate or reload to capture headers" instead of "No CDN headers found"

## [v0.0.6] - 2026-01-05

### Changed
- Complete popup UI redesign with hero section and metrics grid
- Container app now uses toolbar cloud SVG instead of SF Symbol
- Improved dark mode support

## [v0.0.5] - 2026-01-04

### Fixed
- CDN detection not working (removed `type: module` from manifest - ES modules have isolated scope)

### Changed
- New app icon design (cloud with gradient border and HIT badge)
- CI workflow split into parallel jobs (build, test, validate)

## [v0.0.4] - 2026-01-04

### Added
- Justfile for build and release commands (`just build-dev`, `just release`, etc.)
- CDN detection test suite (27 test cases)
- Akamai detection via `server` header (supports AkamaiGHost, AkamaiNetStorage)
- Versioned build directories (`build/<version>/`) to avoid confusion

### Changed
- Refactored CDN detection into shared `constants.js` with declarative rules
- CDN info notes now only appear when relevant (Fastly note requires x-cache header, CloudFront note only on MISS)
- Release scripts moved to `scripts/` directory for better maintainability

### Fixed
- URL display after redirects (now shows final URL instead of intermediate redirect URLs)

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
