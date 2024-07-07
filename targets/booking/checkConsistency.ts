import {Model, Action, Weekday, TimeOfDay, Time, User, BookingID, Booking, BookingFormData, AddBooking, CancelBooking, ClearBookings} from "/home/jacob/projects/context-extractor/targets/booking/prelude.ts"
function check(a: Booking): (model: Model, action: Action) => Model { return a; }
function check(a: Booking): Model { return a; }
function check(a: Booking): BookingFormData { return a; }
function check(a: Booking): Time { return a; }
function check(a: Booking): Weekday { return a; }
function check(a: Booking): TimeOfDay { return a; }
function check(a: Booking): User { return a; }
function check(a: Booking): Booking[] { return a; }
function check(a: Booking): BookingID { return a; }