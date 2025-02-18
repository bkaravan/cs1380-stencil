const natives = require('repl')._builtinLibs;

function checkNativeFunction(fn) {
  for (const mod of natives) {
      const moduleExports = require(mod);
      for (const key in moduleExports) {
          if (moduleExports[key] === fn) {
              return `${mod}.${key}`;
          }
      }
  }

  return "unknown";
}

function serialize(object) {
  const idMap = new Map();

  function serializeRe(object, parentObj = undefined) {
    const out = {}
    switch (typeof object) {
      case "string":
      case "number":
      case "boolean":
        out["type"] = typeof object;
        out["value"] = object.toString();
        break;
      case "undefined":
        out["type"] = "undefined";
        out["value"] = "";
        break;
      case "function":
        const isNative = checkNativeFunction(object);
        if (isNative === "unknown") {
          out["type"] = "function";
          out["value"] = object.toString();
        } else {
          out["type"] = "native"
          out["value"] = isNative;
        }
        break;
      case "object":
        if (object === null) { 
          out["type"] = "null";
          out["value"] = "";
          break;
        } 

        if (idMap.has(object)) {
          out["type"] = "reference";
          out["value"] = idMap.get(object);
          return JSON.stringify(out);
        }

        if (parentObj === undefined) {
          idMap.set(object, []);
        } else {
          idMap.set(object, [parentObj])
        }
        
        if (Array.isArray(object)) {
          out["type"] = "array";
          out["value"] = {}
          for (let i = 0; i < object.length; i++) {
            out["value"][i] = serializeRe(object[i], i)
          }
        } else if (object instanceof Date) {
          out["type"] = "date";
          out["value"] = object.toISOString();
        } else if (object instanceof Error) {
          out["type"] = "error";
          out["value"] = {}
          out["value"]["name"] = serializeRe(object.name);
          out["value"]["message"] = serializeRe(object.message);
          out["value"]["cause"] = serializeRe(object.cause);  
        } else {
          out["type"] = "object"
          out["value"] = {}
          for (const k in object) {
            out["value"][k] = serializeRe(object[k], k);
          }
        }
        break;
    }
    return JSON.stringify(out);
  }

  return serializeRe(object, undefined);
}


function deserialize(stringMain) {
  const idMap = new Map();

  function deserializeRe(string, parentObj = undefined) {
    const parsed = JSON.parse(string);
    // console.log(parsed);
    let out; 
    switch (parsed["type"]) {
      case "string": return parsed["value"]
      case "number": return Number(parsed["value"])
      case "boolean": return Boolean(parsed["value"] === "true")
      case "undefined":
        return undefined;
      case "null":
        return null;
      // mallicious acting possible!!
      case "function":
        return eval("(" + parsed["value"] + ")");
      case "native":
        for (const mod of natives) {
          const moduleExports = require(mod);
          for (const key in moduleExports) {
            if (`${mod}.${key}` === parsed["value"]) {
              return moduleExports[key];
            }
          }
      }
      case "object":
        out = {}
        if (parentObj === undefined) {
          idMap.set("root", out);
        } else {
          idMap.set(parentObj, out)
        }
        for (const k in parsed['value']) {
          out[k] = deserializeRe(parsed['value'][k], k)
        }
        break;
      case "array":
        out = []
        if (parentObj === undefined) {
          idMap.set("root", out);
        } else {
          idMap.set(parentObj, out)
        }
        for (const ind in parsed['value']) {
          out.push(deserializeRe(parsed['value'][ind], ind))
        }
        break;
      case "date":
        return new Date(parsed["value"]);
      case "error":
        const err = new Error(deserializeRe(parsed["value"]["message"]));
        err.name = deserializeRe(parsed["value"]["name"]);
        const cause = deserializeRe(parsed["value"]["cause"])
        if (cause !== undefined) {
          err.cause = cause;
        }
        return err;
      case "reference":
        // need a map that stores references
        // console.log(idMap.size)
        if (parsed["value"].length === 0) {
          //console.log(idMap.get("root"))
          return idMap.get("root")
        }
        //console.log(idMap.get(parsed["value"][0]))
        return idMap.get(parsed["value"][0]);
    }
    return out
  }

  return deserializeRe(stringMain);
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
