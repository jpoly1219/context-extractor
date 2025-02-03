import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import { execSync } from "child_process";
import OpenAI from "openai";
// import { LspClient, JSONRPCEndpoint } from "../ts-lsp-client-dist/src/main";
import { LspClient, JSONRPCEndpoint } from "ts-lsp-client";
import { Language, LanguageDriver, Context, TypeSpanAndSourceFile, GPT4Config } from "./types";
// TODO: Bundle the drivers as barrel exports.
import { TypeScriptDriver } from "./typescript-driver";
import { OcamlDriver } from "./ocaml-driver";
import { getAllTSFiles, getAllOCamlFiles, removeLines } from "./utils";


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

  // Optional timeout for forced termination
  private timeout = setTimeout(() => {
    if (!this.languageServer.killed) {
      console.log('Forcibly killing the process...');
      this.languageServer.kill('SIGKILL');
    }
  }, 5000);



  constructor(language: Language, sketchPath: string, repoPath: string) {
    this.language = language;
    this.sketchPath = sketchPath;
    this.repoPath = repoPath;

    const r = (() => {
      switch (language) {
        case Language.TypeScript: {
          this.languageDriver = new TypeScriptDriver();
          return spawn("typescript-language-server", ["--stdio"], { stdio: ["pipe", "pipe", "pipe"] });
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

    this.languageServer.on('close', (code) => {
      if (code !== 0) {
        console.log(`ls process exited with code ${code}`);
      }
    });
    // Clear timeout once the process exits
    this.languageServer.on('exit', () => {
      clearTimeout(this.timeout);
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

      await this.init();

      const holeContext = await this.languageDriver.getHoleContext(
        this.lspClient,
        this.sketchPath,
      );

      const relevantTypes = await this.languageDriver.extractRelevantTypes(
        this.lspClient,
        holeContext.fullHoverResult,
        holeContext.functionName,
        holeContext.range.start.line,
        holeContext.range.end.line,
        new Map<string, TypeSpanAndSourceFile>(),
        holeContext.source,
      );

      // Postprocess the map.
      if (this.language === Language.TypeScript) {
        relevantTypes.delete("_()");
        for (const [k, { typeSpan: v, sourceFile: src }] of relevantTypes.entries()) {
          relevantTypes.set(k, { typeSpan: v.slice(0, -1), sourceFile: src });
        }
      } else if (this.language === Language.OCaml) {
        relevantTypes.delete("_");
      }

      console.log(path.join(path.dirname(this.sketchPath), `sketch${path.extname(this.sketchPath)}`))

      let repo: string[] = [];
      if (this.language === Language.TypeScript) {
        repo = getAllTSFiles(this.repoPath);
      } else if (this.language === Language.OCaml) {
        repo = getAllOCamlFiles(this.repoPath);
      }

      const relevantHeaders = await this.languageDriver.extractRelevantHeaders(
        this.lspClient,
        repo,
        relevantTypes,
        holeContext.functionTypeSpan
      );

      // Postprocess the map.
      if (this.language === Language.TypeScript) {
        relevantTypes.delete("");
        for (const [k, { typeSpan: v, sourceFile: src }] of relevantTypes.entries()) {
          relevantTypes.set(k, { typeSpan: v + ";", sourceFile: src });
        }
        for (const obj of relevantHeaders) {
          obj.typeSpan += ";";
        }
      }

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
