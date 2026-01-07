# Project Guide

Safari extension that displays CDN cache status (HIT/MISS) for the current page.

## Key Files

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Technical changelog for developers |
| `RELEASE_NOTES.md` | User-facing release notes (App Store "What's New") |
| `RELEASE.md` | Full release documentation and workflow |
| `PRIVACY.md` | Privacy policy |
| `scripts/config.sh` | Shared config (APP_NAME, PROJECT, SCHEME) |

## Testing

```bash
just test    # Run CDN detection tests (27 test cases)
```

Tests are in `tests/cdn-detection.test.js` and validate all CDN detection rules in `constants.js`.

## Release Process

### Pre-release Checklist

Before starting a release, confirm with the user:

1. **Version number** — What tag? (e.g., v0.0.9)
2. **Uncommitted changes** — Should they be committed first?
3. **CHANGELOG.md** — Is it updated with technical changes?
4. **RELEASE_NOTES.md** — Is it updated with user-facing changes?
5. **Target** — GitHub only, App Store only, or both?
6. **Tests pass** — Run `just test` before proceeding

### Direct Distribution (GitHub)

```bash
# 1. Update docs
#    - CHANGELOG.md (technical changes)
#    - RELEASE_NOTES.md (user-facing changes)

# 2. Tag and release
git tag v0.0.X
git push origin v0.0.X
just release v0.0.X        # Archive and submit for notarization
just status                # Check notarization status
just staple                # After approval: staple ticket
just dmg                   # Create DMG installer
gh release create v0.0.X   # Create GitHub release with assets
```

### App Store

```bash
just release-appstore v0.0.X   # Archive and upload to App Store Connect
```

Then submit for review in App Store Connect.

## Versioning

- **Git tag is the single source of truth**
- `MARKETING_VERSION` auto-derived from tag (v0.0.8 → 0.0.8)
- `CURRENT_PROJECT_VERSION` (build number) = git commit count
- No manual Xcode version updates needed

## Project Structure

```
CF Cache Status/
├── CF Cache Status/              # macOS container app (SwiftUI)
└── CF Cache Status Extension/    # Safari Web Extension
    └── Resources/
        ├── manifest.json         # Extension config
        ├── constants.js          # CDN detection rules
        ├── background.js         # Header capture
        └── popup.js/html/css     # Popup UI

scripts/
├── config.sh                     # Shared variables
├── archive.sh                    # Build for direct distribution
├── archive-appstore.sh           # Build for App Store
├── submit.sh                     # Submit for notarization
├── staple.sh                     # Staple and create zip
└── create-dmg.sh                 # Create DMG installer

Justfile                          # Build commands
```

## Supported CDNs

Cloudflare, CloudFront, Fastly, Akamai, Bunny CDN, Varnish, and any CDN using x-cache headers.

Detection rules are in `constants.js`.
