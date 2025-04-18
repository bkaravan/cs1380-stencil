const gossip = function(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.subset = config.subset || function(lst) {
    return Math.ceil(Math.log(lst.length));
  };

  return {
    send: (payload, remote, callback) => {
      callback = callback || function() {};
      global.distribution.local.groups.get(context.gid, (e, v) => {
        // apply the function to nodes in our group
        const targetSize = context.subset(Object.keys(v));
        const selectedNodes = new Set();
        // console.log(v);
        // console.log('\n');


        // add nodes until we reach desired size
        while (selectedNodes.size < targetSize) {
          const index = Math.floor(Math.random() * Object.keys(v).length);
          selectedNodes.add(Object.keys(v)[index]);
        }

        const errors = {};
        const values = {};
        let counter = targetSize;

        // do we need to take care of already established ones?
        let metaMessage = {};

        if (!payload.gid || !payload.mid) {
          metaMessage.message = payload;
          metaMessage.remote = remote;
          metaMessage.mid = global.distribution.util.id.getMID(payload.message);
          metaMessage.gid = context.gid;
        } else {
          metaMessage = payload;
        }

        for (const sid of selectedNodes) {
          // console.log('this id: ');
          // console.log(sid);
          // console.log('\n');
          const node = v[sid];
          const nodeRecv = {
            'node': node,
            'service': 'gossip',
            'method': 'recv',
          };

          global.distribution.local.comm.send([metaMessage], nodeRecv, (e, v) => {
            if (e) {
              errors[sid] = e;
            } else {
              values[sid] = v;
            }

            counter--;
            if (counter === 0) {
              callback(errors, values);
            }
          });
        }
      });
    },

    at: (period, func, callback) => {
      const intervalID = setInterval(func, period);
      callback(null, intervalID);
    },

    del: (intervalID, callback) => {
      clearInterval(intervalID);
      callback(null, intervalID);
    },
  };
};

module.exports = gossip;
