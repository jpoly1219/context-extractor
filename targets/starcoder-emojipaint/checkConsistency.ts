import {Model, Action} from "/home/jacob/projects/context-extractor/targets/starcoder-emojipaint/prelude.ts"
function check(a: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid): (model: Model, action: Action) => Model { return a; }
function check(a: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid): Model { return a; }
function check(a: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid): Grid { return a; }
function check(a: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid): Emoji { return a; }
function check(a: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid): Emoji[] { return a; }