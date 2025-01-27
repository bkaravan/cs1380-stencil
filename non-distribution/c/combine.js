#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

class NgramProcessor {

    // Write results to files
    async writeResults(unigramFile, bigramFile, trigramFile) {
        const writeToFile = async (data, filename) => {
            const writer = createWriteStream(filename);
            for (const item of data) {
                if (Array.isArray(item)) {
                    writer.write(item.join('\t') + '\n');
                } else {
                    writer.write(item + '\n');
                }
            }
            return new Promise(resolve => writer.end(resolve));
        };

        await Promise.all([
            writeToFile(this.getUnigrams()),
            writeToFile(this.getBigrams()),
            writeToFile(this.getTrigrams())
        ]);
    }
}

const compareGrams = (a, b) => {
    const aStr = a.join('\t');
    const bStr = b.join('\t');
    return aStr.localeCompare(bStr);
  };

const rl = readline.createInterface({
  input: process.stdin,
});

let data = '';
rl.on('line', (line) => {
  data += line + '\n';
});

rl.on('close', () => {

    const buffer = data.split('n');

    const unigrams = buffer.sort();

    const bigrams = [];
    for (let i = 0; i < buffer.length - 1; i++) {
        bigrams.push([buffer[i], buffer[i + 1]]);
    }

    bigrams.sort(compareGrams);

    const trigrams = [];
    for (let i = 0; i < buffer.length - 2; i++) {
        trigrams.push([buffer[i], buffer[i + 1], buffer[i + 2]]);
    }
    trigrams.sort(compareGrams);

    for (const item of unigrams) {
        console.log(item);
    }

    for (const item of bigrams) {
        console.log(item)
    }

    for (const item of trigrams) {
        console.log(item)
    }
    // console.log(filteredWords);
});

