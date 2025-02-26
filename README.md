# distribution

This is the distribution library. When loaded, distribution introduces functionality supporting the distributed execution of programs. To download it:

## Installation

```sh
$ npm i '@brown-ds/distribution'
```

This command downloads and installs the distribution library.

## Testing

There are several categories of tests:
  *	Regular Tests (`*.test.js`)
  *	Scenario Tests (`*.scenario.js`)
  *	Extra Credit Tests (`*.extra.test.js`)
  * Student Tests (`*.student.test.js`) - inside `test/test-student`

### Running Tests

By default, all regular tests are run. Use the options below to run different sets of tests:

1. Run all regular tests (default): `$ npm test` or `$ npm test -- -t`
2. Run scenario tests: `$ npm test -- -c` 
3. Run extra credit tests: `$ npm test -- -ec`
4. Run the `non-distribution` tests: `$ npm test -- -nd`
5. Combine options: `$ npm test -- -c -ec -nd -t`

## Usage

To import the library, be it in a JavaScript file or on the interactive console, run:

```js
let distribution = require("@brown-ds/distribution");
```

Now you have access to the full distribution library. You can start off by serializing some values. 

```js
let s = distribution.util.serialize(1); // '{"type":"number","value":"1"}'
let n = distribution.util.deserialize(s); // 1
```

You can inspect information about the current node (for example its `sid`) by running:

```js
distribution.local.status.get('sid', console.log); // 8cf1b
```

You can also store and retrieve values from the local memory:

```js
distribution.local.mem.put({name: 'nikos'}, 'key', console.log); // {name: 'nikos'}
distribution.local.mem.get('key', console.log); // {name: 'nikos'}
```

You can also spawn a new node:

```js
let node = { ip: '127.0.0.1', port: 8080 };
distribution.local.status.spawn(node, console.log);
```

Using the `distribution.all` set of services will allow you to act 
on the full set of nodes created as if they were a single one.

```js
distribution.all.status.get('sid', console.log); // { '8cf1b': '8cf1b', '8cf1c': '8cf1c' }
```

You can also send messages to other nodes:

```js
distribution.all.comm.send(['sid'], {node: node, service: 'status', method: 'get'}, console.log); // 8cf1c
```

# Results and Reflections

> # M1: Serialization / Deserialization


## Summary

> My implementation is within distribution/util/serializaiton.js file. I levereged switch statements and took the recursive approach to serialize objects/arrays, as well JSON.parsee and JSON.stringify. The main challange was definitely figuring out the circular reference part for the lab. I was trying to use a map from objects to IDs first, but then I came with a way to pass in the parent of the current recursive call, so that the map can be updated with it instead. 


My implementation comprises of 1software components, totaling around 150 lines of code. As mentioned, key challenges included figuring out the proper object map for circular references, and traversing the native functions (which was just a way of getting used to how it's done in JS).


## Correctness & Performance Characterization


> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote 5 tests; these tests take 0.736s to execute. This includes objects with all kinds of features that we want to serialize: objects, arrays, dates, errors, and permutations of basic types. I noticed that both my implementation and the provided library are struggling to serialize/deserialize an object with a named function within it, and I was wondering if this is intended.


*Performance*: The latency of various subsystems is described in the `"latency"` portion of package.json. Latency is measured in ms, since it is rather quick to serialize/deserialize an in-memory object. The characteristics of my development machines are summarized in the `"dev"` portion of package.json.



# M2: Actors and Remote Procedure Calls (RPC)


## Summary

> This milestone covered the get, route, and comm services, as well as createRPC function and some endpoint handling in node.js. The hardest part was honestly debugging, since in routing protocols, it is difficult to track when things go wrong (for example, I was missing a "/" in my path in send, and for about an hour could not understand why does nothing every gets anywhere)


My implementation comprises 5 software components, totaling around 300 lines of code. Key challenges included understanding the callback and event driven code structure, setting up communication between send and node.js, and creating the RPCstub. Some bugs were quite difficult to track, but conceptually, understanding callbacks and creating the stub were the most difficult parts. It felt like the lecture covered the stub pretty well, but I still struggled to put where does each part go. 


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness*: I wrote 5 required + 2 timed tests; these tests take from 1-2ms to execute on quick local functions to 40ms on an rpc call.


*Performance*: I characterized the performance of comm and RPC by sending 1000 service requests in a tight loop. Average throughput and latency is recorded in `package.json`. The latency is recorded in seconds, and throughput is in request/second.


## Key Feature

> How would you explain the implementation of `createRPC` to someone who has no background in computer science — i.e., with the minimum jargon possible?
Imagine that you have a friend who has a jar of cookies. Only he knows how many cookies are in that jar. Sometimes, you really wonder just how many cookies are in that jar, but you don't know. To tell you, your friend wrote down instructions on how to ask him and his phone number. Now, anytime you wonder, you call his phone and get his number of cookies, even if they change sometimes. 

# M3: Node Groups & Gossip Protocols

## Summary

> M3 summary

Milestone three covered the local group protocol as well as extensions to comm, get, and routes. The main focus was to be able to support groups of nodes, which is defined in the all protocol that uses context and function closures to properly function within each group. The key challanges included the extra credit portions as well as communicating the new error method (node to error) map, since even an empty object can apparantly pass the if (e) check. Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M3 (`hours`) and the lines of code per task.


My implementation comprises around 7 new software components, totaling ~500 added lines of code over the previous implementation. Key challenges included figuring out what does starting distribution.gid object means and how to populate it in groups put, solving bugs that occurred due to new modifications of local get/comm/routes/node, extra credit spawn and stop. I think the error handling might be better off to be an object for every milestone - I had a problem that since I started returning an empty node to error map, my code would think that there is some error and not propagate my actual values map. The other challanges were more conceptual. It is a bit unclear on whether we should use process.exit(), and if so, at what point (just after calling server.stop? do we need a timeout there?)


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness* -- I added my own 5 tests and worked on 4 scenarios, that all run in about 2s


*Performance* -- average spawn time for a node is around 120ms, while the gossip time for a group of 6 nodes took around 515 ms. 


## Key Feature

> What is the point of having a gossip protocol? Why doesn't a node just send the message to _all_ other nodes in its group?

The key feature of a gossip protocol is being very fast and scalable. It relies on a probabilistic guarantee that when a 
node group is large enough (n >> 100 from lecture), it is enough to just choose a log(n) number of nodes to share the "gossip" with.
Since every node chooses who to share the gossip with at some probability, the chances are very high for everyone to see the message 
without the need to overwhelm/slow down the network by just communicating with every node individually. 


# M4: Distributed Storage


## Summary

> Summarize your implementation, including key challenges you encountered

The main challanges of the milestone were, yet again, getting used to the asynchronous behaivor in javascript. While the 1380 part was relatively straightforward, with some difficulty regarding designing the file system storage, it only had relatively small bugs. 

After implementing Extra Credit, specifically the get part, I relied on concepts that did not work for event-driven programming. In particular, my function would enter an if case, where at the end, a return statement is called. However, that return statement was inside a callback, which is async. So, my function would exit out of the if statement, and since there was no explicit else, it would run other logic which would ruin the function. The biggest challange for me is still mastering event-driven paradigm and asynch behavior. 


Remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete each task of M4 (`hours`) and the lines of code per task.


## Correctness & Performance Characterization

> Describe how you characterized the correctness and performance of your implementation


*Correctness* -- calling npm test m4 runs in about 4.5s. In addition to the provided tests, I created my own 5 tests, that cover additional cases for hashing, store/mem interactions, and null get implementation. In addition, as per EC3, I created an extra test that sets up a group of nodes, and creates a "health check" with gossip.at. Then, after a certain time period, a node is remove from the group, and the "health check" function catches it and reconfigures the group. 


*Performance* -- as instructed, i created 3 aws instances, public IPs are which are recorded in the first (commented out) test in m4.student.test.js. After running 1000 random strings as keys and values, here are breakdowns for memory and store systems:

Memory:
- Generation time: 16.74 ms / 60000 gens/s
- Insertion time: 908.485 ms / 1100 insert/s
- Query time: 677.937 ms / 1475 query/s

Store:
- Generation time: 15.43 ms / 64800 gens/s
- Insertion time: 1112.35 ms / 890 insert/s
- Query time: 1044.99 ms / 956.9 query/s


## Key Feature

> Why is the `reconf` method designed to first identify all the keys to be relocated and then relocate individual objects instead of fetching all the objects immediately and then pushing them to their corresponding locations?

The key idea behind this design choice is to minimize the amount of objects that need to be relocated. If we fetched all of the objects first, rehash them, and reput them, we would be doing a lot of unnecessary work, since using something like consistent hashing is designed to minimize this. Instead, we are only working with a subset of key-value pairs that need to be relocated, which makes reconf faster and more efficient. 