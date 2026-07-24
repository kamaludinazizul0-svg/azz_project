const fs = require('fs');
const readline = require('readline');

async function processToSQL() {
    console.log("Mulai membaca CSV dengan algoritma dinamis...");
    const fileStream = fs.createReadStream('DataPenduduk2016.csv', 'utf8');
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
`;

    let valuesArray = [];
    let current_no_kk = '';
    let current_alamat = '';
    
    // Helper to escape SQL quotes
    const escapeSql = (str) => {
       if (!str) return '';
       return str.replace(/'/g, "''").trim();
    };

    for await (const line of rl) {
        if (line.includes('No. KK :')) {
            const matchKK = line.match(/No\. KK : (\d+)/);
            const matchAlamat = line.match(/Alamat : ([^;]+)/);
            if (matchKK) current_no_kk = matchKK[1].trim();
            if (matchAlamat) current_alamat = matchAlamat[1].trim();
            continue;
        }

        if (line.match(/^\d+;/)) {
            const parts = line.split(';');
            
            const no_urut = parts[0];
            const nama = parts[1];
            const nik = parts[2];
            const tempat_lahir = parts[3];
            const tgl_lahir = parts[4];
            
            // Cari index jenis kelamin secara dinamis (Pr atau Lk)
            const jkIndex = parts.findIndex(p => p.trim() === 'Pr' || p.trim() === 'Lk');
            
            if (jkIndex === -1) {
                console.log("JK tidak ditemukan di baris:", line);
                continue; 
            }
            
            const jk = parts[jkIndex];
            const shdk = parts[jkIndex + 1];
            const agama = parts[jkIndex + 2];
            const pendidikan = parts[jkIndex + 3];
            const pekerjaan = parts[jkIndex + 4];
            
            // Ambil semua sisa string yang tidak kosong setelah kolom pekerjaan
            const remaining = parts.slice(jkIndex + 5).filter(p => p.trim() !== '');
            const nama_ibu = remaining.length > 0 ? remaining[0] : '-';
            const nama_ayah = remaining.length > 1 ? remaining[1] : '-';
            
            const rowVals = [
                no_urut, nama, nik, tempat_lahir, tgl_lahir, jk, shdk, agama, pendidikan, pekerjaan, nama_ibu, nama_ayah, current_no_kk, current_alamat
            ].map(c => "'" + escapeSql(c) + "'");
            
            valuesArray.push("(" + rowVals.join(", ") + ")");
        }
    }

    let batchSize = 500;
    for (let i = 0; i < valuesArray.length; i += batchSize) {
        let batch = valuesArray.slice(i, i + batchSize);
        sqlOutput += `INSERT INTO \`penduduk\` (\`no_urut\`, \`nama_lengkap\`, \`nik\`, \`tempat_lahir\`, \`tanggal_lahir\`, \`jenis_kelamin\`, \`shdk\`, \`agama\`, \`pendidikan\`, \`pekerjaan\`, \`nama_ibu\`, \`nama_ayah\`, \`no_kk\`, \`alamat\`) VALUES\n`;
        sqlOutput += batch.join(",\n") + ";\n\n";
    }

    fs.writeFileSync('DataPenduduk2016.sql', sqlOutput);
    console.log("SELESAI! File DataPenduduk2016.sql baru berhasil dibuat dengan " + valuesArray.length + " baris.");
}

processToSQL();
