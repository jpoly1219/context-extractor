
/**
 * @id vars
 * @name Var decls in prelude
 * @description Finds all variable declarations in prelude.ts
 */

import javascript

from ConstDeclStmt c
where
    c.getFile().getBaseName() = "prelude.ts"
select c