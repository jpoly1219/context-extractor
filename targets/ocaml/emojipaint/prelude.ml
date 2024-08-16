(* EMOJIPAINT MVU PRELUDE *)

(* type Emoji = String in  *)
type emoji = string

(* type Row = Int in  *)
type row = int

(* type Col = Int in  *)
type col = int

(* type Grid = [[Emoji]] in *)
type grid = emoji list list

(* type Model = ( *)
(*   Grid,     # The 2D grid of emojis # *)
(*   Emoji,    # The currently selected emoji # *)
(*   [Emoji]   # The list of available emojis # *)
(* ) in *)
type model = grid * emoji * emoji list

(* type Action = *)
(*   + SelectEmoji(Emoji)    # Set the currently selected emoji # *)
(*   + StampEmoji(Row, Col)  # Stamp the current emoji at the specified position # *)
(*   + ClearCell(Row, Col)   # Clear the emoji at the specified position # *)
(*   + ClearGrid             # Clear the entire grid # *)
(*   + FillRow(Row)          # Fill the specified row with the current emoji # *)
(* in *)
type action =
  | SelectEmoji of emoji
  | StampEmoji of row * col
  | ClearCell of row * col
  | ClearGrid
  | FillRow of row

(* let model_init: Model = ( *)
(*   [["","",""],["","",""],["","",""]], # Initial 3x3 empty grid # *)
(*   "😄",                               # Initial selected emoji # *)
(*   ["😄", "😅", "😆", "😉", "😊"]        # Available emojis # *)
(* ) in *)
let model_init : model =
  ( [ [ ""; ""; "" ]; [ ""; ""; "" ]; [ ""; ""; "" ] ],
    "😄",
    [ "😄"; "😅"; "😆"; "😉"; "😊" ] )

(* let updateGrid: (Grid, Row, Col, Emoji) -> Grid = *)
(*   fun grid, row, col, emoji -> *)
(*     List.mapi( *)
(*       fun i, r ->  *)
(*         if i == row   *)
(*         then List.mapi(fun j, c -> if j == col then emoji else c, r)  *)
(*         else r,  *)
(*       grid *)
(*    ) in *)
let update_grid ((grid, row, col, emoji) : grid * row * col * emoji) : grid =
  List.mapi
    (fun i r ->
      if i = row then List.mapi (fun j c -> if j = col then emoji else c) r
      else r)
    grid

(* let clearGrid: Grid -> Grid = *)
(*   fun grid -> List.map(fun row -> List.map(fun _ -> "", row), grid)  *)
(* in *)
let clear_grid (grid : grid) : grid =
  List.map (fun row -> List.map (fun _ -> "") row) grid

(* let fillRowInGrid: (Grid, Row, Emoji) -> Grid = *)
(*   fun grid, rowToFill, emoji -> *)
(*     List.mapi( *)
(*       fun i, row ->  *)
(*         if i == rowToFill  *)
(*         then List.map(fun _ -> emoji, row)  *)
(*         else row, *)
(*       grid   *)
(*   ) in *)
let fill_row_in_grid ((grid, row_to_fill, emoji) : grid * row * emoji) : grid =
  List.mapi
    (fun i row ->
      if i = row_to_fill then List.map (fun _ -> emoji) row else row)
    grid
