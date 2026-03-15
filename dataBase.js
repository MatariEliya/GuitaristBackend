const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'guitarist',
  user: 'postgres',
  password: 'eliya100'
});

module.exports = pool;