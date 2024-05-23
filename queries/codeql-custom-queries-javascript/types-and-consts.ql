/**
 * @id types-and-consts
 * @name Type and const decls in prelude
 * @description Finds all type declarations and const declarations in prelude.ts
 */

 import javascript

 from TypeAliasDeclaration ta, ConstDeclStmt c
 where ta.getFile().getBaseName() = "prelude.ts" and c.getFile().getBaseName() = "prelude.ts"
 select ta, c