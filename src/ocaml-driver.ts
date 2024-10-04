import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { execSync } from "child_process";
import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
import { LanguageDriver, Context, GPT4Config, Model } from "./types";
import { OcamlTypeChecker } from "./ocaml-type-checker";
import { extractSnippet, removeLines } from "./utils";
import ocamlParser = require("../src/ocaml-utils/_build/default/test_parser.bc.js");


export class OcamlDriver implements LanguageDriver {
  typeChecker: OcamlTypeChecker = new OcamlTypeChecker();
  config: GPT4Config = {
    model: Model.GPT4,
    apiBase: "",
    deployment: "",
    gptModel: "",
    apiVersion: "",
    apiKey: "",
    temperature: 0.6
  };

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
    if (!foundSoFar.has(typeName)) {
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

    try {
      for (const hts of headerTypeSpans) {
        const recursiveChildTypes: string[] = ocamlParser.parse(hts.typeSpan);

        if (recursiveChildTypes.some((rct) => targetTypes.has(rct))) {
          relevantContext.add(hts.identifier + " : " + hts.typeSpan);
          continue;
        }

        this.extractRelevantHeadersHelper(hts.typeSpan, targetTypes, relevantTypes, relevantContext, hts.snippet)
      }

      return Array.from(relevantContext);

    } catch (err) {
      console.log(err)
      return [];
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
  extractRelevantHeadersHelper(typeSpan: string, targetTypes: Set<string>, relevantTypes: Map<string, string>, relevantContext: Set<string>, snippet: string) {
    targetTypes.forEach(typ => {
      if (this.isTypeEquivalent(typeSpan, typ, relevantTypes)) {
        relevantContext.add(snippet);
      }

      const [ptyp_desc, ...components]: string[] = ocamlParser.getComponents(typ);

      if (this.typeChecker.isFunction(ptyp_desc)) {
        const rettype = components[1];

        this.extractRelevantHeadersHelper(rettype, targetTypes, relevantTypes, relevantContext, snippet);

      } else if (this.typeChecker.isTuple(ptyp_desc)) {
        components.forEach(element => {
          this.extractRelevantHeadersHelper(element, targetTypes, relevantTypes, relevantContext, snippet);
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
  normalize(typeSpan: string, relevantTypes: Map<string, string>) {
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


  readConfig(configPath: string) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    this.config = config as GPT4Config;
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
    // Create a prompt.
    const prompt = this.generateTypesAndHeadersPrompt(
      fs.readFileSync(path.join(targetDirectoryPath, "sketch.ml"), "utf8"),
      context.hole,
      context.relevantTypes.join("\n"),
      context.relevantHeaders.join("\n")
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

    return llmResult.choices[0].message.content!;
  }
}


