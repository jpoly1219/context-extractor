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

const extractRelevantContext = (vars: Map<string, varsObject>) => {
}

const extractRelevantContextHelper = () => {

}

const isTypeEquivalent = () => {

}

const normalize = () => {

}
