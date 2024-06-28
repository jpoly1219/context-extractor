interface relevantTypeObject {
  typeAliasDeclaration: string;
  typeName: string;
  typeDefinition: string;
  typeQLClass: string;
  components: typesObject[];
}

interface varsObject {
  constDeclaration: string;
  bindingPattern: string;
  typeAnnotation: string;
  init: string;
  typeQLClass: string;
  functionReturnType: string;
  functionReturnTypeQLClass: string;
  components: typesObject[];
}

interface typesObject {
  typeName: string;
  typeQLClass: string;
}

interface typeAndLocation {
  typeName: string;
  locatedFile: string;
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

interface typesAndLocationsQueryResult {
  "#select": {
    tuples: [string, string][]
  }
}

export { relevantTypeObject, varsObject, typesObject, typeAndLocation, relevantTypeQueryResult, varsQueryResult, typesQueryResult, typesAndLocationsQueryResult }
