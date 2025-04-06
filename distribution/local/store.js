/* Notes/Tips:

- Use absolute paths to make sure they are agnostic to where your code is running from!
  Use the `path` module for that.
*/

const fs = require('fs');
const path = require('path');
const id = require('../util/id');

const basePath = path.resolve(__dirname, '../../store');

function makeAlphaNumeric(key) {
  return key.replace(/[^a-zA-Z0-9]/g, ''); // Remove non-alphanumeric characters
}


function put(state, configuration, callback) {
  callback = callback || function() {};

  let key;
  let gid = 'local';
  if (!configuration) {
    key = id.getID(state);
  } else if (typeof configuration === 'string') {
    key = makeAlphaNumeric(configuration);
  } else if (configuration.key) {
    key = makeAlphaNumeric(configuration.key);
    gid = configuration.gid || 'local';
  } else {
    callback(new Error('unsupported configuration'));
    return;
  }

  const sid = global.moreStatus.sid;

  // might need to hash this but will be ugly, but hypothetically, it's enough to distinguish
  // const filename = id.getID(`${gid}-${sid}-${key}`);
  const filename = `${sid}-${gid}-${key}`;

  const toStore = global.distribution.util.serialize(state);

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
  }
  fs.writeFileSync(path.join(basePath, filename), toStore);
  callback(null, state);
}

function get(configuration, callback) {
  try {
    const sid = global.moreStatus.sid;

    if (!configuration || (typeof configuration === 'object' && !configuration.key)) {
      const files = fs.readdirSync(basePath);
      const foundFiles = [];

      files.forEach((file) => {
        if (configuration && configuration.gid) {
          if (file.includes(sid) && file.includes(configuration.gid)) {
            foundFiles.push(file.substring(file.lastIndexOf('-') + 1));
          }
        } else {
          if (file.includes(sid)) {
            foundFiles.push(file.substring(file.lastIndexOf('-') + 1));
          }
        }
      });

      callback(null, foundFiles);
      return;
    } else {
      let key;
      let gid = 'local';
      if (typeof configuration === 'string') {
        key = makeAlphaNumeric(configuration);
      } else if (configuration.key) {
        key = makeAlphaNumeric(configuration.key);
        gid = configuration.gid || 'local';
      } else {
        callback(new Error('unsupported configuration'));
        return;
      }

      const filename = `${sid}-${gid}-${key}`;
      const filepath = path.join(basePath, filename);

      try {
        const data = fs.readFileSync(filepath, 'utf8');
        const toRetrieve = global.distribution.util.deserialize(data);
        callback(null, toRetrieve);
      } catch (err) {
        if (err.code === 'ENOENT') {
          callback(new Error(`No file ${filename} found`));
        } else {
          callback(new Error(err.message));
        }
      }
    }
  } catch (err) {
    callback(err);
  }
}

function del(configuration, callback) {
  try {
    let key;
    let gid = 'local';
    if (typeof configuration === 'string') {
      key = makeAlphaNumeric(configuration);
    } else if (configuration.key) {
      key = makeAlphaNumeric(configuration.key);
      gid = configuration.gid || 'local';
    } else {
      callback(new Error('unsupported configuration'));
      return;
    }

    const sid = global.moreStatus.sid;
    const filename = `${sid}-${gid}-${key}`;
    const filepath = path.join(basePath, filename);

    try {
      const data = fs.readFileSync(filepath, 'utf8');
      const toRetrieve = global.distribution.util.deserialize(data);
      fs.unlinkSync(filepath);
      callback(null, toRetrieve);
    } catch (err) {
      if (err.code === 'ENOENT') {
        callback(new Error(`No file ${filename} found`));
      } else {
        callback(new Error(err.message));
      }
    }
  } catch (err) {
    callback(err);
  }
}


module.exports = {put, get, del};
