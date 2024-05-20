// ROOM BOOKING MVU
const initFormState = [["M", "AM"], ""];
const Model_init = [initFormState, [], 0];
const getBookings = (model) => {
    const [, bs,] = model;
    return bs;
};
const bookingExists = (model, booking) => {
    return getBookings(model).some((b) => b[0] === booking[0] && b[1] === booking[1] && b[2] === booking[2]);
};
const getUserBookings = (model, user) => {
    return getBookings(model).filter(([, u,]) => u === user);
};
const getBookingById = (model, id) => {
    const bookings = getBookings(model).filter(([, , i]) => i === id);
    return bookings.length > 0 ? bookings[0] : undefined;
};
const rm_booking = (user, id, bookings) => {
    return bookings.filter(([, u, i]) => (u !== user) || (i !== id));
};
export { initFormState, Model_init, getBookings, bookingExists, getUserBookings, getBookingById, rm_booking };
