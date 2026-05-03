const express = require("express");
const fs = require("fs");
const path = require("path");

const repository = require("../Repositories/songsRep");
const { checkToken, checkTokenMiddleware, checkTokenMiddlewareCreator } = require("../tokens");
const { upload } = require("./uploadImages");

const router = express.Router();

router.get("/", async (req, res) => {
    const userId = checkToken(req.headers)?.user_id;
    const search = req.query.search;
    try {
        const result = await repository.getSongsByUser(userId, search);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }

});
router.get("/byCreator/:creator_id", async (req, res) => {
    const creatorId = req.params.creator_id;

    try {
        const result = await repository.getSongsByCreator(creatorId);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }

});


router.get("/popular", async (req, res) => {
    try {
        const result = await repository.getPopularSongs();

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/:id", async (req, res) => {
    try {
        const songId = req.params.id;
        
        const userId = checkToken(req.headers)?.user_id;

        const songResult = (await repository.getSongById(songId, userId)).rows[0];

        res.json(songResult);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/", checkTokenMiddlewareCreator, upload.single("image"), async (req, res) => {
    try {
        

        const creator_id = req.user.user_id;
        const { songName, artistName, startOnRight, lyrics, chords } = req.body;

        const chordsArray = JSON.parse(chords);

        const result = await repository.addSong(creator_id, songName, artistName, startOnRight, lyrics);
        if (result.rows.length === 0) {
            return res.status(500).json({ message: "Failed to create song" });
        }

        const song_id = result.rows[0].song_id;

        const chordResult = await insertChords(chordsArray, song_id);

        if (!chordResult) {
            return res.status(500).json({ message: "Failed to add song chords" });
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


router.post("/favorite/:id", checkTokenMiddleware, async (req, res) => {

    try {
        const user_id = req.user.user_id;
        const song_id = req.params.id;
        const favorite = req.body.favorite;
        

        if (favorite) {
            await repository.addSongToFavorite(user_id, song_id);
            res.json({ message: "Song added to favorites" });
        }else {
            await repository.removeSongFromFavorite(user_id, song_id);
            res.json({ message: "Song removed from favorites" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.put("/:id", checkTokenMiddlewareCreator, upload.single("image"), async (req, res) => {
    try {
        const creator_id = req.user.user_id;
        const song_id = req.params.id;
        const { songName, artistName, startOnRight, lyrics, chords } = req.body;
        const chordsArray = JSON.parse(chords);

        const result = await repository.updateSong(creator_id, song_id, songName, artistName, startOnRight, lyrics);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Song not found" });
        }
        await repository.deleteSongChords(song_id);

        const chordResult = await insertChords(chordsArray, song_id);

        if (!chordResult) {
            return res.status(500).json({ message: "Failed to update song chords" });
        }

        // שינוי שם הקובץ
        if (req.file) {
            const newPath = path.join(
                __dirname,
                "../images",
                `${song_id}_song.webp`
            );

            fs.renameSync(req.file.path, newPath);
        }else {
            fs.unlink(path.join(__dirname, "../images", `${song_id}_song.webp`), (err) => {
                if (err && err.code !== "ENOENT") {
                    // מתעלם כאשר התמונה לא קיימת
                    console.error("Error deleting image:", err);
                }
            });
        }

        res.json({ message: "Song updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/:id", checkTokenMiddlewareCreator, async (req, res) => {
    try {
        const creator_id = req.user.user_id;
        const song_id = req.params.id;

        const result = await repository.deleteSong(creator_id, song_id);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Song not found" });
        }
        const imagePath = path.join(__dirname, "../images", `${song_id}_song.webp`);
        
        fs.unlink(imagePath, (err) => {
        if (err && err.code !== "ENOENT") {
            // מתעלם כאשר התמונה לא קיימת
            console.error("Error deleting image:", err);
        }
    });
        res.json({ message: "Song deleted" });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});



module.exports = router;


async function insertChords(chordsArray, song_id) {
    const placeholders = [];
    const values = [];

    for (let i = 0; i < chordsArray.length; i++) {
        placeholders.push(`($${1}, $${i * 2 + 2}, $${i * 2 + 3})`);
        values.push(chordsArray[i].chordId, chordsArray[i].indexChord);
    }
    if (placeholders.length > 0) {
        try {
            await repository.addSongChords(song_id, placeholders.join(", "), values);
            return true;
        } catch (error) {
            console.error("Error updating song chords:", error);
            return false;
        }
    }
    return false;

}