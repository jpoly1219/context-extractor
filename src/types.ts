import { LspClient } from "../ts-lsp-client-dist/src/lspClient";
import * as fs from "fs"
import * as path from "path";

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
  }>;
  extractRelevantTypes: (
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
  ) => Promise<Map<string, string>>;
  extractRelevantHeaders: (
    preludeContent: string,
    relevantTypes: Map<string, string>,
    holeType: string
  ) => string[];
}

enum Language {
  TypeScript,
  OCaml
}

export { relevantTypeObject, varsObject, typesObject, typeAndLocation, relevantTypeQueryResult, varsQueryResult, typesQueryResult, typesAndLocationsQueryResult, LanguageDriver, Language }
