declare function _(): (m: Model, a: Action) => Model
import { Model, Action } from "./prelude";

// Handle TODO actions to update the app model
const update: (m: Model, a: Action) => Model =
  _()

export { update };
