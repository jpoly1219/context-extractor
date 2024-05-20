// Get all the song ids in the playList
const get_songs = (playlist) => {
    const [songs, _] = playlist;
    return songs;
};
// Get the id of the currently playing song
const get_state = (playlist) => {
    const [_, state] = playlist;
    return state;
};
export { get_songs, get_state };
