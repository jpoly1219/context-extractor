import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
import { LanguageDriver } from "./types";
import { TypeScriptTypeChecker } from "./typescript-type-checker";
import { extractSnippet, formatTypeSpan } from "./utils";


export class TypeScriptDriver implements LanguageDriver {
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

              await this.extractRelevantTypes(
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
    console.log(currType, currType === undefined)
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

