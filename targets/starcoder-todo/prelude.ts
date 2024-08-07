// TODO MVU

// A todo has a description and a status
type Todo = [string, boolean];

// A description input buffer and a todo list
type Model = [string, Todo[]];

type AddTodo = { type: "AddTodo"; };

type RemoveTodo = { type: "RemoveTodo"; id: number; };

type ToggleTodo = { type: "ToggleTodo"; id: number; };

type UpdateBuffer = { type: "UpdateBuffer"; name: string; };

type Action = AddTodo | RemoveTodo | ToggleTodo | UpdateBuffer;

type Update = (m: Model, a: Action) => Model;

const todo_eq: (t1: Todo, t2: Todo) => boolean = ([d1, s1], [d2, s2]) => {
  return d1 === d2 && s1 === s2;
}

const todo_array_eq: (ta1: Todo[], ta2: Todo[]) => boolean = (ta1, ta2) => {
  return ta1.length === ta2.length && ta1.every((el, i) => { return todo_eq(el, ta2[i]); });
}

const model_eq: (m1: Model, m2: Model) => boolean = ([b1, ts1], [b2, ts2]) => {
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
  // const removedTodos = todos.filter((_, i) => { i !== index });
  // return removedTodos;
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


export { Todo, Model, AddTodo, RemoveTodo, ToggleTodo, UpdateBuffer, Action, Update, model_eq, Model_init, add, remove, toggle };
