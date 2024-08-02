// EMOJIPAINT MVU

type Emoji = string;
type Row = number;
type Col = number;
type Grid = Emoji[][];

type Model = [Grid, Emoji, Emoji[]];

type SelectEmoji = { type: "SelectEmoji"; emoji: Emoji; };    // Set the currently selected emoji
type StampEmoji = { type: "StampEmoji"; row: Row; col: Col; };  // Stamp the current emoji at the specified position
type ClearCell = { type: "ClearCell"; row: Row; col: Col; };   // Clear the emoji at the specified position
type ClearGrid = { type: "ClearGrid"; };             // Clear the entire grid
type FillRow = { type: "FillRow"; row: Row; };          // Fill the specified row with the current emoji

type Action = SelectEmoji | StampEmoji | ClearCell | ClearGrid | FillRow;

const model_init: Model = [
  [["", "", ""], ["", "", ""], ["", "", ""]], // Initial 3x3 empty grid
  "😄",                               // Initial selected emoji
  ["😄", "😅", "😆", "😉", "😊"]        // Available emojis
];

const updateGrid: (grid: Grid, row: Row, col: Col, emoji: Emoji) => Grid = (grid, row, col, emoji) => {
  return grid.map((r, i) => {
    if (i === row) {
      return r.map((c, j) => j === col ? emoji : c);
    } else {
      return r;
    }
  });
};

const clearGrid: (grid: Grid) => Grid = (grid) => {
  return grid.map(row => row.map(_ => ""));
};

const fillRowInGrid: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid = (grid, rowToFill, emoji) => {
  return grid.map((row, i) => {
    if (i === rowToFill) {
      return row.map(_ => emoji);
    } else {
      return row;
    }
  });
};

export { Model, Action, Emoji, Row, Col, Grid, SelectEmoji, StampEmoji, ClearCell, ClearGrid, FillRow, model_init, updateGrid, clearGrid, fillRowInGrid };
