const express = require("express");
const router = express.Router();
const { checkToken, checkTokenMiddleware, checkTokenMiddlewareCreator } = require("../../tokens");
const repositories = require("../../Repositories/creatorsRep");


router.post("/", checkTokenMiddleware, async (req, res) => {
    const { creatorID, request } = req.body;

    try {
        const result = await repositories.postRequest(creatorID, request);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/", checkTokenMiddlewareCreator, async (req, res) => {

    try {
        const result = await repositories.getRequestsByCreator(req.user.user_id);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


router.delete("/:id", checkTokenMiddlewareCreator, async (req, res) => {
    const userId = req.user.user_id;
    const request_id = req.params.id;

    try {
        const result = await repositories.deleteRequest(request_id, userId);
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