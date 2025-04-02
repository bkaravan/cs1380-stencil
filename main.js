#!/usr/bin/env node

const distribution = require('./config.js');
const readline = require('readline');
//const fetch = require('node-fetch');
const https = require('https');

const { JSDOM } = require('jsdom'); 

// Create the readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// globals
const id = distribution.util.id;
let localServer = null;
const myAwsGroup = {}

const n0 = {ip: '127.0.0.1', port: 10000};
// these are aws nodes from m4
// const n1 = {ip: "3.141.197.31", port: 1234};
// const n2 = {ip: "18.221.129.123", port: 1234};
// const n3 = {ip: "3.16.38.196", port: 1234};

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};


// Part 1: run the crawler
async function runCrawler(replCb) {
  
  const mapper = (key, value) => {
    // First, install deasync: npm install deasync
    const deasync = require('deasync');
    
    let result = null;
    let done = false;
    
    async function fetchAndParse(url) {
      try {
        // Fetch the HTML content
        const html = await new Promise((resolve, reject) => {
          const httpsAgent = new https.Agent({
            rejectUnauthorized: false // This is the key setting that ignores certificate validation
          });
          const req = https.get(url, { 
            agent: httpsAgent 
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              resolve(data);
            });
          });
          
          req.on('error', (error) => {
            console.log(error);
            reject(error);
          });
          
          req.end();
        });
        

        const dom = new JSDOM(html);
        return dom.window.document;
      } catch (error) {
        console.error('Error fetching or parsing the page:', error);
        throw error;
      }
    }
    
    
    // Start the async operation
    fetchAndParse(value).then(doc => {
      
      const baseUrl = value;
      const bannedLinks = new Set(['?C=N;O=D', '?C=M;O=A', '?C=S;O=A', '?C=D;O=A', 'books.txt','donate-howto.txt', 'indextree.txt', 'retired/', '/data/']);

      const links = [...doc.querySelectorAll('a')].map(a => {
        try {
          // Create absolute URLs from relative ones using the URL constructor
          if (bannedLinks.has(a.href)) {
            return null;
          }
          const absoluteUrl = new URL(a.href, baseUrl).href;
          //console.log(absoluteUrl);
          return absoluteUrl;
        } catch (error) {
          console.error(`Error processing URL: ${a.href}`, error);
          return null;
        }
      })
      .filter(link => link !== null)
      
      result = links.map(link => { return {[id.getID(link)]: link} });
      done = true;
    }).catch(err => {
      console.error('Error in operation:', err);
      result = [];
      done = true;
    });
    
    // This will block until the async operation completes
    deasync.loopWhile(() => !done);
    console.log('Sync operation complete');
    return result;
  };

  const reducer = (key, values) => {
    // we want to cover two cases here:
    // console.log(key);
    // console.log(values);

    const link = values[0]

    if (link.endsWith("txt")) {
      // case 1: this is a txt link, so we need to do the text logic
      console.log("got to the text part with : " + link + "\n");
    } else {
      // case 2: this is a redirect link
      // this is now done in map
      // const docDom = await fetchAndParse(key);
      // console.log('here\n');
      const retObj = {[key]: [link]};
      return retObj;
    }
  };

  const start = 'https://atlas.cs.brown.edu/data/gutenberg/';

  //const startDoc = await fetchAndParse(start);

  // console.log(startDoc);

  const startHash = id.getID(start);


  const dataset = [
    {[startHash]: start},
  ];


  const doMapReduce = (cb) => {
    distribution.mygroup.store.get(null, (e, v) => {

      distribution.mygroup.mr.exec({keys: v, map: mapper, reduce: reducer, rounds: 1}, (e, v) => {
        console.log(v);
        console.log(e);
        replCb();
      });
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
};

// Part 0: node setup and shutdown

function startNodes(cb) {
    // run crawler should be run here

    myAwsGroup[id.getSID(n0)] = n0;
    myAwsGroup[id.getSID(n1)] = n1;
    myAwsGroup[id.getSID(n2)] = n2;
    myAwsGroup[id.getSID(n3)] = n3;


    // if we do aws, we don't need this (in case of manual start up)
    const startNodes = (cb) => {
        distribution.local.status.spawn(n1, (e, v) => {
          distribution.local.status.spawn(n2, (e, v) => {
            distribution.local.status.spawn(n3, (e, v) => {
              cb();
            });
          });
        });
      };
  
    distribution.node.start((server) => {
        localServer = server;

        const mygroupConfig = {gid: 'mygroup'};

        startNodes(() => {
        // This starts up our group
        distribution.local.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
            distribution.mygroup.groups
                .put(mygroupConfig, myAwsGroup, async (e, v) => {
                    // after setup, we run the crawler
                    await runCrawler(cb);
                })
            });
        })
    })
}

function stopNodes() {
    const remote = {service: 'status', method: 'stop'};
    remote.node = n1;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n2;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n3;
        distribution.local.comm.send([], remote, (e, v) => {
            // usually, this would be handled by junit with done() 
            // hopefully, it can run fine just as a node function as well
            localServer.close();
        });
      });
    });
  };


// Part 2: repl the queries
function main() {
    // after nodes are but up and the crawler has ran, we want to start up 
    // the cli
    startNodes(() => {
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
            // This is where we would run our queries
            const result = eval(line);
            // Print the result
            console.log(result);
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
    })
}

main();
  