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
  if (typeSpan[0] === "[" && typeSpan[typeSpan.length - 1] === "]") {
    return true;
  }
  return false;
}

const isUnion = (typeSpan) => {
  if (typeSpan.includes(" | ")) {
    return true;
  }
  return false;
}

const isArray = (typeSpan) => {
  if (typeSpan.slice(-2) === "[]") {
    return true;
  }
  return false;
}

const isObject = (typeSpan) => {
  if (typeSpan[0] === "{" && typeSpan[typeSpan.length - 1] === "}") {
    return true;
  }
  return false;
}

// this is a very rudimentary check, so it should be expanded upon
const isFunction = (typeSpan) => {
  if (typeSpan.includes("=>")) {
    return true;
  }
  return false;
}

const isPrimitive = (typeSpan) => {
  const primitives = ["string", "number", "boolean"];
  if (primitives.includes(typeSpan)) {
    return true;
  }
  return false;
}

const isTypeAlias = (typeSpan) => {
  const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (caps.includes(typeSpan[0])) {
    return true;
  }
  return false;
}

export { indexOfRegexGroup, formatTypeSpan, isTuple, isUnion, isArray, isObject, isFunction, isPrimitive, isTypeAlias };
