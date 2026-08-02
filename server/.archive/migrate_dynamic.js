const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function runDynamicMigration() {
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
          // 1. Collect all unique keys
          const allKeys = new Set(['id']);
          for (const item of items) {
            for (const key of Object.keys(item)) {
              allKeys.add(key);
            }
          }
          
          // 2. Drop and Create table
          await connection.query(`DROP TABLE IF EXISTS ${table}`);
          const columns = Array.from(allKeys).map(k => {
             if (k === 'id') return 'id BIGINT PRIMARY KEY';
             return `${k} TEXT`;
          });
          await connection.query(`CREATE TABLE ${table} (${columns.join(', ')})`);
          
          console.log(`Migrating ${items.length} records into ${table}...`);
          
          // 3. Insert data
          for (const item of items) {
            // ensure it has an ID
            if (!item.id) item.id = Date.now() + Math.floor(Math.random() * 1000);
            
            const keys = Object.keys(item);
            const values = keys.map(k => {
              let val = item[k];
              if (typeof val === 'object') return JSON.stringify(val);
              if (typeof val === 'boolean') return val ? '1' : '0';
              return String(val);
            });
            
            if (keys.length > 0) {
              const placeholders = keys.map(() => '?').join(',');
              const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
              try { await connection.query(query, values); } catch (err) { console.error('Error inserting into', table, err); }
            }
          }
        }
      }
    }
    console.log('Dynamic Data migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runDynamicMigration();
