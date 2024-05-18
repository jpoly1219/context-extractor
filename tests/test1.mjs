import { JSONRPCEndpoint, LspClient } from "../../ts-lsp-client/build/src/main.js"
import { spawn } from "child_process";
import * as fs from "fs"

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

const notifOpenTest1 = await c.didOpen({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts',
    languageId: 'ts',
    text: 'const x = 1;\nconsole.log(x)\nx. \nconst fun = () => {\n  return 1 + x;\n}',
    version: 1
  }
});

const resDef = await c.definition({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
  },
  position: {
    character: 12,
    line: 1
  }
});

const resComp = await c.completion({
  context: {
    triggerKind: 2,
    triggerCharacter: "."
  },
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
  },
  position: {
    character: 2,
    line: 2
  }
});

const resInlayHint = await c.inlayHint({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
  },
  range: {
    start: {
      line: 3, character: 8
    },
    end: {
      line: 3, character: 9
    }
  }
});

const resInlayHint2 = await c.inlayHint({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
  },
  range: {
    start: {
      line: 0, character: 6
    },
    end: {
      line: 0, character: 7
    }
  }
});

const resHover = await c.hover({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
  },
  position: {
    character: 8,
    line: 1
  }
});
// const resTypeHierarchy = await c.prepareTypeHierarchy({
//   textDocument: {
//     uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
//   },
//   position: {
//     character: 0,
//     line: 2
//   }
// });

const resSignatureHelp = await c.signatureHelp({
  textDocument: {
    uri: 'file:///home/jacob/projects/testtslspclient/test.ts'
  },
  position: {
    character: 2,
    line: 2
  },
  context: {
    triggerKind: 2,
    triggerCharacter: ".",
    isRetrigger: false,
  }
});
// console.log(resInit)
console.log("=== Completion ===")
console.log(resComp)
console.log("=== Inlay Hint ===")
console.log(resInlayHint)
console.log("=== Hover ===")
console.log(resHover)
