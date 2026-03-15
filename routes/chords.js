const express = require("express");
const pool = require("../dataBase");
const { checkToken } = require("../tokens");
const router = express.Router();

router.get("/", async (req, res) => {
    /*const verified = checkToken(req.headers);
    let addStaredChord = null;
    if (verified) {
        member_id = verified.user_id;
    }*/
    try {
        const result = await pool.query(`
            SELECT
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
        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});




router.post("/", async (req, res) => {
    const verified = checkToken(req.headers);
    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }
    const creator_id = verified.user_id;
    const { name, capo, mute, difficult } = req.body;

    if (mute > 63 || !Number.isInteger(mute)) {
        return res.status(400).json({ message: "Invalid mute" });
    }

    try {
        const chord_result = await pool.query(
            `INSERT INTO chords (creator_id, name, capo, mute, difficult)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING chord_id`,
            [creator_id, name, capo || 0, mute, difficult || false]
        );

        const chord_id = chord_result.rows[0].chord_id;

        //יצירת אצבעות

        let fingers = req.body.fingers;
        let values = [];
        let placeholders = [];

        fingers = fingers.map((finger, index) => {
            return [index + 1, finger.string, finger.fret, finger.barre, finger.isExist];
        });
        fingers = fingers.filter(finger => finger[4]); // keep only existing fingers

        if (fingers.length > 0) {//כדי למנו מצב שהשאילת ריקה
            for (let i = 0; i < fingers.length; i++) {
                placeholders.push(`($${1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`);
                values.push(fingers[i][0], fingers[i][1], fingers[i][2], fingers[i][3]);
            }
            placeholders = placeholders.join(", ");


            const finger_result = await pool.query(
                `INSERT INTO fingers (chord_id, finger_number, string, fret, barre)
                VALUES ${placeholders}
                RETURNING *
                `,
                
                [chord_id, ...values]
            );

            res.json("fingers", finger_result.rows);
        }else{
            res.json({ message: "Chord created without fingers" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});



router.get("/:id", async (req, res) => {
    const creator_id = req.params.id;

    if (!creator_id) {
        return res.status(400).json({ message: "Creator ID is required" });
    }
    try {
        const result = await pool.query(`
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
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/:id", async (req, res) => {
    const verified = checkToken(req.headers);
    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }

    const creator_id = verified.user_id;
    const chord_id = req.params.id;
    try {
        const result = await pool.query(`
            DELETE FROM chords
            WHERE creator_id = $1 AND chord_id = $2
            RETURNING chord_id
            `, [creator_id, chord_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Chord not found" });
        }
        res.json({ message: "Chord deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;
