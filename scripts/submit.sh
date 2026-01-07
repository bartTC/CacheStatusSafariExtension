#!/bin/bash
set -e

# Submit app for notarization
# Usage: ./scripts/submit.sh [version]

source "$(dirname "$0")/config.sh"

if [[ -n "$1" ]]; then
    ver="$1"
elif [[ -f "$BUILD_DIR/.current_version" ]]; then
    ver=$(cat "$BUILD_DIR/.current_version")
else
    ver=$(git describe --tags --always 2>/dev/null || echo "dev")
fi

ver_dir="$BUILD_DIR/$ver"
app_path="$ver_dir/export/$APP_NAME.app"
zip_path="$ver_dir/CacheStatus-$ver.zip"

if [[ ! -d "$app_path" ]]; then
    echo "Error: App not found at $app_path"
    echo "Run './scripts/archive.sh $ver' first."
    exit 1
fi

echo "Submitting version: $ver"
echo "Creating zip..."
ditto -c -k --keepParent "$app_path" "$zip_path"

echo "Submitting for notarization..."
output=$(xcrun notarytool submit "$zip_path" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_PASSWORD" \
    --output-format json)

submission_id=$(echo "$output" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "$submission_id" > "$ver_dir/.submission_id"

echo "✓ Submitted: $submission_id"
echo "  Version: $ver"
echo "  Zip: $zip_path"
