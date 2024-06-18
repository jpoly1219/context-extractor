/**
 * @id types
 * @name Types
 * @description Find the specified type.
 */

import javascript

from UnionTypeExpr t, TypeExpr e, int i
where t.toString() = "Booking | undefined" and i = [0..t.getNumElementType()] and e = t.getElementType(i)
select e.toString(), e.getAPrimaryQlClass(), i
order by i