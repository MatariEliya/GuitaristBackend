const express = require("express");
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pool = require("../../dataBase");

const { checkToken } = require("../../tokens");
const { upload, handleUpload } = require("./../uploadImages");

router.get("/", async (req, res) => {
    const verified = checkToken(req.headers);

    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }

    try {
        const userId = verified.user_id; // token includes user_id
        const result = await pool.query(
            `SELECT * FROM creator_card WHERE creator_id = $1`,
            [userId]
        );

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


        const result = await pool.query(
            `--יוצר כרטיס יוצר
            INSERT INTO creator_card
            (creator_id, tag1, tag2, tag3, bio, youtube, instagram, tiktok, is_public)
            SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9

            -- מעדכן את הכרטיס יוצר במקרה שכבר הכרטיס קיים
            ON CONFLICT (creator_id)
            DO UPDATE SET
                tag1 = EXCLUDED.tag1,
                tag2 = EXCLUDED.tag2,
                tag3 = EXCLUDED.tag3,
                bio = EXCLUDED.bio,
                youtube = EXCLUDED.youtube,
                instagram = EXCLUDED.instagram,
                tiktok = EXCLUDED.tiktok,
                is_public = EXCLUDED.is_public`,
            [userId, values.tag1, values.tag2, values.tag3, values.bio, values.youtube,values.instagram, values.tiktok, values.isPublic]
        );
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