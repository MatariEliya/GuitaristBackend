const jwt = require("jsonwebtoken");

function createToken(userInfo) {
    const tokenKey = "dkflgihp6960gy98";
    return jwt.sign(userInfo, tokenKey, { expiresIn: "24h" });
}

function checkToken(headers) {
    const tokenKey = "dkflgihp6960gy98";
    const authHeader = headers["authorization"];
    if (!authHeader) return null; // אין טוקן

    const token = authHeader.split(" ")[1];
    try {
        return jwt.verify(token, tokenKey);
    } catch (err) {
        return null; // טוקן לא תקין או פג תוקף
    }
}

module.exports = { createToken, checkToken };
