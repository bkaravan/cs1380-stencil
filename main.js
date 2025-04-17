#!/usr/bin/env node

const distribution = require('./config.js');
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
// let debugNodeIds = {};
let localDelId = null;


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
                else { resolve([]) };
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

  // Alex: Lower rounds cause its breaking on yours lol
  const doMapReduce = (cb) => {
    distribution.mygroup.store.get(null, (e, v) => {
      distribution.mygroup.mr.exec(
        { keys: v, map: mapper, reduce: reducer, rounds: 5 },
        (e, v) => {
          if (e) console.error('MapReduce error:', e);

          // console.error('calling the repl callback')
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

  const debuggingService = {};
  // TODO: collect ids and terminate ideally
  debuggingService.debug = (debugConfig, debugCb) => {
    const fs = require('fs');
    const path = require('path');
    const basePath = path.join(
      path.dirname(path.resolve('main.js')),
      'debugging',
    );
    function debugLogic(config) {
      // change it to be an object
      statusConfig = 'heapTotal';
      statusConfig2 = 'heapUsed';
      distribution.local.status.get(statusConfig, (e, v) => {
        const heapTotal = v;
        distribution.local.status.get(statusConfig2, (e, v) => {
          const heapUsed = v;
          const resources = process.getActiveResourcesInfo().toString();
          const debugFile = path.join(basePath, global.moreStatus.sid)

          fs.appendFileSync(debugFile, `heapTotal: ${heapTotal} | heapUsed: ${heapUsed} | resources: ${resources}\n`, 'utf8');
        });
      });
    }

    if (!fs.existsSync(basePath)) {
      // console.log("doesn't exist: " + basePath);
      fs.mkdirSync(basePath);
    }

    // console.log('Debugging service started');
    distribution.mygroup.gossip.at(5000, () => debugLogic(debugConfig), (e, v) => {
      localDelId = v;
      debugCb(e, v);
    });
  }

  debuggingService.log = (infoConfig, infoCb) => {
    const fs = require('fs');
    const path = require('path');
    const basePath = path.join(
      path.dirname(path.resolve('main.js')),
      'debugging',
    );
    const debugFile = path.join(basePath, global.moreStatus.sid)

    const debugData = fs.readFileSync(debugFile, 'utf-8');

    // console.log('after file reading');

    const lines = debugData.trim().split("\n");

    const info = lines.slice(-10).join("\n");

    infoCb(null, info);
  }

  debuggingService.stop = (stopConfig, stopCb) => {
    // const myID = stopConfig[global.moreStatus.sid];
    // console.log(myID)

    distribution.mygroup.gossip.del(localDelId, (e, v) => {
      stopCb(e, v);
    })
  }

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

    const mygroupConfig = { gid: 'mygroup' };
    const myVisitedConfig = { gid: 'visited' };

    spawnNodes(() => {
      const fs = require('fs');
      // This starts up our group
      // prettier-ignore
      distribution.local.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
        distribution.mygroup.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
          distribution.local.groups.put(myVisitedConfig, myAwsGroup, (e, v) => {
            distribution.visited.groups.put(myVisitedConfig, myAwsGroup, (e, v) => {
              // duplicating code but it should work later on aws
              const path = require('path');
              const basePath = path.join(
                path.dirname(path.resolve('main.js')),
                'debugging',
              );

              if (!fs.existsSync(basePath)) {
                // console.log("doesn't exist: " + basePath);
                fs.mkdirSync(basePath);
              }

              distribution.mygroup.routes.put(debuggingService, 'debugging', (e, v) => {
                distribution.mygroup.comm.send([{}], { service: 'debugging', method: 'debug' }, async (e, v) => {
                  // after setup, we run the crawler
                  // we can use this to call del later! 
                  //debugNodeIds = v; 
                  await runCrawler(cb);
                });
              });
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
  function cleanup() {
    const { execFileSync } = require('child_process');
    try {
      execFileSync('./kill_nodes.sh', { encoding: 'utf8', stdio: 'inherit' });
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
    console.log('Cleanup completed');
  }

  cleanup();
  // after nodes are but up and the crawler has ran, we want to start up
  // the cli
  // after nodes are up and the crawler has run, we want to start up the cli
  startNodes(() => {
    // console.error('Nodes started and crawler')
    const queryService = {};
    queryService.query = (queryData, cb) => {
      const fs = require('fs');

      // Check if this is a hyperspace query
      if (queryData.hyper) {
        // Hyperspace search implementation
        try {
          const filePath = 'authors/' + global.moreStatus.sid;
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = raw
            .split('\n')
            .map((word) => word.trim())
            .filter(Boolean);

          // Hyperspace search logic
          const results = performHyperspaceSearch(data, queryData);
          cb(null, results);
        } catch (err) {
          cb(err);
        }
        return;
      }

      // Standard search
      const filePath = 'authors/' + global.moreStatus.sid;

      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = raw
          .split('\n')
          .map((word) => word.trim())
          .filter(Boolean);

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
          suggestions.forEach((suggestion) => {
            const modifiedQuery = { ...queryData };
            modifiedQuery[key] = suggestion.value;
            const results = performSearch(data, modifiedQuery);
            if (results.length > 0) {
              const suggestedResults = results.map(
                (result) =>
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

        cb(null, []);
      } catch (err) {
        cb(err);
      }

      function performHyperspaceSearch(data, query) {
        // Hyperspace hashing implementation using LSH
        // Remove the hyper flag from the query object for processing
        const { hyper, ...searchTerms } = query;

        // Generate feature vectors for the search terms
        const queryFeatures = generateFeatureVector(searchTerms);
        const results = [];

        // For each book in the database
        for (const line of data) {
          const [author, title, year, lang, url] = line
            .split('|')
            .map((s) => s.trim());

          const bookFeatures = generateFeatureVector({
            author,
            title,
            year,
            lang
          });

          // Calculate similarity between query and book
          const similarity = calculateSimilarity(queryFeatures, bookFeatures);

          // Use threshold to determine matches
          // Higher threshold = more precise results, but potentially fewer matches
          // Still might need some tweaking
          const threshold = 0.6;
          if (similarity >= threshold) {
            results.push(`[Similarity: ${similarity.toFixed(2)}] ${line}`);
          }
        }

        // Sort results by similarity (descending)
        results.sort((a, b) => {
          const simA = parseFloat(a.match(/\[Similarity: ([\d.]+)\]/)[1]);
          const simB = parseFloat(b.match(/\[Similarity: ([\d.]+)\]/)[1]);
          return simB - simA;
        });

        // Return top results (limit to 20 if too many, could be tweaked)
        return results.length > 20 ? results.slice(0, 20) : results;
      }

      function generateFeatureVector(item) {
        // This function creates a feature vector from book attributes
        // The vector will be used to determine similarity between books
        const features = {
          authorTokens: new Set(),
          titleTokens: new Set(),
          yearTokens: new Set(),
          langTokens: new Set()
        };

        if (item.author) {
          const authorTokens = item.author.toLowerCase().split(/\s+/);
          authorTokens.forEach(token => {
            if (token.length > 1) features.authorTokens.add(token);
          });
        }

        if (item.title) {
          const titleTokens = item.title.toLowerCase().split(/\s+/);
          titleTokens.forEach(token => {
            if (token.length > 1) features.titleTokens.add(token);
          });
        }

        // Year is a single token
        if (item.year) {
          features.yearTokens.add(item.year.toLowerCase());
        }

        // Language is a single token
        if (item.lang) {
          features.langTokens.add(item.lang.toLowerCase());
        }

        return features;
      }

      function calculateSimilarity(queryFeatures, bookFeatures) {
        // Calculate Jaccard similarity for each feature type
        const authorSimilarity = calculateJaccardSimilarity(
          queryFeatures.authorTokens,
          bookFeatures.authorTokens
        );

        const titleSimilarity = calculateJaccardSimilarity(
          queryFeatures.titleTokens,
          bookFeatures.titleTokens
        );

        const yearSimilarity = calculateJaccardSimilarity(
          queryFeatures.yearTokens,
          bookFeatures.yearTokens
        );

        const langSimilarity = calculateJaccardSimilarity(
          queryFeatures.langTokens,
          bookFeatures.langTokens
        );

        // Weight the similarities based on importance
        // Adjust these weights as needed
        const weights = {
          author: queryFeatures.authorTokens.size > 0 ? 0.4 : 0,
          title: queryFeatures.titleTokens.size > 0 ? 0.4 : 0,
          year: queryFeatures.yearTokens.size > 0 ? 0.1 : 0,
          lang: queryFeatures.langTokens.size > 0 ? 0.1 : 0
        };

        // Normalize weights to sum to 1
        const totalWeight = weights.author + weights.title + weights.year + weights.lang;
        if (totalWeight === 0) return 0; // No features to compare

        const normalizedWeights = {
          author: weights.author / totalWeight,
          title: weights.title / totalWeight,
          year: weights.year / totalWeight,
          lang: weights.lang / totalWeight
        };

        // Calculate weighted similarity
        const weightedSimilarity =
          authorSimilarity * normalizedWeights.author +
          titleSimilarity * normalizedWeights.title +
          yearSimilarity * normalizedWeights.year +
          langSimilarity * normalizedWeights.lang;

        return weightedSimilarity;
      }

      function calculateJaccardSimilarity(set1, set2) {
        // If either set is empty, return 0 if both empty, or 0 if one is empty and the other isn't
        if (set1.size === 0 && set2.size === 0) return 1;
        if (set1.size === 0 || set2.size === 0) return 0;

        // Calculate intersection
        const intersection = new Set();
        for (const item of set1) {
          if (set2.has(item)) {
            intersection.add(item);
          }
        }

        // Calculate union
        const union = new Set([...set1, ...set2]);

        // Jaccard similarity = size of intersection / size of union
        return intersection.size / union.size;
      }

      function findPossibleCorrections(data, query) {
        const corrections = {};
        const possibleValues = {
          author: new Set(),
          title: new Set(),
          year: new Set(),
          lang: new Set(),
        };

        for (const line of data) {
          const [author, title, year, lang] = line
            .split('|')
            .map((s) => s.trim());
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
              const threshold = Math.max(2, Math.floor(valueLower.length / 3));
              if (distance <= threshold) {
                suggestions.push({
                  value: possibleValue,
                  distance: distance,
                });
              }
            }

            if (suggestions.length > 0) {
              corrections[key] = suggestions
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3);
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
            res.push(line);
          }
        }
        return res;
      }
    };

    // console.error('right before putting query service')
    distribution.mygroup.routes.put(queryService, 'query', (e, v) => {
      // header must be a string
      function helpInfo(header = null) {
        const headerLine = header ? header : 'Available commands:';

        console.log(headerLine);
        console.log('  author: name | title: book title | year: yyyy | lang: language');
        console.log('  show-all - Show all entries in the database');
        console.log('  debug-log - Show most recent nodes\' debug information');
        console.log('  debug-start - Start debug logging of the nodes');
        console.log(
          '  hyper: author: name | title: book title | year: yyyy | lang: language'
        );
        console.log('  debug-stop - Stop debug logging of the nodes');
      }

      let debugOn = true;
      // Startup message
      console.log('Welcome to a Distributed Book Search\n');
      rl.prompt();

      rl.on('line', (line) => {
        if (line.trim() === 'quit') {
          rl.close();
          stopNodes();
          return;
        }

        // to lower case for easier matching
        const trimmedLine = line.toLowerCase().trim();

        if (trimmedLine === '') {
          rl.prompt();
          return;
        }

        if (trimmedLine === 'help') {
          helpInfo();
          rl.prompt();
          return;
        }

        // Output everything
        if (trimmedLine === 'show-all') {
          console.log('Showing all entries in the database:');
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


        if (trimmedLine === 'debug-log') {
          console.log('Showing most recent nodes\' debug information:');
          const remote = { service: 'debugging', method: 'log' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            console.log('Most recent nodes information:');
            console.log(e);
            console.log(v);
            rl.prompt();
          });
          return;
        }

        if (trimmedLine === 'debug-start') {
          if (debugOn) {
            console.log('Debugging is already on. Use debug-stop to turn it off.');
            rl.prompt();
            return;
          }
          console.log('Starting debug logging of nodes:');
          const remote = { service: 'debugging', method: 'debug' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            // console.log(e);
            // console.log(v);
            rl.prompt();
          });

          debugOn = true;
          return;
        }

        if (trimmedLine === 'debug-stop') {
          if (!debugOn) {
            console.log('Debugging is already off. Use debug-start to turn it on.');
            rl.prompt();
            return;
          }
          console.log('Stopping debug logging of nodes:');
          const remote = { service: 'debugging', method: 'stop' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            // console.log(e);
            // console.log(v);
            rl.prompt();
          });

          debugOn = false;
          return;
        }

        if (trimmedLine === 'debug-log') {
          console.log('Showing most recent nodes\' debug information:');
          const remote = { service: 'debugging', method: 'log' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            console.log('Most recent nodes information:');
            console.log(e);
            console.log(v);
            rl.prompt();
          });
          return;
        }

        if (trimmedLine === 'debug-start') {
          if (debugOn) {
            console.log('Debugging is already on. Use debug-stop to turn it off.');
            rl.prompt();
            return;
          }
          console.log('Starting debug logging of nodes:');
          const remote = { service: 'debugging', method: 'debug' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            // console.log(e);
            // console.log(v);
            rl.prompt();
          });

          debugOn = true;
          return;
        }

        if (trimmedLine === 'debug-stop') {
          if (!debugOn) {
            console.log('Debugging is already off. Use debug-start to turn it on.');
            rl.prompt();
            return;
          }
          console.log('Stopping debug logging of nodes:');
          const remote = { service: 'debugging', method: 'stop' };
          distribution.mygroup.comm.send([{}], remote, (e, v) => {
            // console.log(e);
            // console.log(v);
            rl.prompt();
          });

          debugOn = false;
          return;
        }

        if (trimmedLine === 'help') {
          console.log('\nBook Search Help');
          console.log('---------------');
          console.log(
            'Standard search: author: name | title: book title | year: yyyy | lang: language'
          );
          console.log(
            'Hyperspace search: hyper: author: name | title: book title | year: yyyy | lang: language'
          );
          console.log('Show all entries: showall');
          console.log('Exit: quit\n');
          rl.prompt();
          return;
        }

        try {
          const hyperPrefix = 'hyper:';
          let useHyperspace = false;
          let queryString = trimmedLine;

          if (trimmedLine.toLowerCase().startsWith(hyperPrefix)) {
            useHyperspace = true;
            queryString = trimmedLine.substring(hyperPrefix.length).trim();
            console.log('Hyperspace flag set:', useHyperspace);
          }

          const query = {};
          const parts = queryString.split('|').map((part) => part.trim());
          let validQuery = false;

          // Set hyper flag first, so it’s not overwritten
          if (useHyperspace) {
            query.hyper = true;
          }

          parts.forEach((part) => {
            const [key, ...valueParts] = part.split(':');
            if (key && valueParts.length) {
              const value = valueParts.join(':').trim();
              const normalizedKey = key.trim().toLowerCase();
              if (['author', 'title', 'year', 'lang'].includes(normalizedKey)) {
                query[normalizedKey] = value;
                validQuery = true;
              }
            }
          });

          if (!validQuery) {
            helpInfo('Invalid query format. Please use one of these formats:');
            rl.prompt();
            return;
          }

          console.log('Query:', query); // Log full query object

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