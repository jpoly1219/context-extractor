import * as path from "path";

const CODEQL_PATH = path.join("opt", "codeql", "codeql");
const ROOT_DIR = path.join("~", "projects", "context-extractor");
const QUERY_DIR = path.join("~", "projects", "context-extractor", "queries", "codeql-custom-queries-javascript");
const TARGET_DIR = path.join("~", "projects", "context-extractor", "targets");
const TODO_DIR = path.join("~", "projects", "context-extractor", "targets", "todo");
const PLAYLIST_DIR = path.join("~", "projects", "context-extractor", "targets", "playlist");
const PASSWORDS_DIR = path.join("~", "projects", "context-extractor", "targets", "passwords");
const BOOKING_DIR = path.join("~", "projects", "context-extractor", "targets", "booking");
const EMOJIPAINT_DIR = path.join("~", "projects", "context-extractor", "targets", "emojipaint");

export { CODEQL_PATH, ROOT_DIR, QUERY_DIR, TARGET_DIR, TODO_DIR, PLAYLIST_DIR, PASSWORDS_DIR, BOOKING_DIR, EMOJIPAINT_DIR };
