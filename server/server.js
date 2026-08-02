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
app.use(cors());
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
const dataPath = path.join(__dirname, 'data');

function readData(file) {
  try {
    const raw = fs.readFileSync(path.join(dataPath, file), 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeData(file, data) {
  fs.writeFileSync(path.join(dataPath, file), JSON.stringify(data, null, 2), 'utf-8');
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
      await db.query('INSERT INTO desa_profil (id, nama, alamat, telepon, email, deskripsi, logo) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [1, data.nama, data.alamat, data.telepon, data.email, data.deskripsi, data.logo]);
    } else {
      await db.query('UPDATE desa_profil SET nama=?, alamat=?, telepon=?, email=?, deskripsi=?, logo=? WHERE id=?', 
        [data.nama, data.alamat, data.telepon, data.email, data.deskripsi, data.logo, existing[0].id]);
    }
    res.json(data);
  } catch(e) { res.status(500).json({error: e.message}); }
});

// ====================== PENDUDUK (Statistik & DB) ======================
app.get('/api/penduduk', async (req, res) => {
  // Cek otorisasi manual
  let isAdmin = false;
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'desa-kauman-secret-key-2024');
      isAdmin = true;
    } catch(e){}
  }
  try {
    const { search, limit, page } = req.query;
    
    // Auto-calculate stats from DB
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as jumlah_penduduk,
        COUNT(DISTINCT no_kk) as jumlah_kk,
        SUM(CASE WHEN jenis_kelamin = 'Lk' THEN 1 ELSE 0 END) as laki_laki,
        SUM(CASE WHEN jenis_kelamin = 'Pr' THEN 1 ELSE 0 END) as perempuan
      FROM penduduk
    `);

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
    
    // Aggregate queries
    const [agamaData] = await db.query(`SELECT agama as label, COUNT(*) as jumlah FROM penduduk GROUP BY agama ORDER BY jumlah DESC`);
    const [pendidikanData] = await db.query(`SELECT pendidikan as label, COUNT(*) as jumlah FROM penduduk GROUP BY pendidikan ORDER BY jumlah DESC`);
    const [pekerjaanData] = await db.query(`SELECT pekerjaan as label, COUNT(*) as jumlah FROM penduduk GROUP BY pekerjaan ORDER BY jumlah DESC`);
    
    const [umurData] = await db.query(`
      SELECT 
        CASE 
          WHEN age BETWEEN 0 AND 4 THEN '0 - 4 Tahun'
          WHEN age BETWEEN 5 AND 9 THEN '5 - 9 Tahun'
          WHEN age BETWEEN 10 AND 14 THEN '10 - 14 Tahun'
          WHEN age BETWEEN 15 AND 19 THEN '15 - 19 Tahun'
          WHEN age BETWEEN 20 AND 24 THEN '20 - 24 Tahun'
          WHEN age BETWEEN 25 AND 29 THEN '25 - 29 Tahun'
          WHEN age BETWEEN 30 AND 34 THEN '30 - 34 Tahun'
          WHEN age BETWEEN 35 AND 39 THEN '35 - 39 Tahun'
          WHEN age BETWEEN 40 AND 44 THEN '40 - 44 Tahun'
          WHEN age BETWEEN 45 AND 49 THEN '45 - 49 Tahun'
          WHEN age BETWEEN 50 AND 54 THEN '50 - 54 Tahun'
          WHEN age BETWEEN 55 AND 59 THEN '55 - 59 Tahun'
          WHEN age BETWEEN 60 AND 64 THEN '60 - 64 Tahun'
          WHEN age BETWEEN 65 AND 69 THEN '65 - 69 Tahun'
          WHEN age BETWEEN 70 AND 74 THEN '70 - 74 Tahun'
          ELSE '> 75 Tahun' 
        END as label,
        COUNT(*) as jumlah
      FROM (
        SELECT TIMESTAMPDIFF(YEAR, STR_TO_DATE(tanggal_lahir, '%d/%m/%Y'), CURDATE()) as age 
        FROM penduduk
      ) as tbl
      GROUP BY label
      ORDER BY MIN(age) ASC
    `);
    
    res.json({
      statistik: {
        jumlah_penduduk: stats[0].jumlah_penduduk,
        jumlah_kk: stats[0].jumlah_kk,
        laki_laki: stats[0].laki_laki,
        perempuan: stats[0].perempuan,
      },
      kelompok_umur: umurData,
      pendidikan: pendidikanData,
      pekerjaan: pekerjaanData,
      agama: agamaData,
      data: rows,
      total: total,
      page: p,
      limit: l
    });
  } catch (error) {
    console.error('DB error - using fallback:', error.message);
    // Fallback if DB error or table not found
    const fallback = readData('penduduk.json') || {};
    if (!isAdmin && fallback.data) delete fallback.data;
    res.json(fallback);
  }
});
app.put('/api/penduduk', authMiddleware, (req, res) => {
  writeData('penduduk.json', req.body);
  res.json(req.body);
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
    const [rows] = await db.query('SELECT * FROM agenda');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.get('/api/agenda/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM agenda WHERE id = ?', [req.params.id]);
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/agenda', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/agenda', 'Menambahkan data');
  try {
    const newId = Date.now();
    const { judul, tanggal, waktu, lokasi, status, deskripsi } = req.body;
    await db.query('INSERT INTO agenda (id, judul, tanggal, waktu, lokasi, status, deskripsi) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newId, judul, tanggal, waktu, lokasi, status, deskripsi]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/agenda/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/agenda/:id', 'Mengubah data');
  try {
    const { judul, tanggal, waktu, lokasi, status, deskripsi } = req.body;
    await db.query('UPDATE agenda SET judul=?, tanggal=?, waktu=?, lokasi=?, status=?, deskripsi=? WHERE id=?',
      [judul, tanggal, waktu, lokasi, status, deskripsi, req.params.id]);
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
    let query = "SELECT * FROM berita"; // wait, old code didn't force aktif=1 here unless specified, I'll just return all
    let countQuery = "SELECT COUNT(*) as total FROM berita";
    let params = [];

    if (search) {
      query += " WHERE (judul LIKE ? OR ringkasan LIKE ?)";
      countQuery += " WHERE (judul LIKE ? OR ringkasan LIKE ?)";
      params.push('%' + search + '%', '%' + search + '%');
    }

    const [totalRows] = await db.query(countQuery, params);
    const total = totalRows[0].total;

    let p = 1;
    let l = 100;
    
    if (page) p = parseInt(page);
    if (limit) l = parseInt(limit);
    
    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(l, (p - 1) * l);

    const [rows] = await db.query(query, params);
    res.json({ data: rows, total, page: p, limit: l });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.get('/api/berita/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM berita WHERE id = ?', [req.params.id]);
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
    if (data.aktif === undefined) data.aktif = null;
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


// ====================== LISTING UMKM ======================

app.post('/api/listing', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/listing', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    if (data.nama === undefined) data.nama = null;
    if (data.deskripsi === undefined) data.deskripsi = null;
    if (data.kategori === undefined) data.kategori = null;
    if (data.harga === undefined) data.harga = null;
    if (data.kontak === undefined) data.kontak = null;
    if (data.gambar === undefined) data.gambar = null;
    if (data.penjual === undefined) data.penjual = null;
    
    // For JSON fields like rincian or indikator
    if (typeof data.nama === 'object') data.nama = JSON.stringify(data.nama);
    if (typeof data.deskripsi === 'object') data.deskripsi = JSON.stringify(data.deskripsi);
    if (typeof data.kategori === 'object') data.kategori = JSON.stringify(data.kategori);
    if (typeof data.harga === 'object') data.harga = JSON.stringify(data.harga);
    if (typeof data.kontak === 'object') data.kontak = JSON.stringify(data.kontak);
    if (typeof data.gambar === 'object') data.gambar = JSON.stringify(data.gambar);
    if (typeof data.penjual === 'object') data.penjual = JSON.stringify(data.penjual);
    
    const query = 'INSERT INTO listing (id, nama, deskripsi, kategori, harga, kontak, gambar, penjual) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [newId, data.nama, data.deskripsi, data.kategori, data.harga, data.kontak, data.gambar, data.penjual];
    await db.query(query, values);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/listing/:id', authMiddleware, upload.single('gambar'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/listing/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT * FROM listing WHERE id = ?', [req.params.id]);
    const data = { ...existing[0], ...req.body };
    if (req.file) data.gambar = '/uploads/' + req.file.filename;
    
    if (typeof data.nama === 'object') data.nama = JSON.stringify(data.nama);
    if (typeof data.deskripsi === 'object') data.deskripsi = JSON.stringify(data.deskripsi);
    if (typeof data.kategori === 'object') data.kategori = JSON.stringify(data.kategori);
    if (typeof data.harga === 'object') data.harga = JSON.stringify(data.harga);
    if (typeof data.kontak === 'object') data.kontak = JSON.stringify(data.kontak);
    if (typeof data.gambar === 'object') data.gambar = JSON.stringify(data.gambar);
    if (typeof data.penjual === 'object') data.penjual = JSON.stringify(data.penjual);
    
    const query = 'UPDATE listing SET nama = ?, deskripsi = ?, kategori = ?, harga = ?, kontak = ?, gambar = ?, penjual = ? WHERE id = ?';
    const values = [data.nama, data.deskripsi, data.kategori, data.harga, data.kontak, data.gambar, data.penjual, req.params.id];
    await db.query(query, values);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/listing/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/listing/:id', 'Menghapus data');
  try { await db.query('DELETE FROM listing WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
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
app.post('/api/pengaduan', upload.single('foto'), async (req, res) => {
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body, created_at: new Date().toISOString() };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
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
app.get('/api/listing', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM listing'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/listing/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM listing WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
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
app.get('/api/program', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM program'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/program/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM program WHERE id = ?', [req.params.id]); res.json(rows.length ? rows[0] : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/program', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/program', 'Menambahkan data');
  try {
    const newId = Date.now();
    const foto = req.file ? '/uploads/' + req.file.filename : '';
    await db.query('INSERT INTO program (id, nama, deskripsi, anggaran, status, progress, foto) VALUES (?, ?, ?, ?, ?, ?, ?)', [newId, req.body.nama || '', req.body.deskripsi || '', req.body.anggaran || '', req.body.status || '', req.body.progress || 0, foto]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/program/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/program/:id', 'Mengubah data');
  try {
    if (req.file) {
      await db.query('UPDATE program SET nama=?, deskripsi=?, anggaran=?, status=?, progress=?, foto=? WHERE id=?', [req.body.nama, req.body.deskripsi, req.body.anggaran, req.body.status, req.body.progress, '/uploads/' + req.file.filename, req.params.id]);
    } else {
      await db.query('UPDATE program SET nama=?, deskripsi=?, anggaran=?, status=?, progress=? WHERE id=?', [req.body.nama, req.body.deskripsi, req.body.anggaran, req.body.status, req.body.progress, req.params.id]);
    }
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/program/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/program/:id', 'Menghapus data');
  try { await db.query('DELETE FROM program WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});


// ====================== PEMBANGUNAN ======================
app.get('/api/pembangunan', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM pembangunan'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/pembangunan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM pembangunan WHERE id = ?', [req.params.id]); res.json(rows.length ? rows[0] : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/pembangunan', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/pembangunan', 'Menambahkan data');
  try {
    const newId = Date.now();
    const foto = req.file ? '/uploads/' + req.file.filename : '';
    await db.query('INSERT INTO pembangunan (id, nama, lokasi, anggaran, sumber_dana, progress, foto) VALUES (?, ?, ?, ?, ?, ?, ?)', [newId, req.body.nama || '', req.body.lokasi || '', req.body.anggaran || '', req.body.sumber_dana || '', req.body.progress || 0, foto]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/pembangunan/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/pembangunan/:id', 'Mengubah data');
  try {
    if (req.file) {
      await db.query('UPDATE pembangunan SET nama=?, lokasi=?, anggaran=?, sumber_dana=?, progress=?, foto=? WHERE id=?', [req.body.nama, req.body.lokasi, req.body.anggaran, req.body.sumber_dana, req.body.progress, '/uploads/' + req.file.filename, req.params.id]);
    } else {
      await db.query('UPDATE pembangunan SET nama=?, lokasi=?, anggaran=?, sumber_dana=?, progress=? WHERE id=?', [req.body.nama, req.body.lokasi, req.body.anggaran, req.body.sumber_dana, req.body.progress, req.params.id]);
    }
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/pembangunan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/pembangunan/:id', 'Menghapus data');
  try { await db.query('DELETE FROM pembangunan WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});


// ====================== STATISTIK TAMBAHAN ======================
app.get('/api/statistik-tambahan', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM statistik_tambahan LIMIT 1'); res.json(rows.length ? rows[0] : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/statistik-tambahan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM statistik_tambahan WHERE id = ?', [req.params.id]); res.json(rows.length ? rows[0] : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/statistik-tambahan', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/statistik-tambahan', 'Menambahkan data');
  try {
    const newId = Date.now();
    await db.query('INSERT INTO statistik_tambahan (id, kategori, label, nilai, warna) VALUES (?, ?, ?, ?, ?)', [newId, req.body.kategori || '', req.body.label || '', req.body.nilai || 0, req.body.warna || '']);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/statistik-tambahan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/statistik-tambahan/:id', 'Mengubah data');
  try {
    await db.query('UPDATE statistik_tambahan SET kategori=?, label=?, nilai=?, warna=? WHERE id = ?', [req.body.kategori || '', req.body.label || '', req.body.nilai || 0, req.body.warna || '', req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.delete('/api/statistik-tambahan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/statistik-tambahan/:id', 'Menghapus data');
  try { await db.query('DELETE FROM statistik_tambahan WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});
