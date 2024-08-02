// Non-negative ID for songs
type Id = number;

// Actions user can do in a playlist
type PlaySong = { type: "PlaySong"; id: Id; };

type PauseCurrentSong = { type: "PauseCurrentSong"; };

type RemoveSong = { type: "RemoveSong"; id: Id; };

// Add to the from of the playList, ignore duplication
type AddSong = { type: "AddSong"; id: Id; };

type PlayListAction = PlaySong | PauseCurrentSong | RemoveSong | AddSong;

// The state of the playlist
type Playing = { type: "Playing"; id: Id; };

type PausedOn = { type: "PausedOn"; id: Id; };

type NoSongSelected = { type: "NoSongSelected"; };

type PlayListState = Playing | PausedOn | NoSongSelected;

// A playlist with a list of songs and the current state of the playlist
type PlayList = [Id[], PlayListState];

// Get all the song ids in the playList
const get_songs: (playlist: PlayList) => Id[] = (playlist: PlayList) => {
  const [songs, _] = playlist;
  return songs;
};

// Get the id of the currently playing song
const get_state: (playlist: PlayList) => PlayListState = (playlist: PlayList) => {
  const [_, state] = playlist;
  return state;
};

export { Id, PlaySong, PauseCurrentSong, RemoveSong, AddSong, PlayListAction, Playing, PausedOn, NoSongSelected, PlayListState, PlayList, get_songs, get_state };
