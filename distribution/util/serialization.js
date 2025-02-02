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
      out["value"] = object;
      break;
    case "undefined":
      out["type"] = "undefined";
      out["value"] = "";
      break;
    case "object":
      if (object === null) { 
        out["type"] = "null";
        out["value"] = "";
      }
      break;
  }

  return JSON.stringify(out);
}


function deserialize(string) {
}

module.exports = {
  serialize: serialize,
  deserialize: deserialize,
};
