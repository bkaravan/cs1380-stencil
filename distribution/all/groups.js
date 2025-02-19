const comm = require('./comm');

const groups = function(config) {
  const context = {};
  context.gid = config.gid || 'all';

  return {
    put: (config, group, callback) => {
      const remote = {service: "groups", method: "put"};
      // needs individual?

      comm(context).send([config, group], remote, (e, v) => {
        callback(e, v);
      })
    },

    del: (name, callback) => {
      const remote = {service: "groups", method: "del"};
      // needs individual?

      comm(context).send([name], remote, (e, v) => {
        callback(e, v);
      })
    },

    get: (name, callback) => {
      const remote = {service: "groups", method: "get"};
      // needs individual?

      comm(context).send([name], remote, (e, v) => {
        callback(e, v);
      })
    },

    add: (name, node, callback) => {
      const remote = {service: "groups", method: "add"};
      // needs individual?

      comm(context).send([name, node], remote, (e, v) => {
        callback(e, v);
      })
    },

    rem: (name, node, callback) => {
      const remote = {service: "groups", method: "rem"};
      // needs individual?

      comm(context).send([name, node], remote, (e, v) => {
        callback(e, v);
      })
    },
  };
};

module.exports = groups;
