interface relevantTypeObject {
  typeAliasDeclaration: string;
  typeName: string;
  typeDefinition: string;
  typeQLClass: string;
  locatedFile: string;
  components: { name: string, qlClass: string }[];
}

interface varsObject {
  constDeclaration: string;
  bindingPattern: string;
  typeAnnotation: string;
  init: string;
  typeQLClass: string;
  functionReturnType: string;
  functionReturnTypeQLClass: string;
  locatedFile: string;
  components: { name: string, qlClass: string }[];
}

interface typesObject {
  typeName: string;
  typeQLClass: string;
}

interface typeNameAndLocation {
  typeName: string;
  locatedFile: string;
}

interface relevantTypeQueryResult {
  "#select": {
    tuples: [{ label: string }, string, { label: string }, string, { label: string }, string, { label: string }][]
  }
}

interface varsQueryResult {
  "#select": {
    tuples: [{ label: string }, { label: string }, { label: string }, { label: string }, string, string, string, { label: string }, string, { label: string }][]
  }
}

interface typesQueryResult {
  "#select": {
    tuples: [string, string, number][]
  }
}

export { relevantTypeObject, varsObject, typesObject, typeNameAndLocation, relevantTypeQueryResult, varsQueryResult, typesQueryResult }
