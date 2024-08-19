(* TODO MVU TESTS *)
open Prelude
open Sketch
open OUnit2

let eq = model_eq
let num_todos = fun (m: model) -> List.length (snd m)

(* test  # Add adds # *)
(*   num_todos(update(("Breath", []), AddTodo)) *)
(*   > num_todos(("Breath", [])) end; *)
let test1 test_ctxt =
  assert_bool "test1 failed" ((num_todos (update (("Breath", []), AddTodo))) > (num_todos (("Breath", []))))

(* test  # Add uses name, initial status set # *)
(*   eq( *)
(*   update(("Breath", []), AddTodo), *)
(*   ("", [("Breath", false)])) end; *)
let test2 test_ctxt =
  assert_equal (update (("Breath", []), AddTodo)) ("", [("Breath", false)])

(* test  # Add nonempty (too impl spec? test add + remove eqs)# *)
(*   eq( *)
(*   update(("Chop wood", [("Carry water", false)]), AddTodo), *)
(*     ("", [("Chop wood", false), ("Carry water", false)])) end; *)
let test3 test_ctxt =
  assert_equal (update (("Chop wood", [("Carry water", false)]), AddTodo)) ("", [("Chop wood", false); ("Carry water", false)])

(* test  # add then remove doesn't change todos # *)
(*   let todos = [("Breath", false)] in *)
(*   eq( *)
(*     update(update(("Remove this", todos), AddTodo), RemoveTodo(0)), *)
(*     ("", todos)) end; *)
let test4 test_ctxt = 
  let todos: todo list = [("Breath", false)] in
  assert_equal (update ((update (("Remove this", todos), AddTodo)), (RemoveTodo 0))) ("", todos)

(* test  # Toggle preserves length # *)
(*   let model = ("", [("1", false), ("2", false)]) in *)
(*   num_todos(update(model, ToggleTodo(1))) *)
(*     == num_todos(model) end; *)
let test5 test_ctxt =
  let model = ("", [("1", false); ("2", false)]) in
  assert_equal (num_todos (update (model, ToggleTodo 1))) (num_todos model)

(* test  # Toggle toggles right index # *)
(*   eq( *)
(*     update(("", [("Chop", false), ("Carry", true)]), ToggleTodo(1)), *)
(*     ("", [("Chop", false), ("Carry", false)])) end; *)
let test6 test_ctxt =
  assert_equal (update (("", [("Chop", false); ("Carry", true)]), ToggleTodo(1))) ("", [("Chop", false); ("Carry", false)])

(* test  # Toggle out of bounds # *)
(*   let model = ("", [("Chop", false), ("Carry", false)]) in *)
(*   eq( *)
(*     update(model, ToggleTodo(2)), *)
(*     model) end; *)
let test7 test_ctxt =
  let model = ("", [("Chop", false); ("Carry", false)]) in
  assert_equal (update (model, ToggleTodo 2)) model

(* test  # Remove removes # *)
(*   let model = ("", [("1", false)]) in *)
(*   num_todos(update(model, RemoveTodo(0))) *)
(*   < num_todos(model) end; *)
let test8 test_ctxt =
  let model = ("", [("1", false)]) in
  assert_bool "test8 failed" ((num_todos (update (model, RemoveTodo 0))) < (num_todos model))

(* test  # Remove removes right index # *)
(*   eq( *)
(*     update(("", [("1", false), ("2", false)]), RemoveTodo(1)), *)
(*     ("", [("1", false)])) end; *)
let test9 test_ctxt =
  assert_equal (update (("", [("1", false); ("2", false)]), RemoveTodo 1) ) ("", [("1", false)])

(* test  # Remove out of bounds # *)
(*   let model = ("", [("1", false)]) in *)
(*   eq( *)
(*     update(model, RemoveTodo(2)), *)
(*     model) end; *)
let test10 test_ctxt =
  let model = ("", [("1", false)]) in
  assert_equal (update (model, RemoveTodo 2)) model

(* test  # Update Input # *)
(* eq( *)
(*   update(("", []), UpdateBuffer("Breath")), *)
(*   ("Breath", [])) end; *)
let test11 test_ctxt =
  assert_equal (update (("", []), UpdateBuffer "Breath")) ("Breath", [])

(* test  # Don't add blank description # *)
(*   let model = ("", [("1", false)]) in *)
(*   eq( *)
(*     update(model, AddTodo), *)
(*     model) end *)
let test12 test_ctxt =
  let model = ("", [("1", false)]) in
  assert_equal (update (model, AddTodo)) model

let suite =
"todo suite" >::: [
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
  "test12" >:: test12
]

let () = run_test_tt_main suite
