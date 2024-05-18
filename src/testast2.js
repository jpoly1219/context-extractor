import ts from "typescript";
import * as fs from "fs";

// interface DocEntry {
//   name?: string;
//   fileName?: string;
//   documentation?: string;
//   type?: string;
//   constructors?: DocEntry[];
//   parameters?: DocEntry[];
//   returnType?: string;
// }

/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(
  fileNames,
  options
) {
  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  let output = [];

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit, "");
    }
  }

  // print out the doc
  fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));

  return;

  /** visit nodes finding exported classes */
  function visit(node) {
    console.log("node start:", ts.SyntaxKind[node.kind])
    // console.log(checker.getSymbolAtLocation(node.name), "\n")
    // console.log(checker.getTypeAtLocation(node.name))
    // console.log(checker.isTupleType(node))
    if (ts.isIdentifier(node)) {
      console.log("identifier:", node.getText())
    }
    // console.log(`${nest}${ts.SyntaxKind[node.kind]}`)
    console.log(`${checker.typeToString(checker.getTypeAtLocation(node))}`)
    // output.push(serializeUnionType(checker.getSymbolAtLocation(node.name)))

    ts.forEachChild(node, visit);
  }

  /** Serialize a symbol into a json object */
  function serializeSymbol(symbol) {
    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration)
      )
    };
  }

  /** Serialize a class symbol information */
  function serializeClass(symbol) {
    let details = serializeSymbol(symbol);

    // Get the construct signatures
    let constructorType = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration
    );
    details.constructors = constructorType
      .getConstructSignatures()
      .map(serializeSignature);
    return details;
  }

  /** Serialize a signature (call or construct) */
  function serializeSignature(signature) {
    return {
      parameters: signature.parameters.map(serializeSymbol),
      returnType: checker.typeToString(signature.getReturnType()),
      documentation: ts.displayPartsToString(signature.getDocumentationComment(checker))
    };
  }


  function serializeUnionType(signature) {
    const it = signature.declarations[0].type.kind
    if (ts.SyntaxKind[it] === "UnionType") {
      const types = (signature.declarations[0].type.types).reduce((acc, curr) => {
        return acc + ts.SyntaxKind[curr.kind.toString()] + ", "
      }, "")
      console.log(types)
      return {
        type: signature.escapedName,
        innerType: ts.SyntaxKind[it],
        innerInnerType: types,
        // innerType: signature.declarations[0].reduce((acc, curr) => {
        //   acc + curr.type.kind
        // }, "")
      }

    }
    return {
      type: signature.escapedName,
      innerType: ts.SyntaxKind[it],
      // innerType: signature.declarations[0].reduce((acc, curr) => {
      //   acc + curr.type.kind
      // }, "")
    }
  }

  /** True if this is visible outside this file, false otherwise */
  function isNodeExported(node) {
    return (
      (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}

generateDocumentation(process.argv.slice(2), {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS
});
