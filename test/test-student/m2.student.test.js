/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const local = distribution.local;
const id = distribution.util.id;

const config = distribution.node.config;

const { performance } = require('perf_hooks');

test('(1 pts) student test', (done) => {

  // testing status things 
  local.status.get('sid', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(id.getSID(config));
      local.status.get('nid', (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(id.getNID(config));
          local.status.get('counts', (e, v) => {
            try {
              expect(e).toBeFalsy();
              expect(v).toBe(10); // apparantly, there are 7 local calls within distribution.js
              done();
            } catch (error) {
              done(error);
            }
          });
        } catch (error) {
          done(error);
        }
      });
    } catch (error) {
      done(error);
    }
  });
});


test('(1 pts) student test', (done) => {
    // testing comms
  const remote = {node: {ip:"127.0.0.1", port: "1234"}, service: 'routes', method: 'get'};
  const message = [
    'status',
  ];
  local.comm.send(message, remote, (e, v) => {
    try {
      expect(e).toBeFalsy();
      //console.log(v);
      expect(v).toBeDefined();
      v.get("port", (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(global.nodeConfig.port);
          done();
        } catch (error) {
          done(error);
        }
      })
    } catch (error) {
      done(error);
    }
  });
  done();
});


test('(1 pts) student test', (done) => {
  // Fill out this test case...
  // testing puts
    const echoService = {};
  
    echoService.echo = () => {
      return 'echo!';
    };

    echoService.helloWorld = () => {
      return "hello world!"
    }
  
    local.routes.put(echoService, 'echo', (e, v) => {
      local.routes.get('echo', (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v.echo()).toBe('echo!');
          expect(v.helloWorld()).toBe("hello world!");
          local.routes.rem('echo', (e, v) => {
            local.routes.get('echo', (e, v) => {
              try {
                expect(e).toBeDefined();
                expect(e).toBeInstanceOf(Error);
                expect(v).toBeFalsy();
                done();
              } catch (e) {
                done(error)
              }
            })
          })
        } catch (error) {
          done(error);
        }
      });
    });
  }
);

test('(1 pts) student test', (done) => {

  // testing status things 
  local.status.get('not a thing', (e, v) => {
    try {
      expect(e).toBeDefined();
      expect(v).toBeFalsy();
      expect(e).toBeInstanceOf(Error);
      local.routes.get("not a thing", (e, v) => {
        try {
          expect(e).toBeDefined();
          expect(v).toBeFalsy();
          expect(e).toBeInstanceOf(Error);
          local.comm.send("thing", (e, v) => {
            try {
              expect(e).toBeDefined();
              expect(v).toBeFalsy();
              expect(e).toBeInstanceOf(Error);
              done();
            } catch (error) {
              done(error);
            }
          });
        } catch (error) {
          done(error);
        }
      });
    } catch (error) {
      done(error);
    }
  });
});

test('(1 pts) student test', (done) => {
  // Fill out this test case...
  // testing rpcs
    let x = []
  
    function pushNum(n) {
      x.push(n)
      return x[x.length - 1];
    }
  
    const addSthRPC = distribution.util.wire.createRPC(
        distribution.util.wire.toAsync(pushNum));
  
    const addSthService = {
      addSthRemote: addSthRPC,
    };
  
    distribution.local.routes.put(addSthService, 'rpcService', (e, v) => {
      addSthRPC(5, (e, v) => {
        try {
          expect(e).toBeFalsy();
          expect(v).toBe(5);
          expect(x.length).toBe(1);
          distribution.local.comm.send([3],
              {node: distribution.node.config, service: 'rpcService', method: 'addSthRemote'}, (e, v) => {
                try {
                  expect(e).toBeFalsy();
                  expect(v).toBe(3);
                  expect(x.length).toBe(2);
                  done();
                } catch (error) {
                  done(error);
                  return;
                }
              });
        } catch (error) {
          done(error);
          return;
        }
      });
    });
});


// test('(1 pts) student test', (done) => {
//   // rpc speed
//     let x = []
    
//     function pushNum(n) {
//       x.push(n)
//       return x[x.length - 1];
//     }
  
//     const addSthRPC = distribution.util.wire.createRPC(
//         distribution.util.wire.toAsync(pushNum));
  
//     const addSthService = {
//       addSthRemote: addSthRPC,
//     };
  
//     distribution.local.routes.put(addSthService, 'rpcService', (e, v) => {
//       const start = performance.now();
//       for (let i = 0; i < 1000; i++) {
//         distribution.local.comm.send([3],
//           {node: distribution.node.config, service: 'rpcService', method: 'addSthRemote'}, (e, v) => {
//             try {
//               expect(e).toBeFalsy();
//               expect(v).toBe(3);
//               if (x.length >= 1000) {
//                 const end = performance.now();
//                 // console.log(`Execution time 5: ${end - start} ms`)
//                 done()
//               }
//             } catch (error) {
//               done(error);
//               return;
//             }
//     });
//       }
//     });
// });

// test('(1 pts) student test', (done) => {
//   // comm speed

//   const remote = {node: {ip:"127.0.0.1", port: "1234"}, service: 'routes', method: 'get'};
//   const message = [
//     'status',
//   ];

//   const start = performance.now();
//   for (let i = 0; i < 1000; i++) {
//     distribution.local.comm.send(message, remote, (e, v) => {
//         try {
//           expect(e).toBeFalsy();
//           if (i === 999) {
//             const end = performance.now();
//             // console.log(`Execution time 5: ${end - start} ms`)
//             done()
//           }
//         } catch (error) {
//           done(error);
//           return;
//         }});
//   }
// });
// ;


let localServer = null;

beforeAll((done) => {
  distribution.node.start((server) => {
    localServer = server;
    done();
  });
});

afterAll((done) => {
  localServer.close();
  done();
});
