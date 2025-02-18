import OpenAI from "openai";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { generatePrompt, generateErrorCorrectionPrompt, joinFiles, fillHole, generateTypesAndHeadersPrompt } from "./testrunner-core.mjs";
import { extractWithCodeQL } from "../dist/index.js";

/* PHASE 1: INITIALIZATION */

// initialize run data
const runData = {
  "option-llm": "",
  "option-source_path": "",
  "option-expected_type": "",
  "option-relevant_ctx": "",
  "option-error_rounds_max": "",
  "option-temperature": "",
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


// node testrunner $bashTimestamp $unixTimestamp --run-name \"$run_name\" --type-constraint \"$type_constraint\" --relevant-ctx \"$relevant_ctx\" --error-rounds-max \"$error_rounds_max\" --source-folder \"$source_folder\"
console.log(process.argv);
const bashTimestamp = process.argv[2];
const unixTimestamp = process.argv[3];
const runName = process.argv[5];
const typeConstraint = process.argv[7];
const contextConstraint = process.argv[9];
const errorRoundsMax = process.argv[11];
const sourceFolder = process.argv[13];

const splitted = sourceFolder.split("/");
let source = splitted[splitted.length - 2];
runData["tests-pass"] = "0";
runData["derived-percent-tests"] = "0";

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

console.log(`source: ${source}`);


runData["option-source_path"] = sourceFolder;
runData["option-expected_type"] = typeConstraint;
runData["option-relevant_ctx"] = contextConstraint;
runData["option-error_rounds_max"] = errorRoundsMax;
runData["commit"] = "";
runData["derived-final-parses"] = "false";
runData["derived-final-static-errors"] = "0";
runData["start-time"] = unixTimestamp;

// directory defintions
const projectRoot = process.cwd();
const runID = `${runName}-${source}-types-and-headers-${bashTimestamp}`;
const outDirRoot = path.join(projectRoot, "types-and-headers", "out", runID);
fs.mkdirSync(outDirRoot, { recursive: true }, (err) => { if (err) throw err; });
const logDirRoot = path.join(projectRoot, "types-and-headers", "testlog");
const backupDir = path.join(projectRoot, "types-and-headers", "backup", `${runID}`);
fs.mkdirSync(backupDir, { recursive: true }, (err) => { if (err) throw err; });


/* PHASE 2: TYPE EXTRACTION */

const res = await extractWithCodeQL(path.join(sourceFolder, "sketch.ts"));
const holeType = res.hole;
const relevantTypes = res.relevantTypes;
const relevantHeaders = res.relevantHeaders;

const sketchFilePath = `${path.join(sourceFolder, "sketch.ts")}`;
const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
// let targetTypes = null;
// if (typeConstraint === "true") {
//   console.log("\n\n=== Extracting Types === \n\n");
//   execSync(`node src/app.js ${sourceFolder} sketch.ts`)
//   targetTypes = fs.readFileSync("output.txt", "utf8");
// }


/* PHASE 3: LLM CODE SYNTHESIS */


// ask LLM to complete the sketch using the returned types
console.log("\n\n=== Generating Prompt ===\n\n");
let prompt = [];
if (typeConstraint === "true" && contextConstraint === "true") {
  prompt = generateTypesAndHeadersPrompt(sketchFileContent, holeType, relevantTypes, relevantHeaders);
} else if (typeConstraint === "true") {
  prompt = generateTypesAndHeadersPrompt(sketchFileContent, holeType, relevantTypes, null);
} else if (contextConstraint === "true") {
  prompt = generateTypesAndHeadersPrompt(sketchFileContent, holeType, null, relevantHeaders);
} else {
  prompt = generateTypesAndHeadersPrompt(sketchFileContent, holeType, null, null);
}
// console.log(JSON.stringify(prompt, "", 2));
console.log(prompt);

const apiBase = "https://hazel2.openai.azure.com";
const deployment = "hazel-gpt-4";
const model = "azure-gpt-4";
const apiVersion = "2023-05-15";
const apiKey = process.env.AZURE_KEY_CREDENTIAL;
let totalTokensUsed = 0;

const openai = new OpenAI({
  apiKey,
  baseURL: `${apiBase}/openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': apiVersion },
  defaultHeaders: { 'api-key': apiKey }
});

const llmResult = await openai.chat.completions.create({
  model,
  messages: prompt,
  temperature: 0.6
});

console.log(JSON.stringify(llmResult, "", 2));
fs.writeFileSync(`${path.join(outDirRoot, "llm_out.json")}`, JSON.stringify(llmResult, "", 2) + "\n");
prompt.push(llmResult.choices[0].message);

runData["option-llm"] = model;
runData["option-temperature"] = "0.6";
runData["round-usage-prompt-tokens"] += llmResult.usage.prompt_tokens + ",";
runData["round-usage-completion-tokens"] += llmResult.usage.completion_tokens + ",";
runData["round-usage-total-tokens"] += llmResult.usage.total_tokens + ",";
totalTokensUsed += llmResult.usage.total_tokens;

// write completion to sketch
const llmCompletedSketch = fillHole(sketchFileContent, llmResult.choices[0].message.content);
fs.writeFileSync(`${path.join(sourceFolder, "types_and_headers_llm_completed_sketch.ts")}`, llmCompletedSketch);


/* PHASE 4: ERROR CORRECTION */
console.log("\n\n=== ERROR CORRECTION ===\n\n");

// run tsc to check for syntax errors
let usedErrorRounds = 0;

const testSuiteContent = joinFiles([
  path.join(sourceFolder, "prelude.ts"),
  path.join(sourceFolder, "types_and_headers_llm_completed_sketch.ts"),
  path.join(sourceFolder, "epilogue.ts"),
]);

fs.writeFileSync(`${path.join(sourceFolder, "types_and_headers_test_suite.ts")}`, testSuiteContent);

for (let i = 0; i < parseInt(errorRoundsMax) + 1; i++) {
  try {
    // res = execSync(`tsc ${sourceFolder}llm_completed_sketch.ts`);
    execSync(`tsc ${path.join(sourceFolder, "types_and_headers_test_suite.ts")}`);
    // console.log(`==${res}==`)
    break;
  } catch (err) {
    if (i >= parseInt(errorRoundsMax)) {
      console.log("\n\n=== FAILED TO COMPILE ===\n\n");
      runData["end-time"] = Math.floor(Date.now() / 1000).toString();

      // capture error messages
      const errorMsg = err.stdout.toString();
      console.log(`error: \n ${err.toString()}`);
      console.log(`stdout: \n ${errorMsg}`);

      // capture number of static errors
      const numErrors = execSync(`echo \"${err.stdout.toString()}\" | grep "error TS" | wc -l`);
      console.log("numErrors: ", numErrors.toString());
      runData["derived-final-static-errors"] = numErrors.toString().split("\n")[0];

      runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
      runData["derived-err-rounds-used"] = usedErrorRounds;
      runData["derived-total-tokens-used"] = totalTokensUsed;
      console.log(runData);

      // const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-fail`}`;
      // fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
      execSync(`cp -r ${path.join(sourceFolder, "*.ts")} ${backupDir}`)
      execSync(`cp ${path.join(projectRoot, "*.sh")} ${backupDir}`)
      execSync(`cp -r ${path.join(projectRoot, "src")} ${backupDir}`)
      execSync(`cp ${path.join(logDirRoot, `${runID}.log`)} ${backupDir}`) // TODO: match the log path with run.sh
      execSync(`cp ${path.join(outDirRoot, "llm_out.json")} ${backupDir}`)

      let runDataStr = "";
      for (const [k, v] of Object.entries(runData)) {
        runDataStr += k + ":" + v + "\n";
      }
      fs.writeFileSync(`${path.join(outDirRoot, "run.data")}`, runDataStr);
      fs.writeFileSync(`${path.join(outDirRoot, "FAIL")}`, runDataStr);
      fs.writeFileSync(`${path.join(backupDir, "run.data")}`, runDataStr);
      fs.writeFileSync(`${path.join(backupDir, "FAIL")}`, runDataStr);

      execSync(`rm -f ${path.join(sourceFolder, "erroneous*")} ${path.join(sourceFolder, "completed_sketch*")} ${path.join(sourceFolder, "types_and_headers_llm_completed_sketch*")} ${path.join(sourceFolder, "types_and_headers_test_suite*")} ${path.join(sourceFolder, "*.js")}`);
      process.exit(1);
    } else {

      console.log(`\n\n=== Error Correction Round ${i + 1} ===\n\n`);
      usedErrorRounds += 1;

      // capture error messages
      const errorMsg = err.stdout.toString();
      console.log(`error: \n ${err.toString()}`);
      console.log(`stdout: \n ${errorMsg}`);

      // capture number of static errors
      const numErrors = execSync(`echo \"${err.stdout.toString()}\" | grep "error TS" | wc -l`);
      console.log("numErrors: ", numErrors.toString());
      runData["derived-final-static-errors"] = numErrors.toString().split("\n")[0];

      const errorCorrectionPrompt = generateErrorCorrectionPrompt(prompt, errorMsg);
      // console.log(`errorCorrectionPrompt:\n${JSON.stringify(errorCorrectionPrompt, "", 2)}`);
      prompt = errorCorrectionPrompt;
      console.log(errorCorrectionPrompt)

      // call the llm again
      const llmResult = await openai.chat.completions.create({
        model,
        messages: errorCorrectionPrompt
      });

      console.log(JSON.stringify(llmResult, "", 2))
      fs.writeFileSync(path.join(outDirRoot, "llm_out.json"), JSON.stringify(llmResult, "", 2) + "\n");
      prompt.push(llmResult.choices[0].message);

      runData["round-usage-prompt-tokens"] += llmResult.usage.prompt_tokens + ",";
      runData["round-usage-completion-tokens"] += llmResult.usage.completion_tokens + ",";
      runData["round-usage-total-tokens"] += llmResult.usage.total_tokens + ",";
      totalTokensUsed += llmResult.usage.total_tokens;

      const llmCompletedSketch = fillHole(sketchFileContent, llmResult.choices[0].message.content);

      fs.writeFileSync(`${sourceFolder}types_and_headers_llm_completed_sketch.ts`, llmCompletedSketch);
      const testSuiteContent = joinFiles([
        path.join(sourceFolder, "prelude.ts"),
        path.join(sourceFolder, "types_and_headers_llm_completed_sketch.ts"),
        path.join(sourceFolder, "epilogue.ts"),
      ]);

      fs.writeFileSync(`${path.join(sourceFolder, "types_and_headers_test_suite.ts")}`, testSuiteContent);

    }
  }
}

runData["derived-err-rounds-used"] = usedErrorRounds;
runData["derived-total-tokens-used"] = totalTokensUsed;


/* PHASE 5: TEST SUITE */


console.log("\n\n=== Running Test Suite ===\n\n")
try {
  const testResult = execSync(`node ${path.join(sourceFolder, "types_and_headers_test_suite.js")}`);
  console.log("testResult: ", testResult.toString().split("\n"));
  const splitTestResult = testResult.toString().split("\n");
  console.log(splitTestResult)
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

  // const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-fail`}`;
  // fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
  // execSync(`zip -r ${backupDir}/${runName + "-" + runData["start-time"]}.zip "run_tests.sh" "collate_data.sh" "collated_data.csv" "src" "targets/target-full" "testlog" "testout"`)
  execSync(`cp -r ${path.join(sourceFolder, "*.ts")} ${backupDir}`)
  execSync(`cp ${path.join(projectRoot, "*.sh")} ${backupDir}`)
  execSync(`cp -r ${path.join(projectRoot, "src")} ${backupDir}`)
  execSync(`cp ${path.join(logDirRoot, `${runID}.log`)} ${backupDir}`) // TODO: match the log path with run.sh
  execSync(`cp ${path.join(outDirRoot, "llm_out.json")} ${backupDir}`)

  let runDataStr = "";
  for (const [k, v] of Object.entries(runData)) {
    runDataStr += k + ":" + v + "\n";
  }

  fs.writeFileSync(`${path.join(outDirRoot, "run.data")}`, runDataStr);
  fs.writeFileSync(`${path.join(outDirRoot, "FAIL")}`, runDataStr);
  fs.writeFileSync(`${path.join(backupDir, "run.data")}`, runDataStr);
  fs.writeFileSync(`${path.join(backupDir, "FAIL")}`, runDataStr);

  execSync(`rm -f ${path.join(sourceFolder, "erroneous*")} ${path.join(sourceFolder, "completed_sketch*")} ${path.join(sourceFolder, "types_and_headers_llm_completed_sketch*")} ${path.join(sourceFolder, "types_and_headers_test_suite*")} ${path.join(sourceFolder, "*.js")}`);
  process.exit(1);
}


/* PHASE 6: BACKUPS */


// back up and clean up
runData["end-time"] = Math.floor(Date.now() / 1000).toString();
runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
runData["derived-final-parses"] = "true";
console.log(runData);

// const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-pass`}`;
// fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
// execSync(`zip -r ${backupDir}/${runName + "-" + runData["start-time"]}.zip "run_tests.sh" "collate_data.sh" "collated_data.csv" "src" "targets/target-full" "testlog" "testout"`)
execSync(`cp -r ${path.join(sourceFolder, "*.ts")} ${backupDir}`)
execSync(`cp ${path.join(projectRoot, "*.sh")} ${backupDir}`)
execSync(`cp -r ${path.join(projectRoot, "src")} ${backupDir}`)
execSync(`cp ${path.join(logDirRoot, `${runID}.log`)} ${backupDir}`) // TODO: match the log path with run.sh
execSync(`cp ${path.join(outDirRoot, "llm_out.json")} ${backupDir}`)

let runDataStr = "";
for (const [k, v] of Object.entries(runData)) {
  runDataStr += k + ":" + v + "\n";
}

fs.writeFileSync(`${path.join(outDirRoot, "run.data")}`, runDataStr);
fs.writeFileSync(`${path.join(outDirRoot, "PASS")}`, runDataStr);
fs.writeFileSync(`${path.join(backupDir, "run.data")}`, runDataStr);
fs.writeFileSync(`${path.join(backupDir, "PASS")}`, runDataStr);

execSync(`rm -f ${path.join(sourceFolder, "erroneous*")} ${path.join(sourceFolder, "completed_sketch*")} ${path.join(sourceFolder, "types_and_headers_llm_completed_sketch*")} ${path.join(sourceFolder, "types_and_headers_test_suite*")} ${path.join(sourceFolder, "*.js")}`);
process.exit(0);
