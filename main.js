#!/usr/bin/env node

const distribution = require('./config.js');
const readline = require('readline');
const https = require('https');

const {JSDOM} = require('jsdom');
const {boolean} = require('yargs');

function cleanup() {
  const { execFileSync } = require('child_process');
  try {
    execFileSync('./kill_nodes.sh', { encoding: 'utf8' });
  } catch (error) {
  }

  // commented, it picks up where it left off, not sure if we want or not
  const fs = require('fs');
  const path = require('path');
  fs.rmSync(path.join(__dirname, 'store'), {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(path.join(__dirname, 'store'));
}

cleanup();

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
  // mapper crawls
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
          const lightDOM = cheerio.load(html);
          return lightDOM;
        } catch (error) {
          console.error('Fetch error:', error);
          // throw error;
          return null;
        }
      }

      function doMap() {
        distribution.visited.mem.get(key, (e, v) => {
          if (e instanceof Error) {
            distribution.visited.mem.put(value, key, (e, v) => {
              console.log('new link : ' + v + '\n');
              fetchAndParse(value)
                .then((doc) => {
                  if (doc) {
                    // console.log(doc.text());
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

                    // returned value is deconstructed to (number, element)
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
                            // URL + baseURL
                            const absoluteUrl = new URL(href, baseUrl).href;

                            // finds them, though never gets to create author
                            // if (absoluteUrl.endsWith('.txt')) {
                            //   console.error(absoluteUrl);
                            // }

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

                      // console.error('links:', links);

                    const result = links.map((link) => {
                      return {[id.getID(link)]: link};
                    });

                    resolve(result); // Resolve the promise with the final result
                  }

                  // otherwise resolve with empty array, meaning no valid doc
                  resolve([]);
                })
                .catch((err) => {
                  console.error('Error in operation:', err);
                  resolve([]); // Resolve with empty array in case of error
                });
            });
          } else {
            // Resolve with empty array if key exists
            resolve([]);
          }
        });
      }

      // Start the process but don't return anything here
      doMap();
    });
  };

  // reducer finds new text files to crawl, or updates global index
  const reducer = (key, values) => {
    console.error('got to the reducer part');
    return new Promise((resolve, reject) => {
      const link = values[0];

      // never activates, 
      if (link.endsWith('.txt')) {
        console.error('SO_REAL')
      }

      if (!link.endsWith('txt')) {
        // case 1: this is a redirect link
        // console.error('found a redirect link in the reducer: ' + link + '\n');
        const retObj = {[key]: link};
        resolve(retObj);
        return;
      }

      console.error('found a text file in the reducer');

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

      function processDocument(data, url) {
        // data: the first 1000 characters of the html/text file
        // const stopSet = new Set(
        // fs
        //   .readFileSync('./non-distribution/d/stopwords.txt', 'utf8')
        //   .split('\n')
        //   .map((word) => word.trim())
        //   .filter(Boolean),
        // );

        console.error('processing document');

        const titleMatch = data.match(/Title:\s*(.*(?:\n\s+.*)*)/);
        const authorMatch = data.match(/Author:\s*(.*)/);
        const releaseDate = data.match(/Release Date:\s*(.*)/);
        const language = data.match(/Language:\s*(.*)/);

        const title = titleMatch ? titleMatch[1].trim() : null;
        const author = authorMatch ? authorMatch[1].trim() : null;
        // form ex: August 1, 2023
        const releaseDateMatch = releaseDate ? releaseDate[1].trim() : null;
        const releaseYear = releaseDateMatch
          ? (releaseDateMatch.match(/\b\d{4}\b/)?.[0] ?? null)
          : null;
        const languageMatch = language ? language[1].trim() : null;

        const globalBasePath = path.join(
          path.dirname(path.resolve('main.js')),
          'authors',
        );

        const globalFile = path.join(globalBasePath, global.moreStatus.sid);

        console.error('getting here LMAOOO')
        // create the directory, doesn't work if store doesn't exist?
        if (!fs.existsSync(globalBasePath)) {
          console.warn('creating directory');
          console.error('directory at:', globalBasePath);
          fs.mkdirSync(globalBasePath);
        }

        // create the file
        if (!fs.existsSync(globalFile)) {
          console.warn('creating file');
          console.error('file at:', globalFile);
          fs.writeFileSync(globalFile, '\n');
        }

        fs.appendFileSync(
          globalFile,
          `${author} | ${title} | ${releaseYear} | ${languageMatch} | ${url}\n`,
          'utf8',
        );

        // // prettier-ignore
        // const processedWords = data
        // .replace(/\s+/g, '\n')
        // .replace(/[^a-zA-Z]/g, ' ')
        // .replace(/\s+/g, '\n')
        // .toLowerCase();
        // const stemmer = natural.PorterStemmer;
        // // stemming and filtering
        // // prettier-ignore
        // const filteredWords = processedWords
        // .split('\n')
        // .filter((word) => word && !stopSet.has(word))
        // .map((word) => stemmer.stem(word));

        // // console.log(filteredWords.length);

        // // combine part
        // const combinedGrams = [];
        // computeNgrams(combinedGrams, filteredWords);

        // // invert part
        // const inverted = invert(combinedGrams, url);

        // // DOUBLE CHECK INDEXING PIPELINE
        // if (!fs.existsSync(basePath)) {
        //   fs.mkdirSync(basePath);
        // }
        // if (!fs.existsSync(globalIndexFile)) {
        //   fs.writeFileSync(globalIndexFile, '\n');
        // }
        // mergeGlobal(inverted);
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
          const response = await fetch(url, { headers: {'Range': 'bytes=0-999'},dispatcher: httpsAgent });
          if (!response.ok) {
            console.warn('failure 1');
            console.error('Fetch failed with status:', response.status);
            throw new Error(`Fetch failed with status: ${response.status}`);
          }

          return await response.text();
        } catch (error) {
          console.warn('failure 1');
          console.error('Fetch error:', error);
          return null;
        }
    }

      // TODO: only work on the link if you have not seen it before.
      distribution.visited.mem.get(key, (e, v) => {
        console.error('got to the visited part');
        if (e instanceof Error) {
          distribution.visited.mem.put(link, key, (e, v) => {
            console.error('REALLLL : ' + v + '\n');
            fetchTxt(link).then((html) => {
              if (html) {
                const trimmedLength = Math.min(1000, html.length);
                const trimmedHtml = html.substring(0, trimmedLength);
                processDocument(trimmedHtml, link);
              }
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
        {keys: v, map: mapper, reduce: reducer, rounds: 10},
        (e, v) => {
          if (e) {
            console.error('MapReduce error:', e);
          }

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

function startNodes(callback) {
  // run crawler should be run here

  myAwsGroup[id.getSID(n0)] = n0;
  myAwsGroup[id.getSID(n1)] = n1;
  myAwsGroup[id.getSID(n2)] = n2;
  myAwsGroup[id.getSID(n3)] = n3;
  myAwsGroup[id.getSID(n4)] = n4;
  myAwsGroup[id.getSID(n5)] = n5;

  // if we do aws, we don't need this (in case of manual start up)
  const spawnNodes = (cb) => {
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

    spawnNodes(() => {
      // This starts up our group
      // prettier-ignore
      distribution.local.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
        distribution.mygroup.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
          distribution.local.groups.put(myVisitedConfig, myAwsGroup, (e, v) => {
            distribution.visited.groups
              .put(myVisitedConfig, myAwsGroup, async (e, v) => {
                // console.error('running the crawler')
                // after setup, we run the crawler
                await runCrawler(callback);
                console.error('crawler done');
              });
          });
        });
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
      const filePath = 'authors/' + global.moreStatus.sid;

      try {
        const raw = fs.readFileSync(filePath, 'utf8');

        const data = raw
          .split('\n')
          .map((word) => word.trim())
          .filter(Boolean);

        const res = [];
        for (const line of data) {
          const [author, title, year, lang, url] = line.split('|').map((s) => s.trim());

          const lineMap = {
            author,
            title,
            year,
            lang,
          };

          let flag = true;

          Object.entries(query).every(([key, value]) => {
            if (
              !lineMap[key] ||
              (lineMap[key] &&
                !lineMap[key].toLowerCase().includes(value.toLowerCase()))
            ) {
              flag = false;
            }
          });

          if (flag) {
            res.push(line);
          }
        }

        cb(null, res);
      } catch (err) {
        cb(err, null);
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
          trimmedLine = line.trim();
          if (trimmedLine === '') {
            rl.prompt();
            return;
          }

          const query = {};

          const parts = trimmedLine.split('|').map((part) => part.trim());

          parts.forEach((part) => {
            const [key, ...valueParts] = part.split(':');
            if (key && valueParts.length) {
              const value = valueParts.join(':').trim();
              query[key.trim().toLowerCase()] = value;
            }
          });

          const remote = {service: 'query', method: 'query'};
          distribution.mygroup.comm.send([query], remote, (e, v) => {
            const res = new Set();
            for (const node of Object.keys(v)) {
              for (const line of v[node]) {
                res.add(line);
              }
            }
            const result = Array.from(res);
            if (result.length === 0) {
              console.log('No results found');
            } else {
              for (const url of result) {
                console.log(url);
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
