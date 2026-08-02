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
    const extraSchema = `
      DROP TABLE IF EXISTS slider;
      CREATE TABLE IF NOT EXISTS slider (id BIGINT PRIMARY KEY, judul VARCHAR(255), deskripsi TEXT, gambar VARCHAR(255), aktif BOOLEAN DEFAULT TRUE);

      DROP TABLE IF EXISTS listing;
      CREATE TABLE IF NOT EXISTS listing (id BIGINT PRIMARY KEY, nama VARCHAR(255), deskripsi TEXT, kategori VARCHAR(100), harga VARCHAR(100), kontak VARCHAR(100), gambar VARCHAR(255), penjual VARCHAR(255));

      DROP TABLE IF EXISTS apbdesa;
      CREATE TABLE IF NOT EXISTS apbdesa (id BIGINT PRIMARY KEY, tahun VARCHAR(50), pendapatan VARCHAR(50), belanja VARCHAR(50), pembiayaan VARCHAR(50), rincian TEXT);

      DROP TABLE IF EXISTS idm;
      CREATE TABLE IF NOT EXISTS idm (id BIGINT PRIMARY KEY, tahun VARCHAR(50), skor VARCHAR(50), status VARCHAR(100), indikator TEXT);

      DROP TABLE IF EXISTS galeri;
      CREATE TABLE IF NOT EXISTS galeri (id BIGINT PRIMARY KEY, judul VARCHAR(255), kategori VARCHAR(100), gambar VARCHAR(255), tanggal VARCHAR(100));

      DROP TABLE IF EXISTS program;
      CREATE TABLE IF NOT EXISTS program (id BIGINT PRIMARY KEY, nama VARCHAR(255), deskripsi TEXT, anggaran VARCHAR(100), status VARCHAR(100), progress INT, foto VARCHAR(255));

      DROP TABLE IF EXISTS pembangunan;
      CREATE TABLE IF NOT EXISTS pembangunan (id BIGINT PRIMARY KEY, nama VARCHAR(255), lokasi VARCHAR(255), anggaran VARCHAR(100), sumber_dana VARCHAR(150), progress INT, foto VARCHAR(255));

      DROP TABLE IF EXISTS statistik_tambahan;
      CREATE TABLE IF NOT EXISTS statistik_tambahan (id BIGINT PRIMARY KEY, kategori VARCHAR(100), label VARCHAR(255), nilai VARCHAR(100), warna VARCHAR(50));
      
      DROP TABLE IF EXISTS desa_profil;
      CREATE TABLE IF NOT EXISTS desa_profil (id BIGINT PRIMARY KEY, nama VARCHAR(255), alamat TEXT, telepon VARCHAR(100), email VARCHAR(100), deskripsi TEXT, logo VARCHAR(255));
    `;
    await connection.query(extraSchema);
    console.log('Extra Schema created successfully');
    
    // Migrate data
    const tables = ['slider', 'listing', 'apbdesa', 'idm', 'galeri', 'program', 'pembangunan', 'statistik_tambahan', 'desa_profil'];
    const jsonMap = { 'statistik_tambahan': 'statistik-tambahan', 'desa_profil': 'desa' };

    for (const table of tables) {
      const jsonFile = `data/${jsonMap[table] || table}.json`;
      if (fs.existsSync(jsonFile)) {
        const raw = fs.readFileSync(jsonFile, 'utf8');
        const data = JSON.parse(raw);
        let items = [];
        if (Array.isArray(data)) items = data;
        else if (data[table]) items = data[table];
        else if (table === 'desa_profil') items = [data]; // object directly
        
        if (items.length > 0) {
          console.log(`Migrating ${items.length} records into ${table}...`);
          for (const item of items) {
            // Convert objects/arrays to string for DB
            for(let k in item) { if(typeof item[k] === 'object') item[k] = JSON.stringify(item[k]); }
            const keys = Object.keys(item);
            const values = Object.values(item);
            if (keys.length > 0) {
              const placeholders = keys.map(() => '?').join(',');
              const query = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
              try { await connection.query(query, values); } catch (err) {}
            }
          }
        }
      }
    }
    console.log('Extra Data migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runMigration();
