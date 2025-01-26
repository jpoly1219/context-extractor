import { LspClient } from "../ts-lsp-client-dist/src/lspClient";
import * as fs from "fs"
import { Range } from "../ts-lsp-client-dist/src/models";

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
  init: (lspClient: LspClient, sketchPath: string) => Promise<void>;
  getHoleContext: (
    lspClient: LspClient,
    sketchFilePath: string,
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
  }>;
  extractRelevantTypes: (
    lspClient: LspClient,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    endLine: number,
    foundSoFar: Map<string, TypeSpanAndSourceFile>,
    currentFile: string,
    // outputFile: fs.WriteStream,
  ) => Promise<Map<string, TypeSpanAndSourceFile>>;
  extractRelevantHeaders: (
    lspClient: LspClient,
    // preludeFilePath: string,
    sources: string[],
    relevantTypes: Map<string, TypeSpanAndSourceFile>,
    holeType: string
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

enum Language {
  TypeScript,
  OCaml
}

interface TypeChecker {
  // Given a type declaration, get the type context. Call checktype().
  getTypeContextFromDecl: (typeDecl: string) => { identifier: string, span: string } | null;
  // Lex and parse the given type declaration using language-appropriate techniques, then return its type.
  // checkType: (typeDecl: string) => object;
}

interface TypeSpanAndSourceFile {
  typeSpan: string,
  sourceFile: string
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

export { relevantTypeObject, varsObject, typesObject, typeAndLocation, relevantTypeQueryResult, varsQueryResult, typesQueryResult, typesAndLocationsQueryResult, LanguageDriver, Language, TypeChecker, TypeSpanAndSourceFile, Context, Model, LLMConfig, GPT4Config, GPT4PromptComponent, TypeAnalysis, ParameterAnalysis }
