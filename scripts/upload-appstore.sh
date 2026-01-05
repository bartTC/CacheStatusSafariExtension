#!/bin/bash
set -e

# Upload app to App Store Connect
# Usage: ./scripts/upload-appstore.sh [version]
#
# Requires App Store Connect API key:
#   APPSTORE_API_KEY_ID - Key ID from App Store Connect
#   APPSTORE_API_ISSUER_ID - Issuer ID from App Store Connect
#   APPSTORE_API_KEY_PATH - Path to .p8 private key file

BUILD_DIR="${BUILD_DIR:-build}"

if [[ -n "$1" ]]; then
    ver="$1-appstore"
elif [[ -f "$BUILD_DIR/.current_version_appstore" ]]; then
    ver=$(cat "$BUILD_DIR/.current_version_appstore")
else
    echo "Error: No version specified. Use './scripts/upload-appstore.sh <version>'"
    exit 1
fi

ver_dir="$BUILD_DIR/$ver"
export_path="$ver_dir/export"

# Find the .pkg file (xcodebuild creates this for app-store exports)
pkg_file=$(find "$export_path" -name "*.pkg" -type f 2>/dev/null | head -1)

if [[ -z "$pkg_file" ]]; then
    echo "Error: No .pkg file found in $export_path"
    echo "Make sure you ran 'just archive-appstore' first."
    exit 1
fi

echo "Validating package..."

# Validate first to catch issues before upload
validate_app() {
    if [[ -n "$APPSTORE_API_KEY_ID" && -n "$APPSTORE_API_ISSUER_ID" ]]; then
        xcrun altool --validate-app \
            -f "$pkg_file" \
            --type macos \
            --apiKey "$APPSTORE_API_KEY_ID" \
            --apiIssuer "$APPSTORE_API_ISSUER_ID"
    else
        xcrun altool --validate-app \
            -f "$pkg_file" \
            --type macos \
            --apple-id "$APPLE_ID" \
            --password "$APPLE_APP_PASSWORD"
    fi
}

if ! validate_app; then
    echo ""
    echo "✗ Validation failed. Fix the issues above before uploading."
    exit 1
fi

echo "✓ Validation passed"
echo ""
echo "Uploading to App Store Connect: $pkg_file"

# Check for API key credentials
if [[ -n "$APPSTORE_API_KEY_ID" && -n "$APPSTORE_API_ISSUER_ID" && -n "$APPSTORE_API_KEY_PATH" ]]; then
    # Use API key authentication (preferred)
    xcrun altool --upload-app \
        -f "$pkg_file" \
        --type macos \
        --apiKey "$APPSTORE_API_KEY_ID" \
        --apiIssuer "$APPSTORE_API_ISSUER_ID"
else
    # Fall back to Apple ID authentication
    if [[ -z "$APPLE_ID" || -z "$APPLE_APP_PASSWORD" ]]; then
        echo "Error: Missing credentials."
        echo ""
        echo "Option 1: Set API key credentials (recommended):"
        echo "  APPSTORE_API_KEY_ID"
        echo "  APPSTORE_API_ISSUER_ID"
        echo "  APPSTORE_API_KEY_PATH"
        echo ""
        echo "Option 2: Set Apple ID credentials:"
        echo "  APPLE_ID"
        echo "  APPLE_APP_PASSWORD"
        exit 1
    fi

    xcrun altool --upload-app \
        -f "$pkg_file" \
        --type macos \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_APP_PASSWORD"
fi

echo ""
echo "✓ Upload complete!"
echo "Check App Store Connect for processing status."
