const update = (m, a) => {
    const add = (mAdd) => {
        if (mAdd[0] === "") {
            return mAdd[1];
        }
        return [...mAdd[1], [mAdd[0], false]];
    };
    const remove = (todoId, todoList) => {
        const filteredTodoList = [];
        for (let i = 0; i < todoList.length; i++) {
            if (i !== todoId) {
                filteredTodoList.push(todoList[i]);
            }
        }
        return filteredTodoList;
    };
    const toggle = (i, todoList) => {
        const toggledTodoList = todoList.map((todo, index) => {
            if (index === i) {
                return [todo[0], !todo[1]];
            }
            return todo;
        });
        return toggledTodoList;
    };
    if (a.type === 'AddTodo') {
        return ['', add([m[0], m[1]])];
    }
    else if (a.type === 'RemoveTodo') {
        return [m[0], remove(a.id, m[1])];
    }
    else if (a.type === 'ToggleTodo') {
        return [m[0], toggle(a.id, m[1])];
    }
    else {
        return [a.name, m[1]];
    }
};
export { update };
