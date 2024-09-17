(* ROOM BOOKING MVU PRELUDE *)

type weekday = M | T | W | R | F

type time_of_day = AM | PM

type time = weekday * time_of_day

type user = string

type booking_id = int

type booking = time * user * booking_id

type booking_form_data = time * user

type model = booking_form_data * booking list * booking_id

type action =
  | AddBooking of user * weekday * time_of_day
  | CancelBooking of user * int
  | ClearBookings

let init_from_state = ((M, AM), "")

let model_init : model = (init_from_state, [], 0)

let get_bookings ((_, bs, _) : model) : booking list = bs

let booking_exists ((model, booking) : model * booking) : bool =
  List.exists (fun b -> b = booking) (get_bookings model)

let get_user_bookings ((model, user) : model * user) : booking list =
  List.filter (fun (_, u, _) -> u = user) (get_bookings model)

let get_bookings_by_id ((model, id) : model * booking_id) : booking =
  match List.filter (fun (_, _, i) -> i = id) (get_bookings model) with
  | [ booking ] -> booking
  | _ -> failwith "id doesn't exist"

let rm_booking ((user, id, bookings) : user * booking_id * booking list) :
    booking list =
  List.filter (fun (_, u, i) -> u != user || i != id) bookings
