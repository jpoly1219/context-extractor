declare function _(): (model: Model, action: Action) => Model
import { Model, Action } from "./prelude";

// Update the EmojiPaint app model based on an action
const update: (model: Model, action: Action) => Model =
  _()

export { update };
