const pool = require("../dataBase");

async function getChords() {
    return await pool.query(`
        SELECT * FROM chord_complete_data
    `);
}

async function postChord(creator_id, name, capo, mute, difficult) {
    return await pool.query(
        `INSERT INTO chords (creator_id, name, capo, mute, difficult)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING chord_id`,
        [creator_id, name, capo , mute, difficult]);
}
async function postFingers(chord_id, placeholders, values) {
    return await pool.query(
        `INSERT INTO fingers (chord_id, finger_number, string, fret, barre)
         VALUES ${placeholders}
         RETURNING *`,
        [chord_id, ...values]
    );
}

async function getChordsByCreator(creator_id) {
    return await pool.query(`
        SELECT * FROM chord_complete_data
        WHERE creator_id = $1
    `, [creator_id]);
}

async function getChordById(chord_id) {
    return await pool.query(`
        SELECT * FROM chord_complete_data
        WHERE "chordId" = $1
    `, [chord_id]);
}



async function deleteChord(creator_id, chord_id) {
    return await pool.query(`
        DELETE FROM chords
        WHERE creator_id = $1 AND chord_id = $2
        RETURNING chord_id
    `, [creator_id, chord_id]);
}

async function updateChord(creator_id, chord_id, name, capo, mute, difficult) {
    return await pool.query(`
        UPDATE chords
        SET name = $3, capo = $4, mute = $5, difficult = $6
        WHERE creator_id = $1 AND chord_id = $2
        RETURNING chord_id
    `, [creator_id, chord_id, name, capo, mute, difficult]);
}

async function deleteChordFingers(chord_id) {
    return await pool.query(`
        DELETE FROM fingers
        WHERE chord_id = $1
    `, [chord_id]);
}
module.exports = {
    getChords,
    postChord,
    postFingers,
    getChordsByCreator,
    getChordById,
    deleteChord,
    deleteChordFingers,
    updateChord
};