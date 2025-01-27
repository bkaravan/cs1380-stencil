#!/bin/bash
# This is a student test

R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}

# testing level b

url="https://cs.brown.edu/courses/csci1380/sandbox/1/level_1b/index.html"


if $DIFF <(cat ./d/d0.txt | ./../c/getURLs.js $url | sort) <(sort ./d/d11.txt) >&2;
then
    echo "$0 success: URL sets are identical"
    exit 0
else
    echo "$0 failure: URL sets are not identical"
    exit 1
fi