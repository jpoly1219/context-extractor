# context-extractor

Extract relevant context from a TypeScript codebase using PL theory concepts.

## Installation

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
git checkout -b completion
git pull origin completion
npm install
npm run build
```

## How it works

`context-extractor` takes several steps to extract relevant types and headers:

1. Determine the type of the hole.
2. Extract relevant types.
3. Extract relevant headers.

### Determining the type of the hole

We use CodeQL to determine the type of the hole.
We denote `_()` to be the hole construct.
Using CodeQL, we find the AST node whose string representation includes `_()`.
Then we climb up the tree to find the enclosing statement, and its type annotation.
Note the term *type annotation*. CodeQL cannot infer the type of a given hole.
Every statement with a hole must include an explicit type annotation.
We are looking into ways to infer the type of the hole.

### Extracting relevant types

Once we have the type of the hole, we recursively extract types from its components.
For example, if the hole type includes `Model` and `Action`, we do the following:

- Visit those types.
- Get their definitions.
- Recurse on their components, until we reach primitive types.

In the end, we save all discovered relevant types into a map.

### Extracting relevant headers

This step follows that of the OOPSLA paper.
We find headers whose types are consistent with our target types.
The target types are as follows:

- The type of the hole itself. (Model, Action) => Model
- If the hole is a function, its return type.
- If the hole is a tuple, its component types.
- Recurse.

At this point, we have two different ways to check for consistency:

- Generate normal forms of both types and check whether they are the same.
- Use `tsc` to check if the following function compiles: `function check (a: HeaderType): TargetType { return a };`
- (possibly) Recursively extract types from headers. For each header, check if there are any common subsets between it's recursive types and target types. (possibly a faster normal form checker)

We use CodeQL to get all headers in the codebase, then sift through each one to extract the relevant ones.
We finally save these into a map.

## Limitations
