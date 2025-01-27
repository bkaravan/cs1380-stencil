#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
});

let data = '';
rl.on('line', (line) => {
  data += line + '\n';
});

rl.on('close', () => {
  const buffer = data.split('\n').filter(Boolean);

  const bigrams = [];
  for (let i = 0; i < buffer.length - 1; i++) {
    bigrams.push([buffer[i], buffer[i + 1]]);
  }

  const trigrams = [];
  for (let i = 0; i < buffer.length - 2; i++) {
    trigrams.push([buffer[i], buffer[i + 1], buffer[i + 2]]);
  }

  const together = buffer.concat(bigrams).concat(trigrams);

  for (const item of together) {
    if (Array.isArray(item)) {
      console.log(item.join('\t'));
    } else {
      console.log(item);
    }
  }
});

