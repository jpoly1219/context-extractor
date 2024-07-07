// import * as path from "path";
// import * as process from "process";
//
//
// const ROOT_DIR = process.cwd();
// const CODEQL_PATH = path.join(ROOT_DIR, "codeql", "codeql");
// const QUERY_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "queries", "codeql-custom-queries-javascript");
// const TARGET_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "targets");
// const TODO_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "targets", "todo");
// const PLAYLIST_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "targets", "playlist");
// const PASSWORDS_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "targets", "passwords");
// const BOOKING_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "targets", "booking");
// const EMOJIPAINT_DIR = path.join("/", "home", "jacob", "projects", "context-extractor", "targets", "emojipaint");
//
// export { CODEQL_PATH, ROOT_DIR, QUERY_DIR, TARGET_DIR, TODO_DIR, PLAYLIST_DIR, PASSWORDS_DIR, BOOKING_DIR, EMOJIPAINT_DIR };
import * as path from "path";
import * as process from "process";


const ROOT_DIR = path.join("/", "app");
const DEPS_DIR = path.join(ROOT_DIR, "deps");
const CODEQL_PATH = path.join(DEPS_DIR, "codeql", "codeql");
const QUERY_DIR = path.join(DEPS_DIR, "queries", "codeql-custom-queries-javascript");
const TARGET_DIR = path.join(DEPS_DIR, "targets");
const TODO_DIR = path.join(DEPS_DIR, "targets", "todo");
const PLAYLIST_DIR = path.join(DEPS_DIR, "targets", "playlist");
const PASSWORDS_DIR = path.join(DEPS_DIR, "targets", "passwords");
const BOOKING_DIR = path.join(DEPS_DIR, "targets", "booking");
const EMOJIPAINT_DIR = path.join(DEPS_DIR, "targets", "emojipaint");

export { CODEQL_PATH, ROOT_DIR, DEPS_DIR, QUERY_DIR, TARGET_DIR, TODO_DIR, PLAYLIST_DIR, PASSWORDS_DIR, BOOKING_DIR, EMOJIPAINT_DIR };
