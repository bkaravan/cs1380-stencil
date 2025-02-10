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

test('(1 pts) student test', (done) => {
  local.status.get('sid', (e, v) => {
    try {
      expect(e).toBeFalsy();
      expect(v).toBe(id.getSID(config));
      done();
    } catch (error) {
      done(error);
    }
  });
});


// test('(1 pts) student test', (done) => {
//   const remote = {node: {ip:"127.0.0.1", port: "1234"}, service: 'routes', method: 'get'};
//   const message = [
//     'status',
//   ];
//   local.comm.send(message, remote, (e, v) => {
//     try {
//       expect(e).toBeFalsy();
//       //console.log(v);
//       expect(v).toBeDefined();
//       done();
//     } catch (error) {
//       done(error);
//     }
//   });
// });


// test('(1 pts) student test', (done) => {
//   // Fill out this test case...
//     done(new Error('Not implemented'));
// });

// test('(1 pts) student test', (done) => {
//   // Fill out this test case...
//     done(new Error('Not implemented'));
// });

// test('(1 pts) student test', (done) => {
//   // Fill out this test case...
//     done(new Error('Not implemented'));
// });
