#!/bin/bash

cd "$(dirname "$0")" || exit 1

cat d/content.txt | cat | cat > output.txt