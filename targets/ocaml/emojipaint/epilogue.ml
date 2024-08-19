(* EMOJIPAINT MVU TESTS *)
open Prelude
open Sketch
open OUnit2

(* test  *)
(*   let (grid, _, _) = update(model_init, StampEmoji(0, 0)) in *)
(*   grid == [["😄","",""],["","",""],["","",""]]  *)
(* end; *)
let test1 test_ctxt =
  let grid, _, _ = update (model_init, StampEmoji (0, 0)) in
  assert_equal grid [ [ "😄"; ""; "" ]; [ ""; ""; "" ]; [ ""; ""; "" ] ]

(* test *)
(*   let (grid, _, _) = update(model_init, FillRow(1)) in *)
(*   grid == [["","",""],["😄","😄","😄"],["","",""]]  *)
(* end; *)
let test2 test_ctxt =
  let grid, _, _ = update (model_init, FillRow 1) in
  assert_equal grid [ [ ""; ""; "" ]; [ "😄"; "😄"; "😄" ]; [ ""; ""; "" ] ]

(* test *)
(*   let model = update(model_init, SelectEmoji("😅")) in *)
(*   let (grid, selectedEmoji, _) = update(model, StampEmoji(2, 2)) in *)
(*   grid == [["","",""],["","",""],["","","😅"]] && selectedEmoji == "😅"  *)
(* end; *)
let test3 test_ctxt =
  let model = update (model_init, SelectEmoji "😅") in
  let grid, selectedEmoji, _ = update (model, StampEmoji (2, 2)) in
  assert_bool "test3 failed"
    (grid = [ [ ""; ""; "" ]; [ ""; ""; "" ]; [ ""; ""; "😅" ] ]
    && selectedEmoji = "😅")

(* test *)
(*   let model = update(model_init, FillRow(0)) in *)
(*   let (grid, _, _) = update(model, ClearCell(0, 1)) in *)
(*   grid == [["😄","","😄"],["","",""],["","",""]]  *)
(* end; *)
let test4 test_ctxt =
  let model = update (model_init, FillRow 0) in
  let grid, _, _ = update (model, ClearCell (0, 1)) in
  assert_equal grid [ [ "😄"; ""; "😄" ]; [ ""; ""; "" ]; [ ""; ""; "" ] ]

(* test *)
(*   let model = update(model_init, StampEmoji(1, 1)) in *)
(*   let (grid, _, _) = update(model, ClearGrid) in *)
(*   grid == [["","",""],["","",""],["","",""]]  *)
(* end; *)
let test5 test_ctxt =
  let model = update (model_init, StampEmoji (1, 1)) in
  let grid, _, _ = update (model, ClearGrid) in
  assert_equal grid [ [ ""; ""; "" ]; [ ""; ""; "" ]; [ ""; ""; "" ] ]

(* test *)
(*   let (_, selectedEmoji, _) = update(model_init, SelectEmoji("😊")) in *)
(*   let (grid_init, _, emojiList_init) = model_init in *)
(*   let (grid, _, _) = update((grid_init, selectedEmoji, emojiList_init), StampEmoji(1, 2)) in *)
(*   grid == [["","",""],["","","😊"],["","",""]]  *)
(* end; *)
let test6 test_ctxt =
  let _, selectedEmoji, _ = update (model_init, SelectEmoji "😊") in
  let grid_init, _, emojiList_init = model_init in
  let grid, _, _ =
    update ((grid_init, selectedEmoji, emojiList_init), StampEmoji (1, 2))
  in
  assert_equal grid [ [ ""; ""; "" ]; [ ""; ""; "😊" ]; [ ""; ""; "" ] ]

(* test *)
(*   let (_, selectedEmoji, emojiList) = model_init in *)
(*   let model = update(model_init, FillRow(2)) in *)
(*   let (grid, _, _) = update(model, ClearCell(2, 0)) in *)
(*   grid == [["","",""],["","",""],["","😄","😄"]]  *)
(* end; *)
let test7 test_ctxt =
  let _, selectedEmoji, emojiList = model_init in
  let model = update (model_init, FillRow 2) in
  let grid, _, _ = update (model, ClearCell (2, 0)) in
  assert_equal grid [ [ ""; ""; "" ]; [ ""; ""; "" ]; [ ""; "😄"; "😄" ] ]

(* test *)
(*   let model = update(model_init, StampEmoji(0, 0)) in *)
(*   let model = update(model, StampEmoji(1, 1)) in *)
(*   let model = update(model, StampEmoji(2, 2)) in *)
(*   let (grid, _, _) = update(model, ClearGrid) in *)
(*   grid == [["","",""],["","",""],["","",""]]  *)
(* end; *)
let test8 test_ctxt =
  let model = update (model_init, StampEmoji (0, 0)) in
  let model = update (model, StampEmoji (1, 1)) in
  let model = update (model, StampEmoji (2, 2)) in
  let grid, _, _ = update (model, ClearGrid) in
  assert_equal grid [ [ ""; ""; "" ]; [ ""; ""; "" ]; [ ""; ""; "" ] ]

(* test *)
(*   let (grid_init, _, emojiList_init) = model_init in *)
(*   let model = update(model_init, FillRow(0)) in *)
(*   let (_, selectedEmoji, _) = update(model, SelectEmoji("😆")) in *)
(*   let (grid,_,_) = model in *)
(*   let (grid, _, _) = update((grid, selectedEmoji, emojiList_init), StampEmoji(1, 1)) in *)
(*   grid == [["😄","😄","😄"],["","😆",""],["","",""]]  *)
(* end; *)
let test9 test_ctxt =
  let grid_init, _, emojiList_init = model_init in
  let model = update (model_init, FillRow 0) in
  let _, selectedEmoji, _ = update (model, SelectEmoji "😆") in
  let grid, _, _ = model in
  let grid, _, _ =
    update ((grid, selectedEmoji, emojiList_init), StampEmoji (1, 1))
  in
  assert_equal grid [ [ "😄"; "😄"; "😄" ]; [ ""; "😆"; "" ]; [ ""; ""; "" ] ]

(* test *)
(*   let model = update(model_init, StampEmoji(0, 0)) in *)
(*   let model = update(model, FillRow(2)) in *)
(*   let (grid, _, emojiList) = model in *)
(*   let model = update(model, SelectEmoji("😉")) in *)
(*   let model = update(model, StampEmoji(1, 1)) in *)
(*   let model = update(model, ClearCell(2, 2)) in *)
(*   let (grid, selectedEmoji, _) = model in *)
(*   grid == [["😄","",""],["","😉",""],["😄","😄",""]] && selectedEmoji == "😉"  *)
(* end; *)
let test10 test_ctxt =
  let model = update (model_init, StampEmoji (0, 0)) in
  let model = update (model, FillRow 2) in
  let grid, _, emojiList = model in
  let model = update (model, SelectEmoji "😉") in
  let model = update (model, StampEmoji (1, 1)) in
  let model = update (model, ClearCell (2, 2)) in
  let grid, selectedEmoji, _ = model in
  assert_bool "test10 failed"
    (grid = [ [ "😄"; ""; "" ]; [ ""; "😉"; "" ]; [ "😄"; "😄"; "" ] ]
    && selectedEmoji = "😉")
