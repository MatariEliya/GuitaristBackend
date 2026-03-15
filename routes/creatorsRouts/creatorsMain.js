const express = require("express");
const router = express.Router();
const pool = require("../../dataBase");

const creatorCardRoutes = require("./creatorCard")

router.use("/creatorCard", creatorCardRoutes)
router.use("/requests", require("./requests"))



router.get("/", (req, res) => {
    pool.query(`
        SELECT creator_id AS "profileID", tag1, tag2, tag3, u.username AS "creatorName"
        FROM creator_card
        INNER JOIN users u ON u.user_id = creator_id
        WHERE is_public = true
    `, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }
        res.json(result.rows);
    });
});

router.get("/featured", (req, res) => {

    res.json(creatorsR.slice(0, 5))
});

router.get("/creatorInfo/:id", async (req, res) => {
    const creatorId = req.params.id;
    try {
        const creatorInfo = await pool.query(
            //קבלת נתונים על היוצר
            `SELECT cc.bio, cc.youtube, cc.instagram, cc.tiktok, u.username AS creatorName
            FROM creator_card cc
            INNER JOIN users u ON u.user_id = cc.creator_id
            WHERE cc.creator_id = $1`,
            [creatorId],
        );
        if (!creatorInfo.rows.length) {
            return res.status(404).json({ message: "Creator not found" });
        }
        const result = creatorInfo.rows[0];
        //קבלת שירים של היוצר
        const songs = await pool.query(
            `SELECT song_id AS "songID", name AS "songName", artist_name As "artist"
            FROM songs WHERE creator_id = $1`,
            [creatorId]
        );
        result.songs = songs.rows;

        //קבלת אקורדים של היוצר
        const chords = await pool.query(`
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
        `, [creatorId]);
        result.chords = chords.rows;

        res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router