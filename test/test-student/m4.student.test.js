/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

test('(1 pts) student test', (done) => {
  // Fill out this test case...
  const key = 'bkarv';
  const nodes = [
    {ip: '127.0.0.1', port: 20000},
    {ip: '127.0.0.1', port: 20001},
    {ip: '127.0.0.1', port: 20002},
    {ip: '127.0.0.1', port: 20003},
  ];

  const kid = id.getID(key);
  const nids = nodes.map((node) => id.getNID(node));

  const hash = id.rendezvousHash(kid, nids);
  const expectedHash = '2e0ac846d90a9d120e31d6483fd329cf9e382d789758606448c523be888dafa2';

  try {
    expect(expectedHash).toBeTruthy();
    expect(hash).toBe(expectedHash);
    done();
  } catch (error) {
    done(error);
  }
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
  const key = 'bkarv';
  const nodes = [
    {ip: '127.0.0.1', port: 20000},
    {ip: '127.0.0.1', port: 20001},
    {ip: '127.0.0.1', port: 20002},
    {ip: '127.0.0.1', port: 20003},
  ];

  const kid = id.getID(key);
  const nids = nodes.map((node) => id.getNID(node));

  const hash = id.consistentHash(kid, nids);
  const expectedHash = 'd596c1d5c922befd78e472fb95248d14fb9e54d003f2ee0a76bd0a3663ed4fe9';

  try {
    expect(expectedHash).toBeTruthy();
    expect(hash).toBe(expectedHash);
    done();
  } catch (error) {
    done(error);
  }
});


test('(1 pts) student test', (done) => {
  // Crosscheck mem => store
  const user = {first: 'Radahn', last: 'Malenia'};
  const key = 'You are screwed';

  distribution.local.mem.put(user, key, (e, v) => {
    distribution.local.store.get(key, (e, v) => {
      try {
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
        distribution.local.mem.del(key, (e, v) => {
          try {
            expect(e).toBeFalsy();
            expect(v).toBe(user);
            done();
          } catch (error) {
            done(error);
          }
        });
      } catch (error) {
        done(error);
      }
    })
  });
});

test('(1 pts) student test', (done) => {
  // Crosscheck store => mem
  const user = {first: 'Mesmer', last: 'Bayle'};
  const key = 'You are screwed but at least it is fun';

  distribution.local.store.put(user, key, (e, v) => {
    distribution.local.mem.get(key, (e, v) => {
      try {
        expect(e).toBeInstanceOf(Error);
        expect(v).toBeFalsy();
        distribution.local.store.del(key, (e, v) => {
          try {
            expect(e).toBeFalsy();
            expect(v).toEqual(user);
            done();
          } catch (error) {
            done(error);
          }
        });
      } catch (error) {
        done(error);
      }
    })
  });
});

test('(1 pts) student test', (done) => {
  // testing null get
  const users = [
    {first: '2b', last: '9s'},
    {first: 'Yi', last: 'Eigong'},
    {first: 'Jin', last: 'Sakai'},
    {first: 'Kratos', last: 'Atreus'},
  ];
  const keys = [
    'nier',
    'nine sols',
    'ghost of tsushima',
    'god of war'
  ];

  distribution.mygroup.mem.put(users[0], keys[0], (e, v) => {
    try {
      expect(e).toBeFalsy();
    } catch (error) {
      done(error);
      return;
    }
    distribution.mygroup.mem.put(users[1], keys[1], (e, v) => {
      try {
        expect(e).toBeFalsy();
      } catch (error) {
        done(error);
        return;
      }
      distribution.mygroup.mem.put(users[2], keys[2], (e, v) => {
        try {
          expect(e).toBeFalsy();
        } catch (error) {
          done(error);
          return;
        }
        distribution.mygroup.mem.put(users[3], keys[3], (e, v) => {
          try {
            expect(e).toBeFalsy();
          } catch (error) {
            done(error);
            return;
          }
          distribution.mygroup.mem.get(null, (e, v) => {
            try {
              expect(e).toEqual({});
              expect(Object.values(v)).toEqual(expect.arrayContaining(keys));
              done();
            } catch (error) {
              done(error);
              return;
            }
          });
        })
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

