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

string typeAliasRecurse(TypeAliasDeclaration ta) {
    result = ta.getName() or
    if ta.getName() = ta.getDefinition().getAChild().toString() then result = typeAliasRecurse(ta.getDefinition().getAChild()) else
    result = "none"
    // result = typeRecurse(ta.getDefinition())
}

string typeRecurse(TypeExpr t) {
    result = t.toString() or
    if t instanceof TupleTypeExpr then result = tupleTypeExprRecurse(t) else
    // if t instanceof UnionTypeExpr then result = unionTypeExprRecurse(t) else
    // if t instanceof ArrayTypeExpr then result = arrayTypeExprRecurse(t) else
    // if t instanceof LocalTypeAccess then result = localTypeAccessRecurse(t) else
    result = t.getAQlClass() + ", " + t.toString()
}

string tupleTypeExprRecurse(TupleTypeExpr t) {
    result = t.toString() or
    result = t.getAnElementType().getAnUnderlyingType().toString()
    // result = t.getLocation().toString() or
    // t.getAChild() instanceof TypeExpr and result = typeRecurse(t.getAChild())
    // result = typeRecurse(t.getUnderlyingReference())
    // result = "tte" + " " + t.getAnElementType().toString() + " " + t.getAnElementType().getAPrimaryQlClass()
}

string unionTypeExprRecurse(UnionTypeExpr t) {
    result = t.toString() or
    result = t.getAnUnderlyingType().toString() or
    // result = t.getEnclosingStmt().toString() or
    result = typeRecurse(t.getAnElementType())
    // result = "ute" + " " + t.getAnUnderlyingType().toString() + " " + t.getAnUnderlyingType().getAPrimaryQlClass()
}

string arrayTypeExprRecurse(ArrayTypeExpr t) {
    // result = t.toString() or
    // result = t.getElementType().toString() or
    // result = t.getEnclosingStmt().toString() or
    result = typeRecurse(t.getElementType())
}

string localTypeAccessRecurse(LocalTypeAccess l) {
    result = "lta " + l.getAsGenericType()
}

// predicate isSameAsRecursiveType(TypeAliasDeclaration ta, FunctionTypeExpr f) {
//     ta.getName() = f.getAParameter().getTypeAnnotation().toString() or
//     isSameAsRecursiveType(ta, f.getAParameter().getTypeAnnotation())
// }

from ConstDeclStmt s, Function f, TypeAliasDeclaration ta, TypeAliasDeclaration ta2
where
    s.toString().matches("%_()") and
    f.getParent() = s.getADecl().getTypeAnnotation() and
    ta.getName() = f.getAParameter().getTypeAnnotation().toString() and
    ta2.getName() = ta.getDefinition().(TupleTypeExpr).getAChild().toString()
    // ta2.getName() = ta.getDefinition().(TupleTypeExpr).getAnElementType().toString()
    // ta2.getName() in [ta.getDefinition().(TupleTypeExpr).getAnElementType().getChildTypeExpr(0).toString()] or
    // ta2.getName() = any(int i | i in [0..ta.getDefinition().(TupleTypeExpr).getNumChild()-1] | ta.getDefinition().(TupleTypeExpr).getChildTypeExpr(i).toString()) or
    // ta2.getName() = any(int i | i in [0..ta.getDefinition().(TupleTypeExpr).getAnElementType().getNumChild()-1] | ta.getDefinition().(TupleTypeExpr).getAnElementType().getChildTypeExpr(i).toString())
    // ta.getName() = f.getAParameter().getTypeAnnotation().toString()
    // ta.getName() = f.getType().toString()
    // isSameType(ta, f) or
    // isSameAsReturnType(ta, f) or
    // isSameAsRecursiveType(ta, f)
// select ta.getDefinition().(TupleTypeExpr).getAnElementType(), ta.getDefinition().(TupleTypeExpr).getAnElementType().getChildTypeExpr(0)
// select ta.getDefinition().(TupleTypeExpr).getChildTypeExpr(1)
select ta, ta.getDefinition().(TupleTypeExpr).getAChild().(LocalTypeAccess).getLocalTypeName().getADeclaration().getEnclosingStmt().(TypeAliasDeclaration).getDefinition(), ta2
// any(int i | i in [0..ta.getDefinition().(TupleTypeExpr).getNumChild()-1] | ta.getDefinition().(TupleTypeExpr).getChildTypeExpr(i).toString()),
// any(int i | i in [0..ta.getDefinition().(TupleTypeExpr).getAnElementType().getNumChild()-1] | ta.getDefinition().(TupleTypeExpr).getAnElementType().getChildTypeExpr(i).toString())
// select f, f.getAChildExpr(), 
// f.getAParameter().getTypeAnnotation(), 
// f.getAParameter().getTypeAnnotation()