/*
    In this file, add your own test case that will confirm your correct implementation of the extra-credit functionality.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

// function for period checks
function healthcheck(config, prevGroup) {
    distribution.local.groups.get(config.gid, (e, v) => {
        const groupSize1 = Object.keys(prevGroup).length;
        const groupSize2 = Object.keys(v).length;
        if (groupSize1 !== groupSize2) {
            distribution[config.gid][config.service].reconf(prevGroup, (e, v) => {
                return (e, v);
            })
        }
    })
}

test('(15 pts) detect the need to reconfigure', (done) => {

    // steal the setup from the extra test 

    // do a gossip at

    // sleep on some time
    // remove the node
    // checkPlacements and delete the interval
    const users = [
        {first: 'Emma', last: 'Watson'},
        {first: 'John', last: 'Krasinski'},
        {first: 'Julie', last: 'Bowen'},
        {first: 'Sasha', last: 'Spielberg'},
        {first: 'Tim', last: 'Nelson'},
      ];
      const keys = [
        'a',
        'b',
        'c',
        'd',
        'e',
      ];
    
      // The keys at first will be placed in nodes n2, n4, and n5
      // After reconfiguration all nodes will be placed in n2
      // Note: These distributions happened because of the specific key values and the specific hashing function used.
    
      // This function will be called after we put items in nodes
      const checkPlacement = (e, v) => {
        try {
          const remote = {node: n2, service: 'mem', method: 'get'};
          const messages = [
            [{key: keys[0], gid: 'mygroup'}],
            [{key: keys[1], gid: 'mygroup'}],
            [{key: keys[2], gid: 'mygroup'}],
            [{key: keys[3], gid: 'mygroup'}],
            [{key: keys[4], gid: 'mygroup'}],
          ];
    
          distribution.local.comm.send(messages[0], remote, (e, v) => {
            try {
              expect(e).toBeFalsy();
              expect(v).toEqual(users[0]);
            } catch (error) {
              done(error);
              return;
            }
    
            distribution.local.comm.send(messages[1], remote, (e, v) => {
              try {
                expect(e).toBeFalsy();
                expect(v).toEqual(users[1]);
              } catch (error) {
                done(error);
                return;
              }
    
              distribution.local.comm.send(messages[2], remote, (e, v) => {
                try {
                  expect(e).toBeFalsy();
                  expect(v).toEqual(users[2]);
                } catch (error) {
                  done(error);
                  return;
                }
    
                distribution.local.comm.send(messages[3], remote, (e, v) => {
                  try {
                    expect(e).toBeFalsy();
                    expect(v).toEqual(users[3]);
                  } catch (error) {
                    done(error);
                    return;
                  }
    
                  distribution.local.comm.send(messages[4], remote, (e, v) => {
                    try {
                      expect(e).toBeFalsy();
                      expect(v).toEqual(users[4]);
                      done();
                    } catch (error) {
                      done(error);
                      return;
                    }
                  });
                });
              });
            });
          });
        } catch (error) {
          done(error);
          return;
        }
      };
    
      // Now we actually put items in the group,
      // remove n5, and check if the items are placed correctly
      distribution.mygroup.mem.put(users[0], keys[0], (e, v) => {
        distribution.mygroup.mem.put(users[1], keys[1], (e, v) => {
          distribution.mygroup.mem.put(users[2], keys[2], (e, v) => {
            distribution.mygroup.mem.put(users[3], keys[3], (e, v) => {
              distribution.mygroup.mem.put(users[4], keys[4], (e, v) => {
                // We need to pass a copy of the group's
                // nodes before we call reconf()
                const groupCopy = {...mygroupGroup};
    
                // Then, we remove n3 from the list of nodes,
                // and run reconf() with the new list of nodes
                // Note: In this scenario, we are removing a node that has no items in it.
                const atConfig = {gid: "mygroup", service: "mem"}
                distribution.mygroup.gossip.at(500, () => healthcheck(atConfig, groupCopy), (e, v) => {
                    const atId = v;
                    // wait for a bit, then remove the nodes
                    setTimeout(() => {
                        distribution.local.groups.rem('mygroup', id.getSID(n3), (e, v) => {
                            distribution.mygroup.groups.rem(
                                'mygroup',
                                id.getSID(n3),
                                (e, v) => {
                                    // by this time, at, should have caught the change
                                    // sleep a bit again before checkPlacement;
                                    setTimeout(() => {
                                    distribution.mygroup.gossip.del(atId, (e, v) => {
                                        checkPlacement();
                                    }) 
                                }, 500);
                            });
                        }); 
                    },1500)
                });
              });
            });
          });
        });
      });
});


const mygroupGroup = {};

/*
   This is necessary since we can not
   gracefully stop the local listening node.
   This is because the process that node is
   running in is the actual jest process
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 9001};
const n2 = {ip: '127.0.0.1', port: 9002};
const n3 = {ip: '127.0.0.1', port: 9003};
const n4 = {ip: '127.0.0.1', port: 9004};
const n5 = {ip: '127.0.0.1', port: 9005};
const n6 = {ip: '127.0.0.1', port: 9006};

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
              startNodes();
            });
          });
        });
      });
    });
  });

  const startNodes = () => {
    mygroupGroup[id.getSID(n1)] = n1;
    mygroupGroup[id.getSID(n2)] = n2;
    mygroupGroup[id.getSID(n3)] = n3;
    mygroupGroup[id.getSID(n4)] = n4;
    mygroupGroup[id.getSID(n5)] = n5;

    // Now, start the nodes listening node
    distribution.node.start((server) => {
      localServer = server;

      const groupInstantiation = () => {
        const mygroupConfig = {gid: 'mygroup'};

        // Create the groups
        distribution.local.groups.put(mygroupConfig, mygroupGroup, (e, v) => {
          distribution.mygroup.groups
              .put(mygroupConfig, mygroupGroup, (e, v) => {
                done();
              });
        });
      };

      // Start the nodes
      distribution.local.status.spawn(n1, (e, v) => {
        distribution.local.status.spawn(n2, (e, v) => {
          distribution.local.status.spawn(n3, (e, v) => {
            distribution.local.status.spawn(n4, (e, v) => {
              distribution.local.status.spawn(n5, (e, v) => {
                distribution.local.status.spawn(n6, (e, v) => {
                  groupInstantiation();
                });
              });
            });
          });
        });
      });
    });
  };
});

afterAll((done) => {
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

