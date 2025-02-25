const id = require('../util/id');
const comm = require('../all/comm');


function mem(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed mem service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      callback = callback || function() {};

      if (!configuration) {
        //
        configuration = {key: null, gid: context.gid};
        const remote = {service: "mem", method: "get"};
        comm(context).send([configuration], remote, (e, v) => {
          // console.log('here\n')
          let values = [];
          Object.values(v).forEach(lst => {values = values.concat(lst)});
          callback(e, values);
        })
      } else {
      global.distribution.local.groups.get(context.gid, (e, v) => {
        const nids = []
        if (v instanceof Map) {
          for (const [sid, node] of v) {
            nids.push(id.getNID(node));
          }
        } else { 
          Object.keys(v).forEach(sid => {
          const node = v[sid];
          nids.push(id.getNID(node));
          })
        }
        let kid;
        if (typeof configuration === "object") {
          kid = id.getID(configuration.key);
          configuration.gid = context.gid;
        } else {
          kid = id.getID(configuration);
          configuration = {key: configuration, gid: context.gid};
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);
        // console.log(chosenSid);
        // console.log(context.hash);

        let node; 
        if (v instanceof Map) {
          node = v.get(chosenSid);
        } else {
          node = v[chosenSid];
        }

        const remote = {node: node, service: "mem", method: "get"};

        global.distribution.local.comm.send([configuration], remote, (e, v) => {
          callback(e, v);
        })
      })
      }

      
    },

    put: (state, configuration, callback) => {
      callback = callback || function() {};
      global.distribution.local.groups.get(context.gid, (e, v) => {

        const nids = []

        if (v instanceof Map) {
          for (const [sid, node] of v) {
            nids.push(id.getNID(node));
          }
        } else { 
          Object.keys(v).forEach(sid => {
          const node = v[sid];
          nids.push(id.getNID(node));
          })
        }


        let kid;
        if (!configuration) {
          kid = id.getID(state);
          configuration = {key: kid, gid: context.gid};
          kid = id.getID(kid);
        }
        else if (typeof configuration === "object") {
          kid = id.getID(configuration.key);
          configuration.gid = context.gid;
        } else {
          kid = id.getID(configuration);
          configuration = {key: configuration, gid: context.gid};
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);

        let node; 
        if (v instanceof Map) {
          node = v.get(chosenSid);
        } else {
          node = v[chosenSid];
        }

        const remote = {node: node, service: "mem", method: "put"};

        global.distribution.local.comm.send([state, configuration], remote, (e, v) => {
          callback(e, v);
        })
      })
    },

    del: (configuration, callback) => {
      callback = callback || function() {};
      global.distribution.local.groups.get(context.gid, (e, v) => {

        const nids = []
        if (v instanceof Map) {
          for (const [sid, node] of v) {
            nids.push(id.getNID(node));
          }
        } else { 
          Object.keys(v).forEach(sid => {
          const node = v[sid];
          nids.push(id.getNID(node));
          })
        }
        let kid;
        if (typeof configuration === "object") {
          kid = id.getID(configuration.key);
          configuration.gid = context.gid;
        } else {
          kid = id.getID(configuration);
          configuration = {key: configuration, gid: context.gid};
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);

        let node; 
        if (v instanceof Map) {
          node = v.get(chosenSid);
        } else {
          node = v[chosenSid];
        }

        const remote = {node: node, service: "mem", method: "del"};

        global.distribution.local.comm.send([configuration], remote, (e, v) => {
          callback(e, v);
        })
      })
    },

    reconf: (configuration, callback) => {
    },
  };
};

module.exports = mem;
