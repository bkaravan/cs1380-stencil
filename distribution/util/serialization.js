/*
    Checklist:

    1. Serialize strings
    2. Serialize numbers
    3. Serialize booleans
    4. Serialize (non-circular) Objects
    5. Serialize (non-circular) Arrays
    6. Serialize undefined and null
    7. Serialize Date, Error objects
    8. Serialize (non-native) functions
    9. Serialize circular objects and arrays
    10. Serialize native functions
*/


function serialize(object) {
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
      out["type"] = "function";
      out["value"] = object.toString();
      break;
    case "object":
      if (object === null) { 
        out["type"] = "null";
        out["value"] = "";
      } else if (Array.isArray(object)) {
        // handle array stuff
        out["type"] = "array";
        out["value"] = {}
        for (let i = 0; i < object.length; i++) {
          out["value"][i] = serialize(object[i])
        }
      } else if (object instanceof Date) {
        // handle Date conversion
      } else if (object instanceof Error) {
        // handle Error conversion
      } else {
        // random object
        // this will require more work for lab part
        out["type"] = "object"
        out["value"] = {}
        for (const k in object) {
          out["value"][k] = serialize(object[k]);
        }
      }
      break;
  }

  return JSON.stringify(out);
}


function deserialize(string) {
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
  }
  return out
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
