const express = require("express");
const router = express.Router();
const respositories = require("../../Repositories/creatorsRep");
const {getChordsByCreator} = require("../../Repositories/chordsRep");
const {getSongsByCreator} = require("../../Repositories/songsRep");
const { checkToken, checkTokenMiddleware, checkTokenMiddlewareCreator } = require("../../tokens");

const creatorCardRoutes = require("./creatorCard")
const requestsRoutes = require("./requests")

router.use("/creatorCard", creatorCardRoutes)
router.use("/requests", requestsRoutes)



router.get("/", async (req, res) => {
    const result = await respositories.getCreatorCards();
    res.json(result.rows);
});

router.get("/featured", async (req, res) => {
    const result = await respositories.getFeaturedCreators();
    res.json(result.rows);
});

router.get("/creatorInfo/:id", async (req, res) => {
    const creatorId = req.params.id;
    try {
        const creatorInfo = await respositories.getSpecificCreatorCard(creatorId);
        const result = creatorInfo.rows[0] || {};
        if (!result?.is_public) {
            return res.status(404).json({ message: "Creator not found" });
        }
        //קבלת שירים של היוצר
        const songs = await getSongsByCreator(creatorId);
        result.songs = songs.rows ? songs.rows : [];

        //קבלת אקורדים של היוצר
        const chords = await getChordsByCreator(creatorId);
        result.chords = chords.rows ? chords.rows : [];

        res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});


router.get("/creatorInfo", checkTokenMiddlewareCreator, async (req, res) => {


    const creatorId = req.user.user_id;
    try {
        const creatorInfo = await respositories.getSpecificCreatorCard(creatorId);
        const result = creatorInfo.rows[0] || {};
        //קבלת שירים של היוצר
        const songs = await getSongsByCreator(creatorId);
        result.songs = songs.rows ? songs.rows : [];

        //קבלת אקורדים של היוצר
        const chords = await getChordsByCreator(creatorId);
        result.chords = chords.rows ? chords.rows : [];

        res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});




module.exports = router