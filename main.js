#!/usr/bin/env node

const distribution = require('./config.js');
const readline = require('readline');
const https = require('https');

const {JSDOM} = require('jsdom');

// repl interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

// globals
const id = distribution.util.id;
let localServer = null;
const myAwsGroup = {};

const n0 = {ip: '127.0.0.1', port: 10000};
// these are aws nodes from m4
// const n1 = {ip: "3.141.197.31", port: 1234};
// const n2 = {ip: "18.221.129.123", port: 1234};
// const n3 = {ip: "3.16.38.196", port: 1234};

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};
const n4 = {ip: '127.0.0.1', port: 7113};
const n5 = {ip: '127.0.0.1', port: 7114};

// Part 1: run the crawler
async function runCrawler(replCb) {
  // mapper crawlsz
  const mapper = (key, value) => {
    // Using promises to handle the asynchronous operations
    return new Promise((resolve, reject) => {
      const cheerio = require('cheerio');
      const {fetch, Agent} = require('undici');

      async function fetchAndParse(url) {
        const httpsAgent = new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        });

        try {
          const response = await fetch(url, {dispatcher: httpsAgent});
          if (!response.ok) {
            throw new Error(`Fetch failed with status: ${response.status}`);
          }
          const html = await response.text();
          const $ = cheerio.load(html);
          return $;
        } catch (error) {
          console.error('Fetch error:', error);
          throw error;
        }
      }

      function doMap() {
        distribution.visited.mem.get(key, (e, v) => {
          if (e instanceof Error) {
            distribution.visited.mem.put(value, key, (e, v) => {
              console.log('new link : ' + v + '\n');
              fetchAndParse(value)
                .then((doc) => {
                  const baseUrl = value;
                  const bannedLinks = new Set([
                    '?C=N;O=D',
                    '?C=M;O=A',
                    '?C=S;O=A',
                    '?C=D;O=A',
                    'books.txt',
                    'donate-howto.txt',
                    'indextree.txt',
                    'retired/',
                    '/data/',
                  ]);

                  const links = doc('a')
                    .map((_, element) => {
                      try {
                        // Get the href attribute
                        const href = doc(element).attr('href');

                        // Skip if it's in the banned links
                        if (href && bannedLinks.has(href)) {
                          return null;
                        }

                        // Create absolute URLs from relative ones
                        if (href) {
                          const absoluteUrl = new URL(href, baseUrl).href;
                          return absoluteUrl;
                        }
                        return null;
                      } catch (error) {
                        console.error(`Error processing URL: ${href}`, error);
                        return null;
                      }
                    })
                    .get() // This converts Cheerio's result into a regular array
                    .filter((link) => link !== null);

                  const result = links.map((link) => {
                    return {[id.getID(link)]: link};
                  });

                  resolve(result); // Resolve the promise with the final result
                })
                .catch((err) => {
                  console.error('Error in operation:', err);
                  resolve([]); // Resolve with empty array in case of error
                });
            });
          } else {
            resolve([]); // Resolve with empty array if key exists
          }
        });
      }

      doMap(); // Start the process but don't return anything here
    });
  };

  // reducer finds new text files to crawl, or updates global index
  const reducer = (key, values) => {
    return new Promise((resolve, reject) => {
      const link = values[0];

      if (!link.endsWith('txt')) {
        // case 1: this is a redirect link
        const retObj = {[key]: link};
        resolve(retObj);
        return;
      }

      const fs = require('fs');
      const path = require('path');
      const natural = require('natural');

      // console.log('got to the text part with : ' + link + '\n');

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

      const compare = (a, b) => {
        if (a.freq > b.freq) {
          return -1;
        } else if (a.freq < b.freq) {
          return 1;
        } else {
          return 0;
        }
      };

      const basePath = path.join(
        path.dirname(path.resolve('main.js')),
        'globals',
      );
      const globalIndexFile = path.join(basePath, global.moreStatus.sid);

      const mergeGlobal = (localIndex) => {
        // Split the data into an array of lines
        const data = fs.readFileSync(globalIndexFile, 'utf8');
        const localIndexLines = localIndex.split('\n');
        const globalIndexLines = data.split('\n').filter((a) => a != '');

        const local = new Map();
        const global = new Map();

        for (const line of localIndexLines) {
          // might need to skip empty lines
          const lineSplit = line.split('|').map((part) => part.trim());
          if (lineSplit.length < 3) continue;
          const term = lineSplit[0];
          const url = lineSplit[2];
          const freq = Number(lineSplit[1]);
          local.set(term, {url, freq});
        }

        for (const line of globalIndexLines) {
          const lineSplit = line.split('|').map((part) => part.trim());
          const pairSplit = lineSplit[1].split(' ').map((part) => part.trim());
          const term = lineSplit[0];
          const urlfs = [];
          // can use a flatmap here, but kind of an overkill
          for (let i = 0; i < pairSplit.length; i += 2) {
            urlfs.push({url: pairSplit[i], freq: Number(pairSplit[i + 1])});
          }
          global.set(term, urlfs); // Array of {url, freq} objects
        }

        for (const [key, value] of local) {
          if (global.has(key)) {
            global.get(key).push(value);
            // technically, might be faster to resort everything at the end
            global.get(key).sort(compare);
          } else {
            global.set(key, [value]);
          }
        }

        const finalData = [];
        for (const [term, value] of global) {
          const pairs = value
            .map((entry) => `${entry.url} ${entry.freq}`)
            .join(' ');
          const line = `${term} | ${pairs}`;
          finalData.push(line);
        }

        const contentToAppend = finalData.join('\n');

        fs.writeFileSync(globalIndexFile, contentToAppend + '\n');
      };

      function invert(data, url) {
        // basically python's defaultdict, counting how many times each line occurs
        const result = data.reduce((acc, line) => {
          const key = line.trim();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        // Entries creates a stream of KV pairs
        // each entry counts the first three words
        // prettier-ignore
        const output = Object.entries(result)
        .map(([words, count]) => {
          const parts = words.split(/\s+/).slice(0, 3).join(' ');
          // update words to doc freq for every n-gram
          return `${parts} | ${count} |`;
        })
        .sort()
        // adding the url at the end
        .map((line) => `${line} ${url}`)
        .join('\n');
        return output;
      }

      function processDocument(data, url) {
        // prettier-ignore
        const stopSet = new Set(
        fs
          .readFileSync('./non-distribution/d/stopwords.txt', 'utf8')
          .split('\n')
          .map((word) => word.trim())
          .filter(Boolean),
      );

        // prettier-ignore
        const processedWords = data
        .replace(/\s+/g, '\n')
        .replace(/[^a-zA-Z]/g, ' ')
        .replace(/\s+/g, '\n')
        .toLowerCase();
        const stemmer = natural.PorterStemmer;
        // stemming and filtering
        // prettier-ignore
        const filteredWords = processedWords
        .split('\n')
        .filter((word) => word && !stopSet.has(word))
        .map((word) => stemmer.stem(word));

        // console.log(filteredWords.length);

        // combine part
        const combinedGrams = [];
        computeNgrams(combinedGrams, filteredWords);

        // invert part
        const inverted = invert(combinedGrams, url);

        // DOUBLE CHECK INDEXING PIPELINE
        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath);
        }
        if (!fs.existsSync(globalIndexFile)) {
          fs.writeFileSync(globalIndexFile, '\n');
        }
        mergeGlobal(inverted);
      }

      const {fetch, Agent} = require('undici');

      // prettier-ignore
      async function fetchTxt(url) {
      // const fetch = require('node-fetch');
      const httpsAgent = new Agent({
        connect: {
          rejectUnauthorized: false,
        },
      });
    
      try {
        const response = await fetch(url, { dispatcher: httpsAgent });
        if (!response.ok) {
          throw new Error(`Fetch failed with status: ${response.status}`);
        }
        return await response.text();
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    }

      // TODO: only work on the link if you have not seen it before.
      distribution.visited.mem.get(key, (e, v) => {
        if (e instanceof Error) {
          distribution.visited.mem.put(link, key, (e, v) => {
            // console.log(v);
            fetchTxt(link).then((html) => {
              processDocument(html, link);
              resolve({});
            });
          });
        } else {
          resolve({});
        }
      });
    });
  };

  const start = 'https://atlas.cs.brown.edu/data/gutenberg/';

  // const startDoc = await fetchAndParse(start);

  // console.log(startDoc);

  const startHash = id.getID(start);

  const dataset = [{[startHash]: start}];

  const dataset1 = [
    {
      '9e13a3e4b87ad2d22ecdfe2f00a2bf93ac9d34488b5a1219e8976d388ad55e45':
        'https://atlas.cs.brown.edu/data/gutenberg/0/5/',
    },
  ];

  const doMapReduce = (cb) => {
    distribution.mygroup.store.get(null, (e, v) => {
      distribution.mygroup.mr.exec(
        {keys: v, map: mapper, reduce: reducer, rounds: 3},
        (e, v) => {
          if (e) console.error('MapReduce error:', e);
          replCb();
        },
      );
    });
  };

  let cntr = 0;

  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.mygroup.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
}

// Part 0: node setup and shutdown

function startNodes(cb) {
  // run crawler should be run here

  myAwsGroup[id.getSID(n0)] = n0;
  myAwsGroup[id.getSID(n1)] = n1;
  myAwsGroup[id.getSID(n2)] = n2;
  myAwsGroup[id.getSID(n3)] = n3;
  myAwsGroup[id.getSID(n4)] = n4;
  myAwsGroup[id.getSID(n5)] = n5;

  // if we do aws, we don't need this (in case of manual start up)
  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          distribution.local.status.spawn(n4, (e, v) => {
            distribution.local.status.spawn(n5, (e, v) => {
              cb();
            });
          });
        });
      });
    });
  };

  distribution.node.start((server) => {
    localServer = server;

    const mygroupConfig = {gid: 'mygroup'};
    const myVisitedConfig = {gid: 'visited'};

    startNodes(() => {
      // This starts up our group
      // prettier-ignore
      distribution.local.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
        distribution.mygroup.groups
          .put(mygroupConfig, myAwsGroup, (e, v) => {

            distribution.local.groups.put(myVisitedConfig, myAwsGroup, (e, v) => {
              distribution.visited.groups
                .put(myVisitedConfig, myAwsGroup, async (e, v) => {
                  // after setup, we run the crawler
                  await runCrawler(cb);
                })
            });
          })
      });
    });
  });
}

function stopNodes() {
  const remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            localServer.close();
          });
        });
      });
    });
  });
}

// Part 2: repl the queries
function main() {
  // after nodes are but up and the crawler has ran, we want to start up
  // the cli
  startNodes(() => {
    const queryService = {};
    queryService.query = (query, cb) => {
      const fs = require('fs');
      // console.log('SID:', global.moreStatus.sid);

      const filePath = 'globals/' + global.moreStatus.sid;
      // console.log('Reading file at:', filePath);

      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        // console.log('Raw file content:', raw);

        const data = raw
          .split('\n')
          .map((word) => word.trim())
          .filter(Boolean);

        // console.log('Processed data:', data);
        const stemmer = require('natural').PorterStemmer;
        const stemmedQuery = stemmer.stem(query);

        const res = [];
        for (const line of data) {
          const term = line.split('|')[0];
          const words = term.split(' ');
          for (const word of words) {
            if (word === stemmedQuery) {
              res.push(line);
            }
          }
          // if (term.includes(query)) {
          //   res.push(line);
          // }
        }

        cb(null, res);
      } catch (err) {
        // console.error('Failed to read or process file:', err);
        cb(err);
      }
    };
    distribution.mygroup.routes.put(queryService, 'query', (e, v) => {
      // Startup message
      console.log('Welcome to a Distributed Book Search\n');
      rl.prompt();

      // Handle each line of input
      rl.on('line', (line) => {
        // Check for exit command
        if (line.trim() === 'quit') {
          rl.close();
          stopNodes();
          return;
        }

        try {
          // This is where we would run our serach queries
          // const result = eval(line);
          // // Print the result
          // console.log(result);

          trimmedLine = line.trim();
          if (trimmedLine === '') {
            rl.prompt();
            return;
          }

          const remote = {service: 'query', method: 'query'};
          distribution.mygroup.comm.send([trimmedLine], remote, (e, v) => {
            for (const node of Object.keys(v)) {
              for (const line of v[node]) {
                console.log(line);
              }
            }
          });
        } catch (err) {
          // Print any errors
          console.error('Error:', err.message);
        }

        // Show the prompt again
        rl.prompt();
      });

      // Handle REPL closure
      rl.on('close', () => {
        console.log('Exiting REPL');
        stopNodes();
        return;
      });

      rl.on('SIGINT', () => {
        rl.close();
      });
    });
  });
}

main();
