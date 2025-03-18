/** @typedef {import("../types").Callback} Callback */
const routes = require('./routes');
const comm = require('./comm');
const id = require('../util/id')


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
  // function exec(configuration, cb) {

  //   if (!configuration.map || !configuration.reduce || !configuration.keys) {
  //     cb(new Error("incomplete configuration for exec"));
  //     return;
  //   }
    
    
  //   // step 1: create the mr-id service
  //   const mrService = {};
  //   mrService.mapper = configuration.map;
  //   mrService.reducer = configuration.reduce;

  //   const notify = (config, cb) => {
  //     // some information probably?
  //     return "I got notified";
  //   }

  //   mrService.notify = notify;


  //   // how to make nodes execute on their end? 
  //   // create a local mr file?

  //   // step 2: send it to everyone (notify method?)
  //   routes(context).put(mrService, "mr1", (e, v) => {
  //     // we have put the service onto every node
  //     const remote = {service: "routes", method: "get"};
      
  //     comm(context).send(["mr1"], remote, (e, v) => {
  //       Object.keys(v).forEach(node => {
  //         const service = v[node];
  //         console.log(service.notify());
  //       })
  //       // console.log(v);
  //       console.log('\n');
  //       //console.log(v.notify()); 
  //       cb(e, v);
  //     });
  //   })


  //   // step 3: keep track of what is going on and send new messages
  //   // step 4: aggregate results
  // }

  function exec(configuration, cb) {
    const inputId = id.getID(configuration);
    
    const mapReduceOperations = {
        mapper: configuration.map,
        reducer: configuration.reduce,
        
        map: function(data, groupId, operationId, callback) {
            if (data.length == 0) {
                callback(null, []);
                return;
            } else {
                const mappedResults = [];
                let processedCount = 0;
                
                data.forEach(item => {
                    global.distribution[groupId].store.get(item, (error, value) => {
                        processedCount++;
                        const mappedValue = this.mapper(item, value);
                        
                        if (Array.isArray(mappedValue)) {
                            mappedResults.push(...mappedValue);
                        } else {
                            mappedResults.push(mappedValue);
                        }
                        
                        if (processedCount == data.length) {
                            global.distribution.local.store.put(mappedResults, operationId + '_map', (error, result) => {
                                callback(error, mappedResults);
                          });
                        }
                    });
                });
            }
        },
        
        shuffle: function(groupId, operationId, callback) {
            global.distribution.local.store.get(operationId + '_map', (error, data) => {
                if (!error) {
                    let processedCount = 0;
                    
                    data.forEach(item => {
                        const [key] = Object.keys(item);
                        // need to fix this
                        global.distribution[groupId].mem.put(item[key], {
                            key: key,
                            action: 'append'
                        }, (error, result) => {
                          // console.log(error);
                          // console.log(result);
                            processedCount++;
                            if (processedCount == data.length) {
                                callback(null, data);
                            }
                        });
                    });
                } else {
                    console.log(error);
                    callback(error, {});
                }
            });
        },
        
        reduce: function(groupId, operationId, callback) {
            global.distribution.local.mem.get({
                key: null,
                gid: groupId
            }, (error, keys) => {
                let results = [];
                let processedCount = 0;
                
                if (keys.length == 0) {
                    callback(null, null);
                }
                
                keys.forEach(key => 
                    global.distribution.local.mem.get({
                        key: key,
                        gid: groupId
                    }, (error, values) => {
                        const reducedValue = this.reducer(key, values);
                        results = results.concat(reducedValue);
                        processedCount++;
                        
                        if (processedCount == keys.length) {
                            callback(null, results);
                        }
                    })
                );
            });
        }
    };
    
    const distributeKeys = function(keys, nodes) {
        const keyGroups = {};
        
        Object.keys(nodes).forEach(nodeId => {
            keyGroups[nodeId] = [];
        });
        
        keys.forEach(key => {
            const keyId = id.getID(key);
            const targetNode = id.naiveHash(keyId, Object.keys(nodes));
            keyGroups[targetNode].push(key);
        });
        
        return keyGroups;
    };
    
    routes(context).put(mapReduceOperations, 'mr-' + inputId, (e, v) => {
        global.distribution.local.groups.get(context.gid, (e, nodes) => {
            const keyDistribution = distributeKeys(configuration.keys, nodes);
            let completedNodes = 0;
            const totalNodes = Object.keys(nodes).length;
            const mapRequest = {
                service: 'mr-' + inputId,
                method: 'map'
            };
            
            for (const nodeId in nodes) {
              // console.log(nodeId);
              // console.log('got here\n');
              const mapParams = [keyDistribution[nodeId], context.gid, inputId];
              
              global.distribution.local.comm.send(mapParams, {
                  node: nodes[nodeId],
                  ...mapRequest
              }, (error, mapResult) => {
                  ++completedNodes;
                  
                  if (completedNodes == totalNodes) {
                      const shuffleRequest = {
                          service: 'mr-' + inputId,
                          method: 'shuffle'
                      };
                      
                      comm(context).send([context.gid, inputId], shuffleRequest, (error, shuffleResult) => {
                          const reduceRequest = {
                              service: 'mr-' + inputId,
                              method: 'reduce'
                          };
                          
                          comm(context).send([context.gid, inputId], reduceRequest, (error, reduceResults) => {
                              let finalResults = [];
                              
                              for (const result of Object.values(reduceResults)) {
                                  if (result !== null) {
                                      finalResults = finalResults.concat(result);
                                  }
                              }
                              
                              cb(null, finalResults);
                              return;
                          });
                      });
                  }
              });
            }
        });
    });
}

  return {exec};
};

module.exports = mr;
