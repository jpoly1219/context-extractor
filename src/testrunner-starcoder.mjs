import { joinFiles } from "./testrunner-core.js";
import { execSync } from "child_process";
import * as fs from "fs";

// initialize run data
const runData = {
  "option-llm": "starcoder",
  "option-source_path": "",
  "option-expected_type": "",
  "option-relevant_ctx": "",
  "option-error_rounds_max": "",
  "option-temperature": "0.5",
  "commit": "",
  "start-time": "",
  "round-usage-prompt-tokens": "",
  "round-usage-completion-tokens": "",
  "round-usage-total-tokens": "",
  "end-time": "",
  "tests-total": "",
  "tests-pass": "",
  "tests-fail": "",
  "derived-time-elapsed": "",
  "derived-percent-tests": "",
  "derived-err-rounds-used": "",
  "derived-total-tokens-used": "",
  "derived-final-parses": "",
  "derived-final-static-errors": "",
};

// node src/testrunner-starcoder.js $bashTimestamp $unixTimestamp --run-name \"$run_name\" --type-constraint \"$type_constraint\" --relevant-ctx \"$relevant_ctx\" --source-folder \"$source_folder\" --run-number \"$run_number\"
console.log(process.argv);
const bashTimestamp = process.argv[2];
const unixTimestamp = process.argv[3];
const runName = process.argv[5];
const typeConstraint = process.argv[7];
const relevantCtx = process.argv[9];
const sourceFolder = process.argv[11];
const runNumber = process.argv[13];

const splitted = sourceFolder.split("starcoder-");
let source = (splitted[splitted.length - 1]).split("/")[0];
runData["tests-pass"] = "0";
runData["derived-percent-tests"] = "0";
runData["derived-err-rounds-used"] = "0";

switch (source) {
  case "todo":
    runData["tests-total"] = "12";
    runData["tests-fail"] = "12";
    break;
  case "playlist":
    runData["tests-total"] = "15";
    runData["tests-fail"] = "15";
    break;
  case "passwords":
    runData["tests-total"] = "12";
    runData["tests-fail"] = "12";
    break;
  case "booking":
    runData["tests-total"] = "8";
    runData["tests-fail"] = "8";
    break;
  case "emojipaint":
    runData["tests-total"] = "10";
    runData["tests-fail"] = "10";
    break;
}

// if (relevantCtx === "false") {
//   source = null;
// }

console.log(`source: ${source}`);


runData["option-source_path"] = sourceFolder;
runData["option-expected_type"] = typeConstraint;
runData["option-relevant_ctx"] = relevantCtx;
runData["option-error_rounds_max"] = "0";
runData["commit"] = "";
runData["derived-final-parses"] = "false";
runData["derived-final-static-errors"] = "0";
runData["start-time"] = unixTimestamp;

// directory defintions
const projectRoot = `/home/jacob/projects/testtslspclient`;
const outDirRoot = `testout/${runName + "-" + bashTimestamp}`;
fs.mkdirSync(outDirRoot, { recursive: true }, (err) => { if (err) throw err; });

// TODO: save llm-related metadata fields

// mock llm
const llmOut = JSON.parse(fs.readFileSync(`${projectRoot}/starcoder/llm_out.json`, "utf8"));
let currentLLMOut;
if (typeConstraint === "false" && relevantCtx === "false") {
  currentLLMOut = llmOut[source]["none"];
} else if (typeConstraint === "true" && relevantCtx === "false") {
  currentLLMOut = llmOut[source]["types"];
} else if (typeConstraint === "false" && relevantCtx === "true") {
  currentLLMOut = llmOut[source]["context"];
} else if (typeConstraint === "true" && relevantCtx === "true") {
  currentLLMOut = llmOut[source]["types_context"];
}

fs.writeFileSync(`${sourceFolder}llm_completed_sketch.ts`, currentLLMOut[parseInt(runNumber) - 1].toString());

// join files into a single test_suite file
const testSuiteContent = joinFiles([
  `${sourceFolder}prelude.ts`,
  `${sourceFolder}llm_completed_sketch.ts`,
  `${sourceFolder}epilogue.ts`
]);

fs.writeFileSync(`${sourceFolder}test_suite.ts`, testSuiteContent);

// compile test_suite for static error checking
try {
  execSync(`tsc ${sourceFolder}test_suite.ts`);
} catch (err) {
  console.log("\n\n=== FAILED TO COMPILE ===\n\n");
  runData["end-time"] = Math.floor(Date.now() / 1000).toString();

  // capture error messages
  const errorMsg = err.stdout.toString();
  console.log(`error: \n${err.toString()}`);
  console.log(`stdout: \n${errorMsg}`);

  // capture number of static errors
  const numErrors = execSync(`echo \"${err.stdout.toString()}\" | grep "error TS" | wc -l`);
  console.log("numErrors: ", numErrors.toString());
  runData["derived-final-static-errors"] = numErrors.toString().split("\n")[0];

  runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
  console.log(runData);

  const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-fail`}`;
  fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
  execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
  execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
  execSync(`cp -r ${projectRoot}/src ${backupDir}`)
  execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
  fs.writeFileSync(`${backupDir}/llm_out.json`, currentLLMOut.toString());

  let runDataStr = "";
  for (const [k, v] of Object.entries(runData)) {
    runDataStr += k + ":" + v + "\n";
  }

  fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
  fs.writeFileSync(`${backupDir}/run.data`, runDataStr);

  execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
  process.exit(1);
}

// run the tests
console.log("\n\n=== Running Test Suite ===\n\n")

try {
  const testResult = execSync(`node ${sourceFolder}test_suite.js`);
  console.log("testResult: ", testResult.toString().split("\n"));
  const splitTestResult = testResult.toString().split("\n");

  runData["tests-total"] = splitTestResult[splitTestResult.length - 2].split(" ")[3];
  runData["tests-pass"] = splitTestResult[splitTestResult.length - 2].split(" ")[1];
  runData["tests-fail"] = (parseInt(runData["tests-total"]) - parseInt(runData["tests-pass"])).toString();
  runData["derived-percent-tests"] = (parseInt(runData["tests-pass"]) / parseInt(runData["tests-total"])).toString();

} catch (err) {
  console.log("error!")
  console.log("testResult: ", err.toString().split("\n"));
  runData["end-time"] = Math.floor(Date.now() / 1000).toString();
  runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
  console.log(runData);

  const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-fail`}`;
  fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
  execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
  execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
  execSync(`cp -r ${projectRoot}/src ${backupDir}`)
  execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
  fs.writeFileSync(`${backupDir}/llm_out.json`, currentLLMOut.toString());

  let runDataStr = "";
  for (const [k, v] of Object.entries(runData)) {
    runDataStr += k + ":" + v + "\n";
  }

  fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
  fs.writeFileSync(`${backupDir}/run.data`, runDataStr);

  execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
  process.exit(1);
}

// backup and write
runData["end-time"] = Math.floor(Date.now() / 1000).toString();
runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
runData["derived-final-parses"] = "true";
console.log(runData);

const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-pass`}`;
fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
execSync(`cp -r ${projectRoot}/src ${backupDir}`)
execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
fs.writeFileSync(`${backupDir}/llm_out.json`, currentLLMOut.toString());

let runDataStr = "";
for (const [k, v] of Object.entries(runData)) {
  runDataStr += k + ":" + v + "\n";
}

fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
fs.writeFileSync(`${backupDir}/run.data`, runDataStr);

execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
process.exit(0);

