(* ROOM BOOKING MVU PRELUDE *)

(* type Weekday = M + T + W + R + F in *)
type weekday = M | T | W | R | F

(* type TimeOfDay = AM + PM in *)
type time_of_day = AM | PM

(* type Time = (Weekday, TimeOfDay) in *)
type time = weekday * time_of_day

(* type User = String in *)
type user = string

(* type BookingID = Int in *)
type booking_id = int

(* type Booking = (Time, User, BookingID) in *)
type booking = time * user * booking_id

(* type BookingFormData = (Time, User) in *)
type booking_form_data = time * user

(* type Model = (BookingFormData, [Booking], BookingID) in *)
type model = booking_form_data * booking list * booking_id

(* type Action = *)
(*   + AddBooking(User, Weekday, TimeOfDay) *)
(*   + CancelBooking(User, Int) *)
(*   + ClearBookings *)
(* in *)
type action =
  | AddBooking of user * weekday * time_of_day
  | CancelBooking of user * int
  | ClearBookings

(* let initFormState = ((M, AM), "") in *)
let init_from_state = ((M, AM), "")

(* let Model.init: Model = (initFormState, [], 0) in *)
let model_init : model = (init_from_state, [], 0)

(* let getBookings: Model -> [Booking] = *)
(*   fun _, bs,_ -> bs in *)
let get_bookings ((_, bs, _) : model) : booking list = bs

(* let bookingExists: (Model, Booking) -> Bool = *)
(*   fun model, booking -> *)
(*     List.exists(fun b -> b == booking, getBookings(model))   *)
(* in *)

let booking_exists ((model, booking) : model * booking) : bool =
  List.exists (fun b -> b = booking) (get_bookings model)

(* let getUserBookings: (Model, User) -> [Booking] = *)
(*   fun model, user -> *)
(*     List.filter(fun (_, u:User,_) -> u == user, getBookings(model))  *)
(* in *)
let get_user_bookings ((model, user) : model * user) : booking list =
  List.filter (fun (_, u, _) -> u = user) (get_bookings model)

(* let getBookingById: (Model, BookingID) -> Booking = *)
(*   fun model, id -> *)
(*     case List.filter(fun (_, _, i:BookingID) -> i == id, getBookings(model)) *)
(*       | [booking] => booking *)
(*       | _ => ?   *)
(*     end   *)
(* in *)
let get_bookings_by_id ((model, id) : model * booking_id) : booking =
  match List.filter (fun (_, _, i) -> i = id) (get_bookings model) with
  | [ booking ] -> booking
  | _ -> failwith "id doesn't exist"

(* let rm_booking: (User, BookingID, [Booking]) -> [Booking] = *)
(*   fun user, id, bookings -> *)
(*     List.filter( *)
(*       fun (_, u:User, i:BookingID) -> (u!= user) \/ (i!= id), bookings) in *)
let rm_booking ((user, id, bookings) : user * booking_id * booking list) :
    booking list =
  List.filter (fun (_, u, i) -> u != user || i != id) bookings
