import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { execSync } from "child_process";
import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
import { LanguageDriver, Context, TypeSpanAndSourceFile, Model, GPT4Config, GPT4PromptComponent } from "./types";
import { TypeScriptTypeChecker } from "./typescript-type-checker";
import { extractSnippet, removeLines } from "./utils";
import { Type } from "typescript";


export class TypeScriptDriver implements LanguageDriver {
  typeChecker: TypeScriptTypeChecker = new TypeScriptTypeChecker();
  config: GPT4Config = {
    model: Model.GPT4,
    apiBase: "",
    deployment: "",
    gptModel: "",
    apiVersion: "",
    apiKey: "",
    temperature: 0.6
  };
  runningPrompt: GPT4PromptComponent[] = []

  async init(lspClient: LspClient, sketchPath: string, credentialsPath: string) {
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

    this.readConfig(credentialsPath);
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

    const sketchSymbol = await lspClient.documentSymbol({
      textDocument: {
        uri: `file://${injectedSketchFilePath}`,
      }
    });

    return {
      fullHoverResult: formattedHoverResult,
      functionName: functionName,
      functionTypeSpan: functionTypeSpan,
      linePosition: linePosition,
      characterPosition: characterPosition,
      holeTypeDefLinePos: 0,
      holeTypeDefCharPos: "declare function _(): ".length,
      // range: { start: { line: 0, character: 0 }, end: { line: 0, character: 52 } }
      range: (sketchSymbol![0] as SymbolInformation).location.range,
      source: `file://${injectedSketchFilePath}`
    };
  }


  async extractRelevantTypes(
    lspClient: LspClient,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    endLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>, // identifier -> [full hover result, source]
    currentFile: string,
    // outputFile: fs.WriteStream,
  ) {
    if (!foundSoFar.has(typeName)) {
      foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7) });
      // outputFile.write(`${fullHoverResult};\n`);

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
                  // outputFile,
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
    _: LspClient,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    holeType: string
  ): Promise<Set<TypeSpanAndSourceFile>> {
    const relevantContext = new Set<TypeSpanAndSourceFile>();

    const targetTypes = this.generateTargetTypes(relevantTypes, holeType);

    // only consider lines that start with let or const
    for (const source of sources) {
      const sourceContent = fs.readFileSync(source).toString("utf8");
      const filteredLines = sourceContent.split("\n").filter((line) => {
        return line.slice(0, 3) === "let" || line.slice(0, 5) === "const";
      });

      // check for relationship between each line and relevant types
      filteredLines.forEach(line => {
        // TODO: Use the compiler API to split this.
        const splittedLine = line.split(" = ")[0];

        const typeSpanPattern = /(^[^:]*: )(.+)/;
        const regexMatch = splittedLine.match(typeSpanPattern)
        if (regexMatch) {
          const returnTypeSpan = regexMatch[2];
          if (!this.typeChecker.isPrimitive(returnTypeSpan.split(" => ")[1])) {
            this.extractRelevantHeadersHelper(returnTypeSpan, targetTypes, relevantTypes, relevantContext, splittedLine, source);
          }
        }
      });
    }

    return relevantContext;
  }


  generateTargetTypes(relevantTypes: Map<string, TypeSpanAndSourceFile>, holeType: string) {
    const targetTypes = new Set<string>();
    targetTypes.add(holeType);
    this.generateTargetTypesHelper(relevantTypes, holeType, targetTypes);

    return targetTypes;
  }


  // generateTargetTypesHelper(
  //   relevantTypes: Map<string, TypeSpanAndSourceFile>,
  //   currType: string,
  //   targetTypes: Set<string>
  // ) {
  //   // console.log("===Helper===")
  //   if (this.typeChecker.isFunction(currType)) {
  //     const functionPattern = /(\(.+\))( => )(.+)(;*)/;
  //     const rettype = currType.match(functionPattern)![3];
  //     targetTypes.add(rettype);
  //     this.generateTargetTypesHelper(relevantTypes, rettype, targetTypes);
  //
  //   } else if (this.typeChecker.isTuple(currType)) {
  //     const elements = this.typeChecker.parseTypeArrayString(currType)
  //
  //     elements.forEach(element => {
  //       targetTypes.add(element)
  //       this.generateTargetTypesHelper(relevantTypes, element, targetTypes);
  //     });
  //   } else {
  //     if (relevantTypes.has(currType)) {
  //       const definition = relevantTypes.get(currType)!.typeSpan.split(" = ")[1];
  //       this.generateTargetTypesHelper(relevantTypes, definition, targetTypes);
  //     }
  //   }
  // }


  generateTargetTypesHelper(
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    currType: string,
    targetTypes: Set<string>
  ) {
    // Run analysis on currType.
    const typeAnalysisResult = this.typeChecker.analyzeTypeString(currType);

    // Match on its kind.
    if (this.typeChecker.isFunction2(typeAnalysisResult)) {
      const rettype = typeAnalysisResult.returnType!;
      targetTypes.add(rettype.text)
      this.generateTargetTypesHelper(relevantTypes, rettype.text, targetTypes)

    } else if (this.typeChecker.isTuple2(typeAnalysisResult)) {
      typeAnalysisResult.constituents!.forEach(constituent => {
        targetTypes.add(constituent.text);
        this.generateTargetTypesHelper(relevantTypes, constituent.text, targetTypes);
      });

    } else {
      if (relevantTypes.has(currType)) {
        const definition = relevantTypes.get(currType)!.typeSpan.split(" = ")[1];
        this.generateTargetTypesHelper(relevantTypes, definition, targetTypes);
      }
    }
  }


  // resursive helper for extractRelevantContext
  // checks for nested type equivalence
  // extractRelevantHeadersHelper(typeSpan: string, targetTypes: Set<string>, relevantTypes: Map<string, TypeSpanAndSourceFile>, relevantContext: Set<TypeSpanAndSourceFile>, line: string, source: string) {
  //   // NOTE: BUGFIX
  //   // console.log(`typeSpan: ${typeSpan}`)
  //   // console.log(`targetTypes: ${targetTypes}`)
  //   targetTypes.forEach(typ => {
  //     if (this.isTypeEquivalent(typeSpan, typ, relevantTypes)) {
  //       relevantContext.add({ typeSpan: line, sourceFile: source });
  //     }
  //
  //     if (this.typeChecker.isFunction(typeSpan)) {
  //       const functionPattern = /(\(.+\))( => )(.+)/;
  //       const rettype = typeSpan.match(functionPattern)![3];
  //
  //       this.extractRelevantHeadersHelper(rettype, targetTypes, relevantTypes, relevantContext, line, source);
  //
  //     } else if (this.typeChecker.isTuple(typeSpan)) {
  //       const elements = this.typeChecker.parseTypeArrayString(typeSpan)
  //       // const elements = typeSpan.slice(1, typeSpan.length - 1).split(", ");
  //
  //       elements.forEach(element => {
  //         this.extractRelevantHeadersHelper(element, targetTypes, relevantTypes, relevantContext, line, source);
  //       });
  //
  //     }
  //   });
  // }


  extractRelevantHeadersHelper(
    typeSpan: string,
    targetTypes: Set<string>,
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    relevantContext: Set<TypeSpanAndSourceFile>,
    line: string,
    source: string
  ) {
    const typeAnalysisResult = this.typeChecker.analyzeTypeString(typeSpan);

    targetTypes.forEach(typ => {
      if (this.isTypeEquivalent(typeSpan, typ, relevantTypes)) {
        relevantContext.add({ typeSpan: line, sourceFile: source });
      }

      if (this.typeChecker.isFunction2(typeAnalysisResult)) {
        const rettype = typeAnalysisResult.returnType!;

        this.extractRelevantHeadersHelper(rettype.text, targetTypes, relevantTypes, relevantContext, line, source);

      } else if (this.typeChecker.isTuple2(typeAnalysisResult)) {
        typeAnalysisResult.constituents!.forEach(constituent => {
          this.extractRelevantHeadersHelper(constituent.text, targetTypes, relevantTypes, relevantContext, line, source);
        });

      }
    });
  }

  // two types are equivalent if they have the same normal forms
  isTypeEquivalent(t1: string, t2: string, relevantTypes: Map<string, TypeSpanAndSourceFile>) {
    // NOTE: BUGFIX
    // console.log(`isTypeEquivalent: ${t1}, ${t2}`)
    // console.log(t1 == undefined)
    // console.log(t2 == undefined)
    const normT1 = this.normalize(t1, relevantTypes);
    const normT2 = this.normalize(t2, relevantTypes);
    return normT1 === normT2;
  }


  // return the normal form given a type span and a set of relevant types
  // TODO: replace type checking with information from the AST?
  normalize(typeSpan: string, relevantTypes: Map<string, TypeSpanAndSourceFile>) {
    // NOTE: BUGFIX
    // console.log(`normalize: ${typeSpan}`)

    if (typeSpan.slice(typeSpan.length - 2) == " =") {
      typeSpan = typeSpan.slice(typeSpan.length - 2);
    }

    let normalForm = "";

    // pattern matching for typeSpan
    if (this.typeChecker.isPrimitive(typeSpan)) {
      return typeSpan;

    } else if (this.typeChecker.isObject(typeSpan)) {
      // console.log(`isObject: ${typeSpan}`)
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
      // console.log(`isTuple: ${typeSpan}`)
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
      // console.log(`isUnion: ${typeSpan}`)
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
      // console.log(`isArray: ${typeSpan}`)
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
      // console.log(`else: ${typeSpan}`)
      return typeSpan;
    }
  }

  normalize2(typeSpan: string, relevantTypes: Map<string, TypeSpanAndSourceFile>) {
    // NOTE: BUGFIX
    // console.log(`normalize: ${typeSpan}`)

    if (typeSpan.slice(typeSpan.length - 2) == " =") {
      typeSpan = typeSpan.slice(typeSpan.length - 2);
    }

    let normalForm = "";

    const analysisResult = this.typeChecker.analyzeTypeString(typeSpan)

    // pattern matching for typeSpan
    // if (this.typeChecker.isPrimitive(typeSpan)) {
    if (this.typeChecker.isPrimitive2(analysisResult)) {
      return typeSpan;

      // } else if (this.typeChecker.isObject(typeSpan)) {
    } else if (this.typeChecker.isObject2(analysisResult)) {
      // console.log(`isObject: ${typeSpan}`)
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

      // } else if (this.typeChecker.isTuple(typeSpan)) {
    } else if (this.typeChecker.isTuple2(analysisResult)) {
      // console.log(`isTuple: ${typeSpan}`)
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

      // } else if (this.typeChecker.isUnion(typeSpan)) {
    } else if (this.typeChecker.isUnion2(analysisResult)) {
      // console.log(`isUnion: ${typeSpan}`)
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

      // } else if (this.typeChecker.isArray(typeSpan)) {
    } else if (this.typeChecker.isArray2(analysisResult)) {
      // console.log(`isArray: ${typeSpan}`)
      const element = typeSpan.split("[]")[0];

      normalForm += this.normalize(element, relevantTypes)
      normalForm += "[]";
      return normalForm;

      // } else if (this.typeChecker.isTypeAlias(typeSpan)) {
    } else if (this.typeChecker.isTypeAlias2(analysisResult)) {
      const typ = relevantTypes.get(typeSpan)!.typeSpan.split(" = ")[1];
      if (typ === undefined) {
        return typeSpan;
      }

      normalForm += this.normalize(typ, relevantTypes);
      return normalForm;

    } else {
      // console.log(`else: ${typeSpan}`)
      return typeSpan;
    }
  }

  readConfig(configPath: string) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    this.config = config as GPT4Config;
    // console.log(this.config);
  }

  generateTypesAndHeadersPrompt(sketchFileContent: string, holeType: string, relevantTypes: string, relevantHeaders: string) {
    const prompt = [{
      role: "system",
      content:
        [
          "CODE COMPLETION INSTRUCTIONS:",
          "- Reply with a functional, idiomatic replacement for the program hole marked '_()' in the provided TypeScript program sketch",
          "- Reply only with a single replacement term for the unqiue distinguished hole marked '_()'",
          "Reply only with code",
          "- DO NOT include the program sketch in your reply",
          "- DO NOT include a period at the end of your response and DO NOT use markdown",
          "- DO NOT include a type signature for the program hole, as this is redundant and is already in the provided program sketch"
        ].join("\n"),
    }];

    let userPrompt = {
      role: "user",
      content: ""
    };

    if (relevantTypes) {
      userPrompt.content +=
        `# The expected type of the goal completion is ${holeType} #

# The following type definitions are likely relevant: #
${relevantTypes}

      `
    }
    if (relevantHeaders) {
      userPrompt.content += `
# Consider using these variables relevant to the expected type: #
${relevantHeaders}

      `;
    }

    userPrompt.content += `# Program Sketch to be completed: #\n${removeLines(sketchFileContent).join("\n")}`;

    prompt.push(userPrompt);
    return prompt;
  };


  async completeWithLLM(targetDirectoryPath: string, context: Context): Promise<string> {
    console.log("completeWithLLM TS")
    let joinedTypes = "";
    let joinedHeaders = "";
    context.relevantTypes.forEach((v, _) => {
      joinedTypes = joinedTypes + v.join("\n") + "\n";
    })
    context.relevantHeaders.forEach((v, _) => {
      joinedHeaders = joinedHeaders + v.join("\n") + "\n";
    })
    // Create a prompt.
    const prompt = this.generateTypesAndHeadersPrompt(
      fs.readFileSync(path.join(targetDirectoryPath, "sketch.ts"), "utf8"),
      context.holeType,
      joinedTypes,
      joinedHeaders
    );

    // Call the LLM to get completion results back.
    const apiBase = this.config.apiBase;
    const deployment = this.config.deployment;
    const model = this.config.gptModel;
    const apiVersion = this.config.apiVersion;
    const apiKey = this.config.apiKey;

    const openai = new OpenAI({
      apiKey,
      baseURL: `${apiBase}/openai/deployments/${deployment}`,
      defaultQuery: { "api-version": apiVersion },
      defaultHeaders: { "api-key": apiKey }
    })

    const llmResult = await openai.chat.completions.create({
      model,
      messages: prompt as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: this.config.temperature
    })

    console.log(llmResult.choices[0].message.content!);
    return llmResult.choices[0].message.content!;
  }


  // async correctWithLLM(targetDirectoryPath: string, context: Context, message: string) {
  //   const errorCorrectionPrompt = this.generateTypesAndHeadersPrompt(message);
  // }

}


