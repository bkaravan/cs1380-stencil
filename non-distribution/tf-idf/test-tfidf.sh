#!/bin/bash
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")" || exit 1

DIFF=${DIFF:-diff}
DIFF_PERCENT=${DIFF_PERCENT:-0}

./pipeline.js

EXIT=0

if DIFF_PERCENT=$DIFF_PERCENT ./../t/gi-diff.js <(sort globalOutputTfIdf.txt) <(sort tfIdfByHand.txt) >&2;
then
    echo "$0 success: global-index is identical"
else
    echo "$0 failure: global-index is not identical"
    EXIT=1
fi

exit $EXIT