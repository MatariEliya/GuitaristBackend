const express = require("express");
const bcrypt = require("bcryptjs"); // החלפה כאן
const { createToken } = require("../tokens");
const repository = require("../Repositories/loginAndSignup");

const router = express.Router();

router.post("/", async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await repository.getUserInfo(username);
        if (!userResult) {
            return res.status(401).json();
        }
        
        const validPassword = await bcrypt.compare(
            password,
            userResult.hashed_password
        );
        if(!validPassword){
            return res.status(401).json();
        }

        const token = createToken({ username, creator: userResult.creator, user_id: userResult.user_id });

        res.json({ token, creator: userResult.creator });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});




module.exports = router; // חייב לייצא
