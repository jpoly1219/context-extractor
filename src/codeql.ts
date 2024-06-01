import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { parseCodeQLTable } from "./utils";
import { relevantTypesTable } from "./types";

const extractRelevantTypes = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): relevantTypesTable => {
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

  // save the columns into a map
  const relevantTypesContent = fs.readFileSync(pathToDecodedTxt);
  const relevantTypes = parseCodeQLTable(relevantTypesContent.toString());

  // return the map
  return relevantTypes;
}

const extractRelevantContext = () => {

}

const extractRelevantContextHelper = () => {

}

const isTypeEquivalent = () => {

}

const normalize = () => {

}
