const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixDesa() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_desa_kauman'
  });

  try {
    await connection.query('DROP TABLE IF EXISTS desa_profil');
    await connection.query('CREATE TABLE desa_profil (id INT PRIMARY KEY, data JSON)');
    
    const raw = fs.readFileSync('data/desa.json', 'utf8');
    
    await connection.query('INSERT INTO desa_profil (id, data) VALUES (?, ?)', [1, raw]);
    console.log('Fixed desa_profil in MySQL');
    
  } catch(e) {
    console.error(e);
  } finally {
    await connection.end();
  }
}
fixDesa();
