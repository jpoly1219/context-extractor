/**
 * @id hello
 * @name Relevant context
 * @description Find the relevant context given a function hole
 */

import javascript

from int i, int j
where
    i = [3..5] and
    j = [0..6] and
    exists(int a, int b | a in [0..4] and b in [0..5] | a = b)
    // forall(int a, int b | a = i and b = j | a = b)
select i,j