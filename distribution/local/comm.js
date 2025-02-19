/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */

const http = require('node:http');
const util = require('../util/serialization');
const { type } = require("node:os");


/**
 * @typedef {Object} Target
 * @property {string} service
 * @property {string} method
 * @property {Node} node
 */

/**
 * @param {Array} message
 * @param {Target} remote
 * @param {Callback} [callback]
 * @return {void}
 */
function send(message, remote, callback) {
    global.moreStatus.counts++;
    callback = callback || function() {};
    if (arguments.length < 3) {
        if (typeof message === "function") {
            message(new Error("not enough arguments, need message, remote, callback"), null);
        } else {
            remote(new Error("not enough arguments, need message, remote, callback"), null);
        }
        return;
    }


    let node;
    if (typeof remote.node === "string") {
        node = util.deserialize(remote.node);
        remote.node = node;
    } else {
        node = remote.node;
    }
    //console.log(remote);
    const sending = {message, remote}
    const serializedInput = util.serialize(sending);

    let group = "local";
    let error = null;
    if (remote.gid) {
        group = remote.gid;
        error = {};
    }
    const path = `/${group}/${remote.service}/${remote.method}`

    const options = {
        hostname: node.ip, 
        port: node.port,       
        path: path,
        method: 'PUT',
    };


    // Create the HTTP request
    const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk.toString();
        });

        res.on('end', () => {
            if (res.statusCode !== 200) {
                callback(util.deserialize(responseData), null);
            } else {
                callback(error, util.deserialize(responseData));
            }
            // console.log(responseData);
            // console.log('\n');
        });
    });

    req.on('error', (err) => {
        callback(new Error(err), null);
    });

    // Send the request body
    req.write(serializedInput);
    req.end();
}

module.exports = {send};
