import * as ts from 'typescript';
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL, fileURLToPath } from 'url';
import OpenAI from "openai";
import { execSync } from "child_process";
import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
// import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "ts-lsp-client";
// import { ClientCapabilities, LspClient, Location, MarkupContent, Range, SymbolInformation } from "dist/ts-lsp-client-dist/src/main";
import { LanguageDriver, Context, TypeSpanAndSourceFile, Model, GPT4Config, GPT4PromptComponent, TypeAnalysis, VarFuncDecls, IDE, TypeSpanAndSourceFileAndAst } from "./types";
import { TypeScriptTypeChecker } from "./typescript-type-checker";
import { extractSnippet, insertAtPosition, removeLines } from "./utils";
import { transpileDeclaration, Type } from "typescript";
import { types } from "util";
// import * as vscode from "vscode";
// import { VsCode } from "./vscode-ide";
import { flushCompileCache } from "module";
import { LinkedEditingRanges, Position } from 'vscode';
import { getAst } from './ast';
import { extractFunctionTypeFromDecl, extractTopLevelDecls, findEnclosingTypeDeclaration, findTypeDeclarationGivenIdentifier, getFullLanguageName, getQueryForFile } from './tree-sitter';
import Parser from 'web-tree-sitter';


export class TypeScriptDriver implements LanguageDriver {
  ide: IDE;
  typeChecker: TypeScriptTypeChecker = new TypeScriptTypeChecker();
  vscodeImport: any;
  tsCompilerProgram: ts.Program;
  tsCompilerTypeChecker: ts.TypeChecker;

  constructor(
    ide: IDE,
    sources: string[],
    projectRoot: string
  ) {
    this.ide = ide;
    if (ide == "vscode") {
      import("./vscode-ide").then(module => this.vscodeImport = module);
    }

    // Initialize TypeScript compiler API.
    this.tsCompilerProgram = this.typeChecker.createTsCompilerProgram(sources, projectRoot);
    this.tsCompilerTypeChecker = this.tsCompilerProgram.getTypeChecker();
  }

  async init(
    lspClient: LspClient | null,
    sketchPath: string,
  ) {
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
          disableAutomaticTypingAcquisition: true,
          preferences: {
            includeInlayVariableTypeHints: true,
          }
        }
      });
    }
  }


  injectHole(sketchFilePath: string) {
    const sketchDir = path.dirname(sketchFilePath);
    const injectedSketchFilePath = path.join(sketchDir, "injected_sketch.ts");
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
    const injectedSketchFileContent = `declare function _<T>(): T\n${sketchFileContent}`;
    fs.writeFileSync(injectedSketchFilePath, injectedSketchFileContent);
  }


  async getHoleContext(
    lspClient: LspClient | null,
    sketchFilePath: string,
    logStream: fs.WriteStream | null
  ) {
    if (logStream) {
      logStream.write(`\n\n=*=*=*=*=*=[begin extracting hole context][${new Date().toISOString()}]\n\n`);
    }
    // For TypeScript programs, we need to inject the hole function before getting its context.
    // NOTE: this can be abstracted to its own method?
    const sketchDir = path.dirname(sketchFilePath);
    const injectedSketchFilePath = path.join(sketchDir, "injected_sketch.ts");
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
    const injectedSketchFileContent = `declare function _<T>(): T\n${sketchFileContent}`;
    // fs.writeFileSync(injectedSketchFilePath, injectedSketchFileContent);

    // Get the hole's position.
    const holePattern = /_\(\)/;
    const firstPatternIndex = injectedSketchFileContent.search(holePattern);
    const linePosition = (
      injectedSketchFileContent
        .substring(0, firstPatternIndex)
        .match(/\n/g)
    )!.length;
    const characterPosition = firstPatternIndex - (
      injectedSketchFileContent
        .split("\n", linePosition)
        .join("\n")
        .length
    ) - 1;

    if (lspClient) {
      // Sync client and server by notifying that
      // the client has opened all the files
      // inside the target directory.
      // lspClient.didOpen({
      //   textDocument: {
      //     uri: injectedSketchFilePath,
      //     languageId: "typescript",
      //     text: injectedSketchFileContent,
      //     version: 1
      //   }
      // });
      // fs.readdirSync(sketchDir).map(fileName => {
      //   if (fs.lstatSync(path.join(sketchDir, fileName)).isFile()) {
      //     lspClient.didOpen({
      //       textDocument: {
      //         uri: `file://${sketchDir}/${fileName}`,
      //         languageId: "typescript",
      //         text: fs.readFileSync(`${sketchDir}/${fileName}`).toString("ascii"),
      //         version: 1
      //       }
      //     });
      //   }
      // });

      // await (async () => {
      //   return new Promise(resolve => setTimeout(resolve, 500))
      // })();

      // const blocker = () => {
      //   for (let i = 0; i < 10000; ++i) {
      //     console.log(i)
      //   }
      // }
      // blocker();

      // console.log(characterPosition, linePosition)
      console.time("hover")
      const holeHoverResult = await lspClient.hover({
        textDocument: {
          uri: injectedSketchFilePath
        },
        position: {
          character: characterPosition,
          line: linePosition
        }
      });
      console.timeEnd("hover")

      const formattedHoverResult = (holeHoverResult.contents as MarkupContent).value.split("\n").reduce((acc: string, curr: string) => {
        if (curr != "" && curr != "```typescript" && curr != "```") {
          return acc + curr;
        } else {
          return acc;
        }
      }, "");

      // console.log(formattedHoverResult)

      // function _<(a: Apple, c: Cherry, b: Banana) => Cherry > (): (a: Apple, c: Cherry, b: Banana) => Cherry
      const holeFunctionPattern = /(function _)(\<.+\>)(\(\): )(.+)/;
      const match = formattedHoverResult.match(holeFunctionPattern);
      const functionName = "_()";
      // console.log("aaa")
      const functionTypeSpan = match![4];
      // console.log("bbb")

      // Clean up and inject the true hole function without the generic type signature.
      // NOTE: this can be abstracted to its own method?
      const trueHoleFunction = `declare function _(): ${functionTypeSpan}`
      const trueInjectedSketchFileContent = `${trueHoleFunction}\n${sketchFileContent}`
      fs.writeFileSync(injectedSketchFilePath, trueInjectedSketchFileContent);

      console.time("didChange")
      lspClient.didChange({
        textDocument: {
          uri: `file://${injectedSketchFilePath}`,
          version: 2
        },
        contentChanges: [{
          text: trueInjectedSketchFileContent
        }]
      });
      console.timeEnd("didChange")

      console.time("documentSymbol")
      const sketchSymbol = await lspClient.documentSymbol({
        textDocument: {
          uri: `file://${injectedSketchFilePath}`,
        }
      });
      console.timeEnd("documentSymbol")

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
        source: `file://${injectedSketchFilePath}`,
        trueHoleFunction: trueHoleFunction
      };
    } else {
      const holeHoverResult = await this.vscodeImport.VsCode.hover(
        {
          filepath: injectedSketchFilePath,
          position: {
            line: linePosition,
            character: characterPosition
          }
        }
      );

      const formattedHoverResult = holeHoverResult.text.split("\n").reduce((acc: string, curr: string) => {
        if (curr != "" && curr != "```typescript" && curr != "```") {
          return acc + curr;
        } else {
          return acc;
        }
      }, "");

      const holeFunctionPattern = /(function _)(\<.+\>)(\(\): )(.+)/;
      const match = formattedHoverResult.match(holeFunctionPattern);
      const functionName = "_()";
      const functionTypeSpan = match![4];

      // Clean up and inject the true hole function without the generic type signature.
      // NOTE: this can be abstracted to its own method?
      const trueHoleFunction = `declare function _(): ${functionTypeSpan}`
      const trueInjectedSketchFileContent = `${trueHoleFunction}\n${sketchFileContent}`
      fs.writeFileSync(injectedSketchFilePath, trueInjectedSketchFileContent);

      const sketchSymbol = await this.vscodeImport.VsCode.getDocumentSymbols({
        filepath: injectedSketchFilePath
      });

      return {
        fullHoverResult: formattedHoverResult,
        functionName: functionName,
        functionTypeSpan: functionTypeSpan,
        linePosition: linePosition,
        characterPosition: characterPosition,
        holeTypeDefLinePos: 0,
        holeTypeDefCharPos: "declare function _(): ".length,
        range: sketchSymbol[0].range,
        source: `file://${injectedSketchFilePath}`,
        trueHoleFunction: trueHoleFunction
      };
    }
  }


  async getHoleContextWithCompilerAPI(
    sketchFilePath: string,
    logStream: fs.WriteStream | null
  ) {
    if (logStream) {
      // logStream.write("")
    }

    // For TypeScript programs, we need to inject the hole function before getting its context.
    const sketchDir = path.dirname(sketchFilePath);
    const injectedSketchFilePath = path.join(sketchDir, "injected_sketch.ts");
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
    const injectedSketchFileContent = `declare function _<T>(): T\n${sketchFileContent}`;

    // Get the hole's position.
    const holePattern = /_\(\)/;
    const firstPatternIndex = injectedSketchFileContent.search(holePattern);
    const linePosition = (
      injectedSketchFileContent
        .substring(0, firstPatternIndex)
        .match(/\n/g)
    )!.length;
    const characterPosition = firstPatternIndex - (
      injectedSketchFileContent
        .split("\n", linePosition)
        .join("\n")
        .length
    ) - 1;

    // const sourceFile = ts.createSourceFile("sample.ts", injectedSketchFileContent, ts.ScriptTarget.Latest, true);
    const sourceFile = this.tsCompilerProgram.getSourceFile(injectedSketchFilePath)!;
    const position = ts.getPositionOfLineAndCharacter(sourceFile, linePosition, characterPosition);

    function findNode(node: ts.Node): ts.Node | undefined {
      if (position >= node.getStart() && position <= node.getEnd()) {
        // NOTE: this is probably unnecessary if characterPosition accounted for the (), not just _
        if (node.getText() === "_()") {
          return node;
        }
        return ts.forEachChild(node, findNode) || node;
      }
    }

    const targetNode = findNode(sourceFile);

    if (!(targetNode && ts.isCallExpression(targetNode))) {
      console.log("Node not found or not a call expression.");
      throw new Error("Node not found or not a call expression.");
    }

    const type = this.tsCompilerTypeChecker.getTypeAtLocation(targetNode);
    const typeString = this.tsCompilerTypeChecker.typeToString(type);
    const typeStr = `function _<${typeString}>(): ${typeString}`
    // console.log("TYPE:", typeStr);

    // function _<(a: Apple, c: Cherry, b: Banana) => Cherry > (): (a: Apple, c: Cherry, b: Banana) => Cherry
    const holeFunctionPattern = /(function _)(\<.+\>)(\(\): )(.+)/;
    const match = typeStr.match(holeFunctionPattern);
    const functionName = "_()";
    const functionTypeSpan = match![4];

    // Clean up and inject the true hole function without the generic type signature.
    // NOTE: this can be abstracted to its own method?
    const trueHoleFunction = `declare function _(): ${functionTypeSpan}`
    const trueInjectedSketchFileContent = `${trueHoleFunction}\n${sketchFileContent}`
    fs.writeFileSync(injectedSketchFilePath, trueInjectedSketchFileContent);

    return {
      fullHoverResult: typeStr,
      functionName: functionName,
      functionTypeSpan: functionTypeSpan,
      linePosition: linePosition,
      characterPosition: characterPosition,
      holeTypeDefLinePos: 0,
      holeTypeDefCharPos: "declare function _(): ".length,
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 52 } },
      // range: (sketchSymbol![0] as SymbolInformation).location.range,
      source: `file://${injectedSketchFilePath}`,
      trueHoleFunction: trueHoleFunction
    };
  }

  async getHoleContextWithTreesitter(
    sketchFilePath: string,
    cursorPosition: { line: number, character: number },
    logStream: fs.WriteStream | null
  ) {
    if (logStream) {
      // logStream.write("")
    }

    // We need to inject the hole @ to trigger an error node.
    const sketchFileContent = fs.readFileSync(sketchFilePath, "utf8");
    const injectedContent = insertAtPosition(sketchFileContent, cursorPosition, "@;")

    // The hole's position is cursorPosition.
    const snip = extractSnippet(injectedContent, cursorPosition, { line: cursorPosition.line, character: cursorPosition.character + 2 });
    // console.log(snip)

    // Use treesitter to parse.
    const ast = await getAst(sketchFilePath, injectedContent);
    if (!ast) {
      throw new Error("failed to get ast");
    }
    const language = getFullLanguageName(sketchFilePath);
    const queryPath = require.resolve(`./tree-sitter-files/queries/hole-queries/${language}.scm`)
    const query = await getQueryForFile(
      sketchFilePath,
      queryPath
      // path.join(
      //   __dirname,
      //   "tree-sitter-files",
      //   "queries",
      //   "hole-queries",
      //   `${language}.scm`
      // ),
    );
    if (!query) {
      throw new Error(`failed to get query for file ${sketchFilePath} and language ${language}`);
    }

    // const matches = query.matches(ast.rootNode);
    // console.log(JSON.stringify(matches))
    // for (const m of matches) {
    //   console.log(m)
    // }
    // for (const m of matches) {
    //   for (const c of m.captures) {
    //     const { name, node } = c;
    //     console.log(`${name} →`, node.text, node.startPosition, node.endPosition);
    //   }
    // }
    const captures = query.captures(ast.rootNode);
    const res: {
      fullHoverResult: string;
      functionName: string;
      functionTypeSpan: string;
      linePosition: number;
      characterPosition: number;
      holeTypeDefLinePos: number;
      holeTypeDefCharPos: number;
      range: Range;
      source: string;
      trueHoleFunction?: string;
    } = {
      fullHoverResult: "",
      functionName: "",
      functionTypeSpan: "",
      linePosition: 0,
      characterPosition: 0,
      holeTypeDefLinePos: 0,
      holeTypeDefCharPos: "declare function _(): ".length,
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 52 } },
      // range: (sketchSymbol![0] as SymbolInformation).location.range,
      source: `file://${sketchFilePath}`,
      trueHoleFunction: ""
    }
    for (const c of captures) {
      const { name, node } = c;
      // console.log(`${name} →`, node.text, node.startPosition, node.endPosition);

      switch (name) {
        case "function.decl": {
          res.fullHoverResult = node.text;
        }
        case "function.name": {
          res.functionName = node.text;
        }
        case "function.type": {
          res.functionTypeSpan = node.text;
          res.range = {
            start: {
              line: node.startPosition.row,
              character: node.startPosition.column,
            },
            end: {
              line: node.endPosition.row,
              character: node.endPosition.column,
            }
          }
        }
      }
    }

    return res;
  }


  // TODO: delete
  async extractRelevantTypes1(
    lspClient: LspClient,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    endLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>, // identifier -> [full hover result, source]
    currentFile: string,
    foundTypeDefinitions: Map<string, Location[]>,
    foundSymbols: Map<string, SymbolInformation[]>
    // outputFile: fs.WriteStream,
  ) {
    if (!foundSoFar.has(typeName)) {
      foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7) });
      // outputFile.write(`${fullHoverResult};\n`);

      const content = fs.readFileSync(currentFile.slice(7), "utf8");


      for (let linePos = startLine; linePos <= endLine; ++linePos) {
        // TODO: use a platform-agnostic command here
        const numOfCharsInLine = parseInt(execSync(`wc -m <<< "${content.split("\n")[linePos]}"`, { shell: "/bin/bash" }).toString());
        const numOfCharsInLine2 = content.split("\n")[linePos].length;
        const numOfCharsInLine3 = [...content.split("\n")[linePos]].map(c => c.codePointAt(0)).length;
        // console.log(numOfCharsInLine === numOfCharsInLine2, content.split("\n")[linePos], numOfCharsInLine, numOfCharsInLine2, numOfCharsInLine3)

        // console.time(`===loop ${content.split("\n")[linePos]}===`);
        for (let charPos = 0; charPos < numOfCharsInLine2; ++charPos) {
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
            // if (content.split("\n")[linePos] === `type Action = AddBooking | CancelBooking | ClearBookings;`) {
            //   console.dir(typeDefinitionResult, { depth: null })
            //   console.log(charPos)
            // }

            if (typeDefinitionResult && typeDefinitionResult instanceof Array && typeDefinitionResult.length != 0) {
              const tdResultStr = JSON.stringify(typeDefinitionResult as Location[]);
              if (!foundTypeDefinitions.has(tdResultStr)) {
                foundTypeDefinitions.set(tdResultStr, typeDefinitionResult as Location[]);

                // Use documentSymbol instead of hover.
                // This prevents type alias "squashing" done by tsserver.
                // This also allows for grabbing the entire definition range and not just the symbol range.
                // PERF: feels like this could be memoized to improve performance.

                // console.time("docSymbol")
                const tdUri = (typeDefinitionResult[0] as Location).uri;
                let documentSymbolResult;
                if (foundSymbols.has(tdUri)) {
                  documentSymbolResult = foundSymbols.get(tdUri)!;
                } else {
                  documentSymbolResult = await lspClient.documentSymbol({
                    textDocument: {
                      uri: (typeDefinitionResult[0] as Location).uri
                    }
                  }) as SymbolInformation[];
                  foundSymbols.set(tdUri, documentSymbolResult);
                }
                // console.timeEnd("docSymbol")

                // console.time("dsMap")
                const dsMap = documentSymbolResult.reduce((m, obj) => {
                  m.set((obj as SymbolInformation).location.range.start.line, (obj as SymbolInformation).location.range as unknown as Range);
                  return m;
                }, new Map<number, Range>());
                // console.timeEnd("dsMap")


                // console.log("\n")
                // console.dir(typeDefinitionResult, { depth: null })
                // console.dir(documentSymbolResult, { depth: null })
                // console.log("\n")
                // grab if the line number of typeDefinitionResult and documentSymbolResult matches
                // const dsMap = documentSymbolResult!.reduce((m, obj) => {
                //   m.set((obj as SymbolInformation).location.range.start.line, (obj as SymbolInformation).location.range as unknown as Range);
                //   return m;
                // }, new Map<number, Range>());

                const matchingSymbolRange: Range | undefined = dsMap.get((typeDefinitionResult[0] as Location).range.start.line);
                if (matchingSymbolRange) {
                  const snippetInRange = extractSnippet(fs.readFileSync((typeDefinitionResult[0] as Location).uri.slice(7)).toString("utf8"), matchingSymbolRange.start, matchingSymbolRange.end)
                  // TODO: this can potentially be its own method. the driver would require some way to get type context.
                  // potentially, this type checker can be its own class.
                  const identifier = this.typeChecker.getIdentifierFromDecl(snippetInRange);

                  await this.extractRelevantTypes1(
                    lspClient,
                    snippetInRange,
                    identifier,
                    matchingSymbolRange.start.line,
                    matchingSymbolRange.end.line,
                    foundSoFar,
                    (typeDefinitionResult[0] as Location).uri,
                    foundTypeDefinitions,
                    foundSymbols
                    // outputFile,
                  );

                }
              }
            }
            // else {
            //   console.log(`already found ${tdResultStr}!`)
            // }

          } catch (err) {
            console.log(`${err}`)
          }
        }
        // console.timeEnd(`===loop ${content.split("\n")[linePos]}===`);
      }
    }

    return foundSoFar;
  }


  async extractRelevantTypes(
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    logStream: fs.WriteStream | null
  ) {

    if (logStream) {
      logStream.write(`\n\n=*=*=*=*=*=[begin extracting relevant headers][${new Date().toISOString()}]\n\n`);
    }

    // const content = fs.readFileSync(currentFile.slice(7), "utf8");
    // console.log(content)
    await this.extractRelevantTypesHelper(lspClient, fullHoverResult, typeName, startLine, foundSoFar, currentFile, foundContents, 0);

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

    if (logStream) {
      logStream.write(`\n\n=*=*=*=*=*=[begin extracting relevant headers][${new Date().toISOString()}]\n\n`);
    }

    await this.extractRelevantTypesHelperWithTreesitter(lspClient, fullHoverResult, typeName, startLine, foundSoFar, currentFile, foundContents, 0);
    return foundSoFar;
  }


  async extractRelevantTypesHelper(
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    layer: number
  ) {
    if (lspClient) {
      // console.log("===", fullHoverResult, layer, startLine, "===")
      // Split the type span into identifiers, where each include the text, line number, and character range.
      // For each identifier, invoke go to type definition.
      if (!foundSoFar.has(typeName)) {
        foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7) });

        // console.log(fullHoverResult)
        const identifiers = this.typeChecker.extractIdentifiers(fullHoverResult);
        // DEBUG: REMOVE
        // console.log("identifiers")
        // console.log(fullHoverResult)
        // console.dir(identifiers, { depth: null })

        for (const identifier of identifiers) {
          // console.log(`== loop ==`)
          // console.dir(identifier, { depth: null })
          // console.time(`loop ${identifier.name} layer ${layer}`)
          // if (identifier.name === "_") {
          //   console.timeEnd(`loop ${identifier.name} layer ${layer}`)
          //   continue;
          // };
          // console.log(identifier)
          // console.log(foundSoFar.has(identifier.name))
          if (!foundSoFar.has(identifier.name)) {
            try {
              // const start = performance.now()
              const typeDefinitionResult = await lspClient.typeDefinition({
                textDocument: {
                  uri: currentFile
                },
                position: {
                  character: identifier.start,
                  line: startLine + identifier.line - 1 // startLine is already 1-indexed
                }
              });
              // const end = performance.now()
              // console.log(end - start)
              // if (identifier.name == "Model") {
              //   console.log(identifier)
              //   console.dir(typeDefinitionResult, { depth: null })
              // }

              if (typeDefinitionResult && typeDefinitionResult instanceof Array && typeDefinitionResult.length != 0) {
                const tdLocation = typeDefinitionResult[0] as Location;
                let content = "";
                if (foundContents.has(tdLocation.uri.slice(7))) {
                  content = foundContents.get(tdLocation.uri.slice(7))!;
                } else {
                  content = fs.readFileSync(tdLocation.uri.slice(7), "utf8");
                  foundContents.set(tdLocation.uri.slice(7), content);
                }
                // console.log(extractSnippet(content, { line: tdLocation.range.start.line, character: tdLocation.range.start.character }, { line: tdLocation.range.end.line, character: tdLocation.range.end.character }))
                const decl = this.typeChecker.findDeclarationForIdentifier(content, tdLocation.range.start.line, tdLocation.range.start.character, tdLocation.range.end.character);
                if (decl) {
                  // const ident = this.typeChecker.getIdentifierFromDecl(decl);
                  // console.log(ident == identifier.name, ident, identifier.name, decl)
                  // console.log(`Decl: ${decl} || Identifier: ${ident}`)
                  // console.timeEnd(`loop ${identifier.name} layer ${layer}`)
                  await this.extractRelevantTypesHelper(
                    lspClient,
                    decl,
                    identifier.name,
                    tdLocation.range.start.line,
                    foundSoFar,
                    tdLocation.uri,
                    foundContents,
                    layer + 1,
                  );
                } else {
                  // console.log("decl not found")
                  // console.timeEnd(`loop ${identifier.name} layer ${layer}`)
                }
              } else {
                // console.log("td not found")
                // console.dir(typeDefinitionResult, { depth: null })
              }
            } catch (err) {
              console.log(err)
            }
          } else {
            // console.timeEnd(`loop ${identifier.name} layer ${layer}`)
          }
        }
      }
    } else {
      // TODO: Test this.
      if (!foundSoFar.has(typeName)) {
        foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7) });

        const identifiers = this.typeChecker.extractIdentifiers(fullHoverResult);
        for (const identifier of identifiers) {
          if (!foundSoFar.has(identifier.name)) {
            try {
              const typeDefinitionResult = await this.vscodeImport.VsCode.gotoTypeDefinition({
                filepath: currentFile,
                position: {
                  line: startLine + identifier.line - 1,
                  character: identifier.start
                }
              });

              if (typeDefinitionResult.length != 0) {
                const tdLocation = typeDefinitionResult[0];
                let content = "";
                if (foundContents.has(tdLocation.filepath)) {
                  content = foundContents.get(tdLocation.filepath)!;
                } else {
                  content = fs.readFileSync(tdLocation.filepath, "utf8");
                  foundContents.set(tdLocation.filepath, content);
                }

                const decl = this.typeChecker.findDeclarationForIdentifier(content, tdLocation.range.start.line, tdLocation.range.start.character, tdLocation.range.end.character);

                if (decl) {
                  await this.extractRelevantTypesHelper(
                    lspClient,
                    decl,
                    identifier.name,
                    tdLocation.range.start.line,
                    foundSoFar,
                    tdLocation.filepath,
                    foundContents,
                    layer + 1
                  )
                } else {
                  console.log("decl not found");
                }
              } else {
                console.log("td not found");
              }
            } catch (err) {
              console.log(err);
            }
          } else {

          }
        }
      }
    }
  }


  async extractRelevantTypesWithCompilerAPI(
    fullHoverResult: string,
    typeName: string,
    linePosition: number,
    characterPosition: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    logStream: fs.WriteStream | null
  ) {

    if (logStream) {
      logStream.write(`\n\n=*=*=*=*=*=[begin extracting relevant headers][${new Date().toISOString()}]\n\n`);
    }

    // const content = fs.readFileSync(currentFile.slice(7), "utf8");
    // console.log(content)
    await this.extractRelevantTypesHelperWithCompilerAPI(fullHoverResult, typeName, linePosition, characterPosition, foundSoFar, currentFile, foundContents, 0);
    return foundSoFar;
  }


  async extractRelevantTypesHelperWithCompilerAPI(
    fullHoverResult: string,
    typeName: string,
    linePosition: number,
    characterPosition: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    layer: number
  ) {
    // console.log("CURRENT TYPE:", typeName, fullHoverResult)
    // Split the type span into identifiers, where each include the text, line number, and character range.
    // For each identifier, invoke go to type definition.
    if (!foundSoFar.has(typeName)) {
      foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7) });

      const identifiers = this.typeChecker.extractIdentifiers(fullHoverResult);
      const sourceFile = this.tsCompilerProgram.getSourceFile(currentFile.slice(7))!;

      for (const identifier of identifiers) {
        if (!foundSoFar.has(identifier.name)) {
          try {
            // console.log(identifier, linePosition, characterPosition, linePosition + identifier.line, identifier.start)
            const position = ts.getPositionOfLineAndCharacter(sourceFile, linePosition + identifier.line - 1, identifier.start);
            // const typeDefinitionResult = await lspClient.typeDefinition({
            //   textDocument: {
            //     uri: currentFile
            //   },
            //   position: {
            //     character: identifier.start,
            //     line: startLine + identifier.line - 1 // startLine is already 1-indexed
            //   }
            // });
            function findNodeAtPosition(node: ts.Node): ts.Node | undefined {
              if (position >= node.getStart() && position < node.getEnd()) {
                return ts.forEachChild(node, findNodeAtPosition) || node;
              }
              return undefined;
            }
            function findIdentifierAtPosition(sourceFile: ts.SourceFile, position: number): ts.Identifier | undefined {
              function find(node: ts.Node): ts.Identifier | undefined {
                if (ts.isIdentifier(node) && position >= node.getStart() && position <= node.getEnd()) {
                  return node;
                }
                return ts.forEachChild(node, find);
              }
              return find(sourceFile);
            }
            const node = findNodeAtPosition(sourceFile);
            // const node = findIdentifierAtPosition(sourceFile, position);
            if (!node) {
              throw new Error("Node not found");
            }

            const possiblyPrimitiveType = this.tsCompilerTypeChecker.getTypeAtLocation(node);
            if (
              possiblyPrimitiveType.flags & ts.TypeFlags.String ||
              possiblyPrimitiveType.flags & ts.TypeFlags.Number ||
              possiblyPrimitiveType.flags & ts.TypeFlags.Boolean ||
              possiblyPrimitiveType.flags & ts.TypeFlags.Null ||
              possiblyPrimitiveType.flags & ts.TypeFlags.Undefined ||
              possiblyPrimitiveType.flags & ts.TypeFlags.Void ||
              possiblyPrimitiveType.flags & ts.TypeFlags.ESSymbol ||
              possiblyPrimitiveType.flags & ts.TypeFlags.ESSymbolLike ||
              possiblyPrimitiveType.flags & ts.TypeFlags.UniqueESSymbol ||
              possiblyPrimitiveType.flags & ts.TypeFlags.BigInt
            ) {
              // console.log("Primitive type", this.tsCompilerTypeChecker.typeToString(possiblyPrimitiveType))
              return
            }

            const symbol = this.tsCompilerTypeChecker.getSymbolAtLocation(node);
            if (!symbol || !symbol.declarations?.length) {
              throw new Error("Symbol not found");
            }
            const trueSymbol = symbol && symbol.flags & ts.SymbolFlags.Alias
              ? this.tsCompilerTypeChecker.getAliasedSymbol(symbol)
              : symbol;

            if (trueSymbol?.declarations?.length) {
              const decl = trueSymbol.declarations[0];
              // console.log(decl)
              if (ts.isTypeAliasDeclaration(decl)) {
                // console.log("DECL TEXT", decl.getText())
                // const rhs = decl.type;
                // const typ = this.tsCompilerTypeChecker.getTypeAtLocation(rhs);
                // const typStr = this.tsCompilerTypeChecker.typeToString(typ);
                //
                // console.log("Resolved type (RHS):", typStr);

                // const rhsSource = rhs.getSourceFile();
                // console.log(symbol.declarations)
                // console.log("DECL", decl)
                // console.log("TYPE AT LOC", this.tsCompilerTypeChecker.getTypeAtLocation(decl))
                // console.log("TYPE TO STR", this.tsCompilerTypeChecker.typeToString(this.tsCompilerTypeChecker.getTypeAtLocation(decl)))
                const declSourceFile = decl.getSourceFile();
                const start = ts.getLineAndCharacterOfPosition(declSourceFile, decl.getStart());
                const end = ts.getLineAndCharacterOfPosition(declSourceFile, decl.getEnd());
                // console.log("LOCATION", start, end, declSourceFile.fileName)

                await this.extractRelevantTypesHelperWithCompilerAPI(
                  decl.getText(),
                  identifier.name,
                  start.line,
                  start.character,
                  foundSoFar,
                  `file://${declSourceFile.fileName}`,
                  foundContents,
                  layer + 1,
                );
              }
            }

          } catch (err) {
            console.log(err)
          }
        } else {
        }
      }
    }
  }

  async extractRelevantTypesHelperWithTreesitter(
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFileAndAst>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    layer: number,
  ) {
    if (lspClient) {
      // Split the type span into identifiers, where each include the text, line number, and character range.
      // For each identifier, invoke go to type definition.
      if (!foundSoFar.has(typeName)) {
        // const identifiers = this.typeChecker.extractIdentifiers(fullHoverResult);
        // const currentFileContent = fs.readFileSync(currentFile, "utf8");
        const ast = await getAst(currentFile, fullHoverResult);
        if (!ast) {
          throw new Error(`failed to get ast for file ${currentFile}`);
        }

        foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7), ast: ast });

        const language = getFullLanguageName(currentFile);
        const queryPath = require.resolve(`./tree-sitter-files/queries/relevant-types-queries/${language}-extract-identifiers.scm`)
        const query = await getQueryForFile(
          currentFile,
          queryPath
          // path.join(
          //   __dirname,
          //   "tree-sitter-files",
          //   "queries",
          //   "relevant-types-queries",
          //   `${language}-extract-identifiers.scm`,
          // )
        );
        if (!query) {
          throw new Error(`failed to get query for file ${currentFile} and language ${language}`);
        }

        const identifiers = query.captures(ast.rootNode);

        for (const { name, node } of identifiers) {
          // console.log(`${name} →`, node.text, node.startPosition, node.endPosition);
          if (!foundSoFar.has(node.text)) {
            try {
              const typeDefinitionResult = await lspClient.typeDefinition({
                textDocument: {
                  uri: currentFile
                },
                position: {
                  character: node.startPosition.column,
                  line: startLine + node.startPosition.row
                }
              });

              if (typeDefinitionResult && typeDefinitionResult instanceof Array && typeDefinitionResult.length != 0) {
                const tdLocation = typeDefinitionResult[0] as Location;

                let content = "";

                if (foundContents.has(tdLocation.uri.slice(7))) {
                  content = foundContents.get(tdLocation.uri.slice(7))!;
                } else {
                  content = fs.readFileSync(tdLocation.uri.slice(7), "utf8");
                  foundContents.set(tdLocation.uri.slice(7), content);
                }

                const ast = await getAst(tdLocation.uri, content);
                if (!ast) {
                  throw new Error(`failed to get ast for file ${tdLocation.uri}`);
                }
                const decl = findEnclosingTypeDeclaration(content, tdLocation.range.start.line, tdLocation.range.start.character, ast);
                if (!decl) {
                  // throw new Error(`failed to get decl for file ${tdLocation.uri}`);
                  console.log(`failed to get decl for file ${tdLocation.uri}`);
                }

                if (decl) {
                  await this.extractRelevantTypesHelperWithTreesitter(
                    lspClient,
                    decl.fullText,
                    node.text,
                    tdLocation.range.start.line,
                    foundSoFar,
                    tdLocation.uri,
                    foundContents,
                    layer + 1,
                  );
                } else {
                  // console.log("decl not found")
                }
              } else {
                // console.log("td not found")
                // console.dir(typeDefinitionResult, { depth: null })
              }
            } catch (err) {
              console.log(err)
            }
          } else {
            // console.log(`foundSoFar has ${node.text}`)
          }
        }
      }
    } else {
      // TODO: Test this.
      if (!foundSoFar.has(typeName)) {
        const ast = await getAst(currentFile, fullHoverResult);
        if (!ast) {
          throw new Error(`failed to get ast for file ${currentFile}`);
        }
        foundSoFar.set(typeName, { typeSpan: fullHoverResult, sourceFile: currentFile.slice(7), ast: ast });

        const language = getFullLanguageName(currentFile);
        const queryPath = require.resolve(`./tree-sitter-files/queries/relevant-headers-queries/${language}-extract-identifiers.scm`)
        const query = await getQueryForFile(
          currentFile,
          queryPath
          // path.join(
          //   __dirname,
          //   "tree-sitter-files",
          //   "queries",
          //   "relevant-headers-queries",
          //   `${language}-extract-identifiers.scm`,
          // )
        );
        if (!query) {
          throw new Error(`failed to get query for file ${currentFile} and language ${language}`);
        }

        const identifiers = query.captures(ast.rootNode);

        for (const { name, node } of identifiers) {
          if (!foundSoFar.has(node.text)) {
            try {
              const typeDefinitionResult = await this.vscodeImport.VsCode.gotoTypeDefinition({
                filepath: currentFile,
                position: {
                  character: node.startPosition.column,
                  line: startLine + node.startPosition.row
                }
              });

              if (typeDefinitionResult.length != 0) {
                const tdLocation = typeDefinitionResult[0];

                let content = "";

                if (foundContents.has(tdLocation.filepath)) {
                  content = foundContents.get(tdLocation.filepath)!;
                } else {
                  content = fs.readFileSync(tdLocation.filepath, "utf8");
                  foundContents.set(tdLocation.filepath, content);
                }

                const ast = await getAst(tdLocation.filepath, content);
                if (!ast) {
                  throw new Error(`failed to get ast for file ${tdLocation.filepath}`);
                }
                const decl = findEnclosingTypeDeclaration(content, tdLocation.range.start.line, tdLocation.range.start.character, ast);
                if (!decl) {
                  // throw new Error(`failed to get decl for file ${tdLocation.uri}`);
                  console.log(`failed to get decl for file ${tdLocation.uri}`);
                }

                if (decl) {
                  await this.extractRelevantTypesHelper(
                    lspClient,
                    decl.fullText,
                    node.text,
                    tdLocation.range.start.line,
                    foundSoFar,
                    tdLocation.filepath,
                    foundContents,
                    layer + 1
                  )
                } else {
                  // console.log("decl not found");
                }
              } else {
                // console.log("td not found");
              }
            } catch (err) {
              console.log(err);
            }
          } else {

          }
        }
      }
    }
  }


  async extractRelevantHeaders(
    _: LspClient | null,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    holeType: string,
    projectRoot: string,
  ): Promise<Set<TypeSpanAndSourceFile>> {
    // console.log("extractRelevantHeaders")
    // console.time("extractRelevantHeaders");
    // NOTE: This takes around 550ms.
    // TODO: Move this to the init method.
    // const program = this.typeChecker.createTsCompilerProgram(sources, projectRoot);
    // const checker = program.getTypeChecker();
    // NOTE: program = this.typeChecker.createProgramFromSource("")

    const relevantContext = new Set<TypeSpanAndSourceFile>();
    // NOTE: This is necessary because TypeScript sucks.
    // There is no way to compare objects by value,
    // so sets of objects starts to accumulate tons of duplicates.
    const relevantContextMap = new Map<string, TypeSpanAndSourceFile>();
    const trace: string[] = [];
    const foundNormalForms = new Map<string, string>();
    const foundTypeAnalysisResults = new Map<string, TypeAnalysis>();

    // TODO: As long as you have a this binding to the program and the checker, you don't have to pass it around.
    const targetTypes = this.generateTargetTypes(relevantTypes, holeType, this.tsCompilerProgram, this.tsCompilerTypeChecker);

    // console.log("root", projectRoot)
    const seenDecls = new Set<string>();

    // only consider lines that start with let or const
    for (const source of sources) {
      const sourceContent = fs.readFileSync(source).toString("utf8");
      // TODO: this can be replaced by using typescript compiler api
      // what really needs to happen is the following:
      // filter by variable and function decls
      // get a d.ts of them (or get a type decl)
      // type decl makes more sense because d.ts format is a bit weird with class methods

      // const start = performance.now()
      const varFuncDecls = this.typeChecker.findTopLevelDeclarations(this.tsCompilerProgram, this.tsCompilerTypeChecker, source);
      // const end = performance.now()
      // console.log("varFuncDecls")
      // console.log(varFuncDecls)

      varFuncDecls.forEach((decl) => {
        // TODO: Memoize decls that are already seen. (update: this moves 10ms from normalize2 to isTypeEquivalent.)

        // const typeAnalysisResult = this.typeChecker.analyzeTypeString(decl.type);
        // console.log(`typeAnalysisResult: ${JSON.stringify(typeAnalysisResult, null, 2)}`)
        // NOTE: debugging
        // console.log("decl**")
        // console.dir(decl, { depth: null })
        const declStr = JSON.stringify(decl);

        if (!seenDecls.has(declStr)) {
          this.extractRelevantHeadersHelper2(
            decl.declarationText,
            decl.returnType ? decl.returnType : decl.type,
            targetTypes,
            relevantTypes,
            relevantContext,
            source,
            relevantContextMap,
            trace,
            foundNormalForms,
            foundTypeAnalysisResults,
            this.tsCompilerProgram,
            this.tsCompilerTypeChecker
          );

          seenDecls.add(declStr);
        }
      })


      // const filteredLines = sourceContent.split("\n").filter((line) => {
      //   return line.slice(0, 3) === "let" || line.slice(0, 5) === "const";
      // });
      //
      // // check for relationship between each line and relevant types
      // filteredLines.forEach(line => {
      //
      //   // console.time(`helper, line: ${line}`);
      //
      //   let tag = false;
      //   // if (line === `const initFormState: [[Weekday, TimeOfDay], string] = [["M", "AM"], ""];`) {
      //   //   tag = true;
      //   // }
      //   // TODO: Use the compiler API to split this.
      //   const splittedLine = line.split(" = ")[0];
      //
      //   const typeSpanPattern = /(^[^:]*: )(.+)/;
      //   const regexMatch = splittedLine.match(typeSpanPattern)
      //   if (regexMatch) {
      //     const returnTypeSpan = regexMatch[2];
      //     // console.log(`returnTypeSpan: ${returnTypeSpan}`)
      //
      //     // const typeAnalysisResult = this.typeChecker.analyzeTypeString(returnTypeSpan);
      //     // console.log(`typeAnalysisResult: ${JSON.stringify(typeAnalysisResult, null, 2)}`)
      //
      //     if (!this.typeChecker.isPrimitive(returnTypeSpan.split(" => ")[1])) {
      //       this.extractRelevantHeadersHelper(
      //         returnTypeSpan,
      //         targetTypes,
      //         relevantTypes,
      //         relevantContext,
      //         splittedLine,
      //         source,
      //         relevantContextMap,
      //         tag,
      //         trace,
      //         foundNormalForms,
      //         foundTypeAnalysisResults
      //       );
      //     }
      //   }
      //
      //   // console.timeEnd(`helper, line: ${line}`);
      // });
    }
    // console.log(JSON.stringify(relevantContextMap, null, 2))
    // console.log(relevantContextMap.keys())

    for (const v of relevantContextMap.values()) {
      relevantContext.add(v);
    }

    // console.timeEnd("extractRelevantHeaders");
    return relevantContext;
  }


  generateTargetTypes(relevantTypes: Map<string, TypeSpanAndSourceFile>, holeType: string, program: ts.Program, checker: ts.TypeChecker) {
    // console.time("generateTargetTypes");
    const targetTypes = new Set<string>();
    targetTypes.add(holeType);
    this.generateTargetTypesHelper(relevantTypes, holeType, targetTypes, program, checker);

    // console.timeEnd("generateTargetTypes");
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
    targetTypes: Set<string>,
    program: ts.Program,
    checker: ts.TypeChecker,
  ) {
    // Run analysis on currType.
    const typeAnalysisResult = this.typeChecker.analyzeTypeString(currType, program, checker);

    // Match on its kind.
    if (this.typeChecker.isFunction2(typeAnalysisResult)) {
      const rettype = typeAnalysisResult.returnType!;
      targetTypes.add(rettype.text)
      this.generateTargetTypesHelper(relevantTypes, rettype.text, targetTypes, program, checker)

    } else if (this.typeChecker.isTuple2(typeAnalysisResult)) {
      typeAnalysisResult.constituents!.forEach(constituent => {
        targetTypes.add(constituent.text);
        this.generateTargetTypesHelper(relevantTypes, constituent.text, targetTypes, program, checker);
      });

    } else {
      if (relevantTypes.has(currType)) {
        const definition = relevantTypes.get(currType)!.typeSpan.split(" = ")[1];
        this.generateTargetTypesHelper(relevantTypes, definition, targetTypes, program, checker);
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
    source: string,
    relevantContextMap: Map<string, TypeSpanAndSourceFile>,
    tag: boolean,
    trace: string[],
    foundNormalForms: Map<string, string>,
    foundTypeAnalysisResults: Map<string, TypeAnalysis>, // filename+typeSpan -> typeAnalysisResult
    program: ts.Program,
    checker: ts.TypeChecker
  ) {
    if (tag) {
      // console.time(`extractRelevantHeadersHelper, typeSpan: ${typeSpan}`)
      // trace.push(typeSpan)
      // console.log(trace)
    }

    let typeAnalysisResult: TypeAnalysis;
    if (!foundTypeAnalysisResults.has(source + ":" + typeSpan)) {
      typeAnalysisResult = this.typeChecker.analyzeTypeString(typeSpan, program, checker);
      foundTypeAnalysisResults.set(source + ":" + typeSpan, typeAnalysisResult);
    } else {
      typeAnalysisResult = foundTypeAnalysisResults.get(source + ":" + typeSpan)!;
    }

    targetTypes.forEach(typ => {
      if (this.isTypeEquivalent(typeSpan, typ, relevantTypes, foundNormalForms, program, checker)) {
        // NOTE: This checks for dupes. ctx is an object so you need to check for each field.
        // relevantContext.add({ typeSpan: line, sourceFile: source });
        const ctx = { typeSpan: line, sourceFile: source };
        relevantContextMap.set(JSON.stringify(ctx), ctx);
      }

      if (this.typeChecker.isFunction2(typeAnalysisResult)) {
        const rettype = typeAnalysisResult.returnType!;

        this.extractRelevantHeadersHelper(rettype.text, targetTypes, relevantTypes, relevantContext, line, source, relevantContextMap, tag, trace, foundNormalForms, foundTypeAnalysisResults, program, checker);

      } else if (this.typeChecker.isTuple2(typeAnalysisResult)) {
        typeAnalysisResult.constituents!.forEach(constituent => {
          this.extractRelevantHeadersHelper(constituent.text, targetTypes, relevantTypes, relevantContext, line, source, relevantContextMap, tag, trace, foundNormalForms, foundTypeAnalysisResults, program, checker);
        });

      }
    });
    if (tag) {
      // console.log("\n\n\n")
      // console.timeEnd(`extractRelevantHeadersHelper, typeSpan: ${typeSpan}`)
    }
  }

  // two types are equivalent if they have the same normal forms
  // TODO: Create a memo of comparisons made.
  isTypeEquivalent(t1: string, t2: string, relevantTypes: Map<string, TypeSpanAndSourceFile>, foundNormalForms: Map<string, string>, program: ts.Program, checker: ts.TypeChecker) {
    // NOTE: BUGFIX
    // console.log(`isTypeEquivalent: ${t1} {}{} ${t2}`)
    // console.log(t1 == undefined)
    // console.log(t2 == undefined)

    let normT1 = "";
    let normT2 = "";
    if (foundNormalForms.has(t1)) {
      // console.log("found t1", true)
      normT1 = foundNormalForms.get(t1)!;
    } else {
      // console.log("not found t1", false)
      normT1 = this.normalize2(t1, relevantTypes, program, checker);
      foundNormalForms.set(t1, normT1);
    }
    if (foundNormalForms.has(t2)) {
      // console.log("found t2", true)
      normT2 = foundNormalForms.get(t2)!;
    } else {
      // console.log("not found t2", false)
      normT2 = this.normalize2(t2, relevantTypes, program, checker);
      foundNormalForms.set(t2, normT2);
    }
    // const normT1 = foundNormalForms.has(t1) ? foundNormalForms.get(t1) : this.normalize2(t1, relevantTypes);
    // const normT2 = foundNormalForms.has(t2) ? foundNormalForms.get(t2) : this.normalize2(t2, relevantTypes);
    // console.log(`normal forms: ${normT1} {}{} ${normT2}`)
    return normT1 === normT2;
  }


  // return the normal form given a type span and a set of relevant types
  // TODO: replace type checking with information from the AST?
  normalize(typeSpan: string, relevantTypes: Map<string, TypeSpanAndSourceFile>) {
    // NOTE: BUGFIX
    // console.log(`normalize: ${typeSpan}`)
    // console.log(`normalize: ${typeSpan}`)
    // console.log(`normalize: ${typeSpan == undefined}`)

    if (typeSpan.slice(typeSpan.length - 2) == " =") {
      typeSpan = typeSpan.slice(0, typeSpan.length - 2);
    }

    // DEBUG
    // if (typeSpan.slice(typeSpan.length - 1) == ";") {
    //   typeSpan = typeSpan.slice(0, typeSpan.length - 1);
    // }

    // console.log(typeSpan)

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

  normalize2(typeSpan: string, relevantTypes: Map<string, TypeSpanAndSourceFile>, program: ts.Program, checker: ts.TypeChecker) {
    // NOTE: BUGFIX
    // console.log(`normalize: ${typeSpan}`)
    // console.log(`normalize: ${typeSpan == undefined}`)

    if (typeSpan.slice(typeSpan.length - 2) == " =") {
      typeSpan = typeSpan.slice(0, typeSpan.length - 2);
    }

    if (typeSpan.slice(typeSpan.length - 1) == ";") {
      typeSpan = typeSpan.slice(0, typeSpan.length - 1);
    }
    // console.log(typeSpan)

    let normalForm = "";

    const analysisResult = this.typeChecker.analyzeTypeString(typeSpan, program, checker)
    // console.dir(analysisResult, { depth: null })

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
          normalForm += kv[0].slice(1, kv[0].length), ": ", this.normalize2(kv[1], relevantTypes, program, checker);
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
        normalForm += this.normalize2(element, relevantTypes, program, checker);
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
        normalForm += this.normalize2(element, relevantTypes, program, checker)
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

      normalForm += this.normalize2(element, relevantTypes, program, checker)
      normalForm += "[]";
      return normalForm;

      // } else if (this.typeChecker.isTypeAlias(typeSpan)) {
    } else if (this.typeChecker.isTypeAlias2(analysisResult)) {
      // console.log("ALERT!!!!!!")
      // console.dir(relevantTypes, { depth: null })
      // console.dir(analysisResult, { depth: null })
      // console.log("typeSpan:", typeSpan)
      // console.log("analysis:", analysisResult.text)
      // console.log(relevantTypes.get(analysisResult.text))
      if (!relevantTypes.has(analysisResult.text)) {
        return typeSpan;
      }
      const typ = relevantTypes.get(analysisResult.text)!.typeSpan.split(" = ")[1];
      if (typ === undefined) {
        return typeSpan;
      }

      normalForm += this.normalize2(typ, relevantTypes, program, checker);
      return normalForm;

    } else {
      // console.log(`else: ${typeSpan}`)
      return typeSpan;
    }
  }

  extractRelevantHeadersHelper2(
    declText: string,
    typeSpan: string,
    targetTypes: Set<string>,
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    relevantContext: Set<TypeSpanAndSourceFile>,
    source: string,
    relevantContextMap: Map<string, TypeSpanAndSourceFile>,
    trace: string[],
    foundNormalForms: Map<string, string>,
    foundTypeAnalysisResults: Map<string, TypeAnalysis>, // filename+typeSpan -> typeAnalysisResult
    program: ts.Program,
    checker: ts.TypeChecker
  ) {
    // console.log("extractRelevantHeaders2")
    // if (declText.includes("getBookings")) {
    // if (declText.slice(0, 11) === "getBookings") {
    //   console.log("toplevel", declText, "-=-=-", typeSpan)
    // }
    let typeAnalysisResult: TypeAnalysis;
    if (!foundTypeAnalysisResults.has(source + ":" + typeSpan)) {
      typeAnalysisResult = this.typeChecker.analyzeTypeString(typeSpan, program, checker);
      foundTypeAnalysisResults.set(source + ":" + typeSpan, typeAnalysisResult);
    } else {
      typeAnalysisResult = foundTypeAnalysisResults.get(source + ":" + typeSpan)!;
    }

    targetTypes.forEach(typ => {
      // if (declText.includes("getBookings")) {
      // if (declText.slice(0, 11) === "getBookings") {
      //   console.log("innermost", declText, "-=-=-", typeSpan)
      //   console.log(this.isTypeEquivalent(typeSpan, typ, relevantTypes, foundNormalForms))
      //   console.log("============")
      // }
      if (this.isTypeEquivalent(typeSpan, typ, relevantTypes, foundNormalForms, program, checker)) {
        // NOTE: This checks for dupes. ctx is an object so you need to check for each field.
        // relevantContext.add({ typeSpan: line, sourceFile: source });
        const ctx = { typeSpan: declText, sourceFile: source };
        relevantContextMap.set(JSON.stringify(ctx), ctx);
      }

      if (this.typeChecker.isFunction2(typeAnalysisResult)) {
        const rettype = typeAnalysisResult.returnType!;

        this.extractRelevantHeadersHelper2(
          declText,
          rettype.text,
          targetTypes,
          relevantTypes,
          relevantContext,
          source,
          relevantContextMap,
          trace,
          foundNormalForms,
          foundTypeAnalysisResults,
          program,
          checker
        );
        foundTypeAnalysisResults

      } else if (this.typeChecker.isTuple2(typeAnalysisResult)) {
        typeAnalysisResult.constituents!.forEach(constituent => {
          this.extractRelevantHeadersHelper2(
            declText,
            constituent.text,
            targetTypes,
            relevantTypes,
            relevantContext,
            source,
            relevantContextMap,
            trace,
            foundNormalForms,
            foundTypeAnalysisResults,
            program,
            checker
          );
        });

      }
    });
  }

  async extractRelevantHeadersWithTreesitter(
    _: LspClient | null,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    holeType: string,
    holeIdentifier: string,
    projectRoot: string,
  ): Promise<Set<TypeSpanAndSourceFile>> {
    const relevantContext = new Set<TypeSpanAndSourceFile>();
    // NOTE: This is necessary because TypeScript sucks.
    // There is no way to compare objects by value,
    // so sets of objects starts to accumulate tons of duplicates.
    const relevantContextMap = new Map<string, TypeSpanAndSourceFile>();
    const trace: string[] = [];
    const foundNormalForms = new Map<string, string>();
    const foundTypeAnalysisResults = new Map<string, TypeAnalysis>();

    const targetTypes = await this.generateTargetTypesWithTreesitter(relevantTypes, holeType, holeIdentifier);
    // return new Set<TypeSpanAndSourceFileAndAst>();

    const seenDecls = new Set<string>();

    // only consider lines that start with let or const
    for (const source of sources) {
      // TODO: this can be replaced by using typescript compiler api
      // what really needs to happen is the following:
      // filter by variable and function decls
      // get a d.ts of them (or get a type decl)
      // type decl makes more sense because d.ts format is a bit weird with class methods

      const topLevelDecls = await extractTopLevelDecls(source);
      for (const tld of topLevelDecls) {
        // pattern 0 is let/const, 1 is var, 2 is fun
        // if (!seenDecls.has(JSON.stringify()) {
        const originalDeclText = tld.pattern === 2
          ? tld.captures.find(d => d.name === "top.fn.decl")!.node.text
          : tld.captures.find(d => d.name === "top.var.decl")!.node.text;

        if (tld.pattern === 2) {
          // build a type span
          const funcType = extractFunctionTypeFromDecl(tld);
          const wrapped = `type __TMP = ${funcType}`;

          const ast = await getAst("file.ts", wrapped);
          if (!ast) {
            throw new Error(`failed to generate ast for ${wrapped}`);
          }

          const alias = ast.rootNode.namedChild(0);
          if (!alias || alias.type !== "type_alias_declaration") {
            throw new Error("Failed to parse type alias");
          }

          const valueNode = alias.childForFieldName("value");
          if (!valueNode) throw new Error("No type value found");

          const baseNode = this.unwrapToBaseType(valueNode);

          await this.extractRelevantHeadersWithTreesitterHelper(
            originalDeclText,
            baseNode,
            targetTypes,
            relevantTypes,
            relevantContext,
            relevantContextMap,
            foundNormalForms,
            source
          );
        } else {
          const varTypNode = tld.captures.find(d => d.name === "top.var.type")!.node;
          await this.extractRelevantHeadersWithTreesitterHelper(
            originalDeclText,
            varTypNode,
            targetTypes,
            relevantTypes,
            relevantContext,
            relevantContextMap,
            foundNormalForms,
            source
          );
        }
      }
    }

    for (const v of relevantContextMap.values()) {
      relevantContext.add(v);
    }

    return relevantContext;
  }

  async extractRelevantHeadersWithTreesitterHelper(
    originalDeclText: string,
    node: Parser.SyntaxNode,
    targetTypes: Set<Parser.SyntaxNode>,
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    relevantContext: Set<TypeSpanAndSourceFile>,
    relevantContextMap: Map<string, TypeSpanAndSourceFile>,
    foundNormalForms: Map<string, string>,
    source: string
  ) {
    for (const typ of targetTypes) {
      if (await this.isTypeEquivalentWithTreesitter(node, typ, relevantTypes, foundNormalForms)) {
        const ctx = { typeSpan: originalDeclText, sourceFile: source };
        relevantContextMap.set(JSON.stringify(ctx), ctx);
      }

      if (node.type === "function_type") {
        const retTypeNode = node.namedChildren.find(c => c && c.type === "return_type");
        if (retTypeNode) {
          this.extractRelevantHeadersWithTreesitterHelper(
            originalDeclText,
            retTypeNode,
            targetTypes,
            relevantTypes,
            relevantContext,
            relevantContextMap,
            foundNormalForms,
            source
          );
        }
      } else if (node.type === "tuple_type") {
        for (const c of node.namedChildren) {
          await this.extractRelevantHeadersWithTreesitterHelper(
            originalDeclText,
            c!,
            targetTypes,
            relevantTypes,
            relevantContext,
            relevantContextMap,
            foundNormalForms,
            source
          );
        }
      }
    }
  }

  async generateTargetTypesWithTreesitter(
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    holeType: string,
    holeIdentifier: string
  ) {
    const targetTypes = new Set<Parser.SyntaxNode>();
    // const ast = relevantTypes.get(holeIdentifier)!.ast;
    const ast = await getAst("file.ts", `type T = ${holeType}`);
    if (!ast) {
      throw new Error(`failed to generate ast for ${holeType}`);
    }

    const alias = ast.rootNode.namedChild(0);
    if (!alias || alias.type !== "type_alias_declaration") {
      throw new Error("Failed to parse type alias");
    }

    const valueNode = alias.childForFieldName("value");
    if (!valueNode) throw new Error("No type value found");
    // console.log(valueNode.text)

    const baseNode = this.unwrapToBaseType(valueNode);
    targetTypes.add(baseNode);
    await this.generateTargetTypesWithTreesitterHelper(relevantTypes, holeType, targetTypes, baseNode);

    // console.log(targetTypes)

    return targetTypes;
  }

  unwrapToBaseType(node: Parser.SyntaxNode): Parser.SyntaxNode {
    if (["function_type", "tuple_type", "type_identifier", "predefined_type"].includes(node.type)) {
      return node;
    }

    for (const child of node.namedChildren) {
      const unwrapped = this.unwrapToBaseType(child!);
      if (unwrapped !== child || ["function_type", "tuple_type", "type_identifier", "predefined_type"].includes(unwrapped.type)) {
        return unwrapped;
      }
    }

    return node;
  }

  async generateTargetTypesWithTreesitterHelper(
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    currType: string,
    targetTypes: Set<Parser.SyntaxNode>,
    node: Parser.SyntaxNode | null
  ): Promise<void> {
    if (!node) return;

    if (node.type === "function_type") {
      const returnType = node.childForFieldName("return_type");
      if (returnType) {
        targetTypes.add(returnType);
        await this.generateTargetTypesWithTreesitterHelper(relevantTypes, currType, targetTypes, returnType);
      }
    }

    if (node.type === "tuple_type") {
      for (const child of node.namedChildren) {
        if (child) {
          targetTypes.add(child);
          await this.generateTargetTypesWithTreesitterHelper(relevantTypes, currType, targetTypes, child);
        }
      }
    }

    if (relevantTypes.has(node.text)) {
      // const ast = relevantTypes.get(node.text)!.ast;
      const typeSpan = relevantTypes.get(node.text)?.typeSpan;

      // const ast = await getAst("file.ts", `type T = ${typeSpan}`);
      const ast = await getAst("file.ts", typeSpan!);
      if (!ast) {
        throw new Error(`failed to generate ast for ${typeSpan}`);
      }

      const alias = ast.rootNode.namedChild(0);
      if (!alias || alias.type !== "type_alias_declaration") {
        throw new Error("Failed to parse type alias");
      }

      const valueNode = alias.childForFieldName("value");
      if (!valueNode) throw new Error("No type value found");

      const baseNode = this.unwrapToBaseType(valueNode);
      await this.generateTargetTypesWithTreesitterHelper(relevantTypes, currType, targetTypes, baseNode);
    }

    // if (node.type === "type_identifier" || node.type === "predefined_type") {
    //   return [node.text];
    // }

    return;
  }

  async isTypeEquivalentWithTreesitter(
    node: Parser.SyntaxNode,
    typ: Parser.SyntaxNode,
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    foundNormalForms: Map<string, string>
  ): Promise<boolean> {
    if (!node || !typ) {
      return false;
    }
    let normT1 = "";
    let normT2 = "";
    if (foundNormalForms.has(node.text)) {
      // console.log("found t1", true)
      normT1 = foundNormalForms.get(node.text)!;
    } else {
      // console.log("not found t1", false)
      normT1 = await this.normalizeWithTreesitter(node, relevantTypes);
      foundNormalForms.set(node.text, normT1);
    }
    if (foundNormalForms.has(typ.text)) {
      // console.log("found t2", true)
      normT2 = foundNormalForms.get(typ.text)!;
    } else {
      // console.log("not found t2", false)
      normT2 = await this.normalizeWithTreesitter(typ, relevantTypes);
      foundNormalForms.set(typ.text, normT2);
    }
    // const normT1 = foundNormalForms.has(t1) ? foundNormalForms.get(t1) : this.normalize2(t1, relevantTypes);
    // const normT2 = foundNormalForms.has(t2) ? foundNormalForms.get(t2) : this.normalize2(t2, relevantTypes);
    // console.log(`normal forms: ${normT1} {}{} ${normT2}`)
    return normT1 === normT2;
  }

  async normalizeWithTreesitter(node: Parser.SyntaxNode, relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>): Promise<string> {
    if (!node) return "";

    switch (node.type) {
      case "function_type": {
        const params = node.child(0); // formal_parameters
        const returnType = node.childForFieldName("type") || node.namedChildren[1]; // function_type → parameters, =>, return

        const paramTypes = params?.namedChildren
          .map(param => this.normalizeWithTreesitter(param!.childForFieldName("type")! || param!.namedChildren.at(-1), relevantTypes))
          .join(", ") || "";

        const ret = this.normalizeWithTreesitter(returnType!, relevantTypes);
        return `(${paramTypes}) => ${ret}`;
      }

      case "tuple_type": {
        const elements = node.namedChildren.map(c => this.normalizeWithTreesitter(c!, relevantTypes));
        return `[${elements.join(", ")}]`;
      }

      case "union_type": {
        const parts = node.namedChildren.map(c => this.normalizeWithTreesitter(c!, relevantTypes));
        return parts.join(" | ");
      }

      case "type_identifier": {
        const alias = relevantTypes.get(node.text);
        if (!alias) return node.text;

        // Parse the alias's type span
        const wrapped = `type __TMP = ${alias};`;
        const tree = await getAst("file.ts", wrapped);
        const valueNode = tree!.rootNode.descendantsOfType("type_alias_declaration")[0]?.childForFieldName("value");

        return this.normalizeWithTreesitter(valueNode!, relevantTypes);
      }

      case "predefined_type":
      case "number":
      case "string":
        return node.text;

      default:
        // Fallback for types like array, etc.
        return node.text;
    }
  }

}


