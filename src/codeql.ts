import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { parseCodeQLRelevantTypes, parseCodeQLVars, parseCodeQLTypes, isQLFunction, isQLTuple } from "./utils";
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

const extractRelevantContext = (vars: Map<string, varsObject>, relevantTypes: Map<string, relevantTypeObject>): Map<string, varsObject> => {
  const m = new Map<string, varsObject>();

  // for each var in vars, check if its type is equivalent to any of relevantTypes
  vars.forEach((value, key) => {
    if (isQLFunction(value.typeQLClass)) {
      extractRelevantContextHelper(value.functionSignature, value.typeQLClass, relevantTypes, m);
    } else {
      extractRelevantContextHelper(value.typeAnnotation, value.typeQLClass, relevantTypes, m);
    }
  })

  return m;
}

const extractRelevantContextHelper = (typeSpan: string, typeQLClass: string, relevantTypes: Map<string, relevantTypeObject>, relevantContext: Map<string, varsObject>) => {
  // TODO:
  // extract types that are consistent to any of the target types
  // extract functions whose return types are equivalent to any of the target types
  // extract products whose component types are equivalent to any of the target types
  relevantTypes.forEach(typ => {
    if (isTypeEquivalent(typeSpan, typ.typeDefinition, relevantTypes)) {
      relevantContext.set();
    }

    if (isQLFunction(typeQLClass)) {
      const q = createReturnTypeQuery(typeSpan);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      extractRelevantContextHelper(queryRes[0].typeName, queryRes[0].typeQLClass, relevantTypes, relevantContext);















    } else if (isQLTuple(typeSpan)) {
      const q = createTupleComponentsTypeQuery(typeSpan);

      fs.writeFileSync(path.join(QUERY_DIR, "types.ql"), q);

      const queryRes = extractTypes(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), path.join(BOOKING_DIR, "bookingdb"), ROOT_DIR);

      queryRes.forEach(obj => {
        extractRelevantContextHelper(obj.typeName, obj.typeQLClass, relevantTypes, relevantContext);
      })






    } else if (isUnion(typeSpan)) {
      const elements = typeSpan.split(" | ");

      elements.forEach(element => {
        extractRelevantContextHelper(element, relevantTypes, relevantContext, line);
      });












    } else if (isArray(typeSpan)) {
      const element = typeSpan.split("[]")[0];

      if (isTypeEquivalent(element, typ, relevantTypes)) {
        extractRelevantContextHelper(element, relevantTypes, relevantContext, line);
      }
    }
  });
}

const isTypeEquivalent = (t1: string, t2: string, relevantTypes: Map<string, relevantTypeObject>) => {
  const normT1 = normalize(t1, relevantTypes);
  const normT2 = normalize(t2, relevantTypes);
  return normT1 === normT2;
}

const normalize = () => {

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
