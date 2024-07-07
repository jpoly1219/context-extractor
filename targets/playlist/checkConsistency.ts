function check(a: (playlist: PlayList) => PlayListState): (pl: PlayList, pla: PlayListAction) => PlayList { return a; }
function check(a: (playlist: PlayList) => PlayListState): PlayList { return a; }
function check(a: (playlist: PlayList) => PlayListState): Id[] { return a; }
function check(a: (playlist: PlayList) => PlayListState): PlayListState { return a; }