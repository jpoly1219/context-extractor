/**
 * @id hello
 * @name Relevant context
 * @description Find the relevant context given a function hole
 */

import javascript

from TypeAliasDeclaration d
where
    // d.getFile().getBaseName() = "prelude.ts" and
    // d.getName() = "Weekday" and
    d.getDefinition().toString() = "\"M\" | \"T\" | \"W\" | \"R\" | \"F\""
select
    d,
    d.getDefinition().(UnionTypeExpr),
    d.getDefinition().(UnionTypeExpr).getAnUnderlyingType(),
    d.getDefinition().(UnionTypeExpr).getAnUnderlyingType().getAPrimaryQlClass()