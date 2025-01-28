#!/usr/bin/env node

// pipeline:

// cat "$1" |
//   c/merge.js d/global-index.txt |
//   sort -o d/global-index.txt

// process part
const fs = require('fs');
// const readline = require('readline');
const natural = require('natural');
const processUrls = require('./tfGetUrls');
const {convert} = require('html-to-text');
const https = require('https');
const http = require('http');

// not sure what this number is tbh, might be 3

const global = {};
const wordsToDocFreq = {};
const urlToTotalWords = {};

// fills output with n-grams
function computeNgrams(output, filteredWords) {
  const buffer = filteredWords.filter(Boolean);

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
      output.push(item.join('\t'));
    } else {
      output.push(item);
    }
  }
}

function invert(data, url) {
  const result = data
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
        // update words to doc freq for every n-gram
        if (parts in wordsToDocFreq) {
          wordsToDocFreq[parts][url] = count;
        } else {
          wordsToDocFreq[parts] = {};
          wordsToDocFreq[parts][url] = count;
        }
        return `${parts} | ${count} |`;
      })
      .sort()
  // adding the url at the end
      .map((line) => `${line} ${url}`)
      .join('\n');
  return output;
}

const compare = (a, b) => {
  if (a.freq > b.freq) {
    return -1;
  } else if (a.freq < b.freq) {
    return 1;
  } else {
    return 0;
  }
};

function processDocument(data, url) {
  const stopSet = new Set(fs.readFileSync('../d/stopwords.txt', 'utf8').split('\n').map((word) => word.trim()).filter(Boolean));

  const processedWords = data.replace(/\s+/g, '\n')
      .replace(/[^a-zA-Z]/g, ' ')
      .replace(/\s+/g, '\n')
      .toLowerCase();
  const stemmer = natural.PorterStemmer;
  // stemming and filtering
  const filteredWords = processedWords.split('\n').filter((word) => word && !stopSet.has(word)).map((word) => stemmer.stem(word));

  // update one ds
  urlToTotalWords[url] = filteredWords.length;

  // combine part
  const combinedGrams = [];
  computeNgrams(combinedGrams, filteredWords);

  // invert part
  const inverted = invert(combinedGrams, url);

  // DOUBLE CHECK INDEXING PIPELINE
  mergeGlobal(inverted);
}

const mergeGlobal = (localIndex) => {
  // Split the data into an array of lines
  const localIndexLines = localIndex.split('\n');

  const local = {};

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

  for (const term in local) {
    if (term in global) {
      global[term].push(local[term]);
      // technically, might be faster to resort everything at the end
      global[term].sort(compare);
    } else {
      global[term] = [local[term]];
    }
  }
};

class MyEngine {
  constructor() {
    this.urls = new Set();
    this.visited = new Set();
    this.content = '';
    this.agent = new https.Agent({
      rejectUnauthorized: false,
    });
    this.stopGenerator = false;
  }

  makeRequest(url, maxRedirects = 2, timeout = 200) {
    return new Promise((resolve, reject) => {
      const options = {
        rejectUnauthorized: false, // Ignore SSL certificate errors (like curl -k)
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml', // Standard Accept header
        },
        timeout: timeout, // Timeout for the request
      };

      const client = url.startsWith('https') ? https : http;

      const req = client.get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Handle redirects (like curl -L)
          if (maxRedirects === 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          const redirectUrl = new URL(res.headers.location, url).toString();
          resolve(this.makeRequest(redirectUrl, maxRedirects - 1, timeout)); // Recursive call to follow redirect
        } else if (res.statusCode !== 200) {
          reject(new Error(`HTTP error! status: ${res.statusCode}`)); // Handle HTTP errors
        } else {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk; // Accumulate the response
          });
          res.on('end', () => {
            resolve(data); // Resolve with the full response when done
          });
        }
      });

      req.on('error', (error) => {
        reject(error); // Handle network or request errors
      });

      req.on('timeout', () => {
        req.destroy(); // Destroy the request on timeout
        reject(new Error('Request timed out'));
      });
    });
  }

  async crawlUrl(url) {
    console.log(`[engine] crawling ${url}`);
    try {
      this.content = await this.crawl(url);
      // console.log(this.content);

      console.log(`[engine] indexing ${url}`);

      await this.index(this.content, url);
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
  }


  async crawl(url) {
    this.visited.add(url);

    try {
      // Fetch the page content
      const html = await this.makeRequest(url);

      // call helpers from the pipeline
      const newUrls = processUrls(html, url);
      const textContent = convert(html);

      // Add new URLs that haven't been visited yet
      for (const newUrl of newUrls) {
        if (!this.visited.has(newUrl)) {
          this.urls.add(newUrl);
        }
      }

      return textContent;
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      return '';
    }
  }

  async index(content, url) {
    // indexing pipeline starts here
    processDocument(content, url);
  }

  addUrl(url) {
    this.urls.add(url);
  }

  getVisited() {
    return this.visited.size;
  }

  // Main engine method
  async run() {
    // Create an async iterator to simulate tail -f behavior
    const urlIterator = this.urlGenerator();

    for await (const url of urlIterator) {
      if (url === 'stop') {
        console.log('Stopping due to stop command');
        break;
      }

      await this.crawlUrl(url);

      // Check if we've visited all available URLs
      if (this.visited.size >= this.urls.size) {
        console.log('Stopping - all URLs have been visited');
        this.stopGenerator = true;
        break;
      }
    }
  }

  // Generator function to simulate tail -f behavior
  async* urlGenerator() {
    const processed = new Set();

    while (!this.stopGenerator) {
      const newUrls = [];
      for (const url of this.urls) {
        if (!processed.has(url)) {
          processed.add(url);
          yield url;
          // Queue new URLs for later addition
          newUrls.push(url);
        }
      }

      for (const url of newUrls) {
        this.urls.add(url);
      }

      // Simulate waiting for new URLs
      if (this.urls.size === processed.size) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

// tf-idf

function computeTf() {
  const retDict = {};

  for (const [word, nested] of Object.entries(wordsToDocFreq)) {
    retDict[word] = {};
    for (const [url, count] of Object.entries(nested)) {
      if (word in retDict) {
        retDict[word][url] = count /
          urlToTotalWords[url];
      } else {
        retDict[word] = {};
        retDict[word][url] = count /
          urlToTotalWords[url];
      }
    }
  }

  return retDict;
}


function computeIdf(pageCount) {
  const retDict = {};
  for (const [word, nested] of Object.entries(wordsToDocFreq)) {
    const wordIdf = Math.log(
        pageCount/Object.keys(nested).length);
    retDict[word] = wordIdf;
  }

  return retDict;
}

function computeTfIdf(pageCount) {
  const tfDict = computeTf();
  const idfDict = computeIdf(pageCount);

  for (const [word, nested] of Object.entries(tfDict)) {
    for (const [url, count] of Object.entries(nested)) {
      tfDict[word][url] = count * idfDict[word];
    }
  }

  return tfDict;
}

async function main() {
  const crawler = new MyEngine();

  // we can modify this to be the argument for the script too if we want
  crawler.addUrl('https://cs.brown.edu/courses/csci1380/sandbox/1');

  await crawler.run().catch(console.error);

  // can do tf-idf here
  const tfIdfDict = computeTfIdf(crawler.getVisited());

  const writeStream = fs.createWriteStream('globalOutputTfIdf.txt', {flags: 'w'});

  for (const term in global) {
    const pairs = global[term].map((entry) => `${entry.url} ${tfIdfDict[term][entry.url]}`).sort(compare).join(' ');
    const line = `${term} | ${pairs}`;
    writeStream.write(line + '\n');
  }

  writeStream.end();
}


main();


