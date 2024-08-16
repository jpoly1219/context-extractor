(* PLAYLIST MVU PRELUDE *)

(* Non-negative ID for songs *)
(* type Id = Int in *)
type id = int

(* Actions user can do in a playlist *)
(* type PlayListAction = *)
(*   + PlaySong(Id) *)
(*   + PauseCurrentSong *)
(*   + RemoveSong(Id) *)
(*   (* Add to the front of the playList, ignore duplication *) *)
(*   + AddSong(Id) *)
(* in *)
type playlist_action =
  | PlaySong of id
  | PauseCurrentSong
  | RemoveSong of id
  | AddSong of id

(* The state of the playlist *)
(* type PlayListState = *)
(*   + Playing(Id) *)
(*   + PausedOn(Id) *)
(*   + NoSongSelected *)
(* in *)
type playlist_state = Playing of id | PausedOn of id | NoSongSelected

(* A playlist with a list of songs and the current state of the playlist *)
(* type PlayList = ([Id], PlayListState) in *)
type playlist = id list * playlist_state

(* Get all the song ids in the playlist *)
(* let get_songs: PlayList -> [Id] = *)
(*   fun playlist -> *)
(*     let songs, current = playlist in *)
(*     songs  *)
(* in *)
let get_songs (playlist : playlist) : id list =
  let songs, current = playlist in
  songs

(* Get the id of the currently playing song *)
(* let get_state: PlayList -> PlayListState = *)
(*   fun playlist -> *)
(*     let songs, state = playlist in *)
(*     state *)
(* in *)
let get_state (playlist : playlist) : playlist_state =
  let songs, state = playlist in
  state
