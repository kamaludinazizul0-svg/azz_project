const fs = require('fs');
const readline = require('readline');

async function processToSQL() {
    console.log("Mulai membaca CSV untuk membuat file SQL...");
    const fileStream = fs.createReadStream('DataPenduduk2016_SIAP_DATABASE.csv', 'utf8');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let sqlOutput = `
-- Hapus tabel jika sudah ada agar bersih
DROP TABLE IF EXISTS \`penduduk\`;

-- Buat struktur tabel penduduk
CREATE TABLE \`penduduk\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`no_urut\` varchar(50) DEFAULT NULL,
  \`nama_lengkap\` varchar(255) DEFAULT NULL,
  \`nik\` varchar(20) DEFAULT NULL,
  \`tempat_lahir\` varchar(100) DEFAULT NULL,
  \`tanggal_lahir\` varchar(50) DEFAULT NULL,
  \`jenis_kelamin\` varchar(20) DEFAULT NULL,
  \`shdk\` varchar(50) DEFAULT NULL,
  \`agama\` varchar(50) DEFAULT NULL,
  \`pendidikan\` varchar(100) DEFAULT NULL,
  \`pekerjaan\` varchar(100) DEFAULT NULL,
  \`nama_ibu\` varchar(255) DEFAULT NULL,
  \`nama_ayah\` varchar(255) DEFAULT NULL,
  \`no_kk\` varchar(50) DEFAULT NULL,
  \`alamat\` text,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mulai memasukkan data
INSERT INTO \`penduduk\` (\`no_urut\`, \`nama_lengkap\`, \`nik\`, \`tempat_lahir\`, \`tanggal_lahir\`, \`jenis_kelamin\`, \`shdk\`, \`agama\`, \`pendidikan\`, \`pekerjaan\`, \`nama_ibu\`, \`nama_ayah\`, \`no_kk\`, \`alamat\`) VALUES
`;

    let isFirstRow = true;
    let valuesArray = [];
    let isHeader = true;

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue; // Skip header CSV
        }

        // CSV parsing sederhana (mengambil yang diapit tanda kutip)
        let cols = [];
        let match;
        let regex = /"([^"]*)"/g;
        while ((match = regex.exec(line)) !== null) {
            cols.push(match[1]);
        }

        if (cols.length >= 14) {
            // Escape single quotes for SQL
            const escapeSql = (str) => str.replace(/'/g, "''");
            let rowVals = cols.slice(0, 14).map(c => "'" + escapeSql(c) + "'");
            valuesArray.push("(" + rowVals.join(", ") + ")");
        }
    }

    // Gabungkan dengan koma, dan batasi jumlah insert per query agar tidak error (batch insert)
    let batchSize = 500;
    for (let i = 0; i < valuesArray.length; i += batchSize) {
        let batch = valuesArray.slice(i, i + batchSize);
        if (i !== 0) {
            sqlOutput += `INSERT INTO \`penduduk\` (\`no_urut\`, \`nama_lengkap\`, \`nik\`, \`tempat_lahir\`, \`tanggal_lahir\`, \`jenis_kelamin\`, \`shdk\`, \`agama\`, \`pendidikan\`, \`pekerjaan\`, \`nama_ibu\`, \`nama_ayah\`, \`no_kk\`, \`alamat\`) VALUES\n`;
        }
        sqlOutput += batch.join(",\n") + ";\n\n";
    }

    fs.writeFileSync('DataPenduduk2016.sql', sqlOutput);
    console.log("SELESAI! File DataPenduduk2016.sql berhasil dibuat.");
}

processToSQL();
