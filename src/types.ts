interface relevantTypeObject {
  typeAliasDeclaration: string;
  typeName: string;
  typeDefinition: string;
  typeQLClass: string;
}

interface varsObject {
  constDeclaration: string;
  bindingPattern: string;
  typeAnnotation: string;
  init: string;
  typeQLClass: string;
  functionReturnType: string;
}

interface typesObject {
  typeName: string;
  typeQLClass: string;
}

interface relevantTypeQueryResult {
  "#select": {
    columns: [{ name: string, kind: string }, { kind: string }, { kind: string }, { kind: string }],
    tuples: [{ label: string }, string, { label: string }, string][]
  }
}

interface varsQueryResult {
  "#select": {
    columns: [{ name: string, kind: string }, { kind: string }, { kind: string }, { kind: string }, { kind: string }, { kind: string }],
    tuples: [{ label: string }, { label: string }, { label: string }, { label: string }, string, string][]
  }
}

interface typesQueryResult {
  "#select": {
    columns: [{ kind: string }, { name: string, kind: string }, { name: string, kind: string }],
    tuples: [string, string, number][]
  }
}

export { relevantTypeObject, varsObject, typesObject, relevantTypeQueryResult, varsQueryResult, typesQueryResult }
