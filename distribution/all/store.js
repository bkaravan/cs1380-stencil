
function store(config) {
  const context = {};
  context.gid = config.gid || 'all';
  context.hash = config.hash || global.distribution.util.id.naiveHash;

  /* For the distributed store service, the configuration will
          always be a string */
  return {
    get: (configuration, callback) => {
      callback = callback || function() {};
      global.distribution.local.groups.get(context.gid, (e, v) => {

        const nids = []
        Object.keys(v).forEach(sid => {
          const node = v[sid];
          nids.push(id.getNID(node));
        })
        let kid;
        if (typeof configuration === "object") {
          kid = id.getID(configuration.key);
          configuration.gid = context.gid;
        } else {
          kid = id.getID(configuration);
          configuration = {key: configuration, gid: context.gid};
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);

        const remote = {node: v[chosenSid], service: "store", method: "get"};

        global.distribution.local.send([configuration], remote, (e, v) => {
          callback(e, v);
        })
      })
    },

    put: (state, configuration, callback) => {
      callback = callback || function() {};
      global.distribution.local.groups.get(context.gid, (e, v) => {

        const nids = []
        Object.keys(v).forEach(sid => {
          const node = v[sid];
          nids.push(id.getNID(node));
        })
        let kid;
        if (typeof configuration === "object") {
          kid = id.getID(configuration.key);
          configuration.gid = context.gid;
        } else {
          kid = id.getID(configuration);
          configuration = {key: configuration, gid: context.gid};
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);

        const remote = {node: v[chosenSid], service: "store", method: "put"};

        global.distribution.local.send([state, configuration], remote, (e, v) => {
          callback(e, v);
        })
      })
    },

    del: (configuration, callback) => {
      callback = callback || function() {};
      global.distribution.local.groups.get(context.gid, (e, v) => {

        const nids = []
        Object.keys(v).forEach(sid => {
          const node = v[sid];
          nids.push(id.getNID(node));
        })
        let kid;
        if (typeof configuration === "object") {
          kid = id.getID(configuration.key);
          configuration.gid = context.gid;
        } else {
          kid = id.getID(configuration);
          configuration = {key: configuration, gid: context.gid};
        }

        const chosenSid = context.hash(kid, nids).substring(0, 5);

        const remote = {node: v[chosenSid], service: "store", method: "del"};

        global.distribution.local.send([configuration], remote, (e, v) => {
          callback(e, v);
        })
      })
    },

    reconf: (configuration, callback) => {
    },
  };
};

module.exports = store;
