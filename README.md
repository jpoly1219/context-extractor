# context-extractor

Extract relevant context from a codebase using a type-directed approach.

## Installation

Clone this repo.

Install the following dependencies:

```text
npm install -g typescript-language-server typescript tsc
```

Clone the `ts-lsp-client` repo:

```text
https://github.com/jpoly1219/ts-lsp-client
```

... and run these commands:

```text
cd ts-lsp-client
npm install
npm run build
```

For OCaml support, you need the standard OCaml 5.0.0 [setup](https://ocaml.org/docs/installing-ocaml).

Once that is done, you should be able to toggle the local switch in this repo.

After you activate the local switch, install the following dependencies:

```text
opam install dune ocamllsp
```

## How it works

`context-extractor` takes several steps to extract relevant types and headers:

1. Determine the type of the hole.
2. Extract relevant types.
3. Extract relevant headers.

This library exposes the API `extractWithNew`, which has the following definition:
```ts
const extractWithNew = async (language: Language, sketchPath: string, credentialsPath: string) => {}

enum Language {
  TypeScript,
  OCaml
}
```

`sketchPath` is the full path to your `sketch.ts` or `sketch.ml` file.
`credentialsPath` is the full path to your `credentials.json`.

### credentials.json

The extractor calls OpenAI for code completion.
For this you need a `credentials.json` file that holds your specific OpenAI parameters.

The json has the following format:

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
