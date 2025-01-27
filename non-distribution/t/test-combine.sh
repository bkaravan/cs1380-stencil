#!/bin/bash
T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}

OUTPUT_FILE="$T_FOLDER"/d/d51.txt

INTERM_FILE="$T_FOLDER"/d/d52.txt

cat "$T_FOLDER"/d/d4.txt | c/combine.sh > "$INTERM_FILE"
cat "$INTERM_FILE" | sed 's/\t*$//' | sed 's/\s/ /g' | sort | uniq > "$OUTPUT_FILE"

if $DIFF <(cat "$OUTPUT_FILE") <(cat "$T_FOLDER"/d/d5.txt | sed 's/\t*$//' | sed 's/\s/ /g' | sort | uniq) >&2;
then
    echo "$0 success: ngrams are identical"
    exit 0
else
    echo "$0 failure: ngrams are not identical"
    exit 1
fi
