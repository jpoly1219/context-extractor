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

console.log("\n=== Testing Scattered Type Definitions ===\n")

const notifOpenDefAC = c.didOpen({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/def_ac.ts',
    languageId: 'ts',
    text: 'import { Banana } from "./def_b";\n/* FILE 2: */\n/* code ... */\ntype Apple = {\n  name: string;\n  b: Banana;\n}\n/* code ... */\ntype Cherry = boolean;\n/* code ... */\nexport { Apple, Cherry };',
    version: 1
  }
});

const notifOpenDefB = await c.didOpen({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/def_b.ts',
    languageId: 'ts',
    text: '/* FILE 1: *a\n/* code ... */\ntype Banana = number;\n/* code ... */\nexport { Banana };',
    version: 1
  }
});

const notifOpenTestTogether = await c.didOpen({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test_together.ts',
    languageId: 'ts',
    text: 'import { Apple, Cherry } from "./def_ac";\n/* FILE 3: */\n/* code ... */\nconst myFunc: (_: Apple) => Cherry =\n  __HOLE__;\n/* code ... */',
    version: 1
  }
});
console.log(notifOpenDefAC, notifOpenDefB, notifOpenTestTogether)

const ttcorpus = 'import { Apple, Cherry } from "./def_ac";\n/* FILE 3: */\n/* code ... */\nconst myFunc: (_: Apple) => Cherry =\n  __HOLE__;\n/* code ... */';
// pattern 1: const myFunc: (_: T1) => T2 =\n  __HOLE__
// divided into groups: const .+: \(.+: .+\) => .+ =\n __HOLE__
//                      1^^^^^2^3^^^4^5^6^7^^^^^8^9^^^^^^^^^^^^
const ttpattern = /(const )(.+)(: \()(.+)(: )(.+)(\) => )(.+)( =\n  __HOLE__)/;

const ttfirstPatternIndex = ttcorpus.search(ttpattern);
const ttmatch = ttcorpus.match(ttpattern);
const ttmatchedFunctionName = ttmatch[2];

let ttfromBeginning = ttcorpus.substring(0, ttfirstPatternIndex);
let ttlineNumber = (ttfromBeginning.match(/\n/g)).length;

// type of function
const ttresHoverFunctionTypeMatch = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test_together.ts'
  },
  position: {
    character: indexOfRegexGroup(ttmatch, 2) - ttfirstPatternIndex,
    line: ttlineNumber
  }
});

const ttfunctionTypeSignature = ttresHoverFunctionTypeMatch.contents.value.split("\n").reduce((acc, curr) => {
  if (curr != "" && curr != "```typescript" && curr != "```") {
    return acc + curr;
  } else {
    return acc;
  }
}, "");

console.log(`function ${ttmatchedFunctionName}'s type signature: ${ttfunctionTypeSignature}`);

const ttresHoverArgumentTypeMatch = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test_together.ts'
  },
  position: {
    character: indexOfRegexGroup(ttmatch, 6) - ttfirstPatternIndex,
    line: ttlineNumber
  }
});
console.log(ttresHoverArgumentTypeMatch)

const ttargumentTypeSignature = ttresHoverArgumentTypeMatch.contents.value.split("\n").reduce((acc, curr) => {
  if (curr != "" && curr != "```typescript" && curr != "```") {
    return acc + curr;
  } else {
    return acc;
  }
}, "");
console.log(`argument's type signature: ${ttargumentTypeSignature}`);


const ttresTypeDefinitionArgumentTypeMatch = await c.typeDefinition({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test_together.ts'
  },
  position: {
    character: indexOfRegexGroup(ttmatch, 6) - ttfirstPatternIndex,
    line: ttlineNumber
  }
});
console.log(JSON.stringify(ttresTypeDefinitionArgumentTypeMatch, "", 2))


const ttresDefinitionArgumentTypeMatch = await c.definition({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test_together.ts'
  },
  position: {
    character: indexOfRegexGroup(ttmatch, 6) - ttfirstPatternIndex,
    line: ttlineNumber
  }
});
console.log(JSON.stringify(ttresDefinitionArgumentTypeMatch, "", 2))

console.log("start with: ", ttfunctionTypeSignature, ttlineNumber, indexOfRegexGroup(ttmatch, 3) + 2 - ttfirstPatternIndex);
const ttfoundSoFar = new Map();
await extractRelevantTypes(c, ttfunctionTypeSignature, ttlineNumber, indexOfRegexGroup(ttmatch, 3) + 2 - ttfirstPatternIndex, ttfoundSoFar, 'file:///home/jacob/projects/testtslspclient/test_together.ts');
console.log(ttfoundSoFar);
