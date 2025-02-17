const log = require('../util/log');

const status = {};

global.moreStatus = {
  sid: global.distribution.util.id.getSID(global.nodeConfig),
  nid: global.distribution.util.id.getNID(global.nodeConfig),
  counts: 0,
};

status.get = function(configuration, callback) {
  global.moreStatus.counts++;
  callback = callback || function() { };
  // TODO: more error checks?
  
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
};

status.stop = function(callback) {
};

module.exports = status;
