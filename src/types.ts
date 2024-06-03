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

export { relevantTypeObject, varsObject, typesObject }
