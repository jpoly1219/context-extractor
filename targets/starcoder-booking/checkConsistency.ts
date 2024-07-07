import {AddBooking, CancelBooking, ClearBookings, Weekday, TimeOfDay, Time, User, BookingID, Booking, BookingFormData, Model, Action} from "/home/jacob/projects/context-extractor/targets/starcoder-booking/prelude.ts"
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): (model: Model, action: Action) => Model { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): Model { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): BookingFormData { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): Time { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): Weekday { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): TimeOfDay { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): User { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): Booking[] { return a; }
function check(a: (user: User, id: BookingID, bookings: Booking[]) => Booking[]): BookingID { return a; }