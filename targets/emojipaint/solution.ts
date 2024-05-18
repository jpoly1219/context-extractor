import { Model, Action, updateGrid, clearGrid, fillRowInGrid } from "./prelude";

const update = (model: Model, action: Action): Model => {
  const [grid, selectedEmoji, emojiList] = model;
  switch (action.type) {
    case "SelectEmoji":
      return [grid, action.emoji, emojiList];
    case "StampEmoji":
      return [updateGrid(grid, action.row, action.col, selectedEmoji), selectedEmoji, emojiList];
    case "ClearCell":
      return [updateGrid(grid, action.row, action.col, ""), selectedEmoji, emojiList];
    case "ClearGrid":
      return [clearGrid(grid), selectedEmoji, emojiList];
    case "FillRow":
      return [fillRowInGrid(grid, action.row, selectedEmoji), selectedEmoji, emojiList];
  }
};

export { update };
