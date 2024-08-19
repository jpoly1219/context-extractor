import { JSONRPCEndpoint, LspClient, ClientCapabilities, MarkupContent } from "../ts-lsp-client-dist/src/main.js"
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { extractRelevantTypes, getHoleContext, extractRelevantHeaders } from "./core";
import { createDatabaseWithCodeQL, extractRelevantTypesWithCodeQL, extractRelevantContextWithCodeQL, extractHeadersWithCodeQL, getRelevantHeaders, extractHoleType, getRelevantHeaders3, getRelevantHeaders4, extractTypesAndLocations } from "./codeql";
import { CODEQL_PATH, DEPS_DIR, QUERY_DIR, ROOT_DIR } from "./constants.js";
import { formatTypeSpan } from "./utils.js";
import { LanguageDriver, Language } from "./types.js";

// sketchPath: /home/<username>/path/to/sketch/dir/sketch.ts
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
    if (fs.lstatSync(`${rootPath}/${fileName}`).isFile()) {
      c.didOpen({
        textDocument: {
          uri: `file://${rootPath}/${fileName}`,
          languageId: 'typescript',
          text: fs.readFileSync(`${rootPath}/${fileName}`).toString("ascii"),
          version: 1
        }
      });
    }
  });

  // get context of the hole
  // currently only matching ES6 arrow functions
  const holeContext = await getHoleContext(c, injectedSketchUri, injectedSketchFileContent);
  // console.log(holeContext);

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
  // const foundSoFar = new Map<string, string>();
  const relevantTypes = await extractRelevantTypes(
    c,
    holeContext.fullHoverResult,
    holeContext.functionName,
    holeContext.functionTypeSpan,
    0,
    "declare function _(): ".length,
    new Map<string, string>(),
    injectedSketchUri,
    outputFile,
    1
  );

  relevantTypes.delete("_");
  relevantTypes.delete("_()");
  for (const [k, v] of relevantTypes.entries()) {
    relevantTypes.set(k, v.slice(0, -1));
  }
  // console.log("relevantTypes:", relevantTypes);

  // logFile.end();
  // logFile.close();
  // outputFile.end();
  // outputFile.close();

  const preludeContent = fs.readFileSync(`${rootPath}/prelude.ts`).toString("utf8");
  const relevantHeaders = extractRelevantHeaders(preludeContent, relevantTypes, holeContext.functionTypeSpan);

  for (const [k, v] of relevantTypes.entries()) {
    relevantTypes.set(k, v + ";");
  }

  for (let i = 0; i < relevantHeaders.length; ++i) {
    relevantHeaders[i] += ";";
  }
  // console.log(relevantContext);
  // return { holeContext: holeContext, relevantTypes: Array.from(relevantTypes), relevantContext: relevantContext };
  return { hole: holeContext.functionTypeSpan, relevantTypes: Array.from(relevantTypes, ([k, v]) => { return v }), relevantHeaders: relevantHeaders };
}

export const extractWithCodeQL = async (sketchPath: string) => {
  const start = Date.now();
  console.log("ROOT_DIR: ", ROOT_DIR);
  console.log("DEPS_DIR: ", DEPS_DIR);
  console.log("CODEQL_PATH: ", CODEQL_PATH);
  const targetPath = path.dirname(sketchPath);

  try {
    // extraction
    const databasePath = createDatabaseWithCodeQL(CODEQL_PATH, targetPath);
    const holeType = extractHoleType(CODEQL_PATH, path.join(QUERY_DIR, "hole.ql"), databasePath, targetPath);
    // console.log("holeType: ", holeType);
    const relevantTypes = extractRelevantTypesWithCodeQL(CODEQL_PATH, path.join(QUERY_DIR, "relevant-types.ql"), databasePath, targetPath);
    // console.log("relevantTypes: ", Array.from(relevantTypes, ([k, v]) => { return v.typeAliasDeclaration; }));
    // console.log("relevantTypes: ", relevantTypes)
    const headers = extractHeadersWithCodeQL(CODEQL_PATH, path.join(QUERY_DIR, "vars.ql"), databasePath, targetPath);
    // console.log("headers: ", headers)
    // const relevantContext = extractRelevantContextWithCodeQL(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), databasePath, targetPath, headers, relevantTypes);
    // console.log("relevantContext: ", relevantContext);
    // const relevantHeaders = getRelevantHeaders(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), databasePath, targetPath, headers, holeType);
    // console.log("relevantHeaders: ", relevantHeaders);
    const knownTypeLocations = extractTypesAndLocations(CODEQL_PATH, path.join(QUERY_DIR, "imports.ql"), databasePath, targetPath);
    // console.log("known type locations: ", knownTypeLocations)
    // NOTE: switch between the two header extraction methods
    // const relevantHeaders = getRelevantHeaders3(CODEQL_PATH, path.join(QUERY_DIR, "types.ql"), databasePath, targetPath, headers, holeType, relevantTypes);
    // console.log("relevantHeaders: ", Array.from(relevantHeaders));
    const relevantHeaders = getRelevantHeaders4(CODEQL_PATH, QUERY_DIR, databasePath, targetPath, headers, holeType, relevantTypes, knownTypeLocations);
    // console.log("relevantHeaders: ", Array.from(relevantHeaders));
    const end = Date.now()
    // console.log("end: ", end)
    // console.log("elapsed: ", end - start)

    return { hole: holeType.typeName, relevantTypes: Array.from(relevantTypes, ([k, v]) => { return JSON.stringify(v) }), relevantHeaders: Array.from(relevantHeaders) };
  } catch (err) {
    console.error(`${targetPath}: ${err}`);
  }
}




class App {
  private languageDriver: LanguageDriver;
  private lspClient: LspClient;
  private sketchPath: string; // not prefixed with file://
  private injectedSketchPath: string | null = null;
  private result: {
    hole: string;
    relevantTypes: string[];
    relevantHeaders: string[];
  } | null = null;

  constructor(language: Language, sketchPath: string) {
    this.sketchPath = sketchPath;
    const r = (() => {
      switch (language) {
        case Language.TypeScript: {
          this.languageDriver = new TypeScriptDriver();
          this.injectedSketchPath = path.join(path.dirname(this.sketchPath), "injected_sktech.ts");
          return spawn("typescript-language-server", ["--stdio"]);
        }
        case Language.OCaml: {
          this.languageDriver = new TypeScriptDriver();
          return spawn("ocamllsp", ["--stdio"]);
        }
      }
    })();
    const e = new JSONRPCEndpoint(r.stdin, r.stdout);
    const c = new LspClient(e);
    this.lspClient = c;

    const logFile = fs.createWriteStream("log.txt");
    r.stdout.on('data', (d) => logFile.write(d));
  }

  async init() {
    await this.languageDriver.init(this.lspClient, this.sketchPath);
  }

  async run() {
    const injectedSketchUri = `file://${this.injectedSketchPath}`;
    const outputFile = fs.createWriteStream("output.txt");
    const holeContext = await this.languageDriver.getHoleContext(
      this.lspClient,
      this.injectedSketchPath ? this.injectedSketchPath : this.sketchPath,
      fs.readFileSync(this.injectedSketchPath ? this.injectedSketchPath : this.sketchPath, "utf8")
    );

    const relevantTypes = await this.languageDriver.extractRelevantTypes(
      this.lspClient,
      holeContext.fullHoverResult,
      holeContext.functionName,
      holeContext.functionTypeSpan,
      0,
      "declare function _(): ".length,
      new Map<string, string>(),
      injectedSketchUri,
      outputFile,
      1
    );

    // TODO: move this to extractRelevantTypes
    relevantTypes.delete("_");
    relevantTypes.delete("_()");
    for (const [k, v] of relevantTypes.entries()) {
      relevantTypes.set(k, v.slice(0, -1));
    }

    const preludeContent = fs.readFileSync(path.join(path.dirname(this.sketchPath), "prelude.ts")).toString("utf8");
    const relevantHeaders = this.languageDriver.extractRelevantHeaders(
      preludeContent,
      relevantTypes,
      holeContext.functionTypeSpan
    );

    this.result = {
      hole: holeContext.functionTypeSpan,
      relevantTypes: Array.from(relevantTypes, ([_, v]) => { return v }),
      relevantHeaders: relevantHeaders
    };
  }

  save() {
    throw "unimplimented"
  }

  getSavedResult() {
    return this.result;
  }
}

class TypeScriptDriver implements LanguageDriver {
  async init(lspClient: LspClient, sketchPath: string) {
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

    const rootPath = path.dirname(sketchPath)
    const rootUri = `file://${rootPath}`;
    const workspaceFolders = [{ 'name': 'context-extractor', 'uri': rootUri }];

    await lspClient.initialize({
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
    const sketchFileName = path.basename(sketchPath);
    const injectedSketchPath = `${rootPath}/injected_${sketchFileName}`;
    const injectedSketchUri = `file://${injectedSketchPath}`;

    const sketchFileContent = fs.readFileSync(sketchPath, "utf8");
    const injectedSketchFileContent = `declare function _<T>(): T\n${sketchFileContent}`;
    fs.writeFileSync(injectedSketchPath, injectedSketchFileContent);

    // doucment sync client and server by notifying that the client has opened all the files inside the target directory
    fs.readdirSync(rootPath).map(fileName => {
      if (fs.lstatSync(`${rootPath}/${fileName}`).isFile()) {
        lspClient.didOpen({
          textDocument: {
            uri: `file://${rootPath}/${fileName}`,
            languageId: 'typescript',
            text: fs.readFileSync(`${rootPath}/${fileName}`).toString("ascii"),
            version: 1
          }
        });
      }
    });
  }

  async getHoleContext(lspClient: LspClient, injectedSketchFilePath: string, injectedSketchFileContent: string) {
    const holePattern = /_\(\)/;
    const firstPatternIndex = injectedSketchFileContent.search(holePattern);
    const linePosition = (injectedSketchFileContent.substring(0, firstPatternIndex).match(/\n/g))!.length;
    const characterPosition = firstPatternIndex - injectedSketchFileContent.split("\n", linePosition).join("\n").length - 1;

    const holeHoverResult = await lspClient.hover({
      textDocument: {
        uri: injectedSketchFilePath
      },
      position: {
        character: characterPosition,
        line: linePosition
      }
    });

    const formattedHoverResult = (holeHoverResult.contents as MarkupContent).value.split("\n").reduce((acc: string, curr: string) => {
      if (curr != "" && curr != "```typescript" && curr != "```") {
        return acc + curr;
      } else {
        return acc;
      }
    }, "");

    // function _<(a: Apple, c: Cherry, b: Banana) => Cherry > (): (a: Apple, c: Cherry, b: Banana) => Cherry
    const holeFunctionPattern = /(function _)(\<.+\>)(\(\): )(.+)/;
    const match = formattedHoverResult.match(holeFunctionPattern);
    const functionName = "_()";
    const functionTypeSpan = match![4];

    return { fullHoverResult: formattedHoverResult, functionName: functionName, functionTypeSpan: functionTypeSpan, linePosition: linePosition, characterPosition: characterPosition };
  }
  async extractRelevantTypes(
    c: LspClient,
    fullHoverResult: string,
    typeName: string,
    typeSpan: string,
    linePosition: number,
    characterPosition: number,
    foundSoFar: Map<string, string>,
    currentFile: string,
    outputFile: fs.WriteStream,
    depth: number
  ) {
    return new Map<string, string>();
  }
  extractRelevantHeaders(
    preludeContent: string,
    relevantTypes: Map<string, string>,
    holeType: string
  ): string[] {
    return [];
  }
}


export const extractWithNew = async (language: Language, sketchPath: string) => {
  const app = new App(language, sketchPath);
  app.run();
  app.save();
  return app.getSavedResult();
}
