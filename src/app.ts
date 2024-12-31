import * as path from "path";
import { spawn } from "child_process";
import { execSync } from "child_process";
import { LspClient, JSONRPCEndpoint } from "../ts-lsp-client-dist/src/main";
import { Language, LanguageDriver, Context, TypeSpanAndSourceFile } from "./types";
// TODO: Bundle the drivers as barrel exports.
import { TypeScriptDriver } from "./typescript-driver";
import { OcamlDriver } from "./ocaml-driver";
import { getAllTSFiles, getAllOCamlFiles } from "./utils";


export class App {
  private language: Language;
  private languageDriver: LanguageDriver;
  private lspClient: LspClient;
  private sketchPath: string; // not prefixed with file://
  private repoPath: string; // not prefixed with file://
  // private result: {
  //   hole: string;
  //   relevantTypes: string[];
  //   relevantHeaders: string[];
  // } | null = null;
  private result: Context | null = null;
  private credentialsPath: string;


  constructor(language: Language, sketchPath: string, repoPath: string, credentialsPath: string) {
    this.language = language;
    this.sketchPath = sketchPath;
    this.repoPath = repoPath;
    this.credentialsPath = credentialsPath;

    const r = (() => {
      switch (language) {
        case Language.TypeScript: {
          this.languageDriver = new TypeScriptDriver();
          return spawn("typescript-language-server", ["--stdio"]);
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
    this.lspClient = c;

    // const logFile = fs.createWriteStream("log.txt");
    // r.stdout.on('data', (d) => logFile.write(d));
  }


  async init() {
    await this.languageDriver.init(this.lspClient, this.sketchPath, this.credentialsPath);
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
        // supportsHole(this.language) ? `file://${this.sketchPath}` : `file://${path.dirname(this.sketchPath)}/injected_sketch${path.extname(this.sketchPath)}`,
        holeContext.source,
        // outputFile
      );
      // console.log(relevantTypes)

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
        // [
        //   path.join(path.dirname(this.sketchPath), `prelude${path.extname(this.sketchPath)}`),
        //   path.join(path.dirname(this.sketchPath), `sketch${path.extname(this.sketchPath)}`),
        //   path.join(path.dirname(this.sketchPath), `epilogue${path.extname(this.sketchPath)}`)
        // ], // TODO: we need to pass all files
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
        hole: holeContext.functionTypeSpan,
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


  async close() {
    // TODO:
    await this.lspClient.shutdown();
  }


  getSavedResult() {
    // console.log(this.result)
    return this.result;
  }

  async completeWithLLM(targetDirectoryPath: string, context: Context) {
    try {
      return await this.languageDriver.completeWithLLM(targetDirectoryPath, context);
    } catch (err) {
      console.error("Error during execution:", err);
      throw err;
    }
  }

  // async correctWithLLM(targetDirectoryPath: string, context: Context, message: string) {
  //   return await this.languageDriver.correctWithLLM(targetDirectoryPath, context, message);
  // }
}
