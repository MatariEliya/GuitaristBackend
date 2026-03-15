const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const {createToken} = require("../tokens")
const pool = require("../dataBase"); // נתיב לקובץ שמייצר את Pool

// Route ליצירת משתמש חדש
router.post("/", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || username.includes(" ") || password.includes(" ")) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        // קודם בודקים אם המשתמש כבר קיים
        const userCheck = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // יצירת משתמש חדש
        const newUser = await pool.query(
            "INSERT INTO users (username, hashed_password) VALUES ($1, $2) RETURNING user_id, username",
            [username, hashedPassword]
        );

        // מחזיר את המשתמש שנוצר
        const token = createToken({username, creator: false})
        res.status(201).json({token});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;