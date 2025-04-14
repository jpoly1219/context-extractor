import * as vscode from "vscode";
import {
  VSCodeBuiltinProvider,
} from "./types"

export namespace VsCode {
  // Type definitions.
  export interface Hover {
    text: string;
  }

  export interface DocumentSymbol extends RangeInFile {
    name: string;
    selectionRange: Range;
  }

  export interface RangeInFile {
    filepath: string;
    range: Range;
  }

  export interface Range {
    start: Position;
    end: Position;
  }

  export interface Location {
    filepath: string;
    position: Position;
  }

  export interface Position {
    line: number;
    character: number;
  }
  interface VsCodeLspInput {
    uri: vscode.Uri;
    line?: number;
    character?: number;
    name: VSCodeBuiltinProvider;
  }

  // NOTE: Currently, the cache is reset per extraction.
  // TEST: Check if the cache is actually resetting per extraction.
  const MAX_CACHE_SIZE = 50;
  const lspCache = new Map<string, RangeInFile[] | Hover | DocumentSymbol[]>();

  function gotoInputKey(input: VsCodeLspInput) {
    return `${input.name}${input.uri.toString()}${input.line}${input.character}`;
  }

  export async function hover(location: Location): Promise<Hover> {
    const result = await executeHoverProvider({
      uri: vscode.Uri.parse(location.filepath),
      line: location.position.line,
      character: location.position.character,
      name: "vscode.executeHoverProvider",
    });

    return result;
  }

  export async function gotoTypeDefinition(location: Location): Promise<RangeInFile[]> {
    const result = await executeGotoProvider({
      uri: vscode.Uri.parse(location.filepath),
      line: location.position.line,
      character: location.position.character,
      name: "vscode.executeTypeDefinitionProvider",
    });

    return result;
  }

  export async function getDocumentSymbols(location: Omit<Location, "position">): Promise<DocumentSymbol[]> {
    const result = await executeDocumentSymbolProvider({
      uri: vscode.Uri.parse(location.filepath),
      name: "vscode.executeDocumentSymbolProvider",
    });

    return result;
  }

  // Core logic for executing vscode providers.
  async function executeGotoProvider(
    input: VsCodeLspInput,
  ): Promise<RangeInFile[]> {
    // Check the cache before executing vscode command.
    const cacheKey = gotoInputKey(input);
    const cached = lspCache.get(cacheKey);
    if (cached) {
      return cached as RangeInFile[];
    }

    try {
      const definitions = (await vscode.commands.executeCommand(
        input.name,
        input.uri,
        new vscode.Position(input.line!, input.character!),
      )) as any;

      const results = definitions
        .filter((d: any) => (d.targetUri || d.uri) && (d.targetRange || d.range))
        .map((d: any) => ({
          filepath: (d.targetUri || d.uri).toString(),
          range: d.targetRange || d.range,
        }));

      // Update the cache via LRU.
      if (lspCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = lspCache.keys().next().value;
        if (oldestKey) {
          lspCache.delete(oldestKey);
        }
      }
      lspCache.set(cacheKey, results);

      return results;
    } catch (e) {
      console.warn(`Error executing ${input.name}:`, e);
      return [];
    }
  }

  async function executeHoverProvider(
    input: VsCodeLspInput,
  ): Promise<Hover> {
    // Check the cache before executing vscode command.
    const cacheKey = gotoInputKey(input);
    const cached = lspCache.get(cacheKey);
    if (cached) {
      return cached as Hover;
    }

    try {
      const definitions = (await vscode.commands.executeCommand(
        input.name,
        input.uri,
        new vscode.Position(input.line!, input.character!),
      )) as any;

      const result = definitions[0].contents[0].value;

      // Update the cache via LRU.
      if (lspCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = lspCache.keys().next().value;
        if (oldestKey) {
          lspCache.delete(oldestKey);
        }
      }
      lspCache.set(cacheKey, result);

      return result;
    } catch (e) {
      console.warn(`Error executing ${input.name}:`, e);
      return { text: "" };
    }
  }

  async function executeDocumentSymbolProvider(
    input: VsCodeLspInput,
  ): Promise<DocumentSymbol[]> {
    // Check the cache before executing vscode command.
    const cacheKey = gotoInputKey(input);
    const cached = lspCache.get(cacheKey);
    if (cached) {
      return cached as DocumentSymbol[];
    }

    try {
      const definitions = (await vscode.commands.executeCommand(
        input.name,
        input.uri,
      )) as any;

      const results = definitions
        .filter((d: any) => d.location && d.location.uri && d.range && d.selectionRange && d.name)
        .map((d: any) => ({
          filepath: (d.location.uri).toString(),
          range: d.range,
          selectionRange: d.selectionRange,
          name: d.name
        }));

      // Update the cache via LRU.
      if (lspCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = lspCache.keys().next().value;
        if (oldestKey) {
          lspCache.delete(oldestKey);
        }
      }
      lspCache.set(cacheKey, results);

      return results;
    } catch (e) {
      console.warn(`Error executing ${input.name}:`, e);
      return [];
    }
  }

}
