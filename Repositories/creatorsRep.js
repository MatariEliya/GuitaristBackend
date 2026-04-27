const pool = require("../dataBase");

async function getSpecificCreatorCard(creatorId){
    return await pool.query(
        //קבלת נתונים על היוצר
        `SELECT cc.bio, cc.youtube, cc.instagram, cc.tiktok, cc.tag1, cc.tag2, cc.tag3, cc.is_public , u.username AS "creatorName", u.user_id AS "creatorId"
        FROM creator_card cc

        JOIN users u ON u.user_id = cc.creator_id


        WHERE cc.creator_id = $1;`,
        [creatorId],
    );
}
async function getCreatorCards(){
    return await pool.query(`
        SELECT creator_id AS "profileID", tag1, tag2, tag3, u.username AS "creatorName"
        FROM creator_card
        INNER JOIN users u ON u.user_id = creator_id
        WHERE is_public = true
    `);
}

async function getFeaturedCreators(){
    return await pool.query(`
        SELECT  
            u.user_id AS "profileID",  
            u.username AS "creatorName",
            cc.tag1, cc.tag2, cc.tag3,
            COUNT(f.user_id) AS total_likes  
        FROM creator_card cc
        JOIN users u ON u.user_id = cc.creator_id
        LEFT JOIN songs s ON s.creator_id = u.user_id 
        LEFT JOIN user_favorite_songs f ON f.song_id = s.song_id
        WHERE cc.is_public = TRUE
        GROUP BY u.user_id, u.username, cc.tag1, cc.tag2, cc.tag3
        ORDER BY total_likes DESC  
        LIMIT 5;
    `);
}

async function UpdateOrCreateCreatorCard(creatorId, values){
    return await pool.query(
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
        [creatorId, values.tag1, values.tag2, values.tag3, values.bio, values.youtube,values.instagram, values.tiktok, values.isPublic]
    );
}
async function getSongsByCreator(creatorId){
    return await pool.query(
        `SELECT song_id AS "songID", name AS "songName", artist_name As "artist"
        FROM songs WHERE creator_id = $1`,
        [creatorId]
    );
}

async function getChordsByCreator(creatorId){
    return await pool.query(`
        SELECT
            chords.chord_id AS "chordId",
            chords.name,
            chords.capo,
            chords.mute,
            chords.difficult,
            COALESCE(
                json_agg(
                    json_build_object(
                        'string', COALESCE(fingers.string, 0),
                        'fret', COALESCE(fingers.fret, 0),
                        'barre', COALESCE(fingers.barre, 0),
                        'isExist', CASE WHEN fingers.chord_id IS NULL THEN false ELSE true END
                    ) ORDER BY f_num.finger_number
                ),
                '[]'
            ) AS fingers
        FROM chords
        CROSS JOIN LATERAL generate_series(1, 4) AS f_num(finger_number)
        LEFT JOIN fingers 
            ON fingers.chord_id = chords.chord_id 
        AND fingers.finger_number = f_num.finger_number
        WHERE chords.creator_id = $1
        GROUP BY chords.chord_id, chords.name, chords.capo, chords.mute, chords.difficult;
    `, [creatorId]);
}

async function postRequest(creatorId, request){
    return await pool.query(
        `INSERT INTO request (creator_id, request) VALUES ($1, $2) RETURNING *`,
        [creatorId, request]
    );
}
async function getRequestsByCreator(creatorId){
    return await pool.query(
        `SELECT request, request_id AS "requestID"
        FROM request WHERE creator_id = $1`,
        [creatorId]
    );
}
async function deleteRequest(requestId, creatorId){
    return await pool.query(
        `DELETE FROM request
        WHERE request_id = $1 AND creator_id = $2
        RETURNING request_id`,
        [requestId, creatorId]
    );
}


module.exports = {
    getSpecificCreatorCard,
    getCreatorCards,
    getFeaturedCreators,
    UpdateOrCreateCreatorCard,
    getSongsByCreator,
    getChordsByCreator,
    postRequest,
    getRequestsByCreator,
    deleteRequest
}