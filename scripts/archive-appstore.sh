#!/bin/bash
set -e

# Build and archive for Mac App Store distribution
# Usage: ./scripts/archive-appstore.sh [tag]

source "$(dirname "$0")/config.sh"

tag="${1:-}"
original_ref=""

# If tag provided, checkout that tag
if [[ -n "$tag" ]]; then
    ver="$tag"

    if ! git rev-parse "$tag" >/dev/null 2>&1; then
        echo "Error: Tag '$tag' not found"
        echo "Available tags:"
        git tag -l | sort -V | tail -10
        exit 1
    fi

    original_ref=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse HEAD)
    echo "Checking out tag: $tag"
    git checkout "$tag" --quiet
else
    ver=$(git describe --tags --always 2>/dev/null || echo "dev")
fi

cleanup() {
    if [[ -n "$original_ref" ]]; then
        echo "Returning to: $original_ref"
        git checkout "$original_ref" --quiet
    fi
}
trap cleanup EXIT

echo "Building for App Store: $ver"

ver_dir="$BUILD_DIR/$ver-appstore"
archive_path="$ver_dir/CacheStatus.xcarchive"
export_path="$ver_dir/export"

mkdir -p "$ver_dir"

# Archive with App Store signing
xcodebuild archive \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -archivePath "$archive_path" \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
    CODE_SIGN_STYLE=Manual \
    CODE_SIGN_IDENTITY="Apple Distribution"

# Export options for App Store
cat > "$ver_dir/ExportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>$APPLE_TEAM_ID</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>manual</string>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
    -archivePath "$archive_path" \
    -exportPath "$export_path" \
    -exportOptionsPlist "$ver_dir/ExportOptions.plist"

echo "$ver-appstore" > "$BUILD_DIR/.current_version_appstore"

echo "✓ App Store archive complete: $export_path/"
echo ""
echo "Next: Run 'just upload-appstore' to upload to App Store Connect"
