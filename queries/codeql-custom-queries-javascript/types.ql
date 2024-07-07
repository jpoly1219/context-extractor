/**
 * @id types
 * @name Types
 * @description Find the specified type.
 */

import javascript

from FunctionTypeExpr t, TypeExpr e
where t.toString() = "(num_criteria_met: number) => PasswordStrength" and e = t.getReturnTypeAnnotation()
select e.toString(), e.getAPrimaryQlClass()