require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'desa-kauman-secret-key-2024';

// ====================== MIDDLEWARE ======================
// CORS: Izinkan localhost (development) dan domain resmi desa (production)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.ALLOWED_ORIGIN // isi di .env saat deploy: ALLOWED_ORIGIN=https://desakauman.id
].filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    // Izinkan request tanpa origin (curl, mobile app, Postman di dev)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Akses tidak diizinkan oleh CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Simple brute-force protection for login
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now, blocked: false };
  if (attempts.blocked && now - attempts.firstAttempt < 15 * 60 * 1000) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' });
  }
  if (now - attempts.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, blocked: false });
  } else {
    attempts.count++;
    if (attempts.count > 10) attempts.blocked = true;
    loginAttempts.set(ip, attempts);
  }
  next();
}

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html') || path.endsWith('.htm') || path.endsWith('.svg') || path.endsWith('.php')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// ====================== HELPERS ======================


async function logActivity(username, aksi, keterangan) {
  try {
    const time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const id = Date.now();
    await db.query('INSERT INTO logs (id, username, aksi, detail, waktu) VALUES (?, ?, ?, ?, ?)', [id, username || 'system', aksi, keterangan, time]);
  } catch(e) {
    console.error('Failed to log activity:', e.message);
  }
}

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token tidak ditemukan' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

// ====================== MULTER (Upload) ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak diizinkan. Hanya JPG, PNG, PDF, dan DOC/DOCX yang diperbolehkan.'));
  }
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// ====================== AUTH ======================
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Username atau password salah' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Username atau password salah' });
    loginAttempts.delete(req.ip || req.connection.remoteAddress);
    const token = jwt.sign({ id: user.id, username: user.username, nama: user.nama, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, nama: user.nama, role: user.role } });
  } catch(e) { res.status(500).json({error: e.message}); }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { password_lama, password_baru } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    const valid = await bcrypt.compare(password_lama, rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Password lama salah' });
    const hashed = await bcrypt.hash(password_baru, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password berhasil diubah' });
  } catch(e) { res.status(500).json({error: e.message}); }
});

// ====================== AI CHATBOT ======================
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Pesan kosong' });

  try {
    // Ambil data desa dari database sebagai konteks untuk AI
    let desaContext = 'Desa Kauman, Kecamatan Ngoro, Kabupaten Jombang, Jawa Timur.';
    try {
      const [dRows] = await db.query('SELECT data FROM desa_profil LIMIT 1');
      if (dRows.length > 0) {
        const profil = typeof dRows[0].data === 'string' ? JSON.parse(dRows[0].data) : dRows[0].data;
        desaContext = `
Nama Desa: ${profil.nama || 'Kauman'}
Kecamatan: ${profil.kecamatan || 'Ngoro'}
Kabupaten: ${profil.kabupaten || 'Jombang'}
Provinsi: ${profil.provinsi || 'Jawa Timur'}
Kepala Desa: ${profil.kepala_desa || '-'}
Visi: ${profil.visi || '-'}
Misi: ${profil.misi || '-'}
Luas Wilayah: ${profil.luas_wilayah || '-'} hektar
Jumlah Penduduk: ${profil.statistik?.jumlah_penduduk || '-'} jiwa
Jumlah KK: ${profil.statistik?.jumlah_kk || '-'} KK
Laki-laki: ${profil.statistik?.laki_laki || '-'} jiwa
Perempuan: ${profil.statistik?.perempuan || '-'} jiwa
Kontak WhatsApp: ${profil.kontak?.whatsapp || '-'}
Email: ${profil.kontak?.email || '-'}
Alamat Kantor: ${profil.kontak?.alamat || '-'}
Keunggulan Desa: Kampung Jamu Tradisional
        `.trim();
      }
    } catch(e) { /* gunakan context default */ }

    // Coba gunakan Gemini AI
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_KEY) {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      const systemPrompt = `Kamu adalah asisten virtual resmi Desa Kauman. Tugasmu membantu warga dan pengunjung mendapatkan informasi seputar desa dengan ramah, sopan, dan menggunakan Bahasa Indonesia yang baik.

Data Desa Kauman:
${desaContext}

Aturan menjawab:
- Jawab dalam Bahasa Indonesia yang ramah dan mudah dipahami
- Fokus pada informasi seputar Desa Kauman dan layanannya
- Jika ditanya hal di luar desa (politik, hiburan, dll), arahkan kembali ke topik desa
- Jawaban singkat, padat, dan jelas (maksimal 3-4 kalimat)
- Gunakan emoji yang sesuai untuk membuat jawaban lebih menarik
- Jika tidak tahu informasi spesifik, sarankan warga menghubungi kantor desa`;

      const result = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 300,
          temperature: 0.7
        }
      });

      const reply = result.text || 'Maaf, saya tidak dapat memproses pertanyaan Anda saat ini.';
      return res.json({ reply });
    }

    // Fallback: jawaban berbasis kata kunci jika tidak ada API key
    const msg = message.toLowerCase();
    let reply = 'Maaf, saya belum mengerti pertanyaan tersebut. Coba tanyakan tentang profil desa, jumlah penduduk, luas wilayah, kontak, atau visi misi.';
    try {
      const [dRows] = await db.query('SELECT data FROM desa_profil LIMIT 1');
      if (dRows.length > 0) {
        const profil = typeof dRows[0].data === 'string' ? JSON.parse(dRows[0].data) : dRows[0].data;
        if (msg.includes('penduduk') || msg.includes('warga') || msg.includes('jumlah orang')) {
          reply = `Total penduduk Desa Kauman saat ini adalah ${profil.statistik?.jumlah_penduduk || '-'} jiwa, terdiri dari ${profil.statistik?.laki_laki || '-'} laki-laki dan ${profil.statistik?.perempuan || '-'} perempuan.`;
        } else if (msg.includes('kepala desa') || msg.includes('kades')) {
          reply = `Kepala Desa Kauman saat ini dijabat oleh Bapak/Ibu ${profil.kepala_desa || '-'}.`;
        } else if (msg.includes('kontak') || msg.includes('hubungi') || msg.includes('whatsapp') || msg.includes('telepon')) {
          reply = `Anda dapat menghubungi kami melalui WhatsApp di ${profil.kontak?.whatsapp || '-'} atau telepon di ${profil.kontak?.telepon || '-'}. Email resmi kami adalah ${profil.kontak?.email || '-'}.`;
        } else if (msg.includes('lokasi') || msg.includes('alamat') || msg.includes('dimana')) {
          reply = `Kantor Desa Kauman berlokasi di ${profil.kontak?.alamat || profil.alamat || '-'}.`;
        } else if (msg.includes('luas')) {
          reply = `Luas wilayah Desa Kauman adalah ${profil.luas_wilayah || '-'} hektar.`;
        } else if (msg.includes('visi') || msg.includes('misi')) {
          reply = `Visi Desa Kauman: "${profil.visi || '-'}". Misi: ${profil.misi || '-'}.`;
        }
      }
    } catch(e) { /* abaikan error fallback */ }

    setTimeout(() => res.json({ reply }), 800);
  } catch (err) {
    console.error('Chat API Error:', err);
    res.json({ reply: 'Maaf, sedang ada gangguan pada sistem AI. Silakan coba beberapa saat lagi.' });
  }
});


// ====================== DESA (Profil) ======================
app.get('/api/desa', async (req, res) => {
  let desa = {};
  try {
    const [dRows] = await db.query('SELECT data FROM desa_profil LIMIT 1');
    if (dRows.length > 0) {
      desa = typeof dRows[0].data === 'string' ? JSON.parse(dRows[0].data) : dRows[0].data;
    }
  } catch(e) {}
  try {
    const sqlCase = `CASE 
      WHEN alamat LIKE '%KRENGAN%' OR alamat LIKE '%KRENGGAN%' THEN 'Dusun Krenggan'
      WHEN alamat LIKE '%TEGALAN%' THEN 'Dusun Tegalan'
      WHEN alamat LIKE '%SEDATI%' THEN 'Dusun Sedati'
      ELSE 'Dusun Kauman'
    END`;
    
    const [popStats] = await db.query(`SELECT ${sqlCase} AS dusun_name, COUNT(*) as penduduk, COUNT(DISTINCT no_kk) as kk FROM penduduk GROUP BY dusun_name`);
    const [agamaRows] = await db.query(`SELECT ${sqlCase} AS dusun_name, agama, COUNT(*) as cnt FROM penduduk GROUP BY dusun_name, agama`);
    const [jobRows] = await db.query(`SELECT ${sqlCase} AS dusun_name, pekerjaan, COUNT(*) as cnt FROM penduduk WHERE pekerjaan != 'Belum/Tidak Bekerja' AND pekerjaan != 'Mengurus Rumah Tangga' AND pekerjaan != 'Pelajar/Mahasiswa' GROUP BY dusun_name, pekerjaan`);

    const [globalStatsRows] = await db.query(`
      SELECT 
        COUNT(*) as jumlah_penduduk, 
        COUNT(DISTINCT no_kk) as jumlah_kk,
        SUM(CASE WHEN jenis_kelamin='Lk' THEN 1 ELSE 0 END) as laki_laki,
        SUM(CASE WHEN jenis_kelamin='Pr' THEN 1 ELSE 0 END) as perempuan
      FROM penduduk
    `);
    
    if (globalStatsRows && globalStatsRows.length > 0) {
      desa.statistik = {
        jumlah_penduduk: globalStatsRows[0].jumlah_penduduk || 0,
        jumlah_kk: globalStatsRows[0].jumlah_kk || 0,
        laki_laki: globalStatsRows[0].laki_laki || 0,
        perempuan: globalStatsRows[0].perempuan || 0
      };
    }

    if (desa.dusun_detail) {
      desa.dusun_detail = desa.dusun_detail.map(d => {
        const pstat = popStats.find(p => p.dusun_name === d.nama);
        if (pstat) {
          d.jumlah_penduduk = pstat.penduduk;
          d.jumlah_kk = pstat.kk;
        }
        const dAgamas = agamaRows.filter(a => a.dusun_name === d.nama).sort((a,b) => b.cnt - a.cnt);
        if (dAgamas.length > 0) d.mayoritas_agama = dAgamas[0].agama;
        
        const dJobs = jobRows.filter(j => j.dusun_name === d.nama).sort((a,b) => b.cnt - a.cnt);
        const totalJobs = dJobs.reduce((sum, j) => sum + j.cnt, 0);
        if (totalJobs > 0) {
          d.mayoritas_pekerjaan = dJobs.slice(0, 3).map(j => ({
            nama: j.pekerjaan,
            persen: Math.round((j.cnt / totalJobs) * 100)
          }));
        }
        return d;
      });
    }
  } catch(err) {
    console.error('Gagal auto-fetch stats dusun:', err);
  }
  res.json(desa);
});

app.put('/api/desa', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const [existing] = await db.query('SELECT * FROM desa_profil LIMIT 1');
    if (existing.length === 0) {
      await db.query('INSERT INTO desa_profil (id, data) VALUES (?, ?)', 
        [1, JSON.stringify(data)]);
    } else {
      const existingData = typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data;
      const mergedData = { ...existingData, ...data };
      await db.query('UPDATE desa_profil SET data=? WHERE id=?', 
        [JSON.stringify(mergedData), existing[0].id]);
    }
    res.json({ message: 'Profil desa berhasil diperbarui' });
  } catch(e) { res.status(500).json({error: e.message}); }
});

// ====================== PENDUDUK (Statistik & DB) ======================
// GET /api/penduduk/stats - Statistik agregat PUBLIK (tanpa data personal)
app.get('/api/penduduk/stats', async (req, res) => {
  try {
    const [stats] = await db.query(`SELECT COUNT(*) as jumlah_penduduk, COUNT(DISTINCT no_kk) as jumlah_kk, SUM(CASE WHEN jenis_kelamin = 'Lk' THEN 1 ELSE 0 END) as laki_laki, SUM(CASE WHEN jenis_kelamin = 'Pr' THEN 1 ELSE 0 END) as perempuan FROM penduduk`);
    const [agamaData] = await db.query(`SELECT agama as label, COUNT(*) as jumlah FROM penduduk GROUP BY agama ORDER BY jumlah DESC`);
    const [pendidikanData] = await db.query(`SELECT pendidikan as label, COUNT(*) as jumlah FROM penduduk GROUP BY pendidikan ORDER BY jumlah DESC`);
    const [pekerjaanData] = await db.query(`SELECT pekerjaan as label, COUNT(*) as jumlah FROM penduduk GROUP BY pekerjaan ORDER BY jumlah DESC`);
    const [umurData] = await db.query(`SELECT CASE WHEN age BETWEEN 0 AND 4 THEN '0 - 4 Tahun' WHEN age BETWEEN 5 AND 9 THEN '5 - 9 Tahun' WHEN age BETWEEN 10 AND 14 THEN '10 - 14 Tahun' WHEN age BETWEEN 15 AND 19 THEN '15 - 19 Tahun' WHEN age BETWEEN 20 AND 24 THEN '20 - 24 Tahun' WHEN age BETWEEN 25 AND 29 THEN '25 - 29 Tahun' WHEN age BETWEEN 30 AND 34 THEN '30 - 34 Tahun' WHEN age BETWEEN 35 AND 39 THEN '35 - 39 Tahun' WHEN age BETWEEN 40 AND 44 THEN '40 - 44 Tahun' WHEN age BETWEEN 45 AND 49 THEN '45 - 49 Tahun' WHEN age BETWEEN 50 AND 54 THEN '50 - 54 Tahun' WHEN age BETWEEN 55 AND 59 THEN '55 - 59 Tahun' WHEN age BETWEEN 60 AND 64 THEN '60 - 64 Tahun' WHEN age BETWEEN 65 AND 69 THEN '65 - 69 Tahun' WHEN age BETWEEN 70 AND 74 THEN '70 - 74 Tahun' ELSE '> 75 Tahun' END as label, COUNT(*) as jumlah FROM (SELECT TIMESTAMPDIFF(YEAR, STR_TO_DATE(tanggal_lahir, '%d/%m/%Y'), CURDATE()) as age FROM penduduk) as tbl GROUP BY label ORDER BY MIN(age) ASC`);
    res.json({ statistik: stats[0], kelompok_umur: umurData, pendidikan: pendidikanData, pekerjaan: pekerjaanData, agama: agamaData });
  } catch (error) {
    console.error('DB error penduduk/stats:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/penduduk - Data individual penduduk - HANYA ADMIN
app.get('/api/penduduk', authMiddleware, async (req, res) => {
  try {
    const { search, limit, page } = req.query;
    const [stats] = await db.query(`SELECT COUNT(*) as jumlah_penduduk, COUNT(DISTINCT no_kk) as jumlah_kk, SUM(CASE WHEN jenis_kelamin = 'Lk' THEN 1 ELSE 0 END) as laki_laki, SUM(CASE WHEN jenis_kelamin = 'Pr' THEN 1 ELSE 0 END) as perempuan FROM penduduk`);
    let query = "SELECT * FROM penduduk";
    let countQuery = "SELECT COUNT(*) as total FROM penduduk";
    let queryParams = [];
    if (search) {
      query += " WHERE nama_lengkap LIKE ? OR nik LIKE ?";
      countQuery += " WHERE nama_lengkap LIKE ? OR nik LIKE ?";
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    const [totalRows] = await db.query(countQuery, queryParams);
    const total = totalRows[0].total;
    const l = parseInt(limit) || 10;
    const p = parseInt(page) || 1;
    const offset = (p - 1) * l;
    query += " ORDER BY id ASC LIMIT ? OFFSET ?";
    queryParams.push(l, offset);
    const [rows] = await db.query(query, queryParams);
    const [agamaData] = await db.query(`SELECT agama as label, COUNT(*) as jumlah FROM penduduk GROUP BY agama ORDER BY jumlah DESC`);
    const [pendidikanData] = await db.query(`SELECT pendidikan as label, COUNT(*) as jumlah FROM penduduk GROUP BY pendidikan ORDER BY jumlah DESC`);
    const [pekerjaanData] = await db.query(`SELECT pekerjaan as label, COUNT(*) as jumlah FROM penduduk GROUP BY pekerjaan ORDER BY jumlah DESC`);
    const [umurData] = await db.query(`SELECT CASE WHEN age BETWEEN 0 AND 4 THEN '0 - 4 Tahun' WHEN age BETWEEN 5 AND 9 THEN '5 - 9 Tahun' WHEN age BETWEEN 10 AND 14 THEN '10 - 14 Tahun' WHEN age BETWEEN 15 AND 19 THEN '15 - 19 Tahun' WHEN age BETWEEN 20 AND 24 THEN '20 - 24 Tahun' WHEN age BETWEEN 25 AND 29 THEN '25 - 29 Tahun' WHEN age BETWEEN 30 AND 34 THEN '30 - 34 Tahun' WHEN age BETWEEN 35 AND 39 THEN '35 - 39 Tahun' WHEN age BETWEEN 40 AND 44 THEN '40 - 44 Tahun' WHEN age BETWEEN 45 AND 49 THEN '45 - 49 Tahun' WHEN age BETWEEN 50 AND 54 THEN '50 - 54 Tahun' WHEN age BETWEEN 55 AND 59 THEN '55 - 59 Tahun' WHEN age BETWEEN 60 AND 64 THEN '60 - 64 Tahun' WHEN age BETWEEN 65 AND 69 THEN '65 - 69 Tahun' WHEN age BETWEEN 70 AND 74 THEN '70 - 74 Tahun' ELSE '> 75 Tahun' END as label, COUNT(*) as jumlah FROM (SELECT TIMESTAMPDIFF(YEAR, STR_TO_DATE(tanggal_lahir, '%d/%m/%Y'), CURDATE()) as age FROM penduduk) as tbl GROUP BY label ORDER BY MIN(age) ASC`);
    res.json({ statistik: { jumlah_penduduk: stats[0].jumlah_penduduk, jumlah_kk: stats[0].jumlah_kk, laki_laki: stats[0].laki_laki, perempuan: stats[0].perempuan }, kelompok_umur: umurData, pendidikan: pendidikanData, pekerjaan: pekerjaanData, agama: agamaData, data: rows, total, page: p, limit: l });
  } catch (error) {
    console.error('DB error penduduk:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// ====================== SLIDER ======================
app.get('/api/slider', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM slider'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/slider/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM slider WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/slider', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/slider', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    await db.query('INSERT INTO slider (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/slider/:id', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/slider/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM slider WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    await db.query('UPDATE slider SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/slider/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/slider/:id', 'Menghapus data');
  try { await db.query('DELETE FROM slider WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});


// ====================== PERANGKAT ======================
app.get('/api/perangkat', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM perangkat'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/perangkat/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM perangkat WHERE id = ?', [req.params.id]); res.json(rows[0] || {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/perangkat', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/perangkat', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    if (data.nama === undefined) data.nama = null;
    if (data.jabatan === undefined) data.jabatan = null;
    if (data.foto === undefined) data.foto = null;
    if (data.nip === undefined) data.nip = null;
    if (data.periode === undefined) data.periode = null;
    if (data.urutan === undefined) data.urutan = null;
    
    const query = 'INSERT INTO perangkat (id, nama, jabatan, foto, nip, periode, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [newId, data.nama, data.jabatan, data.foto, data.nip, data.periode, data.urutan];
    await db.query(query, values);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/perangkat/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/perangkat/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT * FROM perangkat WHERE id = ?', [req.params.id]);
    const data = { ...existing[0], ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    
    const query = 'UPDATE perangkat SET nama = ?, jabatan = ?, foto = ?, nip = ?, periode = ?, urutan = ? WHERE id = ?';
    const values = [data.nama, data.jabatan, data.foto, data.nip, data.periode, data.urutan, req.params.id];
    await db.query(query, values);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/perangkat/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/perangkat/:id', 'Menghapus data');
  try { await db.query('DELETE FROM perangkat WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});



// ====================== AGENDA ======================
app.get('/api/agenda', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT data FROM agenda');
    res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data));
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.get('/api/agenda/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT data FROM agenda WHERE id = ?', [req.params.id]);
    res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {});
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/agenda', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/agenda', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    await db.query('INSERT INTO agenda (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/agenda/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/agenda/:id', 'Mengubah data');
  try {
    const data = req.body;
    await db.query('UPDATE agenda SET data=? WHERE id=?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/agenda/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/agenda/:id', 'Menghapus data');
  try { await db.query('DELETE FROM agenda WHERE id=?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== BERITA ======================
app.get('/api/berita', async (req, res) => {
  try {
    const { limit, page, search } = req.query;
    // Cek apakah request dari admin (untuk melihat semua termasuk draft)
    let isAdmin = false;
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) { try { jwt.verify(token, JWT_SECRET); isAdmin = true; } catch(e){} }

    // Publik hanya melihat berita yang aktif
    const baseWhere = isAdmin ? '' : 'WHERE aktif = 1';
    let query = `SELECT * FROM berita ${baseWhere}`;
    let countQuery = `SELECT COUNT(*) as total FROM berita ${baseWhere}`;
    let params = [];

    if (search) {
      const connector = baseWhere ? 'AND' : 'WHERE';
      query += ` ${connector} (judul LIKE ? OR ringkasan LIKE ?)`;
      countQuery += ` ${connector} (judul LIKE ? OR ringkasan LIKE ?)`;
      params.push('%' + search + '%', '%' + search + '%');
    }

    const [totalRows] = await db.query(countQuery, params);
    const total = totalRows[0].total;
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 100;
    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(l, (p - 1) * l);
    const [rows] = await db.query(query, params);
    res.json({ data: rows, total, page: p, limit: l });
  } catch (err) { console.error('Berita error:', err.message); res.status(500).json({ error: 'Terjadi kesalahan server' }); }
});
app.get('/api/berita/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const isNum = !isNaN(param);
    const query = isNum ? 'SELECT * FROM berita WHERE id = ? OR slug = ?' : 'SELECT * FROM berita WHERE slug = ?';
    const params = isNum ? [param, param] : [param];
    const [rows] = await db.query(query, params);
    if (rows.length === 0) return res.status(404).json({error: 'Not found'});
    res.json(rows[0]);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/berita', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/berita', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    if (data.judul === undefined) data.judul = null;
    if (data.kategori === undefined) data.kategori = null;
    if (data.tanggal === undefined) data.tanggal = null;
    if (data.waktu === undefined) data.waktu = null;
    if (data.ringkasan === undefined) data.ringkasan = null;
    if (data.konten === undefined) data.konten = null;
    if (data.gambar === undefined) data.gambar = null;
    if (data.penulis === undefined) data.penulis = null;
    if (data.dilihat === undefined) data.dilihat = null;
    if (data.aktif === undefined || data.aktif === null) data.aktif = 1;
    if (data.slug === undefined) data.slug = null;
    if (data.lokasi === undefined) data.lokasi = null;
    
    const query = 'INSERT INTO berita (id, judul, kategori, tanggal, waktu, ringkasan, konten, gambar, penulis, dilihat, aktif, slug, lokasi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [newId, data.judul, data.kategori, data.tanggal, data.waktu, data.ringkasan, data.konten, data.gambar, data.penulis, data.dilihat, data.aktif, data.slug, data.lokasi];
    await db.query(query, values);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/berita/:id', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/berita/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT * FROM berita WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({error: 'Not found'});
    
    const data = { ...existing[0], ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    const query = 'UPDATE berita SET judul = ?, kategori = ?, tanggal = ?, waktu = ?, ringkasan = ?, konten = ?, gambar = ?, penulis = ?, dilihat = ?, aktif = ?, slug = ?, lokasi = ? WHERE id = ?';
    const values = [data.judul, data.kategori, data.tanggal, data.waktu, data.ringkasan, data.konten, data.gambar, data.penulis, data.dilihat, data.aktif, data.slug, data.lokasi, req.params.id];
    await db.query(query, values);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/berita/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/berita/:id', 'Menghapus data');
  try {
    await db.query('DELETE FROM berita WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dihapus' });
  } catch (err) { res.status(500).json({error: err.message}); }
});





// ====================== APBDesa ======================
app.get('/api/apbdesa', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM apbdesa LIMIT 1'); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/apbdesa/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM apbdesa WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/apbdesa', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/apbdesa', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    
    
    await db.query('INSERT INTO apbdesa (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/apbdesa', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/apbdesa', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT id, data FROM apbdesa LIMIT 1');
    if (!existing.length) {
      const newId = Date.now();
      const data = { id: newId, ...req.body };
      await db.query('INSERT INTO apbdesa (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
      return res.json({ message: 'Berhasil ditambahkan' });
    }
    const data = { ...(typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data), ...req.body };
    await db.query('UPDATE apbdesa SET data = ? WHERE id = ?', [JSON.stringify(data), existing[0].id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/apbdesa/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/apbdesa/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM apbdesa WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    
    
    await db.query('UPDATE apbdesa SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/apbdesa/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/apbdesa/:id', 'Menghapus data');
  try { await db.query('DELETE FROM apbdesa WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});


// ====================== IDM ======================
app.get('/api/idm', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM idm LIMIT 1'); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/idm/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM idm WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/idm', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/idm', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    
    
    await db.query('INSERT INTO idm (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/idm/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/idm/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM idm WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    
    
    await db.query('UPDATE idm SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/idm/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/idm/:id', 'Menghapus data');
  try { await db.query('DELETE FROM idm WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});


// ====================== PPID ======================
app.get('/api/ppid', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM ppid'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/ppid/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM ppid WHERE id = ?', [req.params.id]); res.json(rows[0] || {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/ppid', authMiddleware, upload.single('file'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/ppid', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.file = '/uploads/' + req.file.filename;
    if (data.kategori === undefined) data.kategori = null;
    if (data.judul === undefined) data.judul = null;
    if (data.file === undefined) data.file = null;
    if (data.tanggal === undefined) data.tanggal = null;
    if (data.nama === undefined) data.nama = null;
    if (data.deskripsi === undefined) data.deskripsi = null;
    if (data.aktif === undefined) data.aktif = null;
    
    const query = 'INSERT INTO ppid (id, kategori, judul, file, tanggal, nama, deskripsi, aktif) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [newId, data.kategori, data.judul, data.file, data.tanggal, data.nama, data.deskripsi, data.aktif];
    await db.query(query, values);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/ppid/:id', authMiddleware, upload.single('file'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/ppid/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT * FROM ppid WHERE id = ?', [req.params.id]);
    const data = { ...existing[0], ...req.body };
    if (req.file) data.file = '/uploads/' + req.file.filename;
    
    const query = 'UPDATE ppid SET kategori = ?, judul = ?, file = ?, tanggal = ?, nama = ?, deskripsi = ?, aktif = ? WHERE id = ?';
    const values = [data.kategori, data.judul, data.file, data.tanggal, data.nama, data.deskripsi, data.aktif, req.params.id];
    await db.query(query, values);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/ppid/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/ppid/:id', 'Menghapus data');
  try { await db.query('DELETE FROM ppid WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});



// ====================== PENDIDIKAN ======================
app.get('/api/pendidikan', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM pendidikan'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/pendidikan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM pendidikan WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/pendidikan', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/pendidikan', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    await db.query('INSERT INTO pendidikan (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/pendidikan/:id', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/pendidikan/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM pendidikan WHERE id = ?', [req.params.id]);
    let data = existing.length ? (typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data) : {};
    data = { ...data, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    await db.query('UPDATE pendidikan SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/pendidikan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/pendidikan/:id', 'Menghapus data');
  try { await db.query('DELETE FROM pendidikan WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== GALERI ======================
app.get('/api/galeri', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM galeri'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/galeri/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM galeri WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/galeri', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/galeri', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    await db.query('INSERT INTO galeri (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/galeri/:id', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/galeri/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM galeri WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    await db.query('UPDATE galeri SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/galeri/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/galeri/:id', 'Menghapus data');
  try { await db.query('DELETE FROM galeri WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});



// ====================== SURAT ======================
app.get('/api/surat', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM surat ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/surat', upload.fields([{name: 'lampiran_ktp'}, {name: 'lampiran'}]), async (req, res) => {
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body, created_at: new Date().toISOString() };
    if (req.files) {
      if (req.files.lampiran_ktp) data.lampiran_ktp = '/uploads/' + req.files.lampiran_ktp[0].filename;
      if (req.files.lampiran) data.lampiran = '/uploads/' + req.files.lampiran[0].filename;
    }
    await db.query('INSERT INTO surat SET ?', data);
    res.json({ message: 'Berhasil dikirim', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/surat/:id', authMiddleware, upload.single('hasil_surat'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.hasil_surat = '/uploads/' + req.file.filename;
    await db.query('UPDATE surat SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/surat/:id', authMiddleware, async (req, res) => {
  try { await db.query('DELETE FROM surat WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== TRACKING SURAT ======================
app.get('/api/tracking-surat', async (req, res) => {
  try {
    const { nik, nama } = req.query;
    if (!nik || !nama) return res.status(400).json({ error: 'NIK dan Nama wajib diisi' });
    const [rows] = await db.query('SELECT id, created_at, jenis_surat, keperluan, workflow_stage, status, catatan, hasil_surat FROM surat WHERE nik = ? AND nama LIKE ? ORDER BY created_at DESC', [nik, '%' + nama + '%']);
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== PERMOHONAN INFO ======================
app.get('/api/permohonan-info', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM permohonan_info ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/permohonan-info', async (req, res) => {
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body, created_at: new Date().toISOString() };
    await db.query('INSERT INTO permohonan_info SET ?', data);
    res.json({ message: 'Berhasil dikirim', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/permohonan-info/:id', authMiddleware, upload.single('link_dokumen'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.link_dokumen = '/uploads/' + req.file.filename;
    await db.query('UPDATE permohonan_info SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/permohonan-info/:id', authMiddleware, async (req, res) => {
  try { await db.query('DELETE FROM permohonan_info WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== PENGADUAN ======================
app.get('/api/pengaduan', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pengaduan ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/pengaduan', async (req, res) => {
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body, created_at: new Date().toISOString() };
    await db.query('INSERT INTO pengaduan SET ?', data);
    res.json({ message: 'Berhasil dikirim', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/pengaduan/:id', authMiddleware, async (req, res) => {
  try {
    const data = { ...req.body };
    await db.query('UPDATE pengaduan SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/pengaduan/:id', authMiddleware, async (req, res) => {
  try { await db.query('DELETE FROM pengaduan WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== MITRA ======================
app.get('/api/mitra', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM mitra');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/mitra', authMiddleware, upload.single('foto'), async (req, res) => {
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    await db.query('INSERT INTO mitra SET ?', data);
    res.json({ message: 'Berhasil dikirim', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/mitra/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    await db.query('UPDATE mitra SET ? WHERE id = ?', [data, req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/mitra/:id', authMiddleware, async (req, res) => {
  try { await db.query('DELETE FROM mitra WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== STATS ======================
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [[{c_penduduk}]] = await db.query('SELECT COUNT(*) as c_penduduk FROM penduduk');
    const [[{c_kk}]] = await db.query('SELECT COUNT(DISTINCT no_kk) as c_kk FROM penduduk WHERE no_kk IS NOT NULL AND no_kk != ""');
    const [[{c_berita}]] = await db.query('SELECT COUNT(*) as c_berita FROM berita');
    const [[{c_surat}]] = await db.query('SELECT COUNT(*) as c_surat FROM surat');
    const [[{c_pengaduan}]] = await db.query('SELECT COUNT(*) as c_pengaduan FROM pengaduan');
    const [[{c_pengaduan_menunggu}]] = await db.query('SELECT COUNT(*) as c_pengaduan_menunggu FROM pengaduan WHERE status="Menunggu" OR status="Pending" OR status="Menunggu Diproses"');
    const [[{c_umkm}]] = await db.query('SELECT COUNT(*) as c_umkm FROM listing');
    const [[{c_pembangunan}]] = await db.query('SELECT COUNT(*) as c_pembangunan FROM pembangunan');
    
    res.json({
      jumlah_penduduk: c_penduduk,
      jumlah_kk: c_kk,
      total_berita: c_berita,
      total_surat: c_surat,
      total_pengaduan: c_pengaduan,
      pengaduan_menunggu: c_pengaduan_menunggu,
      total_listing: c_umkm,
      total_pembangunan: c_pembangunan
    });
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== LOGS ======================
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM logs ORDER BY waktu DESC LIMIT 100');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== INIT SERVER ======================
async function initServer() {
  app.listen(PORT, () => {
    console.log('\n🏡 Website Desa Kauman berjalan di http://localhost:' + PORT);
    console.log('📊 Admin Panel: http://localhost:' + PORT + '/admin');
    console.log('🔑 Login: admin / kauman2024\n');
  });
}
initServer();

// ====================== NOTIFICATIONS ======================
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const [[{c_surat}]] = await db.query('SELECT COUNT(*) as c_surat FROM surat WHERE status = "Menunggu"');
    const [[{c_pengaduan}]] = await db.query('SELECT COUNT(*) as c_pengaduan FROM pengaduan WHERE status = "Menunggu"');
    const notifs = [];
    if (c_surat > 0) notifs.push({ icon: '✉️', title: `${c_surat} Surat Menunggu`, time: 'Baru saja' });
    if (c_pengaduan > 0) notifs.push({ icon: '📢', title: `${c_pengaduan} Pengaduan Baru`, time: 'Baru saja' });
    res.json(notifs);
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== LISTING UMKM ======================
app.get('/api/listing', async (req, res) => { try { const [rows] = await db.query('SELECT id, data FROM listing'); res.json(rows.map(r => { let d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}); d.id = r.id; return d; })); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/listing/:id', async (req, res) => { try { const [rows] = await db.query('SELECT id, data FROM listing WHERE id = ?', [req.params.id]); if (rows.length) { let d = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : (rows[0].data || {}); d.id = rows[0].id; res.json(d); } else { res.json({}); } } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/listing', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/listing', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    await db.query('INSERT INTO listing (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/listing/:id', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/listing/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM listing WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    await db.query('UPDATE listing SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/listing/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/listing/:id', 'Menghapus data');
  try { await db.query('DELETE FROM listing WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});


// ====================== PROGRAM KERJA ======================
app.get('/api/program', async (req, res) => { try { const [rows] = await db.query('SELECT id, data FROM program'); res.json(rows.map(r => { let d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {}); d.id = r.id; return d; })); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/program/:id', async (req, res) => { try { const [rows] = await db.query('SELECT id, data FROM program WHERE id = ?', [req.params.id]); if(rows.length) { let d = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : (rows[0].data || {}); d.id = rows[0].id; res.json(d); } else { res.json({}); } } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/program', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/program', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    await db.query('INSERT INTO program (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/program/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/program/:id', 'Mengubah data');
  try {
    const data = req.body;
    await db.query('UPDATE program SET data=? WHERE id=?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/program/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/program/:id', 'Menghapus data');
  try { await db.query('DELETE FROM program WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});



app.get('/api/statistik-tambahan', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM statistik_tambahan'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/statistik-tambahan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/statistik-tambahan', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/statistik-tambahan', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    await db.query('INSERT INTO statistik_tambahan (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/statistik-tambahan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/statistik-tambahan/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({error: 'Not found'});
    const data = { ...(typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data), ...req.body };
    await db.query('UPDATE statistik_tambahan SET data=? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/statistik-tambahan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/statistik-tambahan/:id', 'Menghapus data');
  try { await db.query('DELETE FROM statistik_tambahan WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/statistik-tambahan/:katId/item', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/statistik-tambahan/:katId/item', 'Menambahkan item');
  try {
    const [existing] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.katId]);
    if (existing.length === 0) return res.status(404).json({error: 'Not found'});
    const data = typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data;
    if(!data.items) data.items = [];
    data.items.push({ id: Date.now(), ...req.body });
    await db.query('UPDATE statistik_tambahan SET data=? WHERE id = ?', [JSON.stringify(data), req.params.katId]);
    res.json({ message: 'Item berhasil ditambahkan' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/statistik-tambahan/:katId/item/:itemId', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/statistik-tambahan/:katId/item/:itemId', 'Mengubah item');
  try {
    const [existing] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.katId]);
    if (existing.length === 0) return res.status(404).json({error: 'Not found'});
    const data = typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data;
    if(!data.items) data.items = [];
    const idx = data.items.findIndex(i => i.id == req.params.itemId);
    if(idx !== -1) {
      data.items[idx] = { ...data.items[idx], ...req.body };
      await db.query('UPDATE statistik_tambahan SET data=? WHERE id = ?', [JSON.stringify(data), req.params.katId]);
      res.json({ message: 'Item berhasil diubah' });
    } else {
      res.status(404).json({error: 'Item not found'});
    }
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/statistik-tambahan/:katId/item/:itemId', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/statistik-tambahan/:katId/item/:itemId', 'Menghapus item');
  try {
    const [existing] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.katId]);
    if (existing.length === 0) return res.status(404).json({error: 'Not found'});
    const data = typeof existing[0].data === 'string' ? JSON.parse(existing[0].data) : existing[0].data;
    if(data.items) {
      data.items = data.items.filter(i => i.id != req.params.itemId);
      await db.query('UPDATE statistik_tambahan SET data=? WHERE id = ?', [JSON.stringify(data), req.params.katId]);
    }
    res.json({ message: 'Item dihapus' });
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== TELEPON DARURAT ======================
app.get('/api/darurat', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM telepon_darurat');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.get('/api/darurat/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM telepon_darurat WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({error: 'Not found'});
    res.json(rows[0]);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/darurat', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/darurat', 'Menambahkan kontak darurat');
  try {
    const newId = Date.now();
    const { nama, nomor, kategori } = req.body;
    await db.query('INSERT INTO telepon_darurat (id, nama, nomor, kategori) VALUES (?, ?, ?, ?)', [newId, nama, nomor, kategori]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/darurat/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/darurat/:id', 'Mengubah kontak darurat');
  try {
    const { nama, nomor, kategori } = req.body;
    await db.query('UPDATE telepon_darurat SET nama=?, nomor=?, kategori=? WHERE id=?', [nama, nomor, kategori, req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/darurat/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/darurat/:id', 'Menghapus kontak darurat');
  try {
    await db.query('DELETE FROM telepon_darurat WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dihapus' });
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== GLOBAL 404 HANDLER ======================
app.use('/api', (req, res) => {
  fs.appendFileSync('404_logs.txt', `[${new Date().toISOString()}] 404: ${req.method} ${req.originalUrl}\n`);
  res.status(404).json({ error: `API Route not found: ${req.method} ${req.originalUrl}` });
});

// ====================== GLOBAL ERROR HANDLER ======================
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Ukuran file terlalu besar. Maksimal 5MB.' });
  } else if (err && err.message) {
    return res.status(500).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
  next();
});
