
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
        let sid = global.moreStatus.sid;
        let key = configuration.key || id.getID(state);
        configuration = `${sid}-${gid}-${key}`;
    }
    // hash it because why not
    //configuration = id.getID(configuration);

    memMap.set(configuration, state);

    callback(null, memMap.get(configuration));
};

function get(configuration, callback) {

    // implementing null
    if (!configuration || (typeof configuration === "object" && !configuration.key)) {
        if (configuration && configuration.gid) {
            // look for specific keys
            const toRet = []
            for (const [config, _] of memMap) {
                if (config.includes(configuration.gid)) {
                    const key = config.substring(config.lastIndexOf('-') + 1);
                    toRet.push(key)
                }
            }
            callback(null, toRet);
            return;
        }

        // give everything
        callback(null, [...memMap.keys()])
        return;
    }

    if (typeof configuration === "object") {
        let gid = configuration.gid || "local";
        let sid = global.moreStatus.sid;
        let key = configuration.key || id.getID(state);
        configuration = `${sid}-${gid}-${key}`;
    }

    //configuration = id.getID(configuration);
    if (!memMap.has(configuration)) {
        callback(new Error(`no such value: ${configuration} in mem`));
        return;
    }

    callback(null, memMap.get(configuration));
}

function del(configuration, callback) {

    if (!configuration) {
        callback(new Error("no support for null get yet"));
        return;
    }

    // support for objects
    if (typeof configuration === "object") {
        let gid = configuration.gid || "local";
        let sid = global.moreStatus.sid;
        let key = configuration.key || id.getID(state);
        configuration = `${sid}-${gid}-${key}`;
    }

    //configuration = id.getID(configuration);
    if (!memMap.has(configuration)) {
        callback(new Error(`no such value: ${configuration} in mem`));
        return;
    }

    const target = memMap.get(configuration);
    memMap.delete(configuration);

    callback(null, target);
};

module.exports = {put, get, del};
