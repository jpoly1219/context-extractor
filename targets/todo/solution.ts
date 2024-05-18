import { Model, Action, Todo } from './prelude'

const update: (m: Model, a: Action) => Model = (m, a) => {
  const add: (m: Model) => Todo[] = (mAdd) => {
    if (mAdd[0] === "") {
      return mAdd[1];
    }
    return [...mAdd[1], [mAdd[0], false]] as Todo[];
  };
  const remove: (todoId: number, todoList: Todo[]) => Todo[] = (todoId, todoList) => {
    const filteredTodoList: Todo[] = [];
    for (let i = 0; i < todoList.length; i++) {
      if (i !== todoId) {
        filteredTodoList.push(todoList[i])
      }
    }
    return filteredTodoList;
  }
  const toggle: (i: number, todoList: Todo[]) => Todo[] = (i, todoList) => {
    const toggledTodoList = todoList.map((todo, index) => {
      if (index === i) {
        return [todo[0], !todo[1]] as Todo;
      }
      return todo
    });
    return toggledTodoList;
  }
  if (a.type === 'AddTodo') {
    return ['', add([m[0], m[1]])] as Model
  } else if (a.type === 'RemoveTodo') {
    return [m[0], remove(a.id, m[1])] as Model
  } else if (a.type === 'ToggleTodo') {
    return [m[0], toggle(a.id, m[1])] as Model
  } else {
    return [a.name, m[1]] as Model
  }
};

export { update };
