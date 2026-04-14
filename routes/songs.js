const express = require("express");
const fs = require("fs");
const path = require("path");

const repository = require("../Repositories/songsRep");
const { checkToken } = require("../tokens");
const { upload } = require("./uploadImages");

const router = express.Router();

router.get("/", async (req, res) => {
    const userId = checkToken(req.headers)?.user_id;
    search = req.query.search;
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



        //חיפוש אקורדים לפי שיר
        const chordsResult = await repository.getSongChords(songId);
        res.json({ ...songResult, chords: chordsResult.rows });

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
        const { songName, artistName, startOnRight, lyrics, chords } = req.body;

        const chordsArray = JSON.parse(chords);

        const result = await repository.addSong(creator_id, songName, artistName, startOnRight, lyrics);
        if (result.rows.length === 0) {
            return res.status(500).json({ message: "Failed to create song" });
        }

        const song_id = result.rows[0].song_id;

        const placeholders = [];
        const values = [];

        for (let i = 0; i < chordsArray.length; i++) {
            placeholders.push(`($${1}, $${i * 2 + 2}, $${i * 2 + 3})`);
            values.push(chordsArray[i].chordId, chordsArray[i].indexChord);
        }
        let resultChords;
        if (placeholders.length > 0) {
            try {
                resultChords = await repository.addSongChords(song_id, placeholders, values);
            } catch (error) {
                console.error("Error adding song chords:", error);
                await repository.deleteSong(creator_id, song_id);
                return res.status(500).json({ message: "Failed to associate chords with song" });
            }
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


router.post("/:id/favorite", async (req, res) => {
    try {
        const verified = checkToken(req.headers);
        if (!verified) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const user_id = verified.user_id;
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

router.delete("/:id", async (req, res) => {
    try {
        const verified = checkToken(req.headers);
        if (!verified?.creator) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const creator_id = verified.user_id;
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



function checkTokenMiddleware(req, res, next) {
    const verified = checkToken(req.headers);
    if (!verified?.creator) return res.status(401).json({ message: "Invalid token" });
    req.user = { username: verified.username, user_id: verified.user_id };
    next();
}


