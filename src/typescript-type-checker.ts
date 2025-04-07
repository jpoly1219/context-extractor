import * as ts from 'typescript';
import { TypeChecker, TypeAnalysis, VarFuncDecls } from "./types";
import { indexOfRegexGroup } from "./utils";


export class TypeScriptTypeChecker implements TypeChecker {
  getIdentifierFromDecl(typeDecl: string) {
    const declRe = /(.+ )(.+)( = )(.+)/;
    const match = typeDecl.match(declRe);
    if (!match) return "";
    return match[2];
  }

  getTypeContextFromDecl(typeDecl: string) {
    if (this.checkHole(typeDecl)) {
      return this.checkHole(typeDecl);
    } else if (this.checkParameter(typeDecl)) {
      return this.checkParameter(typeDecl);
    } else if (this.checkFunction(typeDecl)) {
      return this.checkFunction(typeDecl);
    } else if (this.checkUnion(typeDecl)) {
      return this.checkUnion(typeDecl);
    } else if (this.checkObject(typeDecl)) {
      return this.checkObject(typeDecl);
    } else if (this.checkImports(typeDecl)) {
      return this.checkImports(typeDecl);
    } else if (this.checkModule(typeDecl)) {
      return this.checkModule(typeDecl);
    } else {
      return this.checkPrimitive(typeDecl);
    }
  }

  // pattern matching
  // attempts to match strings to corresponding types, then returns an object containing the name, type span, and an interesting index
  // base case - type can no longer be stepped into
  // boolean, number, string, enum, unknown, any, void, null, undefined, never
  // ideally this should be checked for before we do the for loop
  // return typeSpan;


  // check if hover result is from a primitive type
  checkPrimitive(typeDecl: string) {
    // type _ = boolean
    const primitivePattern = /(type )(.+)( = )(.+)/;
    const primitiveMatch = typeDecl.match(primitivePattern);
    let primitiveInterestingIndex = -1;
    if (primitiveMatch) {
      primitiveInterestingIndex = indexOfRegexGroup(primitiveMatch, 4);
    }

    if (primitiveInterestingIndex != -1) {
      const typeName = primitiveMatch![2];
      const typeSpan = primitiveMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: primitiveInterestingIndex }
    }
    return null;
  }


  // check if hover result is from an import
  checkImports(typeDecl: string) {
    // import { _, _ };
    const importPattern = /(import )(\{.+\})/;
    const importMatch = typeDecl.match(importPattern);
    let importInterestingIndex = -1;
    if (importMatch) {
      importInterestingIndex = indexOfRegexGroup(importMatch, 2);
    }

    // import _;
    const defaultImportPattern = /(import )(.+)/;
    const defaultImportMatch = typeDecl.match(defaultImportPattern);
    let defaultImportInterestingIndex = -1;
    if (defaultImportMatch) {
      defaultImportInterestingIndex = indexOfRegexGroup(defaultImportMatch, 2);
    }

    if (importInterestingIndex != -1) {
      const typeName = importMatch![2];
      const typeSpan = importMatch![2];
      return { identifier: typeName, span: typeSpan, interestingIndex: importInterestingIndex }
    } else if (defaultImportInterestingIndex != -1) {
      const typeName = defaultImportMatch![2];
      const typeSpan = defaultImportMatch![2];
      return { identifier: typeName, span: typeSpan, interestingIndex: defaultImportInterestingIndex }
    }

    return null;
  }


  // check if hover result is from a module
  checkModule(typeDecl: string) {
    // module "path/to/module"
    const modulePattern = /(module )(.+)/;
    const moduleMatch = typeDecl.match(modulePattern);
    let moduleInterestingIndex = -1;
    if (moduleMatch) {
      moduleInterestingIndex = indexOfRegexGroup(moduleMatch, 2);
    }

    if (moduleInterestingIndex != -1) {
      const typeName = moduleMatch![2];
      const typeSpan = moduleMatch![2];
      return { identifier: typeName, span: typeSpan, interestingIndex: moduleInterestingIndex }
    }

    return null;
  }


  // check if hover result is from an object
  checkObject(typeDecl: string) {
    // type _ = {
    //   _: t1;
    //   _: t2;
    // }
    const objectTypeDefPattern = /(type )(.+)( = )(\{.+\})/;
    const objectTypeDefMatch = typeDecl.match(objectTypeDefPattern);
    let objectTypeDefInterestingIndex = -1;
    if (objectTypeDefMatch) {
      objectTypeDefInterestingIndex = indexOfRegexGroup(objectTypeDefMatch, 4);
    }

    if (objectTypeDefInterestingIndex != -1) {
      const typeName = objectTypeDefMatch![2];
      const typeSpan = objectTypeDefMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: objectTypeDefInterestingIndex }
    }
    return null;
  }


  // check if hover result is from a union
  checkUnion(typeDecl: string) {
    // type _ = A | B | C
    const unionPattern = /(type )(.+)( = )((.+ | )+.+)/;
    const unionMatch = typeDecl.match(unionPattern);
    let unionInterestingIndex = -1;
    if (unionMatch) {
      unionInterestingIndex = indexOfRegexGroup(unionMatch, 4);
    }

    if (unionInterestingIndex != -1) {
      const typeName = unionMatch![2];
      const typeSpan = unionMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: unionInterestingIndex }
    }
    return null;
  }


  // check if hover result is from a function
  checkFunction(typeDecl: string) {
    // const myFunc : (arg1: typ1, ...) => _
    const es6AnnotatedFunctionPattern = /(const )(.+)(: )(\(.+\) => .+)/;
    const es6AnnotatedFunctionMatch = typeDecl.match(es6AnnotatedFunctionPattern);
    let es6AnnotatedFunctionInterestingIndex = -1;
    if (es6AnnotatedFunctionMatch) {
      es6AnnotatedFunctionInterestingIndex = indexOfRegexGroup(es6AnnotatedFunctionMatch, 4);
    }

    // type _ = (_: t1) => t2
    const es6FunctionTypeDefPattern = /(type )(.+)( = )(\(.+\) => .+)/;
    const es6FunctionTypeDefPatternMatch = typeDecl.match(es6FunctionTypeDefPattern);
    let es6FunctionTypeDefInterestingIndex = -1;
    if (es6FunctionTypeDefPatternMatch) {
      es6FunctionTypeDefInterestingIndex = indexOfRegexGroup(es6FunctionTypeDefPatternMatch, 4);
    }

    // function myFunc<T>(args: types, genarg: T): returntype
    const genericFunctionTypePattern = /(function )(.+)(\<.+\>\(.*\))(: )(.+)/;
    const genericFunctionTypeMatch = typeDecl.match(genericFunctionTypePattern);
    let genericFunctionTypeInterestingIndex = -1;
    if (genericFunctionTypeMatch) {
      genericFunctionTypeInterestingIndex = indexOfRegexGroup(genericFunctionTypeMatch, 3);
    }

    // function myFunc(args: types): returntype
    const functionTypePattern = /(function )(.+)(\(.*\))(: )(.+)/;
    const functionTypeMatch = typeDecl.match(functionTypePattern);
    let functionTypeInterestingIndex = -1;
    if (functionTypeMatch) {
      functionTypeInterestingIndex = indexOfRegexGroup(functionTypeMatch, 3);
    }

    if (es6AnnotatedFunctionInterestingIndex != -1) {
      const typeName = es6AnnotatedFunctionMatch![2];
      const typeSpan = es6AnnotatedFunctionMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: es6AnnotatedFunctionInterestingIndex }
    } else if (es6FunctionTypeDefInterestingIndex != -1) {
      const typeName = es6FunctionTypeDefPatternMatch![2];
      const typeSpan = es6FunctionTypeDefPatternMatch![4];
      return { identifier: typeName, span: typeSpan, interestingIndex: es6FunctionTypeDefInterestingIndex }
    } else if (genericFunctionTypeInterestingIndex != -1) {
      const typeName = genericFunctionTypeMatch![2];
      const typeSpan = genericFunctionTypeMatch![3] + genericFunctionTypeMatch![4] + genericFunctionTypeMatch![5];
      return { identifier: typeName, span: typeSpan, interestingIndex: genericFunctionTypeInterestingIndex }
    } else if (functionTypeInterestingIndex != -1) {
      const typeName = functionTypeMatch![2];
      const typeSpan = functionTypeMatch![3] + functionTypeMatch![4] + functionTypeMatch![5];
      return { identifier: typeName, span: typeSpan, interestingIndex: functionTypeInterestingIndex }
    }

    return null;
  }


  // check if hover result is from a hole
  checkHole(typeDecl: string) {
    // (type parameter) T in _<T>(): T
    const holePattern = /(\(type parameter\) T in _\<T\>\(\): T)/;
    const match = typeDecl.match(holePattern);
    if (match) {
      const typeName = "hole function";
      const typeSpan = match[1];
      return { identifier: typeName, span: typeSpan }
    }

    return null;
  }


  // check if hover result is from a parameter
  checkParameter(typeDecl: string) {
    // (parameter) name: type
    // const parameterPattern = /(\(parameter\) )(.+)(: )(.+))/;
    // const parameterMatch = typeDecl.match(parameterPattern);
    // let parameterInterestingIndex = -1;
    // if (parameterMatch) {
    //   parameterInterestingIndex = indexOfRegexGroup(parameterMatch, 4);
    // }
    //
    // if (parameterInterestingIndex != -1) {
    //   const typeName = parameterMatch[2];
    //   const typeSpan = parameterMatch[4];
    //   return { typeName: typeName, typeSpan: typeSpan, interestingIndex: parameterInterestingIndex }
    // }
    return null;
  }


  isTuple(typeSpan: string) {
    return typeSpan[0] === "[" && typeSpan[typeSpan.length - 1] === "]";
  }


  isUnion(typeSpan: string) {
    return typeSpan.includes(" | ");
  }


  isArray(typeSpan: string) {
    return typeSpan.slice(-2) === "[]";
  }


  isObject(typeSpan: string) {
    return typeSpan[0] === "{" && typeSpan[typeSpan.length - 1] === "}";
  }


  // this is a very rudimentary check, so it should be expanded upon
  isFunction(typeSpan: string) {
    return typeSpan.includes("=>");
  }


  isPrimitive(typeSpan: string) {
    const primitives = ["string", "number", "boolean"];
    return primitives.includes(typeSpan);
  }


  isTypeAlias(typeSpan: string) {
    const caps = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return caps.includes(typeSpan[0]);
  }


  escapeQuotes(typeSpan: string): string {
    return typeSpan.replace(/"/g, `\\"`);
  }


  parseTypeArrayString(typeStr: string): string[] {
    // Remove all spaces
    const cleaned = typeStr.replace(/\s/g, '');

    // Remove the outermost square brackets
    const inner = cleaned.slice(1, -1);
    // const inner = cleaned.slice(-1) === ";" ? cleaned.slice(1, -2) : cleaned.slice(1, -1);

    // Split the string, respecting nested structures
    const result: string[] = [];
    let currentItem = '';
    let nestLevel = 0;

    for (const char of inner) {
      if (char === '[') nestLevel++;
      if (char === ']') nestLevel--;

      if (char === ',' && nestLevel === 0) {
        // check if currentItem is a name: type pair or just type
        if (currentItem.includes(":")) {
          result.push(currentItem.split(":")[1]);
        } else {
          result.push(currentItem);
        }
        currentItem = '';
      } else {
        currentItem += char;
      }
    }

    if (currentItem.includes(":")) {
      result.push(currentItem.split(":")[1]);
    } else {
      result.push(currentItem);
    }

    return result;
  }

  /* Version 2, using TypeScript Compiler API */

  handleMembers(members: ts.NodeArray<ts.TypeElement> | ts.NodeArray<ts.ClassElement>, checker: ts.TypeChecker): TypeAnalysis[] {
    return members.map(member => {
      if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
        const propertyType = member.type ? this.analyzeTypeNode(member.type, checker) : { kind: 'Any', text: 'any' };
        return {
          kind: 'Property',
          text: member.getText(),
          constituents: [propertyType]
        };
      } else if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) {
        const parameters = member.parameters.map(param => ({
          name: param.name.getText(),
          optional: !!param.questionToken,
          type: param.type ? this.analyzeTypeNode(param.type, checker) : { kind: 'Any', text: 'any' }
        }));
        const returnType = member.type ? this.analyzeTypeNode(member.type, checker) : { kind: 'Any', text: 'any' };
        return {
          kind: 'Method',
          text: member.getText(),
          parameters,
          returnType
        };
      } else {
        return {
          kind: "Unknown",
          text: member.getText()
        };
      }
    })
  }

  analyzeTypeNode(typeNode: ts.TypeNode, checker: ts.TypeChecker): TypeAnalysis {
    switch (typeNode.kind) {
      case ts.SyntaxKind.NumericLiteral: {
        return {
          kind: 'NumericLiteral',
          text: typeNode.getText(),
        };
      }

      case ts.SyntaxKind.StringLiteral: {
        return {
          kind: 'StringLiteral',
          text: typeNode.getText(),
        };
      }

      case ts.SyntaxKind.FunctionType: {
        const tn = typeNode as ts.FunctionTypeNode;
        return {
          kind: "Function",
          text: tn.getText(),
          parameters: tn.parameters.map(parameter => {
            return {
              name: parameter.name.getText(),
              optional: !!parameter.questionToken,
              type: parameter.type ? this.analyzeTypeNode(parameter.type, checker) : { kind: "Any", text: "any" }
            }
          }),
          returnType: tn.type ? this.analyzeTypeNode(tn.type, checker) : undefined
        };
      }

      case ts.SyntaxKind.ArrayType: {
        const tn = typeNode as ts.ArrayTypeNode;
        return {
          kind: 'Array',
          text: typeNode.getText(),
          constituents: [this.analyzeTypeNode(tn.elementType, checker)]
        };
      }

      case ts.SyntaxKind.TupleType: {
        const tn = typeNode as ts.TupleTypeNode;
        const elements = tn.elements.map(element => {
          if (ts.isRestTypeNode(element)) {
            return {
              kind: 'RestElement',
              text: element.getText(),
              type: this.analyzeTypeNode(element.type, checker)
            };
          } else if (ts.isNamedTupleMember(element)) {
            return this.analyzeTypeNode(element.type, checker);
          } else {
            return this.analyzeTypeNode(element, checker);
          }
        });

        return {
          kind: 'Tuple',
          text: typeNode.getText(),
          constituents: elements
        };
      }

      case ts.SyntaxKind.UnionType: {
        const tn = typeNode as ts.UnionTypeNode;
        return {
          kind: "Union",
          text: tn.getText(),
          constituents: tn.types.map(typ => {
            return this.analyzeTypeNode(typ, checker);
          })
        };
      }

      case ts.SyntaxKind.IntersectionType: {
        const tn = typeNode as ts.IntersectionTypeNode;
        return {
          kind: "Intersection",
          text: tn.getText(),
          constituents: tn.types.map(typ => {
            return this.analyzeTypeNode(typ, checker);
          })
        };
      }

      case ts.SyntaxKind.TypeLiteral: {
        const tn = typeNode as ts.TypeLiteralNode;
        return {
          kind: "Object",
          text: tn.getText(),
          constituents: this.handleMembers(tn.members, checker)
        };
      }

      case ts.SyntaxKind.TypeReference: {
        const tn = typeNode as ts.TypeReferenceNode;
        const symbol = checker.getSymbolAtLocation(tn.typeName);
        let typeAliasAnalysis: TypeAnalysis = { kind: 'TypeReference', text: typeNode.getText() };

        if (symbol && symbol.declarations) {
          const declaration = symbol.declarations[0];
          if (ts.isTypeAliasDeclaration(declaration)) {
            const typeAlias = declaration as ts.TypeAliasDeclaration;
            if (typeAlias.type) {
              typeAliasAnalysis = {
                ...typeAliasAnalysis,
                kind: `TypeReference of TypeAliasDeclaration`,
                constituents: [this.analyzeTypeNode(typeAlias.type, checker)]
              };
            }
          } else if (ts.isInterfaceDeclaration(declaration)) {
            const interfaceDecl = declaration as ts.InterfaceDeclaration;
            if (interfaceDecl.members) {
              typeAliasAnalysis = {
                ...typeAliasAnalysis,
                kind: `TypeReference of InterfaceDeclaration`,
                constituents: this.handleMembers(interfaceDecl.members, checker)
              };
            }
          } else if (ts.isClassDeclaration(declaration)) {
            const classDecl = declaration as ts.ClassDeclaration;
            if (classDecl.members) {
              typeAliasAnalysis = {
                ...typeAliasAnalysis,
                kind: `TypeReference of ClassDeclaration`,
                constituents: this.handleMembers(classDecl.members, checker),
              };

              if (classDecl.heritageClauses) {
                typeAliasAnalysis = {
                  ...typeAliasAnalysis,
                  heritage: classDecl.heritageClauses.map(heritageClause => {
                    return heritageClause.types.map(typ => {
                      return this.analyzeTypeNode(typ, checker);
                    });
                  })
                };
              }
            }
          }
        }

        return typeAliasAnalysis;
      }
    }

    return {
      kind: ts.SyntaxKind[typeNode.kind],
      text: typeNode.getText()
    };
  }

  analyzeTypeString(typeString: string, program: ts.Program = this.createProgramFromSource("")): TypeAnalysis {
    const sourceFile = ts.createSourceFile('temp.ts', `type T = ${typeString};`, ts.ScriptTarget.Latest, true);
    let typeNode: ts.TypeNode | undefined;

    ts.forEachChild(sourceFile, node => {
      if (ts.isTypeAliasDeclaration(node)) {
        typeNode = node.type;
      }
    });

    if (!typeNode) {
      throw new Error('Failed to parse type string');
    }

    const checker = program.getTypeChecker();
    return this.analyzeTypeNode(typeNode, checker);
  }

  createProgramFromSource(content: string): ts.Program {
    const fileName = 'test.ts';
    const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
    const host = ts.createCompilerHost({});
    host.getSourceFile = (fileName) => (fileName === 'test.ts' ? sourceFile : undefined);
    const program = ts.createProgram([fileName], {}, host);
    return program;
  }

  isPrimitive2(typeAnalysisResult: TypeAnalysis) {
    const re = /(.*)Keyword/;
    return typeAnalysisResult.kind.match(re)
  }

  isFunction2(typeAnalysisResult: TypeAnalysis) {
    return typeAnalysisResult.kind === "Function";
  }

  isTuple2(typeAnalysisResult: TypeAnalysis) {
    return typeAnalysisResult.kind === "Tuple";
  }

  isObject2(typeAnalysisResult: TypeAnalysis) {
    return typeAnalysisResult.kind === "Object";
  }

  isUnion2(typeAnalysisResult: TypeAnalysis) {
    return typeAnalysisResult.kind === "Union";
  }

  isArray2(typeAnalysisResult: TypeAnalysis) {
    return typeAnalysisResult.kind === "Array";
  }

  isTypeAlias2(typeAnalysisResult: TypeAnalysis) {
    return typeAnalysisResult.kind === "TypeReference";
  }

  extractIdentifiers(code: string) {
    const sourceFile = ts.createSourceFile(
      "sample.ts",
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const identifiers: { name: string; start: number; end: number; line: number; column: number }[] = [];
    this.extractIdentifiersWithPosHelper(sourceFile, sourceFile, identifiers);
    return identifiers;
  }

  extractIdentifiersHelper(node: ts.Node, identifiers: Set<string>) {
    if (ts.isIdentifier(node)) {
      // console.log(node.kind, node.text)
      if (
        ts.isTypeReferenceNode(node.parent) ||
        ts.isTypeAliasDeclaration(node.parent) ||
        ts.isInterfaceDeclaration(node.parent) ||
        ts.isClassDeclaration(node.parent) ||
        ts.isFunctionTypeNode(node.parent)
      ) {
        identifiers.add(node.getText());
      }
    }
    node.forEachChild(child => this.extractIdentifiersHelper(child, identifiers));
  }

  extractIdentifiersWithPosHelper(sourceFile: ts.SourceFile, node: ts.Node, identifiers: { name: string; start: number; end: number; line: number; column: number }[]) {
    if (ts.isIdentifier(node)) {
      // console.log(node.kind, node.text)
      if (
        ts.isTypeReferenceNode(node.parent) ||
        ts.isTypeAliasDeclaration(node.parent) ||
        ts.isInterfaceDeclaration(node.parent) ||
        ts.isClassDeclaration(node.parent) ||
        ts.isFunctionTypeNode(node.parent)
      ) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        identifiers.push({
          name: node.getText(),
          start: node.getStart(),
          end: node.getEnd(),
          line: line + 1, // Convert 0-based to 1-based
          column: character + 1 // Convert 0-based to 1-based
        });
      }
    }
    node.forEachChild(child => this.extractIdentifiersWithPosHelper(sourceFile, child, identifiers));
  }

  findDeclarationForIdentifier(
    sourceCode: string,
    targetLine: number,
    targetCharStart: number,
    targetCharEnd: number
  ): string | null {
    const sourceFile = ts.createSourceFile(
      "sample.ts",
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    function findDeclarationForIdentifierHelper(node: ts.Node): string | null {
      if (ts.isTypeAliasDeclaration(node)) {
        const identifier = node.name;

        // Get start and end positions for identifier
        const startPos = sourceFile.getLineAndCharacterOfPosition(identifier.getStart());
        const endPos = sourceFile.getLineAndCharacterOfPosition(identifier.getEnd());

        // Match the identifier position
        if (
          startPos.line === targetLine &&
          startPos.character === targetCharStart &&
          endPos.character === targetCharEnd
        ) {
          // Extract full declaration text from source code
          return sourceCode.slice(node.getStart(), node.getEnd());
        }
      }

      return ts.forEachChild(node, findDeclarationForIdentifierHelper) || null;
    }

    const declarationText = findDeclarationForIdentifierHelper(sourceFile);
    // console.log(`declarationText: ${declarationText}`)

    if (declarationText) {
      return declarationText;
    } else {
      return null;
    }
  }

  // findTopLevelDeclarations(sourceCode: string, fileName = "temp.ts") {
  findTopLevelDeclarations(program: ts.Program, fileName: string): VarFuncDecls[] {
    // const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ESNext };
    // NOTE: This is only necessary when you are passing the code string only.
    // This is a nifty trick to create a temporary file to store your code string literal.
    // In this case the function should accept (sourceCode: string, fileName = "temp.ts").
    // If you know what file you need to read, then there is no need for this.
    // const host = ts.createCompilerHost(compilerOptions);
    // host.getSourceFile = (fileName, languageVersion) =>
    //   ts.createSourceFile(fileName, sourceCode, languageVersion, true);
    // const program = ts.createProgram([fileName], compilerOptions, host);

    // const program = ts.createProgram([fileName], compilerOptions);
    const sourceFile = program.getSourceFile(fileName)!;
    const checker = program.getTypeChecker();

    const results: VarFuncDecls[] = [];

    function getLineChar(pos: number) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
      return { line: line + 1, character: character + 1 }; // 1-based
    }

    function visit(node: ts.Node) {
      // Only look at top-level nodes
      if (node.parent && node.parent.kind !== ts.SyntaxKind.SourceFile) return;


      if (ts.isFunctionDeclaration(node) && node.name) {
        // const symbol = checker.getSymbolAtLocation(node.name);
        // const type = symbol && checker.getTypeOfSymbolAtLocation(symbol, node);
        // const typeString = type ? checker.typeToString(type) : "unknown";
        const signature = checker.getSignatureFromDeclaration(node);
        const signatureString = signature ? checker.signatureToString(signature) : "unknown";
        const returnType = signature ? checker.typeToString(signature.getReturnType()) : null;

        let result: VarFuncDecls = {
          kind: "function",
          name: node.name.text,
          type: signatureString,
          position: getLineChar(node.getStart()),
          declarationText: node.getText(sourceFile),
          sourceFile: fileName
        }

        if (returnType) {
          result = {
            ...result,
            returnType: returnType
          }
        }

        results.push(result);
      }


      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name)) continue;

          const name = decl.name.text;
          const type = checker.getTypeAtLocation(decl);
          let kind: "function" | "variable" | "arrowFunction" | "classMethod" = "variable";
          let returnType: string | null = null;

          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            kind =
              decl.initializer && ts.isArrowFunction(decl.initializer)
                ? "arrowFunction"
                : "variable";

            const arrowFunc = decl.initializer as ts.ArrowFunction;
            const signature = checker.getSignatureFromDeclaration(arrowFunc);
            if (signature) {
              const returnTypeSymbol = checker.getReturnTypeOfSignature(signature);
              returnType = checker.typeToString(returnTypeSymbol);
            }
          }

          let result: VarFuncDecls = {
            kind,
            name,
            type: checker.typeToString(type),
            position: getLineChar(decl.getStart()),
            declarationText: decl.getText(sourceFile),
            sourceFile: fileName
          }

          if (returnType) {
            result = {
              ...result,
              returnType: returnType
            }
          }

          results.push(result);
        }
      }

      if (ts.isClassDeclaration(node) && node.name) {
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            const symbol = checker.getSymbolAtLocation(member.name);
            const type = symbol && checker.getTypeOfSymbolAtLocation(symbol, member);
            results.push({
              kind: "classMethod",
              name: `${node.name.text}.${member.name.text}`,
              type: type ? checker.typeToString(type) : "unknown",
              position: getLineChar(member.getStart()),
              declarationText: member.getText(sourceFile),
              sourceFile: fileName
            });
          }
        }
      }
    }

    ts.forEachChild(sourceFile, visit);
    return results;
  }

  createTsCompilerProgram(repo: string[]): ts.Program {
    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ESNext };
    const program = ts.createProgram(repo, compilerOptions);
    return program
  }

  replaceTypeAnnotationColonWithArrow(typeStr: string): string {
    const regex = /^([\(\[][^)]*\)?)(?:\s*:\s*)(.*)$/;

    const match = typeStr.match(regex);

    if (!match) {
      console.log('Invalid function type signature');
      return "";
    }

    const params = match[1].trim();
    const returnType = match[2].trim();

    return `${params} => ${returnType}`;
  }
}

