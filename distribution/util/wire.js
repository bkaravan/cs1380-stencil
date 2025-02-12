const log = require('../util/log');
const id = require('../util/id');
const ser = require('../util/serialization');
const comm = require('../local/comm');

// serialize arguments and send them to the node where f resides,
// call f on that node, passing the deserialized arguments to f upon call,
// serialize the return value and send it back to the node issuing the call to g, and
// pass the results to g's caller.

global.toLocal = new Map();

function createRPC(func) {
  // Write some code...

  // put func to a map with some id/name
  const funcName = id.getID(ser.serialize(func));
  global.toLocal.set(funcName, {call: func});
  // send this to whoever asked
  function stub(...args) {
    let cb = args.pop() || function() {};

    let r = {
      node: `${ser.serialize(global.nodeConfig)}`,
      service: `${funcName}`,
      method: "call", //rpc.call?
    }

    // r.node.replace("_NODE_INFO_", JSON.stringify(global.nodeConfig));
    // r.service.replace("_SERVICE_", funcName);
    //console.log(r);

    // send this to whoever is asking, puttting THIS NODE's info
    comm.send(args, r, (e, v) => {
      if (e) {
        cb(e);
      } else {
        cb(null, v);
      }
    });
  }

  return stub
}

/*
  The toAsync function transforms a synchronous function that returns a value into an asynchronous one,
  which accepts a callback as its final argument and passes the value to the callback.
*/
function toAsync(func) {
  log(`Converting function to async: ${func.name}: ${func.toString().replace(/\n/g, '|')}`);

  // It's the caller's responsibility to provide a callback
  const asyncFunc = (...args) => {
    const callback = args.pop();
    try {
      const result = func(...args);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  };

  /* Overwrite toString to return the original function's code.
   Otherwise, all functions passed through toAsync would have the same id. */
  asyncFunc.toString = () => func.toString();
  return asyncFunc;
}

module.exports = {
  createRPC: createRPC,
  toAsync: toAsync,
};
