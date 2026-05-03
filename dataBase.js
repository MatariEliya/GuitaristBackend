const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'guitarist',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  max: 30, // מקסימום 20 לקוחות בו זמנית
  idleTimeoutMillis: 30000, // סגירת חיבורים שלא בשימוש אחרי 30 שניות
  connectionTimeoutMillis: 2000, // כמה זמן לחכות לחיבור לפני שגיאה
});

module.exports = pool;