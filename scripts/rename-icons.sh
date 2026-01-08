#!/bin/bash

# rename-icons.sh
# ---------------
# Renames icon files to include their pixel dimensions in the filename.
#
# This script expects icon sets where each icon has 4 size variants (16, 32, 48, 128px).
# It determines the pixel size by sorting files by file size (smaller file = smaller icon)
# and renames them accordingly.
#
# Input naming:  icon-dark.png, icon-dark-1.png, icon-dark-2.png, icon-dark-3.png
# Output naming: icon-dark-16.png, icon-dark-32.png, icon-dark-48.png, icon-dark-128.png
#
# Usage:
#   ./rename-icons.sh <folder>
#
# Example:
#   ./rename-icons.sh /path/to/icons
#
#   Before:
#     icon-dark.png (2154 bytes)
#     icon-dark-1.png (903 bytes)
#     icon-dark-2.png (598 bytes)
#     icon-dark-3.png (338 bytes)
#
#   After:
#     icon-dark-16.png  (was icon-dark-3.png, smallest)
#     icon-dark-32.png  (was icon-dark-2.png)
#     icon-dark-48.png  (was icon-dark-1.png)
#     icon-dark-128.png (was icon-dark.png, largest)

if [[ -z "$1" ]]; then
    echo "Usage: $0 <folder>"
    exit 1
fi

FOLDER="$1"

if [[ ! -d "$FOLDER" ]]; then
    echo "Error: '$FOLDER' is not a directory"
    exit 1
fi

cd "$FOLDER" || exit 1

SIZES=(16 32 48 128)

# Get unique base names by stripping -N.png suffix
basenames=$(ls *.png 2>/dev/null | sed 's/-[0-9]\.png$/.png/' | sort -u | sed 's/\.png$//')

for base in $basenames; do
    echo "Processing: $base"

    # Collect all PNG files for this base (with and without suffix)
    files=""
    [[ -f "${base}.png" ]] && files="${base}.png"
    for i in 1 2 3 4 5 6 7 8 9; do
        [[ -f "${base}-${i}.png" ]] && files="$files ${base}-${i}.png"
    done

    # Sort files by size (smallest first)
    sorted_files=($(ls -S -r $files 2>/dev/null))

    if [[ ${#sorted_files[@]} -ne 4 ]]; then
        echo "  Warning: Expected 4 files, found ${#sorted_files[@]}. Skipping."
        continue
    fi

    # Rename to temporary names first (to avoid conflicts)
    for i in 0 1 2 3; do
        mv "${sorted_files[$i]}" "${base}-temp${i}.png"
    done

    # Rename to final names with pixel dimensions
    for i in 0 1 2 3; do
        newname="${base}-${SIZES[$i]}.png"
        mv "${base}-temp${i}.png" "$newname"
        echo "  ${sorted_files[$i]} -> $newname"
    done
done

echo "Done!"
