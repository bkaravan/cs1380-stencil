const id = require('../util/id');
const comm = require('../all/comm');

function makeAlphaNumeric(key) {
  return key.replace(/[^a-zA-Z0-9]/g, ''); // Remove non-alphanumeric characters
}

function store(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;
  context.hyper = config.hyper || false;
  context.hyperHash = config.hyperHash || null;

  /* For the distributed store service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      callback = callback || function () {};
      if (!configuration) {
        //
        configuration = {key: null, gid: context.gid};
        const remote = {service: 'store', method: 'get'};
        comm(context).send([configuration], remote, (e, v) => {
          // console.log('here\n')
          let values = [];
          Object.values(v).forEach((lst) => {
            values = values.concat(lst);
          });
          callback(e, values);
        });
      } else {
        global.distribution.local.groups.get(context.gid, (e, v) => {
          const nids = [];
          if (v instanceof Map) {
            for (const [sid, node] of v) {
              nids.push(id.getNID(node));
            }
          } else {
            Object.keys(v).forEach((sid) => {
              const node = v[sid];
              nids.push(id.getNID(node));
            });
          }
          let kid;
          if (context.hyper === true) {
            const newKey = context.hyperHash(configuration.key);
            kid = id.getID(newKey);
            configuration.key = kid;
            configuration.gid = context.gid;
          } else {
            if (typeof configuration === 'object') {
              kid = id.getID(configuration.key);
              configuration.gid = context.gid;
            } else {
              kid = id.getID(configuration);
              configuration = {key: configuration, gid: context.gid};
            }
          }

          const chosenSid = context.hash(kid, nids).substring(0, 5);

          let node;
          if (v instanceof Map) {
            node = v.get(chosenSid);
          } else {
            node = v[chosenSid];
          }

          const remote = {node: node, service: 'store', method: 'get'};

          global.distribution.local.comm.send(
            [configuration],
            remote,
            (e, v) => {
              callback(e, v);
            },
          );
        });
      }
    },

    put: (state, configuration, callback) => {
      callback = callback || function () {};
      global.distribution.local.groups.get(context.gid, (e, v) => {
        const nids = [];

        if (v instanceof Map) {
          for (const [sid, node] of v) {
            nids.push(id.getNID(node));
          }
        } else {
          Object.keys(v).forEach((sid) => {
            const node = v[sid];
            nids.push(id.getNID(node));
          });
        }

        // console.log("INFO BELOW");
        // console.log(state);
        // console.log(configuration);
        let kid;

        if (context.hyper === true) {
          const newKey = context.hyperHash(configuration.key);
          kid = id.getID(newKey);
          configuration.key = kid;
          configuration.gid = context.gid;
        } else {
          if (!configuration) {
            kid = id.getID(state);
            configuration = {key: kid, gid: context.gid};
            kid = id.getID(kid);
          } else if (typeof configuration === 'object') {
            kid = id.getID(configuration.key);
            configuration.gid = context.gid;
          } else {
            const changed = makeAlphaNumeric(configuration);
            kid = id.getID(changed);
            configuration = {key: changed, gid: context.gid};
          }
        }

        // console.log(kid);
        const chosenSid = context.hash(kid, nids).substring(0, 5);
        // console.log(chosenSid);

        let node;
        if (v instanceof Map) {
          node = v.get(chosenSid);
        } else {
          node = v[chosenSid];
        }

        const remote = {node: node, service: 'store', method: 'put'};

        global.distribution.local.comm.send(
          [state, configuration],
          remote,
          (e, v) => {
            callback(e, v);
          },
        );
      });
    },

    del: (configuration, callback) => {
      callback = callback || function () {};
      global.distribution.local.groups.get(context.gid, (e, v) => {
        const nids = [];
        if (v instanceof Map) {
          for (const [sid, node] of v) {
            nids.push(id.getNID(node));
          }
        } else {
          Object.keys(v).forEach((sid) => {
            const node = v[sid];
            nids.push(id.getNID(node));
          });
        }
        let kid;

        if (context.hyper === true) {
          const newKey = context.hyperHash(configuration.key);
          kid = id.getID(newKey);
          configuration.key = kid;
          configuration.gid = context.gid;
        } else {
          if (typeof configuration === 'object') {
            kid = id.getID(configuration.key);
            configuration.gid = context.gid;
          } else {
            kid = id.getID(configuration);
            configuration = {key: configuration, gid: context.gid};
          }
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);

        let node;
        if (v instanceof Map) {
          node = v.get(chosenSid);
        } else {
          node = v[chosenSid];
        }

        const remote = {node: node, service: 'store', method: 'del'};

        global.distribution.local.comm.send([configuration], remote, (e, v) => {
          callback(e, v);
        });
      });
    },

    reconf: (configuration, callback) => {
      const prevNids = [];
      Object.values(configuration).forEach((node) =>
        prevNids.push(id.getNID(node)),
      );

      global.distribution.local.groups.get(context.gid, (e, v) => {
        if (e instanceof Error) {
          console.log(e);
          callback(e);
          return;
        }
        const groupNodes = v;
        const newNids = [];
        Object.values(v).forEach((node) => newNids.push(id.getNID(node)));
        store(config).get(null, (e, v) => {
          if (e instanceof Error) {
            callback(e);
            return;
          }
          // new keys are in v;
          const infoMap = {};
          for (const key of v) {
            const kid = id.getID(key);
            const nid1 = context.hash(kid, newNids);
            const nid2 = context.hash(kid, prevNids);

            if (nid1 !== nid2) {
              const newNode = groupNodes[nid1.substring(0, 5)];
              const prevNode = configuration[nid2.substring(0, 5)];
              infoMap[key] = {newNode, prevNode};
            }
          }

          let remaining = Object.keys(infoMap).length;

          Object.keys(infoMap).forEach((key) => {
            // let's try just with del. what's the need for get?
            const remote = {
              node: infoMap[key].prevNode,
              service: 'store',
              method: 'del',
            };
            const messageConfig = {key: key, gid: context.gid};
            global.distribution.local.comm.send(
              [messageConfig],
              remote,
              (e, v) => {
                if (e instanceof Error) {
                  callback(e);
                  return;
                }
                remote.node = infoMap[key].newNode;
                remote.method = 'put';
                global.distribution.local.comm.send(
                  [v, messageConfig],
                  remote,
                  (e, v) => {
                    if (e instanceof Error) {
                      callback(e);
                      return;
                    }
                    remaining--;
                    if (!remaining) {
                      // what should be return value? new nodes? new get?
                      callback(null, true);
                    }
                  },
                );
              },
            );
          });
        });
      });
    },
  };
}

module.exports = store;
