/**
 * @id relevant-types
 * @name Relevant types
 * @description Find the relevant types given a function hole
 */

import javascript

from File fi, TypeExpr t
where
    (
        t.toString() = "Weekday" or
        t.toString() = "TimeOfDay"
    ) and
    t.getFile() = fi
select t.toString(), fi.toString()