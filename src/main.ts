import { JSONRPCEndpoint, LspClient, ClientCapabilities } from "../../ts-lsp-client/build/src/main.js"
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { extractRelevantTypes, getHoleContext, extractRelevantContext } from "./core.js";

// expected arguments: directory to run the type extraction
// an example would be: node app.mjs /home/<username>/path/to/sketch/dir/ sketch.ts
export const extract = async (sketchPath: string) => {
  const logFile = fs.createWriteStream("log.txt");
  const rootPath = path.dirname(sketchPath)
  const rootUri = `file://${rootPath}`;
  const sketchFileName = path.basename(sketchPath);
  const workspaceFolders = [{ 'name': 'context-extractor', 'uri': rootUri }];

  // initialize LS client and server
  const r = spawn('typescript-language-server', ['--stdio']);
  const e = new JSONRPCEndpoint(r.stdin, r.stdout);
  const c = new LspClient(e);

  const capabilities: ClientCapabilities = {
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
      // 'inlayhint': { 'dynamicRegistration': true },
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
      // 'typeHierarchy': { 'dynamicRegistration': true }
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
    rootUri: null,
    workspaceFolders: workspaceFolders,
    initializationOptions: {
      preferences: {
        includeInlayVariableTypeHints: true
      }
    }
  });

  // inject hole function
  const injectedSketchPath = `${rootPath}/injected_${sketchFileName}`;
  const injectedSketchUri = `file://${injectedSketchPath}`;

  const sketchFileContent = fs.readFileSync(sketchPath, "utf8");
  const injectedSketchFileContent = `declare function _<T>(): T\n${sketchFileContent}`;
  fs.writeFileSync(injectedSketchPath, injectedSketchFileContent);

  // doucment sync client and server by notifying that the client has opened all the files inside the target directory
  fs.readdirSync(rootPath).map(fileName => {
    if (fs.lstatSync(rootPath + fileName).isFile()) {
      c.didOpen({
        textDocument: {
          uri: `file://${rootPath}/${fileName}`,
          languageId: 'typescript',
          text: fs.readFileSync(`file://${rootPath}/${fileName}`).toString("ascii"),
          version: 1
        }
      });
    }
  });

  // get context of the hole
  // currently only matching ES6 arrow functions
  const holeContext = await getHoleContext(c, injectedSketchUri, injectedSketchFileContent);
  console.log(holeContext);

  // rewrite hole function after context has been extracted to make LSP work
  const trueHoleFunction = `declare function _(): ${holeContext.functionTypeSpan}`
  const trueInjectedSketchFileContent = `${trueHoleFunction}\n${sketchFileContent}`
  fs.writeFileSync(injectedSketchPath, trueInjectedSketchFileContent);

  c.didChange({
    textDocument: {
      uri: injectedSketchUri,
      version: 2
    },
    contentChanges: [{
      text: trueInjectedSketchFileContent
    }]
  });

  // recursively define relevant types
  const outputFile = fs.createWriteStream("output.txt");
  // const foundSoFar = new Set();
  const foundSoFar = new Map();
  await extractRelevantTypes(c, holeContext.fullHoverResult, holeContext.functionName, holeContext.functionTypeSpan, 0, "declare function _(): ".length, foundSoFar, injectedSketchUri, outputFile, 1);
  console.log(foundSoFar);

  logFile.end();
  logFile.close();
  outputFile.end();
  outputFile.close();

  const preludeContent = fs.readFileSync(`${process.argv[2]}prelude.ts`).toString("utf8");
  const relevantContext = extractRelevantContext(preludeContent, foundSoFar);
  console.log(relevantContext);
  return { holeContext: holeContext, relevantTypes: foundSoFar, relevantContext: relevantContext };
}
