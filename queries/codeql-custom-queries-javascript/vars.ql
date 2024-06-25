
/**
 * @id vars
 * @name Var decls in prelude
 * @description Finds all variable declarations in prelude.ts
 */

import javascript

from ConstDeclStmt c, TypeExpr t, AstNode a
where
    // c.getFile().getBaseName() = "prelude.ts"
    // c.getParent() = c.getTopLevel() and
    t = c.getADecl().getTypeAnnotation() and
    if t.getAPrimaryQlClass() = "InterfaceTypeExpr"
    then a = t.(InterfaceTypeExpr).getAChild().(FieldDeclaration).getNameExpr() or a = t.(InterfaceTypeExpr).getAChild().(FieldDeclaration).getTypeAnnotation()
    else if t.getAPrimaryQlClass() = "FunctionTypeExpr"
    then a = t.(FunctionTypeExpr).getAParameter().getTypeAnnotation() or a = t.(FunctionTypeExpr).getReturnTypeAnnotation()
    else if t.getAPrimaryQlClass() = "KeywordTypeExpr"
    then a = t
    else if t.getNumChild() > 0 then a = t.getAChild() else a = t
select
    c,
    c.getADecl().getBindingPattern(),
    c.getADecl().getTypeAnnotation(),
    c.getADecl().getInit(),
    c.getADecl().getTypeAnnotation().getAPrimaryQlClass(),
    concat(
        string i |
        i = c.getADecl().getTypeAnnotation().(FunctionTypeExpr).getReturnTypeAnnotation().toString() |
        i
    ),
    concat(
        string i |
        i = c.getADecl().getTypeAnnotation().(FunctionTypeExpr).getReturnTypeAnnotation().getAPrimaryQlClass().toString() |
        i
    ),
    a, a.getAPrimaryQlClass()
    // concat(
    //     string rettype |
    //     rettype = c.getADecl().getTypeAnnotation().(FunctionTypeExpr).getReturnTypeAnnotation().toString() |
    //     "(" + concat(
    //         int i, string j |
    //         i in [0..c.getADecl().getTypeAnnotation().(FunctionTypeExpr).getNumParameter()-1] and
    //         j = c.getADecl().getTypeAnnotation().(FunctionTypeExpr).getParameter(i).getTypeAnnotation().toString() |
    //         j, ", " order by i
    //     ) + ") => " + rettype
    // )