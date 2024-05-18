import { PlayList, PlayListAction, get_songs, get_state, NoSongSelected } from "./prelude";

// Playlist MVU SOLUTION

// Update playlist based on action
const update = (playlist: PlayList, action: PlayListAction): PlayList => {
  switch (action.type) {
    case "PlaySong":
      return [get_songs(playlist), { type: "Playing", id: action.id }];
    case "PauseCurrentSong":
      const state = get_state(playlist);
      switch (state.type) {
        case "Playing":
          return [get_songs(playlist), { type: "PausedOn", id: state.id }];
        default:
          return [get_songs(playlist), state];
      }
    case "RemoveSong":
      const new_songs = get_songs(playlist).filter((id) => id !== action.id);
      const new_state = (() => {
        const state = get_state(playlist);
        switch (state.type) {
          case "Playing":
            return action.id === state.id ? { type: "NoSongSelected" } as NoSongSelected : state;
          case "PausedOn":
            return action.id === state.id ? { type: "NoSongSelected" } as NoSongSelected : state;
          case "NoSongSelected":
            return { type: "NoSongSelected" } as NoSongSelected;
        }
      })();
      return [new_songs, new_state];
    case "AddSong":
      return [[...get_songs(playlist), action.id], get_state(playlist)];
  }
};

export { update };
