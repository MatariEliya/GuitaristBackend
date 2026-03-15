const express = require("express");
const router = express.Router();
const pool = require("../../dataBase");
const { checkToken } = require("../../tokens");


router.post("/", async (req, res) => {
    const verified = checkToken(req.headers);
    if (!verified) {
        return res.status(401).json({ message: "Invalid token" });
    }
    
    const { creatorID, request } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO request (creator_id, request) VALUES ($1, $2) RETURNING *`,
            [creatorID, request]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/", async (req, res) => {
    const verified = checkToken(req.headers);
    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }

    try {
        const result = await pool.query(
            `SELECT r.request, r.request_id AS "requestID"
             FROM request r
             WHERE r.creator_id = $1
             `, [verified.user_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


router.delete("/:id", async (req, res) => {
    const verified = checkToken(req.headers);
    if (!verified?.creator) {
        return res.status(401).json({ message: "Invalid token" });
    }

    const userId = verified.user_id;
    const request_id = req.params.id;
    console.log("Deleting request with ID:", request_id, "for user ID:", userId);

    try {
        const result = await pool.query(
            `DELETE FROM request
            WHERE request_id = $1 AND creator_id = $2
            RETURNING request_id`,
            [request_id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }
        res.json({ message: "Request deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;