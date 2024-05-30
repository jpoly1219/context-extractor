/**
 * @id relevant-context
 * @name Relevant context
 * @description Find the relevant context given a function hole
 */

import javascript

// say that we have a hole of type (arg1: typ1, arg2: typ2) => rettype1
// we need to get these target types:
// the whole type
// the return type (because the hole is an arrow type)
// the constituents type (because the hole has a product type on the left hand side)
// the normalized types (because different types could be the same)

predicate isFunctionHole(ConstDeclStmt c, FunctionTypeExpr ft) {
    c.toString().matches("%_()") and
    ft = c.getADecl().getTypeAnnotation()
}

predicate isSameType(DeclStmt d, ConstDeclStmt c, FunctionTypeExpr ft) {
    d.getADecl().getBindingPattern().toString() != c.getADecl().getBindingPattern().toString() and
    d.getADecl().getTypeAnnotation().toString() = ft.toString()
}

predicate isReturnType(DeclStmt d, FunctionTypeExpr ft) {
    d.getADecl().getTypeAnnotation().toString() = ft.getReturnTypeAnnotation().toString()
}

predicate isNestedType(DeclStmt d, FunctionTypeExpr ft) {
    d.getADecl().getTypeAnnotation().toString() = ft.getAParameter().getTypeAnnotation().toString()
}

string recurse(FunctionTypeExpr ft) {
    result = ft.toString() or
    result = concat(string i | i = typeRecurse(ft.getAParameter().getTypeAnnotation()) | i)
}

string typeRecurse(TypeExpr t) {
    if t instanceof LocalTypeAccess then result = localTypeAccessRecurse(t) else
    if t instanceof UnionTypeExpr then result = t.toString() else
    result = typeRecurse(t.getAChild())
}

string localTypeAccessRecurse(LocalTypeAccess l) {
    result = typeRecurse(l.getLocalTypeName().getADeclaration().getEnclosingStmt().(TypeAliasDeclaration).getDefinition())
}

string myTest(TypeExpr t) {
    if t instanceof PredefinedTypeExpr then result = t.toString() else
    if t instanceof LocalTypeAccess then result = concat(string i | i = myTest(t.(LocalTypeAccess).getLocalTypeName().getADeclaration().getEnclosingStmt().(TypeAliasDeclaration).getDefinition())) else
    result = concat(string i | i = myTest(t.getAChild()).toString() | i)
}

from DeclStmt d, ConstDeclStmt c, FunctionTypeExpr ft, TypeAliasDeclaration ta
where
    // isFunctionHole(c, ft) and (
    //     isSameType(d, c, ft) or
    //     isReturnType(d, ft) or
    //     recurse(d) = recurse(c)
    // )
    isFunctionHole(c, ft) and
    ta.getName() = ft.getAParameter().getTypeAnnotation().toString()
// select ft.getAParameter().getTypeAnnotation().getAPrimaryQlClass()
// select ft.getAParameter().getTypeAnnotation().(LocalTypeAccess).getLocalTypeName().getADeclaration().getEnclosingStmt().(ImportDeclaration).getImportedPath()
// select ft.getAParameter().getTypeAnnotation().(LocalTypeAccess).getLocalTypeName().getADeclaration()
// select myTest(c.getADecl().getTypeAnnotation().(TypeExpr), d.getAChild())
// select ta.getAChild+().(TypeExpr).toString()
select myTest(ta.getDefinition())