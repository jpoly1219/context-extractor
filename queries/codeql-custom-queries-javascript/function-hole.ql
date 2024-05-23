/**
 * @id function-hole
 * @name Function hole
 * @description Find the function hole and get its return type and argument types
 */

import javascript

from ConstDeclStmt s, FunctionTypeExpr f
where s.toString().matches("%_()") and f.getParent() = s.getAChild()
select s, f, f.getParent(), f.getReturnTypeAnnotation(), f.getAParameter().getTypeAnnotation()