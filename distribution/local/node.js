const http = require('http');
const url = require('url');
const log = require('../util/log');
const util = require('../util/util');
const routes = require('../local/routes')

/*
    The start function will be called to start your node.
    It will take a callback as an argument.
    After your node has booted, you should call the callback.
*/


const start = function(callback) {
  const server = http.createServer((req, res) => {
    /* Your server will be listening for PUT requests. */
    // Write some code...


    if (req.method !== "PUT") {
      res.writeHead(500);
      res.end(util.serialize(new Error('Expecting only PUT requests')));
    }

    // update the counter on any put request

    /*w
      The path of the http request will determine the service to be used.
      The url will have the form: http://node_ip:node_port/service/method
    */

    const parsedUrl = url.parse(req.url, true); // Parse URL
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean); // Remove empty parts

    if (pathParts.length < 3) {
      res.writeHead(500);
      res.end(util.serialize(new Error(`Invalid request. Expected format: /gid/service/method`)));
    }
    const gid = pathParts[0]
    const service = pathParts[1]; 
    const method = pathParts[2];  


    /*

      A common pattern in handling HTTP requests in Node.js is to have a
      subroutine that collects all the data chunks belonging to the same
      request. These chunks are aggregated into a body variable.

      When the req.on('end') event is emitted, it signifies that all data from
      the request has been received. Typically, this data is in the form of a
      string. To work with this data in a structured format, it is often parsed
      into a JSON object using JSON.parse(body), provided the data is in JSON
      format.

      Our nodes expect data in JSON format.
  */

    // Write some code...

    let body = "";

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {

      /* Here, you can handle the service requests.
      Use the local routes service to get the service you need to call.
      You need to call the service with the method and arguments provided in the request.
      Then, you need to serialize the result and send it back to the caller.
      */

      // Write some code...
      try {
        des = util.deserialize(body);
        routes.get(service, (e, v) => {
          // what to do with method??
          if (e) {
            res.writeHead(500);
            res.end(util.serialize(e));
          } else {
            // can we error because this method does not exist?
            // TODO: double check that
            if (!(method in v)) {
              res.writeHead(500);
              res.end(util.serialize(new Error(`no method ${method} in service ${service}`)));
            } else {
              v[method](...des.message, (e, v) => {
                if (e) {
                  res.writeHead(500);
                  res.end(util.serialize(e));
                } else {
                  res.write(util.serialize(v));
                  res.end();
                }
              });
            }

          }
        });
      } catch (e) {
        res.writeHead(500);
        res.end(util.serialize(e));
      }
    });
  });


  /*
    Your server will be listening on the port and ip specified in the config
    You'll be calling the `callback` callback when your server has successfully
    started.

    At some point, we'll be adding the ability to stop a node
    remotely through the service interface.
  */

  server.listen(global.nodeConfig.port, global.nodeConfig.ip, () => {
    log(`Server running at http://${global.nodeConfig.ip}:${global.nodeConfig.port}/`);
    global.distribution.node.server = server;
    callback(server);
  });

  server.on('error', (error) => {
    // server.close();
    log(`Server error: ${error}`);
    throw error;
  });
};

module.exports = {
  start: start,
};
