const gossip = {};

const seenMessages = new Set();

gossip.recv = function(payload, callback) {
    // seen messages?
    // payload: message, remote, mid, gid
    // console.log('here');
    // console.log('\n');
    // not sure if we can return or callback
    if (seenMessages.has(payload.mid)) {
        callback(new Error("message seen before"));
        return;
    }

    seenMessages.add(payload.mid);
    const message = payload.message;
    const remote = payload.remote;
    const group = payload.gid;

    // gossip yourself
    global.distribution[group].gossip.send(payload, remote);
    remote.node = global.nodeConfig;

    global.distribution.local.comm.send(message, remote, (e, v) => {
        callback(e, v);
    })
    
};

module.exports = gossip;
