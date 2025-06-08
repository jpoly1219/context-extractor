import { completeWithLLM, extractContext, extractContextWithReuse, spawnApp } from "./main";
import { Context, IDE, Language } from "./types";
import * as pprof from "pprof"
import * as fs from "fs"

// extract("/home/jacob/projects/context-extractor/targets/todo/sketch.ts").then(r => console.log("todo\n", r));
// extract("/home/jacob/projects/context-extractor/targets/playlist/sketch.ts").then(r => console.log("playlist\n", r));
// extract("/home/jacob/projects/context-extractor/targets/passwords/sketch.ts").then(r => console.log("passwords\n", r));
// extract("/home/jacob/projects/context-extractor/targets/booking/sketch.ts").then(r => console.log("booking\n", r));
// extract("/home/jacob/projects/context-extractor/targets/emojipaint/sketch.ts").then(r => console.log("emojipaint\n", r));
(async () => {
  const profile = await pprof.time.start(10000); // Collect for 10s
  try {
    let x;
    x = await extractContext(
      Language.TypeScript,
      "/home/jacob/projects/context-extractor/targets/booking/sketch.ts",
      "/home/jacob/projects/context-extractor/targets/booking/",
      IDE.Standalone
    )
    console.dir(x, { depth: null })
  } catch (err) {
    console.log("top level err: ", err)
  } finally {
    const buf = await pprof.encode(profile());
    fs.writeFile('wall.pb.gz', buf, (err) => {
      if (err) throw err;
    });
  }
})();

(async () => {
  // try {
  const app = spawnApp(
    Language.TypeScript,
    // "/home/jacob/projects/context-extractor/targets/vscode/src/main.ts",
    // "/home/jacob/projects/context-extractor/targets/vscode/",
    "/home/jacob/projects/context-extractor/targets/booking/sketch.ts",
    "/home/jacob/projects/context-extractor/targets/booking/",
    IDE.Standalone
  )

  const x = await extractContextWithReuse(app, 0);
  console.dir(x, { depth: null })

  // for (let i = 0; i < 11; ++i) {
  //
  //   await (async (ms: number) => new Promise((r) => setTimeout(r, ms)))(2000)
  //
  //   try {
  //     console.log(`loop ${i}`)
  //     let start = performance.now();
  //     const x = await extractContextWithReuse(app, i);
  //     let end = performance.now();
  //     console.log(end - start);
  //     // console.dir(x, { depth: null })
  //   } catch (err) {
  //     console.log("error!")
  //     continue;
  //   }
  //
  // }

  app.close()
  // } catch (err) {
  //   console.error(err)
  // }
});

(async () => {
  // const profile = await pprof.time.start(10000); // Collect for 10s
  try {
    let x;
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/vscode/src/main.ts",
    //   "/home/jacob/projects/context-extractor/targets/vscode/",
    //   IDE.Standalone
    // )
    // console.dir(x, { depth: null })
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/angular/packages/elements/src/utils.ts",
    //   "/home/jacob/projects/context-extractor/targets/angular/",
    // )
    // console.dir(x, { depth: null })
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/ionic-framework/core/src/components/img/img.tsx",
    //   "/home/jacob/projects/context-extractor/targets/ionic-framework/",
    // )
    // console.dir(x, { depth: null })
    //
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/todo/sketch.ts",
    //   "/home/jacob/projects/context-extractor/targets/todo/",
    // )
    // console.dir(x, { depth: null })
    //
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/playlist/sketch.ts",
    //   "/home/jacob/projects/context-extractor/targets/playlist/",
    // )
    // console.dir(x, { depth: null })
    //
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/passwords/sketch.ts",
    //   "/home/jacob/projects/context-extractor/targets/passwords/",
    // )
    // console.dir(x, { depth: null })
    //
    x = await extractContext(
      Language.TypeScript,
      "/home/jacob/projects/context-extractor/targets/booking/sketch.ts",
      "/home/jacob/projects/context-extractor/targets/booking/",
      IDE.Standalone
    )
    console.dir(x, { depth: null })
    //
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/emojipaint/sketch.ts",
    //   "/home/jacob/projects/context-extractor/targets/emojipaint/",
    // )
    // console.dir(x, { depth: null })
    // x = await extractContext(
    //   Language.TypeScript,
    //   "/home/jacob/projects/continue/manual-testing-sandbox/booking/sketch.ts",
    //   "/home/jacob/projects/continue/manual-testing-sandbox/booking",
    // )
    // console.dir(x, { depth: null })

    // const y = await completeWithLLM(
    //   x!,
    //   Language.TypeScript,
    //   "/home/jacob/projects/context-extractor/targets/todo/sketch.ts",
    //   "/home/jacob/projects/context-extractor/credentials.json"
    // )
    //
    // console.dir(y)

    // const y = await extractContext(
    //   Language.OCaml,
    //   "/home/jacob/projects/context-extractor/targets/ocaml/todo/sketch.ml",
    //   "/home/jacob/projects/context-extractor/targets/ocaml/todo/",
    //   "/home/jacob/projects/context-extractor/config.json"
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
  // const buf = await pprof.encode(profile());
  // fs.writeFile('wall.pb.gz', buf, (err) => {
  //   if (err) throw err;
  // });
});


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
