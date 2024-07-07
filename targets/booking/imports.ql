/**
 * @id imports
 * @name Imports
 * @description Resolve dependencies during consistency check.
 */

import javascript

from File f, TypeExpr t
where(to.toString() = "Weekday" ort.toString() = "TimeOfDay") and t.getFile() = fi
select t.toString(), fi.toString()