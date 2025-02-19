const log = require('../util/log');
const { spawn } = require('child_process');
const wire = require('../util/wire');
const path = require('path');

const status = {};

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
};

status.get = function(configuration, callback) {
  global.moreStatus.counts++;
  callback = callback || function() { };
  
  let e = null;
  let v = null;

  if (!configuration) {
    e = new Error("Missing configuration")
  } else {
    switch (configuration) {
      case "nid": 
      v = global.moreStatus.nid;
      break;
      case "sid": v = global.moreStatus.sid;
      break;
      case "ip": v =  global.nodeConfig.ip;
      break;
      case "port": v =  global.nodeConfig.port;
      break;
      case "counts": v =  global.moreStatus.counts;
      break;
      case "heapTotal": v =  process.memoryUsage().heapTotal;
      break;
      case "heapUsed": v =  process.memoryUsage().heapUsed;
      break;
      default: e = new Error("unsupported config param");
    }
  }

  callback(e, v);
};


status.spawn = function(configuration, callback) {

  configuration.onStart = configuration.onStart || function() {};

  if (!configuration.port || !configuration.ip) {
    callback(new Error("missing ip or port in configuration"), null);
    return;
  }

  let RPCcb = wire.createRPC(wire.toAsync(callback));
  
  function g(local, rpc) {
    const functionBody = `
      let local = ${local.toString()};
      let rpc = ${rpc.toString()};

      try {
      local();
      rpc(null, global.nodeConfig, () => {});
      } catch(e) {
        rpc(e, null, () => {}); 
      } 
    `
    return new Function(functionBody);
  }

  const comboOnStart = g(configuration.onStart, RPCcb);

  configuration.onStart = comboOnStart;

  // hopefully this gets us to distribution executable
  const distributionPath = path.join(__dirname, '../../distribution.js');

  spawn('node', [distributionPath, "--config", global.distribution.util.serialize(configuration)], {
    detached : true, stdio : "inherit"
  });

};

status.stop = function(callback) {
  callback = callback || function() {};
  callback(null, global.nodeConfig);
  global.distribution.node.server.close();
  process.exit(0);
};

module.exports = status;
