import { relevantTypeObject, varsObject, typesObject } from "./types";

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

// const stripSurroundingWhitespace = (str: string): string => {
//   if (str[0] === " ") return stripSurroundingWhitespace(str.slice(1));
//   if (str[-1] === " ") return stripSurroundingWhitespace(str.slice(0, str.length - 1));
//   return str;
// }

const escapeQuotes = (typeSpan: string): string => {
  return typeSpan.replace(/"/g, `\\"`);
}

const parseCodeQLRelevantTypes = (table: string): Map<string, relevantTypeObject> => {
  const m = new Map<string, relevantTypeObject>();

  const rows = table.split("\n").slice(2, table.length - 1);
  rows.forEach(row => {
    const cols = row.split("|").map(col => {
      return col.trim();
    });

    const declaration = cols[1];
    const name = cols[2];
    const definition = cols[3];
    const qlClass = cols[4];
    m.set(name, { typeAliasDeclaration: declaration, typeName: name, typeDefinition: definition, typeQLClass: qlClass })
  })

  return m;
}

const parseCodeQLVars = (table: string): Map<string, varsObject> => {
  const m = new Map<string, varsObject>();

  const rows = table.split("\n").slice(2, table.length - 1);
  rows.forEach(row => {
    const cols = row.split("|").map(col => {
      return col.trim();
    });

    const declaration = cols[1];
    const bindingPattern = cols[2];
    const typeAnnotation = cols[3];
    const init = cols[4];
    const qlClass = cols[5];
    const functionReturnType = cols[6];
    m.set(bindingPattern, { constDeclaration: declaration, bindingPattern: bindingPattern, typeAnnotation: typeAnnotation, init: init, typeQLClass: qlClass, functionReturnType: functionReturnType });
  })

  return m;
}

const parseCodeQLTypes = (table: string): typesObject[] => {
  const arr: typesObject[] = [];

  const rows = table.split("\n").slice(2, table.length - 1);
  rows.forEach(row => {
    const cols = row.split("|").map(col => {
      return col.trim();
    });

    const typeName = cols[1];
    const typeQLClass = cols[2];
    arr.push({ typeName: typeName, typeQLClass: typeQLClass });
  })

  return arr;
}

const isQLFunction = (typeQLClass: string): boolean => {
  return typeQLClass === "FunctionTypeExpr";
}

const isQLTuple = (typeQLClass: string): boolean => {
  return typeQLClass === "TupleTypeExpr";
}

const isQLUnion = (typeQLClass: string): boolean => {
  return typeQLClass === "UnionTypeExpr";
}

const isQLArray = (typeQLClass: string): boolean => {
  return typeQLClass === "ArrayTypeExpr";
}

const isQLInterface = (typeQLClass: string): boolean => {
  return typeQLClass === "InterfaceTypeExpr";
}

const isQLLocalTypeAccess = (typeQLClass: string): boolean => {
  return typeQLClass === "LocalTypeAccess";
}

const isQLPredefined = (typeQLClass: string): boolean => {
  return typeQLClass === "PredefinedTypeExpr";
}

const isQLLiteral = (typeQLClass: string): boolean => {
  return typeQLClass === "LiteralTypeExpr";
}

const isQLKeyword = (typeQLClass: string): boolean => {
  return typeQLClass === "KeywordTypeExpr";
}

export {
  indexOfRegexGroup,
  formatTypeSpan,
  isTuple,
  isUnion,
  isArray,
  isObject,
  isFunction,
  isPrimitive,
  isTypeAlias,
  escapeQuotes,
  parseCodeQLRelevantTypes,
  parseCodeQLVars,
  parseCodeQLTypes,
  isQLFunction,
  isQLTuple,
  isQLUnion,
  isQLArray,
  isQLInterface,
  isQLLocalTypeAccess,
  isQLPredefined,
  isQLLiteral,
  isQLKeyword
};
