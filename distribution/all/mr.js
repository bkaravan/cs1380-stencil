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

  function exec(configuration, cb) {
    // get the hash of the input
    const inputId = id.getID(configuration);
    
    // define the service
    const mapReduceService = {
        mapper: configuration.map,
        reducer: configuration.reduce,
        // extra credit fields
        compact: configuration.compact || null,
        out: configuration.out || null,
        memory: configuration.memory || false,
        rounds: configuration.rounds || 1,

        map: function(data, groupId, operationId, callback) {
            if (data.length == 0) {
                callback(null, []);
                return;
            } else {
                const mappedResults = [];
                let processedCount = 0;
                
                data.forEach(item => {
                    let storage = global.distribution[groupId].store;
                    if (this.memory) {
                        storage = global.distribution[groupId].mem;
                    }
                    storage.get(item, (error, value) => {
                        if (error) {
                            callback(error);
                            return
                        } else {
                            processedCount++;
                            const mappedValue = this.mapper(item, value);
                            
                            if (Array.isArray(mappedValue)) {
                                mappedResults.push(...mappedValue);
                            } else {
                                mappedResults.push(mappedValue);
                            }
                            

                            if (processedCount == data.length) {
                                let finalResults = mappedResults;
                                // if compaction is defined, we run it here before
                                // putting all of the mapped results into storage
                                if (this.compact) {
                                    finalResults = this.compact(item, mappedResults);
                                }
                                let localStorage = global.distribution.local.store;
                                if (this.memory) {
                                    localStorage = global.distribution.local.mem;
                                }
                                localStorage.put(finalResults, operationId + 'map', (error, result) => {
                                    // console.log(result);
                                    callback(error, finalResults);
                                });
                            }
                        }
                    });
                });
            }
        },
        
        shuffle: function(groupId, operationId, callback) {
            let localStorage = global.distribution.local.store;
            if (this.memory) {
                localStorage = global.distribution.local.mem;
            }
            localStorage.get(operationId + 'map', (error, data) => {
                if (!error) {
                    let processedCount = 0;
                    
                    data.forEach(item => {
                        const [key] = Object.keys(item);
                        // need to fix this
                        global.distribution[groupId].mem.put(item[key], {
                            key: key,
                            action: 'append'
                        }, (error, result) => {

                            processedCount++;
                            if (processedCount == data.length) {
                                // this data is just what the node processed, 
                                // not actually shuffled to node
                                callback(null, data);
                            }
                        });
                    });
                } else {
                    callback(error);
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

                // console.log(keys);
                keys.forEach(key => {
                    // console.log(key);
                    global.distribution.local.mem.get({
                        key: key,
                        gid: groupId
                    }, (error, values) => {
                        
                        // when doing just in-memory storage, this will fail
                        // some keys have different values 
                        try {
                            const reducedValue = this.reducer(key, values);
                            results = results.concat(reducedValue);
                        } catch (e) {
                            // do nothing, since we still want to process this key
                            // but if it doesn't work with the reducer, we just 
                            // ignore it
                        }
                        processedCount++;
                        
                        if (processedCount == keys.length) {
                            // at this point, either callback like normal
                            // or store results in the out group if it was provided
                            if (this.out) {
                                let storage = global.distribution[this.out].store;
                                if (this.memory) {
                                    storage = global.distribution[this.out].mem;
                                }
                                storage.put(results, key, (e, v) => {
                                    callback(null, results)
                                })
                            } else {
                                callback(null, results);
                            }
                        }
                    })
            });
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
    
    // wrapped this in a function for an easier if/statement for 
    // persisten distribution for EC2
    function mapReduce(callback) {
        // first, send the service to everyone
        routes(context).put(mapReduceService, 'mr-' + inputId, (e, v) => {
            global.distribution.local.groups.get(context.gid, (e, nodes) => {
                // get all of the ndoes and distribute the keys
                const keyDistribution = distributeKeys(configuration.keys, nodes);
                let completedNodes = 0;
                const totalNodes = Object.keys(nodes).length;
                const mapRequest = {
                    service: 'mr-' + inputId,
                    method: 'map'
                };
                
                for (const nodeId in nodes) {
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

                                    // console.log(error);
                                    
                                    for (const result of Object.values(reduceResults)) {

                                        if (result !== null) {
                                            finalResults = finalResults.concat(result);
                                        }
                                    }
                                    
                                    callback(null, finalResults);
                                    return;
                                });
                            });
                        }
                    });
                }
            });
        });
    }

    let localCnt = 0;
    function startMR(cnt, rounds) {
        mapReduce((e, v) => {
            const mrResults = v;
            cnt++
            if (cnt === rounds) {
                cb(e, mrResults)
            } else {
                // probably need to reset the data here, but otherwise should (?)
                // the only problem with this step is that in case out is specified, then 
                // it would contain every intermediate result
                let storage = global.distribution[context.gid].store;
                if (mapReduceService.memory) {
                    storage = global.distribution[context.gid].mem;
                }
                storage.get(null, (e, keys) => {
                    let keyCount = 0;
                    keys.forEach(key => {
                        storage.del(key, (e, v) => {
                            keyCount++;
                            if (keyCount === keys.length) {
                                // we are done removing, now put new data
                                let newKeyCount = 0;
                                Object.keys(mrResults).forEach(newKey => {
                                    const val = mrResults[newKey]
                                    storage.put(val, newKey, (e, v) => {
                                        newKeyCount++;
                                        if (newKeyCount === mrResults.length) {
                                            // start the new round of MR
                                            startMR(cnt, rounds)
                                        }
                                    })
                                })
                            }
                        })
                    })
                })
            }
        })
    }

    if (configuration.out) {
        const outGroupConfig = {gid: configuration.out};
        global.distribution.local.groups.get(context.gid, (e, nodes) => {
            // nodes is every node we have 
            // first, we will setup the output group. then, we call mapReduce
            global.distribution.local.groups.put(outGroupConfig, nodes, (e, v) => {
                global.distribution[configuration.out].groups.put(outGroupConfig, nodes, (e, v) => {
                    startMR(localCnt, mapReduceService.rounds)
                })
            })
        })
    } 
    else {
        startMR(localCnt, mapReduceService.rounds)
    }
    
    
}

  return {exec};
};

module.exports = mr;
