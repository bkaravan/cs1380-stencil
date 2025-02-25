/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/

const fs = require("fs");
const path = require("path");
const id = require('../util/id')

const basePath = "/usr/src/app/store";

function makeAlphaNumeric(key) {
  return key.replace(/[^a-zA-Z0-9]/g, ''); // Remove non-alphanumeric characters
}


function put(state, configuration, callback) {
  callback = callback || function() {}

  let key;
  let gid = "local";
  if (!configuration) {
    key = id.getID(state);
  } else if (typeof configuration === "string") {
    key = makeAlphaNumeric(configuration);
  } else if (configuration.key) {
    key = makeAlphaNumeric(configuration.key);
    gid = configuration.gid || "local";
  } else {
    callback(new Error("unsupported configuration"));
    return;
  }

  const sid = global.moreStatus.sid;

  // might need to hash this but will be ugly, but hypothetically, it's enough to distinguish
  //const filename = id.getID(`${gid}-${sid}-${key}`);
  const filename = `${gid}-${sid}-${key}`;

  const toStore = global.distribution.util.serialize(state);

  // filename will need to become more sophisticated to store across groups
  fs.writeFile(path.join(basePath, filename), toStore, (error) => {
    callback(error, state);
  })
}

function get(configuration, callback) {

  let key;
  let gid = "local";
  if (!configuration) {
    key = id.getID(state);
  } else if (typeof configuration === "string") {
    key = makeAlphaNumeric(configuration);
  } else if (configuration.key) {
    key = makeAlphaNumeric(configuration.key);
    gid = configuration.gid || "local";
  } else {
    callback(new Error("unsupported configuration"));
    return;
  }

  const sid = global.moreStatus.sid;

  //const filename = id.getID(`${gid}-${sid}-${key}`);
  const filename = `${gid}-${sid}-${key}`;

  fs.readFile(path.join(basePath, filename), 'utf8', (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        callback(new Error(`No file ${configuration} found`));
    } else {
        callback(new Error(err.message));
    }
    return;
  }
  const toRetrieve = global.distribution.util.deserialize(data);
  callback(null, toRetrieve);
})

}

function del(configuration, callback) {

  let key;
  let gid = "local";
  if (!configuration) {
    key = id.getID(state);
  } else if (typeof configuration === "string") {
    key = makeAlphaNumeric(configuration);
  } else if (configuration.key) {
    key = makeAlphaNumeric(configuration.key);
    gid = configuration.gid || "local";
  } else {
    callback(new Error("unsupported configuration"));
    return;
  }

  const sid = global.moreStatus.sid;

  //const filename = id.getID(`${gid}-${sid}-${key}`);
  const filename = `${gid}-${sid}-${key}`;

  fs.readFile(path.join(basePath, filename), 'utf8', (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        callback(new Error(`No file ${configuration} found`));
    } else {
        callback(new Error(err.message));
    }
    return;
  }
  const toRetrieve = global.distribution.util.deserialize(data);
  fs.unlink(path.join(basePath, filename), (err) => {
    callback(err, toRetrieve);
  })
})
}

module.exports = {put, get, del};
