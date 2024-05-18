import { JSONRPCEndpoint, LspClient } from "../../ts-lsp-client/build/src/main.js"
import { spawn } from "child_process";
import * as fs from "fs"
import { indexOfRegexGroup } from "../utils.mjs";
import { extractRelevantTypes } from "../core.mjs";

const r = spawn('typescript-language-server', ['--stdio'])
const e = new JSONRPCEndpoint(r.stdin, r.stdout)
const c = new LspClient(e)

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
        'valueSet': [1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25]
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
        'valueSet': [1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26]
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
        'valueSet': [1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26]
      }
    }, 'workspaceEdit': { 'documentChanges': true },
    'workspaceFolders': true
  },
  'general': {
    'positionEncodings': ['utf-8']
  },
}
const root_uri = 'file:///home/jacob/projects/testtslspclient/'
const workspaceFolders = [{ 'name': 'testtslspclient', 'uri': root_uri }]
const outputfile = fs.createWriteStream("log.txt")
r.stdout.on('data', (d) => outputfile.write(d))

const resInit = await c.initialize({
  processId: process.pid,
  // rootPath: '.',
  // rootUri: null,
  capabilities: capabilities,
  trace: 'off',
  workspaceFolders: workspaceFolders,
  initializationOptions: {
    preferences: {
      includeInlayVariableTypeHints: true
    }
  }
});
console.log("=========Test 2==========");

const corpus = 'type T2 = number;\n\ntype T1 = {\n  name: string;\n  t2: T2;\n}\n\ntype T3 = boolean;\n\nconst myFunc: (_: T1) => T3 =\n  __HOLE__;\n\n/* should return \n\ntype B = number;\ntype A = {\n  name: string;\n  b: B;\n}\ntype C = boolean;\n\n*/';

const notifOpenTest2 = await c.didOpen({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts',
    languageId: 'ts',
    text: 'type T2 = number;\n\ntype T1 = {\n  name: string;\n  t2: T2;\n}\n\ntype T3 = boolean;\n\nconst myFunc: (_: T1) => T3 =\n  __HOLE__;\n\n/* should return \n\ntype B = number;\ntype A = {\n  name: string;\n  b: B;\n}\ntype C = boolean;\n\n*/',
    version: 1
  }
});

const resCompTest2 = await c.completion({
  context: {
    triggerKind: 1,
  },
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts'
  },
  position: {
    character: 19,
    line: 9
  }
});

const resInlayHintTest2 = await c.inlayHint({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts'
  },
  range: {
    start: {
      line: 9, character: 6
    },
    end: {
      line: 9, character: 12
    }
  }
});

const resHoverTest2 = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts'
  },
  position: {
    character: 8,
    line: 9
  }
});

console.log("=== Completion ===")
console.log(resCompTest2)
console.log("=== Inlay Hint ===")
console.log(resInlayHintTest2)
console.log("=== Hover ===")
console.log("\n=== Current File ===\n")
console.log(corpus)
console.log("\n=== Testing Hover Capabilities ===\n")
console.log(resHoverTest2)

const firstHoleIndex = corpus.indexOf("__HOLE__");
// pattern 1: const myFunc: (_: T1) => T2 =\n  __HOLE__
// divided into groups: const .+: \(.+: .+\) => .+ =\n __HOLE__
//                      1^^^^^2^3^^^4^5^6^7^^^^^8^9^^^^^^^^^^^^
const pattern = /(const )(.+)(: \()(.+)(: )(.+)(\) => )(.+)( =\n  __HOLE__)/;

const firstPatternIndex = corpus.search(pattern);
const match = corpus.match(pattern);
const matchedFunctionName = match[2];
const matchedArgumentName = match[4];
const matchedArgumentTypeName = match[6];
const matchedReturnTypeName = match[8];

let fromBeginning = corpus.substring(0, firstPatternIndex);
let lineNumber = (fromBeginning.match(/\n/g)).length;


console.log("\n=== Programmatically Extracted Types Using Pattern << const myFunc: (_: T1) => T2 =\\n  __HOLE__ >> ===\n")

// type of function
const resHoverFunctionTypeMatch = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts'
  },
  position: {
    character: indexOfRegexGroup(match, 2) - firstPatternIndex,
    line: lineNumber
  }
});

const functionTypeSignature = resHoverFunctionTypeMatch.contents.value.split("\n").reduce((acc, curr) => {
  if (curr != "" && curr != "```typescript" && curr != "```") {
    return acc + curr;
  } else {
    return acc;
  }
}, "");

console.log(`function ${matchedFunctionName}'s type signature: ${functionTypeSignature}`);

// type of argument
const resHoverArgumentTypeMatch = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts'
  },
  position: {
    character: indexOfRegexGroup(match, 6) - firstPatternIndex,
    line: lineNumber
  }
});

const argumentTypeSignature = resHoverArgumentTypeMatch.contents.value.split("\n").reduce((acc, curr) => {
  if (curr != "" && curr != "```typescript" && curr != "```") {
    return acc + curr;
  } else {
    return acc;
  }
}, "");
console.log(`argument ${matchedArgumentName}'s type signature: ${argumentTypeSignature}`);

// type of return
const resHoverReturnTypeMatch = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test2.ts'
  },
  position: {
    character: indexOfRegexGroup(match, 8) - firstPatternIndex,
    line: lineNumber
  }
});

const returnTypeSignature = resHoverReturnTypeMatch.contents.value.split("\n").reduce((acc, curr) => {
  if (curr != "" && curr != "```typescript" && curr != "```") {
    return acc + curr;
  } else {
    return acc;
  }
}, "");
console.log(`return's type signature: ${returnTypeSignature}`);

console.log("start with: ", functionTypeSignature, lineNumber, indexOfRegexGroup(match, 3) + 2 - firstPatternIndex);
const foundSoFar = new Map();
await extractRelevantTypes(c, functionTypeSignature, lineNumber, indexOfRegexGroup(match, 3) + 2 - firstPatternIndex, foundSoFar, 'file:///home/jacob/projects/testtslspclient/test2.ts');
console.log(foundSoFar);
