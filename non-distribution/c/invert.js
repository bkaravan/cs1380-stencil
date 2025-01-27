#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
});

const url = process.argv[2];

if (!url) {
  console.error('Usage: ./script.js url < n-grams');
  process.exit(1);
}

let data = '';
rl.on('line', (line) => {
  data += line + '\n';
});


rl.on('close', () => {
  const result = data
      .trim()
      .split('\n')
  // basically python's defaultdict, counting how many times each line occurs
      .reduce((acc, line) => {
        const key = line.trim();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

  // Entries creates a stream of KV pairs
  const output = Object.entries(result)
  // each entry counts the first three words
      .map(([words, count]) => {
        const parts = words.split(/\s+/).slice(0, 3).join(' ');
        return `${parts} | ${count} |`;
      })
      .sort()
      // adding the url at the end
      .map((line) => `${line} ${url}`)
      .join('\n');

  console.log(output);
});
