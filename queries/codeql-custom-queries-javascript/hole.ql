/**
 * @id types
 * @name Types
 * @description Find the specified type.
 */

import javascript

from VariableDeclarator d
where d.getAChild().toString() = "_()"
select d.getTypeAnnotation().toString(), d.getTypeAnnotation().getAPrimaryQlClass()