import { LspClient } from "../ts-lsp-client-dist/src/lspClient";
import * as fs from "fs"
import * as path from "path";
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
  }>;
  extractRelevantTypes: (
    lspClient: LspClient,
    fullHoverResult: string,
    typeName: string,
    startLine: number,
    endLine: number,
    foundSoFar: Map<string, string>,
    currentFile: string,
    outputFile: fs.WriteStream,
  ) => Promise<Map<string, string>>;
  extractRelevantHeaders: (
    lspClient: LspClient,
    preludeFilePath: string,
    relevantTypes: Map<string, string>,
    holeType: string
  ) => Promise<string[]>;
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

export { relevantTypeObject, varsObject, typesObject, typeAndLocation, relevantTypeQueryResult, varsQueryResult, typesQueryResult, typesAndLocationsQueryResult, LanguageDriver, Language, TypeChecker }
