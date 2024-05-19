import { JSONRPCEndpoint, LspClient } from "../../ts-lsp-client/build/src/main.js"
import { spawn } from "child_process";
import * as fs from "fs"
import { extractRelevantTypes, getHoleContext, extractRelevantContext } from "./core.js";

// expected arguments: directory to run the type extraction
// an example would be: node app.mjs /home/<username>/path/to/sketch/dir/ sketch.ts
const logFile = fs.createWriteStream("log.txt");
let rootUri = "file://";
let workspaceFolders = [];
let sketchFile = "";
if (process.argv.length < 3) {
  console.error("error: target directory and code sketch file not specified");
  process.exit(1);
} else if (process.argv.length < 4) {
  console.error("error: missing either the target directory or code sketch file");
  process.exit(1);
} else if (process.argv.length > 4) {
  console.error("error: too many arguments given");
  process.exit(1);
} else {
  rootUri += process.argv[2];
  workspaceFolders = [{ 'name': 'testtslspclient', 'uri': rootUri }];
  sketchFile = process.argv[3];
}

// initialize LS client and server
const r = spawn('typescript-language-server', ['--stdio']);
const e = new JSONRPCEndpoint(r.stdin, r.stdout);
const c = new LspClient(e);

const capabilities = {
  'textDocument': {
    'codeAction': { 'dynamicRegistration': true },
    'codeLens': { 'dynamicRegistration': true },
    'colorProvider': { 'dynamicRegistration': true },
    'completion': {
      'completionItem': {
        'commitCharactersSupport': true,
        'documentationFormat': ['markdown', 'plaintext'],
        'snippetSupport': true
      },
      'completionItemKind': {
        'valueSet': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
      },
      'contextSupport': true,
      'dynamicRegistration': true
    },
    'definition': { 'dynamicRegistration': true },
    'documentHighlight': { 'dynamicRegistration': true },
    'documentLink': { 'dynamicRegistration': true },
    'documentSymbol': {
      'dynamicRegistration': true,
      'symbolKind': {
        'valueSet': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
      }
    },
    'formatting': { 'dynamicRegistration': true },
    'hover': {
      'contentFormat': ['markdown', 'plaintext'],
      'dynamicRegistration': true
    },
    'implementation': { 'dynamicRegistration': true },
    'inlayhint': { 'dynamicRegistration': true },
    'onTypeFormatting': { 'dynamicRegistration': true },
    'publishDiagnostics': { 'relatedInformation': true },
    'rangeFormatting': { 'dynamicRegistration': true },
    'references': { 'dynamicRegistration': true },
    'rename': { 'dynamicRegistration': true },
    'signatureHelp': {
      'dynamicRegistration': true,
      'signatureInformation': { 'documentationFormat': ['markdown', 'plaintext'] }
    },
    'synchronization': {
      'didSave': true,
      'dynamicRegistration': true,
      'willSave': true,
      'willSaveWaitUntil': true
    },
    'typeDefinition': { 'dynamicRegistration': true, 'linkSupport': true },
    'typeHierarchy': { 'dynamicRegistration': true }
  },
  'workspace': {
    'applyEdit': true,
    'configuration': true,
    'didChangeConfiguration': { 'dynamicRegistration': true },
    'didChangeWatchedFiles': { 'dynamicRegistration': true },
    'executeCommand': { 'dynamicRegistration': true },
    'symbol': {
      'dynamicRegistration': true,
      'symbolKind': {
        'valueSet': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
      }
    }, 'workspaceEdit': { 'documentChanges': true },
    'workspaceFolders': true
  },
  'general': {
    'positionEncodings': ['utf-8']
  },
};

r.stdout.on('data', (d) => logFile.write(d));

await c.initialize({
  processId: process.pid,
  capabilities: capabilities,
  trace: 'off',
  workspaceFolders: workspaceFolders,
  initializationOptions: {
    preferences: {
      includeInlayVariableTypeHints: true
    }
  }
});

// inject hole function
const sketchFilePath = rootUri + sketchFile;
const injectedSketchFilePath = rootUri + `injected_${sketchFile}`;
const readableRootUri = rootUri.slice(7);
const readableSketchFilePath = sketchFilePath.slice(7);
const readableInjectedSketchFilePath = injectedSketchFilePath.slice(7);

const sketchFileContent = fs.readFileSync(readableSketchFilePath, "utf8");
fs.writeFileSync(readableInjectedSketchFilePath, `declare function _<T>(): T\n${sketchFileContent}`);
let injectedSketchFileContent = fs.readFileSync(readableInjectedSketchFilePath, "utf8");

// doucment sync client and server by notifying that the client has opened all the files inside the target directory
fs.readdirSync(readableRootUri).map(fileName => {
  if (fs.lstatSync(readableRootUri + fileName).isFile()) {
    c.didOpen({
      textDocument: {
        uri: "file://" + readableRootUri + fileName,
        languageId: 'typescript',
        text: fs.readFileSync(readableRootUri + fileName).toString("ascii"),
        version: 1
      }
    });
  }
});

// get context of the hole
// currently only matching ES6 arrow functions
const holeContext = await getHoleContext(c, injectedSketchFilePath, injectedSketchFileContent);
console.log(holeContext)

// rewrite hole function after context has been extracted to make LSP work
const trueHoleFunction = `declare function _(): ${holeContext.functionTypeSpan}`
injectedSketchFileContent = `${trueHoleFunction}\n${sketchFileContent}`
fs.writeFileSync(readableInjectedSketchFilePath, injectedSketchFileContent);

c.didChange({
  textDocument: {
    uri: injectedSketchFilePath,
    version: 2
  },
  contentChanges: [{
    text: injectedSketchFileContent
  }]
});

// recursively define relevant types
const outputFile = fs.createWriteStream("output.txt");
// const foundSoFar = new Set();
const foundSoFar = new Map();
await extractRelevantTypes(c, holeContext.fullHoverResult, holeContext.functionName, holeContext.functionTypeSpan, 0, "declare function _(): ".length, foundSoFar, injectedSketchFilePath, outputFile, 1);
console.log(foundSoFar);

logFile.end();
logFile.close();
outputFile.end();
outputFile.close();

const preludeContent = fs.readFileSync(`${process.argv[2]}prelude.ts`).toString("utf8");
console.log(extractRelevantContext(preludeContent, foundSoFar));

process.exit(0);
