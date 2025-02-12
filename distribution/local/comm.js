/** @typedef {import("../types").Callback} Callback */
/** @typedef {import("../types").Node} Node */

const http = require('node:http');
const util = require('../util/serialization');


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
    callback = callback || function() {};

    if (!message) {
        callback(new Error("No message argument"), null);
        return;
    } else if (!remote) {
        callback(new Error("No remote argument"), null);
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
    const path = `/local/${remote.service}/${remote.method}`

    const options = {
        hostname: node.ip, // Change this to the correct host if needed
        port: node.port,            // Change this to the correct port
        path: path,
        method: 'PUT',
        // not sure if these are needed
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
                callback(null, util.deserialize(responseData));
            }
        });
    });

    req.on('error', (err) => {
        callback(err, null);
    });

    // Send the request body
    req.write(serializedInput);
    req.end();
}

module.exports = {send};
