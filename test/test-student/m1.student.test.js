/*
    In this file, add your own test cases that correspond to functionality introduced for each milestone.
    You should fill out each test case so it adequately tests the functionality you implemented.
    You are left to decide what the complexity of each test case should be, but trivial test cases that abuse this flexibility might be subject to deductions.

    Imporant: Do not modify any of the test headers (i.e., the test('header', ...) part). Doing so will result in grading penalties.
*/

const util = require('@brown-ds/distribution/distribution/util/util.js');
const distribution = require('../../config.js');

const { performance } = require('perf_hooks');

const times = [];

test('(1 pts) student test', () => {
  // Fill out this test case..
  //console.log(util.deserialize(string))
});

test('(1 pts) student test', () => {
  // Fill out this test case...
  
  // testing some basic types
  const x = 3;
  const y = 5;
  const a = true;
  const st = "some string";

  const start = performance.now();

  const serX = util.serialize(x);
  const serY = util.serialize(y);
  const serA = util.serialize(a);
  const serStr = util.serialize(st);

  const desX = util.deserialize(serX);
  const desY = util.deserialize(serY);
  const desA = util.deserialize(serA);
  const desStr = util.deserialize(serStr);

  const end = performance.now();

  console.log(`Execution time 1: ${(end - start) / 4.0} ms`);
  times.push((end - start) / 4.0);

  expect(desX + desY).toEqual(8);
  expect(desA).toEqual(true);
  expect(desStr).toEqual("some string");
});


test('(1 pts) student test', () => {
  // Fill out this test case...

  // testing some nested objects
  const y = {one: 1, two : "two"}
  const x = {a: y, b: 2, c: 3};
  const object = {a: x, b: y, c: 1};

  const start = performance.now();

  const serialized = util.serialize(object);
  const deserialized = util.deserialize(serialized);

  const end = performance.now();

  console.log(`Execution time 2: ${end - start} ms`)
  times.push(end - start);

  expect(deserialized).toEqual(object);
});


test('(1 pts) student test', () => {
  // Fill out this test case...

  // testing error and date
    const err = new Error('Not implemented');
    const date = new Date();

    const start = performance.now();

    const serialized = util.serialize(err);
    const deserialized = util.deserialize(serialized);

    const end = performance.now();

    console.log(`Execution time 3: ${end - start} ms`)
    times.push(end - start);

    expect(deserialized.message).toEqual("Not implemented");

    const serializedDate = util.serialize(date);
    expect(date.toString()).toEqual(util.deserialize(serializedDate).toString());
});

test('(1 pts) student test', () => {
  // Fill out this test case...
  // testing normal and native functions

  const fn = process.abort;

  const start = performance.now();

  const serialized = util.serialize(fn);
  const deserialized = util.deserialize(serialized);

  const end = performance.now();

  console.log(`Execution time 4: ${end - start} ms`)
  times.push(end - start);


  expect(deserialized).toBe(process.abort);
  
  const f = function(a, b) {return a * b;};
  const original = [f];
  const serializedF = util.serialize(original);
  const deserializedF = util.deserialize(serializedF);

  const start1 = performance.now();

  expect(typeof deserializedF[0]).toBe('function');
  expect(deserializedF[0](5, 5)).toBe(25);

  const end1 = performance.now();

  console.log(`Execution time 5: ${end1 - start1} ms`)
  times.push(end1 - start1);
});

test('(1 pts) student test', () => {
  // Fill out this test case...
  // testing circular references
  const original = {a : 1, b : 2, c : [1]};
  original.self = original;
  original.self2 = original;

  const start = performance.now();

  const serialized = util.serialize(original);
  const deserialized = util.deserialize(serialized);

  const end = performance.now();

  console.log(`Execution time 6: ${end - start} ms`)
  times.push(end - start);
  expect(deserialized).toEqual(original);

  const avg = times.reduce((acc, num) => acc + num, 0) / times.length;
  console.log(`Average time: ${avg} ms`);
});