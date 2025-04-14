import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { execSync } from "child_process";
import OpenAI from "openai";
import { LspClient, JSONRPCEndpoint, SymbolInformation, Location, Range } from "../ts-lsp-client-dist/src/main";
// import { LspClient, JSONRPCEndpoint } from "ts-lsp-client";
import { Language, LanguageDriver, Context, TypeSpanAndSourceFile, GPT4Config, IDE } from "./types";
// TODO: Bundle the drivers as barrel exports.
import { TypeScriptDriver } from "./typescript-driver";
import { OcamlDriver } from "./ocaml-driver";
import { getAllTSFiles, getAllOCamlFiles, removeLines, getTimestampForFilename } from "./utils";
import { performance } from "perf_hooks";
import { time } from "console";


export class App {
  private language: Language;
  private languageDriver: LanguageDriver;
  private languageServer;
  private lspClient: LspClient;
  private sketchPath: string; // not prefixed with file://
  private repoPath: string; // not prefixed with file://
  // private result: {
  //   hole: string;
  //   relevantTypes: string[];
  //   relevantHeaders: string[];
  // } | null = null;
  private result: Context | null = null;
  private logStream: fs.WriteStream;
  private ide: IDE

  // Optional timeout for forced termination
  // private timeout = setTimeout(() => {
  //   if (!this.languageServer.killed) {
  //     console.log('Forcibly killing the process...');
  //     this.languageServer.kill('SIGKILL');
  //   }
  // }, 5000);



  constructor(language: Language, sketchPath: string, repoPath: string, ide: IDE) {
    this.language = language;
    this.sketchPath = sketchPath;
    this.repoPath = repoPath;

    const r = (() => {
      switch (language) {
        case Language.TypeScript: {
          this.languageDriver = new TypeScriptDriver();
          // PERF: 6ms
          // return spawn("typescript-language-server", ["--stdio", "--log-level", "3"], { stdio: ["pipe", "pipe", "pipe"] });
          return spawn("node", ["/home/jacob/projects/typescript-language-server/lib/cli.mjs", "--stdio", "--log-level", "3"], { stdio: ["pipe", "pipe", "pipe"] });
        }
        case Language.OCaml: {
          this.languageDriver = new OcamlDriver();
          try {
            execSync(`eval $(opam env --switch=. --set-switch)`, { shell: "/bin/bash" })
            // execSync("opam switch .", { shell: "/bin/bash" })
            const currDir = __dirname;
            process.chdir(path.dirname(sketchPath));
            // execSync("which dune", { shell: "/bin/bash" })
            spawn("dune", ["build", "-w"]);
            process.chdir(currDir);
          } catch (err) {
            console.log("ERROR:", err)
          }
          // TODO: Spawn a dune build -w on sketch directory.
          // try {
          //   execSync("which dune", { shell: "/bin/bash" })
          //   spawn("dune", ["build", "-w"]);
          // } catch (err) {
          //   console.log("ERROR:", err)
          // }
          // process.chdir(currDir);
          return spawn("ocamllsp", ["--stdio"]);
        }
      }
    })();
    const e = new JSONRPCEndpoint(r.stdin, r.stdout);
    const c = new LspClient(e);
    this.languageServer = r;
    this.lspClient = c;

    // Logging tsserver output
    const logStream = fs.createWriteStream(`tsserver-${getTimestampForFilename()}.log`, { flags: "w" });
    this.logStream = logStream;
    r.stdout.pipe(this.logStream);
    r.stderr.pipe(this.logStream);

    // Helper function to prepend timestamps
    const logWithTimestamp = (data: Buffer) => {
      const timestamp = new Date().toISOString();
      // console.log(timestamp)
      // console.log(timestamp, data.toString())
      this.logStream.write(`\n\n=*=*=*=*=*=[${timestamp}] ${data.toString()}\n\n`);
    };

    // Capture and log stdout and stderr with timestamps
    r.stdout.on("data", logWithTimestamp);
    r.stderr.on("data", logWithTimestamp);

    // console.log(r.pid)

    this.languageServer.on('close', (code) => {
      if (code !== 0) {
        console.log(`ls process exited with code ${code}`);
      }
    });
    // Clear timeout once the process exits
    this.languageServer.on('exit', () => {
      // clearTimeout(this.timeout);
      this.logStream.close();
      console.log('Process terminated cleanly.');
    });


    // const logFile = fs.createWriteStream("log.txt");
    // r.stdout.on('data', (d) => logFile.write(d));
  }


  async init() {
    await this.languageDriver.init(this.lspClient, this.sketchPath);
  }


  async run() {
    // const outputFile = fs.createWriteStream("output.txt");
    try {

      // PERF: 94ms
      await this.init();

      // console.time("getHoleContext");
      // PERF: 801ms
      const holeContext = await this.languageDriver.getHoleContext(
        this.lspClient,
        this.sketchPath,
      );
      console.dir(holeContext, { depth: null })
      // console.timeEnd("getHoleContext");

      // console.time("extractRelevantTypes");
      // await this.lspClient.documentSymbol({
      //   textDocument: {
      //     uri: `file://${this.repoPath}prelude.ts`,
      //   }
      // });
      // await this.lspClient.documentSymbol({
      //   textDocument: {
      //     uri: `file://${this.repoPath}injected_sketch.ts`,
      //   }
      // });

      // let start = performance.now()
      await this.lspClient.typeDefinition({
        textDocument: {
          uri: `file://${this.repoPath}injected_sketch.ts`,
        },
        position: {
          character: 35,
          line: 1
        }
      });
      // let end = performance.now()
      // console.log("elapsed:", end - start)

      const start = performance.now()
      const relevantTypes = await this.languageDriver.extractRelevantTypes(
        this.lspClient,
        // NOTE: sometimes fullHoverResult isn't representative of the actual file contents, especially with generic functions.
        holeContext.trueHoleFunction ? holeContext.trueHoleFunction : holeContext.fullHoverResult,
        holeContext.functionName,
        holeContext.range.start.line,
        new Map<string, TypeSpanAndSourceFile>(),
        holeContext.source,
        new Map<string, string>(),
        this.logStream
      );
      const end = performance.now()
      console.log("elapsed:", end - start)
      // this.logStream.write(`\n\n=*=*=*=*=*=[begin extracting relevant headers][${new Date().toISOString()}]\n\n`);
      // const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
      // (async () => {
      //   console.log("Waiting...");
      //   await sleep(2000);
      //   console.log("Done!");
      // })();
      // console.timeEnd("extractRelevantTypes");

      // console.dir(relevantTypes, { depth: null })

      // Postprocess the map.
      // console.time("extractRelevantTypes postprocess");
      // if (this.language === Language.TypeScript) {
      //   relevantTypes.delete("_()");
      //   for (const [k, { typeSpan: v, sourceFile: src }] of relevantTypes.entries()) {
      //     relevantTypes.set(k, { typeSpan: v.slice(0, -1), sourceFile: src });
      //   }
      // } else if (this.language === Language.OCaml) {
      //   relevantTypes.delete("_");
      // }
      // console.timeEnd("extractRelevantTypes postprocess");


      // console.time("extractRelevantHeaders repo");
      let repo: string[] = [];
      if (this.language === Language.TypeScript) {
        repo = getAllTSFiles(this.repoPath);
      } else if (this.language === Language.OCaml) {
        repo = getAllOCamlFiles(this.repoPath);
      }
      // console.timeEnd("extractRelevantHeaders repo");

      // console.time("extractRelevantHeaders");

      const relevantHeaders = await this.languageDriver.extractRelevantHeaders(
        this.lspClient,
        repo,
        relevantTypes,
        holeContext.functionTypeSpan,
        this.repoPath
      );
      // const relevantHeaders: { typeSpan: string, sourceFile: string }[] = []
      // console.timeEnd("extractRelevantHeaders");

      // console.log(relevantHeaders)
      // console.log(relevantHeaders.size)
      // console.dir(relevantHeaders, { depth: null })

      // Postprocess the map.
      // console.time("extractRelevantHaders postprocess");
      // if (this.language === Language.TypeScript) {
      //   relevantTypes.delete("");
      //   for (const [k, { typeSpan: v, sourceFile: src }] of relevantTypes.entries()) {
      //     relevantTypes.set(k, { typeSpan: v + ";", sourceFile: src });
      //   }
      //   for (const obj of relevantHeaders) {
      //     obj.typeSpan += ";";
      //   }
      // }
      // console.timeEnd("extractRelevantHeaders postprocess");

      // console.time("toReturn");
      const relevantTypesToReturn: Map<string, string[]> = new Map<string, string[]>();
      relevantTypes.forEach(({ typeSpan: v, sourceFile: src }, _) => {
        if (relevantTypesToReturn.has(src)) {
          const updated = relevantTypesToReturn.get(src)!;
          updated.push(v);
          relevantTypesToReturn.set(src, updated);
        } else {
          relevantTypesToReturn.set(src, [v]);
        }
      })


      const relevantHeadersToReturn: Map<string, string[]> = new Map<string, string[]>();
      relevantHeaders.forEach(({ typeSpan: v, sourceFile: src }) => {
        // console.log(v, src)
        if (relevantHeadersToReturn.has(src)) {
          const updated = relevantHeadersToReturn.get(src)!;
          if (!updated.includes(v)) {
            updated.push(v);
          }
          relevantHeadersToReturn.set(src, updated);
        } else {
          relevantHeadersToReturn.set(src, [v]);
        }
      })
      // console.timeEnd("toReturn");

      this.result = {
        holeType: holeContext.functionTypeSpan,
        relevantTypes: relevantTypesToReturn,
        relevantHeaders: relevantHeadersToReturn
      };
    } catch (err) {
      console.error("Error during execution:", err);
      throw err;
    } finally {
      // outputFile.end();
    }
  }


  close() {
    // TODO:
    try {
      this.lspClient.exit();
    } catch (err) {
      console.log(err)
    }
  }


  getSavedResult() {
    // console.dir(this.result, { depth: null })
    return this.result;
  }

  // async completeWithLLM(targetDirectoryPath: string, context: Context) {
  //   try {
  //     return await this.languageDriver.completeWithLLM(targetDirectoryPath, context);
  //   } catch (err) {
  //     console.error("Error during execution:", err);
  //     throw err;
  //   }
  // }

  // async correctWithLLM(targetDirectoryPath: string, context: Context, message: string) {
  //   return await this.languageDriver.correctWithLLM(targetDirectoryPath, context, message);
  // }
}

export class CompletionEngine {
  private language: Language;
  private config: GPT4Config;
  private sketchPath: string;

  constructor(language: Language, sketchPath: string, configPath: string) {
    this.language = language;
    this.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    this.sketchPath = sketchPath;
  }

  async completeWithLLM(context: Context): Promise<string> {
    let joinedTypes = "";
    let joinedHeaders = "";
    context.relevantTypes.forEach((v, _) => {
      joinedTypes = joinedTypes + v.join("\n") + "\n";
    })
    context.relevantHeaders.forEach((v, _) => {
      joinedHeaders = joinedHeaders + v.join("\n") + "\n";
    })
    // Create a prompt.
    const prompt = this.generateTypesAndHeadersPrompt(
      // fs.readFileSync(path.join(targetDirectoryPath, "sketch.ts"), "utf8"),
      fs.readFileSync(this.sketchPath, "utf8"),
      context.holeType,
      joinedTypes,
      joinedHeaders
    );

    // Call the LLM to get completion results back.
    const apiBase = this.config.apiBase;
    const deployment = this.config.deployment;
    const model = this.config.gptModel;
    const apiVersion = this.config.apiVersion;
    const apiKey = this.config.apiKey;

    const openai = new OpenAI({
      apiKey,
      baseURL: `${apiBase}/openai/deployments/${deployment}`,
      defaultQuery: { "api-version": apiVersion },
      defaultHeaders: { "api-key": apiKey }
    })

    const llmResult = await openai.chat.completions.create({
      model,
      messages: prompt as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: this.config.temperature
    })

    return llmResult.choices[0].message.content!;
  }

  generateTypesAndHeadersPrompt(sketchFileContent: string, holeType: string, relevantTypes: string, relevantHeaders: string) {
    let holeConstruct = "";
    switch (this.language) {
      case Language.TypeScript: {
        holeConstruct = "_()";
      }
      case Language.OCaml: {
        holeConstruct = "_"
      }
    }

    const prompt = [{
      role: "system",
      content:
        [
          "CODE COMPLETION INSTRUCTIONS:",
          `- Reply with a functional, idiomatic replacement for the program hole marked '${holeConstruct}' in the provided TypeScript program sketch`,
          `- Reply only with a single replacement term for the unqiue distinguished hole marked '${holeConstruct}'`,
          "Reply only with code",
          "- DO NOT include the program sketch in your reply",
          "- DO NOT include a period at the end of your response and DO NOT use markdown",
          "- DO NOT include a type signature for the program hole, as this is redundant and is already in the provided program sketch"
        ].join("\n"),
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
}
