#!/bin/bash
set -e

# Build, sign, and archive for distribution
# Usage: ./scripts/archive.sh [tag]
# If a tag is provided, checks out that tag first, builds, then returns

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

echo "Building version: $ver"

# Derive marketing version and build number from git
marketing_version="${ver#v}"  # v0.0.8 → 0.0.8
build_number=$(git rev-list --count HEAD)

echo "Setting MARKETING_VERSION=$marketing_version, BUILD=$build_number"

# Update Xcode project with version info
project_file="$PROJECT/project.pbxproj"
sed -i '' "s/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = $marketing_version;/g" "$project_file"
sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = $build_number;/g" "$project_file"

ver_dir="$BUILD_DIR/$ver"
archive_path="$ver_dir/CacheStatus.xcarchive"
export_path="$ver_dir/export"

mkdir -p "$ver_dir"

xcodebuild archive \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -archivePath "$archive_path" \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
    CODE_SIGN_STYLE=Manual \
    CODE_SIGN_IDENTITY="Developer ID Application"

cat > "$ver_dir/ExportOptions.plist" << EOF
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
    -archivePath "$archive_path" \
    -exportPath "$export_path" \
    -exportOptionsPlist "$ver_dir/ExportOptions.plist"

echo "$ver" > "$BUILD_DIR/.current_version"

echo "✓ Archive complete: $export_path/$APP_NAME.app"
