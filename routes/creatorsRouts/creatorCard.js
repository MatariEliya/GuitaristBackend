const express = require("express");
const fs = require('fs');
const path = require('path');
const router = express.Router();
const respositories = require("../../Repositories/creatorsRep");

const { checkToken } = require("../../tokens");
const { upload, handleUpload } = require("./../uploadImages");

router.get("/", async (req, res) => {
    const verified = checkToken(req.headers);

    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }

    try {
        const userId = verified?.user_id; // token includes user_id
        const result = await respositories.getSpecificCreatorCard(userId);

        if (result.rows.length === 0) {
            return res.status(200).json(null);
        }
        
        result.rows[0].creatorName = verified.username;


        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

router.put("/", checkTokenMiddleware, upload.single("Image"), async (req, res) => {
    const verified = checkToken(req.headers);

    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }

    const values = req.body;

    if (!values) {
        return res.status(400).json({ message: "values is required" });
    }

    function isValidUrl(string) {
        if (!string) return true; // allow empty strings
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    if (
        !isValidUrl(values.youtube)||
        !isValidUrl(values.instagram) ||
        !isValidUrl(values.tiktok)
    ) {
        return res.status(400).json({ message: "Invalid URL" });
    }

    //לשנות את זה שיהיה בדיקה אם יש כרטיס 
    //אם יש לעדכן אם לא לעלות חדש
    try {
        const userId = verified.user_id;


        const result = await respositories.UpdateOrCreateCreatorCard(userId, values);
        
        if(result.rowCount > 0){
            const imagePath = path.join(
                __dirname,
                "../../images",
                `${verified.username}_creator_card.webp`
            );
            if (req.file) {
                fs.renameSync(req.file.path, imagePath);
            }else{
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            return res.status(200).json(true);
        }
        return res.status(200).json(false);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;



function checkTokenMiddleware(req, res, next) {
    const verified = checkToken(req.headers);
    if (!verified?.creator) return res.status(401).json({ message: "Invalid token" });
    req.user = { username: verified.username, user_id: verified.user_id };
    next();
}