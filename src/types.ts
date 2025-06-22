// import { LspClient } from "../ts-lsp-client-dist/src/lspClient";
// import { Range } from "../ts-lsp-client-dist/src/models";
// import { LspClient, Range } from "ts-lsp-client";
// import { LspClient, Range } from "dist/ts-lsp-client-dist/src/main";
import { Location, LspClient, Range, SymbolInformation } from "../ts-lsp-client-dist/src/main";
import * as fs from "fs"
import { SyntaxNode, Tree } from "web-tree-sitter";

interface Position {
  line: number;
  character: number;
}

interface relevantTypeObject {
  typeAliasDeclaration: string;
  typeName: string;
  typeDefinition: string;
  typeQLClass: string;
  components: typesObject[];
}

interface varsObject {
  constDeclaration: string;
  bindingPattern: string;
  typeAnnotation: string;
  init: string;
  typeQLClass: string;
  functionReturnType: string;
  functionReturnTypeQLClass: string;
  components: typesObject[];
}

interface typesObject {
  typeName: string;
  typeQLClass: string;
}

interface typeAndLocation {
  typeName: string;
  locatedFile: string;
}

interface relevantTypeQueryResult {
  "#select": {
    tuples: [{ label: string }, string, { label: string }, string, { label: string }, string][]
  }
}

interface varsQueryResult {
  "#select": {
    tuples: [{ label: string }, { label: string }, { label: string }, { label: string }, string, string, string, { label: string }, string][]
  }
}

interface typesQueryResult {
  "#select": {
    tuples: [string, string, number][]
  }
}

interface typesAndLocationsQueryResult {
  "#select": {
    tuples: [string, string][]
  }
}

interface LanguageDriver {
  init: (
    lspClient: LspClient | null,
    sketchPath: string
  ) => Promise<void>;
  injectHole: (
    sketchPath: string
  ) => void;
  getHoleContext: (
    lspClient: LspClient | null,
    sketchFilePath: string,
    logStream: fs.WriteStream | null
  ) => Promise<{
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
  }>;
  getHoleContextWithCompilerAPI: (
    sketchFilePath: string,
    logStream: fs.WriteStream | null
  ) => Promise<{
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
  }>;
  getHoleContextWithTreesitter: (
    sketchFilePath: string,
    cursorPosition: { line: number, character: number },
    logStream: fs.WriteStream | null
  ) => Promise<{
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
  }>;
  extractRelevantTypes: (
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>,
    currentFile: string,
    foundContents: Map<string, string>,
    logStream: fs.WriteStream | null
  ) => Promise<Map<string, TypeSpanAndSourceFile>>;
  extractRelevantTypesWithCompilerAPI: (
    fullHoverResult: string,
    typeName: string,
    linePosition: number,
    characterPosition: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>,
    currentFile: string,
    foundContents: Map<string, string>,
    logStream: fs.WriteStream | null
  ) => Promise<Map<string, TypeSpanAndSourceFile>>;
  extractRelevantTypesWithTreesitter: (
    lspClient: LspClient | null,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFileAndAst>, // identifier -> [full hover result, source]
    currentFile: string,
    foundContents: Map<string, string>, // uri -> contents
    logStream: fs.WriteStream | null
  ) => Promise<Map<string, TypeSpanAndSourceFileAndAst>>;
  extractRelevantHeaders: (
    lspClient: LspClient | null,
    // preludeFilePath: string,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    holeType: string,
    projectRoot: string
  ) => Promise<Set<TypeSpanAndSourceFile>>;
  extractRelevantHeadersWithTreesitter: (
    _: LspClient | null,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFileAndAst>,
    holeType: string,
    holeIdentifier: string,
    projectRoot: string,
  ) => Promise<Set<TypeSpanAndSourceFile>>;
  // completeWithLLM: (targetDirectoryPath: string, context: Context) => Promise<string>;
  // correctWithLLM: (targetDirectoryPath: string, context: Context, message: string) => Promise<string>;
}

type Filepath = string;
type RelevantType = string;
type RelevantHeader = string;

interface Context {
  holeType: string,
  relevantTypes: Map<Filepath, RelevantType[]>,
  relevantHeaders: Map<Filepath, RelevantHeader[]>
}

type Language = "typescript" | "ocaml";

interface TypeChecker {
  // Given a type declaration, get the type context. Call checktype().
  getTypeContextFromDecl: (typeDecl: string) => { identifier: string, span: string } | null;
  // Lex and parse the given type declaration using language-appropriate techniques, then return its type.
  // checkType: (typeDecl: string) => object;
}

interface TypeSpanAndSourceFile {
  typeSpan: string,
  sourceFile: string,
}

interface TypeSpanAndSourceFileAndAst extends TypeSpanAndSourceFile {
  ast: Tree
}

enum Model {
  None,
  GPT4 = "gpt4",
  Starcoder2 = "starcoder2"
}

interface LLMConfig {
  model: Model;
}

interface GPT4Config extends LLMConfig {
  apiBase: string;
  deployment: string;
  gptModel: string;
  apiVersion: string;
  apiKey: string;
  temperature: number;
}

interface GPT4PromptComponent {
  role: string;
  content: string;
}

interface TypeAnalysis {
  kind: string;
  text: string;
  constituents?: TypeAnalysis[];
  parameters?: ParameterAnalysis[];
  returnType?: TypeAnalysis;
  heritage?: TypeAnalysis[][];
}

interface ParameterAnalysis {
  name: string;
  optional: boolean;
  type: TypeAnalysis;
}

interface VarFuncDecls {
  kind: "variable" | "function" | "arrowFunction" | "classMethod";
  name: string;
  type: string;
  returnType?: string;
  position: { line: number; character: number };
  declarationText: string;
  sourceFile: string;
}

// We currently support running the extractor under
// a vscode extension or as a standalone script.
type IDE = "standalone" | "vscode";

type VSCodeBuiltinProvider =
  | ExecuteHoverProvider
  | ExecuteDefinitionProvider
  | ExecuteTypeDefinitionProvider
  | ExecuteDocumentSymbolProvider

type ExecuteHoverProvider = "vscode.executeHoverProvider"
type ExecuteDefinitionProvider = "vscode.executeDefinitionProvider"
type ExecuteTypeDefinitionProvider = "vscode.executeTypeDefinitionProvider"
type ExecuteDocumentSymbolProvider = "vscode.executeDocumentSymbolProvider"

interface RangeInFile {
  filepath: string;
  range: Range;
}

interface RangeInFileWithContents extends RangeInFile {
  contents: string;
}

interface SymbolWithRange extends RangeInFile {
  name: string;
  type: SyntaxNode["type"];
  content: string;
}

type FileSymbolMap = Record<string, SymbolWithRange[]>;


export { Position, relevantTypeObject, varsObject, typesObject, typeAndLocation, relevantTypeQueryResult, varsQueryResult, typesQueryResult, typesAndLocationsQueryResult, LanguageDriver, Language, TypeChecker, TypeSpanAndSourceFile, TypeSpanAndSourceFileAndAst, Context, Model, LLMConfig, GPT4Config, GPT4PromptComponent, TypeAnalysis, ParameterAnalysis, VarFuncDecls, IDE, VSCodeBuiltinProvider, RangeInFile, RangeInFileWithContents, SymbolWithRange, FileSymbolMap }
