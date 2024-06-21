/**
 * @id types
 * @name Types
 * @description Find the specified type.
 */

import javascript

from LocalTypeAccess t, TypeExpr e, TypeAliasDeclaration td
where (t.toString() = "Strength" and e = t.getLocalTypeName().getADeclaration().getEnclosingStmt().(TypeAliasDeclaration).getDefinition()) or
(t.toString() = "Strength" and td.getName() = "Strength" and td.getFile().toString() = t.getLocalTypeName().getADeclaration().getEnclosingStmt().(Import).resolveImportedPath().getPath() and e = td.getDefinition())
select e.toString(), e.getAPrimaryQlClass()