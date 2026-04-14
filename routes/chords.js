const express = require("express");
const repository = require("../Repositories/chordsRep");
const { checkToken } = require("../tokens");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const result = await repository.getChords();
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
    if (!name) {
        return res.status(400).json({ message: "Name is required" });
    }

    try {
        const chord_result = await repository.postChord(creator_id, name, capo || 0, mute, difficult || false);
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


            const finger_result = await repository.postFingers(chord_id, placeholders, values);

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
        const result = await repository.getChordsByCreator(creator_id);
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
        const result = await repository.deleteChord(creator_id, chord_id);
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
