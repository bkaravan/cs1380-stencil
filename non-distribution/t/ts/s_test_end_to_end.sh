#!/bin/bash
# This is a student test

# end to end test on bigger corpora
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}
DIFF_PERCENT=${DIFF_PERCENT:-0}

cat /dev/null > ./../d/visited.txt
cat /dev/null > ./../d/global-index.txt

cat ./d/u1.txt > ./../d/urls.txt

./../engine.sh

EXIT=0

if $DIFF <(sort ./../d/visited.txt) <(sort ./d/v1.txt) >&2;
then
    echo "$0 success: visited urls are identical"
else
    echo "$0 failure: visited urls are not identical"
    EXIT=1
fi

if DIFF_PERCENT=$DIFF_PERCENT ./../t/gi-diff.js <(sort ./../d/global-index.txt) <(sort ./d/i1.txt) >&2;
then
    echo "$0 success: global-index is identical"
else
    echo "$0 failure: global-index is not identical"
    EXIT=1
fi

exit $EXIT