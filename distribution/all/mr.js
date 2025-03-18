/** @typedef {import("../types").Callback} Callback */
const routes = require('./routes');
const comm = require('./comm');


/**
 * Map functions used for mapreduce
 * @callback Mapper
 * @param {any} key
 * @param {any} value
 * @returns {object[]}
 */

/**
 * Reduce functions used for mapreduce
 * @callback Reducer
 * @param {any} key
 * @param {Array} value
 * @returns {object}
 */

/**
 * @typedef {Object} MRConfig
 * @property {Mapper} map
 * @property {Reducer} reduce
 * @property {string[]} keys
 */


/*
  Note: The only method explicitly exposed in the `mr` service is `exec`.
  Other methods, such as `map`, `shuffle`, and `reduce`, should be dynamically
  installed on the remote nodes and not necessarily exposed to the user.
*/

function mr(config) {
  const context = {
    gid: config.gid || 'all',
  };

  /**
   * @param {MRConfig} configuration
   * @param {Callback} cb
   * @return {void}
   */
  function exec(configuration, cb) {

    if (!configuration.map || !configuration.reduce || !configuration.keys) {
      cb(new Error("incomplete configuration for exec"));
      return;
    }
    
    
    // step 1: create the mr-id service
    const mrService = {};
    mrService.mapper = configuration.map;
    mrService.reducer = configuration.reduce;

    const notify = (config, cb) => {
      // some information probably?
      return "I got notified";
    }

    mrService.notify = notify;


    // how to make nodes execute on their end? 
    // create a local mr file?

    // step 2: send it to everyone (notify method?)
    routes(context).put(mrService, "mr1", (e, v) => {
      // we have put the service onto every node
      const remote = {service: "routes", method: "get"};
      
      comm(context).send(["mr1"], remote, (e, v) => {
        Object.keys(v).forEach(node => {
          const service = v[node];
          console.log(service.notify());
        })
        // console.log(v);
        console.log('\n');
        //console.log(v.notify()); 
        cb(e, v);
      });
    })


    // step 3: keep track of what is going on and send new messages
    // step 4: aggregate results
  }

  return {exec};
};

module.exports = mr;
