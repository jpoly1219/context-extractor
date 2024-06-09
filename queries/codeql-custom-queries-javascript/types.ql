/**
 * @id types
 * @name Types
 * @description Find the specified type.
 */

import javascript

from InterfaceTypeExpr t, FieldDeclaration e
where t.toString() = "{ type: \"AddBooking\"; user: User; weekday: Weekday; timeOfDay: TimeOfDay }" and
e = t.getAChild()
select e.toString(), e.getTypeAnnotation().getAPrimaryQlClass()
