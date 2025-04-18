/*
    In this file, add your own test case that will confirm your correct implementation of the extra-credit functionality.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const distribution = require('../../config.js');
const id = distribution.util.id;

const ncdcGroup = {};
const avgwrdlGroup = {};
const cfreqGroup = {};
const iterativeGroup = {};

/*
    The local node will be the orchestrator.
*/
let localServer = null;

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

// test('(15 pts) implement compaction', (done) => {
//   const mapper = (key, value) => {
//     const chars = value.replace(/\s+/g, '').split('');
//     const out = [];
//     chars.forEach((char) => {
//       const o = {};
//       o[char] = 1;
//       out.push(o);
//     });
//     return out;
//   };

//   // compaction should count each value of the current map round
//   const compaction = (key, values) => {
//     const counts = {};
//     values.forEach((tuple) => {
//       Object.keys(tuple).forEach((key) => {
//         counts[key] = counts[key] ? counts[key] + 1 : 1;
//       });
//     });

//     const out = [];

//     Object.keys(counts).forEach((key) => {
//       const curr = {};
//       curr[key] = counts[key];
//       out.push(curr);
//     });

//     return out;
//   };

//   const reducer = (key, values) => {
//     // console.log(key);
//     // console.log(values);
//     // console.log('\n');
//     const out = {};
//     out[key] = values.reduce((sum, v) => sum + v, 0);
//     return out;
//   };

//   const dataset = [
//     {doc1: 'hello world'},
//     {doc2: 'map reduce test'},
//     {doc3: 'character counting example'},
//   ];

//   const expected = [
//     {h: 2},
//     {e: 7},
//     {l: 4},
//     {o: 3},
//     {w: 1},
//     {r: 4},
//     {d: 2},
//     {m: 2},
//     {a: 4},
//     {p: 2},
//     {u: 2},
//     {c: 4},
//     {t: 4},
//     {s: 1},
//     {n: 2},
//     {i: 1},
//     {g: 1},
//     {x: 1},
//   ];

//   const doMapReduce = (cb) => {
//     // fina result is the same, but if you log reducer input, it's clear that it has been run through compaction
//     // prettier-ignore
//     distribution.avgwrdl.mr.exec(
//         {
//           keys: getDatasetKeys(dataset),
//           map: mapper,
//           reduce: reducer,
//           compact: compaction,
//         },
//         (e, v) => {
//           try {
//             expect(v).toEqual(expect.arrayContaining(expected));
//             done();
//           } catch (e) {
//             done(e);
//           }
//         },
//     );
//   };

//   let cntr = 0;

//   dataset.forEach((o) => {
//     const key = Object.keys(o)[0];
//     const value = o[key];
//     distribution.avgwrdl.store.put(value, key, (e, v) => {
//       cntr++;
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });

// test('(15 pts) add support for distributed persistence', (done) => {
//   // same setup as given test 1
//   // instead of checking results directly, we provide a group name
//   // at the end, the group with that group name should have the mr results
//   const mapper = (key, value) => {
//     const words = value.split(/(\s+)/).filter((e) => e !== ' ');
//     const out = {};
//     out[words[1]] = parseInt(words[3]);
//     return [out];
//   };

//   const reducer = (key, values) => {
//     const out = {};
//     out[key] = values.reduce((a, b) => Math.max(a, b), -Infinity);
//     return out;
//   };

//   const dataset = [
//     {'000': '006701199099999 1950 0515070049999999N9 +0000 1+9999'},
//     {106: '004301199099999 1950 0515120049999999N9 +0022 1+9999'},
//     {212: '004301199099999 1950 0515180049999999N9 -0011 1+9999'},
//     {318: '004301265099999 1949 0324120040500001N9 +0111 1+9999'},
//     {424: '004301265099999 1949 0324180040500001N9 +0078 1+9999'},
//   ];

//   const expected = [{1950: 22}, {1949: 111}];
//   const outGroup = 'sampleOutGroup';

//   // prettier-ignore
//   const doMapReduce = (cb) => {
//     distribution.ncdc.mr.exec(
//         {
//           keys: getDatasetKeys(dataset),
//           map: mapper,
//           reduce: reducer,
//           out: outGroup,
//         },
//         (e, v) => {
//           try {
//             // for persisten storage, our out group now needs to have all the keys
//             global.distribution[outGroup].store.get(null, (e, keys) => {
//               let count = 0;
//               let results = [];
//               // for each key, we will get tis value, and concat the results
//               keys.forEach((key) => {
//                 global.distribution[outGroup].store.get(key, (e, v) => {
//                   results = results.concat(v);
//                   count++;
//                   if (count === keys.length) {
//                     // when we are done, our results should be the same as expected
//                     expect(results).toEqual(expect.arrayContaining(expected));
//                     done();
//                   }
//                 });
//               });
//             });
//           } catch (e) {
//             done(e);
//           }
//         },
//     );
//   };

//   let cntr = 0;
//   // Send the dataset to the cluster
//   dataset.forEach((o) => {
//     const key = Object.keys(o)[0];
//     const value = o[key];
//     distribution.ncdc.store.put(value, key, (e, v) => {
//       cntr++;
//       // Once the dataset is in place, run the map reduce
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });

// test('(5 pts) add support for optional in-memory operation', (done) => {
//   // same setup as one of the given tests but uses in-memory instead
//   const mapper = (key, value) => {
//     const chars = value.replace(/\s+/g, '').split('');
//     const out = [];
//     chars.forEach((char) => {
//       const o = {};
//       o[char] = 1;
//       out.push(o);
//     });
//     return out;
//   };

//   const reducer = (key, values) => {
//     const out = {};
//     out[key] = values.reduce((sum, v) => sum + v, 0);
//     return out;
//   };

//   const dataset = [
//     {doc1: 'hello world'},
//     {doc2: 'map reduce test'},
//     {doc3: 'character counting example'},
//   ];

//   const expected = [
//     {h: 2},
//     {e: 7},
//     {l: 4},
//     {o: 3},
//     {w: 1},
//     {r: 4},
//     {d: 2},
//     {m: 2},
//     {a: 4},
//     {p: 2},
//     {u: 2},
//     {c: 4},
//     {t: 4},
//     {s: 1},
//     {n: 2},
//     {i: 1},
//     {g: 1},
//     {x: 1},
//   ];

//   const doMapReduce = (cb) => {
//     // we will use the in-memory true to test this
//     // prettier-ignore
//     distribution.cfreq.mr.exec(
//         {
//           keys: getDatasetKeys(dataset),
//           map: mapper,
//           reduce: reducer,
//           memory: true,
//         },
//         (e, v) => {
//           try {
//             expect(v).toEqual(expect.arrayContaining(expected));
//             done();
//           } catch (e) {
//             done(e);
//           }
//         },
//     );
//   };

//   let cntr = 0;

//   // for this test, we are using in-memory store
//   dataset.forEach((o) => {
//     const key = Object.keys(o)[0];
//     const value = o[key];
//     distribution.cfreq.mem.put(value, key, (e, v) => {
//       cntr++;
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });

test('(15 pts) add support for iterative map-reduce', (done) => {
  // in iter mapreduce, we need to explore each link
  const mapper = (key, value) => {
    const {JSDOM} = require('jsdom');
    // TODO: Replace with actual base URL
    // note it is empty so that we can work with pure urls, be advised we could
    // have links to different parts of the same document
    const baseURL = '';

    // Simulating a db here because I could not get to parsing actual links content to work
    const db = {
      url1: '<html><body><h1>Page 1</h1><p>Welcome to my page.</p><a href="url2">Link to page 2</a></body></html>',
      url2: '<html><body><h1>Page 2</h1><p>This is page 2.</p><a href="url3">Link to page 3</a></body></html>',
      url3: '<html><body><h1>Page 3</h1><p>Final page.</p><a href="url1">Back to 1</a></body></html>',
    };

    // wrap in a JSDOM to parse the HTML
    const dom = new JSDOM(value);
    const doc = dom.window._document;
    const temp = doc.querySelectorAll('a');
    const res = Array.from(temp).map((item) => {
      // need to check if it extends the document (it is a directory/node)
      // or if it is a link to a completely separate website
      const isAbsolute = /^https?:\/\//i.test(item.href);
      if (isAbsolute) {
        return item.href;
      }

      return baseURL + item.href;
    });

    // both are needed for things to print
    console.warn('res', res);
    console.error('soreal');

    const urls = [];
    res.forEach((newUrl) => {
      const valObj = {};
      // need to remove it once its been crawled once, or have it in some kind
      // of seen/visited list, replace this with crawling logic
      valObj['sourceDoc'] = db[newUrl];
      const pushObj = {};
      pushObj[newUrl] = valObj;
      urls.push(pushObj);
    });

    return urls;
  };

  const reducer = (key, values) => {
    // key is the URL, values are its documents
    const sourceDocs = [];
    values.forEach((value) => {
      sourceDocs.push(value.sourceDoc);
    });

    return {[key]: sourceDocs};
  };

  // start with just url 1 and crawl everything
  const dataset = [
    {
      url1: '<html><body><h1>Page 1</h1><p>Welcome to my page.</p><a href="url2">Link to page 2</a></body></html>',
    },
  ];

  // there is currently a bug about not properly cleaning up, but core iterative functionality works:
  // on entrance, only the first url is provided. First round found url2, and third round found url3.
  const expected = [
    {
      url2: [
        '<html><body><h1>Page 2</h1><p>This is page 2.</p><a href="url3">Link to page 3</a></body></html>',
      ],
    },
    {
      url3: [
        '<html><body><h1>Page 3</h1><p>Final page.</p><a href="url1">Back to 1</a></body></html>',
      ],
    },
  ];

  // number of rounds will have to dynamically change, we can probably
  // keep track of things visited already, and stop when we have no new links
  // but for now, we will just run it twice
  const doMapReduce = (cb) => {
    distribution.iter.store.get(null, (e, v) => {
      // prettier-ignore
      distribution.iter.mr.exec(
          {keys: v, map: mapper, reduce: reducer, rounds: 2},
          (e, v) => {
            try {
              expect(v).toEqual(expect.arrayContaining(expected));
              done();
            } catch (e) {
              done(e);
            }
          },
      );
    });
  };

  let cntr = 0;

  // Send the dataset to the cluster
  dataset.forEach((o) => {
    const key = Object.keys(o)[0];
    const value = o[key];
    distribution.iter.store.put(value, key, (e, v) => {
      cntr++;
      // Once the dataset is in place, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});

// function getDatasetKeys(dataset) {
//   return dataset.map((o) => Object.keys(o)[0]);
// }

beforeAll((done) => {
  const fs = require('fs');
  const path = require('path');

  fs.rmSync(path.join(__dirname, '../../store'), {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(path.join(__dirname, '../../store'));

  ncdcGroup[id.getSID(n1)] = n1;
  ncdcGroup[id.getSID(n2)] = n2;
  ncdcGroup[id.getSID(n3)] = n3;

  avgwrdlGroup[id.getSID(n1)] = n1;
  avgwrdlGroup[id.getSID(n2)] = n2;
  avgwrdlGroup[id.getSID(n3)] = n3;

  cfreqGroup[id.getSID(n1)] = n1;
  cfreqGroup[id.getSID(n2)] = n2;
  cfreqGroup[id.getSID(n3)] = n3;

  iterativeGroup[id.getSID(n1)] = n1;
  iterativeGroup[id.getSID(n2)] = n2;
  iterativeGroup[id.getSID(n3)] = n3;

  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  distribution.node.start((server) => {
    localServer = server;

    const ncdcConfig = {gid: 'ncdc'};
    // prettier-ignore
    startNodes(() => {
      distribution.local.groups.put(ncdcConfig, ncdcGroup, (e, v) => {
        distribution.ncdc.groups.put(ncdcConfig, ncdcGroup, (e, v) => {
          const avgwrdlConfig = {gid: 'avgwrdl'};
          distribution.local.groups.put(avgwrdlConfig, avgwrdlGroup, (e, v) => {
            distribution.avgwrdl.groups.put(
                avgwrdlConfig,
                avgwrdlGroup,
                (e, v) => {
                  const cfreqConfig = {gid: 'cfreq'};
                  distribution.local.groups.put(
                      cfreqConfig,
                      cfreqGroup,
                      (e, v) => {
                        distribution.cfreq.groups.put(
                            cfreqConfig,
                            cfreqGroup,
                            (e, v) => {
                              const iterConfig = {gid: 'iter'};
                              distribution.local.groups.put(
                                  iterConfig,
                                  iterativeGroup,
                                  (e, v) => {
                                    distribution.iter.groups.put(
                                        iterConfig,
                                        iterativeGroup,
                                        (e, v) => {
                                          done();
                                        },
                                    );
                                  },
                              );
                            },
                        );
                      },
                  );
                },
            );
          });
        });
      });
    });
  });
});

afterAll((done) => {
  const remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
        done();
      });
    });
  });
});
