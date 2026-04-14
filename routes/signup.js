const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const {createToken} = require("../tokens")
const repository = require("../Repositories/loginAndSignup");

// Route ליצירת משתמש חדש
router.post("/", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password || username.includes(" ") || password.includes(" ")) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        // יצירת משתמש חדש
        const newUser = await repository.createUser(username, hashedPassword);
        if (newUser.rows.length === 0) {
            return res.status(400).json({ error: "Username already exists" });
        }
        // מחזיר את המשתמש שנוצר
        const token = createToken({username, creator: false, user_id: newUser.rows[0].user_id});
        res.status(201).json({token});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;