
/**
 * @id vars
 * @name Var decls in prelude
 * @description Finds all variable declarations in prelude.ts
 */

import javascript

from ConstDeclStmt c
where
    c.getFile().getBaseName() = "prelude.ts" and
    c.getParent() = c.getTopLevel()
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
    )
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