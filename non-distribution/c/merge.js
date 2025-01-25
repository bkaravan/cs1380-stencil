#!/usr/bin/env node

/*
Merge the current inverted index (assuming the right structure) with the global index file
Usage: cat input | ./merge.js global-index > output

The inverted indices have the different structures!

Each line of a local index is formatted as:
  - `<word/ngram> | <frequency> | <url>`

Each line of a global index is be formatted as:
  - `<word/ngram> | <url_1> <frequency_1> <url_2> <frequency_2> ... <url_n> <frequency_n>`
  - Where pairs of `url` and `frequency` are in descending order of frequency
  - Everything after `|` is space-separated

-------------------------------------------------------------------------------------
Example:

local index:
  word1 word2 | 8 | url1
  word3 | 1 | url9
EXISTING global index:
  word1 word2 | url4 2
  word3 | url3 2

merge into the NEW global index:
  word1 word2 | url1 8 url4 2
  word3 | url3 2 url9 1

Remember to error gracefully, particularly when reading the global index file.
*/


const fs = require('fs');
const readline = require('readline');
// The `compare` function can be used for sorting.
const compare = (a, b) => {
  if (a.freq > b.freq) {
    return -1;
  } else if (a.freq < b.freq) {
    return 1;
  } else {
    return 0;
  }
};

const rl = readline.createInterface({
  input: process.stdin,
});

// 1. Read the incoming local index data from standard input (stdin) line by line.
let localIndex = '';
rl.on('line', (line) => {
  localIndex += line + '\n';
});

rl.on('close', () => {
  // 2. Read the global index name/location, using process.argv
  // and call printMerged as a callback
  // const name = process.argv[0];
  // const location = process.argv[1];
  const globalIndexFile = process.argv[2];

  if (!globalIndexFile) {
    console.error('Error: Missing global index file argument.');
    process.exit(1);
  }

  // using provided fs to read
  fs.readFile(globalIndexFile, 'utf8', (err, data) => {
    printMerged(err, data);
  });
});

const printMerged = (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Split the data into an array of lines
  const localIndexLines = localIndex.split('\n');
  const globalIndexLines = data.split('\n');

  localIndexLines.pop();
  globalIndexLines.pop();

  const local = {};
  const global = {};

  // 3. For each line in `localIndexLines`, parse them and add them to the `local` object where keys are terms and values contain `url` and `freq`.
  for (const line of localIndexLines) {
    // might need to skip empty lines
    const lineSplit = line.split('|').map((part) => part.trim());
    if (lineSplit.length < 3) continue;
    const term = lineSplit[0];
    const url = lineSplit[2];
    const freq = Number(lineSplit[1]);
    local[term] = {url, freq};
  }

  // 4. For each line in `globalIndexLines`, parse them and add them to the `global` object where keys are terms and values are arrays of `url` and `freq` objects.
  // Use the .trim() method to remove leading and trailing whitespace from a string.
  for (const line of globalIndexLines) {
    const lineSplit = line.split('|').map((part) => part.trim());
    const pairSplit = lineSplit[1].split(' ').map((part) => part.trim());
    const term = lineSplit[0];
    const urlfs = [];
    // can use a flatmap here, but kind of an overkill
    for (let i = 0; i < pairSplit.length; i += 2) {
      urlfs.push({url: pairSplit[i], freq: Number(pairSplit[i + 1])});
    }
    global[term] = urlfs; // Array of {url, freq} objects
  }

  // 5. Merge the local index into the global index:
  // - For each term in the local index, if the term exists in the global index:
  //     - Append the local index entry to the array of entries in the global index.
  //     - Sort the array by `freq` in descending order.
  // - If the term does not exist in the global index:
  //     - Add it as a new entry with the local index's data.

  for (const term in local) {
    if (term in global) {
      global[term].push(local[term]);
      global[term].sort(compare);
    } else {
      global[term] = [local[term]];
    }
  }
  // 6. Print the merged index to the console in the same format as the global index file:
  //    - Each line contains a term, followed by a pipe (`|`), followed by space-separated pairs of `url` and `freq`.

  for (const term in global) {
    const pairs = global[term].map((entry) => `${entry.url} ${entry.freq}`).join(' ');
    const line = `${term} | ${pairs}`;
    console.log(line);
  }
};
