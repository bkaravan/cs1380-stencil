#!/bin/bash

# Convert input to a stream of non-stopword terms
# Usage: ./process.sh < input > output

# Convert each line to one word per line, **remove non-letter characters**, make lowercase, convert to ASCII; then remove stopwords (inside d/stopwords.txt)
# Commands that will be useful: tr, iconv, grep

# tr -d delets characters
# iconv to translate to ascii
# grep? 

tr '[:space:]' '\n' |       
tr -c '[:alpha:]' ' ' | # rather than removing non-letter characters, we swap them with spaces
tr -s ' ' '\n' |      # then squeeze them changing to newlines
tr '[:upper:]' '[:lower:]' | 
iconv -t ascii | 
grep -vxFf d/stopwords.txt  


