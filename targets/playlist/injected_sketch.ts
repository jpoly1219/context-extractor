declare function _(): (pl: PlayList, pla: PlayListAction) => PlayList
import { PlayList, PlayListAction } from "./prelude";

// Update Playlist app model based on an action
const update: (pl: PlayList, pla: PlayListAction) => PlayList =
  _()

export { update };
