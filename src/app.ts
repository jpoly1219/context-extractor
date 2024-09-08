import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { LspClient, JSONRPCEndpoint } from "../ts-lsp-client-dist/src/main";
import { Language, LanguageDriver } from "./types";
// TODO: Bundle the drivers as barrel exports.
import { TypeScriptDriver } from "./typescript-driver";
import { OcamlDriver } from "./ocaml-driver";
import { supportsHole } from "./utils";


export class App {
  private language: Language;
  private languageDriver: LanguageDriver;
  private lspClient: LspClient;
  private sketchPath: string; // not prefixed with file://
  private result: {
    hole: string;
    relevantTypes: string[];
    relevantHeaders: string[];
  } | null = null;


  constructor(language: Language, sketchPath: string) {
    this.language = language;
    this.sketchPath = sketchPath;

    const r = (() => {
      switch (language) {
        case Language.TypeScript: {
          this.languageDriver = new TypeScriptDriver();
          return spawn("typescript-language-server", ["--stdio"]);
        }
        case Language.OCaml: {
          this.languageDriver = new OcamlDriver();
          // TODO: Spawn a dune build -w on sketch directory.
          return spawn("ocamllsp", ["--stdio"]);
        }
      }
    })();
    const e = new JSONRPCEndpoint(r.stdin, r.stdout);
    const c = new LspClient(e);
    this.lspClient = c;

    const logFile = fs.createWriteStream("log.txt");
    r.stdout.on('data', (d) => logFile.write(d));
  }


  async init() {
    await this.languageDriver.init(this.lspClient, this.sketchPath);
  }


  async run() {
    const outputFile = fs.createWriteStream("output.txt");

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
      new Map<string, string>(),
      supportsHole(this.language) ? `file://${this.sketchPath}` : `file://${path.dirname(this.sketchPath)}/injected_sketch${path.extname(this.sketchPath)}`,
      outputFile
    );
    console.log(relevantTypes)

    // Postprocess the map.
    relevantTypes.delete("_");
    relevantTypes.delete("_()");
    if (this.language === Language.TypeScript) {
      for (const [k, v] of relevantTypes.entries()) {
        relevantTypes.set(k, v.slice(0, -1));
      }
    }

    const relevantHeaders = await this.languageDriver.extractRelevantHeaders(
      this.lspClient,
      path.join(path.dirname(this.sketchPath), `prelude${path.extname(this.sketchPath)}`),
      relevantTypes,
      holeContext.functionTypeSpan
    );

    this.result = {
      hole: holeContext.functionTypeSpan,
      relevantTypes: Array.from(relevantTypes, ([_, v]) => { return v }),
      relevantHeaders: relevantHeaders
    };
  }


  close() {
    // TODO:
    this.lspClient.shutdown();
  }


  getSavedResult() {
    return this.result;
  }

  async completeWithLLM() {
    return await this.languageDriver.completeWithLLM();
  }
}
