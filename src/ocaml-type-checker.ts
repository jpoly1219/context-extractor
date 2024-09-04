import { TypeChecker } from "./types";
import { indexOfRegexGroup } from "./utils";


export class OcamlTypeChecker implements TypeChecker {
  getIdentifierFromDecl(typeDecl: string) {
    const declRe = /(.+ )(.+)( =)(.*)/;
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
}

