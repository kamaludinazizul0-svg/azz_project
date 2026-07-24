const fs = require('fs');
const readline = require('readline');

async function processData() {
    console.log("Mulai membaca file DataPenduduk2016.csv...");
    const fileStream = fs.createReadStream('DataPenduduk2016.csv', 'utf8');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentKK = '';
    let currentAlamat = '';
    
    // Header
    let outputCSV = '"No","Nama Lengkap","NIK","Tempat Lahir","Tanggal Lahir","Jenis Kelamin","SHDK","Agama","Pendidikan","Pekerjaan","Nama Ibu","Nama Ayah","No KK","Alamat"\n';
    let count = 0;

    for await (const line of rl) {
        let cols = line.split(';');
        
        // cek apakah baris KK
        if (cols[1] && cols[1].includes('No. KK :')) {
            // ekstrak KK
            let kkMatch = cols[1].match(/No\.\s*KK\s*:\s*(\d+)/i);
            if (kkMatch) currentKK = kkMatch[1];
            
            // ekstrak Alamat
            let alamatMatch = line.match(/Alamat\s*:\s*([^;]+)/i);
            if (alamatMatch) currentAlamat = alamatMatch[1].trim();
        } 
        // cek apakah baris data penduduk (kolom[0] adalah angka No urut)
        else if (cols[0] && cols[0].trim().match(/^\d+$/)) {
            // Ambil data
            const no = cols[0].trim();
            const nama = cols[1] ? cols[1].trim() : '';
            const nik = cols[2] ? cols[2].trim() : '';
            const tmptLahir = cols[3] ? cols[3].trim() : '';
            const tglLahir = cols[4] ? cols[4].trim() : '';
            const jk = cols[6] ? cols[6].trim() : '';
            const shdk = cols[7] ? cols[7].trim() : '';
            const agama = cols[8] ? cols[8].trim() : '';
            const pendidikan = cols[9] ? cols[9].trim() : '';
            const pekerjaan = cols[10] ? cols[10].trim() : '';
            const ibu = cols[12] ? cols[12].trim() : '';
            const ayah = cols[15] ? cols[15].trim() : '';

            const clean = (str) => {
                if (!str) return '';
                return str.replace(/"/g, '""');
            };
            
            let rowData = [
                no, nama, nik, tmptLahir, tglLahir, jk, shdk, agama, pendidikan, pekerjaan, ibu, ayah, currentKK, currentAlamat
            ];
            
            outputCSV += '"' + rowData.map(clean).join('","') + '"\n';
            count++;
        }
    }

    fs.writeFileSync('DataPenduduk2016_SIAP_DATABASE.csv', outputCSV);
    console.log("SELESAI! Berhasil merapikan " + count + " data penduduk.");
    console.log("File DataPenduduk2016_SIAP_DATABASE.csv siap digunakan.");
}

processData();
