# CF Cache Status - Build & Release Commands
# Usage: just <command>

set dotenv-load

project := "CF Cache Status/CF Cache Status.xcodeproj"
scheme := "CF Cache Status"
build_dir := "build"

default:
    @just --list

# Show current version from git
version:
    @git describe --tags --always 2>/dev/null || echo "untagged"

# Run CDN detection tests
test:
    node tests/cdn-detection.test.js

# =============================================================================
# Development
# =============================================================================

# Build for development (unsigned)
build-dev:
    xcodebuild -project "{{project}}" -scheme "{{scheme}}" -configuration Debug build CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO

# Build release (unsigned, for testing)
build-release:
    xcodebuild -project "{{project}}" -scheme "{{scheme}}" -configuration Release build CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO

# Clean build artifacts
clean:
    rm -rf "{{build_dir}}"
    xcodebuild -project "{{project}}" -scheme "{{scheme}}" clean

# Open project in Xcode
xcode:
    open "{{project}}"

# =============================================================================
# Release (requires APPLE_ID, APPLE_TEAM_ID, APPLE_APP_PASSWORD in .env)
# =============================================================================

# Build and sign for distribution (optionally specify a tag)
archive tag="":
    ./scripts/archive.sh {{tag}}

# Submit for notarization
submit version="":
    ./scripts/submit.sh {{version}}

# Check notarization status
status id="":
    #!/usr/bin/env bash
    submission_id="{{id}}"
    [[ -z "$submission_id" && -f "{{build_dir}}/.current_version" ]] && \
        submission_id=$(cat "{{build_dir}}/$(cat {{build_dir}}/.current_version)/.submission_id" 2>/dev/null)
    [[ -z "$submission_id" ]] && { echo "No submission ID"; exit 1; }
    xcrun notarytool info "$submission_id" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD"

# Wait for notarization
wait id="":
    #!/usr/bin/env bash
    submission_id="{{id}}"
    [[ -z "$submission_id" && -f "{{build_dir}}/.current_version" ]] && \
        submission_id=$(cat "{{build_dir}}/$(cat {{build_dir}}/.current_version)/.submission_id" 2>/dev/null)
    xcrun notarytool wait "$submission_id" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD"

# Staple ticket and create final zip
staple version="":
    ./scripts/staple.sh {{version}}

# Release pipeline: archive and submit for notarization
release tag="":
    #!/usr/bin/env bash
    set -e
    just archive {{tag}}
    just submit
    echo ""
    echo "Submitted for notarization. Next steps:"
    echo "  just status              # Check notarization status"
    echo "  just staple              # Staple after approval"
    echo "  just dmg                 # Create DMG installer"

# Show notarization history
history:
    xcrun notarytool history --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD"

# Get notarization log
log id:
    xcrun notarytool log {{id}} --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD"

# List available builds
builds:
    @ls -d {{build_dir}}/v* {{build_dir}}/dev 2>/dev/null | xargs -I{} basename {} | sort -V || echo "(none)"

# Create DMG installer (requires create-dmg: brew install create-dmg)
dmg version="":
    ./scripts/create-dmg.sh {{version}}

# =============================================================================
# App Store (requires Apple Distribution certificate)
# =============================================================================

# Build and sign for App Store, then upload manually via Xcode Organizer
release-appstore tag="":
    ./scripts/archive-appstore.sh {{tag}}

# =============================================================================
# Maintenance
# =============================================================================

# Remove duplicate extensions from Safari (cleans Launch Services)
cleanup-extensions:
    ./scripts/cleanup-extensions.sh
