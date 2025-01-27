#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
});

let data = '';
rl.on('line', (line) => {
  data += line + '\n';
});

rl.on('close', () => {
  const stopSet = new Set(fs.readFileSync('d/stopwords.txt', 'utf8').split('\n').map((word) => word.trim()).filter(Boolean));

  const processedWords = data.replace(/\s+/g, '\n')
      .replace(/[^a-zA-Z]/g, ' ')
      .replace(/\s+/g, '\n')
      .toLowerCase();

  const filteredWords = processedWords.split('\n').filter((word) => word && !stopSet.has(word));

  for (const word of filteredWords) {
    console.log(word);
  }
  // console.log(filteredWords);
});
