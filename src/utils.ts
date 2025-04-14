import * as fs from "fs";
import * as path from "path";
import { relevantTypeObject, varsObject, typesObject, typesQueryResult, varsQueryResult, relevantTypeQueryResult, typesAndLocationsQueryResult, Language } from "./types";

const indexOfRegexGroup = (match: RegExpMatchArray, n: number) => {
  return match.reduce((acc, curr, i) => {
    if (i < 1 || i >= n) return acc;
    return acc + curr.length;
  }, match.index as number)
}

const formatTypeSpan = (typeSpan: string): string => {
  const formatted = typeSpan.split("").reduce((acc, curr) => {
    // if (curr === "\n" || (curr === " " && acc.slice(-1) === " ")) return acc;
    if (curr === "\n") return acc;
    if (curr === " " && acc.slice(-1) === " ") return acc;
    // if (curr === "{") return acc + "{ ";
    // if (curr === "}") return acc + " }";
    return acc + curr;
  }, "")

  return formatted;
}

const extractSnippet = (documentContent: string, start: { line: number, character: number }, end: { line: number, character: number }): string => {
  const lines = documentContent.split('\n');
  const snippet: string[] = [];

  for (let lineNumber = start.line; lineNumber <= end.line; lineNumber++) {
    const line = lines[lineNumber];
    // console.log(line, lineNumber)
    if (line == undefined) continue;

    if (lineNumber === start.line && lineNumber === end.line) {
      // Single-line range
      snippet.push(line.substring(start.character, end.character));
    } else if (lineNumber === start.line) {
      // Starting line of the range
      snippet.push(line.substring(start.character));
    } else if (lineNumber === end.line) {
      // Ending line of the range
      snippet.push(line.substring(0, end.character));
    } else {
      // Entire line within the range
      snippet.push(line);
    }
  }

  return snippet.join('\n');
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

const escapeQuotes = (typeSpan: string): string => {
  return typeSpan.replace(/"/g, `\\"`);
}

const parseTypeArrayString = (typeStr: string): string[] => {
  // Remove all spaces
  const cleaned = typeStr.replace(/\s/g, '');

  // Remove the outermost square brackets
  const inner = cleaned.slice(1, -1);
  // const inner = cleaned.slice(-1) === ";" ? cleaned.slice(1, -2) : cleaned.slice(1, -1);

  // Split the string, respecting nested structures
  const result: string[] = [];
  let currentItem = '';
  let nestLevel = 0;

  for (const char of inner) {
    if (char === '[') nestLevel++;
    if (char === ']') nestLevel--;

    if (char === ',' && nestLevel === 0) {
      // check if currentItem is a name: type pair or just type
      if (currentItem.includes(":")) {
        result.push(currentItem.split(":")[1]);
      } else {
        result.push(currentItem);
      }
      currentItem = '';
    } else {
      currentItem += char;
    }
  }

  if (currentItem.includes(":")) {
    result.push(currentItem.split(":")[1]);
  } else {
    result.push(currentItem);
  }

  return result;
}

const removeLines = (fileContent: string) => {
  const lines = fileContent.split("\n");
  const filtered = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!(line.split(" ").includes("import") || line.split(" ").includes("from") || line.split(" ").includes("export"))) {
      filtered.push(line);
    }
  }

  return filtered;
}

const parseCodeQLRelevantTypes = (table: relevantTypeQueryResult): Map<string, relevantTypeObject> => {
  const m = new Map<string, relevantTypeObject>();

  const rows = table["#select"]["tuples"];
  rows.forEach(row => {
    const typeDeclaration = row[0]["label"];
    const typeName = row[1];
    const typeDefinition = row[2]["label"];
    const typeQLClass = row[3];
    const componentName = row[4]["label"];
    const componentQLClass = row[5];

    if (!m.has(typeName)) {
      m.set(typeName, {
        typeAliasDeclaration: typeDeclaration,
        typeName: typeName,
        typeDefinition: typeDefinition,
        typeQLClass: typeQLClass,
        components: [{ typeName: componentName, typeQLClass: componentQLClass }]
      });
    } else {
      const value = m.get(typeName)!;
      value.components.push({ typeName: componentName, typeQLClass: componentQLClass });
      m.set(typeName, value);
    }
  });

  return m;
}

const parseCodeQLVars = (table: varsQueryResult): Map<string, varsObject> => {
  const m = new Map<string, varsObject>();

  const rows = table["#select"]["tuples"];
  rows.forEach(row => {
    const declaration = row[0]["label"]
    const bindingPattern = row[1]["label"];
    const typeAnnotation = row[2]["label"];;
    const init = row[3]["label"];
    const qlClass = row[4];
    const functionReturnType = row[5];
    const functionReturnTypeQLClass = row[6];
    const componentName = row[7]["label"];
    const componentQLClass = row[8];

    if (!m.has(bindingPattern)) {
      m.set(bindingPattern, {
        constDeclaration: declaration,
        bindingPattern: bindingPattern,
        typeAnnotation: typeAnnotation,
        init: init,
        typeQLClass: qlClass,
        functionReturnType: functionReturnType,
        functionReturnTypeQLClass: functionReturnTypeQLClass,
        components: [{ typeName: componentName, typeQLClass: componentQLClass }]
      });
    } else {
      const value = m.get(bindingPattern)!;
      value.components.push({ typeName: componentName, typeQLClass: componentQLClass });
      m.set(bindingPattern, value);
    }
  });

  return m;
}

const parseCodeQLTypes = (table: typesQueryResult): typesObject[] => {
  const arr: typesObject[] = [];

  const rows = table["#select"]["tuples"];
  rows.forEach(row => {
    const typeName = row[0];
    const typeQLClass = row[1];
    arr.push({ typeName: typeName, typeQLClass: typeQLClass });
  });

  return arr;
}

const parseCodeQLLocationsAndTypes = (table: typesAndLocationsQueryResult): Map<string, string[]> => {
  const locationToTypes = new Map<string, string[]>();

  const rows = table["#select"]["tuples"];
  rows.forEach(row => {
    const typeName = row[0];
    const locatedFile = row[1];
    if (!locationToTypes.has(locatedFile)) {
      locationToTypes.set(locatedFile, [typeName]);
    } else {
      const pair = locationToTypes.get(locatedFile)!;
      pair.push(typeName);
      locationToTypes.set(locatedFile, pair);
    }
  });

  return locationToTypes;
}

const parseCodeQLTypesAndLocations = (table: typesAndLocationsQueryResult): Map<string, string> => {
  const typeToLocation = new Map<string, string>();

  const rows = table["#select"]["tuples"];
  rows.forEach(row => {
    const typeName = row[0];
    const locatedFile = row[1];
    if (!typeToLocation.has(typeName)) {
      typeToLocation.set(typeName, locatedFile);
    } else {
      // NOTE: this should technically be a name collision
      typeToLocation.set(typeName, locatedFile);
    }
  });

  return typeToLocation;
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

const isQLLabel = (typeQLClass: string): boolean => {
  return typeQLClass === "Label";
}

const isQLIdentifier = (typeQLClass: string): boolean => {
  return typeQLClass === "Identifier";
}

const supportsHole = (lang: Language): boolean => {
  const supportedLangs = [Language.OCaml];
  return supportedLangs.includes(lang);
}

const getAllTSFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllTSFiles(filePath, arrayOfFiles);
    } else if (filePath.endsWith(".ts")) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

const getAllOCamlFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllTSFiles(filePath, arrayOfFiles);
    } else if (filePath.endsWith(".ml")) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

const getTimestampForFilename = (): string => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");  // Months are 0-based
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export {
  indexOfRegexGroup,
  formatTypeSpan,
  extractSnippet,
  isTuple,
  isUnion,
  isArray,
  isObject,
  isFunction,
  isPrimitive,
  isTypeAlias,
  escapeQuotes,
  parseTypeArrayString,
  removeLines,
  parseCodeQLRelevantTypes,
  parseCodeQLVars,
  parseCodeQLTypes,
  parseCodeQLLocationsAndTypes,
  parseCodeQLTypesAndLocations,
  isQLFunction,
  isQLTuple,
  isQLUnion,
  isQLArray,
  isQLInterface,
  isQLLocalTypeAccess,
  isQLPredefined,
  isQLLiteral,
  isQLKeyword,
  isQLLabel,
  isQLIdentifier,
  supportsHole,
  getAllTSFiles,
  getAllOCamlFiles,
  getTimestampForFilename
};
