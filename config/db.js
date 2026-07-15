const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isDbConnected = false;
let dbError = null;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Check if credentials are missing or placeholders
const hasCredentials = process.env.DB_HOST && 
                       process.env.DB_USER && 
                       process.env.DB_NAME && 
                       process.env.DB_HOST !== 'your_db_host';

if (hasCredentials) {
  try {
    pool = mysql.createPool(dbConfig);
    // Test the connection immediately
    pool.getConnection()
      .then(connection => {
        isDbConnected = true;
        dbError = null;
        console.log('==================================================');
        console.log('  SUCCESS: Connected to MariaDB/MySQL Database.   ');
        console.log('==================================================');
        connection.release();
      })
      .catch(err => {
        isDbConnected = false;
        dbError = err.message;
        console.error('==================================================');
        console.error('  WARNING: Database connection failed!            ');
        console.error(`  Error: ${err.message}                           `);
        console.error('  App will start in DB Config Fallback Mode.      ');
        console.error('==================================================');
      });
  } catch (err) {
    isDbConnected = false;
    dbError = err.message;
    console.error('Failed to create MySQL pool:', err);
  }
} else {
  isDbConnected = false;
  dbError = 'Database environment variables are not configured or are placeholders.';
  console.log('==================================================');
  console.log('  NOTICE: Database configuration missing.         ');
  console.log('  App will run in DB Config Fallback Mode.        ');
  console.log('==================================================');
}

module.exports = {
  getPool: () => pool,
  isConnected: () => isDbConnected,
  getError: () => dbError,
  query: async (sql, params) => {
    if (!isDbConnected || !pool) {
      throw new Error(dbError || 'Database is not connected');
    }
    const [results] = await pool.execute(sql, params);
    return results;
  }
};
