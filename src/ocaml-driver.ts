import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
import { LanguageDriver } from "./types";
import { OcamlTypeChecker } from "./ocaml-type-checker";
import { extractSnippet, formatTypeSpan } from "./utils";
import { hasOnlyExpressionInitializer, walkUpBindingElementsAndPatterns } from "typescript";
// import * as ocamlParser from "/home/jacob/projects/context-extractor/src/ocaml-utils/_build/default/test_parser.bc.js";
import ocamlParser = require("/home/jacob/projects/context-extractor/src/ocaml-utils/_build/default/test_parser.bc.js");
// const ocamlParser = require("./test_parser.bc.js");


export class OcamlDriver implements LanguageDriver {
  typeChecker: OcamlTypeChecker = new OcamlTypeChecker();

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
    const sketchDir = path.dirname(sketchFilePath);
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");

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
    console.log(JSON.parse(holeCtx.result))
    console.log(holeCtx.result)

    const sketchSymbol = await lspClient.documentSymbol({
      textDocument: {
        uri: `file://${sketchFilePath}`
      }
    })


    // NOTE: This can be improved to make it check for a document symbol where
    // its range covers that of the hole's.
    // The current won't work if the sketch file has a lot of symbols,
    // because we are not guaranteed to have the sketch function with the hole
    // will always be at the top of the file.
    // One thing we can do is to use the custom OCaml parser.
    // A Pexp_fun will be split into a pattern and an expression.
    // This is the LHS and the RHS of the arrow type.

    return {
      fullHoverResult: "", //
      functionName: "_", // _
      functionTypeSpan: "model * action -> model", // model * action -> model
      linePosition: 3, // hole's line
      characterPosition: 47, // hole's character
      holeTypeDefLinePos: 3, // 
      holeTypeDefCharPos: 0, // "
      range: (sketchSymbol![0] as SymbolInformation).location.range
    };
  }


  async extractRelevantTypes(
    lspClient: LspClient,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    endLine: number,
    foundSoFar: Map<string, string>,
    currentFile: string,
    outputFile: fs.WriteStream,
  ) {
    // console.log(typeName)
    if (!foundSoFar.has(typeName)) {
      // console.log("params:", startLine, endLine)
      // foundSoFar.set(typeName, fullHoverResult.split(" = ")[1]);
      foundSoFar.set(typeName, fullHoverResult);
      outputFile.write(`${fullHoverResult};\n`);

      const content = fs.readFileSync(currentFile.slice(7), "utf8");

      for (let linePos = startLine; linePos <= endLine; ++linePos) {
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
              const dsMap = documentSymbolResult!.reduce((m, obj) => {
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
                  matchingSymbolRange.end.line,
                  foundSoFar,
                  (typeDefinitionResult[0] as Location).uri,
                  outputFile,
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
  }


  async extractRelevantHeaders(
    lspClient: LspClient,
    preludeFilePath: string,
    relevantTypes: Map<string, string>,
    holeType: string
  ): Promise<string[]> {
    const relevantContext = new Set<string>();

    const headerTypeSpans = await this.extractHeaderTypeSpans(lspClient, preludeFilePath);
    const targetTypes = this.generateTargetTypes(holeType, relevantTypes, preludeFilePath);
    console.log(targetTypes);

    for (const hts of headerTypeSpans) {
      const recursiveChildTypes: string[] = ocamlParser.parse(hts);
      // console.log(recursiveChildTypes)
      if (recursiveChildTypes.some((rct) => targetTypes.has(rct))) {
        relevantContext.add(hts);
      }
    }

    return Array.from(relevantContext);
  }


  async extractHeaderTypeSpans(
    lspClient: LspClient,
    preludeFilePath: string
  ): Promise<string[]> {
    const docSymbols = await lspClient.documentSymbol({
      textDocument: {
        uri: `file://${preludeFilePath}`,
      }
    });

    if (docSymbols && docSymbols.length > 0) {
      const headerTypeSpans: string[] = [];

      for (const docSymbol of docSymbols) {
        const ds: SymbolInformation = docSymbol as SymbolInformation;
        const isVar = fs.readFileSync(preludeFilePath).toString("utf8").split("\n")[ds.location.range.start.line].slice(0, 3) === "let" ? true : false;
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
            headerTypeSpans.push(formattedHoverResult);
          }
        }
      }

      return headerTypeSpans;
    }

    return [];
  }


  generateTargetTypes(holeType: string, relevantTypes: Map<string, string>, preludeFilePath: string) {
    const targetTypesSet = new Set<string>();
    this.generateTargetTypesHelper(relevantTypes, holeType, targetTypesSet);

    targetTypesSet.add(holeType);

    return targetTypesSet;
  }


  generateTargetTypesHelper(
    relevantTypes: Map<string, string>,
    currType: string,
    targetTypes: Set<string>
  ) {
    const constituentTypes: string[] = ocamlParser.parse(currType);

    for (const ct of constituentTypes) {
      targetTypes.add(ct);

      if (relevantTypes.has(ct)) {
        const definition = relevantTypes.get(ct)!.split("=")[1].trim();
        this.generateTargetTypesHelper(relevantTypes, definition, targetTypes);
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

