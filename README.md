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
