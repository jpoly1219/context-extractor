import { extract } from "./main";
extract("/home/jacob/projects/context-extractor/targets/todo/sketch.ts").then(r => console.log("todo\n", r));
extract("/home/jacob/projects/context-extractor/targets/playlist/sketch.ts").then(r => console.log("playlist\n", r));
extract("/home/jacob/projects/context-extractor/targets/passwords/sketch.ts").then(r => console.log("passwords\n", r));
extract("/home/jacob/projects/context-extractor/targets/booking/sketch.ts").then(r => console.log("booking\n", r));
extract("/home/jacob/projects/context-extractor/targets/emojipaint/sketch.ts").then(r => console.log("emojipaint\n", r));