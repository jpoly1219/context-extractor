(* EMOJIPAINT MVU PRELUDE *)

type emoji = string
type row = int
type col = int
type grid = emoji list list
type model = grid * emoji * emoji list

type action =
  | SelectEmoji of emoji
  | StampEmoji of row * col
  | ClearCell of row * col
  | ClearGrid
  | FillRow of row

let model_init : model =
  ( [ [ ""; ""; "" ]; [ ""; ""; "" ]; [ ""; ""; "" ] ],
    "\u{1F604}",
    [ "\u{1F604}"; "\u{1F605}"; "\u{1F606}"; "\u{1F609}"; "\u{1F60A}" ] )

let update_grid ((grid, row, col, emoji) : grid * row * col * emoji) : grid =
  List.mapi
    (fun i r ->
      if i = row then List.mapi (fun j c -> if j = col then emoji else c) r
      else r)
    grid

let clear_grid (grid : grid) : grid =
  List.map (fun row -> List.map (fun _ -> "") row) grid

let fill_row_in_grid ((grid, row_to_fill, emoji) : grid * row * emoji) : grid =
  List.mapi
    (fun i row ->
      if i = row_to_fill then List.map (fun _ -> emoji) row else row)
    grid
