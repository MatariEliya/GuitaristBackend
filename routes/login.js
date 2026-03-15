const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../dataBase"); // חיבור ל-DB
const { createToken } = require("../tokens");

const router = express.Router();

router.post("/", async (req, res) => {
    const { username, password } = req.body;

    try {
        const userResult = await pool.query(
            "SELECT user_id, hashed_password FROM users WHERE username = $1",
            [username]
        );

        if (!userResult.rows.length) {
            return res.status(401).json();
        }
        
        const validPassword = await bcrypt.compare(
            password,
            userResult.rows[0].hashed_password
        );
        if(!validPassword){
            return res.status(401).json();
        }


        const creatorResult = await pool.query(
            "SELECT * FROM creators WHERE user_id = $1",
            [userResult.rows[0].user_id]
        );
        const creator = creatorResult.rows.length > 0;

        const token = createToken({ username, creator, user_id: userResult.rows[0].user_id });

        res.json({ token, creator});
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});




module.exports = router; // חייב לייצא
