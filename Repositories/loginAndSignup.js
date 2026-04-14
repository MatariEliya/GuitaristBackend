const pool = require("../dataBase");

async function getUserInfo(username) {
    const result = await pool.query(
        `SELECT 
            u.user_id,
            u.hashed_password,
            CASE WHEN c.user_id IS NOT NULL THEN true ELSE false END AS creator
        FROM users u
        LEFT JOIN creators c ON c.user_id = u.user_id
        WHERE u.username = $1`,
        [username]
    );
    return result.rows[0];
}

async function createUser(username, hashedPassword) {
    const result = await pool.query(
        `INSERT INTO users (username, hashed_password)
        VALUES ($1, $2)
        ON CONFLICT (username) DO NOTHING
        RETURNING user_id
        `,
        [username, hashedPassword]
    );
    return result;
}
module.exports = {
    getUserInfo,
    createUser
};