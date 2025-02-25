const distribution = require('@brown-ds/distribution');
const id = require('../util/id')

const memMap = new Map();

function put(state, configuration, callback) {
    callback = callback || function() {}

    if (arguments.length < 3) {
        if (typeof state === "function") {
            state(new Error("expected value, key, and callback"));
            return
        }
        configuration(new Error("expected value, key, and callback"));
        return
    }

    // need to account for gid and sid
    if (!configuration) {
        configuration = id.getID(state);
    } else if (typeof configuration === "object") {
        let gid = configuration.gid || "local";
        let sid = global.distribution.status.moreStatus.sid;
        let key = configuration.key;
        configuration = `${gid}-${sid}-${key}`;
    }
    // hash it because why not
    configuration = id.getID(configuration);

    memMap.set(configuration, state);

    callback(null, memMap.get(configuration));
};

function get(configuration, callback) {

    if (typeof configuration === "object") {
        let gid = configuration.gid || "local";
        let sid = global.distribution.status.moreStatus.sid;
        let key = configuration.key;
        configuration = `${gid}-${sid}-${key}`;
    }

    configuration = id.getID(configuration);
    if (!memMap.has(configuration)) {
        callback(new Error(`no such value: ${configuration} in mem`));
        return;
    }

    callback(null, memMap.get(configuration));
}

function del(configuration, callback) {

    // support for objects
    if (typeof configuration === "object") {
        let gid = configuration.gid || "local";
        let sid = global.distribution.status.moreStatus.sid;
        let key = configuration.key;
        configuration = `${gid}-${sid}-${key}`;
    }

    configuration = id.getID(configuration);
    if (!memMap.has(configuration)) {
        callback(new Error(`no such value: ${configuration} in mem`));
        return;
    }

    const target = memMap.get(configuration);
    memMap.delete(configuration);

    callback(null, target);
};

module.exports = {put, get, del};
