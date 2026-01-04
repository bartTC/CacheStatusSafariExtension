# CF Cache Status - Build & Release Commands
# Usage: just <command>

# Load environment from .env if it exists
set dotenv-load

# Configuration
app_name := "CF Cache Status"
project := "CF Cache Status/CF Cache Status.xcodeproj"
scheme := "CF Cache Status"
build_dir := "build"
archive_path := build_dir / "CacheStatus.xcarchive"
export_path := build_dir / "export"
app_path := export_path / "CF Cache Status.app"
zip_path := build_dir / "CacheStatus.zip"

# Default recipe
default:
    @just --list

# Run CDN detection tests
test:
    node tests/cdn-detection.test.js

# =============================================================================
# Development
# =============================================================================

# Build for development (unsigned)
build-dev:
    xcodebuild -project "{{project}}" \
        -scheme "{{scheme}}" \
        -configuration Debug \
        build \
        CODE_SIGN_IDENTITY="-" \
        CODE_SIGNING_REQUIRED=NO

# Build release (unsigned, for testing)
build-release:
    xcodebuild -project "{{project}}" \
        -scheme "{{scheme}}" \
        -configuration Release \
        build \
        CODE_SIGN_IDENTITY="-" \
        CODE_SIGNING_REQUIRED=NO

# Clean Xcode build artifacts
clean:
    rm -rf "{{build_dir}}"
    xcodebuild -project "{{project}}" -scheme "{{scheme}}" clean

# Open project in Xcode
xcode:
    open "{{project}}"

# =============================================================================
# Release (requires APPLE_ID, APPLE_TEAM_ID, APPLE_APP_PASSWORD)
# =============================================================================

# Build, sign, and archive for distribution
archive:
    #!/usr/bin/env bash
    set -e
    mkdir -p "{{build_dir}}"

    xcodebuild archive \
        -project "{{project}}" \
        -scheme "{{scheme}}" \
        -archivePath "{{archive_path}}" \
        DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
        CODE_SIGN_STYLE=Manual \
        CODE_SIGN_IDENTITY="Developer ID Application"

    cat > "{{build_dir}}/ExportOptions.plist" << EOF
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>method</key>
        <string>developer-id</string>
        <key>teamID</key>
        <string>$APPLE_TEAM_ID</string>
    </dict>
    </plist>
    EOF

    xcodebuild -exportArchive \
        -archivePath "{{archive_path}}" \
        -exportPath "{{export_path}}" \
        -exportOptionsPlist "{{build_dir}}/ExportOptions.plist"

    echo "✓ Archive complete: {{app_path}}"

# Submit app for notarization
submit: _check-env
    #!/usr/bin/env bash
    set -e

    if [[ ! -d "{{app_path}}" ]]; then
        echo "Error: App not found. Run 'just archive' first."
        exit 1
    fi

    echo "Creating zip..."
    ditto -c -k --keepParent "{{app_path}}" "{{zip_path}}"

    echo "Submitting for notarization..."
    output=$(xcrun notarytool submit "{{zip_path}}" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --output-format json)

    submission_id=$(echo "$output" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "$submission_id" > "{{build_dir}}/.submission_id"

    echo "✓ Submitted: $submission_id"
    echo ""
    echo "Check status: just status"

# Check notarization status
status id="": _check-env
    #!/usr/bin/env bash
    submission_id="{{id}}"
    [[ -z "$submission_id" ]] && submission_id=$(cat "{{build_dir}}/.submission_id" 2>/dev/null)

    if [[ -z "$submission_id" ]]; then
        echo "Error: No submission ID. Provide one or run 'just submit' first."
        exit 1
    fi

    xcrun notarytool info "$submission_id" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD"

# Wait for notarization to complete
wait id="": _check-env
    #!/usr/bin/env bash
    submission_id="{{id}}"
    [[ -z "$submission_id" ]] && submission_id=$(cat "{{build_dir}}/.submission_id" 2>/dev/null)

    xcrun notarytool wait "$submission_id" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD"

# Staple notarization ticket and create release zip
staple:
    #!/usr/bin/env bash
    set -e

    if [[ ! -d "{{app_path}}" ]]; then
        echo "Error: App not found at {{app_path}}"
        exit 1
    fi

    echo "Stapling ticket..."
    xcrun stapler staple "{{app_path}}"

    echo "Creating release zip..."
    rm -f "{{zip_path}}"
    ditto -c -k --keepParent "{{app_path}}" "{{zip_path}}"

    echo "✓ Release ready: {{zip_path}}"

# Full release: archive, submit, wait, staple
release: _check-env archive
    #!/usr/bin/env bash
    set -e

    echo "Creating zip..."
    ditto -c -k --keepParent "{{app_path}}" "{{zip_path}}"

    echo "Submitting for notarization..."
    xcrun notarytool submit "{{zip_path}}" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --wait

    just staple
    echo "✓ Release complete!"

# Show notarization history
history: _check-env
    xcrun notarytool history \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD"

# Get notarization log for a submission
log id: _check-env
    xcrun notarytool log "{{id}}" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD"

# =============================================================================
# Helpers
# =============================================================================

# Verify required environment variables
[private]
_check-env:
    #!/usr/bin/env bash
    missing=0
    for var in APPLE_ID APPLE_TEAM_ID APPLE_APP_PASSWORD; do
        if [[ -z "${!var}" ]]; then
            echo "Missing: $var"
            missing=1
        fi
    done
    if [[ $missing -eq 1 ]]; then
        echo ""
        echo "Set these in .env or export them:"
        echo "  APPLE_ID=your@email.com"
        echo "  APPLE_TEAM_ID=XXXXXXXXXX"
        echo "  APPLE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx"
        exit 1
    fi
