import { JSONRPCEndpoint, LspClient, ClientCapabilities, MarkupContent, Location, SymbolInformation, Range } from "../ts-lsp-client-dist/src/main.js"
import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { extractRelevantTypes, getHoleContext, extractRelevantHeaders } from "./core";
import { createDatabaseWithCodeQL, extractRelevantTypesWithCodeQL, extractRelevantContextWithCodeQL, extractHeadersWithCodeQL, getRelevantHeaders, extractHoleType, getRelevantHeaders3, getRelevantHeaders4, extractTypesAndLocations } from "./codeql";
import { CODEQL_PATH, DEPS_DIR, QUERY_DIR, ROOT_DIR } from "./constants.js";
import { formatTypeSpan, extractSnippet, supportsHole, indexOfRegexGroup } from "./utils.js";
import { LanguageDriver, Language, TypeChecker } from "./types.js";

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
  console.log(JSON.stringify(c));

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
  private language: Language;
  private languageDriver: LanguageDriver;
  private lspClient: LspClient;
  private sketchPath: string; // not prefixed with file://
  private result: {
    hole: string;
    relevantTypes: string[];
    relevantHeaders: string[];
  } | null = null;


  constructor(language: Language, sketchPath: string) {
    this.language = language;
    this.sketchPath = sketchPath;

    const r = (() => {
      switch (language) {
        case Language.TypeScript: {
          this.languageDriver = new TypeScriptDriver();
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
    const outputFile = fs.createWriteStream("output.txt");

    await this.init();

    const holeContext = await this.languageDriver.getHoleContext(
      this.lspClient,
      this.sketchPath,
    );

    const relevantTypes = await this.languageDriver.extractRelevantTypes(
      this.lspClient,
      holeContext.fullHoverResult,
      holeContext.functionName,
      holeContext.functionTypeSpan,
      holeContext.holeTypeDefLinePos,
      holeContext.holeTypeDefCharPos,
      new Map<string, string>(),
      supportsHole(this.language) ? `file://${this.sketchPath}` : `file://${path.dirname(this.sketchPath)}/injected_sketch${path.extname(this.sketchPath)}`,
      outputFile,
      1
    );

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
    // TODO:
    throw "unimplimented"
  }


  getSavedResult() {
    return this.result;
  }
}

class TypeScriptDriver implements LanguageDriver {
  typeChecker: TypeScriptTypeChecker = new TypeScriptTypeChecker();


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
  }


  async getHoleContext(lspClient: LspClient, sketchFilePath: string) {
    // For TypeScript programs, we need to inject the hole function before getting its context.
    // NOTE: this can be abstracted to its own method?
    const sketchDir = path.dirname(sketchFilePath);
    const injectedSketchFilePath = path.join(sketchDir, "injected_sketch.ts");
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
    const injectedSketchFileContent = `declare function _<T>(): T\n${sketchFileContent}`;
    fs.writeFileSync(injectedSketchFilePath, injectedSketchFileContent);

    // Sync client and server by notifying that the client has opened all the files inside the target directory.
    fs.readdirSync(sketchDir).map(fileName => {
      if (fs.lstatSync(path.join(sketchDir, fileName)).isFile()) {
        lspClient.didOpen({
          textDocument: {
            uri: `file://${sketchDir}/${fileName}`,
            languageId: "typescript",
            text: fs.readFileSync(`${sketchDir}/${fileName}`).toString("ascii"),
            version: 1
          }
        });
      }
    });

    // Get hole context.
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

    // Clean up and inject the true hole function without the generic type signature.
    // NOTE: this can be abstracted to its own method?
    const trueHoleFunction = `declare function _(): ${functionTypeSpan}`
    const trueInjectedSketchFileContent = `${trueHoleFunction}\n${sketchFileContent}`
    fs.writeFileSync(injectedSketchFilePath, trueInjectedSketchFileContent);

    lspClient.didChange({
      textDocument: {
        uri: `file://${injectedSketchFilePath}`,
        version: 2
      },
      contentChanges: [{
        text: trueInjectedSketchFileContent
      }]
    });

    return {
      fullHoverResult: formattedHoverResult,
      functionName: functionName,
      functionTypeSpan: functionTypeSpan,
      linePosition: linePosition,
      characterPosition: characterPosition,
      holeTypeDefLinePos: 0,
      holeTypeDefCharPos: "declare function _(): ".length
    };
  }


  async extractRelevantTypes(
    lspClient: LspClient,
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
    if (!foundSoFar.has(typeName)) {
      foundSoFar.set(typeName, fullHoverResult);
      outputFile.write(`${fullHoverResult};\n`);

      const content = fs.readFileSync(currentFile.slice(7), "utf8");
      const charInLine = execSync(`wc -m <<< "${content.split("\n")[linePosition].slice(characterPosition)}"`, { shell: "/bin/bash" });

      // -1 is done to avoid tsserver errors
      for (let i = 0; i < Math.min(parseInt(charInLine.toString()), typeSpan.length) - 1; i++) {
        try {
          const typeDefinitionResult = await lspClient.typeDefinition({
            textDocument: {
              uri: currentFile
            },
            position: {
              character: characterPosition + i,
              line: linePosition
            }
          });

          if (typeDefinitionResult && typeDefinitionResult instanceof Array && typeDefinitionResult.length != 0) {
            // Use documentSymbol instead of hover.
            // This prevents type alias "squashing" done by tsserver.
            // This also allows for grabbing the entire definition range and not just the symbol range.
            // TODO: feels like this could be memoized to improve performance.
            const documentSymbolResult = await lspClient.documentSymbol({
              textDocument: {
                uri: (typeDefinitionResult[0] as Location).uri
              }
            });
            // grab if the line number of typeDefinitionResult and documentSymbolResult matches
            const dsMap = documentSymbolResult!.reduce((m, obj) => {
              m.set((obj as SymbolInformation).location.range.start.line, (obj as SymbolInformation).location.range as unknown as Range);
              return m;
            }, new Map<number, Range>());

            const matchingSymbolRange: Range | undefined = dsMap.get((typeDefinitionResult[0] as Location).range.start.line);
            if (matchingSymbolRange) {
              const snippetInRange = extractSnippet(fs.readFileSync((typeDefinitionResult[0] as Location).uri.slice(7)).toString("utf8"), matchingSymbolRange.start, matchingSymbolRange.end)
              // TODO: this can potentially be its own method. the driver would require some way to get type context.
              // potentially, this type checker can be its own class.
              // FIX: think about how to add the typechecking functionality at this point
              const typeContext = this.typeChecker.getTypeContextFromDecl(snippetInRange);
              const formattedTypeSpan = formatTypeSpan(snippetInRange);

              await extractRelevantTypes(
                lspClient,
                snippetInRange,
                typeContext!.identifier,
                formattedTypeSpan,
                (typeDefinitionResult[0] as Location).range.start.line,
                (typeDefinitionResult[0] as Location).range.end.character + 2,
                foundSoFar,
                (typeDefinitionResult[0] as Location).uri, outputFile, depth + 1
              );

            }
          }
        } catch (err) {
          console.log(`${err}`)
        }
      }
    }

    // Postprocess the map.
    foundSoFar.delete("_");
    foundSoFar.delete("_()");
    for (const [k, v] of foundSoFar.entries()) {
      foundSoFar.set(k, v.slice(0, -1));
    }

    return foundSoFar;
  }


  extractRelevantHeaders(
    preludeContent: string,
    relevantTypes: Map<string, string>,
    holeType: string
  ): string[] {
    const relevantContext = new Set<string>();

    const targetTypes = this.generateTargetTypes(relevantTypes, holeType);

    // only consider lines that start with let or const
    const filteredLines = preludeContent.split("\n").filter((line) => {
      return line.slice(0, 3) === "let" || line.slice(0, 5) === "const";
    });

    // check for relationship between each line and relevant types
    filteredLines.forEach(line => {
      const splittedLine = line.split(" = ")[0];

      const typeSpanPattern = /(^[^:]*: )(.+)/;
      const returnTypeSpan = splittedLine.match(typeSpanPattern)![2];
      if (!this.typeChecker.isPrimitive(returnTypeSpan.split(" => ")[1])) {
        this.extractRelevantHeadersHelper(returnTypeSpan, targetTypes, relevantTypes, relevantContext, splittedLine);
      }
    });

    return Array.from(relevantContext);
  }


  generateTargetTypes(relevantTypes: Map<string, string>, holeType: string) {
    const targetTypes = new Set<string>();
    targetTypes.add(holeType);
    this.getTargetTypesHelper(relevantTypes, holeType, targetTypes);

    return targetTypes;
  }


  getTargetTypesHelper(
    relevantTypes: Map<string, string>,
    currType: string,
    targetTypes: Set<string>
  ) {
    // console.log("===Helper===")
    if (this.typeChecker.isFunction(currType)) {
      const functionPattern = /(\(.+\))( => )(.+)(;*)/;
      const rettype = currType.match(functionPattern)![3];
      targetTypes.add(rettype);
      this.getTargetTypesHelper(relevantTypes, rettype, targetTypes);

    } else if (this.typeChecker.isTuple(currType)) {
      const elements = this.typeChecker.parseTypeArrayString(currType)

      elements.forEach(element => {
        targetTypes.add(element)
        this.getTargetTypesHelper(relevantTypes, element, targetTypes);
      });
    }
    // else if (isArray(currType)) {
    //   const elementType = currType.split("[]")[0];
    //
    //   targetTypes.add(elementType)
    //   getTargetTypesHelper(relevantTypes, elementType, targetTypes);
    // } 
    else {
      if (relevantTypes.has(currType)) {
        const definition = relevantTypes.get(currType)!.split(" = ")[1];
        this.getTargetTypesHelper(relevantTypes, definition, targetTypes);
      }
    }
  }


  // resursive helper for extractRelevantContext
  // checks for nested type equivalence
  extractRelevantHeadersHelper(typeSpan: string, targetTypes: Set<string>, relevantTypes: Map<string, string>, relevantContext: Set<string>, line: string) {
    targetTypes.forEach(typ => {
      if (this.isTypeEquivalent(typeSpan, typ, relevantTypes)) {
        relevantContext.add(line);
      }

      if (this.typeChecker.isFunction(typeSpan)) {
        const functionPattern = /(\(.+\))( => )(.+)/;
        const rettype = typeSpan.match(functionPattern)![3];

        this.extractRelevantHeadersHelper(rettype, targetTypes, relevantTypes, relevantContext, line);

      } else if (this.typeChecker.isTuple(typeSpan)) {
        const elements = this.typeChecker.parseTypeArrayString(typeSpan)
        // const elements = typeSpan.slice(1, typeSpan.length - 1).split(", ");

        elements.forEach(element => {
          this.extractRelevantHeadersHelper(element, targetTypes, relevantTypes, relevantContext, line);
        });

      }

      // else if (isUnion(typeSpan)) {
      //   const elements = typeSpan.split(" | ");
      //
      //   elements.forEach(element => {
      //     extractRelevantContextHelper(element, relevantTypes, relevantContext, line);
      //   });
      //
      // else if (isArray(typeSpan)) {
      //   const elementType = typeSpan.split("[]")[0];
      //
      //   if (isTypeEquivalent(elementType, typ, relevantTypes)) {
      //     extractRelevantContextHelper(elementType, targetTypes, relevantTypes, relevantContext, line);
      //   }
      // }
    });
  }


  // two types are equivalent if they have the same normal forms
  isTypeEquivalent(t1: string, t2: string, relevantTypes: Map<string, string>) {
    const normT1 = this.normalize(t1, relevantTypes);
    const normT2 = this.normalize(t2, relevantTypes);
    return normT1 === normT2;
  }


  // return the normal form given a type span and a set of relevant types
  // TODO: replace type checking with information from the AST?
  normalize(typeSpan: string, relevantTypes: Map<string, string>) {
    let normalForm = "";

    // pattern matching for typeSpan
    if (this.typeChecker.isPrimitive(typeSpan)) {
      return typeSpan;

    } else if (this.typeChecker.isObject(typeSpan)) {
      const elements = typeSpan.slice(1, typeSpan.length - 2).split(";");
      normalForm += "{";

      elements.forEach(element => {
        if (element !== "") {
          const kv = element.split(": ");
          normalForm += kv[0].slice(1, kv[0].length), ": ", this.normalize(kv[1], relevantTypes);
          normalForm += "; ";
        }
      });

      normalForm += "}";
      return normalForm;

    } else if (this.typeChecker.isTuple(typeSpan)) {
      // const elements = typeSpan.slice(1, typeSpan.length - 1).split(", ");
      const elements = this.typeChecker.parseTypeArrayString(typeSpan)
      normalForm += "[";

      elements.forEach((element, i) => {
        normalForm += this.normalize(element, relevantTypes);
        if (i < elements.length - 1) {
          normalForm += ", ";
        }
      });

      normalForm += "]";
      return normalForm;

    } else if (this.typeChecker.isUnion(typeSpan)) {
      const elements = typeSpan.split(" | ");

      elements.forEach((element, i) => {
        normalForm += "("
        normalForm += this.normalize(element, relevantTypes)
        normalForm += ")";
        if (i < elements.length - 1) {
          normalForm += " | ";
        }
      });

      return normalForm;

    } else if (this.typeChecker.isArray(typeSpan)) {
      const element = typeSpan.split("[]")[0];

      normalForm += this.normalize(element, relevantTypes)
      normalForm += "[]";
      return normalForm;

    } else if (this.typeChecker.isTypeAlias(typeSpan)) {
      const typ = relevantTypes.get(typeSpan)?.split(" = ")[1];
      if (typ === undefined) {
        return typeSpan;
      }

      normalForm += this.normalize(typ, relevantTypes);
      return normalForm;

    } else {
      return typeSpan;
    }
  }
}


class TypeScriptTypeChecker implements TypeChecker {
  getTypeContextFromDecl(typeDecl: string) {
    if (this.checkHole(typeDecl)) {
      return this.checkHole(typeDecl);
    } else if (this.checkParameter(typeDecl)) {
      return this.checkParameter(typeDecl);
    } else if (this.checkFunction(typeDecl)) {
      return this.checkFunction(typeDecl);
    } else if (this.checkUnion(typeDecl)) {
      return this.checkUnion(typeDecl);
    } else if (this.checkObject(typeDecl)) {
      return this.checkObject(typeDecl);
    } else if (this.checkImports(typeDecl)) {
      return this.checkImports(typeDecl);
    } else if (this.checkModule(typeDecl)) {
      return this.checkModule(typeDecl);
    } else {
      return this.checkPrimitive(typeDecl);
    }
  }

  // pattern matching
  // attempts to match strings to corresponding types, then returns an object containing the name, type span, and an interesting index
  // base case - type can no longer be stepped into
  // boolean, number, string, enum, unknown, any, void, null, undefined, never
  // ideally this should be checked for before we do the for loop
  // return typeSpan;


  // check if hover result is from a primitive type
  checkPrimitive(typeDecl: string) {
    // type _ = boolean
    const primitivePattern = /(type )(.+)( = )(.+)/;
    const primitiveMatch = typeDecl.match(primitivePattern);
    let primitiveInterestingIndex = -1;
    if (primitiveMatch) {
      primitiveInterestingIndex = indexOfRegexGroup(primitiveMatch, 4);
    }

    if (primitiveInterestingIndex != -1) {
      const typeName = primitiveMatch![2];
      const typeSpan = primitiveMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: primitiveInterestingIndex }
    }
    return null;
  }


  // check if hover result is from an import
  checkImports(typeDecl: string) {
    // import { _, _ };
    const importPattern = /(import )(\{.+\})/;
    const importMatch = typeDecl.match(importPattern);
    let importInterestingIndex = -1;
    if (importMatch) {
      importInterestingIndex = indexOfRegexGroup(importMatch, 2);
    }

    // import _;
    const defaultImportPattern = /(import )(.+)/;
    const defaultImportMatch = typeDecl.match(defaultImportPattern);
    let defaultImportInterestingIndex = -1;
    if (defaultImportMatch) {
      defaultImportInterestingIndex = indexOfRegexGroup(defaultImportMatch, 2);
    }

    if (importInterestingIndex != -1) {
      const typeName = importMatch![2];
      const typeSpan = importMatch![2];
      return { identifier: typeName, span: typeSpan, interestingIndex: importInterestingIndex }
    } else if (defaultImportInterestingIndex != -1) {
      const typeName = defaultImportMatch![2];
      const typeSpan = defaultImportMatch![2];
      return { identifier: typeName, span: typeSpan, interestingIndex: defaultImportInterestingIndex }
    }

    return null;
  }


  // check if hover result is from a module
  checkModule(typeDecl: string) {
    // module "path/to/module"
    const modulePattern = /(module )(.+)/;
    const moduleMatch = typeDecl.match(modulePattern);
    let moduleInterestingIndex = -1;
    if (moduleMatch) {
      moduleInterestingIndex = indexOfRegexGroup(moduleMatch, 2);
    }

    if (moduleInterestingIndex != -1) {
      const typeName = moduleMatch![2];
      const typeSpan = moduleMatch![2];
      return { identifier: typeName, span: typeSpan, interestingIndex: moduleInterestingIndex }
    }

    return null;
  }


  // check if hover result is from an object
  checkObject(typeDecl: string) {
    // type _ = {
    //   _: t1;
    //   _: t2;
    // }
    const objectTypeDefPattern = /(type )(.+)( = )(\{.+\})/;
    const objectTypeDefMatch = typeDecl.match(objectTypeDefPattern);
    let objectTypeDefInterestingIndex = -1;
    if (objectTypeDefMatch) {
      objectTypeDefInterestingIndex = indexOfRegexGroup(objectTypeDefMatch, 4);
    }

    if (objectTypeDefInterestingIndex != -1) {
      const typeName = objectTypeDefMatch![2];
      const typeSpan = objectTypeDefMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: objectTypeDefInterestingIndex }
    }
    return null;
  }


  // check if hover result is from a union
  checkUnion(typeDecl: string) {
    // type _ = A | B | C
    const unionPattern = /(type )(.+)( = )((.+ | )+.+)/;
    const unionMatch = typeDecl.match(unionPattern);
    let unionInterestingIndex = -1;
    if (unionMatch) {
      unionInterestingIndex = indexOfRegexGroup(unionMatch, 4);
    }

    if (unionInterestingIndex != -1) {
      const typeName = unionMatch![2];
      const typeSpan = unionMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: unionInterestingIndex }
    }
    return null;
  }


  // check if hover result is from a function
  checkFunction(typeDecl: string) {
    // const myFunc : (arg1: typ1, ...) => _
    const es6AnnotatedFunctionPattern = /(const )(.+)(: )(\(.+\) => .+)/;
    const es6AnnotatedFunctionMatch = typeDecl.match(es6AnnotatedFunctionPattern);
    let es6AnnotatedFunctionInterestingIndex = -1;
    if (es6AnnotatedFunctionMatch) {
      es6AnnotatedFunctionInterestingIndex = indexOfRegexGroup(es6AnnotatedFunctionMatch, 4);
    }

    // type _ = (_: t1) => t2
    const es6FunctionTypeDefPattern = /(type )(.+)( = )(\(.+\) => .+)/;
    const es6FunctionTypeDefPatternMatch = typeDecl.match(es6FunctionTypeDefPattern);
    let es6FunctionTypeDefInterestingIndex = -1;
    if (es6FunctionTypeDefPatternMatch) {
      es6FunctionTypeDefInterestingIndex = indexOfRegexGroup(es6FunctionTypeDefPatternMatch, 4);
    }

    // function myFunc<T>(args: types, genarg: T): returntype
    const genericFunctionTypePattern = /(function )(.+)(\<.+\>\(.*\))(: )(.+)/;
    const genericFunctionTypeMatch = typeDecl.match(genericFunctionTypePattern);
    let genericFunctionTypeInterestingIndex = -1;
    if (genericFunctionTypeMatch) {
      genericFunctionTypeInterestingIndex = indexOfRegexGroup(genericFunctionTypeMatch, 3);
    }

    // function myFunc(args: types): returntype
    const functionTypePattern = /(function )(.+)(\(.*\))(: )(.+)/;
    const functionTypeMatch = typeDecl.match(functionTypePattern);
    let functionTypeInterestingIndex = -1;
    if (functionTypeMatch) {
      functionTypeInterestingIndex = indexOfRegexGroup(functionTypeMatch, 3);
    }

    if (es6AnnotatedFunctionInterestingIndex != -1) {
      const typeName = es6AnnotatedFunctionMatch![2];
      const typeSpan = es6AnnotatedFunctionMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: es6AnnotatedFunctionInterestingIndex }
    } else if (es6FunctionTypeDefInterestingIndex != -1) {
      const typeName = es6FunctionTypeDefPatternMatch![2];
      const typeSpan = es6FunctionTypeDefPatternMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: es6FunctionTypeDefInterestingIndex }
    } else if (genericFunctionTypeInterestingIndex != -1) {
      const typeName = genericFunctionTypeMatch![2];
      const typeSpan = genericFunctionTypeMatch![3] + genericFunctionTypeMatch![4] + genericFunctionTypeMatch![5];
      return { identifier: typeName, span: typeSpan, interestingIndex: genericFunctionTypeInterestingIndex }
    } else if (functionTypeInterestingIndex != -1) {
      const typeName = functionTypeMatch![2];
      const typeSpan = functionTypeMatch![3] + functionTypeMatch![4] + functionTypeMatch![5];
      return { identifier: typeName, span: typeSpan, interestingIndex: functionTypeInterestingIndex }
    }

    return null;
  }


  // check if hover result is from a hole
  checkHole(typeDecl: string) {
    // (type parameter) T in _<T>(): T
    const holePattern = /(\(type parameter\) T in _\<T\>\(\): T)/;
    const match = typeDecl.match(holePattern);
    if (match) {
      const typeName = "hole function";
      const typeSpan = match[1];
      return { identifier: typeName, span: typeSpan }
    }

    return null;
  }


  // check if hover result is from a parameter
  checkParameter(typeDecl: string) {
    // (parameter) name: type
    // const parameterPattern = /(\(parameter\) )(.+)(: )(.+))/;
    // const parameterMatch = typeDecl.match(parameterPattern);
    // let parameterInterestingIndex = -1;
    // if (parameterMatch) {
    //   parameterInterestingIndex = indexOfRegexGroup(parameterMatch, 4);
    // }
    //
    // if (parameterInterestingIndex != -1) {
    //   const typeName = parameterMatch[2];
    //   const typeSpan = parameterMatch[4];
    //   return { typeName: typeName, typeSpan: typeSpan, interestingIndex: parameterInterestingIndex }
    // }
    return null;
  }


  isTuple(typeSpan: string) {
    return typeSpan[0] === "[" && typeSpan[typeSpan.length - 1] === "]";
  }


  isUnion(typeSpan: string) {
    return typeSpan.includes(" | ");
  }


  isArray(typeSpan: string) {
    return typeSpan.slice(-2) === "[]";
  }


  isObject(typeSpan: string) {
    return typeSpan[0] === "{" && typeSpan[typeSpan.length - 1] === "}";
  }


  // this is a very rudimentary check, so it should be expanded upon
  isFunction(typeSpan: string) {
    return typeSpan.includes("=>");
  }


  isPrimitive(typeSpan: string) {
    const primitives = ["string", "number", "boolean"];
    return primitives.includes(typeSpan);
  }


  isTypeAlias(typeSpan: string) {
    const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return caps.includes(typeSpan[0]);
  }


  escapeQuotes(typeSpan: string): string {
    return typeSpan.replace(/"/g, `\\"`);
  }


  parseTypeArrayString(typeStr: string): string[] {
    // Remove all spaces
    const cleaned = typeStr.replace(/\s/g, '');

    // Remove the outermost square brackets
    const inner = cleaned.slice(1, -1);
    // const inner = cleaned.slice(-1) === ";" ? cleaned.slice(1, -2) : cleaned.slice(1, -1);

    // Split the string, respecting nested structures
    const result: string[] = [];
    let currentItem = '';
    let nestLevel = 0;

    for (const char of inner) {
      if (char === '[') nestLevel++;
      if (char === ']') nestLevel--;

      if (char === ',' && nestLevel === 0) {
        // check if currentItem is a name: type pair or just type
        if (currentItem.includes(":")) {
          result.push(currentItem.split(":")[1]);
        } else {
          result.push(currentItem);
        }
        currentItem = '';
      } else {
        currentItem += char;
      }
    }

    if (currentItem.includes(":")) {
      result.push(currentItem.split(":")[1]);
    } else {
      result.push(currentItem);
    }

    return result;
  }
}

export const extractWithNew = async (language: Language, sketchPath: string) => {
  const app = new App(language, sketchPath);
  await app.run();
  return app.getSavedResult();
}
