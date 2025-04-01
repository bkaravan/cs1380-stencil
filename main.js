#!/usr/bin/env node

const distribution = require('./config.js');
const readline = require('readline');

// Create the readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// globals
const id = distribution.util.id;
let localServer = null;

const n0 = {ip: '127.0.0.1', port: 10000};
// const n1 = {ip: "3.141.197.31", port: 1234};
// const n2 = {ip: "18.221.129.123", port: 1234};
// const n3 = {ip: "3.16.38.196", port: 1234};

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

const myAwsGroup = {}

// Part 1: run the crawler
function runCrawler(cb) {
  // these are the nodes from AWS in m4
  console.log("got to the crawler\n");
  setTimeout(() => {
    console.log("crawled some stuff\n")
    cb();
  }, 1000)
};

// Part 0: node setup and shutdown

function startNodes(cb) {
    // run crawler should be run here

    myAwsGroup[id.getSID(n0)] = n0;
    myAwsGroup[id.getSID(n1)] = n1;
    myAwsGroup[id.getSID(n2)] = n2;
    myAwsGroup[id.getSID(n3)] = n3;

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
    })

    const mygroupConfig = {gid: 'mygroup'};

    startNodes(() => {
    // This starts up our group
    distribution.local.groups.put(mygroupConfig, myAwsGroup, (e, v) => {
        distribution.mygroup.groups
            .put(mygroupConfig, myAwsGroup, (e, v) => {
                // after setup, we run the crawler
                runCrawler(cb);
            })
        });
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
  