import { Model, Action, Booking, rm_booking } from "./prelude";

const update = (model: Model, action: Action): Model => {
  const [formState, bookings, nextId] = model;
  switch (action.type) {
    case "AddBooking":
      const newBooking: Booking = [[action.weekday, action.timeOfDay], action.user, nextId];
      return [[[action.weekday, action.timeOfDay], action.user], [...bookings, newBooking], nextId + 1];
    case "CancelBooking":
      // const updatedBookings = bookings.filter(([_, u, i]) => u !== action.user || i !== action.id);
      // return [formState, updatedBookings, nextId];
      return [formState, rm_booking(action.user, action.id, bookings), nextId];
    case "ClearBookings":
      return [formState, [], nextId];
  }
};

export { update };
