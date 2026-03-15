const express = require("express");
const fs = require("fs");
const path = require("path");

const pool = require("../dataBase");
const { checkToken } = require("../tokens");
const { upload, handleUpload } = require("./uploadImages");

const router = express.Router();


router.get("/", async (req, res) => {
    const creatorId = req.query.creatorId

    if(creatorId){
        try {
            const result = await pool.query(`
                SELECT 
                    songs.song_id AS "songID",
                    songs.name AS "songName",
                    songs.artist_name AS "artist"
                FROM songs
                WHERE songs.creator_id = $1
            `, [creatorId]);
            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server error" });
        }
    }else{
        try {
            const result = await pool.query(`
                SELECT 
                    songs.song_id AS "songID",
                    songs.name AS "songName",
                    songs.artist_name AS "artist"
                FROM songs
            `);
            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Server error" });
        }
    }

});


router.get("/:id", async (req, res) => {
    try {
        const songId = req.params.id;

        const songResult = await pool.query(`
            SELECT 
                name AS "songName",
                artist_name AS "artist",
                lyrics
            FROM songs
            WHERE song_id = $1
        `, [songId]);


        //חיפוש אקורדים לפי שיר
        const chordsResult = await pool.query(`
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

        res.json({
            ...songResult.rows[0],
            chords: chordsResult.rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/", checkTokenMiddleware, upload.single("image"), async (req, res) => {
    try {

        const verified = checkToken(req.headers);
        if (!verified?.creator) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const creator_id = verified.user_id;
        const { songName, artistName, lyrics, chords } = req.body;

        const chordsArray = JSON.parse(chords);

        const result = await pool.query(`
            INSERT INTO songs (creator_id, name, artist_name, lyrics)
            VALUES ($1, $2, $3, $4)
            RETURNING song_id;
        `, [creator_id, songName, artistName, lyrics]);

        const song_id = result.rows[0].song_id;

        const placeholders = [];
        const values = [];

        for (let i = 0; i < chordsArray.length; i++) {
            placeholders.push(`($${1}, $${i * 2 + 2}, $${i * 2 + 3})`);
            values.push(chordsArray[i].chordId, chordsArray[i].indexChord);
        }
        if (placeholders.length > 0) {
            await pool.query(`
                INSERT INTO song_chords (song_id, chord_id, chord_index)
                VALUES ${placeholders.join(", ")}
            `, [song_id, ...values]);
        }

        // שינוי שם הקובץ
        if (req.file) {

            const newPath = path.join(
                __dirname,
                "../images",
                `${song_id}_song.webp`
            );

            fs.renameSync(req.file.path, newPath);
        }

        res.json({ songId: song_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/:id", checkTokenMiddleware, async (req, res) => {
    try {
        const verified = checkToken(req.headers);
        if (!verified?.creator) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const creator_id = verified.user_id;
        const song_id = req.params.id;

        const result = await pool.query(`
            DELETE FROM songs
            WHERE creator_id = $1 AND song_id = $2
            RETURNING song_id;
        `, [creator_id, song_id]);

        if (result.rows.length === 0) {
            res.status(404).json({ message: "Song not found" });
        } else {
            res.json({ message: "Song deleted" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});



module.exports = router;



function checkTokenMiddleware(req, res, next) {
    const verified = checkToken(req.headers);
    if (!verified?.creator) return res.status(401).json({ message: "Invalid token" });
    req.user = { username: verified.username, user_id: verified.user_id };
    next();
}


