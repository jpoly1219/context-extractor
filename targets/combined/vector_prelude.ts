// TODO MVU PRELUDE

// A todo has a description and a status
type Todo = [string, boolean];

// A description input buffer and a todo list
type Model = [string, Todo[]];

type AddTodo = { type: "AddTodo" };

type RemoveTodo = { type: "RemoveTodo"; id: number };

type ToggleTodo = { type: "ToggleTodo"; id: number };

type UpdateBuffer = { type: "UpdateBuffer"; name: string };

type Action = AddTodo | RemoveTodo | ToggleTodo | UpdateBuffer;

type Update = (m: Model, a: Action) => Model;

const todo_eq: (t1: Todo, t2: Todo) => Boolean = ([d1, s1], [d2, s2]) => {
  return d1 === d2 && s1 === s2;
}

const todo_array_eq: (ta1: Todo[], ta2: Todo[]) => Boolean = (ta1, ta2) => {
  return ta1.length === ta2.length && ta1.every((el, i) => { return todo_eq(el, ta2[i]); });
}

const model_eq: (m1: Model, m2: Model) => Boolean = ([b1, ts1], [b2, ts2]) => {
  return b1 === b2 && todo_array_eq(ts1, ts2);
}

const Model_init: Model = ["", []];

const add: (m: Model) => Todo[] = (m) => {
  if (m[0] === "") {
    return m[1];
  } else {
    return [...m[1], [m[0], false]];
  }
}

const remove: (index: number, todos: Todo[]) => Todo[] = (index, todos) => {
  const removedTodos: Todo[] = [];
  for (let i = 0; i < todos.length; i++) {
    if (i !== index) {
      removedTodos.push(todos[i]);
    }
  }
  return removedTodos;
}

const toggle: (index: number, todos: Todo[]) => Todo[] = (index, todos) => {
  const toggledTodos = todos.map((t, i) => {
    if (i === index) {
      return [t[0], !t[1]] as Todo;
    } else {
      return t;
    }
  });
  return toggledTodos;
}

// PLAYLIST MVU PRELUDE

// Non-negative ID for songs
type Id = number;

// Actions user can do in a playlist
type PlaySong = { type: "PlaySong", id: Id };

type PauseCurrentSong = { type: "PauseCurrentSong" };

type RemoveSong = { type: "RemoveSong", id: Id };

// Add to the from of the playList, ignore duplication
type AddSong = { type: "AddSong", id: Id };

type PlayListAction = PlaySong | PauseCurrentSong | RemoveSong | AddSong;

// The state of the playlist
type Playing = { type: "Playing", id: Id };

type PausedOn = { type: "PausedOn", id: Id };

type NoSongSelected = { type: "NoSongSelected" };

type PlayListState = Playing | PausedOn | NoSongSelected;

// A playlist with a list of songs and the current state of the playlist
type PlayList = [Id[], PlayListState];

// Get all the song ids in the playList
const get_songs: (playlist: PlayList) => Id[] = (playlist: PlayList) => {
  const [songs, _] = playlist;
  return songs;
};

// Get the id of the currently playing song
const get_state: (playlist: PlayList) => PlayListState = (playlist: PlayList) => {
  const [_, state] = playlist;
  return state;
};

// PASSWORDS MVU PRELUDE

type RequireUppercase = { type: "RequireUppercase" };

type RequireLowercase = { type: "RequireLowercase" };

type MinimumLength = { type: "MinimumLength"; length: number };

type RequireNumber = { type: "RequireNumber" };

type RequireSpecialChar = { type: "RequireSpecialChar" };

type PasswordCriteria = RequireUppercase | RequireLowercase | MinimumLength | RequireNumber | RequireSpecialChar;

type PasswordStrength = "Weak" | "Moderate" | "Strong";

type Password = string;

type Criteria = PasswordCriteria[];

type Strength = PasswordStrength;

type Model = [password: Password, criteria: Criteria, strength: Strength];

const initialModel: Model = [
  "",
  [
    { type: "MinimumLength", length: 8 },
    { type: "RequireUppercase" },
    { type: "RequireLowercase" },
    { type: "RequireNumber" },
    { type: "RequireSpecialChar" },
  ],
  "Weak",
];

type UpdatePassword = { type: "UpdatePassword"; password: string };
type ClearCriteria = { type: "ClearCriteria" };
type AddCriterion = { type: "AddCriterion"; criterion: PasswordCriteria };
type RemoveCriterion = { type: "RemoveCriterion"; criterion: PasswordCriteria };

type Action = UpdatePassword | ClearCriteria | AddCriterion | RemoveCriterion;

const meetsMinLength: (password: string, len: number) => boolean = (password, len) => {
  return password.length >= len;
};

const hasFromSet: (password: Password, set: string) => boolean = (password, set) => {
  const loop: (s: string) => boolean = (s) => {
    if (s.length === 0) {
      return false;
    } else {
      const first = s[0];
      if (set.includes(first)) {
        return true;
      } else {
        return loop(s.slice(1));
      }
    }
  };
  return loop(password);
};

const hasUppercase: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
};

const hasLowercase: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "abcdefghijklmnopqrstuvwxyz");
};

const hasNumber: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "0123456789");
};

const hasSpecialChar: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "!@#$%^&*()-_=+[]{}|;:,.<>?");
};

const meetsCriterion: (password: Password, criterion: PasswordCriteria) => boolean = (password, criterion) => {
  switch (criterion.type) {
    case "RequireUppercase":
      return hasUppercase(password);
    case "RequireLowercase":
      return hasLowercase(password);
    case "MinimumLength":
      return meetsMinLength(password, criterion.length);
    case "RequireNumber":
      return hasNumber(password);
    case "RequireSpecialChar":
      return hasSpecialChar(password);
  }
};

const metCriteria: (password: Password, criteria: PasswordCriteria[]) => PasswordCriteria[] = (password, criteria) => {
  return criteria.filter((c: PasswordCriteria) => meetsCriterion(password, c));
};

const strength_of: (num_criteria_met: number) => PasswordStrength = (num_criteria_met) => {
  switch (num_criteria_met) {
    case 0:
    case 1:
    case 2:
      return "Weak";
    case 3:
      return "Moderate";
    case 4:
    case 5:
      return "Strong";
    default:
      return "Strong";
  }
};

const calculateStrength: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength = (password, criteria) => {
  return strength_of(metCriteria(password, criteria).length);
};

// BOOKING MVU PRELUDE

type Weekday = "M" | "T" | "W" | "R" | "F";

type TimeOfDay = "AM" | "PM";

type Time = [Weekday, TimeOfDay];

type User = string;

type BookingID = number;

type Booking = [Time, User, BookingID];

type BookingFormData = [Time, User];

type Model = [BookingFormData, Booking[], BookingID];

type AddBooking = { type: "AddBooking"; user: User; weekday: Weekday; timeOfDay: TimeOfDay };

type CancelBooking = { type: "CancelBooking"; user: User; id: number };

type ClearBookings = { type: "ClearBookings" };

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

// EMOJIPAINT MVU PRELUDE

type Emoji = string;
type Row = number;
type Col = number;
type Grid = Emoji[][];

type Model = [Grid, Emoji, Emoji[]];

type SelectEmoji = { type: "SelectEmoji"; emoji: Emoji }    // Set the currently selected emoji
type StampEmoji = { type: "StampEmoji"; row: Row; col: Col }  // Stamp the current emoji at the specified position
type ClearCell = { type: "ClearCell"; row: Row; col: Col }   // Clear the emoji at the specified position
type ClearGrid = { type: "ClearGrid" }             // Clear the entire grid
type FillRow = { type: "FillRow"; row: Row };          // Fill the specified row with the current emoji

type Action = SelectEmoji | StampEmoji | ClearCell | ClearGrid | FillRow;

const model_init: Model = [
  [["", "", ""], ["", "", ""], ["", "", ""]], // Initial 3x3 empty grid
  "😄",                               // Initial selected emoji
  ["😄", "😅", "😆", "😉", "😊"]        // Available emojis
];

const updateGrid: (grid: Grid, row: Row, col: Col, emoji: Emoji) => Grid = (grid, row, col, emoji) => {
  return grid.map((r, i) => {
    if (i === row) {
      return r.map((c, j) => j === col ? emoji : c);
    } else {
      return r;
    }
  });
};

const clearGrid: (grid: Grid) => Grid = (grid) => {
  return grid.map(row => row.map(_ => ""));
};

const fillRowInGrid: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid = (grid, rowToFill, emoji) => {
  return grid.map((row, i) => {
    if (i === rowToFill) {
      return row.map(_ => emoji);
    } else {
      return row;
    }
  });
};
