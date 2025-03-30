
const {id} = require('../util/util');
const comm = require('./comm');

const status = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    get: (configuration, callback) => {
      const aggregatables = ['counts', 'heapTotal', 'heapUsed'];
      const message = [configuration];
      const remote = {service: 'status', method: 'get'};
      const aggregated = 0;
      let sum = 0;
      comm(context).send(message, remote, (e, v) => {
        if (aggregatables.includes(configuration)) {
          // not sure if this will add correctly but it should
          // console.log('inside here');
          // console.log("\n");
          sum = Object.values(v).reduce(
              (accumulator, currentValue) => accumulator + currentValue, aggregated,
          );
          callback(e, sum);
          return;
        }
        callback(e, v);
      });
    },

    spawn: (configuration, callback) => {
      global.distribution.local.status.spawn(configuration, (error, nodeInfo) => {
        if (error) {
          callback(error);
        } else {
          global.distribution.local.groups.add(context.gid, configuration, () => {
            callback(null, nodeInfo);
          });
          const remote = {service: 'groups', method: 'add'};
          comm(context).send([context.gid, configuration], remote, () => {});
        }
      });
    },

    stop: (callback) => {
      const remote = {service: 'status', method: 'stop'};
      comm(context).send([], remote, (e, v) => {
        callback(null, global.nodeConfig);
        global.distribution.node.server.close();
        // process.exit(0);
      });
    },
  };
};

module.exports = status;
