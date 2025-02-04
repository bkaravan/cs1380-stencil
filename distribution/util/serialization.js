function serialize(object) {
  const idMap = new Map();
  let idCount = 0;

  function serializeRe(object) {
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
        if (idMap.has(object)) {
          out["type"] = "reference";
          out["value"] = [`"${idMap.get(object)}"`];
          return JSON.stringify(out);
        }
        idMap.set(object, idCount++);
        out["type"] = "function";
        out["value"] = object.toString();
        break;
      case "object":
        if (object === null) { 
          out["type"] = "null";
          out["value"] = "";
          break;
        } 

        if (idMap.has(object)) {
          out["type"] = "reference";
          out["value"] = [`"${idMap.get(object)}"`];
          return JSON.stringify(out);
        }
        
        idMap.set(object, idCount++);
        
        if (Array.isArray(object)) {
          out["type"] = "array";
          out["value"] = {}
          for (let i = 0; i < object.length; i++) {
            out["value"][i] = serializeRe(object[i])
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
            out["value"][k] = serializeRe(object[k]);
          }
        }
        break;
    }
    return JSON.stringify(out);
  }

  return serializeRe(object);
}


function deserialize(string) {
  const idMap = new Map();
  let currentId = 0;

  function deserializeRe(string) {
    const parsed = JSON.parse(string)
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
      case "object":
        out = {}
        for (const k in parsed['value']) {
          out[k] = deserialize(parsed['value'][k])
        }
        break;
      case "array":
        out = []
        for (const ind in parsed['value']) {
          out.push(deserialize(parsed['value'][ind]))
        }
        break;
      case "date":
        return new Date(parsed["value"]);
      case "error":
        const err = new Error(deserialize(parsed["value"]["message"]));
        err.name = deserialize(parsed["value"]["name"]);
        const cause = deserialize(parsed["value"]["cause"])
        if (cause !== undefined) {
          err.cause = cause;
        }
        return err;
      case "reference":
        
    }
    return out
  }

  return deserializeRe(string);
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
