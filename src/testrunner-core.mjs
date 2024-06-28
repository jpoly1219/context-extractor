import * as fs from "fs";

const generatePrompt = (source, sketchFileContent, targetTypes) => {
  const prompt = [{
    role: "system",
    content:
      "CODE COMPLETION INSTRUCTIONS:\n\
- Reply with a functional, idiomatic replacement for the program hole marked '_()' in the provided TypeScript program sketch\n\
- Reply only with a single replacement term for the unqiue distinguished hole marked '_()'\n\
- Reply only with code\n\
- DO NOT include the program sketch in your reply\n\
- DO NOT include a period at the end of your response and DO NOT use markdown\n\
- DO NOT include a type signature for the program hole, as this is redundant and is already in the provided program sketch"
  }];

  let userPrompt = {
    role: "user",
    content: `# Program Sketch to be completed: #\n${sketchFileContent}`
  };

  if (targetTypes) {
    const holeType = targetTypes.split("\n")[1];
    userPrompt = {
      role: "user",
      content:
        `# The expected type of the goal completion is ${holeType} #

# The following type definitions are likely relevant: #
${targetTypes}

`
    };
  } else {
    userPrompt = {
      role: "user",
      content: `# Program Sketch to be completed: #
${removeLines(sketchFileContent).join("\n")}

`
    };
  }

  switch (source) {
    case "todo":
      userPrompt.content += `
# Consider using these variables relevant to the expected type: #
const Model_init: Model;
const toggle: (index: number, todos: Todo[]) => Todo[];
const remove: (index: number, todos: Todo[]) => Todo[];
const add: (m: Model) => Todo[];

# Program Sketch to be completed: #
${removeLines(sketchFileContent).join("\n")}
`;
      break;
    case "playlist":
      userPrompt.content += `
# Consider using these variables relevant to the expected type: #
const get_songs: (playlist: PlayList) => Id[];
const get_state: (playlist: PlayList) => PlayListState;

# Program Sketch to be completed: #
${removeLines(sketchFileContent).join("\n")}
`;
      break;
    case "passwords":
      userPrompt.content += `
# Consider using these variables relevant to the expected type: #
const initialModel: Model;
const calculateStrength: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength;
const strength_of: (num_criteria_met: number) => PasswordStrength;

# Program Sketch to be completed: #
${removeLines(sketchFileContent).join("\n")}
`;
      break;
    case "booking":
      userPrompt.content += `
# Consider using these variables relevant to the expected type: #
const Model_init: Model;
const initFormState: [[Weekday, TimeOfDay], String];
const rm_booking: (user: User, id: BookingID, bookings: Booking[]) => Booking[];
const getUserBookings: (model: Model, user: User) => Booking[];
const getBookings: (model: Model) => Booking[]

# Program Sketch to be completed: #
${removeLines(sketchFileContent).join("\n")}
`;
      break;
    case "emojipaint":
      userPrompt.content += `
# Consider using these variables relevant to the expected type: #
const model_init: Model;
const fillRowInGrid: (grid: Grid, rowToFill: Row, emoji: Emoji) => Grid;
const clearGrid: (grid: Grid) => Grid;
const updateGrid: (grid: Grid, row: Row, col: Col, emoji: Emoji) => Grid

# Program Sketch to be completed: #
${removeLines(sketchFileContent)}
`
      break;
    default:
      userPrompt.content += `
# Program Sketch to be completed: #
${removeLines(sketchFileContent)}
`
      break;
  }

  prompt.push(userPrompt);
  return prompt;
};


const generateTypesAndHeadersPrompt = (sketchFileContent, holeType, relevantTypes, relevantHeaders) => {
  const prompt = [{
    role: "system",
    content:
      "CODE COMPLETION INSTRUCTIONS:\n\
- Reply with a functional, idiomatic replacement for the program hole marked '_()' in the provided TypeScript program sketch\n\
- Reply only with a single replacement term for the unqiue distinguished hole marked '_()'\n\
- Reply only with code\n\
- DO NOT include the program sketch in your reply\n\
- DO NOT include a period at the end of your response and DO NOT use markdown\n\
- DO NOT include a type signature for the program hole, as this is redundant and is already in the provided program sketch"
  }];

  let userPrompt = {
    role: "user",
    content: ""
  };

  if (relevantTypes) {
    userPrompt.content +=
      `# The expected type of the goal completion is ${holeType} #

# The following type definitions are likely relevant: #
${relevantTypes}

`
  }
  if (relevantHeaders) {
    userPrompt.content += `
# Consider using these variables relevant to the expected type: #
${relevantHeaders}

`;
  }

  userPrompt.content += `# Program Sketch to be completed: #\n${removeLines(sketchFileContent).join("\n")}`;

  prompt.push(userPrompt);
  return prompt;
};

const generateErrorCorrectionPrompt = (previousPrompt, errorMsg) => {
  const prompt = structuredClone(previousPrompt);

  const errorCorrectionPrompt = {
    role: "user",
    content:
      //       `The completed code you sent has some errors that has been caught by the TypeScript compiler.\n\
      // The following static errors were discovered: \n${errorMsg}\
      // Here is the list of past error messages: \n${pastErrorMsg} \
      // Please try to address the error(s) by updating your previous code suggestion.\n\
      // Please respond ONLY with the update suggestion.`
      `The completed code you sent has some errors that has been caught by the TypeScript compiler.
The following static errors were discovered:

${errorMsg}

Please try to address the error(s) by updating your previous code suggestion and send me the completed program hole again.
`
  };
  prompt.push(errorCorrectionPrompt);

  return prompt;
}


const generateVectorRetrievalPrompt = (sketchFileContent, ragCtx) => {
  const prompt = [{
    role: "system",
    content:
      "CODE COMPLETION INSTRUCTIONS:\n\
- Reply with a functional, idiomatic replacement for the program hole marked '_()' in the provided TypeScript program sketch\n\
- Reply only with a single replacement term for the unqiue distinguished hole marked '_()'\n\
- Reply only with code\n\
- DO NOT include the program sketch in your reply\n\
- DO NOT include a period at the end of your response and DO NOT use markdown\n\
- DO NOT include a type signature for the program hole, as this is redundant and is already in the provided program sketch"
  }];

  let userPrompt = {
    role: "user",
    content:
      `# Program Sketch to be completed: #\n${sketchFileContent}

# relevant snippets: #
${ragCtx}

# Program Sketch to be completed: #
${removeLines(sketchFileContent).join("\n")}

`
  };

  prompt.push(userPrompt);
  return prompt;
};


const generateExhaustiveRetrievalPrompt = (sketchFileContent, exhaustiveCtx) => {
  const prompt = [{
    role: "system",
    content:
      "CODE COMPLETION INSTRUCTIONS:\n\
- Reply with a functional, idiomatic replacement for the program hole marked '_()' in the provided TypeScript program sketch\n\
- Reply only with a single replacement term for the unqiue distinguished hole marked '_()'\n\
- Reply only with code\n\
- DO NOT include the program sketch in your reply\n\
- DO NOT include a period at the end of your response and DO NOT use markdown\n\
- DO NOT include a type signature for the program hole, as this is redundant and is already in the provided program sketch"
  }];

  let userPrompt = {
    role: "user",
    content:
      `# Program Sketch to be completed: #\n${removeLines(sketchFileContent)}


# relevant snippets: #
${exhaustiveCtx}

`
  };

  prompt.push(userPrompt);
  return prompt;
};

const mockLLM = (errorRound) => {
  let errorSketch1 = "const update: (m: Model, a: Action) => Model = (m, a) => {\n\
    const add: (m: Model) => Todo = (mAdd) => {\n\
      if (mAdd[0] === '') {\n\
        return mAdd[1];\n\
      }\n\n\
      return [[mAdd[0], false], ...mAdd[1]];\n\
    };\n\n\
    const remove: (i: number, todoList: Todo[]) => Todo = (i, todoList) => {\n\
      const filteredTodoList = todoList.filter((_, index) => { index !== i });\n\
      return filteredTodoList;\n\
    }\n\n\
    const toggle: (i: number, todoList: Todo[]) => Todo = (i, todoList) => {\n\
      const toggledTodoList = todoList.map((todo, index) => {\n\
        if (index === i) {\n\
          return [todo[0], !todo[0]];\n\
        }\n\n\
        return todo\n\
      });\n\n\
      return toggledTodoList;\n\
    }\n\n\
    switch (a) {\n\
      case AddTodo:\n\
        return ['', add(m[0], m[1])]\n\
      case RemoveTodo:\n\
        return [m[0], remove(a.id, m[1])]\n\
      case ToggleTodo:\n\
        return [m[0], toggle(a.id, m[1])]\n\
      case UpdateBuffer:\n\
        return [a.name, m[1]]\n\
    }\n\
  };";

  let errorSketch2 = "import { Model, Action, Todo, AddTodo, RemoveTodo, ToggleTodo, UpdateBuffer } from './prelude.ts'\n\
    const update: (m: Model, a: Action) => Model = (m, a) => {\n\
    const add: (m: Model) => Todo[] = (mAdd) => {\n\
      if (mAdd[0] === '') {\n\
        return mAdd[1];\n\
      }\n\n\
      return [[mAdd[0], false], ...mAdd[1]];\n\
    };\n\n\
    const remove: (i: number, todoList: Todo[]) => Todo[] = (i, todoList) => {\n\
      const filteredTodoList = todoList.filter((_, index) => { index !== i });\n\
      return filteredTodoList;\n\
    }\n\n\
    const toggle: (i: number, todoList: Todo[]) => Todo[] = (i, todoList) => {\n\
      const toggledTodoList = todoList.map((todo, index) => {\n\
        if (index === i) {\n\
          return [todo[0], !todo[0]];\n\
        }\n\n\
        return todo\n\
      });\n\n\
      return toggledTodoList;\n\
    }\n\n\
    switch (a) {\n\
      case AddTodo:\n\
        return ['', add(m[0], m[1])]\n\
      case RemoveTodo:\n\
        return [m[0], remove(a.id, m[1])]\n\
      case ToggleTodo:\n\
        return [m[0], toggle(a.id, m[1])]\n\
      case UpdateBuffer:\n\
        return [a.name, m[1]]\n\
    }\n\
  };";

  let completedSketch = "import { Model, Action, Todo, AddTodo, RemoveTodo, ToggleTodo, UpdateBuffer } from './prelude'\n\
  const update: (m: Model, a: Action) => Model = (m, a) => {\n\
    const add: (m: Model) => Todo[] = (mAdd) => {\n\
      if (mAdd[0] === '') {\n\
        return mAdd[1];\n\
      }\n\n\
      return [[mAdd[0], false], ...mAdd[1]] as Todo[];\n\
    };\n\n\
    const remove: (todoId: number, todoList: Todo[]) => Todo[] = (todoId, todoList) => {\n\
      const filteredTodoList = []\n\
      for (let i = 0; i < todoList.length; i++) {\n\
        if (i !== todoId) {\n\
          filteredTodoList.push(todoList[i])\n\
        }\n\
      }\n\
      return filteredTodoList;\n\
    }\n\n\
    const toggle: (i: number, todoList: Todo[]) => Todo[] = (i, todoList) => {\n\
      const toggledTodoList = todoList.map((todo, index) => {\n\
        if (index === i) {\n\
          return [todo[0], !todo[1]] as Todo;\n\
        }\n\n\
        return todo\n\
      });\n\n\
      return toggledTodoList;\n\
    }\n\n\
    if (a.type === 'AddTodo') {\n\
      return ['', add([m[0], m[1]])] as Model\n\
    } else if (a.type === 'RemoveTodo') {\n\
      return [m[0], remove(a.id, m[1])] as Model\n\
    } else if (a.type === 'ToggleTodo') {\n\
      return [m[0], toggle(a.id, m[1])] as Model\n\
    } else {\n\
      return [a.name, m[1]] as Model\n\
    }\n\
  };\n\
  export { update };";

  const llmCompletedSketch = "(m, a) => {\n\
    const add: (m: Model) => Todo[] = (mAdd) => {\n\
      if (mAdd[0] === '') {\n\
        return mAdd[1];\n\
      }\n\n\
      return [[mAdd[0], false], ...mAdd[1]] as Todo[];\n\
    };\n\n\
    const remove: (todoId: number, todoList: Todo[]) => Todo[] = (todoId, todoList) => {\n\
      const filteredTodoList = []\n\
      for (let i = 0; i < todoList.length; i++) {\n\
        if (i !== todoId) {\n\
          filteredTodoList.push(todoList[i])\n\
        }\n\
      }\n\
      return filteredTodoList;\n\
    }\n\n\
    const toggle: (i: number, todoList: Todo[]) => Todo[] = (i, todoList) => {\n\
      const toggledTodoList = todoList.map((todo, index) => {\n\
        if (index !== i) {\n\
          return [todo[0], !todo[1]] as Todo;\n\
        }\n\n\
        return todo\n\
      });\n\n\
      return toggledTodoList;\n\
    }\n\n\
    if (a.type === 'AddTodo') {\n\
      return ['', add([m[0], m[1]])] as Model\n\
    } else if (a.type === 'RemoveTodo') {\n\
      return [m[0], remove(a.id, m[1])] as Model\n\
    } else if (a.type === 'ToggleTodo') {\n\
      return [m[0], toggle(a.id, m[1])] as Model\n\
    } else {\n\
      return [a.name, m[1]] as Model\n\
    }\n\
  };";

  switch (errorRound) {
    case 0:
      return errorSketch1;
    case 1:
      return errorSketch2;
    case 2:
      return completedSketch;
    case 3:
      return llmCompletedSketch;
  }
}

const joinFiles = (files) => {
  let joined = "";

  for (let i = 0; i < files.length; i++) {
    const content = fs.readFileSync(files[i], "utf-8");
    const filtered = removeLines(content);
    joined += filtered.join("\n");
    joined += `\n\n// ${files[i]}\n\n`
  };

  return joined;
}

const removeLines = (fileContent) => {
  const lines = fileContent.split("\n");
  const filtered = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!(line.split(" ").includes("import") || line.split(" ").includes("from") || line.split(" ").includes("export"))) {
      filtered.push(line);
    }
  }

  return filtered;
}

const fillHole = (fileContent, holeContent) => {
  const lines = fileContent.split("\n");
  let inserted = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.split(" ").includes("_()")) {
      inserted = inserted.concat(holeContent.split("\n"));
    } else {
      inserted.push(line);
    }
  }

  return inserted.join("\n");
}

export { generatePrompt, generateTypesAndHeadersPrompt, generateVectorRetrievalPrompt, generateExhaustiveRetrievalPrompt, generateErrorCorrectionPrompt, mockLLM, joinFiles, fillHole };
