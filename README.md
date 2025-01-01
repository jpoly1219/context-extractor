# context-extractor

Extract relevant context from a codebase using a type-directed approach.

## npm Installation

Recommended.

```text
npm i @jpoly1219/context-extractor
```

## Manual Installation

Not recommended. If the above steps do not work, please leave a GitHub issue.

Install the following dependencies:

```text
npm install -g typescript-language-server typescript tsc
```

Clone the `ts-lsp-client` repo:

```text
git clone https://github.com/jpoly1219/ts-lsp-client
```

... and run these commands:

```text
cd ts-lsp-client
npm install
npm run build
```

Clone this repo.

```text
git clone https://github.com/jpoly1219/context-extractor.git
cd context-extractor
npm install
```

For OCaml support, you need to first go through the standard OCaml [setup](https://ocaml.org/docs/installing-ocaml).

Once that is done, you should be able to create a local switch in this repo.

```text
opam switch create ./
eval $(opam env)
```

After you activate the local switch, install the following dependencies:

<!-- TODO: Update dependencies. -->

```text
opam install dune ocaml-lsp-server ounit2
```

We provide you with five OCaml examples, located in `targets/ocaml` directory.
`cd` into each of them and run the following:

```text
dune build
```

Ignore the wildcard build errors. The command is meant to setup the modules and imports.

Almost there! Create a `credentials.json` file following the steps at the **credentials.json** section below in the README.

Finally, build and run.

```text
npm run build
node dist/runner.js
```

## How it works

`context-extractor` takes several steps to extract relevant types and headers:

1. Determine the type of the hole.
2. Extract relevant types.
3. Extract relevant headers.
4. Optionally complete the hole with an LLM.

This library exposes the API `extractContext`, which has the following definition:

```ts
const extractContext = async (
  language: Language,
  sketchPath: string,
  repoPath: string,
  credentialsPath: string,
  getCompletion: boolean
): Promise<{ context: Context | null, completion: string | null }

enum Language {
  TypeScript,
  OCaml,
}

interface Context {
  hole: string,
  relevantTypes: Map<string, string[]>,
  relevantHeaders: Map<string, string[]>
}
```

- `sketchPath` is the full path to your sketch file with the typed hole construct (`_()` for TypeScript, `_` for OCaml).
- `repoPath` is the full path to your repository root.
- `credentialsPath` is the full path to your `credentials.json`.
- `getCompletion` is a flag to set if you want the LLM to complete the typed hole. This completion is saved in the `completion` field of the return result.
- `null` values will only be set if something goes wrong internally. When `getCompletion` is set to false, the `completion` field's value will be an empty string.

### credentials.json

The extractor calls OpenAI for code completion.
For this you need a `credentials.json` file that holds your specific OpenAI parameters.

The json has the following format:

<!-- TODO: This is probably difficult to understand. -->

```json
{
  "apiBase": "<your-api-base-here>",
  "deployment": "<your-deployment-here>",
  "gptModel": "<your-gpt-model-here>",
  "apiVersion": "<your-api-version-here>",
  "apiKey": "<your-api-key-here>",
  "temperature": 0.6
}
```

Internally, this is how fields above are populated when creating a new OpenAI client.

```ts
const openai = new OpenAI({
  apiKey,
  baseURL: `${apiBase}/openai/deployments/${deployment}`,
  defaultQuery: { "api-version": apiVersion },
  defaultHeaders: { "api-key": apiKey }
})
```

## Trying out the VSCode extension

We have a Visual Studio Code extension that provides a frontend to this project.

The extension is not publicly available -- contact me at `jpoly@umich.edu` to request for a .vsix package.
