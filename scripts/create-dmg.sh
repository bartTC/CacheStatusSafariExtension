#!/bin/bash
set -e

# Create DMG installer with drag-to-Applications window
# Usage: ./scripts/create-dmg.sh [version]

BUILD_DIR="${BUILD_DIR:-build}"

if [[ -n "$1" ]]; then
    ver="$1"
elif [[ -f "$BUILD_DIR/.current_version" ]]; then
    ver=$(cat "$BUILD_DIR/.current_version")
else
    echo "Error: No version specified"
    exit 1
fi

ver_dir="$BUILD_DIR/$ver"
app_path="$ver_dir/export/CF Cache Status.app"
dmg_path="$ver_dir/CacheStatus-$ver.dmg"

if [[ ! -d "$app_path" ]]; then
    echo "Error: App not found at $app_path"
    echo "Run 'just archive $ver' first."
    exit 1
fi

# Remove existing DMG if present
rm -f "$dmg_path"

echo "Creating DMG for $ver..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKGROUND="$SCRIPT_DIR/../assets/dmg-background.png"

# Window layout (600x400):
#
#   ┌──────────────────────────────────────────────┐
#   │                                              │
#   │     [App Icon]    ───►    [Applications]     │
#   │      x=150                   x=450           │
#   │      y=85                    y=85            │
#   │                                              │
#   │        "Drag to Applications to install"     │
#   │                                              │
#   └──────────────────────────────────────────────┘

create-dmg \
    --volname "Cache Status" \
    --volicon "$app_path/Contents/Resources/AppIcon.icns" \
    --background "$BACKGROUND" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "CF Cache Status.app" 150 125 \
    --app-drop-link 450 125 \
    --hide-extension "CF Cache Status.app" \
    "$dmg_path" \
    "$app_path"

# Options explained:
#   --volname         Name shown in Finder title bar and mounted volume
#   --volicon         Icon for the mounted DMG volume
#   --background      Background image (600x400 PNG with arrow/instructions)
#   --window-pos      Where the Finder window opens on screen (x y from top-left)
#   --window-size     Finder window dimensions (width height)
#   --icon-size       Size of icons in the window (pixels)
#   --icon            Position of the app: "Name.app" x y (from top-left of window)
#   --app-drop-link   Position of Applications folder shortcut: x y
#   --hide-extension  Hide .app extension for cleaner look

echo ""
echo "DMG created: $dmg_path"
