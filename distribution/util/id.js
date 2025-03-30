/** @typedef {import("../types.js").Node} Node */

const assert = require('assert');
const crypto = require('crypto');

// The ID is the SHA256 hash of the JSON representation of the object
/** @typedef {!string} ID */

/**
 * @param {any} obj
 * @return {ID}
 */
function getID(obj) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(obj));
  return hash.digest('hex');
}

/**
 * The NID is the SHA256 hash of the JSON representation of the node
 * @param {Node} node
 * @return {ID}
 */
function getNID(node) {
  node = {ip: node.ip, port: node.port};
  return getID(node);
}

/**
 * The SID is the first 5 characters of the NID
 * @param {Node} node
 * @return {ID}
 */
function getSID(node) {
  return getNID(node).substring(0, 5);
}


function getMID(message) {
  const msg = {};
  msg.date = new Date().getTime();
  msg.mss = message;
  return getID(msg);
}

function idToNum(id) {
  const n = parseInt(id, 16);
  assert(!isNaN(n), 'idToNum: id is not in KID form!');
  return n;
}

function naiveHash(kid, nids) {
  nids.sort();
  return nids[idToNum(kid) % nids.length];
}

function consistentHash(kid, nids) {
  const ring = [];
  const backMap = {};
  nids.forEach((nid) => {
    const currId = idToNum(nid);
    ring.push(currId);
    backMap[currId] = nid;
  });

  const kidId = idToNum(kid);
  ring.push(kidId);
  ring.sort((a, b) => a - b);
  let chosen = -1;
  for (let i = 0; i < ring.length; i++) {
    if (ring[i] === kidId) {
      chosen = ring[(i + 1) % ring.length];
      break;
    }
  }
  return backMap[chosen];
}


function rendezvousHash(kid, nids) {
  const rendezvousIds = [];
  const backMap = {};

  nids.forEach((nid) => {
    const concat = kid + nid;
    const concatId = idToNum(getID(concat));
    backMap[concatId] = nid;
    rendezvousIds.push(concatId);
  });

  rendezvousIds.sort((a, b) => a - b);

  return backMap[rendezvousIds[nids.length - 1]];
}

module.exports = {
  getID,
  getNID,
  getSID,
  getMID,
  naiveHash,
  consistentHash,
  rendezvousHash,
};
