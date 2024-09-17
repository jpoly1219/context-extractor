(* PLAYLIST MVU PRELUDE *)

type id = int

(* Actions user can do in a playlist *)
type playlist_action =
  | PlaySong of id
  | PauseCurrentSong
  | RemoveSong of id
  | AddSong of id

(* The state of the playlist *)
type playlist_state = Playing of id | PausedOn of id | NoSongSelected

(* A playlist with a list of songs and the current state of the playlist *)
type playlist = id list * playlist_state

(* Get all the song ids in the playlist *)
let get_songs (playlist : playlist) : id list =
  let songs, _ = playlist in
  songs

(* Get the id of the currently playing song *)
let get_state (playlist : playlist) : playlist_state =
  let _, state = playlist in
  state
