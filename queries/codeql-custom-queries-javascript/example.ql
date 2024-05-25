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

from ConstDeclStmt s, FunctionTypeExpr f, TypeAliasDeclaration ta
where
    s.toString().matches("%_()") and
    f.getParent() = s.getAChild() and
    // ta.getName() = f.getAParameter().getTypeAnnotation().toString()
    // ta.getName() = f.getType().toString()
    ta.getName() = f.toString() or
    ta.getName() = f.getReturnTypeAnnotation().toString()
select ta