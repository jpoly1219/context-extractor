// EMOJIPAINT MVU
const model_init = [
    [["", "", ""], ["", "", ""], ["", "", ""]], // Initial 3x3 empty grid
    "😄", // Initial selected emoji
    ["😄", "😅", "😆", "😉", "😊"] // Available emojis
];
const updateGrid = (grid, row, col, emoji) => {
    return grid.map((r, i) => {
        if (i === row) {
            return r.map((c, j) => j === col ? emoji : c);
        }
        else {
            return r;
        }
    });
};
const clearGrid = (grid) => {
    return grid.map(row => row.map(_ => ""));
};
const fillRowInGrid = (grid, rowToFill, emoji) => {
    return grid.map((row, i) => {
        if (i === rowToFill) {
            return row.map(_ => emoji);
        }
        else {
            return row;
        }
    });
};
export { model_init, updateGrid, clearGrid, fillRowInGrid };
