#!/usr/bin/env node

const distribution = require('./config.js');
const { execSync } = require('child_process');
const readline = require('readline');

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


// these are aws nodes from m4
// const n1 = {ip: "3.141.197.31", port: 1234};
// const n2 = {ip: "18.221.129.123", port: 1234};
// const n3 = {ip: "3.16.38.196", port: 1234};

const n1 = { ip: '127.0.0.1', port: 7110 };
const n2 = { ip: '127.0.0.1', port: 7111 };
const n3 = { ip: '127.0.0.1', port: 7112 };
const n4 = { ip: '127.0.0.1', port: 7113 };
const n5 = { ip: '127.0.0.1', port: 7114 };

// Part 1: run the crawler
async function runCrawler(replCb) {
  // mapper crawlsz
  const mapper = (key, value) => {
    // Using promises to handle the asynchronous operations
    return new Promise((resolve, reject) => {
      const cheerio = require('cheerio');
      const { fetch, Agent } = require('undici');


      async function fetchAndParse(url) {
        const httpsAgent = new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        });

        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const response = await fetch(url, { dispatcher: httpsAgent });
              if (!response.ok) {
                throw new Error(`Fetch failed with status: ${response.status}`);
              }

              const html = await response.text();
              const $ = cheerio.load(html);
              resolve($);
            } catch (error) {
              reject(error);
            }
          }, 50);
        });
      }

      distribution.visited.mem.get(key, (e, v) => {
        if (e instanceof Error) {
          distribution.visited.mem.put(value, key, (e, v) => {
            //console.log('new link : ' + v + '\n');
            if (e) {
              console.error('Error putting into visited:', e);
              resolve([]);
              return;
            }
            fetchAndParse(value)
              .then((doc) => {
                if (doc) {
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
                        //console.error(`Error processing URL: ${href}`, error);
                        return null;
                      }
                    })
                    .get() // This converts Cheerio's result into a regular array
                    .filter((link) => link !== null);

                  const result = links.map((link) => {
                    return { [id.getID(link)]: link };
                  });

                  resolve(result); // Resolve the promise with the final result
                }
                resolve([]);
              })
              .catch((err) => {
                //console.error('Error in operation:', err);
                resolve([]); // Resolve with empty array in case of error
              });
          });
        } else {
          resolve([]); // Resolve with empty array if key exists
        }
      });

    });
  };

  // reducer finds new text files to crawl, or updates global index
  const reducer = (key, values) => {
    return new Promise((resolve, reject) => {
      const link = values[0];

      if (!link.endsWith('txt')) {
        // case 1: this is a redirect link
        const retObj = { [key]: link };

        resolve(retObj);
        return;
      }

      // console.log("text link: " + link + "\n");

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
          local.set(term, { url, freq });
        }

        for (const line of globalIndexLines) {
          const lineSplit = line.split('|').map((part) => part.trim());
          const pairSplit = lineSplit[1].split(' ').map((part) => part.trim());
          const term = lineSplit[0];
          const urlfs = [];
          // can use a flatmap here, but kind of an overkill
          for (let i = 0; i < pairSplit.length; i += 2) {
            urlfs.push({ url: pairSplit[i], freq: Number(pairSplit[i + 1]) });
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
        // data: the first 1000 characters of the html/text file
        // prettier-ignore
        const stopSet = new Set(
          fs
            .readFileSync('./non-distribution/d/stopwords.txt', 'utf8')
            .split('\n')
            .map((word) => word.trim())
            .filter(Boolean),
        );

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

        if (!fs.existsSync(globalBasePath)) {
          fs.mkdirSync(globalBasePath);
        }

        if (!fs.existsSync(globalFile)) {
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

      const { fetch, Agent } = require('undici');

      // prettier-ignore
      async function fetchTxt(url) {
        const httpsAgent = new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        });


        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const response = await fetch(url, {
                headers: { 'Range': 'bytes=0-999' },
                dispatcher: httpsAgent,
              });

              if (!response.ok) {
                throw new Error(`Fetch failed with status: ${response.status}`);
              }

              const text = await response.text();
              resolve(text);
            } catch (error) {
              reject(error);
            }
          }, 50);
        });
      }

      // TODO: only work on the link if you have not seen it before.
      distribution.visited.mem.get(key, (e, v) => {
        if (e instanceof Error) {
          distribution.visited.mem.put(link, key, (e, v) => {
            // console.log(v);
            fetchTxt(link).then((html) => {
              const trimmedLength = Math.min(1000, html.length);
              const trimmedHtml = html.substring(0, trimmedLength);
              processDocument(trimmedHtml, link);
              resolve({});
            }).catch((err) => {
              //console.error('Error in operation:', err);
              resolve({}); // Resolve with empty array in case of error
            });;
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

  const dataset = [{ [startHash]: start }];

  const dataset1 = [
    {
      '9e13a3e4b87ad2d22ecdfe2f00a2bf93ac9d34488b5a1219e8976d388ad55e45':
        'https://atlas.cs.brown.edu/data/gutenberg/0/5/',
    },
  ];

  const doMapReduce = (cb) => {
    distribution.mygroup.store.get(null, (e, v) => {
      distribution.mygroup.mr.exec(
        { keys: v, map: mapper, reduce: reducer, rounds: 3 },
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

    const mygroupConfig = { gid: 'mygroup' };
    const myVisitedConfig = { gid: 'visited' };

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
  const remote = { service: 'status', method: 'stop' };
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
  try {
    execSync('./kill_nodes.sh', { stdio: 'inherit' });
  } catch (error) {
    console.log('Cleanup completed');
  }

  // after nodes are but up and the crawler has ran, we want to start up
  // the cli
  startNodes(() => {
    const queryService = {};
    queryService.query = (queryData, cb) => {
      const fs = require('fs');
      // console.log('SID:', global.moreStatus.sid);

      const filePath = 'authors/' + global.moreStatus.sid;
      // console.log('Reading file at:', filePath);

      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        // console.log('Raw file content:', raw);

        const data = raw
          .split('\n')
          .map((word) => word.trim())
          .filter(Boolean);


        // console.log('Processed data:', data);
        // const stemmer = require('natural').PorterStemmer;
        // const stemmedQuery = stemmer.stem(query);


        // First pass: exact matches
        const exactMatches = performSearch(data, queryData);

        // If we found exact matches, return them
        if (exactMatches.length > 0) {
          cb(null, exactMatches);
          return;
        }

        // Second pass: typos
        const typoResults = [];
        const possibleCorrections = findPossibleCorrections(data, queryData);

        // Search again
        Object.entries(possibleCorrections).forEach(([key, suggestions]) => {
          suggestions.forEach(suggestion => {
            // Create a modified query with the suggestion
            const modifiedQuery = { ...queryData };
            modifiedQuery[key] = suggestion.value;

            // Search with the modified query
            const results = performSearch(data, modifiedQuery);
            if (results.length > 0) {
              // Add suggestion info to the beginning of each result
              const suggestedResults = results.map(result =>
                `Suggested "${suggestion.value}" for "${queryData[key]}" | ${result}`
              );
              typoResults.push(...suggestedResults);
            }
          });
        });

        if (typoResults.length > 0) {
          cb(null, typoResults);
          return;
        }

        // No matches and no typo suggestions
        cb(null, []);
      } catch (err) {
        cb(err);
      }

      // Possible corrections for typos
      function findPossibleCorrections(data, query) {
        const corrections = {};
        const possibleValues = {
          author: new Set(),
          title: new Set(),
          year: new Set(),
          lang: new Set()
        };

        for (const line of data) {
          const [author, title, year, lang] = line.split('|').map(s => s.trim());
          if (author) possibleValues.author.add(author.toLowerCase());
          if (title) possibleValues.title.add(title.toLowerCase());
          if (year) possibleValues.year.add(year.toLowerCase());
          if (lang) possibleValues.lang.add(lang.toLowerCase());
        }

        Object.entries(query).forEach(([key, value]) => {
          if (possibleValues[key] && value) {
            const valueLower = value.toLowerCase();
            const suggestions = [];

            for (const possibleValue of possibleValues[key]) {
              const distance = levenshteinDistance(valueLower, possibleValue);
              // Bunch of math from the internet
              const threshold = Math.max(2, Math.floor(valueLower.length / 3));
              if (distance <= threshold) {
                suggestions.push({
                  value: possibleValue,
                  distance: distance
                });
              }
            }

            // Sort by distance and limit results
            if (suggestions.length > 0) {
              corrections[key] = suggestions
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3); // Limit to top 3 suggestions. Changeable
            }
          }
        });

        return corrections;
      }

      function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + cost
            );
          }
        }

        return matrix[b.length][a.length];
      }

      // Helper function to perform the actual search (Matthias' code is here)
      function performSearch(data, query) {
        const res = [];
        for (const line of data) {
          const [author, title, year, lang, url] = line
            .split('|')
            .map((s) => s.trim());

          const lineMap = {
            author,
            title,
            year,
            lang,
          };

          let flag = true;

          Object.entries(query).every(([key, value]) => {
            // console.log('linemap', lineMap);
            // console.log('key', key, value);
            // console.log(lineMap[key]);
            if (
              !lineMap[key] ||
              (lineMap[key] &&
                !lineMap[key].toLowerCase().includes(value.toLowerCase()))
            ) {
              flag = false;
            }
            return true;
          });

          if (flag) {
            // console.log(line);
            res.push(line);
          }
          // const terms = line.split('|').map((part) => part.trim());
          // for (const part of query) {
          // }
          // if (term.includes(query)) {
          //   res.push(line);
          // }
        }
        return res;
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
        const trimmedLine = line.trim();

        // This is where we would run our serach queries
        // const result = eval(line);
        // // Print the result
        // console.log(result);

        // Handle empty input - just reprompt
        if (trimmedLine === '') {
          rl.prompt();
          return;
        }

        // Output everything
        if (trimmedLine === 'showall') {
          const remote = { service: 'query', method: 'query' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            const res = new Set();
            for (const node of Object.keys(v)) {
              for (const line of v[node]) {
                res.add(line);
              }
            }
            const result = Array.from(res);
            if (result.length === 0) {
              console.log('No results found in database.');
            } else {
              console.log(`Showing all ${result.length} entries:`);
              for (const url of result) {
                console.log(url);
              }
            }
            rl.prompt();
          });
          return;
        }

        try {
          // Parse the query input
          const query = {};
          const parts = trimmedLine.split('|').map(part => part.trim());
          let validQuery = false;

          parts.forEach(part => {
            const [key, ...valueParts] = part.split(':');
            if (key && valueParts.length) {
              const value = valueParts.join(':').trim();
              const normalizedKey = key.trim().toLowerCase();

              // Check if the key is valid
              if (['author', 'title', 'year', 'lang'].includes(normalizedKey)) {
                query[normalizedKey] = value;
                validQuery = true;
              }
            }
          });

          // If no valid parts reprompt
          if (!validQuery) {
            console.log('Invalid query format. Please use one of these formats:');
            console.log('  author: name | title: book title | year: yyyy | lang: language');
            console.log('Type "showall" to see all entries in the database.');
            rl.prompt();
            return;
          }

          // Proceed with valid query
          const remote = { service: 'query', method: 'query' };
          distribution.mygroup.comm.send([query], remote, (e, v) => {
            const res = new Set();
            for (const node of Object.keys(v)) {
              for (const line of v[node]) {
                res.add(line);
              }
            }
            const result = Array.from(res);
            if (result.length === 0) {
              console.log('No results found. Try checking your spelling.');
            } else {
              console.log(`Found ${result.length} results:`);
              for (const url of result) {
                console.log(url);
              }
            }
            rl.prompt();
          });
        } catch (err) {
          console.error('Error processing query:', err.message);
          rl.prompt();
        }
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