import {Model, Action} from "/home/jacob/projects/context-extractor/targets/todo/prelude.ts"
function check(a: (index: number, todos: Todo[]) => Todo[]): (m: Model, a: Action) => Model { return a; }
function check(a: (index: number, todos: Todo[]) => Todo[]): Model { return a; }
function check(a: (index: number, todos: Todo[]) => Todo[]): string { return a; }
function check(a: (index: number, todos: Todo[]) => Todo[]): Todo[] { return a; }