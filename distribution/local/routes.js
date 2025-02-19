/** @typedef {import("../types").Callback} Callback */

const local = {
    status: require('./status'),
    comm: require('./comm'),
  };

const serviceMap = new Map();


/**
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function get(configuration, callback) {
    global.moreStatus.counts++;
    callback = callback || function() { };

    let e = null;

    if (!configuration) {
        callback(new Error("missing configuration"), null);
        return;
    }

    if (typeof configuration === "object") {
        if (!("gid" in configuration) || !("service" in configuration)) {
            callback(new Error("Object configuration without gid or service"), null);
            return;
        }
        const name = configuration.gid;
        if (name !== "local") {
            // console.log("should get here");
            // console.log(name);
            // console.log('\n')

            const place = global.distribution[name];
            // console.log(place);
            const service = configuration.service;
            // console.log(service);
            
            if (!(service in place)) {
                callback(new Error("Can't find specified service in this group"), null);
                return;
            }
            // console.log("should get here");
            // console.log(place.configuration.service);
            callback(null, place[service]);
            return;
        }
        configuration = configuration.service;
    }

    if (!(serviceMap.has(configuration)) && !(global.toLocal.has(configuration))) {
        callback(new Error("Service not found"), null);
        return;
    }

    let v = null;
    if (serviceMap.has(configuration)) {
        v = serviceMap.get(configuration);
    } else {
        v = global.toLocal.get(configuration);
    }

    callback(e, v);
}

/**
 * @param {object} service
 * @param {string} configuration
 * @param {Callback} callback
 * @return {void}
 */
function put(service, configuration, callback) {
    global.moreStatus.counts++;
    callback = callback || function() { };

    let e = null;
    let v = null;

    if (!service) {
        e = new Error("service not provided");
        callback(e, v);
        return;
    }

    if (!configuration) {
        e = new Error("missing configuration");
    }
    // looking at future milestones, this might break actually 
    // because it looks like it will reput everything local in here
    else {
        serviceMap.set(configuration, service);
        v = configuration;
    }

    callback(e, v);
}

/**
 * @param {string} configuration
 * @param {Callback} callback
 */
function rem(configuration, callback) {
    global.moreStatus.counts++;
    callback = callback || function() { };

    let e = null;
    let v = null;

    if (!configuration) {
        e = new Error("missing configuration");
    }
    else if (!(serviceMap.has(configuration))) {
        e = new Error("Service not found");
    }

    v = serviceMap.delete(configuration);

    callback(e, v);
};

module.exports = {get, put, rem};
serviceMap.set("routes", module.exports);
serviceMap.set("status", local.status);
serviceMap.set("comm", local.comm);
