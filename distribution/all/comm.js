/** @typedef {import("../types").Callback} Callback */

const groups = require('../local/groups');
const commLocal = require('../local/comm');

/**
 * NOTE: This Target is slightly different from local.all.Target
 * @typdef {Object} Target
 * @property {string} service
 * @property {string} method
 */

/**
 * @param {object} config
 * @return {object}
 */
function comm(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {Array} message
   * @param {object} configuration
   * @param {Callback} callback
   */
  function send(message, configuration, callback) {

    // enforce all three
    if (arguments.length < 3) {
      if (typeof message === "function") {
          message(new Error("not enough arguments, need message, remote, callback"), null);
      } else {
          remote(new Error("not enough arguments, need message, remote, callback"), null);
      }
      return;
    }

    // need to know who to send to
    // count the last one, pass to callback

    const errors = {};
    const values = {};

    groups.get(context.gid, (e, v) => {
      if (e) {
        errors['error'] = e;
        callback(errors, values);
        return;
      }
      let remainingNodes = Object.keys(v).length;

      Object.keys(v).forEach(sid => {
        const node = v[sid];
        configuration.node = node;
        // TODO: should we change this to local????
        commLocal.send(message, configuration, (e, v) => {
          if (e) {
            errors[sid] = e;
          } else {
            values[sid] = v;
          }
          remainingNodes -= 1;
          if (remainingNodes === 0) {
            callback(errors, values);
          }
        });
      });
    });
  }

  return {send};
};

module.exports = comm;
