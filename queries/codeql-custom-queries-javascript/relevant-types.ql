/**
 * @id relevant-types
 * @name Relevant types
 * @description Find the relevant types given a function hole
 */

import javascript

predicate isFunctionHole(ConstDeclStmt s, Function f) {
    s.toString().matches("%_()") and
    f.getParent() = s.getADecl().getTypeAnnotation()
}

predicate isSameType(TypeAliasDeclaration ta, Function f) {
    ta.getName() = f.toString()
}

predicate isReturnType(TypeAliasDeclaration ta, Function f) {
    ta.getName() = f.getReturnTypeAnnotation().toString()
}

predicate isNestedType(TypeAliasDeclaration ta, Function f) {
    ta.getName() = f.getAParameter().getTypeAnnotation().toString()
}

TypeAliasDeclaration typeAliasRecurse(TypeAliasDeclaration ta) {
    result = ta or
    result = typeRecurse(ta.getDefinition())
}

TypeAliasDeclaration typeRecurse(TypeExpr t) {
    if t instanceof LocalTypeAccess then result = localTypeAccessRecurse(t) else
    result = typeRecurse(t.getAChild())
}
TypeAliasDeclaration localTypeAccessRecurse(LocalTypeAccess l) {
    result = typeAliasRecurse(l.getLocalTypeName().getADeclaration().getEnclosingStmt())
}

from ConstDeclStmt s, Function f, TypeAliasDeclaration ta, TypeAliasDeclaration ta2, AstNode te
where
    isFunctionHole(s, f) and (
        isSameType(ta, f) or
        isReturnType(ta, f) or
        isNestedType(ta, f)
    ) and
    ta2 = typeAliasRecurse(ta) and
    if ta2.getDefinition().getAPrimaryQlClass() = "InterfaceTypeExpr"
    then te = ta2.getDefinition().(InterfaceTypeExpr).getAChild().(FieldDeclaration).getNameExpr() or te = ta2.getDefinition().(InterfaceTypeExpr).getAChild().(FieldDeclaration).getTypeAnnotation()
    else if ta2.getDefinition().getAPrimaryQlClass() = "FunctionTypeExpr"
    then te = ta2.getDefinition().(FunctionTypeExpr).getAParameter().getTypeAnnotation() or te = ta2.getDefinition().(FunctionTypeExpr).getReturnTypeAnnotation()
    else if ta2.getDefinition().getAPrimaryQlClass() = "KeywordTypeExpr"
    then te = ta2.getDefinition()
    else te = ta2.getDefinition().getAChild()
select ta2, ta2.getName(), ta2.getDefinition(), ta2.getDefinition().getAQlClass(), te, te.getPrimaryQlClasses()
