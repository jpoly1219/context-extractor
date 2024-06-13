import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { escapeQuotes, parseCodeQLRelevantTypes, parseCodeQLVars, parseCodeQLTypes, isQLFunction, isQLTuple, isQLUnion, isQLArray, isQLLocalTypeAccess, isQLPredefined, isQLLiteral, isQLKeyword, isQLInterface } from "./utils";
import { relevantTypeObject, varsObject, typesObject, relevantTypeQueryResult } from "./types";
// import { CODEQL_PATH, ROOT_DIR, QUERY_DIR, BOOKING_DIR } from "./constants";

const createDatabaseWithCodeQL = (pathToCodeQL: string, targetPath: string): string => {
  const databaseName = path.basename(targetPath).concat("db");
  const pathToDatabase = path.join(targetPath, databaseName);
  try {
    execSync(`${pathToCodeQL} database create ${pathToDatabase} --source-root=${targetPath} --overwrite --language=javascript-typescript`)
    return pathToDatabase;
  } catch (err) {
    console.error(`error while creating database: ${err}`);
    throw err;
  }
}

const extractRelevantTypesWithCodeQL = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): Map<string, relevantTypeObject> => {
  const pathToBqrs = path.join(outDir, "relevant-types.bqrs");
  const pathToDecodedJSON = path.join(outDir, "relevant-types.json");

  // run CodeQL query relevant-types.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON}`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/relevant-types.bqrs: ${err}`);
  }

  const relevantTypesContent = fs.readFileSync(pathToDecodedJSON);
  const relevantTypes = parseCodeQLRelevantTypes(JSON.parse(relevantTypesContent.toString()));

  return relevantTypes;
}

const extractHeadersWithCodeQL = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): Map<string, varsObject> => {
  const pathToBqrs = path.join(outDir, "vars.bqrs");
  const pathToDecodedJSON = path.join(outDir, "vars.json");

  // run CodeQL query vars.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON}`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/vars.bqrs: ${err}`);
  }

  const varsContent = fs.readFileSync(pathToDecodedJSON);
  const vars = parseCodeQLVars(JSON.parse(varsContent.toString()));

  return vars;
}

const extractTypes = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): typesObject[] => {
  console.log("==extractTypes==")
  const pathToBqrs = path.join(outDir, "types.bqrs");
  const pathToDecodedJSON = path.join(outDir, "types.json");

  // run CodeQL query types.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON}`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/types.bqrs: ${err}`);
  }

  const typesContent = fs.readFileSync(pathToDecodedJSON);
  const types = parseCodeQLTypes(JSON.parse(typesContent.toString()));
  console.log("extractTypes result: ", types, "\n\n")

  return types;
}

const extractRelevantContextWithCodeQL = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string, headers: Map<string, varsObject>, relevantTypes: Map<string, relevantTypeObject>): Set<string> => {
  console.log("==entry==")
  console.log("relevantTypes: ", relevantTypes);
  const relevantContext = new Set<string>();
  const knownNormalForms = new Map<string, string>();

  // for each var in vars, check if its type is equivalent to any of relevantTypes
  headers.forEach((header) => {
    console.log("\n\nheader: ", header, "\n\n")
    const typeOfHeader: typesObject = { typeName: header.typeAnnotation, typeQLClass: header.typeQLClass };
    const isEquivalent = extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, typeOfHeader, relevantTypes, knownNormalForms);
    if (isEquivalent) {
      relevantContext.add(header.constDeclaration);
    }
  })

  console.log("relevantContext: ", relevantContext)

  return relevantContext;
}

const extractRelevantContextHelper = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  headerType: typesObject,
  relevantTypes: Map<string, relevantTypeObject>,
  knownNormalForms: Map<string, string>
): boolean => {
  console.log("\n\n==recurse==")
  console.log("headerType: ", headerType)
  // NOTE:
  // extract types that are consistent to any of the target types
  // extract functions whose return types are equivalent to any of the target types
  // extract products whose component types are equivalent to any of the target types

  for (const [key, typ] of relevantTypes.entries()) {
    const typObj: typesObject = { typeName: typ.typeDefinition, typeQLClass: typ.typeQLClass };
    console.log("typ: ", typ)

    if (isTypeEquivalent(pathToCodeQL, pathToQuery, pathToDatabase, outDir, headerType, typObj, relevantTypes, knownNormalForms)) {
      console.log("isTypeEquivalent!")
      return true;
    }
  }

  // if (isQLPredefined(headerType.typeQLClass) || isQLLiteral(headerType.typeQLClass) || isQLKeyword(headerType.typeQLClass)) {
  //   return;
  //
  // }
  if (isQLFunction(headerType.typeQLClass)) {
    const q = createReturnTypeQuery(headerType.typeName);
    console.log("extractor fq: ", q)

    fs.writeFileSync(pathToQuery, q);

    // could use extractVars
    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("extractor fq res: ", queryRes)
    return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);

  } else if (isQLInterface(headerType.typeQLClass)) {
    const q = createInterfaceComponentsTypeQuery(headerType.typeName);
    console.log("extractor iq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("extractor iq res", queryRes)

    queryRes.forEach(obj => {
      const val = obj.typeName.split(":")[1];
      const typObj: typesObject = { typeName: val, typeQLClass: obj.typeQLClass };
      return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, typObj, relevantTypes, knownNormalForms);
    });

  } else if (isQLTuple(headerType.typeQLClass)) {
    const q = createTupleComponentsTypeQuery(headerType.typeName);
    console.log("extractor tq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("extractor tq res", queryRes)

    let res = true;
    queryRes.forEach(obj => {
      res &&= extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms);
    });
    return res;

  } else if (isQLUnion(headerType.typeQLClass)) {
    const q = createUnionComponentsTypeQuery(headerType.typeName);
    console.log("extractor uq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("extractor uq res", queryRes)

    let res = true;
    queryRes.forEach(obj => {
      res &&= extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms);
    });
    return res;

  } else if (isQLArray(headerType.typeQLClass)) {
    const q = createArrayTypeQuery(headerType.typeName);
    console.log("extractor aq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("extractor aq res", queryRes)

    return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);
    // if (isTypeEquivalent(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], typObj, relevantTypes)) {
    //   extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, relevantContext);
    // }

  } else if (isQLLocalTypeAccess(headerType.typeQLClass)) {
    const q = createLocalTypeAccessTypeQuery(headerType.typeName);
    console.log("extractor ltaq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("extractor ltaq res", queryRes)

    return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);
  } else {
    console.log(`extractRelevantContextHelper: this doesn't exist: ${JSON.stringify(headerType)}`);
    // console.error(`extractRelevantContextHelper: this doesn't exist: ${JSON.stringify(headerType)}`);
    // throw Error(`extractRelevantContextHelper: this doesn't exist: ${JSON.stringify(headerType)}`);
  }

  console.log("not found for header: ", headerType)
  return false;
}

const isTypeEquivalent = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  t1: typesObject,
  t2: typesObject,
  relevantTypes: Map<string, relevantTypeObject>,
  knownNormalForms: Map<string, string>
) => {
  console.log("\n\n==isTypeEquivalent==")
  // TODO: the headerType.typeName will include all the arg names too, for example (model: Model, user: User) => Booking[]
  if (knownNormalForms.has(t1.typeName) && knownNormalForms.has(t2.typeName)) {
    const normT1 = knownNormalForms.get(t1.typeName);
    const normT2 = knownNormalForms.get(t2.typeName);

    console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;

  } else if (knownNormalForms.has(t1.typeName)) {
    const normT1 = knownNormalForms.get(t1.typeName);
    const normT2 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t2, relevantTypes, knownNormalForms);
    knownNormalForms.set(t2.typeName, normT2);

    console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;

  } else if (knownNormalForms.has(t2.typeName)) {
    const normT1 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t1, relevantTypes, knownNormalForms);
    knownNormalForms.set(t1.typeName, normT1);
    const normT2 = knownNormalForms.get(t2.typeName);

    console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;

  } else {
    const normT1 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t1, relevantTypes, knownNormalForms);
    const normT2 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t2, relevantTypes, knownNormalForms);
    knownNormalForms.set(t1.typeName, normT1);
    knownNormalForms.set(t2.typeName, normT1);

    console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;
  }
  // TODO: speed this up by saving known normal forms
}

const normalize = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  typeSpan: typesObject,
  relevantTypes: Map<string, relevantTypeObject>,
  knownNormalForms: Map<string, string>
): string => {
  console.log("==normalize==")
  console.log("typespan: ", typeSpan)

  // if the type is in relevant types, use that instead
  // if (relevantTypes.has(typeSpan.typeName)) {
  // const obj: typesObject = { typeName: relevantTypes.get(typeSpan.typeName)!.typeDefinition, typeQLClass: relevantTypes.get(typeSpan.typeName)!.typeQLClass };
  // return normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes);
  // return typeSpan.typeName;
  // }

  // if not, run a query to find the type definition
  if (isQLPredefined(typeSpan.typeQLClass) || isQLLiteral(typeSpan.typeQLClass) || isQLKeyword(typeSpan.typeQLClass)) {
    knownNormalForms.set(typeSpan.typeName, typeSpan.typeName);
    return typeSpan.typeName;

  } else if (isQLFunction(typeSpan.typeQLClass)) {
    // TODO: the headerType.typeName will include all the arg names too, for example (model: Model, user: User) => Booking[]
    // the normal form will only include (Model, User) => Booking[]
    // query for argument types and return types
    // then concat them using "(" + normalize(argType) + ... + ") => " + normalize(returnType)
    // adding a normal form may suffer from this phenomenon, as two functions of same arg types and return type with different arg names will fail to check for existance

    const aq = createArgTypeQuery(typeSpan.typeName);
    fs.writeFileSync(pathToQuery, aq);
    const aqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize faq res: ", aqQueryRes)

    const rq = createReturnTypeQuery(typeSpan.typeName);
    fs.writeFileSync(pathToQuery, rq);
    const rqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize frq res: ", rqQueryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("(");
    aqQueryRes.forEach((obj, i) => {
      normalFormBuilder.push(normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms));
      if (i < aqQueryRes.length - 1) {
        normalFormBuilder.push(", ");
      }
    });
    normalFormBuilder.push(") => ");
    normalFormBuilder.push(normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, rqQueryRes[0], relevantTypes, knownNormalForms));

    const normalForm = normalFormBuilder.join("");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;


  } else if (isQLInterface(typeSpan.typeQLClass)) {
    const q = createInterfaceComponentsTypeQuery(typeSpan.typeName);
    console.log("normalize iq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize iq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("{");
    queryRes.forEach(obj => {
      const key = obj.typeName.split(": ")[0];
      const val = obj.typeName.split(": ")[1];
      normalFormBuilder.push("".concat(key, ": ", normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: val, typeQLClass: obj.typeQLClass }, relevantTypes, knownNormalForms), "; "));
    });
    normalFormBuilder.push("}");

    const normalForm = normalFormBuilder.join("");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLTuple(typeSpan.typeQLClass)) {
    const q = createTupleComponentsTypeQuery(typeSpan.typeName);
    console.log("normalize tq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize tq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("[");
    queryRes.forEach((obj, i) => {
      normalFormBuilder.push(normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push(", ");
      }
    });
    normalFormBuilder.push("]");

    const normalForm = normalFormBuilder.join("");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLUnion(typeSpan.typeQLClass)) {
    const q = createUnionComponentsTypeQuery(typeSpan.typeName);
    console.log("normalize uq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize uq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    queryRes.forEach((obj, i) => {
      normalFormBuilder.push("".concat("(", normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms), ")"));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push(" | ");
      }
    });

    const normalForm = normalFormBuilder.join("");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLArray(typeSpan.typeQLClass)) {
    const q = createArrayTypeQuery(typeSpan.typeName);
    console.log("normalize aq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize aq res: ", queryRes)

    const normalForm = "".concat(normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms), "[]");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLLocalTypeAccess(typeSpan.typeQLClass)) {
    const q = createLocalTypeAccessTypeQuery(typeSpan.typeName);
    console.log("normalize ltaq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    console.log("normalize ltaq res: ", queryRes)

    const normalForm = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else {
    console.log(`normalize: this doesn't exist: ${JSON.stringify(typeSpan)}`)
    console.error(`normalize: this doesn't exist: ${JSON.stringify(typeSpan)}`)
    throw Error(`normalize: this doesn't exist: ${JSON.stringify(typeSpan)}`)
  }
}

const createTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from TypeExpr t",
    `where t.toString() = "${escapeQuotes(typeToQuery)}"`,
    "select t.toString(), t.getAPrimaryQlClass().toString()"
  ].join("\n");
}

const createArgTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from FunctionTypeExpr t, TypeExpr e",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and e = t.getAParameter().getTypeAnnotation()`,
    "select e.toString(), e.getAPrimaryQlClass()"
  ].join("\n");
}

const createReturnTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from FunctionTypeExpr t, TypeExpr e",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and e = t.getReturnTypeAnnotation()`,
    "select e.toString(), e.getAPrimaryQlClass()"
  ].join("\n");
}

const createInterfaceComponentsTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from InterfaceTypeExpr t, FieldDeclaration e, int i",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and i = [0..t.getNumChild()] and e = t.getChild(i)`,
    // "select e.toString(), e.getName(), e.getTypeAnnotation(), e.getTypeAnnotation().getAPrimaryQlClass(), i",
    `select concat(string a, string b | a = e.getName() and b = e.getTypeAnnotation().toString() | a + ": " + b), e.getTypeAnnotation().getAPrimaryQlClass(), i`,
    "order by i"
  ].join("\n");
}

const createTupleComponentsTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from TupleTypeExpr t, TypeExpr e, int i",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and i = [0..t.getNumElementType()] and e = t.getElementType(i)`,
    "select e.toString(), e.getAPrimaryQlClass(), i",
    "order by i"
  ].join("\n");
}

const createUnionComponentsTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from UnionTypeExpr t, TypeExpr e, int i",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and i = [0..t.getNumElementType()] and e = t.getElementType(i)`,
    "select e.toString(), e.getAPrimaryQlClass(), i",
    "order by i"
  ].join("\n");
}

const createArrayTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from ArrayTypeExpr t, TypeExpr e",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and e = t.getElementType()`,
    "select e.toString(), e.getAPrimaryQlClass()"
  ].join("\n");
}

const createLocalTypeAccessTypeQuery = (typeToQuery: string): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from LocalTypeAccess t, TypeExpr e",
    `where t.toString() = "${escapeQuotes(typeToQuery)}" and e = t.getLocalTypeName().getADeclaration().getEnclosingStmt().(TypeAliasDeclaration).getDefinition()`,
    "select e.toString(), e.getAPrimaryQlClass()"
  ].join("\n");
}

export {
  createDatabaseWithCodeQL,
  extractRelevantTypesWithCodeQL,
  extractHeadersWithCodeQL,
  extractRelevantContextWithCodeQL
};
