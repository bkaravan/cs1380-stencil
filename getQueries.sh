#!/bin/bash

files=(
    "authors/0e5f3"
    "authors/7ff68"
    "authors/69d79"
    "authors/c65b0"
    "authors/fa3de"
)

# Output file
OUTPUT="authors_output.txt"
> "$OUTPUT"  # Clear or create the output file

# Process each file
for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    # Get 300 random lines, extract and format the author
    shuf "$file" | head -n 300 | while IFS='|' read -r author _; do
      author=$(echo "$author" | xargs)  # trim whitespace
      echo "author: $author" >> "$OUTPUT"
    done
  else
    echo "File not found: $file" >&2
  fi
done

echo "Done. Output written to $OUTPUT"