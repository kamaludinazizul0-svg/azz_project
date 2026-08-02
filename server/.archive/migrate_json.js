const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function runJsonMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_desa_kauman',
    multipleStatements: true
  });

  try {
    const tables = ['slider', 'listing', 'apbdesa', 'idm', 'galeri', 'program', 'pembangunan', 'statistik_tambahan'];
    const jsonMap = { 'statistik_tambahan': 'statistik-tambahan' };

    for (const table of tables) {
      const jsonFile = `data/${jsonMap[table] || table}.json`;
      if (fs.existsSync(jsonFile)) {
        const raw = fs.readFileSync(jsonFile, 'utf8');
        const data = JSON.parse(raw);
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data[table]) items = data[table];
        else items = [data]; // object directly
        
        if (items.length > 0) {
          // 1. Drop and Create table
          await connection.query(`DROP TABLE IF EXISTS ${table}`);
          await connection.query(`CREATE TABLE ${table} (id BIGINT PRIMARY KEY, data JSON)`);
          
          console.log(`Migrating ${items.length} records into ${table} as JSON...`);
          
          // 2. Insert data
          for (const item of items) {
            let itemId = item.id;
            if (!itemId) {
              itemId = Date.now() + Math.floor(Math.random() * 1000);
              item.id = itemId;
            }
            try { 
              await connection.query(`INSERT INTO ${table} (id, data) VALUES (?, ?)`, [itemId, JSON.stringify(item)]);
            } catch (err) { console.error('Error inserting into', table, err); }
          }
        }
      }
    }
    console.log('JSON Data migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runJsonMigration();
