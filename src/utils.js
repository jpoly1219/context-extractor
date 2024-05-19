const indexOfRegexGroup = (match, n) => {
  let ix = match.index;
  for (let i = 1; i < n; i++)
    ix += match[i].length;
  return ix;
}

const formatTypeSpan = (typeSpan) => {
  let formatted = "";

  for (let i = 0; i < typeSpan.length; i++) {
    if ((typeSpan[i] === "\n" || typeSpan[i] === " ") && formatted.slice(-1) === " ") {
      continue;
    }

    formatted += typeSpan[i];
  }

  return formatted;
}

const isTuple = (typeSpan) => {
  return typeSpan[0] === "[" && typeSpan[typeSpan.length - 1] === "]";
}

const isUnion = (typeSpan) => {
  return typeSpan.includes(" | ");
}

const isArray = (typeSpan) => {
  return typeSpan.slice(-2) === "[]";
}

const isObject = (typeSpan) => {
  return typeSpan[0] === "{" && typeSpan[typeSpan.length - 1] === "}";
}

// this is a very rudimentary check, so it should be expanded upon
const isFunction = (typeSpan) => {
  return typeSpan.includes("=>");
}

const isPrimitive = (typeSpan) => {
  const primitives = ["string", "number", "boolean"];
  return primitives.includes(typeSpan);
}

const isTypeAlias = (typeSpan) => {
  const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return caps.includes(typeSpan[0]);
}

export { indexOfRegexGroup, formatTypeSpan, isTuple, isUnion, isArray, isObject, isFunction, isPrimitive, isTypeAlias };
