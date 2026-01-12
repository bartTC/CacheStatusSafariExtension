#!/bin/bash
# Remove duplicate Safari extension registrations from pluginkit
# See: https://keith.github.io/xcode-man-pages/pluginkit.8.html

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Unregistering Cache Status extensions from build artifacts..."

# Remove all .appex registrations from build folders
find "$PROJECT_DIR/build" \
     "$HOME/Library/Developer/Xcode/DerivedData" \
     "$HOME/Library/Developer/Xcode/Archives" \
     -name "*.appex" -path "*Cache*Status*" 2>/dev/null | while read -r path; do
    pluginkit -r "$path" 2>/dev/null && echo "  Removed: ${path##*/}"
done

echo ""
echo "Duplicates remaining: $(pluginkit -m -D -i com.cfcachestatus.CF-Cache-Status.Extension 2>/dev/null | wc -l | tr -d ' ')"
echo "Restart Safari to apply changes."
