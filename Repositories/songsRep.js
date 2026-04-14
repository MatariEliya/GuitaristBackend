const pool = require("../dataBase");

async function getSongsByCreator(creatorId) {
    return await pool.query(`
        SELECT 
            songs.song_id AS "songID",
            songs.name AS "songName",
            songs.artist_name AS "artist"
        FROM songs
        WHERE songs.creator_id = $1
    `, [creatorId]);
}

async function getSongsByUser(userId, search) {
    return await pool.query(`
        SELECT 
            songs.song_id AS "songID",
            songs.name AS "songName",
            songs.artist_name AS "artist",
            CASE 
                WHEN $1::int IS NOT NULL THEN EXISTS (
                    SELECT 1 
                    FROM user_favorite_songs f
                    WHERE f.song_id = songs.song_id 
                    AND f.user_id = $1
                )
                ELSE false
            END AS "favorite"
        FROM songs
        WHERE $2::text IS NULL OR (songs.name ILIKE '%' || $2::text || '%' OR songs.artist_name ILIKE '%' || $2::text || '%')
    `, [userId, search]);
}

async function getSongChords(songId) {
    return await pool.query(`
        SELECT
            chords.chord_id AS "chordId",
            chords.name,
            chords.capo,
            chords.mute,
            chords.difficult,
            COALESCE(
                json_agg(
                    json_build_object(
                        'string', COALESCE(fingers.string, 0),
                        'fret', COALESCE(fingers.fret, 0),
                        'barre', COALESCE(fingers.barre, 0),
                        'isExist', CASE 
                            WHEN fingers.chord_id IS NULL THEN false 
                            ELSE true 
                        END
                    ) ORDER BY f_num.finger_number
                ),
                '[]'
            ) AS fingers
        FROM song_chords
        JOIN chords 
            ON chords.chord_id = song_chords.chord_id
        CROSS JOIN LATERAL generate_series(1,4) AS f_num(finger_number)
        LEFT JOIN fingers 
            ON fingers.chord_id = chords.chord_id
            AND fingers.finger_number = f_num.finger_number
        WHERE song_chords.song_id = $1
        GROUP BY chords.chord_id, chords.name, chords.capo, chords.mute, chords.difficult, song_chords.chord_index
        ORDER BY song_chords.chord_index
    `, [songId]);
}

async function getSongById(songId, userId) {
    return await pool.query(`
        SELECT 
            s.song_id AS "songID",
            s.name AS "songName",
            s.artist_name AS "artist",
            s.start_on_right AS "startOnRight",
            s.lyrics AS "lyrics",
            CASE 
                WHEN $1::int IS NOT NULL THEN EXISTS (
                    SELECT 1 
                    FROM user_favorite_songs f
                    WHERE f.song_id = s.song_id 
                    AND f.user_id = $1::int
                )
                ELSE false
            END AS "favorite"
        FROM songs s
        WHERE s.song_id = $2
    `, [userId, songId]);
}


async function getPopularSongs() {
    return await pool.query(`
        SELECT 
            s.song_id AS "songID",
            s.name AS "songName",
            s.artist_name AS "artist",
            COUNT(f.user_id) AS likes_count
        FROM songs s
        LEFT JOIN user_favorite_songs f ON s.song_id = f.song_id
        GROUP BY s.song_id, s.name, s.artist_name
        ORDER BY likes_count DESC
        LIMIT 5
    `);
}


async function addSong(creatorId, name, artistName, startOnRight, lyrics) {
    return await pool.query(`
        INSERT INTO songs (creator_id, name, artist_name, start_on_right, lyrics)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING song_id
    `, [creatorId, name, artistName, startOnRight, lyrics]);
}
async function addSongChords(songId, placeholders, values) {
    return await pool.query(`
        INSERT INTO song_chords (song_id, chord_id, chord_index)
        VALUES ${placeholders.join(", ")}
    `, [songId, ...values]);
}

async function deleteSong(creator_id, song_id) {
    return await pool.query(`
        DELETE FROM songs
        WHERE creator_id = $1 AND song_id = $2
        RETURNING song_id;
    `, [creator_id, song_id]);
}

async function addSongToFavorite(userId, songId) {
    await pool.query(`
        INSERT INTO user_favorite_songs (user_id, song_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, song_id) DO NOTHING
    `, [userId, songId]);
}
async function removeSongFromFavorite(userId, songId) {
    await pool.query(`
        DELETE FROM user_favorite_songs
        WHERE user_id = $1 AND song_id = $2
    `, [userId, songId]);
}

module.exports = {
    getSongsByCreator,
    getSongsByUser,
    getSongById,
    getSongChords,
    getPopularSongs,
    addSong,
    addSongChords,
    deleteSong,
    addSongToFavorite,
    removeSongFromFavorite
};