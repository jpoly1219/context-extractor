/**
 * @id types
 * @name Types
 * @description Find the specified type.
 */

import javascript

from FunctionTypeExpr t, TypeExpr e
where t.toString() = "(model: Model, user: User) => Booking[]" and e = t.getReturnTypeAnnotation()
select e.toString(), e.getAPrimaryQlClass()