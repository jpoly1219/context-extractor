import { Todo, Model, AddTodo, RemoveTodo, ToggleTodo, UpdateBuffer, model_eq } from "./prelude"
import { update } from "./sketch"

// utility
const num_todos: (m: Model) => number = (m) => {
  return m[1].length;
}

// tests

// Add adds
const test1 = () => {
  return {
    result: num_todos(update(["Breath", []], { type: "AddTodo" } as AddTodo)) > num_todos(["Breath", []]),
    values: [num_todos(update(["Breath", []], { type: "AddTodo" } as AddTodo)), num_todos(["Breath", []])]
  }
};

// Add uses name, initial status set
const test2 = () => {
  return {
    result: model_eq(
      update(["Breath", []], { type: "AddTodo" } as AddTodo),
      ["", [["Breath", false]]]
    ),
    values: [
      update(["Breath", []], { type: "AddTodo" } as AddTodo),
      ["", [["Breath", false]]]
    ]
  }
};

// Add nonempty (too impl spec? test add + remove eqs)
const test3 = () => {
  return {
    result: model_eq(
      update(["Chop wood", [["Carry water", false]]], { type: "AddTodo" } as AddTodo),
      ["", [["Carry water", false], ["Chop wood", false]]]
    ),
    values: [
      update(["Chop wood", [["Carry water", false]]], { type: "AddTodo" } as AddTodo),
      ["", [["Carry water", false], ["Chop wood", false]]]
    ]
  }
};

// add then remove doesn't change todos
const test4 = () => {
  let todos: Todo[] = [["Breath", false]];
  return {
    result: model_eq(
      update(update(["Remove this", todos], { type: "AddTodo" } as AddTodo), { type: "RemoveTodo", id: 1 } as RemoveTodo),
      ["", todos]
    ),
    values: [
      update(update(["Remove this", todos], { type: "AddTodo" } as AddTodo), { type: "RemoveTodo", id: 1 } as RemoveTodo),
      ["", todos]
    ]
  }
};

// Toggle preserves length
const test5 = () => {
  let model: Model = ["", [["1", false], ["2", false]]];
  return {
    result: num_todos(update(model, { type: "ToggleTodo", id: 1 } as ToggleTodo)) === num_todos(model),
    values: [num_todos(update(model, { type: "ToggleTodo", id: 1 } as ToggleTodo)), num_todos(model)]
  }
}

// Toggle toggles right index
const test6 = () => {
  return {
    result: model_eq(
      update(["", [["Chop", false], ["Carry", true]]], { type: "ToggleTodo", id: 1 } as ToggleTodo),
      ["", [["Chop", false], ["Carry", false]]]
    ),
    values: [
      update(["", [["Chop", false], ["Carry", true]]], { type: "ToggleTodo", id: 1 } as ToggleTodo),
      ["", [["Chop", false], ["Carry", false]]]
    ]
  }
}

// Toggle out of bounds
const test7 = () => {
  let model: Model = ["", [["Chop", false], ["Carry", false]]];
  return {
    result: model_eq(
      update(model, { type: "ToggleTodo", id: 2 } as ToggleTodo),
      model
    ),
    values: [
      update(model, { type: "ToggleTodo", id: 2 } as ToggleTodo),
      model
    ]
  }
}

// Remove removes
const test8 = () => {
  let model: Model = ["", [["1", false]]];
  return {
    result: num_todos(update(model, { type: "RemoveTodo", id: 0 } as RemoveTodo)) < num_todos(model),
    values: [num_todos(update(model, { type: "RemoveTodo", id: 0 } as RemoveTodo)), num_todos(model)]
  }
}

// Remove removes right index
const test9 = () => {
  return {
    result: model_eq(
      update(["", [["1", false], ["2", false]]], { type: "RemoveTodo", id: 1 } as RemoveTodo),
      ["", [["1", false]]]
    ),
    values: [
      update(["", [["1", false], ["2", false]]], { type: "RemoveTodo", id: 1 } as RemoveTodo),
      ["", [["1", false]]]
    ]
  }
}

// Remove out of bounds
const test10 = () => {
  let model: Model = ["", [["1", false]]];
  return {
    result: model_eq(
      update(model, { type: "RemoveTodo", id: 2 } as RemoveTodo),
      model
    ),
    values: [
      update(model, { type: "RemoveTodo", id: 2 } as RemoveTodo),
      model
    ]
  }
}

// Update Input
const test11 = () => {
  return {
    result: model_eq(
      update(["", []], { type: "UpdateBuffer", name: "Breath" } as UpdateBuffer),
      ["Breath", []]
    ),
    values: [
      update(["", []], { type: "UpdateBuffer", name: "Breath" } as UpdateBuffer),
      ["Breath", []]
    ]
  }
}

// Don't add blank description
const test12 = () => {
  let model: Model = ["", [["1", false]]];
  return {
    result: model_eq(
      update(model, { type: "AddTodo" } as AddTodo),
      model
    ),
    values: [
      update(model, { type: "AddTodo" } as AddTodo),
      model
    ]
  }
}

const tests = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10, test11, test12];
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

console.log(`score: ${score} / ${tests.length}`)
