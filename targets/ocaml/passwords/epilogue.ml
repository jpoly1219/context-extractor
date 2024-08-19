(* PASSWORD CHECKER MVU TESTS *)
open Prelude
open Sketch
open OUnit2

(* test *)
(*   let model = update(initialModel, ClearCriteria) in *)
(*   let (_, criteria, _) = model in *)
(*   List.length(criteria) == 0    *)
(* end; *)
let test1 test_ctxt =
  let model = update (initial_model, ClearCriteria) in
  let (_, criteria, _) = model in
  assert_equal (List.length criteria) 0

(* test *)
(*   let model = update(initialModel, ClearCriteria) in *)
(*   let model = update(model, AddCriterion(RequireUppercase)) in *)
(*   let (password, criteria, strength) = model in *)
(*   List.length(criteria) == 1   *)
(* end; *)
let test2 test_ctxt =
  let model = update (initial_model, ClearCriteria) in
  let model = update (model, AddCriterion RequireUppercase) in
  let (_, criteria, _) = model in
  assert_equal (List.length criteria) 1

(* test *)
(*   let model = update(initialModel, UpdatePassword("pass")) in *)
(*   let (password, _, strength) = model in *)
(*   password == "pass" && strength == Weak  *)
(* end; *)
let test3 test_ctxt =
  let model = update (initial_model, UpdatePassword "pass") in
  let (password, _, strength) = model in
  assert_bool "test3 failed" (password = "pass" && strength = Weak)

(* test *)
(*   let model = update(initialModel, UpdatePassword("password")) in *)
(*   let (password, _, strength) = model in *)
(*   password == "password" && strength == Weak  *)
(* end; *)
let test4 test_ctxt =
  let model = update (initial_model, UpdatePassword "password") in
  let (password, _, strength) = model in
  assert_bool "test4 failed" (password = "password" && strength = Weak)

(* test *)
(*   let model = update(initialModel, UpdatePassword("Password123")) in *)
(*   let (password, _, strength) = model in *)
(*   password == "Password123" && strength == Strong  *)
(* end; *)
let test5 test_ctxt =
  let model = update (initial_model, UpdatePassword "Password123") in
  let (password, _, strength) = model in
  assert_bool "test5 failed" (password = "Password123" && strength = Strong)

(* test *)
(*   let model = update(initialModel, UpdatePassword("Password123!")) in *)
(*   let (password, _, strength) = model in *)
(*   password == "Password123!" && strength == Strong  *)
(* end; *)
let test5 test_ctxt =
  let model = update (initial_model, UpdatePassword "Password123!") in
  let (password, _, strength) = model in
  assert_bool "test6 failed" (password = "Password123!" && strength = Strong)

(* test *)
(*   let model = update(initialModel, UpdatePassword("password")) in *)
(*   let model = update(model, AddCriterion(RequireUppercase)) in *)
(*   let (password, criteria, strength) = model in *)
(*   password == "password" && List.length(criteria) == 6 && strength == Weak  *)
(* end; *)
let test6 test_ctxt =
  let model = update (initial_model, UpdatePassword "password") in
  let (password, criteria, strength) = model in
  assert_bool "test7 failed" (password = "password" && List.length criteria = 6 && strength = Weak)

(* test *)
(*   let model = update(initialModel, UpdatePassword("Password123!")) in *)
(*   let model = update(model, RemoveCriterion(RequireUppercase)) in *)
(*   let (password, criteria, strength) = model in *)
(*   password == "Password123!" && List.length(criteria) == 4 && strength == Strong  *)
(* end; *)
let test7 test_ctxt =
  let model = update (initial_model, UpdatePassword "Password123!") in
  let model = update (model, RemoveCriterion RequireUppercase) in
  let (password, criteria, strength) = model in
  assert_bool "test8 failed" (password = "Password123!" && List.length criteria = 4 && strength = Strong)

(* test *)
(*   let model = update(initialModel, UpdatePassword("pass")) in *)
(*   let model = update(model, RemoveCriterion(MinimumLength(8))) in *)
(*   let (password, criteria, strength) = model in *)
(*   password == "pass" && List.length(criteria) == 4 && strength == Weak  *)
(* end; *)
let test8 test_ctxt =
  let model = update (initial_model, UpdatePassword "pass") in
  let model = update (model, RemoveCriterion (MinimumLength 8)) in
  let (password, criteria, strength) = model in
  assert_bool "test8 failed" (password = "pass" && List.length criteria = 4 && strength = Weak)

(* test *)
(*   let model = update(initialModel, UpdatePassword("Passw0rd!")) in *)
(*   let model = update(model, RemoveCriterion(RequireSpecialChar)) in *)
(*   let (password, criteria, strength) = model in *)
(*   password == "Passw0rd!" && List.length(criteria) == 4 && strength == Strong  *)
(* end; *)
let test9 test_ctxt =
  let model = update (initial_model, UpdatePassword "Passw0rd!") in
  let model = update (model, RemoveCriterion RequireSpecialChar) in
  let (password, criteria, strength) = model in
  assert_bool "test9 failed" (password = "Passw0rd!" && List.length criteria = 4 && strength = Strong)

(* test *)
(*   let model = update(initialModel, UpdatePassword("password123")) in *)
(*   let model = update(model, AddCriterion(RequireSpecialChar)) in *)
(*   let (password, criteria, strength) = model in *)
(*   password == "password123" && List.length(criteria) == 6 && strength == Moderate  *)
(* end; *)
let test10 test_ctxt =
  let model = update (initial_model, UpdatePassword "password123") in
  let model = update (model, AddCriterion RequireSpecialChar) in
  let (password, criteria, strength) = model in
  assert_bool "test10 failed" (password = "password123" && List.length criteria = 6 && strength = Moderate)

(* test *)
(*   let model = update(initialModel, UpdatePassword("P@ssw0rd!")) in *)
(*   let model = update(model, RemoveCriterion(RequireUppercase)) in *)
(*   let model = update(model, RemoveCriterion(RequireSpecialChar)) in *)
(*   let (password, criteria, strength) = model in *)
(*   password == "P@ssw0rd!" && List.length(criteria) == 3 && strength == Moderate  *)
(* end; *)
let test11 test_ctxt =
  let model = update (initial_model, UpdatePassword "P@ssw0rd!") in
  let model = update (model, RemoveCriterion RequireUppercase) in
  let model = update (model, RemoveCriterion RequireSpecialChar) in
  let (password, criteria, strength) = model in
  assert_bool "test11 failed" (password = "P@ssw0rd!" && List.length criteria = 3 && strength = Moderate)

let suite =
"passwords suite" >::: [
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
  "test11" >:: test11
]

let () = run_test_tt_main suite
