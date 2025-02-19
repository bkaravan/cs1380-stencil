/** @typedef {import("../types").Callback} Callback */
const comm = require('./comm');

function routes(config) {
  const context = {};
  context.gid = config.gid || 'all';

  /**
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function put(service, name, callback = () => { }) {
    const remote = {service: "routes", method: "put"};
      // needs individual?
      comm(context).send([service, name], remote, (e, v) => {
        callback(e, v);
      })
  }

  /**
   * @param {object} service
   * @param {string} name
   * @param {Callback} callback
   */
  function rem(service, name, callback = () => { }) {
  }

  return {put, rem};
}

module.exports = routes;
