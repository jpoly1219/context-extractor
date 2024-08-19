(* ROOM BOOKING MVU TESTS *)
open Prelude
open Sketch
open OUnit2

(* test *)
(*   getBookings(update(Model.init, AddBooking("Charles",M, AM))) *)
(*   == [((M, AM),"Charles",0)]   *)
(* end; *)
let test1 test_ctxt =
  assert_equal (get_bookings (update (model_init, AddBooking ("Charles", M, AM)))) [((M, AM), "Charles", 0)]

(* test *)
(*   let model = update(Model.init, AddBooking("Alice", T, PM)) in *)
(*   getBookings(model) == [((T, PM), "Alice", 0)]  *)
(* end; *)
let test2 test_ctxt =
  let model = update (model_init, AddBooking ("Alice", T, PM)) in
  assert_equal (get_bookings model) [((T, PM), "Alice", 0)]

(* test *)
(*   let model = update(Model.init, AddBooking("Bob", W, AM)) in *)
(*   getUserBookings(model, "Bob") == [((W, AM), "Bob", 0)]   *)
(* end; *)
let test3 test_ctxt =
  let model = update (model_init, AddBooking ("Bob", W, AM)) in
  assert_equal (get_user_bookings (model, "Bob")) [((W, AM), "Bob", 0)]

(* test *)
(*   let model = update(Model.init, AddBooking("Alice", R, PM)) in *)
(*   let model = update(model, CancelBooking("Alice", 0)) in *)
(*   getUserBookings(model, "Alice") == []   *)
(* end; *)
let test4 test_ctxt =
  let model = update (model_init, AddBooking ("Alice", R, PM)) in
  let model = update (model, CancelBooking ("Alice", 0)) in
  assert_equal (get_user_bookings (model, "Alice")) []

(* test *)
(*   let model = update(Model.init, AddBooking("Alice", F, AM)) in *)
(*   let model = update(model, AddBooking("Bob", F, AM)) in *)
(*   getBookingById(model, 1) == ((F, AM), "Bob", 1)    *)
(* end; *)
let test5 test_ctxt =
  let model = update (model_init, AddBooking ("Alice", F, AM)) in
  let model = update (model, AddBooking ("Bob", F, AM)) in
  assert_equal (get_bookings_by_id (model, 1)) ((F, AM), "Bob", 1)

(* test *)
(*   let model = update(Model.init, AddBooking("Alice", M, AM)) in *)
(*   let model = update(model, AddBooking("Bob", M, PM)) in *)
(*   let model = update(model, AddBooking("Alice", T, AM)) in *)
(*   let model = update(model, AddBooking("Bob", T, PM)) in *)
(*   let model = update(model, AddBooking("Alice", W, AM)) in *)
(*   let model = update(model, CancelBooking("Alice", 0)) in *)
(*   let model = update(model, CancelBooking("Bob", 3)) in *)
(*   getBookings(model) == [((W, AM), "Alice", 4), ((T, AM), "Alice", 2), ((M, PM), "Bob", 1)]   *)
(* end; *)
let test6 test_ctxt =
  let model = update (model_init, AddBooking ("Alice", M, AM)) in
  let model = update (model, AddBooking ("Bob", M, PM)) in
  let model = update (model, AddBooking ("Alice", T, AM)) in
  let model = update (model, AddBooking ("Bob", T, PM)) in
  let model = update (model, AddBooking ("Alice", W, AM)) in
  let model = update (model, CancelBooking ("Bob", 3)) in
  let model = update (model, CancelBooking ("Bob", 3)) in
  assert_equal (get_bookings model) [((W, AM), "Alice", 4); ((T, AM), "Alice", 2); ((M, PM), "Bob", 1)]

(* test *)
(*   let model = update(Model.init, AddBooking("Alice", M, AM)) in *)
(*   let model = update(model, AddBooking("Bob", M, AM)) in *)
(*   let model = update(model, AddBooking("Charlie", M, AM)) in *)
(*   let model = update(model, AddBooking("Dave", M, PM)) in *)
(*   let model = update(model, AddBooking("Eve", M, PM)) in *)
(*   let model = update(model, CancelBooking("Bob", 1)) in *)
(*   let model = update(model, CancelBooking("Dave", 3)) in *)
(*   let model = update(model, CancelBooking("Alice", 0)) in *)
(*   getBookings(model) == [((M, PM), "Eve", 4), ((M, AM), "Charlie", 2)]   *)
(* end; *)
let test7 test_ctxt =
  let model = update (model_init, AddBooking ("Alice", M, AM)) in
  let model = update (model, AddBooking ("Bob", M, AM)) in
  let model = update (model, AddBooking ("Charlie", M, AM)) in
  let model = update (model, AddBooking ("Dave", M, PM)) in
  let model = update (model, AddBooking ("Eve", M, PM)) in
  let model = update (model, CancelBooking ("Bob", 1)) in
  let model = update (model, CancelBooking ("Dave", 3)) in
  let model = update (model, CancelBooking ("Alice", 0)) in
  assert_equal (get_bookings model) [((M, PM), "Eve", 4); ((M, AM), "Charlie", 2)]

(* test *)
(*   let model = update(Model.init, AddBooking("Alice", M, AM)) in *)
(*   let model = update(model, ClearBookings) in *)
(*   getBookings(model) == []   *)
(* end; *)
let test8 test_ctxt =
  let model = update (model_init, AddBooking ("Alice", M, AM)) in
  let model = update (model, ClearBookings) in
  assert_equal (get_bookings model) []

let suite =
"booking suite" >::: [
  "test1" >:: test1;
  "test2" >:: test2;
  "test3" >:: test3;
  "test4" >:: test4;
  "test5" >:: test5;
  "test6" >:: test6;
  "test7" >:: test7;
  "test8" >:: test8;
]

let () = run_test_tt_main suite
