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
    // if t instanceof TupleTypeExpr then result = tupleTypeExprRecurse(t) else
    // if t instanceof UnionTypeExpr then result = unionTypeExprRecurse(t) else
    // if t instanceof ArrayTypeExpr then result = arrayTypeExprRecurse(t) else
    // if t instanceof PredefinedTypeExpr then result = predefinedTypeExprRecurse(t) else
    // if t instanceof InterfaceTypeExpr then result = interfaceTypeExprRecurse(t) else
    if t instanceof LocalTypeAccess then result = localTypeAccessRecurse(t) else
    result = typeRecurse(t.getAChild())
}

// TypeAliasDeclaration tupleTypeExprRecurse(TupleTypeExpr t) {
//     result = typeRecurse(t.getAChild())
// }

// TypeAliasDeclaration unionTypeExprRecurse(UnionTypeExpr t) {
//     result = typeRecurse(t.getAChild())
// }

// TypeAliasDeclaration arrayTypeExprRecurse(ArrayTypeExpr t) {
//     result = typeRecurse(t.getAChild())
// }

// TypeAliasDeclaration predefinedTypeExprRecurse(PredefinedTypeExpr t) {
//     result = typeRecurse(t.getAChild())
// }

// TypeAliasDeclaration interfaceTypeExprRecurse(InterfaceTypeExpr t) {
//     result = typeRecurse(t.getAChild())
// }

TypeAliasDeclaration localTypeAccessRecurse(LocalTypeAccess l) {
    result = typeAliasRecurse(l.getLocalTypeName().getADeclaration().getEnclosingStmt())
}

from ConstDeclStmt s, Function f, TypeAliasDeclaration ta
where
    isFunctionHole(s, f) and (
        isSameType(ta, f) or
        isReturnType(ta, f) or
        isNestedType(ta, f)
    )
// select concat(TypeAliasDeclaration i | i = typeAliasRecurse(ta) | i.toString())
select typeAliasRecurse(ta)
// any(int i | i in [0..ta.getDefinition().(TupleTypeExpr).getNumChild()-1] | ta.getDefinition().(TupleTypeExpr).getChildTypeExpr(i).toString()),
// any(int i | i in [0..ta.getDefinition().(TupleTypeExpr).getAnElementType().getNumChild()-1] | ta.getDefinition().(TupleTypeExpr).getAnElementType().getChildTypeExpr(i).toString())