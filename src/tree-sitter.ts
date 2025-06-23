import fs from "fs";
import path from "path";

import Parser from "web-tree-sitter";
import { SymbolWithRange } from "./types";
import { getUriFileExtension } from "./utils";
import { getAst } from "./ast";

export enum LanguageName {
  TYPESCRIPT = "typescript",
  OCAML = "ocaml",
}

export const supportedLanguages: { [key: string]: LanguageName } = {
  ts: LanguageName.TYPESCRIPT,
  mts: LanguageName.TYPESCRIPT,
  cts: LanguageName.TYPESCRIPT,
  ocaml: LanguageName.OCAML,
  ml: LanguageName.OCAML,
  mli: LanguageName.OCAML,
};

export const IGNORE_PATH_PATTERNS: Partial<Record<LanguageName, RegExp[]>> = {
  [LanguageName.TYPESCRIPT]: [/.*node_modules/],
};

export async function getParserForFile(filepath: string) {
  try {
    await Parser.init();
    const parser = new Parser();

    // const packageRoot = path.dirname(
    //   require.resolve("./package.json", { paths: [__dirname] })
    // );
    // console.log(packageRoot);
    // const wasmPath2 = require.resolve(
    //   path.join(
    //     __dirname,
    //     `tree-sitter-files/wasms/tree-sitter-${supportedLanguages["ts"]}.wasm`
    //   )
    // );
    // console.log(wasmPath2);
    // const wasmPath3 = require.resolve(
    //   path.resolve(
    //     __dirname,
    //     `tree-sitter-files/wasms/tree-sitter-${supportedLanguages["ts"]}.wasm`
    //   )
    // );
    // console.log(wasmPath3);

    const language = await getLanguageForFile(filepath);
    if (!language) {
      return undefined;
    }

    parser.setLanguage(language);

    return parser;
  } catch (e) {
    console.debug("Unable to load language for file", filepath, e);
    return undefined;
  }
}

// Loading the wasm files to create a Language object is an expensive operation and with
// sufficient number of files can result in errors, instead keep a map of language name
// to Language object
const nameToLanguage = new Map<string, Parser.Language>();

export async function getLanguageForFile(
  filepath: string
): Promise<Parser.Language | undefined> {
  try {
    await Parser.init();
    const extension = getUriFileExtension(filepath);

    const languageName = supportedLanguages[extension];
    if (!languageName) {
      return undefined;
    }
    let language = nameToLanguage.get(languageName);

    if (!language) {
      language = await loadLanguageForFileExt(extension);
      nameToLanguage.set(languageName, language);
    }
    return language;
  } catch (e) {
    console.debug("Unable to load language for file", filepath, e);
    return undefined;
  }
}

export const getFullLanguageName = (filepath: string) => {
  const extension = getUriFileExtension(filepath);
  return supportedLanguages[extension];
};

export async function getQueryForFile(
  filepath: string,
  queryPath: string
): Promise<Parser.Query | undefined> {
  const language = await getLanguageForFile(filepath);
  if (!language) {
    return undefined;
  }

  if (!fs.existsSync(queryPath)) {
    return undefined;
  }

  const querySource = fs.readFileSync(queryPath).toString();

  const query = language.query(querySource);
  return query;
}

async function loadLanguageForFileExt(
  fileExtension: string
): Promise<Parser.Language> {
  const wasmPath = require.resolve(
    `@jpoly1219/context-extractor/src/tree-sitter-files/wasms/tree-sitter-${supportedLanguages[fileExtension]}.wasm`
  );
  // const wasmPath = path.join(
  //   __dirname,
  //   "tree-sitter-files",
  //   "wasms",
  //   `tree-sitter-${supportedLanguages[fileExtension]}.wasm`
  // );
  return await Parser.Language.load(wasmPath);
}

const GET_SYMBOLS_FOR_NODE_TYPES: Parser.SyntaxNode["type"][] = [
  "class_declaration",
  "class_definition",
  "function_item", // function name = first "identifier" child
  "function_definition",
  "method_declaration", // method name = first "identifier" child
  "method_definition",
  "generator_function_declaration",
  // property_identifier
  // field_declaration
  // "arrow_function",
];

export async function getSymbolsForFile(
  filepath: string,
  contents: string
): Promise<SymbolWithRange[] | undefined> {
  const parser = await getParserForFile(filepath);
  if (!parser) {
    return;
  }

  let tree: Parser.Tree | null;
  try {
    tree = parser.parse(contents);
    if (!tree) {
      throw new Error("tree parsing failed");
    }
  } catch (e) {
    console.log(`Error parsing file: ${filepath}`);
    return;
  }
  // console.log(`file: ${filepath}`);

  // Function to recursively find all named nodes (classes and functions)
  const symbols: SymbolWithRange[] = [];
  function findNamedNodesRecursive(node: Parser.SyntaxNode | null) {
    if (!node) {
      return;
    }
    // console.log(`node: ${node.type}, ${node.text}`);
    if (GET_SYMBOLS_FOR_NODE_TYPES.includes(node.type)) {
      // console.log(`parent: ${node.type}, ${node.text.substring(0, 200)}`);
      // node.children.forEach((child) => {
      //   console.log(`child: ${child.type}, ${child.text}`);
      // });

      // Empirically, the actual name is the last identifier in the node
      // Especially with languages where return type is declared before the name
      // TODO use findLast in newer version of node target
      let identifier: Parser.SyntaxNode | undefined = undefined;
      for (let i = node.children.length - 1; i >= 0; i--) {
        if (
          node.children[i] &&
          (node.children[i]!.type === "identifier" ||
            node.children[i]!.type === "property_identifier")
        ) {
          identifier = node.children[i]!;
          break;
        }
      }

      if (identifier?.text) {
        symbols.push({
          filepath,
          type: node.type,
          name: identifier.text,
          range: {
            start: {
              character: node.startPosition.column,
              line: node.startPosition.row,
            },
            end: {
              character: node.endPosition.column + 1,
              line: node.endPosition.row + 1,
            },
          },
          content: node.text,
        });
      }
    }
    node.children.forEach(findNamedNodesRecursive);
  }
  findNamedNodesRecursive(tree.rootNode);
  return symbols;
}

export function findTypeDeclarationGivenIdentifier(
  captures: Parser.QueryCapture[],
  typeIdentifier: string
) {
  for (let i = 0; i < captures.length; i++) {
    const cap = captures[i];
    if (cap.name === "type.identifier" && cap.node.text === typeIdentifier) {
      const parent = cap.node.parent;
      const value = captures.find(
        (c) => c.name === "type.value" && c.node.parent === parent
      );
      return { name: cap.node, value: value?.node, kind: parent?.type };
    }
  }
  return null;
}

interface TypeDeclarationResult {
  name: string;
  fullText: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  kind: string;
}

export function findEnclosingTypeDeclaration(
  sourceCode: string,
  cursorLine: number,
  cursorColumn: number,
  ast: Parser.Tree
): TypeDeclarationResult | null {
  const point = { row: cursorLine, column: cursorColumn };
  let node = ast.rootNode.descendantForPosition(point);

  while (
    node &&
    ![
      "type_alias_declaration",
      "interface_declaration",
      "enum_declaration",
    ].includes(node.type)
  ) {
    if (!node.parent) return null;
    node = node.parent;
  }

  if (!node) return null;

  const nameNode = node.childForFieldName("name");
  const name = nameNode?.text ?? "<anonymous>";
  const fullText = sourceCode.slice(node.startIndex, node.endIndex);

  return {
    name,
    fullText,
    startLine: node.startPosition.row,
    startColumn: node.startPosition.column,
    endLine: node.endPosition.row,
    endColumn: node.endPosition.column,
    kind: node.type,
  };
}

export async function extractTopLevelDecls(currentFile: string) {
  const ast = await getAst(currentFile, fs.readFileSync(currentFile, "utf8"));
  if (!ast) {
    throw new Error(`failed to get ast for file ${currentFile}`);
  }
  const language = getFullLanguageName(currentFile);
  const queryPath = require.resolve(
    `@jpoly1219/context-extractor/src/tree-sitter-files/queries/relevant-headers-queries/${language}-get-toplevel-headers.scm`
  );
  const query = await getQueryForFile(
    currentFile,
    queryPath
    // path.join(
    //   __dirname,
    //   "tree-sitter-files",
    //   "queries",
    //   "relevant-headers-queries",
    //   `${language}-get-toplevel-headers.scm`
    // )
  );
  if (!query) {
    throw new Error(
      `failed to get query for file ${currentFile} and language ${language}`
    );
  }
  return query.matches(ast.rootNode);
}

export async function extractTopLevelDeclsWithFormatting(currentFile: string) {
  const ast = await getAst(currentFile, fs.readFileSync(currentFile, "utf8"));
  if (!ast) {
    throw new Error(`failed to get ast for file ${currentFile}`);
  }
  const language = getFullLanguageName(currentFile);
  const queryPath = require.resolve(
    `@jpoly1219/context-extractor/src/tree-sitter-files/queries/relevant-headers-queries/${language}-get-toplevel-headers.scm`
  );
  const query = await getQueryForFile(
    currentFile,
    queryPath
    // path.join(
    //   __dirname,
    //   "tree-sitter-files",
    //   "queries",
    //   "relevant-headers-queries",
    //   `${language}-get-toplevel-headers.scm`
    // )
  );
  if (!query) {
    throw new Error(
      `failed to get query for file ${currentFile} and language ${language}`
    );
  }
  const matches = query.matches(ast.rootNode);

  const results = [];

  for (const match of matches) {
    const item: {
      declaration: string;
      nodeType: string;
      name: string;
      declaredType: string;
      returnType?: string;
    } = {
      declaration: "",
      nodeType: "",
      name: "",
      declaredType: "",
    };

    for (const { name, node } of match.captures) {
      if (name === "top.var.decl") {
        item.nodeType = "variable";
        item.declaration = node.text;

        // Attempt to get the declared type (e.g., const x: string = ...)
        const typeNode = node.descendantsOfType("type_annotation")[0];
        if (typeNode) {
          item.declaredType = typeNode.text.replace(/^:\s*/, "");
        }
      } else if (name === "top.var.name" || name === "top.fn.name") {
        item.name = node.text;
      } else if (name === "top.fn.decl") {
        item.nodeType = "function";
        item.declaration = node.text;

        // Get the return type (e.g., function foo(): string)
        const returnTypeNode = node.childForFieldName("return_type");
        if (returnTypeNode) {
          item.returnType = returnTypeNode.text.replace(/^:\s*/, "");
        }

        // Get declaredType if needed (TypeScript style)
        const nameNode = node.childForFieldName("name");
        if (nameNode && nameNode.nextSibling?.type === "type_annotation") {
          item.declaredType = nameNode.nextSibling.text.replace(/^:\s*/, "");
        }
      }
    }

    if (item.name && item.declaration) {
      results.push(item);
    }
  }

  return results;
}

export function extractFunctionTypeFromDecl(match: Parser.QueryMatch): string {
  let paramsNode: Parser.SyntaxNode;
  let returnNode: Parser.SyntaxNode;

  for (const capture of match.captures) {
    if (capture.name === "top.fn.param.type") {
      paramsNode = capture.node;
    } else if (capture.name === "top.fn.type") {
      returnNode = capture.node;
    }
  }

  return `${paramsNode!.text} => ${returnNode!.text}`;
}

// export async function getSymbolsForManyFiles(
//   uris: string[],
//   ide: IDE,
// ): Promise<FileSymbolMap> {
//   const filesAndSymbols = await Promise.all(
//     uris.map(async (uri): Promise<[string, SymbolWithRange[]]> => {
//       const contents = await ide.readFile(uri);
//       let symbols = undefined;
//       try {
//         symbols = await getSymbolsForFile(uri, contents);
//       } catch (e) {
//         console.error(`Failed to get symbols for ${uri}:`, e);
//       }
//       return [uri, symbols ?? []];
//     }),
//   );
//   return Object.fromEntries(filesAndSymbols);
// }
