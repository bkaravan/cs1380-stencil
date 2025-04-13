#!/bin/bash

# cd "$(dirname "$0")" || exit 1
pwd
input="d/global-index.txt"
output_file="d/query_words.txt"

awk -F'\\|' '{print $1}' "$input" | shuf | head -n 1000 > "$output_file"