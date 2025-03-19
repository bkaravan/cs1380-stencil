/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = require('../../distribution/util/id.js');
const { performance } = require('perf_hooks');


test('(1 pts) student test', (done) => {
    // testing some local groups
    const g = {
      '507aa': {ip: '127.0.0.1', port: 8080},
      '12ab0': {ip: '127.0.0.1', port: 8081},
    };
  
    distribution.local.groups.put('dummy', g, (e, v) => {
      const n1 = {ip: '127.0.0.1', port: 8082};
  
      distribution.local.groups.add('dummy', n1, (e, v) => {
        const expectedGroup = {
          ...g, ...{[id.getSID(n1)]: n1},
        };
  
        distribution.local.groups.get('dummy', (e, v) => {
          try {
            expect(e).toBeFalsy();
            expect(v).toEqual(expectedGroup);
            // if we remove, we come back to first group
            distribution.local.groups.rem('dummy', id.getSID(n1), (e, v) => {
              try {
                expect(e).toBeFalsy();
                expect(v).toEqual(g);
                done();
              } catch (error) {
                done(error);
              }
            })
          } catch (error) {
            done(error);
          }
        });
      });
    });
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
  const g = {
    'al57j': {ip: '127.0.0.1', port: 9092},
    'q5mn9': {ip: '127.0.0.1', port: 9093},
  };

  distribution.group4.groups.put('atlas', g, (e, v) => {
    distribution.group4.groups.get('atlas', (e, v) => {
      distribution.group4.status.get('heapTotal', (e, v) => {
        try {
          expect(e).toBeFalsy;
          expect(v).toBeDefined;
          expect(typeof v).toBe("number");
        } catch (error) {
          done(error);
        }
        distribution.group4.groups.del('atlas', (e, v) => {
          distribution.group4.groups.get('atlas', (e, v) => {
            try {
              expect(e).toBeDefined();
              Object.keys(e).forEach((k) => {
                expect(e[k]).toBeInstanceOf(Error);
                expect(v).toEqual({});
              });
              done();
            } catch (error) {
              done(error);
            }
          });
        });
      })
    });
  });
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
  // testing routes
  const gotchaService = {};

  gotchaService.gotcha = () => {
    return 'routes is working!';
  };

  const r1 = {node: n1, service: 'routes', method: 'get'};
  const r2 = {node: n2, service: 'routes', method: 'get'};

  const g = {
    'al57j': n1,
    'q5mn9': n2,
  };
  distribution.group4.groups.put('atlas', g, (e, v) => {
    distribution.group4.routes.put(gotchaService,
      'gotcha', (e, v) => {
        distribution.local.comm.send(['gotcha'], r1, (e, v) => {
          try {
            expect(e).toBeFalsy();
            expect(v.gotcha()).toBe('routes is working!');
          } catch (error) {
            done(error);
            return;
          }
          distribution.local.comm.send(['gotcha'], r2, (e, v) => {
            try {
              expect(e).toBeFalsy();
              expect(v.gotcha()).toBe('routes is working!');
              done();
            } catch (error) {
              done(error);
              return;
            }
          });
        });
      });;
  })
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
  // gossip
  const groupD = {};
  groupD[id.getSID(n1)] = n1;
  groupD[id.getSID(n2)] = n2;
  groupD[id.getSID(n3)] = n3;
  groupD[id.getSID(n4)] = n4;
  groupD[id.getSID(n5)] = n5;
  groupD[id.getSID(n6)] = n6;
  
  // not sure why, but this test doesn't spread very well
  let nExpected = 5;

  // Experiment with the subset function used in the gossip service...
  let config = {gid: 'groupD'};

  // Instantiated groupD
  distribution.local.groups.put(config, groupD, (e, v) => {
    distribution.groupD.groups.put(config, groupD, (e, v) => {
      // Created group 'newgroup' (this will be the group that we add a new node to)
      distribution.groupD.groups.put('newgroup', {}, (e, v) => {
        const newNode = {ip: '127.0.0.1', port: 4444};
        const message = [
          'newgroup',
          newNode,
        ];
        const remote = {service: 'groups', method: 'add'};
        // Adding a new node to 'newgroup' using the gossip service
        const start = performance.now();
        distribution.groupD.gossip.send(message, remote, (e, v) => {
          // Experiment with the time delay between adding the new node to 'newgroup' and checking the group membership in groupD...
          let delay = 500;
          setTimeout(() => {
            distribution.groupD.groups.get('newgroup', (e, v) => {
              let count = 0;
              for (const k in v) {
                if (Object.keys(v[k]).length > 0) {
                  count++;
                }
              }
              /* Gossip only provides weak guarantees */
              try {
                const end = performance.now();
               // console.log(`Execution time: ${end - start} ms`)
                expect(count).toBeGreaterThanOrEqual(nExpected);
                done();
              } catch (error) {
                done(error);
              }
            });
          }, delay);
        });
      });
    });
  });
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
  // performance for spawns
  const nodeToSpawn = {ip: '127.0.0.1', port: 8008};
  const nodeToSpawn2 = {ip : "127.0.01", port: 5545}

  // Spawn the node
  const start2 = performance.now();
  distribution.group4.status.spawn(nodeToSpawn2, (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v.ip).toEqual(nodeToSpawn2.ip);
      expect(v.port).toEqual(nodeToSpawn2.port);
      const end2 = performance.now();
     // console.log(`Execution spawn: ${end2 - start2} ms`)
    } catch (error) {
      done(error);
    }
    //const start = performance.now();
    distribution.group4.status.spawn(nodeToSpawn, (e, v) => {
      try {
        expect(e).toBeFalsy();
        expect(v.ip).toEqual(nodeToSpawn.ip);
        expect(v.port).toEqual(nodeToSpawn.port);
       // const end = performance.now();
       // console.log(`Execution spawn: ${end - start} ms`)
      } catch (error) {
        done(error);
      }
      let remote = {node: nodeToSpawn, service: 'status', method: 'get'};
  
      // Ping the node, it should respond
      distribution.local.comm.send(['nid'], remote, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(id.getNID(nodeToSpawn));
        } catch (error) {
          done(error);
        }
  
        distribution.local.groups.get('group4', (e, v) => {
          try {
            // console.log(v);
            // console.log(id.getSID(nodeToSpawn));
            // console.log('\n');
            expect(e).toBeFalsy();
            expect(v[id.getSID(nodeToSpawn)]).toBeDefined();
          } catch (error) {
            done(error);
          }
  
          remote = {node: nodeToSpawn, service: 'status', method: 'stop'};
  
          // Stop the node
          distribution.local.comm.send([], remote, (e, v) => {
            try {
              expect(e).toBeFalsy();
              expect(v.ip).toEqual(nodeToSpawn.ip);
              expect(v.port).toEqual(nodeToSpawn.port);
            } catch (error) {
              done(error);
            }
            remote = {node: nodeToSpawn2, service: 'status', method: 'stop'};
            distribution.local.comm.send([], remote, (e, v) => {
              remote = {node: nodeToSpawn, service: 'status', method: 'get'};
  
              // Ping the node again, it shouldn't respond
              distribution.local.comm.send(['nid'],
                  remote, (e, v) => {
                    try {
                      expect(e).toBeDefined();
                      expect(e).toBeInstanceOf(Error);
                      expect(v).toBeFalsy();
                      done();
                    } catch (error) {
                      done(error);
                    }
                  });
            })
          });
        });
      });
    });
  })
});



// taking this from group all tests
// This group is used for testing most of the functionality
const mygroupGroup = {};
// These groups are used for testing hashing
const group1Group = {};
const group2Group = {};
const group4Group = {};
const group3Group = {};

/*
   This hack is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 8000};
const n2 = {ip: '127.0.0.1', port: 8001};
const n3 = {ip: '127.0.0.1', port: 8002};
const n4 = {ip: '127.0.0.1', port: 8003};
const n5 = {ip: '127.0.0.1', port: 8004};
const n6 = {ip: '127.0.0.1', port: 8005};


beforeAll((done) => {
  // First, stop the nodes if they are running
  const remote = {service: 'status', method: 'stop'};

  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n4;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n5;
          distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n6;
            distribution.local.comm.send([], remote, (e, v) => {
            });
          });
        });
      });
    });
  });

  mygroupGroup[id.getSID(n1)] = n1;
  mygroupGroup[id.getSID(n2)] = n2;
  mygroupGroup[id.getSID(n3)] = n3;

  group1Group[id.getSID(n4)] = n4;
  group1Group[id.getSID(n5)] = n5;
  group1Group[id.getSID(n6)] = n6;

  group4Group[id.getSID(n1)] = n1;
  group4Group[id.getSID(n3)] = n3;
  group4Group[id.getSID(n5)] = n5;

  group3Group[id.getSID(n2)] = n2;
  group3Group[id.getSID(n4)] = n4;
  group3Group[id.getSID(n6)] = n6;

  group4Group[id.getSID(n1)] = n1;
  group4Group[id.getSID(n2)] = n2;
  group4Group[id.getSID(n4)] = n4;

  // Now, start the base listening node
  distribution.node.start((server) => {
    localServer = server;

    const groupInstantiation = (e, v) => {
      const mygroupConfig = {gid: 'mygroup'};
      const group1Config = {gid: 'group1', hash: id.naiveHash};
      const group2Config = {gid: 'group2', hash: id.consistentHash};
      const group3Config = {gid: 'group3', hash: id.rendezvousHash};
      const group4Config = {gid: 'group4'};

      // Create some groups
      distribution.local.groups
          .put(mygroupConfig, mygroupGroup, (e, v) => {
            distribution.local.groups
                .put(group1Config, group1Group, (e, v) => {
                  distribution.local.groups
                      .put(group2Config, group2Group, (e, v) => {
                        distribution.local.groups
                            .put(group3Config, group3Group, (e, v) => {
                              distribution.local.groups
                                  .put(group4Config, group4Group, (e, v) => {
                                    done();
                                  });
                            });
                      });
                });
          });
    };

    // Start the nodes
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          distribution.local.status.spawn(n4, (e, v) => {
            distribution.local.status.spawn(n5, (e, v) => {
              distribution.local.status.spawn(n6, groupInstantiation);
            });
          });
        });
      });
    });
  });
});

afterAll((done) => {
  distribution.mygroup.status.stop((e, v) => {
    const remote = {service: 'status', method: 'stop'};
    remote.node = n1;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n2;
      distribution.local.comm.send([], remote, (e, v) => {
        remote.node = n3;
        distribution.local.comm.send([], remote, (e, v) => {
          remote.node = n4;
          distribution.local.comm.send([], remote, (e, v) => {
            remote.node = n5;
            distribution.local.comm.send([], remote, (e, v) => {
              remote.node = n6;
              distribution.local.comm.send([], remote, (e, v) => {
                localServer.close();
                done();
              });
            });
          });
        });
      });
    });
  });
});
