# Release Guide

This document covers building and releasing CF Cache Status for distribution.

## Prerequisites

1. **Apple Developer Account** ($99/year) with:
   - Developer ID Application certificate (for direct distribution)
   - Apple Distribution certificate (for App Store)

2. **Environment variables** in `.env`:

   ```bash
   cp .env.example .env
   ```

   | Variable             | Description                                                                 |
   | -------------------- | --------------------------------------------------------------------------- |
   | `APPLE_ID`           | Your Apple ID email                                                         |
   | `APPLE_TEAM_ID`      | 10-character Team ID from [developer.apple.com](https://developer.apple.com/account) |
   | `APPLE_APP_PASSWORD` | App-specific password from [appleid.apple.com](https://appleid.apple.com)   |

3. **Xcode** configured with your signing certificates

## Distribution Options

There are two separate release pipelines:

| Channel        | Certificate              | Output            | Use Case                    |
| -------------- | ------------------------ | ----------------- | --------------------------- |
| **Direct**     | Developer ID Application | Notarized `.zip`  | GitHub releases, website    |
| **App Store**  | Apple Distribution       | `.pkg` upload     | Mac App Store               |

Both can be built for the same version — they're stored in separate directories.

---

## Direct Distribution (GitHub)

For distributing outside the App Store. Requires notarization for Gatekeeper.

### Full Pipeline

```bash
just release v0.0.6
```

This runs: archive → submit → wait → staple

### Step-by-Step

```bash
# 1. Build and sign with Developer ID
just archive v0.0.6

# 2. Submit for notarization
just submit

# 3. Check status (optional, non-blocking)
just status

# 4. Wait for Apple to process (can take minutes to hours)
just wait

# 5. Staple notarization ticket and create final zip
just staple

# 6. Create DMG installer (optional, requires: brew install create-dmg)
just dmg v0.0.6
```

### Output

```
build/
└── v0.0.6/
    ├── CacheStatus.xcarchive       # Xcode archive
    ├── CF Cache Status.app         # Signed app
    ├── CF.Cache.Status.v0.0.6.zip  # Final notarized release (for GitHub)
    ├── CacheStatus-v0.0.6.dmg      # DMG installer (optional)
    └── .submission_id              # Notarization tracking
```

### Utility Commands

```bash
just history        # Show notarization history
just log <id>       # Get notarization log for a submission
just builds         # List available builds
```

---

## App Store Distribution

For publishing on the Mac App Store.

### Build Archive

```bash
just release-appstore v0.0.6
```

This creates an Xcode archive ready for manual upload.

### Upload via Xcode Organizer

1. Open the archive: `open build/v0.0.6-appstore/CacheStatus.xcarchive`
2. In Xcode Organizer: Click **Distribute App** → **App Store Connect**
3. Follow the prompts to upload
4. Submit for review in App Store Connect

### Output

```
build/
└── v0.0.6-appstore/
    └── CacheStatus.xcarchive       # Xcode archive
```

### App Store Connect Setup

In [App Store Connect](https://appstoreconnect.apple.com), configure:

| Field | Value |
|-------|-------|
| Privacy Policy URL | https://elephant.house/apps/safari-cache-status/privacy/ |
| Support URL | https://elephant.house/apps/safari-cache-status/ |
| Marketing URL | https://elephant.house/apps/safari-cache-status/ |
| Category | Developer Tools |
| Price | Free |

Content for description, keywords, and review notes is in `assets/app_store.md`.

### Screenshots

**Required sizes** (at least one):

| Size | Resolution | Display |
|------|------------|---------|
| Small | 1280 × 800 | MacBook Air 13" |
| Medium | 1440 × 900 | MacBook Pro 13" |
| Large | 2560 × 1600 | MacBook Pro 14" Retina |
| XL | 2880 × 1800 | MacBook Pro 16" Retina |

**Format:** PNG or JPEG, RGB, no alpha, no rounded corners

**What to capture:**

1. Safari with popup open showing HIT status
2. Popup showing MISS with performance metrics
3. Dark mode variant

**How to capture:**

```bash
# Screenshot a window
screencapture -w screenshot.png

# Resize to App Store dimensions
sips -z 1600 2560 screenshot.png --out screenshot-2560x1600.png
```

### Age Rating

| Question | Answer |
|----------|--------|
| Unrestricted Web Access | Yes |
| Everything else | None |

**Result:** Rated 4+

### Export Compliance

Uses encryption? **No** (HTTPS is exempt)

---

## Building Both

You can build both versions for the same release:

```bash
# Direct distribution (for GitHub)
just release v0.0.6
just dmg v0.0.6

# App Store (for Mac App Store)
just release-appstore v0.0.6
```

They don't conflict — outputs go to separate directories:
- `build/v0.0.6/` — Developer ID build (`.zip` and `.dmg`)
- `build/v0.0.6-appstore/` — App Store build (`.pkg`)

---

## Troubleshooting

### Notarization Stuck "In Progress"

Apple's notarization service can sometimes take hours. Check status with:

```bash
just status
just history
```

### Notarization Failed

Get the detailed log:

```bash
just log <submission-id>
```

Common issues:
- Missing entitlements
- Hardened runtime not enabled
- Unsigned frameworks/binaries

### App Store Upload Failed

Common issues when uploading via Xcode Organizer:
- Missing provisioning profile
- Bundle ID mismatch
- Version/build number conflicts
- manifest.json description > 112 characters (Safari extensions)

### Certificate Issues

Verify your certificates in Keychain Access:
- **Developer ID Application** — for direct distribution
- **Apple Distribution** — for App Store

Both require the private key to be present.

---

## Version Checklist

Before releasing a new version:

1. [ ] Update `CHANGELOG.md`
2. [ ] Create git tag: `git tag v0.0.X`
3. [ ] Push tag: `git push origin v0.0.X`
4. [ ] Build releases:
   - [ ] `just release v0.0.X` (direct distribution)
   - [ ] `just dmg v0.0.X` (optional DMG installer)
   - [ ] `just release-appstore v0.0.X` (App Store archive)
5. [ ] Create GitHub release with `.zip` and `.dmg`
6. [ ] Upload App Store build via Xcode Organizer
7. [ ] Submit for review in App Store Connect

> **Note:** Version and build number are automatically set from the git tag.
> `v0.0.8` → MARKETING_VERSION=0.0.8, BUILD=(commit count)
