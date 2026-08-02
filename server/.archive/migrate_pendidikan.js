const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function migratePendidikan() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_desa_kauman',
    multipleStatements: true
  });

  try {
    const raw = fs.readFileSync('data/pendidikan.json', 'utf8');
    const data = JSON.parse(raw);
    
    await connection.query('DROP TABLE IF EXISTS pendidikan');
    await connection.query('CREATE TABLE pendidikan (id BIGINT PRIMARY KEY, data JSON)');
    
    for (const item of data) {
      let itemId = item.id;
      if (!itemId) {
        itemId = Date.now() + Math.floor(Math.random() * 1000);
        item.id = itemId;
      }
      await connection.query('INSERT INTO pendidikan (id, data) VALUES (?, ?)', [itemId, JSON.stringify(item)]);
    }
    console.log('Migrated pendidikan successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}
migratePendidikan();
