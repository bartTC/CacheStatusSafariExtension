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

# Derive marketing version and build number from git
marketing_version="${ver#v}"  # v0.0.8 → 0.0.8
build_number=$(git rev-list --count HEAD)

echo "Setting MARKETING_VERSION=$marketing_version, BUILD=$build_number"

# Update Xcode project with version info
project_file="$PROJECT/project.pbxproj"
sed -i '' "s/MARKETING_VERSION = [^;]*;/MARKETING_VERSION = $marketing_version;/g" "$project_file"
sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*;/CURRENT_PROJECT_VERSION = $build_number;/g" "$project_file"

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
    CODE_SIGN_STYLE=Automatic

echo "$ver-appstore" > "$BUILD_DIR/.current_version_appstore"

echo ""
echo "✓ App Store archive complete: $archive_path"
echo ""
echo "Next steps (manual):"
echo "  1. Open archive:  open $archive_path"
echo "  2. In Xcode Organizer: Click 'Distribute App' → 'App Store Connect'"
echo "  3. Follow the prompts to upload"
echo "  4. Submit for review in App Store Connect"
