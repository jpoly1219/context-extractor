// ROOM BOOKING MVU

type Weekday = "M" | "T" | "W" | "R" | "F";

type TimeOfDay = "AM" | "PM";

type Time = [Weekday, TimeOfDay];

type User = string;

type BookingID = number;

type Booking = [Time, User, BookingID];

type BookingFormData = [Time, User];

type Model = [BookingFormData, Booking[], BookingID];

type AddBooking = { type: "AddBooking"; user: User; weekday: Weekday; timeOfDay: TimeOfDay; };

type CancelBooking = { type: "CancelBooking"; user: User; id: number; };

type ClearBookings = { type: "ClearBookings"; };

type Action = AddBooking | CancelBooking | ClearBookings;

const initFormState: [[Weekday, TimeOfDay], string] = [["M", "AM"], ""];

const Model_init: Model = [initFormState, [], 0];

const getBookings: (model: Model) => Booking[] = (model) => {
  const [, bs,] = model;
  return bs;
};

const bookingExists: (model: Model, booking: Booking) => boolean = (model, booking) => {
  return getBookings(model).some((b) => b[0] === booking[0] && b[1] === booking[1] && b[2] === booking[2]);
};

const getUserBookings: (model: Model, user: User) => Booking[] = (model, user) => {
  return getBookings(model).filter(([, u,]) => u === user);
};

const getBookingById: (model: Model, id: BookingID) => Booking | undefined = (model, id) => {
  const bookings = getBookings(model).filter(([, , i]) => i === id);
  return bookings.length > 0 ? bookings[0] : undefined;
};

const rm_booking: (user: User, id: BookingID, bookings: Booking[]) => Booking[] = (user, id, bookings) => {
  return bookings.filter(([, u, i]) => (u !== user) || (i !== id));
}

export { Model, Action, Weekday, TimeOfDay, Time, User, BookingID, Booking, BookingFormData, AddBooking, CancelBooking, ClearBookings, initFormState, Model_init, getBookings, bookingExists, getUserBookings, getBookingById, rm_booking };
