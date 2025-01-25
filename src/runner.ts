import { completeWithLLM, extractContext } from "./main";
import { Context, Language } from "./types";

// extract("/home/jacob/projects/context-extractor/targets/todo/sketch.ts").then(r => console.log("todo\n", r));
// extract("/home/jacob/projects/context-extractor/targets/playlist/sketch.ts").then(r => console.log("playlist\n", r));
// extract("/home/jacob/projects/context-extractor/targets/passwords/sketch.ts").then(r => console.log("passwords\n", r));
// extract("/home/jacob/projects/context-extractor/targets/booking/sketch.ts").then(r => console.log("booking\n", r));
// extract("/home/jacob/projects/context-extractor/targets/emojipaint/sketch.ts").then(r => console.log("emojipaint\n", r));

(async () => {
  try {
    const x = await extractContext(
      Language.TypeScript,
      "/home/jacob/projects/context-extractor/targets/todo/sketch.ts",
      "/home/jacob/projects/context-extractor/targets/todo/",
      "/home/jacob/projects/context-extractor/credentials.json"
    )
    console.dir(x, { depth: null })

    const y = await completeWithLLM(
      x!,
      Language.TypeScript,
      "/home/jacob/projects/context-extractor/targets/todo/sketch.ts",
      "/home/jacob/projects/context-extractor/credentials.json"
    )

    console.dir(y)

    // const y = await extractContext(
    //   Language.OCaml,
    //   "/home/jacob/projects/context-extractor/targets/ocaml/todo/sketch.ml",
    //   "/home/jacob/projects/context-extractor/targets/ocaml/todo/",
    //   "/home/jacob/projects/context-extractor/credentials.json"
    // );
    // console.dir(y, { depth: null })
  } catch (err) {
    console.log("top level err: ", err)
  } finally {
    // Debug active handles if the app doesn't terminate
    // if ((process as any)._getActiveHandles().length > 0) {
    //   // console.log(`${(process as any)._getActiveHandles().length} active handles detected:`);
    //   // console.log((process as any)._getActiveHandles());
    //   console.log(`${(process as any)._getActiveHandles().length} active handles detected.`);
    // }
    // process.exit(0);
  }
})();


// extractWithNew(Language.TypeScript, "/home/jacob/projects/context-extractor/targets/playlist/sketch.ts", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("playlist\n", r));
// extractWithNew(Language.TypeScript, "/home/jacob/projects/context-extractor/targets/passwords/sketch.ts", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("passwords\n", r));
// extractWithNew(Language.TypeScript, "/home/jacob/projects/context-extractor/targets/booking/sketch.ts", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("booking\n", r));
// extractWithNew(Language.TypeScript, "/home/jacob/projects/context-extractor/targets/emojipaint/sketch.ts", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("emojipaint\n", r));
// extractWithNew(Language.OCaml, "/home/jacob/projects/context-extractor/targets/ocaml/todo/sketch.ml", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("todo\n", r));
// extractWithNew(Language.OCaml, "/home/jacob/projects/context-extractor/targets/ocaml/playlist/sketch.ml", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("playlist\n", r));
// extractWithNew(Language.OCaml, "/home/jacob/projects/context-extractor/targets/ocaml/passwords/sketch.ml", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("passwords\n", r));
// extractWithNew(Language.OCaml, "/home/jacob/projects/context-extractor/targets/ocaml/booking/sketch.ml", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("booking\n", r));
// extractWithNew(Language.OCaml, "/home/jacob/projects/context-extractor/targets/ocaml/emojipaint/sketch.ml", "/home/jacob/projects/context-extractor/credentials.json").then(r => console.log("emojipaint\n", r));
// extractWithNew(Language.TypeScript, "/app/targets/todo/sketch.ts").then(r => console.log("todo\n", r));
