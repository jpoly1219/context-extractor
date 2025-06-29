import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { execSync } from "child_process";
import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
// import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "ts-lsp-client";
// import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "dist/ts-lsp-client-dist/src/main";
import { LanguageDriver, Context, TypeSpanAndSourceFile, GPT4Config, Model, TypeSpanAndSourceFileAndAst } from "./types";
import { OcamlTypeChecker } from "./ocaml-type-checker";
import { extractSnippet, removeLines } from "./utils";
import ocamlParser = require("../src/ocaml-utils/_build/default/test_parser.bc.js");
import { channel } from "diagnostics_channel";


export class OcamlDriver implements LanguageDriver {
  typeChecker: OcamlTypeChecker = new OcamlTypeChecker();

  async init(lspClient: LspClient | null, sketchPath: string) {
    if (lspClient) {
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
  }


  injectHole(sketchPath: string) {

  }


  async getHoleContext(lspClient: LspClient | null, sketchFilePath: string) {
    const sketchDir = path.dirname(sketchFilePath);
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");

    if (lspClient) {
      // Sync client and server by notifying that the client has opened all the files inside the target directory.
      fs.readdirSync(sketchDir).map(fileName => {
        if (fs.lstatSync(path.join(sketchDir, fileName)).isFile()) {
          const langType = (() => {
            switch (fileName) {
              case "dune":
                return "dune";
              case "dune-project":
                return "dune-project";
              case ".ocamlformat":
                return ".ocamlformat";
              default:
                return "ocaml";
            }
          })();

          lspClient.didOpen({
            textDocument: {
              uri: `file://${sketchDir}/${fileName}`,
              languageId: langType,
              text: fs.readFileSync(`${sketchDir}/${fileName}`).toString("ascii"),
              version: 1
            }
          });
        }
      });

      // Get hole context.
      const holeCtx = (await lspClient.ocamlMerlinCallCompatible({
        uri: `file://${sketchFilePath}`,
        command: "holes",
        args: [],
        resultAsSexp: false
      }))

      const sketchSymbol = await lspClient.documentSymbol({
        textDocument: {
          uri: `file://${sketchFilePath}`
        }
      })

      return {
        fullHoverResult: "", //
        functionName: "_", // _
        functionTypeSpan: JSON.parse(holeCtx.result).value[0].type, // model * action -> model
        linePosition: JSON.parse(holeCtx.result).value[0].start.line, // hole's line
        characterPosition: JSON.parse(holeCtx.result).value[0].start.col, // hole's character
        holeTypeDefLinePos: 3, // 
        holeTypeDefCharPos: 0, // "
        range: (sketchSymbol![0] as SymbolInformation).location.range,
        source: `file://${sketchFilePath}`
      };
    } else {
      // TODO: Do vscode things.
      return {
        fullHoverResult: "", //
        functionName: "_", // _
        functionTypeSpan: "",
        linePosition: 0,
        characterPosition: 0,
        holeTypeDefLinePos: 0, // 
        holeTypeDefCharPos: 0, // "
        range: {
          start: {
            line: 0,
            character: 0
          },
          end: {
            line: 0,
            character: 0
          }
        },
        source: ""
      };
    }
  }


  async getHoleContextWithCompilerAPI(
    sketchFilePath: string,
    logStream: fs.WriteStream | null
  ) {
    return {
      fullHoverResult: "", //
      functionName: "_", // _
      functionTypeSpan: "",
      linePosition: 0,
      characterPosition: 0,
      holeTypeDefLinePos: 0, // 
      holeTypeDefCharPos: 0, // "
      range: {
        start: {
          line: 0,
          character: 0
        },
        end: {
          line: 0,
          character: 0
        }
      },
      source: ""
    };
  }

  async getHoleContextWithTreesitter(
    sketchFilePath: string,
    cursorPosition: { line: number, character: number },
    logStream: fs.WriteStream | null
  ) {
    return {
      fullHoverResult: "", //
      functionName: "_", // _
      functionTypeSpan: "",
      linePosition: 0,
      characterPosition: 0,
      holeTypeDefLinePos: 0, // 
      holeTypeDefCharPos: 0, // "
      range: {
        start: {
          line: 0,
          character: 0
        },
        end: {
          line: 0,
          character: 0
        }
      },
      source: ""
    };
  }


  async extractRelevantTypes(
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>,
    currentFile: string,
  ) {
    if (lspClient) {
      if (!foundSoFar.has(typeName)) {
        foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7) });
        // outputFile.write(`${fullHoverResult};\n`);

        const content = fs.readFileSync(currentFile.slice(7), "utf8");

        for (let linePos = startLine; linePos <= fullHoverResult.length; ++linePos) {
          const numOfCharsInLine = parseInt(execSync(`wc -m <<< "${content.split("\n")[linePos]}"`, { shell: "/bin/bash" }).toString());

          for (let charPos = 0; charPos < numOfCharsInLine; ++charPos) {
            try {
              const typeDefinitionResult = await lspClient.typeDefinition({
                textDocument: {
                  uri: currentFile
                },
                position: {
                  character: charPos,
                  line: linePos
                }
              });

              if (typeDefinitionResult && typeDefinitionResult instanceof Array && typeDefinitionResult.length != 0) {
                // Use documentSymbol instead of hover.
                // This prevents type alias "squashing" done by tsserver.
                // This also allows for grabbing the entire definition range and not just the symbol range.
                // PERF: feels like this could be memoized to improve performance.
                const documentSymbolResult = await lspClient.documentSymbol({
                  textDocument: {
                    uri: (typeDefinitionResult[0] as Location).uri
                  }
                });

                // grab if the line number of typeDefinitionResult and documentSymbolResult matches
                // FIX: This overwrites older definitions if the lines are the same. Especially for type constructors, such as playlist_state.
                // Generally the one that comes first is the largest, but this could be dependent on the source code.
                const dsMap = documentSymbolResult!.reduce((m, obj) => {
                  const newSymbol = (obj as SymbolInformation);
                  const existing = m.get(newSymbol.location.range.start.line);
                  if (existing) {
                    // Compare range between existing doucment symbol and the current symbol.
                    if (existing.end.line - existing.start.line >= newSymbol.location.range.end.line - newSymbol.location.range.start.line) {
                      return m;
                    } else if (existing.end.character - existing.start.character >= newSymbol.location.range.end.character - newSymbol.location.range.start.character) {
                      return m;
                    }
                  }
                  m.set((obj as SymbolInformation).location.range.start.line, (obj as SymbolInformation).location.range as unknown as Range);
                  return m;
                }, new Map<number, Range>());

                const matchingSymbolRange: Range | undefined = dsMap.get((typeDefinitionResult[0] as Location).range.start.line);
                if (matchingSymbolRange) {
                  const snippetInRange = extractSnippet(fs.readFileSync((typeDefinitionResult[0] as Location).uri.slice(7)).toString("utf8"), matchingSymbolRange.start, matchingSymbolRange.end)
                  // TODO: this can potentially be its own method. the driver would require some way to get type context.
                  // potentially, this type checker can be its own class.
                  const identifier = this.typeChecker.getIdentifierFromDecl(snippetInRange);

                  await this.extractRelevantTypes(
                    lspClient,
                    snippetInRange,
                    identifier,
                    matchingSymbolRange.start.line,
                    foundSoFar,
                    (typeDefinitionResult[0] as Location).uri,
                  );

                }
              }
            } catch (err) {
              console.log(`${err}`)
            }
          }
        }
      }

      return foundSoFar;
    } else {
      // TODO: Do vscode things.
      return foundSoFar;
    }
  }

  async extractRelevantTypesWithCompilerAPI(
    fullHoverResult: string,
    typeName: string,
    linePosition: number,
    characterPosition: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>,
    currentFile: string,
  ) {
    return foundSoFar;
  }

  async extractRelevantTypesWithTreesitter(
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFileAndAst>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    logStream: fs.WriteStream | null
  ) {
    return foundSoFar;
  }


  async extractRelevantHeaders(
    lspClient: LspClient | null,
    // preludeFilePath: string,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    holeType: string
  ): Promise<Set<TypeSpanAndSourceFile>> {
    const relevantContext = new Set<TypeSpanAndSourceFile>();

    if (lspClient) {
      for (const source of sources) {
        const headerTypeSpans = await this.extractHeaderTypeSpans(lspClient, source);
        const targetTypes = this.generateTargetTypes(holeType, relevantTypes, source);

        try {
          for (const hts of headerTypeSpans) {
            const recursiveChildTypes: string[] = ocamlParser.parse(hts.typeSpan);

            if (recursiveChildTypes.some((rct) => targetTypes.has(rct))) {
              relevantContext.add({ typeSpan: (hts.identifier + " : " + hts.typeSpan), sourceFile: source });
              continue;
            }

            this.extractRelevantHeadersHelper(hts.typeSpan, targetTypes, relevantTypes, relevantContext, hts.snippet, source);
          }

        } catch (err) {
          return new Set<TypeSpanAndSourceFile>();
          console.log(err)
        }

      }

      return relevantContext;
    } else {
      return relevantContext;
    }
  }


  async extractHeaderTypeSpans(
    lspClient: LspClient,
    preludeFilePath: string
  ): Promise<{ identifier: string, typeSpan: string, snippet: string }[]> {
    const docSymbols = await lspClient.documentSymbol({
      textDocument: {
        uri: `file://${preludeFilePath}`,
      }
    });

    if (docSymbols && docSymbols.length > 0) {
      const headerTypeSpans: { identifier: string, typeSpan: string, snippet: string }[] = [];

      const content = fs.readFileSync(preludeFilePath).toString("utf8");
      for (const docSymbol of docSymbols) {
        const ds: SymbolInformation = docSymbol as SymbolInformation;
        const snippet = extractSnippet(content, ds.location.range.start, ds.location.range.end);
        const isVar = content.split("\n")[ds.location.range.start.line].slice(0, 3) === "let" ? true : false;

        if (isVar) {
          const symbolHoverResult = await lspClient.hover({
            textDocument: {
              uri: `file://${preludeFilePath}`
            },
            position: {
              line: ds.location.range.start.line,
              character: ds.location.range.start.character + 5
            }
          })
          if (symbolHoverResult) {
            const formattedHoverResult = (symbolHoverResult.contents as MarkupContent).value.split("\n").reduce((acc, curr) => {
              if (curr != "" && curr != "```ocaml" && curr != "```") {
                return acc + curr;
              } else {
                return acc;
              }
            }, "");
            headerTypeSpans.push({ identifier: ds.name, typeSpan: formattedHoverResult, snippet: snippet });
          }
        }
      }

      return headerTypeSpans;
    }

    return [];
  }


  generateTargetTypes(holeType: string, relevantTypes: Map<string, TypeSpanAndSourceFile>, preludeFilePath: string) {
    const targetTypesSet = new Set<string>();
    this.generateTargetTypesHelper(relevantTypes, holeType, targetTypesSet);

    targetTypesSet.add(holeType);

    return targetTypesSet;
  }


  generateTargetTypesHelper(
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    currType: string,
    targetTypes: Set<string>
  ) {
    const constituentTypes: string[] = ocamlParser.parse(currType);

    for (const ct of constituentTypes) {
      targetTypes.add(ct);

      if (relevantTypes.has(ct)) {
        const definition = relevantTypes.get(ct)!.typeSpan.split("=")[1].trim();
        this.generateTargetTypesHelper(relevantTypes, definition, targetTypes);
      }
    }
  }


  // resursive helper for extractRelevantContext
  // checks for nested type equivalence
  extractRelevantHeadersHelper(typeSpan: string, targetTypes: Set<string>, relevantTypes: Map<string, TypeSpanAndSourceFile>, relevantContext: Set<TypeSpanAndSourceFile>, snippet: string, source: string) {
    targetTypes.forEach(typ => {
      if (this.isTypeEquivalent(typeSpan, typ, relevantTypes)) {
        relevantContext.add({ typeSpan: snippet, sourceFile: source });
      }

      const [ptyp_desc, ...components]: string[] = ocamlParser.getComponents(typ);

      if (this.typeChecker.isFunction(ptyp_desc)) {
        const rettype = components[1];

        this.extractRelevantHeadersHelper(rettype, targetTypes, relevantTypes, relevantContext, snippet, source);

      } else if (this.typeChecker.isTuple(ptyp_desc)) {
        components.forEach(element => {
          this.extractRelevantHeadersHelper(element, targetTypes, relevantTypes, relevantContext, snippet, source);
        });

      }
    });
  }


  // two types are equivalent if they have the same normal forms
  isTypeEquivalent(t1: string, t2: string, relevantTypes: Map<string, TypeSpanAndSourceFile>) {
    const normT1 = this.normalize(t1, relevantTypes);
    const normT2 = this.normalize(t2, relevantTypes);
    return normT1 === normT2;
  }


  // return the normal form given a type span and a set of relevant types
  normalize(typeSpan: string, relevantTypes: Map<string, TypeSpanAndSourceFile>) {
    let normalForm = "";

    // pattern matching for typeSpan
    if (this.typeChecker.isPrimitive(typeSpan)) {
      return typeSpan;

    } else if (this.typeChecker.isFunction(typeSpan)) {

    }
    else if (this.typeChecker.isTuple(typeSpan)) {
      const elements = this.typeChecker.parseTypeArrayString(typeSpan)

      elements.forEach((element, i) => {
        normalForm += this.normalize(element, relevantTypes);
        if (i < elements.length - 1) {
          normalForm += " * ";
        }
      });

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
      const typ = relevantTypes.get(typeSpan)!.typeSpan.split(" = ")[1];
      if (typ === undefined) {
        return typeSpan;
      }

      normalForm += this.normalize(typ, relevantTypes);
      return normalForm;

    } else {
      return typeSpan;
    }
  }

  async extractRelevantHeadersWithTreesitter(
    lspClient: LspClient | null,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    holeType: string,
    holeIdentifier: string,
    projectRoot: string
  ): Promise<Set<TypeSpanAndSourceFile>> {
    return new Set<TypeSpanAndSourceFile>();
  }
}


