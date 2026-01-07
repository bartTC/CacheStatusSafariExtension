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

### Full Pipeline

```bash
just release-appstore v0.0.6
```

This runs: archive-appstore → upload-appstore (with validation)

### Step-by-Step

```bash
# 1. Build and sign with Apple Distribution
just archive-appstore v0.0.6

# 2. Validate package (optional, upload does this automatically)
just validate-appstore

# 3. Upload to App Store Connect
just upload-appstore
```

### Output

```
build/
└── v0.0.6-appstore/
    ├── CacheStatus.xcarchive       # Xcode archive
    ├── ExportOptions.plist         # Export configuration
    └── export/
        └── CF Cache Status.pkg     # App Store package
```

### App Store Connect API (Optional)

For automated uploads, you can use API keys instead of Apple ID:

| Variable                  | Description                          |
| ------------------------- | ------------------------------------ |
| `APPSTORE_API_KEY_ID`     | Key ID from App Store Connect        |
| `APPSTORE_API_ISSUER_ID`  | Issuer ID from App Store Connect     |
| `APPSTORE_API_KEY_PATH`   | Path to `.p8` private key file       |

Generate keys at: App Store Connect → Users and Access → Keys

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

### App Store Validation Failed

The upload script validates before uploading. Common issues:
- Missing provisioning profile
- Bundle ID mismatch
- Version/build number conflicts

### Certificate Issues

Verify your certificates in Keychain Access:
- **Developer ID Application** — for direct distribution
- **Apple Distribution** — for App Store

Both require the private key to be present.

---

## Version Checklist

Before releasing a new version:

1. [ ] Update version in Xcode (both targets)
2. [ ] Update `CHANGELOG.md`
3. [ ] Create git tag: `git tag v0.0.X`
4. [ ] Push tag: `git push origin v0.0.X`
5. [ ] Build releases:
   - [ ] `just release v0.0.X` (direct)
   - [ ] `just dmg v0.0.X` (optional DMG installer)
   - [ ] `just release-appstore v0.0.X` (App Store)
6. [ ] Create GitHub release with `.zip` (and optionally `.dmg`)
7. [ ] Submit App Store version in App Store Connect
