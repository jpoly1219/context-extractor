const indexOfRegexGroup = (match: RegExpMatchArray, n: number) => {
  return match.reduce((acc, curr, i) => {
    if (i < 1 || i >= n) return acc;
    return acc + curr.length;
  }, match.index as number)
}

const formatTypeSpan = (typeSpan: string) => {
  return typeSpan.split("").reduce((acc, curr) => {
    if ((curr === "\n" || curr === " ") && acc.slice(-1) === " ") return acc;
    return acc + curr;
  }, "")
}

const isTuple = (typeSpan: string) => {
  return typeSpan[0] === "[" && typeSpan[typeSpan.length - 1] === "]";
}

const isUnion = (typeSpan: string) => {
  return typeSpan.includes(" | ");
}

const isArray = (typeSpan: string) => {
  return typeSpan.slice(-2) === "[]";
}

const isObject = (typeSpan: string) => {
  return typeSpan[0] === "{" && typeSpan[typeSpan.length - 1] === "}";
}

// this is a very rudimentary check, so it should be expanded upon
const isFunction = (typeSpan: string) => {
  return typeSpan.includes("=>");
}

const isPrimitive = (typeSpan: string) => {
  const primitives = ["string", "number", "boolean"];
  return primitives.includes(typeSpan);
}

const isTypeAlias = (typeSpan: string) => {
  const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return caps.includes(typeSpan[0]);
}

export { indexOfRegexGroup, formatTypeSpan, isTuple, isUnion, isArray, isObject, isFunction, isPrimitive, isTypeAlias };
