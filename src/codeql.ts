import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { parseCodeQLRelevantTypes, parseCodeQLVars } from "./utils";
import { relevantTypeObject, varsObject } from "./types";

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

const extractRelevantContext = (vars: Map<string, varsObject>, relevantTypes: Map<string, relevantTypeObject>): Map<string, varsObject> => {
  const m = new Map<string, varsObject>();
  // for each var in vars, check if its type is equivalent to any of relevantTypes
  vars.forEach((value, key) => {
    const type = getTypeFromAnnotation(value);
    extractRelevantContextHelper(type, relevantTypes);
  })
}

const getTypeFromAnnotation = (variable: varsObject): string => {
  // if not a function, return as is
  if (variable.typeQLClass !== "FunctionTypeExpr") return variable.typeAnnotation;
  // if function, strip argument names
  const arrowTypeRegexPattern = "(\()";
  for (let i = 0; i < variable.numArgs; ++i) {
    arrowTypeRegexPattern.concat("(.+: )(.+)(, )");
  }

  arrowTypeRegexPattern.concat("(\))");
  const pattern = new RegExp(arrowTypeRegexPattern)
  const matches = variable.typeAnnotation.match(pattern);

  const arrowType = "(";
  for (let i = 1; i <= variable.numArgs; ++i) {
    arrowType.concat(matches![3 * i]);
    if (i < variable.numArgs) {
      arrowType.concat(", ");
    }
  }
  arrowType.concat(`) => ${variable.returnType}`);

  return arrowType;
}

const extractRelevantContextHelper = (type: string, relevantTypes: Map<string, relevantTypeObject>) => {
  // TODO:
  // extract types that are consistent to any of the target types
  // extract functions whose return types are equivalent to any of the target types
  // extract products whose component types are equivalent to any of the target types
}

const isTypeEquivalent = () => {

}

const normalize = () => {

}
