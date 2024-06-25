import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { escapeQuotes, parseCodeQLRelevantTypes, parseCodeQLVars, parseCodeQLTypes, isQLFunction, isQLTuple, isQLUnion, isQLArray, isQLLocalTypeAccess, isQLPredefined, isQLLiteral, isQLKeyword, isQLInterface, isQLLabel, isQLIdentifier, parseCodeQLTypesAndLocations, parseCodeQLLocationsAndTypes } from "./utils";
import { relevantTypeObject, varsObject, typesObject, relevantTypeQueryResult, typeAndLocation } from "./types";
import { OutliningSpanKind, getDefaultFormatCodeSettings, isLiteralTypeNode, resolveModuleName } from "typescript";
import { QUERY_DIR } from "./constants";
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


const extractHoleType = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): typesObject => {
  const q = createHoleTypeQuery();
  fs.writeFileSync(pathToQuery, q);
  const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
  // console.log("extractHoleType q res: ", queryRes)
  return queryRes[0];
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
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON} --no-titles`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/relevant-types.bqrs: ${err}`);
  }

  const relevantTypesContent = fs.readFileSync(pathToDecodedJSON);
  const relevantTypes: Map<string, relevantTypeObject> = parseCodeQLRelevantTypes(JSON.parse(relevantTypesContent.toString()));

  // return relevantTypes;
  // return Array.from(relevantTypes, ([_, v]) => { return v.typeAliasDeclaration });
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
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON} --no-titles`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/vars.bqrs: ${err}`);
  }

  const varsContent = fs.readFileSync(pathToDecodedJSON);
  const vars = parseCodeQLVars(JSON.parse(varsContent.toString()));

  return vars;
}


const extractTypes = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string): typesObject[] => {
  // console.log("==extractTypes==")
  const pathToBqrs = path.join(outDir, "types.bqrs");
  const pathToDecodedJSON = path.join(outDir, "types.json");

  // run CodeQL query types.ql
  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON} --no-titles`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/types.bqrs: ${err}`);
  }

  const typesContent = fs.readFileSync(pathToDecodedJSON);
  const types = parseCodeQLTypes(JSON.parse(typesContent.toString()));
  // console.log("extractTypes result: ", types, "\n\n")

  return types;
}


const extractTypesAndLocations = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string
): { locationToType: Map<string, string[]>; typeToLocation: Map<string, string> } => {
  const pathToBqrs = path.join(outDir, "imports.bqrs");
  const pathToDecodedJSON = path.join(outDir, "imports.json");

  try {
    execSync(`${pathToCodeQL} query run ${pathToQuery} --database=${pathToDatabase} --output=${pathToBqrs}`);
  } catch (err) {
    console.error(`error while running query ${pathToQuery}: ${err}`);
  }

  try {
    execSync(`${pathToCodeQL} bqrs decode ${pathToBqrs} --format=json --output=${pathToDecodedJSON} --no-titles`);
  } catch (err) {
    console.error(`error while trying to decode ${outDir}/imports.bqrs: ${err}`);
  }

  const typesAndLocationsContent = fs.readFileSync(pathToDecodedJSON);
  const locationsAndTypes = parseCodeQLLocationsAndTypes(JSON.parse(typesAndLocationsContent.toString()));
  const typesAndLocations = parseCodeQLTypesAndLocations(JSON.parse(typesAndLocationsContent.toString()));
  console.log("extractTypesAndLocations result: ", typesAndLocations)

  return { locationToType: locationsAndTypes, typeToLocation: typesAndLocations };
}


const extractRelevantContextWithCodeQL = (pathToCodeQL: string, pathToQuery: string, pathToDatabase: string, outDir: string, headers: Map<string, varsObject>, relevantTypes: Map<string, relevantTypeObject>): Set<string> => {
  // console.log("==entry==")
  // console.log(Date.now())
  // console.log("extractRelevantContextWithCodeQL start: ", Date.now())
  const relevantContext = new Set<string>();
  const knownNormalForms = new Map<string, string>();

  // for each var in vars, check if its type is equivalent to any of relevantTypes
  headers.forEach((header) => {
    // console.log("\n\nheader: ", header, "\n\n")
    const typeOfHeader: typesObject = { typeName: header.typeAnnotation, typeQLClass: header.typeQLClass };
    const isEquivalent = extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, typeOfHeader, relevantTypes, knownNormalForms);
    if (isEquivalent) {
      relevantContext.add(header.constDeclaration);
    }
  })

  // console.log("knownNormalForms: ", knownNormalForms)
  // console.log("extractRelevantContextWithCodeQL end: ", Date.now())
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
  // console.log("\n\n==recurse==")
  // console.log("headerType: ", headerType)
  // NOTE:
  // extract types that are consistent to any of the target types
  // extract functions whose return types are equivalent to any of the target types
  // extract products whose component types are equivalent to any of the target types

  for (const [key, typ] of relevantTypes.entries()) {
    const typObj: typesObject = { typeName: typ.typeDefinition, typeQLClass: typ.typeQLClass };
    // console.log("typ: ", typ)

    if (isTypeEquivalent(pathToCodeQL, pathToQuery, pathToDatabase, outDir, headerType, typObj, relevantTypes, knownNormalForms)) {
      // console.log("isTypeEquivalent!")
      return true;
    }
  }

  // if (isQLPredefined(headerType.typeQLClass) || isQLLiteral(headerType.typeQLClass) || isQLKeyword(headerType.typeQLClass)) {
  //   return;
  //
  // }
  if (isQLFunction(headerType.typeQLClass)) {
    const q = createReturnTypeQuery(headerType.typeName);
    // console.log("extractor fq: ", q)

    fs.writeFileSync(pathToQuery, q);

    // could use extractVars
    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("extractor fq res: ", queryRes)
    return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);

  } else if (isQLInterface(headerType.typeQLClass)) {
    const q = createInterfaceComponentsTypeQuery(headerType.typeName);
    // console.log("extractor iq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("extractor iq res", queryRes)

    queryRes.forEach(obj => {
      const val = obj.typeName.split(":")[1];
      const typObj: typesObject = { typeName: val, typeQLClass: obj.typeQLClass };
      return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, typObj, relevantTypes, knownNormalForms);
    });

  } else if (isQLTuple(headerType.typeQLClass)) {
    const q = createTupleComponentsTypeQuery(headerType.typeName);
    // console.log("extractor tq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("extractor tq res", queryRes)

    let res = true;
    queryRes.forEach(obj => {
      res &&= extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms);
    });
    return res;

  } else if (isQLUnion(headerType.typeQLClass)) {
    const q = createUnionComponentsTypeQuery(headerType.typeName);
    // console.log("extractor uq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("extractor uq res", queryRes)

    let res = true;
    queryRes.forEach(obj => {
      res &&= extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms);
    });
    return res;

  } else if (isQLArray(headerType.typeQLClass)) {
    const q = createArrayTypeQuery(headerType.typeName);
    // console.log("extractor aq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("extractor aq res", queryRes)

    return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);
    // if (isTypeEquivalent(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], typObj, relevantTypes)) {
    //   extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, relevantContext);
    // }

  } else if (isQLLocalTypeAccess(headerType.typeQLClass)) {
    const q = createLocalTypeAccessTypeQuery(headerType.typeName);
    // console.log("extractor ltaq", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("extractor ltaq res", queryRes)

    return extractRelevantContextHelper(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);
  } else {
    // console.log(`extractRelevantContextHelper: this doesn't exist: ${JSON.stringify(headerType)}`);
    // console.error(`extractRelevantContextHelper: this doesn't exist: ${JSON.stringify(headerType)}`);
    // throw Error(`extractRelevantContextHelper: this doesn't exist: ${JSON.stringify(headerType)}`);
  }

  // console.log("not found for header: ", headerType)
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
  // console.log("\n\n==isTypeEquivalent==")
  // TODO: the headerType.typeName will include all the arg names too, for example (model: Model, user: User) => Booking[]
  if (knownNormalForms.has(t1.typeName) && knownNormalForms.has(t2.typeName)) {
    const normT1 = knownNormalForms.get(t1.typeName);
    const normT2 = knownNormalForms.get(t2.typeName);

    // console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;

  } else if (knownNormalForms.has(t1.typeName)) {
    const normT1 = knownNormalForms.get(t1.typeName);
    const normT2 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t2, relevantTypes, knownNormalForms);
    knownNormalForms.set(t2.typeName, normT2);

    // console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;

  } else if (knownNormalForms.has(t2.typeName)) {
    const normT1 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t1, relevantTypes, knownNormalForms);
    knownNormalForms.set(t1.typeName, normT1);
    const normT2 = knownNormalForms.get(t2.typeName);

    // console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
    return normT1 === normT2;

  } else {
    const normT1 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t1, relevantTypes, knownNormalForms);
    const normT2 = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, t2, relevantTypes, knownNormalForms);
    knownNormalForms.set(t1.typeName, normT1);
    knownNormalForms.set(t2.typeName, normT1);

    // console.log("\n\nnormal forms:\n", t1, " -> ", normT1, ", ", t2, " -> ", normT2, "\n\n")
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
  // console.log("==normalize==")
  // console.log("typespan: ", typeSpan)

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
    // make a check if it's a function

    const aq = createArgTypeQuery(typeSpan.typeName);
    fs.writeFileSync(pathToQuery, aq);
    const aqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize faq res: ", aqQueryRes)

    const rq = createReturnTypeQuery(typeSpan.typeName);
    fs.writeFileSync(pathToQuery, rq);
    const rqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize frq res: ", rqQueryRes)

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
    // console.log("normalize iq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize iq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("{");
    queryRes.forEach((obj, i) => {
      const key = obj.typeName.split(": ")[0];
      const val = obj.typeName.split(": ")[1];
      normalFormBuilder.push("".concat(key, ": ", normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: val, typeQLClass: obj.typeQLClass }, relevantTypes, knownNormalForms)));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push("; ");
      } else {
        normalFormBuilder.push(" ");
      }
    });
    normalFormBuilder.push("}");

    const normalForm = normalFormBuilder.join("");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLTuple(typeSpan.typeQLClass)) {
    const q = createTupleComponentsTypeQuery(typeSpan.typeName);
    // console.log("normalize tq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize tq res: ", queryRes)

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
    // console.log("normalize uq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize uq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    queryRes.forEach((obj, i) => {
      normalFormBuilder.push("".concat(normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, relevantTypes, knownNormalForms)));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push(" | ");
      }
    });

    const normalForm = normalFormBuilder.join("");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLArray(typeSpan.typeQLClass)) {
    const q = createArrayTypeQuery(typeSpan.typeName);
    // console.log("normalize aq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize aq res: ", queryRes)

    const normalForm = "".concat(normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms), "[]");
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLLocalTypeAccess(typeSpan.typeQLClass)) {
    const q = createLocalTypeAccessTypeQuery(typeSpan.typeName);
    // console.log("normalize ltaq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize ltaq res: ", queryRes)

    const normalForm = normalize(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], relevantTypes, knownNormalForms);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else {
    // console.log(`normalize: this doesn't exist: ${JSON.stringify(typeSpan)}`)
    console.error(`normalize: this doesn't exist: ${JSON.stringify(typeSpan)}`)
    throw Error(`normalize: this doesn't exist: ${JSON.stringify(typeSpan)}`)
  }
}

// TODO:
// make a target type generator.
// the below method works, but it could be very inefficient.
// get the hole function type
// get the argument type
// get the return type
// keep the skeleton (...) => ...
// use codeql to recurse into each argument type and return type
// most normal form: (normalize(arg1), normalize(arg2), ...) => normalize(ret)
// save normalize(arg1), normalize(arg2), ..., normalize(ret), and every recursive layer
// each could be saved in an array, where the array holds all forms arg1 could take.
// type of the hole itself: (norm(a1), ...) => norm(ret)
// type of the return: norm(ret)
// type of the product: (norm(a1), ...)
// type of the components: norm(a1), norm(a2), ...

// TODO:
// given a list of recursively looked up target types, for each header,
// is the header type in the list?
// if header is a function, is the return type in the list?
//   else, is norm(ret) in the list?
// if header is a product, are any of the components in the list?
//   else, are any of the norm(components) in the list?

// TODO:
// could there be a way to keep track of the layers of recursion?

const getRelevantHeaders = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  headers: Map<string, varsObject>,
  holeType: typesObject
) => {
  // console.log("getRelevantHeaders start: ", Date.now())
  const obj = generateTargetTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir, holeType);
  const targetTypes = obj.targetTypes;
  const knownNormalForms = obj.knownNormalForms;
  const relevantHeaders = new Set<string>();

  headers.forEach(header => {
    // console.log("header: ", header)
    if (targetTypes.has(header.typeAnnotation)) {
      relevantHeaders.add(header.constDeclaration);
    } else if (isQLFunction(header.typeQLClass)) {
      const q = createReturnTypeQuery(header.typeAnnotation);
      fs.writeFileSync(pathToQuery, q);
      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("header fq res: ", queryRes)

      // NOTE: would be nice if we could "step" recursion into normalize2
      // maybe make normalize2 a higher order function that returns a function that we can call
      if (targetTypes.has(queryRes[0].typeName)) {
        relevantHeaders.add(header.constDeclaration);
      } else if (targetTypes.has(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], targetTypes, knownNormalForms))) {
        relevantHeaders.add(header.constDeclaration);
      }
    } else if (isQLTuple(header.typeQLClass)) {
      const q = createTupleComponentsTypeQuery(header.typeAnnotation);
      // console.log("header tq", q)
      fs.writeFileSync(pathToQuery, q);
      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("header tq res", queryRes)

      queryRes.forEach(obj => {
        if (targetTypes.has(obj.typeName)) {
          relevantHeaders.add(header.constDeclaration);
        } else if (targetTypes.has(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, targetTypes, knownNormalForms))) {
          relevantHeaders.add(header.constDeclaration);
        }
      });
    }
  });

  // console.log("getRelevantHeaders end: ", Date.now())
  return relevantHeaders;
}


const generateTargetTypes = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  holeType: typesObject
): { targetTypes: Set<string>, knownNormalForms: Map<string, string> } => {
  const targetTypes = new Set<string>();
  const knownNormalForms = new Map<string, string>();
  // console.log("generateTargetTypes start: ", Date.now())
  normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, holeType, targetTypes, knownNormalForms);
  // console.log("generateTargetTypes end: ", Date.now())
  // console.log("targetTypes: ", targetTypes)
  // console.log("knownNormalForms: ", knownNormalForms)
  return { targetTypes: targetTypes, knownNormalForms: knownNormalForms };
}


const normalize2 = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  typeSpan: typesObject,
  targetTypes: Set<string>,
  knownNormalForms: Map<string, string>
): string => {
  // console.log("==normalize2==")
  // console.log("typespan: ", typeSpan)

  if (knownNormalForms.has(typeSpan.typeName)) {
    return knownNormalForms.get(typeSpan.typeName)!;
  }

  targetTypes.add(typeSpan.typeName);

  if (isQLPredefined(typeSpan.typeQLClass) || isQLLiteral(typeSpan.typeQLClass) || isQLKeyword(typeSpan.typeQLClass)) {
    targetTypes.add(typeSpan.typeName);
    return typeSpan.typeName;

  } else if (isQLFunction(typeSpan.typeQLClass)) {
    const aq = createArgTypeQuery(typeSpan.typeName);
    fs.writeFileSync(pathToQuery, aq);
    const aqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize faq res: ", aqQueryRes)

    const rq = createReturnTypeQuery(typeSpan.typeName);
    fs.writeFileSync(pathToQuery, rq);
    const rqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize frq res: ", rqQueryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("(");
    aqQueryRes.forEach((obj, i) => {
      normalFormBuilder.push(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, targetTypes, knownNormalForms));
      if (i < aqQueryRes.length - 1) {
        normalFormBuilder.push(", ");
      }
    });
    normalFormBuilder.push(") => ");
    normalFormBuilder.push(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, rqQueryRes[0], targetTypes, knownNormalForms));

    const normalForm = normalFormBuilder.join("");
    targetTypes.add(normalForm);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLInterface(typeSpan.typeQLClass)) {
    const q = createInterfaceComponentsTypeQuery(typeSpan.typeName);
    // console.log("normalize iq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize iq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("{");
    queryRes.forEach((obj, i) => {
      const key = obj.typeName.split(": ")[0];
      const val = obj.typeName.split(": ")[1];
      normalFormBuilder.push("".concat(" ", key, ": ", normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: val, typeQLClass: obj.typeQLClass }, targetTypes, knownNormalForms)));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push("; ");
      } else {
        normalFormBuilder.push(" ");
      }
    });
    normalFormBuilder.push("}");

    const normalForm = normalFormBuilder.join("");
    targetTypes.add(normalForm);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLTuple(typeSpan.typeQLClass)) {
    const q = createTupleComponentsTypeQuery(typeSpan.typeName);
    // console.log("normalize tq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize tq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    normalFormBuilder.push("[");
    queryRes.forEach((obj, i) => {
      normalFormBuilder.push(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, targetTypes, knownNormalForms));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push(", ");
      }
    });
    normalFormBuilder.push("]");

    const normalForm = normalFormBuilder.join("");
    targetTypes.add(normalForm);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLUnion(typeSpan.typeQLClass)) {
    const q = createUnionComponentsTypeQuery(typeSpan.typeName);
    // console.log("normalize uq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize uq res: ", queryRes)

    const normalFormBuilder: string[] = [];
    queryRes.forEach((obj, i) => {
      normalFormBuilder.push(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, targetTypes, knownNormalForms));
      if (i < queryRes.length - 1) {
        normalFormBuilder.push(" | ");
      }
    });

    const normalForm = normalFormBuilder.join("");
    targetTypes.add(normalForm);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLArray(typeSpan.typeQLClass)) {
    const q = createArrayTypeQuery(typeSpan.typeName);
    // console.log("normalize aq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize aq res: ", queryRes)

    const normalForm = "".concat(normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], targetTypes, knownNormalForms), "[]");
    targetTypes.add(normalForm);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else if (isQLLocalTypeAccess(typeSpan.typeQLClass)) {
    const q = createLocalTypeAccessTypeQuery(typeSpan.typeName);
    // console.log("normalize ltaq: ", q)

    fs.writeFileSync(pathToQuery, q);

    const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
    // console.log("normalize ltaq res: ", queryRes)

    const normalForm = normalize2(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], targetTypes, knownNormalForms);
    targetTypes.add(normalForm);
    knownNormalForms.set(typeSpan.typeName, normalForm);
    return normalForm;

  } else {
    // console.log(`normalize2: this doesn't exist: ${JSON.stringify(typeSpan)}`)
    console.error(`normalize2: this doesn't exist: ${JSON.stringify(typeSpan)}`)
    throw Error(`normalize2: this doesn't exist: ${JSON.stringify(typeSpan)}`)
  }
}


const getRelevantHeaders3 = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  headers: Map<string, varsObject>,
  holeType: typesObject,
  relevantTypes: Map<string, relevantTypeObject>
) => {
  // console.log("getRelevantHeaders3 start: ", Date.now())
  const obj = generateTargetTypes3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, holeType, relevantTypes);
  const targetTypes = obj.targetTypes;
  const knownNormalForms = obj.knownNormalForms;
  const relevantHeaders = new Set<string>();

  headers.forEach(header => {
    if (targetTypes.has(header.typeAnnotation)) {
      relevantHeaders.add(header.constDeclaration);
    } else if (isQLFunction(header.typeQLClass)) {
      // const q = createReturnTypeQuery(header.typeAnnotation);
      // fs.writeFileSync(pathToQuery, q);
      // const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("header fq res: ", queryRes)

      const returnType = header.components[0]

      if (targetTypes.has(returnType.typeName)) {
        relevantHeaders.add(header.constDeclaration);
      } else if (targetTypes.has(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: returnType.typeName, typeQLClass: returnType.typeQLClass }, relevantTypes, targetTypes, knownNormalForms))) {
        relevantHeaders.add(header.constDeclaration);
      }
    } else if (isQLTuple(header.typeQLClass)) {
      // const q = createTupleComponentsTypeQuery(header.typeAnnotation);
      // console.log("header tq", q)
      // fs.writeFileSync(pathToQuery, q);
      // const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("header tq res", queryRes)

      const components = header.components;

      components.forEach(obj => {
        if (targetTypes.has(obj.typeName)) {
          relevantHeaders.add(header.constDeclaration);
        } else if (targetTypes.has(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: obj.typeName, typeQLClass: obj.typeQLClass }, relevantTypes, targetTypes, knownNormalForms))) {
          relevantHeaders.add(header.constDeclaration);
        }
      });
    }
  });

  // console.log("getRelevantHeaders3 end: ", Date.now())
  return relevantHeaders;
}


const generateTargetTypes3 = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  holeType: typesObject,
  relevantTypes: Map<string, relevantTypeObject>
): { targetTypes: Set<string>, knownNormalForms: Map<string, string> } => {
  const targetTypes = new Set<string>();
  const knownNormalForms = new Map<string, string>();
  // console.log("generateTargetTypes3 start: ", Date.now())
  normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, holeType, relevantTypes, targetTypes, knownNormalForms);
  // console.log("generateTargetTypes3 end: ", Date.now())
  // console.log("targetTypes: ", targetTypes)
  // console.log("knownNormalForms: ", knownNormalForms)
  return { targetTypes: targetTypes, knownNormalForms: knownNormalForms };
}

const normalize3 = (
  pathToCodeQL: string,
  pathToQuery: string,
  pathToDatabase: string,
  outDir: string,
  typ: typesObject,
  knownTypes: Map<string, relevantTypeObject>,
  targetTypes: Set<string>,
  knownNormalForms: Map<string, string>
): string => {
  // console.log("current: ", typ)
  // check if exists in known types
  // if so, access and check its class
  // depending on the class, build a normal form using recursion
  if (isQLPredefined(typ.typeQLClass) || isQLLiteral(typ.typeQLClass) || isQLKeyword(typ.typeQLClass)) {
    targetTypes.add(typ.typeName);
    return typ.typeName;

  } else if (isQLFunction(typ.typeQLClass)) {
    // NOTE: optimize for different arg name but same type
    if (knownTypes.has(typ.typeName)) {
      const definition = knownTypes.get(typ.typeName)!;
      const components = definition.components;
      const returnType = components[0];
      const argumentTypes = components.slice(1, components.length);

      const normalFormBuilder: string[] = [];
      normalFormBuilder.push("(");
      argumentTypes.forEach((argTyp, i) => {
        normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: argTyp.name, typeQLClass: argTyp.qlClass }, knownTypes, targetTypes, knownNormalForms));
        if (i < argumentTypes.length - 1) {
          normalFormBuilder.push(", ");
        }
      });
      normalFormBuilder.push(") => ");
      normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: returnType.name, typeQLClass: returnType.qlClass }, knownTypes, targetTypes, knownNormalForms));

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    } else {
      const aq = createArgTypeQuery(typ.typeName);
      fs.writeFileSync(pathToQuery, aq);
      const aqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 faq res: ", aqQueryRes)

      const rq = createReturnTypeQuery(typ.typeName);
      fs.writeFileSync(pathToQuery, rq);
      const rqQueryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 frq res: ", rqQueryRes)

      const normalFormBuilder: string[] = [];
      normalFormBuilder.push("(");
      aqQueryRes.forEach((obj, i) => {
        normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, knownTypes, targetTypes, knownNormalForms));
        if (i < aqQueryRes.length - 1) {
          normalFormBuilder.push(", ");
        }
      });
      normalFormBuilder.push(") => ");
      normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, rqQueryRes[0], knownTypes, targetTypes, knownNormalForms));

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    }
  } else if (isQLInterface(typ.typeQLClass)) {
    if (knownTypes.has(typ.typeName)) {
      const definition = knownTypes.get(typ.typeName)!;
      const components = definition.components;

      const normalFormBuilder: string[] = [];
      normalFormBuilder.push("{");
      components.forEach((obj, i) => {
        if (isQLLabel(obj.qlClass)) {
          normalFormBuilder.push("".concat(" ", obj.name, ": "));
        } else {
          normalFormBuilder.push("".concat(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: obj.name, typeQLClass: obj.qlClass }, knownTypes, targetTypes, knownNormalForms)));

          if (i < components.length - 1) {
            normalFormBuilder.push("; ");
          } else {
            normalFormBuilder.push(" ");
          }
        }
      });
      normalFormBuilder.push("}");

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    } else {
      const q = createInterfaceComponentsTypeQuery(typ.typeName);
      // console.log("normalize3 iq: ", q)

      fs.writeFileSync(pathToQuery, q);

      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 iq res: ", queryRes)

      const normalFormBuilder: string[] = [];
      normalFormBuilder.push("{");
      queryRes.forEach((obj, i) => {
        const key = obj.typeName.split(": ")[0];
        const val = obj.typeName.split(": ")[1];
        normalFormBuilder.push("".concat(" ", key, ": ", normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: val, typeQLClass: obj.typeQLClass }, knownTypes, targetTypes, knownNormalForms)));
        if (i < queryRes.length - 1) {
          normalFormBuilder.push("; ");
        } else {
          normalFormBuilder.push(" ");
        }
      });
      normalFormBuilder.push("}");

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    }
  } else if (isQLTuple(typ.typeQLClass)) {
    // NOTE: some tuples have identifiers
    if (knownTypes.has(typ.typeName)) {
      const definition = knownTypes.get(typ.typeName)!;
      const components = definition.components;

      const normalFormBuilder: string[] = [];
      normalFormBuilder.push("[");
      components.forEach((obj, i) => {
        if (!isQLIdentifier(obj.qlClass)) {
          normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: obj.name, typeQLClass: obj.qlClass }, knownTypes, targetTypes, knownNormalForms));
          if (i < components.length - 1) {
            normalFormBuilder.push(", ");
          }
        }
      });
      normalFormBuilder.push("]");

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    } else {
      const q = createTupleComponentsTypeQuery(typ.typeName);
      // console.log("normalize3 tq: ", q)

      fs.writeFileSync(pathToQuery, q);

      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 tq res: ", queryRes)

      const normalFormBuilder: string[] = [];
      normalFormBuilder.push("[");
      queryRes.forEach((obj, i) => {
        if (!isQLIdentifier(obj.typeQLClass)) {
          normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, knownTypes, targetTypes, knownNormalForms));
          if (i < queryRes.length - 1) {
            normalFormBuilder.push(", ");
          }
        }
      });
      normalFormBuilder.push("]");

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    }
  } else if (isQLUnion(typ.typeQLClass)) {
    if (knownTypes.has(typ.typeName)) {
      const definition = knownTypes.get(typ.typeName)!;
      const components = definition.components;

      const normalFormBuilder: string[] = [];
      components.forEach((obj, i) => {
        normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: obj.name, typeQLClass: obj.qlClass }, knownTypes, targetTypes, knownNormalForms));
        if (i < components.length - 1) {
          normalFormBuilder.push(" | ");
        }
      });

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    } else {
      const q = createUnionComponentsTypeQuery(typ.typeName);
      // console.log("normalize3 uq: ", q)

      fs.writeFileSync(pathToQuery, q);

      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 uq res: ", queryRes)

      const normalFormBuilder: string[] = [];
      queryRes.forEach((obj, i) => {
        normalFormBuilder.push(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, obj, knownTypes, targetTypes, knownNormalForms));
        if (i < queryRes.length - 1) {
          normalFormBuilder.push(" | ");
        }
      });

      const normalForm = normalFormBuilder.join("");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    }
  } else if (isQLArray(typ.typeQLClass)) {
    if (knownTypes.has(typ.typeName)) {
      const definition = knownTypes.get(typ.typeName)!;
      const components = definition.components;
      const elementType = components[0];

      const normalForm = "".concat(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: elementType.name, typeQLClass: elementType.qlClass }, knownTypes, targetTypes, knownNormalForms), "[]");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    } else if (knownTypes.has(typ.typeName.replace("[]", ""))) {
      const definition = knownTypes.get(typ.typeName.replace("[]", ""))!;
      const normalForm = "".concat(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: definition.typeName, typeQLClass: definition.typeQLClass }, knownTypes, targetTypes, knownNormalForms), "[]");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;

    } else {
      const q = createArrayTypeQuery(typ.typeName);
      // console.log("normalize3 aq: ", q)

      fs.writeFileSync(pathToQuery, q);

      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 aq res: ", queryRes)

      const normalForm = "".concat(normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], knownTypes, targetTypes, knownNormalForms), "[]");
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    }
  } else if (isQLLocalTypeAccess(typ.typeQLClass)) {
    if (knownTypes.has(typ.typeName)) {
      const definition = knownTypes.get(typ.typeName)!;

      const normalForm = normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, { typeName: definition.typeName, typeQLClass: definition.typeQLClass }, knownTypes, targetTypes, knownNormalForms);
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    } else {
      const q = createLocalTypeAccessTypeQuery(typ.typeName);
      // console.log("normalize3 ltaq: ", q)

      fs.writeFileSync(pathToQuery, q);

      const queryRes = extractTypes(pathToCodeQL, pathToQuery, pathToDatabase, outDir);
      // console.log("normalize3 ltaq res: ", queryRes)

      const normalForm = normalize3(pathToCodeQL, pathToQuery, pathToDatabase, outDir, queryRes[0], knownTypes, targetTypes, knownNormalForms);
      targetTypes.add(normalForm);
      knownNormalForms.set(typ.typeName, normalForm);
      return normalForm;
    }
  } else {
    console.log(`normalize3: this doesn't exist: ${JSON.stringify(typ)}`)
    console.error(`normalize3: this doesn't exist: ${JSON.stringify(typ)}`)
    throw Error(`normalize3: this doesn't exist: ${JSON.stringify(typ)}`)
  }
}


const getRelevantHeaders4 = (
  pathToCodeQL: string,
  pathToQueryDir: string,
  pathToDatabase: string,
  outDir: string,
  headers: Map<string, varsObject>,
  relevantTypes: Map<string, relevantTypeObject>,
  knownTypeLocations: { locationToType: Map<string, string[]>, typeToLocation: Map<string, string> }
) => {
  // TODO:
  // take a type and the header it belongs to.
  // check if that type is directly in relevant types. If so, the header with that type is relevant.
  // if not, then try running a consistency check with all the relevant types.
  // if there's a consistent type, then the header with that type is relevant.
  // if not, then we need to split that type.
  // if it's an arrow type, recurse on the return type.
  // if it's a tuple type, recurse on the components.
  const relevantHeaders = new Set<string>();
  console.log("headers: ", headers)

  headers.forEach(header => {
    if (isRelevantHeader(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, header, relevantTypes, knownTypeLocations)) {
      // TODO: need to strip identifiers from functions, interfaces, tuples, ...
      relevantHeaders.add(header.constDeclaration);
    }
  });
  return relevantHeaders;
}


const isRelevantHeader = (
  pathToCodeQL: string,
  pathToQueryDir: string,
  pathToDatabase: string,
  outDir: string,
  header: varsObject,
  relevantTypes: Map<string, relevantTypeObject>,
  knownTypeLocations: { locationToType: Map<string, string[]>, typeToLocation: Map<string, string> }
): boolean => {
  // console.log("===isRelevantHeader===")

  const currType: typesObject = { typeName: header.typeAnnotation, typeQLClass: header.typeQLClass };
  console.log("currType: ", currType)
  if (isRelevantHeaderHelper(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, currType, relevantTypes, knownTypeLocations)) {
    return true;
  } else {
    if (isQLFunction(header.typeQLClass)) {
      console.log("isQLFunction")
      // if function, recurse on return type
      const returnType: typesObject = header.components[0];
      return isRelevantHeaderHelper(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, returnType, relevantTypes, knownTypeLocations);

    } else if (isQLTuple(header.typeQLClass)) {
      console.log("isQLTuple")
      // if tuple, recurse on component types
      const components = header.components;
      for (const comp of components) {
        if (isRelevantHeaderHelper(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, comp, relevantTypes, knownTypeLocations)) return true;
      }
    }
    return false;
  };
}

const isRelevantHeaderHelper = (
  pathToCodeQL: string,
  pathToQueryDir: string,
  pathToDatabase: string,
  outDir: string,
  typ: typesObject,
  relevantTypes: Map<string, relevantTypeObject>,
  knownTypeLocations: { locationToType: Map<string, string[]>, typeToLocation: Map<string, string> }
): boolean => {
  console.log("===helper===")
  console.log(`typ: ${JSON.stringify(typ)}`)
  if (relevantTypes.has(typ.typeName)) {
    return true;
  }

  // this can be a big file that compiles once.
  const scrutineeType = typ.typeName;
  const comparisonTypes = Array.from(relevantTypes.values(), val => { return val.typeName });
  if (isConsistent(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, scrutineeType, comparisonTypes, knownTypeLocations)) {
    return true;
  } else if (isQLFunction(typ.typeQLClass)) {
    const q = createReturnTypeQuery(typ.typeName);
    const qPath = path.join(pathToQueryDir, "types.ql");
    fs.writeFileSync(qPath, q);
    const queryRes: typesObject[] = extractTypes(pathToCodeQL, qPath, pathToDatabase, outDir);
    return isRelevantHeaderHelper(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, queryRes[0], relevantTypes, knownTypeLocations);

  } else if (isQLTuple(typ.typeQLClass)) {
    const q = createTupleComponentsTypeQuery(typ.typeName);
    const qPath = path.join(pathToQueryDir, "types.ql");
    fs.writeFileSync(qPath, q);
    const queryRes: typesObject[] = extractTypes(pathToCodeQL, qPath, pathToDatabase, outDir);
    for (const comp of queryRes) {
      if (isRelevantHeaderHelper(pathToCodeQL, pathToQueryDir, pathToDatabase, outDir, comp, relevantTypes, knownTypeLocations)) return true;
    }
  }
  return false;
}


// checks if two types are consistent
// take in two types and write a consistency checker function to a file
// run the typescript compiler on it to invoke static errors
// if there are no errors, then the two types are consistent
const isConsistent = (
  pathToCodeQL: string,
  pathtoQueryDir: string,
  pathToDatabase: string,
  outDir: string,
  scrutineeType: string,
  comparisonTypes: string[],
  knownTypeLocations: { locationToType: Map<string, string[]>, typeToLocation: Map<string, string> }
): boolean => {
  console.log("===isConsistent===")

  // TODO: this is still too slow. let's just import everything and compile everything
  // TODO: abstract this
  const builder: string[] = [];
  for (const [file, dependencies] of knownTypeLocations.locationToType.entries()) {
    builder.push(`import {${dependencies.join(", ")}} from "${file}"`);
  }
  for (const comp of comparisonTypes) {
    builder.push(`function check(a: ${scrutineeType}): ${comp} { return a; }`);
  }
  const checkFunction = builder.join("\n");
  const checkPath = path.join(outDir, "checkConsistency.ts");
  fs.writeFileSync(checkPath, checkFunction);

  const numChecks = comparisonTypes.length;
  try {
    execSync(`tsc ${checkPath}`);
  } catch (err: any) {
    const numErrors = err.stdout.toString().split("\n").length;
    return numErrors < numChecks;
  }
  return false;





  /*
  // extract necessary dependencies by invoking static dependency error
  const dependencyErrorInvoker = createDependencyErrorInvoker([scrutineeType, ...comparisonTypes]);
  const invokerPath = path.join(outDir, "invokeDependencyError.ts");
  fs.writeFileSync(invokerPath, dependencyErrorInvoker);

  const dependencies: string[] = [];

  try {
    execSync(`tsc ${invokerPath}`);
  } catch (err: any) {
    dependencies.push(...extractDependencies(err.stdout.toString()));
  }

  // TODO: this is slow. we should just use a global map to find the locations.
  // use CodeQL to find their locations
  // we could do this for each comparisonType, but lots of individual queries are expensive.
  // const filesAndDependencies = resolveDependencies(pathToCodeQL, pathtoQueryDir, pathToDatabase, outDir, dependencies);

  // loop over dependencies. for each dep, check in knownTypes.typeToLocation to see the location.
  // const filesAndDependencies = dependencies.reduce((m, dep) => {
  //   const location = knownTypeLocations.typeToLocation.get(dep);
  //   if (location) {
  //     if (!m.has(location)) {
  //       m.set(location, [dep]);
  //     } else {
  //       const pair = m.get(location)!;
  //       pair.push(dep);
  //       m.set(location, pair);
  //     }
  //   }
  //   return m;
  // }, new Map<string, string[]>);
  const filesAndDependencies = resolveDependencies(pathToCodeQL, pathtoQueryDir, pathToDatabase, outDir, dependencies, knownTypeLocations);
  console.log("filesAndDependencies: ", filesAndDependencies)

  // inject those dependencies into the checker
  for (const comparisonType of comparisonTypes) {
    const checkFunction = createConsistencyCheckFunction(scrutineeType, comparisonType, filesAndDependencies);
    const checkPath = path.join(outDir, "checkConsistency.ts");
    fs.writeFileSync(checkPath, checkFunction);

    try {
      execSync(`tsc ${checkPath}`);
      return true;
    } catch (err: any) {
      console.log(`types are not consistent: ${err}`);
    }
  }
  return false;
  */
}


// tsc will print an error "Cannot find name <name>" if it encounters a dependency error.
// extract the dependency from that message.
const extractDependencies = (errorMsg: string): string[] => {
  // TODO: this should be done once at the beginning to establish a global import map
  const dependencies: string[] = [];
  const lines: string[] = errorMsg.split("\n");
  lines.forEach(line => {
    const matches = line.match(/(.*Cannot find name \')(.*)(\'.)/)
    if (matches) {
      dependencies.push(matches[2]);
    }
  });
  return dependencies;
}


// run a query to get the dependencies and their file locations.
const resolveDependencies = (
  pathToCodeQL: string,
  pathToQueryDir: string,
  pathToDatabase: string,
  outDir: string,
  dependencies: string[],
  knownTypeLocations: { locationToType: Map<string, string[]>, typeToLocation: Map<string, string> }
): Map<string, string[]> => {
  return dependencies.reduce((m, dep) => {
    const location = knownTypeLocations.typeToLocation.get(dep);
    if (location) {
      if (!m.has(location)) {
        m.set(location, [dep]);
      } else {
        const pair = m.get(location)!;
        pair.push(dep);
        m.set(location, pair);
      }
    }
    return m;
  }, new Map<string, string[]>);


  // const q = createImportQuery(dependencies);
  // fs.writeFileSync(path.join(pathToQueryDir, "imports.ql"), q);
  //
  // return extractTypesAndLocations(pathToCodeQL, path.join(pathToQueryDir, "imports.ql"), pathToDatabase, outDir);
}


const createDependencyErrorInvoker = (possibleDependencies: string[]) => {
  const builder: string[] = [];
  for (const pdep of possibleDependencies) {
    builder.push(`let x: ${pdep};`);
  }
  return builder.join("\n");
}


const createConsistencyCheckFunction = (scrutineeType: string, comparisonType: string, filesAndDependencies: Map<string, string[]>): string => {
  const builder: string[] = [];
  for (const [file, dependencies] of filesAndDependencies.entries()) {
    builder.push(`import {${dependencies.join(", ")}} from "${file}"`);
  }
  builder.push(`function check(a: ${scrutineeType}): ${comparisonType} { return a; }`);
  return builder.join("\n");
}


const createImportQuery = (dependencies: string[]): string => {
  const dependencyDisjunction = dependencies.reduce((acc, curr, i) => {
    if (i < dependencies.length - 1) {
      return acc + `t.getIdentifier().toString() = "${curr}" or `;
    }
    return acc + `t.getIdentifier().toString() = "${curr}"`;
  }, "")

  return [
    "/**",
    " * @id imports",
    " * @name Imports",
    " * @description Resolve dependencies during consistency check.",
    " */",
    "",
    "import javascript",
    "",
    "from File f, TypeAliasDeclaration t",
    `where(${dependencyDisjunction}) and t.getFile() = f`,
    "select t.getIdentifier().toString(), f.toString()"
  ].join("\n");
}


const createHoleTypeQuery = (): string => {
  return [
    "/**",
    " * @id types",
    " * @name Types",
    " * @description Find the specified type.",
    " */",
    "",
    "import javascript",
    "",
    "from VariableDeclarator d",
    `where d.getAChild().toString() = "_()"`,
    "select d.getTypeAnnotation().toString(), d.getTypeAnnotation().getAPrimaryQlClass()"
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
    "from LocalTypeAccess t, TypeExpr e, TypeAliasDeclaration td",
    `where(t.toString() = "${escapeQuotes(typeToQuery)}" and e = t.getLocalTypeName().getADeclaration().getEnclosingStmt().(TypeAliasDeclaration).getDefinition()) or`,
    `(t.toString() = "${escapeQuotes(typeToQuery)}" and td.getName() = "${escapeQuotes(typeToQuery)}" and td.getFile().toString() = t.getLocalTypeName().getADeclaration().getEnclosingStmt().(Import).resolveImportedPath().getPath() and e = td.getDefinition())`,
    "select e.toString(), e.getAPrimaryQlClass()"
  ].join("\n");
}


export {
  createDatabaseWithCodeQL,
  extractHoleType,
  extractRelevantTypesWithCodeQL,
  extractHeadersWithCodeQL,
  extractRelevantContextWithCodeQL,
  extractTypesAndLocations,
  getRelevantHeaders,
  getRelevantHeaders3,
  getRelevantHeaders4
};
