import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { parseCodeQLRelevantTypes, parseCodeQLVars, parseCodeQLTypes, isQLFunction, isQLTuple, isQLUnion, isQLArray, isQLLocalTypeAccess } from "./utils";
import { relevantTypeObject, varsObject, typesObject } from "./types";
import { CODEQL_PATH, ROOT_DIR, QUERY_DIR, BOOKING_DIR } from "./constants";

const extractRelevantTypes = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): Map<string, relevantTypeObject> => {
  const pathToBqrs = path.join(outDir, "relevant-types.bqrs");
  const pathToDecodedTxt = path.join(outDir, "relevant-types.txt");

  // run CodeQL query relevant-types.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=text --output=${pathToDecodedTxt}`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/relevant-types.bqrs: ${err}`);
  }

  const relevantTypesContent = fs.readFileSync(pathToDecodedTxt);
  const relevantTypes = parseCodeQLRelevantTypes(relevantTypesContent.toString());

  return relevantTypes;
}

const extractVars = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): Map<string, varsObject> => {
  const pathToBqrs = path.join(outDir, "vars.bqrs");
  const pathToDecodedTxt = path.join(outDir, "vars.txt");

  // run CodeQL query vars.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=text --output=${pathToDecodedTxt}`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/vars.bqrs: ${err}`);
  }

  const varsContent = fs.readFileSync(pathToDecodedTxt);
  const vars = parseCodeQLVars(varsContent.toString());

  return vars;
}

const extractTypes = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): typesObject[] => {
  const pathToBqrs = path.join(outDir, "types.bqrs");
  const pathToDecodedTxt = path.join(outDir, "types.txt");

  // run CodeQL query types.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=text --output=${pathToDecodedTxt}`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/types.bqrs: ${err}`);
  }

  const typesContent = fs.readFileSync(pathToDecodedTxt);
  const types = parseCodeQLTypes(typesContent.toString());

  return types;
}

const extractRelevantContext = (headers: Map<string, varsObject>, relevantTypes: Map<string, relevantTypeObject>): Map<string, typesObject> => {
  const relevantContext = new Map<string, typesObject>();

  // for each var in vars, check if its type is equivalent to any of relevantTypes
  headers.forEach((header) => {
    if (isQLFunction(header.typeQLClass)) {
      // extractRelevantContextHelper(value.functionSignature, value.typeQLClass, relevantTypes, m);
      const typeOfHeader: typesObject = { typeName: header.functionReturnType, typeQLClass: header.typeQLClass };
      extractRelevantContextHelper(header, typeOfHeader, relevantTypes, relevantContext);
    } else {
      // extractRelevantContextHelper(value.typeAnnotation, value.typeQLClass, relevantTypes, m);
      const typeOfHeader: typesObject = { typeName: header.typeAnnotation, typeQLClass: header.typeQLClass };
      extractRelevantContextHelper(header, typeOfHeader, relevantTypes, relevantContext);
    }
  })

  return relevantContext;
}

const extractRelevantContextHelper = (header: varsObject, headerType: typesObject, relevantTypes: Map<string, relevantTypeObject>, relevantContext: Map<string, typesObject>) => {
  // TODO:
  // extract types that are consistent to any of the target types
  // extract functions whose return types are equivalent to any of the target types
  // extract products whose component types are equivalent to any of the target types
  relevantTypes.forEach(typ => {
    const typObj: typesObject = { typeName: typ.typeName, typeQLClass: typ.typeQLClass };
    if (isTypeEquivalent(headerType, typObj, relevantTypes)) {
      relevantContext.set(headerType.typeName, headerType);
    }

    if (isQLFunction(headerType.typeQLClass)) {
      const q = createReturnTypeQuery(headerType.typeName);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      // could use extractVars
      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      extractRelevantContextHelper(header, queryRes[0], relevantTypes, relevantContext);

    } else if (isQLTuple(headerType.typeQLClass)) {
      const q = createTupleComponentsTypeQuery(headerType.typeName);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      queryRes.forEach(obj => {
        extractRelevantContextHelper(header, obj, relevantTypes, relevantContext);
      })

    } else if (isQLUnion(headerType.typeQLClass)) {
      const q = createUnionComponentsTypeQuery(headerType.typeName);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      queryRes.forEach(obj => {
        extractRelevantContextHelper(header, obj, relevantTypes, relevantContext);
      })

    } else if (isQLArray(headerType.typeQLClass)) {
      const q = createArrayTypeQuery(headerType.typeName);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      if (isTypeEquivalent(queryRes[0], typObj, relevantTypes)) {
        extractRelevantContextHelper(header, queryRes[0], relevantTypes, relevantContext);
      }
    } else if (isQLLocalTypeAccess(headerType.typeQLClass)) {
      const q = createLocalTypeAccessTypeQuery(headerType.typeName);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      extractRelevantContextHelper(header, queryRes[0], relevantTypes, relevantContext);
    }
  });
}

// TODO: re-examine extractRelevantContextHelper

const isTypeEquivalent = (t1: typesObject, t2: typesObject, relevantTypes: Map<string, relevantTypeObject>) => {
  const normT1 = normalize(t1, relevantTypes);
  const normT2 = normalize(t2, relevantTypes);
  return normT1 === normT2;
}

const normalize = (typeSpan: typesObject, relevantTypes: Map<string, relevantTypeObject>) => {

}

const createTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from TypeExpr t",
    `where t.toString() = ${typeToQuery}`,
    "select t.toString(), t.getAPrimaryQlClass().toString()"
  ].join("\n");
}

const createReturnTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from FunctionTypeExpr t",
    `where t.toString() = ${typeToQuery}`,
    "select t.getReturnTypeAnnotation().toString(), t.getReturnTypeAnnotation().getAPrimaryQlClass()"
  ].join("\n");
}

const createTupleComponentsTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from TupleTypeExpr t, TypeExpr e",
    `where t.toString() = ${typeToQuery} and e = t.getAnElementType()`,
    "select e, e.getAPrimaryQlClass()"
  ].join("\n");
}

const createUnionComponentsTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from UnionTypeExpr t, TypeExpr e",
    `where t.toString() = ${typeToQuery} and e = t.getAnElementType()`,
    "select e, e.getAPrimaryQlClass()"
  ].join("\n");
}

const createArrayTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from ArrayTypeExpr t, TypeExpr e",
    `where t.toString() = ${typeToQuery} and e = t.getAnElementType()`,
    "select e.toString(), e.getAPrimaryQlClass()"
  ].join("\n");
}

const createLocalTypeAccessTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from UnionTypeExpr t, TypeExpr e",
    `where t.toString() = ${typeToQuery} and e = t.getAnElementType()`,
    "select e, e.getAPrimaryQlClass()"
  ].join("\n");
}
