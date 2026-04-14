const pool = require("../dataBase");

async function getChords() {
    return await pool.query(`
        SELECT
            chords.chord_id AS "chordId",
            chords.name,
            chords.capo,
            chords.mute,
            CASE WHEN chords.difficult = true THEN 1 ELSE 0 END AS difficult,
            COALESCE(
                json_agg(
                    json_build_object(
                        'string', COALESCE(fingers.string, 0),
                        'fret', COALESCE(fingers.fret, 0),
                        'barre', COALESCE(fingers.barre, 0),
                        'isExist', CASE WHEN fingers.chord_id IS NULL THEN false ELSE true END
                    ) ORDER BY f_num.finger_number
                ),
                '[]'
            ) AS fingers
        FROM chords
        CROSS JOIN LATERAL generate_series(1, 4) AS f_num(finger_number)
        LEFT JOIN fingers 
            ON fingers.chord_id = chords.chord_id 
        AND fingers.finger_number = f_num.finger_number
        GROUP BY chords.chord_id, chords.name, chords.capo, chords.mute, chords.difficult;
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
        SELECT
            chords.chord_id AS "chordId",
            chords.name,
            chords.capo,
            chords.mute,
            COALESCE(
                json_agg(
                    json_build_object(
                        'string', COALESCE(fingers.string, 0),
                        'fret', COALESCE(fingers.fret, 0),
                        'barre', COALESCE(fingers.barre, 0),
                        'isExist', CASE WHEN fingers.chord_id IS NULL THEN false ELSE true END
                    ) ORDER BY f_num.finger_number
                ),
                '[]'
            ) AS fingers
        FROM chords
        CROSS JOIN LATERAL generate_series(1, 4) AS f_num(finger_number)
        LEFT JOIN fingers 
            ON fingers.chord_id = chords.chord_id 
        AND fingers.finger_number = f_num.finger_number
        WHERE chords.creator_id = $1
        GROUP BY chords.chord_id, chords.name, chords.capo, chords.mute, chords.difficult;
    `, [creator_id]);
}

async function deleteChord(creator_id, chord_id) {
    return await pool.query(`
        DELETE FROM chords
        WHERE creator_id = $1 AND chord_id = $2
        RETURNING chord_id
    `, [creator_id, chord_id]);
}

module.exports = {
    getChords,
    postChord,
    postFingers,
    getChordsByCreator,
    deleteChord
};