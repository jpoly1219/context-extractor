import { Model_init, getBookings, getUserBookings, getBookingById } from "./prelude";
import { update } from "./sketch";

// ROOM BOOKING MVU EPILOGUE

const test1 = (): { result: boolean; values: any[] } => {
  const model = update(Model_init, { type: "AddBooking", user: "Charles", weekday: "M", timeOfDay: "AM" });
  return {
    result: getBookings(model)[0][0][0] === "M" && getBookings(model)[0][0][1] === "AM" && getBookings(model)[0][1] === "Charles" && getBookings(model)[0][2] === 0,
    values: [getBookings(model)[0], [["M", "AM"], "Charles", 0]],
  };
};

const test2 = (): { result: boolean; values: any[] } => {
  const model = update(Model_init, { type: "AddBooking", user: "Alice", weekday: "T", timeOfDay: "PM" });
  return {
    result: getBookings(model)[0][0][0] === "T" && getBookings(model)[0][0][1] === "PM" && getBookings(model)[0][1] === "Alice" && getBookings(model)[0][2] === 0,
    values: [getBookings(model)[0], [["T", "PM"], "Alice", 0]],
  };
};

const test3 = (): { result: boolean; values: any[] } => {
  const model = update(Model_init, { type: "AddBooking", user: "Bob", weekday: "W", timeOfDay: "AM" });
  return {
    result: getUserBookings(model, "Bob")[0][0][0] === "W" && getUserBookings(model, "Bob")[0][0][1] === "AM" && getUserBookings(model, "Bob")[0][1] === "Bob" && getUserBookings(model, "Bob")[0][2] === 0,
    values: [getUserBookings(model, "Bob")[0], [["W", "AM"], "Bob", 0]],
  };
};

const test4 = (): { result: boolean; values: any[] } => {
  let model = update(Model_init, { type: "AddBooking", user: "Alice", weekday: "R", timeOfDay: "PM" });
  model = update(model, { type: "CancelBooking", user: "Alice", id: 0 });
  return {
    result: getUserBookings(model, "Alice").length === 0,
    values: [getUserBookings(model, "Alice").length, 0],
  };
};

const test5 = (): { result: boolean; values: any[] } => {
  let model = update(Model_init, { type: "AddBooking", user: "Alice", weekday: "F", timeOfDay: "AM" });
  model = update(model, { type: "AddBooking", user: "Bob", weekday: "F", timeOfDay: "AM" });
  const booking = getBookingById(model, 1);
  return {
    result: booking !== undefined && booking[0][0] === "F" && booking[0][1] === "AM" && booking[1] === "Bob" && booking[2] === 1,
    values: [booking, [["F", "AM"], "Bob", 1]],
  };
};

const test6 = (): { result: boolean; values: any[] } => {
  let model = update(Model_init, { type: "AddBooking", user: "Alice", weekday: "M", timeOfDay: "AM" });
  model = update(model, { type: "AddBooking", user: "Bob", weekday: "M", timeOfDay: "PM" });
  model = update(model, { type: "AddBooking", user: "Alice", weekday: "T", timeOfDay: "AM" });
  model = update(model, { type: "AddBooking", user: "Bob", weekday: "T", timeOfDay: "PM" });
  model = update(model, { type: "AddBooking", user: "Alice", weekday: "W", timeOfDay: "AM" });
  model = update(model, { type: "CancelBooking", user: "Alice", id: 0 });
  model = update(model, { type: "CancelBooking", user: "Bob", id: 3 });
  return {
    result: getBookings(model).length === 3 &&
      getBookings(model)[0][0][0] === "M" && getBookings(model)[0][0][1] === "PM" && getBookings(model)[0][1] === "Bob" && getBookings(model)[0][2] === 1 &&
      getBookings(model)[1][0][0] === "T" && getBookings(model)[1][0][1] === "AM" && getBookings(model)[1][1] === "Alice" && getBookings(model)[1][2] === 2 &&
      getBookings(model)[2][0][0] === "W" && getBookings(model)[2][0][1] === "AM" && getBookings(model)[2][1] === "Alice" && getBookings(model)[2][2] === 4,
    values: [getBookings(model), [
      [["M", "PM"], "Bob", 1],
      [["T", "AM"], "Alice", 2],
      [["W", "AM"], "Alice", 4],
    ]],
  };
};

const test7 = (): { result: boolean; values: any[] } => {
  let model = update(Model_init, { type: "AddBooking", user: "Alice", weekday: "M", timeOfDay: "AM" });
  model = update(model, { type: "AddBooking", user: "Bob", weekday: "M", timeOfDay: "AM" });
  model = update(model, { type: "AddBooking", user: "Charlie", weekday: "M", timeOfDay: "AM" });
  model = update(model, { type: "AddBooking", user: "Dave", weekday: "M", timeOfDay: "PM" });
  model = update(model, { type: "AddBooking", user: "Eve", weekday: "M", timeOfDay: "PM" });
  model = update(model, { type: "CancelBooking", user: "Bob", id: 1 });
  model = update(model, { type: "CancelBooking", user: "Dave", id: 3 });
  model = update(model, { type: "CancelBooking", user: "Alice", id: 0 });
  return {
    result: getBookings(model).length === 2 &&
      getBookings(model)[0][0][0] === "M" && getBookings(model)[0][0][1] === "AM" && getBookings(model)[0][1] === "Charlie" && getBookings(model)[0][2] === 2 &&
      getBookings(model)[1][0][0] === "M" && getBookings(model)[1][0][1] === "PM" && getBookings(model)[1][1] === "Eve" && getBookings(model)[1][2] === 4,
    values: [getBookings(model), [
      [["M", "AM"], "Charlie", 2],
      [["M", "PM"], "Eve", 4],
    ]],
  };
};

const test8 = (): { result: boolean; values: any[] } => {
  let model = update(Model_init, { type: "AddBooking", user: "Alice", weekday: "M", timeOfDay: "AM" });
  model = update(model, { type: "ClearBookings" });
  return {
    result: getBookings(model).length === 0,
    values: [getBookings(model).length, 0],
  };
};

const tests = [test1, test2, test3, test4, test5, test6, test7, test8];
let score = 0;
for (let i = 0; i < tests.length; ++i) {
  try {
    const run = tests[i]();
    console.assert(run.result === true, "%o", { i: i + 1, values: run.values });
    if (run.result) {
      score++;
    }

  } catch (err) {
    console.log(err);
  }
}

console.log(`score: ${score} / ${tests.length}`);
