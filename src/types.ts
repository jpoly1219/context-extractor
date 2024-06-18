interface relevantTypeObject {
  typeAliasDeclaration: string;
  typeName: string;
  typeDefinition: string;
  typeQLClass: string;
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
  components: { name: string, qlClass: string }[];
}

interface typesObject {
  typeName: string;
  typeQLClass: string;
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

export { relevantTypeObject, varsObject, typesObject, relevantTypeQueryResult, varsQueryResult, typesQueryResult }
