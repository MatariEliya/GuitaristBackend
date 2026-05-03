const express = require("express");
const repository = require("../Repositories/chordsRep");
const { checkToken, checkTokenMiddleware, checkTokenMiddlewareCreator } = require("../tokens");
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




router.post("/", checkTokenMiddlewareCreator, async (req, res) => {
    const creator_id = req.user.user_id;
    const { name, capo, mute, difficult, fingers } = req.body;

    if (mute > 63 || !Number.isInteger(mute)) {
        return res.status(400).json({ message: "Invalid mute" });
    }
    if (!name) {
        return res.status(400).json({ message: "Name is required" });
    }

    if(!isValidFingers(fingers)) {
        return res.status(400).json({ message: "Invalid fingers" });
    }

    try {
        const chord_result = await repository.postChord(creator_id, name, capo || 0, mute, difficult || false);
        const chord_id = chord_result?.rows[0].chord_id;
        if (!chord_id) {
            return res.status(400).json({ message: "Failed to create chord" });
        }

        //יצירת אצבעות
        const fingers_result = await insertFingers(fingers, chord_id);

        if (!fingers_result) {
            return res.status(201).json({ message: "Chord created successfully without fingers", id: chord_id });
        }
        res.status(201).json({ message: "Chord created successfully", id: chord_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


router.put("/:id", checkTokenMiddlewareCreator, async (req, res) => {
    const creator_id = req.user.user_id;
    const chord_id = req.params.id;
    const { name, capo, mute, difficult } = req.body;

    if (mute > 63 || !Number.isInteger(mute)) {
        return res.status(400).json({ message: "Invalid mute" });
    }
    if (!name) {
        return res.status(400).json({ message: "Name is required" });
    }

    if(!isValidFingers(req.body.fingers)) {
        return res.status(400).json({ message: "Invalid fingers" });
    }

    try {
        const result = await repository.updateChord(creator_id, chord_id, name, capo || 0, mute, difficult || false);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Chord not found" });
        }
        //מחיקת האצבעות הקיימות
        await repository.deleteChordFingers(chord_id);
        //יצירת אצבעות חדשות
        const fingers_result = await insertFingers(req.body.fingers, chord_id);
        if (!fingers_result) {
            return res.json({ message: "Chord updated successfully without fingers" });
        }
        res.json({ message: "Chord updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/byCreator/:id", async (req, res) => {
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

router.get("/byId/:id", async (req, res) => {
    const chord_id = req.params.id;

    if (!chord_id) {
        return res.status(400).json({ message: "Chord ID is required" });
    }
    try {
        const result = await repository.getChordById(chord_id);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Chord not found" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/:id", checkTokenMiddlewareCreator, async (req, res) => {
    const creator_id = req.user.user_id;
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



async function insertFingers(fingerInput, chord_id) {

    let fingers = fingerInput;
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


        return await repository.postFingers(chord_id, placeholders, values);
    }
    return false;
}


function isValidFingers(fingers) {
    for (let index = 0; index < fingers.length; index++) {
        const finger = fingers[index];
        const { string, fret, barre, isExist } = finger;

        // אם האצבע לא קיימת — מדלגים
        if ( isExist && (!(string >= 1 && string <= 6 &&
            fret >= 1 && fret <= 4 &&
            barre >= 0 && 
            (barre + string) <= 6))
            )
        {
            return false;
        };
    }
    return true;
}
