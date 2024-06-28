import OpenAI from "openai";
import { execSync } from "child_process";
import * as fs from "fs";
import { generatePrompt, generateErrorCorrectionPrompt, mockLLM, joinFiles, fillHole } from "./testrunner-core.js";

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
const relevantCtx = process.argv[9];
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

if (relevantCtx === "false") {
  source = null;
}

console.log(`source: ${source}`);


runData["option-source_path"] = sourceFolder;
runData["option-expected_type"] = typeConstraint;
runData["option-relevant_ctx"] = relevantCtx;
runData["option-error_rounds_max"] = errorRoundsMax;
runData["commit"] = "";
runData["derived-final-parses"] = "false";
runData["derived-final-static-errors"] = "0";
runData["start-time"] = unixTimestamp;

// directory defintions
const projectRoot = `/home/jacob/projects/testtslspclient`;
const outDirRoot = `testout/${runName + "-" + bashTimestamp}`;
fs.mkdirSync(outDirRoot, { recursive: true }, (err) => { if (err) throw err; });


/* PHASE 2: TYPE EXTRACTION */


// inject hole function into sketch.ts
const sketchFilePath = `${sourceFolder}sketch.ts`;
const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
const fd = fs.openSync(sketchFilePath, "w+");
const buffer = Buffer.from("declare function _<T>(): T\n");

fs.writeSync(fd, buffer, 0, buffer.length, 0);
fs.writeSync(fd, sketchFileContent, 0, sketchFileContent.length, buffer.length);
fs.close(fd);

// call node app.mjs <dir> sketch.ts and get the returned types
let targetTypes = null;
if (typeConstraint === "true") {
  console.log("\n\n=== Extracting Types === \n\n");
  execSync(`node src/app.js ${sourceFolder} sketch.ts`)
  targetTypes = fs.readFileSync("output.txt", "utf8");
}


/* PHASE 3: LLM CODE SYNTHESIS */


// ask LLM to complete the sketch using the returned types
console.log("\n\n=== Generating Prompt ===\n\n");
let prompt = [];
prompt = generatePrompt(source, sketchFileContent, targetTypes);
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
fs.writeFileSync(`${outDirRoot}/llm_out.json`, JSON.stringify(llmResult, "", 2) + "\n");
prompt.push(llmResult.choices[0].message);

runData["option-llm"] = model;
runData["option-temperature"] = "0.6";
runData["round-usage-prompt-tokens"] += llmResult.usage.prompt_tokens + ",";
runData["round-usage-completion-tokens"] += llmResult.usage.completion_tokens + ",";
runData["round-usage-total-tokens"] += llmResult.usage.total_tokens + ",";
totalTokensUsed += llmResult.usage.total_tokens;

// write completion to sketch
const llmCompletedSketch = fillHole(sketchFileContent, llmResult.choices[0].message.content);
fs.writeFileSync(`${sourceFolder}llm_completed_sketch.ts`, llmCompletedSketch);


// NON-LLM example
// const llmHoleContent = mockLLM(0);
// fs.writeFileSync(`${outDirRoot}/llm_out.json`, llmHoleContent);
//
// const llmCompletedSketch = fillHole(sketchFileContent, llmHoleContent);
// fs.writeFileSync(`${sourceFolder}llm_completed_sketch.ts`, llmCompletedSketch);
// runData["option-llm"] = "no-llm";
// runData["round-usage-prompt-tokens"] += "0,";
// runData["round-usage-completion-tokens"] += "0,";
// runData["round-usage-total-tokens"] += "0,";


/* PHASE 4: ERROR CORRECTION */
console.log("\n\n=== ERROR CORRECTION ===\n\n");

// run tsc to check for syntax errors
let usedErrorRounds = 0;

const testSuiteContent = joinFiles([
  `${sourceFolder}prelude.ts`,
  `${sourceFolder}llm_completed_sketch.ts`,
  // `${sourceFolder}solution.ts`,
  `${sourceFolder}epilogue.ts`
]);

fs.writeFileSync(`${sourceFolder}test_suite.ts`, testSuiteContent);

for (let i = 0; i < parseInt(errorRoundsMax) + 1; i++) {
  try {
    // res = execSync(`tsc ${sourceFolder}llm_completed_sketch.ts`);
    execSync(`tsc ${sourceFolder}test_suite.ts`);
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

      const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-fail`}`;
      fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
      execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
      execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
      execSync(`cp -r ${projectRoot}/src ${backupDir}`)
      execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
      execSync(`cp ${projectRoot}/testout/${runName + "-" + bashTimestamp}/llm_out.json ${backupDir}`)

      let runDataStr = "";
      for (const [k, v] of Object.entries(runData)) {
        runDataStr += k + ":" + v + "\n";
      }

      fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
      fs.writeFileSync(`${backupDir}/run.data`, runDataStr);

      execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
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
      fs.appendFileSync(`${outDirRoot}/llm_out.json`, "\n" + JSON.stringify(llmResult, "", 2) + "\n");
      prompt.push(llmResult.choices[0].message);

      runData["round-usage-prompt-tokens"] += llmResult.usage.prompt_tokens + ",";
      runData["round-usage-completion-tokens"] += llmResult.usage.completion_tokens + ",";
      runData["round-usage-total-tokens"] += llmResult.usage.total_tokens + ",";
      totalTokensUsed += llmResult.usage.total_tokens;

      const llmCompletedSketch = fillHole(sketchFileContent, llmResult.choices[0].message.content);
      fs.writeFileSync(`${sourceFolder}llm_completed_sketch.ts`, llmCompletedSketch);
      const testSuiteContent = joinFiles([
        `${sourceFolder}prelude.ts`,
        `${sourceFolder}llm_completed_sketch.ts`,
        // `${sourceFolder}solution.ts`,
        `${sourceFolder}epilogue.ts`
      ]);

      fs.writeFileSync(`${sourceFolder}test_suite.ts`, testSuiteContent);

    }












    // res = err.toString();
    // console.log("error: \n", res);
    // console.log("stdout: \n", err.stdout.toString());
    //
    // const errorMsg = err.stdout.toString();
    // const errorCorrectionPrompt = generateErrorCorrectionPrompt(previousPrompt, errorMsg, pastErrorMsg);
    // pastErrorMsg += errorMsg + "\n";
    // previousPrompt = errorCorrectionPrompt;
    // console.log(errorCorrectionPrompt);
    //
    // const llmResult = await openai.chat.completions.create({
    //   model,
    //   messages: errorCorrectionPrompt
    // });
    //
    // console.log(JSON.stringify(llmResult, "", 2))
    // fs.appendFileSync(`${outDirRoot}/llm_out.json`, "\n" + JSON.stringify(llmResult, "", 2) + "\n");
    //
    // runData["round-usage-prompt-tokens"] += llmResult.usage.prompt_tokens + ",";
    // runData["round-usage-completion-tokens"] += llmResult.usage.completion_tokens + ",";
    // runData["round-usage-total-tokens"] += llmResult.usage.total_tokens + ",";
    // totalTokensUsed += llmResult.usage.total_tokens;
    //
    // const llmCompletedSketch = fillHole(sketchFileContent, llmResult.choices[0].message.content);
    //

    // NON-LLM example
    // const llmHoleContent = mockLLM(3);
    // fs.writeFileSync(`${outDirRoot}/llm_out.json`, llmHoleContent);
    // const llmCompletedSketch = fillHole(sketchFileContent, llmHoleContent);


    // fs.writeFileSync(`${sourceFolder}llm_completed_sketch.ts`, llmCompletedSketch);
  }
}

runData["derived-err-rounds-used"] = usedErrorRounds;
runData["derived-total-tokens-used"] = totalTokensUsed;


/* PHASE 5: TEST SUITE */


// run the prelude - completed sketch - epilogue suite on specific tests
// const testSuiteContent = joinFiles([
//   `${sourceFolder}prelude.ts`,
//   `${sourceFolder}llm_completed_sketch.ts`,
//   // `${sourceFolder}solution.ts`,
//   `${sourceFolder}epilogue.ts`
// ]);
//
// fs.writeFileSync(`${sourceFolder}test_suite.ts`, testSuiteContent);
// console.log("\n\n=== Compiling Test Suite ===\n\n")
// try {
//   execSync(`tsc --project ${sourceFolder}`);
// } catch (err) {
//   const res = err.toString();
//   console.log("error: \n", res, err.stdout, err.stderr);
//   console.log("stdout: \n", err.stdout.toString(), err.stdout.toString().split("\n"));
//   console.log("stderr: \n", err.stderr.toString(), err.stderr.toString().split("\n"));
//   const numErrors = execSync(`echo \"${err.stdout.toString()}\" | grep "error TS" | wc -l`);
//   console.log("numErrors: ", numErrors.toString());
//   runData["derived-final-static-errors"] = numErrors.toString().split("\n")[0];
//
//
//   runData["end-time"] = Math.floor(Date.now() / 1000).toString();
//   runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
//   console.log(runData);
//
//   const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + "-fail"}`;
//   fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
//   // execSync(`zip -r ${backupDir}/${runName + "-" + runData["start-time"]}.zip "run_tests.sh" "collate_data.sh" "collated_data.csv" "src" "targets/target-full" "testlog" "testout"`)
//   execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
//   execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
//   execSync(`cp -r ${projectRoot}/src ${backupDir}`)
//   execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
//   execSync(`cp ${projectRoot}/testout/${runName + "-" + bashTimestamp}/llm_out.json ${backupDir}`)
//
//   let runDataStr = "";
//   for (const [k, v] of Object.entries(runData)) {
//     runDataStr += k + ":" + v + "\n";
//   }
//
//   fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
//   fs.writeFileSync(`${backupDir}/run.data`, runDataStr);
//
//   execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
//   process.exit(1);
// }


console.log("\n\n=== Running Test Suite ===\n\n")
try {
  const testResult = execSync(`node ${sourceFolder}test_suite.js`);
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

  const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-fail`}`;
  fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
  // execSync(`zip -r ${backupDir}/${runName + "-" + runData["start-time"]}.zip "run_tests.sh" "collate_data.sh" "collated_data.csv" "src" "targets/target-full" "testlog" "testout"`)
  execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
  execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
  execSync(`cp -r ${projectRoot}/src ${backupDir}`)
  execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
  execSync(`cp ${projectRoot}/testout/${runName + "-" + bashTimestamp}/llm_out.json ${backupDir}`)

  let runDataStr = "";
  for (const [k, v] of Object.entries(runData)) {
    runDataStr += k + ":" + v + "\n";
  }

  fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
  fs.writeFileSync(`${backupDir}/run.data`, runDataStr);

  execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
  process.exit(1);
}


/* PHASE 6: BACKUPS */


// back up and clean up
runData["end-time"] = Math.floor(Date.now() / 1000).toString();
runData["derived-time-elapsed"] = (parseInt(runData["end-time"]) - parseInt(runData["start-time"])).toString();
runData["derived-final-parses"] = "true";
console.log(runData);

const backupDir = `/home/jacob/projects/testtslspclient/backup/${runName + "-" + bashTimestamp + `-${source}-pass`}`;
fs.mkdirSync(`${backupDir}`, { recursive: true }, (err) => { if (err) throw err; });
// execSync(`zip -r ${backupDir}/${runName + "-" + runData["start-time"]}.zip "run_tests.sh" "collate_data.sh" "collated_data.csv" "src" "targets/target-full" "testlog" "testout"`)
execSync(`cp -r ${sourceFolder}*.ts ${backupDir}`)
execSync(`cp ${projectRoot}/*.sh ${backupDir}`)
execSync(`cp -r ${projectRoot}/src ${backupDir}`)
execSync(`cp ${projectRoot}/testlog/${runName + "-" + bashTimestamp}.log ${backupDir}`)
execSync(`cp ${projectRoot}/testout/${runName + "-" + bashTimestamp}/llm_out.json ${backupDir}`)

let runDataStr = "";
for (const [k, v] of Object.entries(runData)) {
  runDataStr += k + ":" + v + "\n";
}

fs.writeFileSync(`${outDirRoot}/run.data`, runDataStr);
fs.writeFileSync(`${backupDir}/run.data`, runDataStr);

execSync(`rm -f ${sourceFolder}erroneous* ${sourceFolder}completed_sketch* ${sourceFolder}llm_completed_sketch* ${sourceFolder}test_suite* ${sourceFolder}injected_sketch* ${sourceFolder}*.js`)
process.exit(0);
