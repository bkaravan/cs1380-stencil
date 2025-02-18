const id = require('../util/id');

const groups = {};

const groupMap = new Map();
groupMap.set("all", new Map());

groups.get = function(name, callback) {
    if (arguments.length !== 2) {
        name(new Error("invalid arguments, expected name and callback"), null);
        return;
    }

    if (!groupMap.has(name)) {
        callback(new Error('no such name in groupMap'), null);
        return;
    }

    callback(null, groupMap.get(name));
};

groups.put = function(config, group, callback) {
    // puts the name in the map
    if (arguments.length !== 3) {
        if (typeof config === "function") {
            config(new Error("invalid arguments, expected config, group, and callback"), null);
        } else {
            group(new Error("invalid arguments, expected config, group, and callback"), null);
        }
        return;
    }

    if (typeof config === "string") {
        groupMap.set(config, group);
        config = {"gid": config};
    }

    const name = config.gid;
    groupMap.set(name, group);

    // this should be of the form id: node
    Object.keys(group).forEach(sid => {
        groupMap.get('all').set(sid, group[sid]);
    }) 

    global.distribution[name] = {};

    // do we need to add config here?
    global.distribution[name].status = require('../all/status')(config);
    global.distribution[name].groups = require('../all/groups')(config);
    global.distribution[name].routes = require('../all/routes')(config);
    global.distribution[name].comm = require('../all/comm')(config);
    global.distribution[name].gossip = require('../all/gossip')(config);
    global.distribution[name].mem = require('../all/mem')(config);
    global.distribution[name].store = require('../all/store')(config);
    global.distribution[name].mr = require('../all/mr')(config);    

    callback(null, groupMap.get(name));
};

groups.del = function(name, callback) {
    if (arguments.length !== 2) {
        name(new Error("invalid arguments, expected name and callback"), null);
        return;
    }

    if (!groupMap.has(name)) {
        callback(new Error('no such name in groupMap'), null);
        return;
    }
    const target = groupMap.get(name);
    groupMap.delete(name);
    callback(null, target);
};

groups.add = function(name, node, callback) {
    // if (arguments.length !== 3) {
    //     if (typeof name === "function") {
    //         name(new Error("invalid arguments, expected name, node, and callback"), null);
    //     } else {
    //         node(new Error("invalid arguments, expected name, node, and callback"), null);
    //     }
    //     return;
    // }

    if (groupMap.has(name)) {
        groupMap.get(name)[id.getSID(node)] = node;
    }
    if (callback) {
        callback(null, groupMap.get(name));
    }
};

groups.rem = function(name, node, callback) {
    // if (arguments.length !== 3) {
    //     if (typeof name === "function") {
    //         name(new Error("invalid arguments, expected name, node, and callback"), null);
    //     } else {
    //         node(new Error("invalid arguments, expected name, node, and callback"), null);
    //     }
    //     return;
    // }

    // do we need to delete completely if it's the last node?
    if (groupMap.has(name)) {
        delete groupMap.get(name)[node];
    }

    groupMap.get('all').delete(node);

    if (callback) {
        callback(null, groupMap.get(name));
    }
};

module.exports = groups;
