#!/usr/bin/env node

/*
Convert each term to its stem
Usage: ./stem.js <input >output
*/

const readline = require('readline');
const natural = require('natural');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const stemmer = natural.PorterStemmer;

// assumes one word per line (?), maybe I will need to manually split the line
rl.on('line', function(line) {
  // Print the Porter stem from `natural` for each element of the stream.
  //console.log(line)
  // if splitting is needed: const words = line.split(/\s+/)
  // const stemmed = words.map(word => stemmer.stem(word))
  console.log(stemmer.stem(line))
});
