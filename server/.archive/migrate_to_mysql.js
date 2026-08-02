const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_desa_kauman',
    multipleStatements: true
  });

  try {
    const schema = fs.readFileSync('schema.sql', 'utf8');
    await connection.query(schema);
    console.log('Schema created successfully');
    
    // Migrate data from JSON files
    const tables = ['berita', 'agenda', 'surat', 'pengaduan', 'permohonan_info', 'perangkat', 'users', 'logs', 'mitra', 'ppid'];
    const jsonMap = {
      'permohonan_info': 'permohonan-info'
    };

    for (const table of tables) {
      const jsonFile = `data/${jsonMap[table] || table}.json`;
      if (fs.existsSync(jsonFile)) {
        const raw = fs.readFileSync(jsonFile, 'utf8');
        const data = JSON.parse(raw);
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data[table]) items = data[table];
        else if (table === 'permohonan_info' && data['permohonan-info']) items = data['permohonan-info'];
        
        if (items.length > 0) {
          console.log(`Migrating ${items.length} records into ${table}...`);
          // Clear existing data just in case to prevent duplicate PK
          await connection.query(`TRUNCATE TABLE ${table}`);
          
          for (const item of items) {
            const keys = Object.keys(item);
            const values = Object.values(item);
            const placeholders = keys.map(() => '?').join(',');
            const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
            try {
              await connection.query(query, values);
            } catch (err) {
              console.error(`Error inserting into ${table}:`, err.message);
            }
          }
        }
      }
    }
    console.log('Data migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runMigration();
