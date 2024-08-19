(* PLAYLIST MVU TESTS *)
open Prelude
open Sketch
open OUnit2

(* let PlayListState.eq: (PlayListState, PlayListState) -> Bool = *)
(*   fun s1, s2 -> *)
(*     case s1, s2 *)
(*     | Playing(i1), Playing(i2) => i1 == i2 *)
(*     | PausedOn(i1), PausedOn(i2) => i1 == i2 *)
(*     | NoSongSelected, NoSongSelected => true *)
(*     | _ => false *)
(*     end *)
(* in *)
let playlist_state_eq ((s1, s2) : playlist_state * playlist_state) : bool =
  match s1, s2 with
  | Playing i1, Playing i2 -> i1 = i2
  | PausedOn i1, PausedOn i2 -> i1 = i2
  | NoSongSelected, NoSongSelected -> true
  | _ -> false

(* let PlayList.eq: (PlayList, PlayList) -> Bool = *)
(*   fun p1, p2 -> *)
(*     PlayListState.eq(get_state(p1), get_state(p2)) && *)
(*     List.eq(fun i1, i2 -> i1 == i2, get_songs(p1), get_songs(p2)) *)
(* in *)
let playlist_eq ((p1, p2) : (playlist * playlist)) : bool =
  playlist_state_eq (get_state p1, get_state p2) && List.equal (fun i1 i2 -> i1 = i2) (get_songs p1) (get_songs p2)

(* Testing PlaySong *)
(* test PlayList.eq(update(([0, 1, 2], NoSongSelected), PlaySong(0)), ([0, 1, 2], Playing(0))) end; *)
let test1 test_ctxt =
  assert_bool "test1 failed" (playlist_eq (update (([0; 1; 2], NoSongSelected), PlaySong 0), ([0; 1; 2], Playing 0)))

(* test PlayList.eq(update(([0, 1, 2], PausedOn(1)), PlaySong(1)), ([0, 1, 2], Playing(1))) end; *)
let test2 test_ctxt =
  assert_bool "test2 failed" (playlist_eq (update(([0; 1; 2], PausedOn 1), PlaySong 1), ([0; 1; 2], Playing 1)))

(* test PlayList.eq(update(([0, 1, 2], PausedOn(0)), PlaySong(1)), ([0, 1, 2], Playing(1))) end; *)
let test3 test_ctxt =
  assert_bool "test3 failed" (playlist_eq (update(([0; 1; 2], PausedOn 0), PlaySong 1), ([0; 1; 2], Playing 1)))

(* Testing PauseCurrentSong *)
(* test PlayList.eq(update(([0, 1, 2], NoSongSelected), PauseCurrentSong) ,([0, 1, 2], NoSongSelected)) end; *)
let test4 test_ctxt =
  assert_bool "test4 failed" (playlist_eq (update(([0; 1; 2], NoSongSelected), PauseCurrentSong), ([0; 1; 2], NoSongSelected)))

(* test PlayList.eq(update(([0, 1, 2], PausedOn(1)), PauseCurrentSong), ([0, 1, 2], PausedOn(1))) end; *)
let test5 test_ctxt =
  assert_bool "test5 failed" (playlist_eq (update(([0; 1; 2], PausedOn 1), PauseCurrentSong), ([0; 1; 2], PausedOn 1)))

(* test PlayList.eq(update(([0, 1, 2], Playing(0)), PauseCurrentSong), ([0, 1, 2], PausedOn(0))) end; *)
let test6 test_ctxt =
  assert_bool "test6 failed" (playlist_eq (update(([0; 1; 2], Playing 0), PauseCurrentSong), ([0; 1; 2], PausedOn 0)))

(* Testing RemoveSong *)
(* test PlayList.eq(update(([0, 1, 2], NoSongSelected), RemoveSong(0)), ([1, 2], NoSongSelected)) end; *)
let test7 test_ctxt =
  assert_bool "test7 failed" (playlist_eq (update(([0; 1; 2], NoSongSelected), RemoveSong 0), ([1; 2], NoSongSelected)))

(* test PlayList.eq(update(([0, 1, 2], Playing(0)), RemoveSong(0)), ([1, 2], NoSongSelected)) end; *)
let test8 test_ctxt =
  assert_bool "test8 failed" (playlist_eq (update(([0; 1; 2], Playing 0), RemoveSong 0), ([1; 2], NoSongSelected)))

(* test PlayList.eq(update(([0, 1, 2], PausedOn(0)), RemoveSong(0)), ([1, 2], NoSongSelected)) end; *)
let test9 test_ctxt =
  assert_bool "test9 failed" (playlist_eq (update(([0; 1; 2], PausedOn 0), RemoveSong 0), ([1; 2], NoSongSelected)))

(* test PlayList.eq(update(([0, 1, 2], Playing(1)), RemoveSong(0)), ([1, 2], Playing(1))) end; *)
let test10 test_ctxt =
  assert_bool "test10 failed" (playlist_eq (update(([0; 1; 2], Playing 1), RemoveSong 0), ([1; 2], Playing 1)))

(* test PlayList.eq(update(([0, 1, 2], PausedOn(1)), RemoveSong(0)), ([1, 2], PausedOn(1))) end; *)
let test11 test_ctxt =
  assert_bool "test11 failed" (playlist_eq (update(([0; 1; 2], PausedOn 0), RemoveSong 0), ([1; 2], PausedOn 1)))

(* test PlayList.eq(update(([0, 1, 2], Playing(1)), RemoveSong(3)), ([0, 1, 2], Playing(1))) end; *)
let test12 test_ctxt =
  assert_bool "test12 failed" (playlist_eq (update(([0; 1; 2], Playing 1), RemoveSong 3), ([0; 1; 2], Playing 1)))

(* Testing AddSong *)
(* test PlayList.eq(update(([0, 1, 2], NoSongSelected), AddSong(3)), ([3, 0, 1, 2], NoSongSelected)) end; *)
let test13 test_ctxt =
  assert_bool "test13 failed" (playlist_eq (update(([0; 1; 2], NoSongSelected), AddSong 3), ([3; 0; 1; 2], NoSongSelected)))

(* test PlayList.eq(update(([0, 1, 2], Playing(0)), AddSong(3)), ([3, 0, 1, 2], Playing(0))) end; *)
let test14 test_ctxt =
  assert_bool "test14 failed" (playlist_eq (update(([0; 1; 2], Playing 0), AddSong 3), ([3; 0; 1; 2], Playing 0)))

(* test PlayList.eq(update(([0, 1, 2], PausedOn(0)), AddSong(3)), ([3, 0, 1, 2], PausedOn(0))) end; *)
let test15 test_ctxt =
  assert_bool "test15 failed" (playlist_eq (update(([0; 1; 2], PausedOn 0), AddSong 3), ([3; 0; 1; 2], PausedOn 0)))

let suite =
"playlist suite" >::: [
  "test1" >:: test1;
  "test2" >:: test2;
  "test3" >:: test3;
  "test4" >:: test4;
  "test5" >:: test5;
  "test6" >:: test6;
  "test7" >:: test7;
  "test8" >:: test8;
  "test9" >:: test9;
  "test10" >:: test10;
  "test11" >:: test11;
  "test12" >:: test12;
  "test13" >:: test13;
  "test14" >:: test14;
  "test15" >:: test15
]

let () = run_test_tt_main suite
