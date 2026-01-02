#!/bin/bash
set -e

# Configuration
APP_NAME="CF Cache Status"
PROJECT_PATH="CF Cache Status/CF Cache Status.xcodeproj"
SCHEME="CF Cache Status"
BUILD_DIR="${BUILD_DIR:-build}"
ARCHIVE_PATH="$BUILD_DIR/CacheStatus.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
APP_PATH="$EXPORT_PATH/$APP_NAME.app"
ZIP_PATH="$BUILD_DIR/CacheStatus.zip"
SUBMISSION_ID_FILE="$BUILD_DIR/.submission_id"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}==>${NC} $1"; }
error() { echo -e "${RED}==>${NC} $1" >&2; }

check_env() {
    local missing=0
    for var in APPLE_ID APPLE_TEAM_ID APPLE_APP_PASSWORD; do
        if [[ -z "${!var}" ]]; then
            error "Missing environment variable: $var"
            missing=1
        fi
    done
    if [[ $missing -eq 1 ]]; then
        echo ""
        echo "Required environment variables:"
        echo "  APPLE_ID          - Your Apple ID email"
        echo "  APPLE_TEAM_ID     - Your Team ID (e.g., H95JUDBHF7)"
        echo "  APPLE_APP_PASSWORD - App-specific password from appleid.apple.com"
        exit 1
    fi
}

cmd_build() {
    if [[ -z "$APPLE_TEAM_ID" ]]; then
        error "Missing APPLE_TEAM_ID environment variable"
        exit 1
    fi

    info "Building and archiving..."

    mkdir -p "$BUILD_DIR"

    # Archive
    xcodebuild archive \
        -project "$PROJECT_PATH" \
        -scheme "$SCHEME" \
        -archivePath "$ARCHIVE_PATH" \
        DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
        CODE_SIGN_STYLE=Manual \
        CODE_SIGN_IDENTITY="Developer ID Application" \
        | xcbeautify || xcodebuild archive \
            -project "$PROJECT_PATH" \
            -scheme "$SCHEME" \
            -archivePath "$ARCHIVE_PATH" \
            DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
            CODE_SIGN_STYLE=Manual \
            CODE_SIGN_IDENTITY="Developer ID Application"

    # Create export options
    cat > "$BUILD_DIR/ExportOptions.plist" << EOF
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

    # Export
    info "Exporting app..."
    xcodebuild -exportArchive \
        -archivePath "$ARCHIVE_PATH" \
        -exportPath "$EXPORT_PATH" \
        -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist"

    info "Build complete: $APP_PATH"
}

cmd_submit() {
    check_env

    if [[ ! -d "$APP_PATH" ]]; then
        error "App not found at $APP_PATH. Run 'build' first."
        exit 1
    fi

    info "Creating zip for notarization..."
    ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

    info "Submitting for notarization..."

    # Submit and capture output
    local output
    output=$(xcrun notarytool submit "$ZIP_PATH" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --output-format json)

    local submission_id
    submission_id=$(echo "$output" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [[ -z "$submission_id" ]]; then
        error "Failed to get submission ID"
        echo "$output"
        exit 1
    fi

    echo "$submission_id" > "$SUBMISSION_ID_FILE"

    info "Submitted! Submission ID: $submission_id"
    echo ""
    echo "Check status with:"
    echo "  ./scripts/release.sh status $submission_id"
}

cmd_status() {
    check_env

    local submission_id="${1:-$(cat "$SUBMISSION_ID_FILE" 2>/dev/null)}"

    if [[ -z "$submission_id" ]]; then
        error "No submission ID provided. Usage: $0 status <submission-id>"
        exit 1
    fi

    info "Checking status for: $submission_id"

    xcrun notarytool info "$submission_id" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD"
}

cmd_wait() {
    check_env

    local submission_id="${1:-$(cat "$SUBMISSION_ID_FILE" 2>/dev/null)}"

    if [[ -z "$submission_id" ]]; then
        error "No submission ID provided."
        exit 1
    fi

    info "Waiting for notarization to complete..."

    xcrun notarytool wait "$submission_id" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD"
}

cmd_staple() {
    if [[ ! -d "$APP_PATH" ]]; then
        error "App not found at $APP_PATH"
        exit 1
    fi

    info "Stapling notarization ticket..."
    xcrun stapler staple "$APP_PATH"

    info "Creating final release zip..."
    rm -f "$ZIP_PATH"
    ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

    info "Release ready: $ZIP_PATH"
}

cmd_all() {
    check_env

    cmd_build

    info "Creating zip for notarization..."
    ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

    info "Submitting for notarization (with --wait)..."
    xcrun notarytool submit "$ZIP_PATH" \
        --apple-id "$APPLE_ID" \
        --team-id "$APPLE_TEAM_ID" \
        --password "$APPLE_APP_PASSWORD" \
        --wait

    cmd_staple

    info "Done! Release artifact: $ZIP_PATH"
}

cmd_clean() {
    info "Cleaning build directory..."
    rm -rf "$BUILD_DIR"
    info "Done"
}

cmd_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build     Build and archive the app"
    echo "  submit    Submit for notarization (returns submission ID)"
    echo "  status    Check notarization status"
    echo "  wait      Wait for notarization to complete"
    echo "  staple    Staple ticket and create final zip"
    echo "  all       Run everything (build, submit, wait, staple)"
    echo "  clean     Remove build directory"
    echo "  help      Show this help"
    echo ""
    echo "Environment variables:"
    echo "  APPLE_ID           Apple ID email"
    echo "  APPLE_TEAM_ID      Team ID"
    echo "  APPLE_APP_PASSWORD App-specific password"
    echo "  BUILD_DIR          Build output directory (default: build)"
    echo ""
    echo "Local two-phase workflow:"
    echo "  $0 build"
    echo "  $0 submit"
    echo "  $0 status <id>  # check manually"
    echo "  $0 staple       # when status is Accepted"
    echo ""
    echo "CI one-phase workflow:"
    echo "  $0 all"
}

case "${1:-help}" in
    build|submit|status|wait|staple|all|clean|help)
        cmd_$1 "${@:2}"
        ;;
    *)
        error "Unknown command: $1"
        cmd_help
        exit 1
        ;;
esac
