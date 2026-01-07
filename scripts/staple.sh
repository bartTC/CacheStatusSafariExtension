#!/bin/bash
set -e

# Staple notarization ticket and create release zip
# Usage: ./scripts/staple.sh [version]

source "$(dirname "$0")/config.sh"

if [[ -n "$1" ]]; then
    ver="$1"
elif [[ -f "$BUILD_DIR/.current_version" ]]; then
    ver=$(cat "$BUILD_DIR/.current_version")
else
    echo "Error: No version specified. Use './scripts/staple.sh <version>'"
    exit 1
fi

ver_dir="$BUILD_DIR/$ver"
app_path="$ver_dir/export/$APP_NAME.app"
zip_path="$ver_dir/CacheStatus-$ver.zip"

if [[ ! -d "$app_path" ]]; then
    echo "Error: App not found at $app_path"
    exit 1
fi

echo "Stapling version: $ver"
xcrun stapler staple "$app_path"

echo "Creating release zip..."
rm -f "$zip_path"
ditto -c -k --keepParent "$app_path" "$zip_path"

echo "✓ Release ready: $zip_path"
