/**
 * @id relevant-types
 * @name Relevant types
 * @description Find the relevant types given a function hole
 */

import javascript

// from ConstDeclStmt s, FunctionTypeExpr f
// where s.toString().matches("%_()") and f.getParent() = s.getAChild()
// select s, f, f.getParent(), f.getReturnTypeAnnotation(), f.getAParameter().getTypeAnnotation()

// from TypeAliasDeclaration ta, ConstDeclStmt c
// where ta.getFile().getBaseName() = "prelude.ts" and c.getFile().getBaseName() = "prelude.ts"
// select ta, c

predicate isFuncHole(ConstDeclStmt s, Function f) {
    s.toString().matches("%_()") and
    f.getParent() = s.getADecl().getTypeAnnotation()
}

predicate isSameType(TypeAliasDeclaration ta, FunctionTypeExpr f) {
    ta.getName() = f.toString()
}

predicate isSameReturnType(TypeAliasDeclaration ta, Function f) {
    ta.getName() = f.getReturnTypeAnnotation().toString()
}

string typeRecurse(TypeAliasDeclaration ta, Function f) {
    result = ta.getName() or
    if ta.getDefinition() instanceof TupleTypeExpr then result = tupleTypeExprRecurse(ta.getDefinition()) else
    if ta.getDefinition() instanceof UnionTypeExpr then result = unionTypeExprRecurse(ta.getDefinition()) else
    result = ta.getDefinition().getAQlClass()
}

string tupleTypeExprRecurse(TupleTypeExpr t) {
    result = t.toString() or
    result = t.getAnElementType().toString() or
    result = tupleTypeExprRecurse(t.getAnElementType())
}

string unionTypeExprRecurse(UnionTypeExpr t) {
    result = t.toString() or
    result = t.getAnUnderlyingType().toString() or
    result = unionTypeExprRecurse(t.getAnUnderlyingType())
}

// predicate isSameAsRecursiveType(TypeAliasDeclaration ta, FunctionTypeExpr f) {
//     ta.getName() = f.getAParameter().getTypeAnnotation().toString() or
//     isSameAsRecursiveType(ta, f.getAParameter().getTypeAnnotation())
// }

from ConstDeclStmt s, Function f, TypeAliasDeclaration ta
where
    s.toString().matches("%_()") and
    f.getParent() = s.getADecl().getTypeAnnotation() and
    ta.getName() = f.getAParameter().getTypeAnnotation().toString()
    // ta.getName() = f.getAParameter().getTypeAnnotation().toString()
    // ta.getName() = f.getType().toString()
    // isSameType(ta, f) or
    // isSameAsReturnType(ta, f) or
    // isSameAsRecursiveType(ta, f)
select typeRecurse(ta, f)
// select f, f.getAChildExpr(), 
// f.getAParameter().getTypeAnnotation(), 
// f.getAParameter().getTypeAnnotation()