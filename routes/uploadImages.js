// uploadImages.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// רשימת שימושים מותרת
const allowedUses = ["creatorCard", "song"];

// סטורג' של multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../images")); // תיקיית images ביחס לקובץ זה
    },
    filename: (req, file, cb) => {
        const username = req.user?.username || "unknown";
        cb(null, `${username}_draft.webp`);
        //אני משתממש פה בשם משתמש כיוון ששני אנשים יכולים לשלוח בקשה באותו הזמן ואז קובץ אחד יכול להעלות על השני 
        // אבל אם יש לי שם משתמש אז זה לא יקרה כי כל אחד יש לו שם משתמש שונה
    }
});

// multer instance
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // עד 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "image/webp") {
            return cb(new Error("Only .webp formats are allowed!"), false);
        }
        cb(null, true);
    }
});

// פונקציה לעיבוד ההעלאה (מחזירה path)
function handleUpload(req) {
    if (!req.file) {
        throw new Error("No file uploaded");
    }
    return req.file.path;
}

module.exports = { upload, handleUpload, router };
