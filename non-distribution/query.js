#!/usr/bin/env node

/*
Search the inverted index for a particular (set of) terms.
Usage: ./query.js your search terms

The behavior of this JavaScript file should be similar to the following shell pipeline:
grep "$(echo "$@" | ./c/process.sh | ./c/stem.js | tr "\r\n" "  ")" d/global-index.txt

Here is one idea on how to develop it:
1. Read the command-line arguments using `process.argv`. A user can provide any string to search for.
2. Normalize, remove stopwords from and stem the query string — use already developed components
3. Search the global index using the processed query string.
4. Print the matching lines from the global index file.

Examples:
./query.js A     # Search for "A" in the global index. This should return all lines that contain "A" as part of an 1-gram, 2-gram, or 3-gram.
./query.js A B   # Search for "A B" in the global index. This should return all lines that contain "A B" as part of a 2-gram, or 3-gram.
./query.js A B C # Search for "A B C" in the global index. This should return all lines that contain "A B C" as part of a 3-gram.

Note: Since you will be removing stopwords from the search query, you will not find any matches for words in the stopwords list.

The simplest way to use existing components is to call them using execSync.
For example, `execSync(`echo "${input}" | ./c/process.sh`, {encoding: 'utf-8'});`
*/


const fs = require('fs');
const {execSync} = require('child_process');
// const path = require('path');


function query(indexFile, args) {
  const term = execSync(`echo "${args}" | ./c/process.sh | ./c/stem.js`, {encoding: 'utf-8'})
      .split('\n')
      .join(' ');

  fs.readFile(indexFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
      return;
    }

    const lines = data.split(/\r?\n/);

    // const terms = ["abjur fly", "love live", "zeleia lycia"];

    // for (let i = 0; i < 100; i++) {
    //   const searchStartTime = process.hrtime.bigint();
    //   const term = terms[i % 3];
    for (const line of lines) {
      if (line.search(term) >= 0) {
        console.log(line);
      }
    }
    // const searchEndTime = process.hrtime.bigint();
    // const searchDurationNs = searchEndTime - searchStartTime;

    // // Convert nanoseconds to seconds + nanoseconds
    // const searchDurationSec = Number(searchDurationNs) / 1e9;
    // console.log(`[Timing] Search execution: ${searchDurationSec.toFixed(9)} s (${searchDurationNs} ns)`);
    // }
    // Manually iterate over the lines
  },
  );
}

const args = process.argv.slice(2); // Get command-line arguments
if (args.length < 1) {
  console.error('Usage: ./query.js [query_strings...]');
  process.exit(1);
}

const indexFile = 'd/global-index.txt'; // Path to the global index file
// const indexFileTf = "tf-idf/globalOutputTfIdf.txt";
query(indexFile, args);
// query(indexFileTf, args);
