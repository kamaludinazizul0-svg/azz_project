const fs = require('fs');
const mysql = require('mysql2/promise');

async function runImport() {
    console.log("Menghubungkan ke database...");
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'db_desa_kauman',
        multipleStatements: true
    });

    console.log("Membaca file SQL...");
    const sql = fs.readFileSync('DataPenduduk2016.sql', 'utf8');

    console.log("Mengeksekusi SQL...");
    try {
        const statements = sql.split(';\n\n');
        for (let stmt of statements) {
            if (stmt.trim().length > 0) {
                await connection.query(stmt);
            }
        }
        console.log("BERHASIL! Database telah di-reset dan diisi ulang dengan data yang bersih.");
    } catch (e) {
        console.error("Gagal mengeksekusi SQL:", e);
    }
    
    await connection.end();
}

runImport();
