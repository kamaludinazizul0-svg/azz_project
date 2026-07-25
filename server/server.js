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
const JWT_SECRET = 'desa-kauman-secret-key-2024';

// ====================== MIDDLEWARE ======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
  const fileUrl = '/uploads/' + req.file.filename;
  res.json({ url: fileUrl });
});

// ====================== AUTH ======================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const data = readData('users.json');
  const user = data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Username tidak ditemukan' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Password salah' });
  const token = jwt.sign({ id: user.id, username: user.username, nama: user.nama, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, nama: user.nama, role: user.role } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { password_lama, password_baru } = req.body;
  const data = readData('users.json');
  const idx = data.users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'User tidak ditemukan' });
  const valid = await bcrypt.compare(password_lama, data.users[idx].password);
  if (!valid) return res.status(400).json({ error: 'Password lama salah' });
  data.users[idx].password = await bcrypt.hash(password_baru, 10);
  writeData('users.json', data);
  res.json({ message: 'Password berhasil diubah' });
});

// ====================== DESA (Profil) ======================
app.get('/api/desa', (req, res) => res.json(readData('desa.json')));
app.put('/api/desa', authMiddleware, (req, res) => {
  const existing = readData('desa.json');
  const updated = { ...existing, ...req.body };
  writeData('desa.json', updated);
  res.json(updated);
});

// ====================== PENDUDUK (Statistik & DB) ======================
app.get('/api/penduduk', async (req, res) => {
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
    console.error(error);
    // Fallback if DB error or table not found
    const fallback = readData('penduduk.json') || {};
    res.json(fallback);
  }
});
app.put('/api/penduduk', authMiddleware, (req, res) => {
  writeData('penduduk.json', req.body);
  res.json(req.body);
});

// ====================== SLIDER ======================
app.get('/api/slider', (req, res) => res.json(readData('slider.json')));
app.post('/api/slider', authMiddleware, (req, res) => {
  const data = readData('slider.json');
  const newItem = { ...req.body, id: Date.now(), aktif: true };
  data.push(newItem);
  writeData('slider.json', data);
  res.json(newItem);
});
app.put('/api/slider/:id', authMiddleware, (req, res) => {
  const data = readData('slider.json');
  const idx = data.findIndex(s => s.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('slider.json', data);
  res.json(data[idx]);
});
app.delete('/api/slider/:id', authMiddleware, (req, res) => {
  let data = readData('slider.json');
  data = data.filter(s => s.id != req.params.id);
  writeData('slider.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== PERANGKAT ======================
app.get('/api/perangkat', (req, res) => res.json(readData('perangkat.json')));
app.post('/api/perangkat', authMiddleware, (req, res) => {
  const data = readData('perangkat.json');
  const newItem = { ...req.body, id: Date.now() };
  data.push(newItem);
  writeData('perangkat.json', data);
  res.json(newItem);
});
app.put('/api/perangkat/:id', authMiddleware, (req, res) => {
  const data = readData('perangkat.json');
  const idx = data.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('perangkat.json', data);
  res.json(data[idx]);
});
app.delete('/api/perangkat/:id', authMiddleware, (req, res) => {
  let data = readData('perangkat.json');
  data = data.filter(p => p.id != req.params.id);
  writeData('perangkat.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== BERITA ======================
app.get('/api/berita', (req, res) => {
  let data = readData('berita.json');
  const { kategori, limit, page } = req.query;
  if (kategori) data = data.filter(b => b.kategori === kategori);
  data = data.filter(b => b.aktif !== false);
  data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  const total = data.length;
  if (limit) {
    const l = parseInt(limit);
    const p = parseInt(page) || 1;
    const start = (p - 1) * l;
    data = data.slice(start, start + l);
  }
  res.json({ data, total });
});
app.get('/api/berita/:slug', (req, res) => {
  const data = readData('berita.json');
  const item = data.find(b => b.slug === req.params.slug || b.id == req.params.slug);
  if (!item) return res.status(404).json({ error: 'Berita tidak ditemukan' });
  // increment views
  item.dilihat = (item.dilihat || 0) + 1;
  const idx = data.findIndex(b => b.id === item.id);
  data[idx] = item;
  writeData('berita.json', data);
  res.json(item);
});
app.post('/api/berita', authMiddleware, (req, res) => {
  const data = readData('berita.json');
  const newItem = { ...req.body, id: Date.now(), dilihat: 0, aktif: true };
  if (!newItem.slug) newItem.slug = newItem.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  data.push(newItem);
  writeData('berita.json', data);
  res.json(newItem);
});
app.put('/api/berita/:id', authMiddleware, (req, res) => {
  const data = readData('berita.json');
  const idx = data.findIndex(b => b.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('berita.json', data);
  res.json(data[idx]);
});
app.delete('/api/berita/:id', authMiddleware, (req, res) => {
  let data = readData('berita.json');
  data = data.filter(b => b.id != req.params.id);
  writeData('berita.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== LISTING ======================
app.get('/api/listing', (req, res) => {
  let data = readData('listing.json');
  const { kategori } = req.query;
  if (kategori) data = data.filter(l => l.kategori === kategori);
  data = data.filter(l => l.aktif !== false);
  res.json(data);
});
app.get('/api/listing/:id', (req, res) => {
  const data = readData('listing.json');
  const item = data.find(l => l.id == req.params.id);
  if (!item) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json(item);
});
app.post('/api/listing', authMiddleware, (req, res) => {
  const data = readData('listing.json');
  const newItem = { ...req.body, id: Date.now(), aktif: true };
  data.push(newItem);
  writeData('listing.json', data);
  res.json(newItem);
});
app.put('/api/listing/:id', authMiddleware, (req, res) => {
  const data = readData('listing.json');
  const idx = data.findIndex(l => l.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('listing.json', data);
  res.json(data[idx]);
});
app.delete('/api/listing/:id', authMiddleware, (req, res) => {
  let data = readData('listing.json');
  data = data.filter(l => l.id != req.params.id);
  writeData('listing.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== APBDesa ======================
app.get('/api/apbdesa', (req, res) => res.json(readData('apbdesa.json')));
app.put('/api/apbdesa', authMiddleware, (req, res) => {
  writeData('apbdesa.json', req.body);
  res.json(req.body);
});

// ====================== IDM ======================
app.get('/api/idm', (req, res) => res.json(readData('idm.json')));
app.put('/api/idm', authMiddleware, (req, res) => {
  writeData('idm.json', req.body);
  res.json(req.body);
});

// ====================== PPID ======================
app.get('/api/ppid', (req, res) => {
  let data = readData('ppid.json');
  const { kategori } = req.query;
  if (kategori) data = data.filter(p => p.kategori === kategori);
  res.json(data);
});
app.post('/api/ppid', authMiddleware, (req, res) => {
  const data = readData('ppid.json');
  const newItem = { ...req.body, id: Date.now(), aktif: true };
  data.push(newItem);
  writeData('ppid.json', data);
  res.json(newItem);
});
app.put('/api/ppid/:id', authMiddleware, (req, res) => {
  const data = readData('ppid.json');
  const idx = data.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('ppid.json', data);
  res.json(data[idx]);
});
app.delete('/api/ppid/:id', authMiddleware, (req, res) => {
  let data = readData('ppid.json');
  data = data.filter(p => p.id != req.params.id);
  writeData('ppid.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== GALERI ======================
app.get('/api/galeri', (req, res) => res.json(readData('galeri.json')));
app.post('/api/galeri', authMiddleware, (req, res) => {
  const data = readData('galeri.json');
  const newItem = { ...req.body, id: Date.now() };
  data.push(newItem);
  writeData('galeri.json', data);
  res.json(newItem);
});
app.delete('/api/galeri/:id', authMiddleware, (req, res) => {
  let data = readData('galeri.json');
  data = data.filter(g => g.id != req.params.id);
  writeData('galeri.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== PROGRAM PRIORITAS ======================
app.get('/api/program', (req, res) => {
  let data = readData('program.json') || [];
  data = data.filter(p => p.aktif !== false);
  res.json(data);
});
app.post('/api/program', authMiddleware, (req, res) => {
  const data = readData('program.json') || [];
  const newItem = { ...req.body, id: Date.now(), aktif: true };
  data.push(newItem);
  writeData('program.json', data);
  res.json(newItem);
});
app.put('/api/program/:id', authMiddleware, (req, res) => {
  const data = readData('program.json') || [];
  const idx = data.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('program.json', data);
  res.json(data[idx]);
});
app.delete('/api/program/:id', authMiddleware, (req, res) => {
  let data = readData('program.json') || [];
  data = data.filter(p => p.id != req.params.id);
  writeData('program.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== MITRA DESA ======================
app.get('/api/mitra', (req, res) => {
  let data = readData('mitra.json') || [];
  data = data.filter(m => m.aktif !== false);
  res.json(data);
});
app.post('/api/mitra', authMiddleware, (req, res) => {
  const data = readData('mitra.json') || [];
  const newItem = { ...req.body, id: Date.now(), aktif: true };
  data.push(newItem);
  writeData('mitra.json', data);
  res.json(newItem);
});
app.put('/api/mitra/:id', authMiddleware, (req, res) => {
  const data = readData('mitra.json') || [];
  const idx = data.findIndex(m => m.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('mitra.json', data);
  res.json(data[idx]);
});
app.delete('/api/mitra/:id', authMiddleware, (req, res) => {
  let data = readData('mitra.json') || [];
  data = data.filter(m => m.id != req.params.id);
  writeData('mitra.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== UPLOAD ======================
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// ====================== AGENDA ======================
app.get('/api/agenda', (req, res) => {
  let data = readData('agenda.json') || [];
  data = data.filter(a => a.aktif !== false);
  data.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
  res.json(data);
});
app.post('/api/agenda', authMiddleware, (req, res) => {
  const data = readData('agenda.json') || [];
  const newItem = { ...req.body, id: Date.now(), aktif: true };
  data.push(newItem);
  writeData('agenda.json', data);
  res.json(newItem);
});
app.put('/api/agenda/:id', authMiddleware, (req, res) => {
  const data = readData('agenda.json') || [];
  const idx = data.findIndex(a => a.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('agenda.json', data);
  res.json(data[idx]);
});
app.delete('/api/agenda/:id', authMiddleware, (req, res) => {
  let data = readData('agenda.json') || [];
  data = data.filter(a => a.id != req.params.id);
  writeData('agenda.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== SURAT ======================
app.get('/api/surat', authMiddleware, (req, res) => {
  let data = readData('surat.json') || [];
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(data);
});
app.post('/api/surat', (req, res) => {
  const data = readData('surat.json') || [];
  const newItem = { ...req.body, id: Date.now(), created_at: new Date().toISOString(), status: 'Menunggu' };
  data.push(newItem);
  writeData('surat.json', data);
  res.json(newItem);
});
app.put('/api/surat/:id', authMiddleware, async (req, res) => {
  const data = readData('surat.json') || [];
  const idx = data.findIndex(s => s.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  
  const oldStatus = data[idx].status;
  const oldHasil = data[idx].hasil_surat;
  data[idx] = { ...data[idx], ...req.body };
  writeData('surat.json', data);

  // Kirim WA Otomatis jika baru disetujui ATAU file hasil surat baru saja ditambahkan/diubah
  const justApproved = (data[idx].status === 'Disetujui' && oldStatus !== 'Disetujui' && req.body.hasil_surat);
  const newFileAdded = (data[idx].status === 'Disetujui' && req.body.hasil_surat && req.body.hasil_surat !== oldHasil);
  
  console.log('--- Cek Fonnte Trigger ---');
  console.log('oldStatus:', oldStatus, 'newStatus:', data[idx].status);
  console.log('oldHasil:', oldHasil, 'newHasil:', req.body.hasil_surat);
  console.log('justApproved:', !!justApproved, 'newFileAdded:', !!newFileAdded);

  if (justApproved || newFileAdded) {
    console.log('Memicu pengiriman Fonnte...');
    const desa = readData('desa.json') || {};
    const token = desa.kontak?.fonnte_token;
    if (token && data[idx].no_wa) {
      try {
        let targetWa = data[idx].no_wa.replace(/\D/g, '');
        if (targetWa.startsWith('0')) targetWa = '62' + targetWa.substring(1);
        
        const formData = new FormData();
        formData.append('target', targetWa);
        formData.append('message', `Halo Bpk/Ibu ${data[idx].nama},\n\nPermohonan surat Anda (${data[idx].jenis_surat}) telah *Selesai* diproses dan disetujui.\nSilakan unduh dokumen hasil surat pada pesan ini.\n\nTerima kasih.\n-- Admin Desa Kauman`);
        
        // Fonnte menolak mentah-mentah jika URL mengandung localhost.
        // File hanya akan dikirim via URL jika website sudah di-hosting online.
        if (!req.headers.host.includes('localhost') && !req.headers.host.includes('127.0.0.1')) {
          const protocol = req.protocol || 'http';
          const fileUrl = protocol + '://' + req.headers.host + req.body.hasil_surat;
          formData.append('url', fileUrl);
        }

        fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { 'Authorization': token },
          body: formData
        }).then(r => r.json()).then(d => {
          console.log('Fonnte Response:', d);
          if (d.status) {
            // Jika berhasil masuk antrean Fonnte, otomatis Hapus dari data
            const currentData = readData('surat.json') || [];
            const newData = currentData.filter(s => s.id != req.params.id);
            writeData('surat.json', newData);
            console.log(`Permohonan ${req.params.id} otomatis dihapus setelah WA terkirim.`);
          }
        }).catch(err => console.error('Fonnte request failed:', err));
      } catch (e) {
        console.error('Gagal kirim WA:', e);
      }
    }
  }

  res.json(data[idx]);
});
app.delete('/api/surat/:id', authMiddleware, (req, res) => {
  let data = readData('surat.json') || [];
  data = data.filter(s => s.id != req.params.id);
  writeData('surat.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== PERMOHONAN INFORMASI ======================
app.get('/api/permohonan-info', authMiddleware, (req, res) => {
  let data = readData('permohonan-info.json') || [];
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(data);
});
app.post('/api/permohonan-info', (req, res) => {
  const data = readData('permohonan-info.json') || [];
  const newItem = { ...req.body, id: Date.now(), created_at: new Date().toISOString(), status: 'Menunggu' };
  data.push(newItem);
  writeData('permohonan-info.json', data);
  res.json(newItem);
});
app.put('/api/permohonan-info/:id', authMiddleware, (req, res) => {
  const data = readData('permohonan-info.json') || [];
  const idx = data.findIndex(s => s.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('permohonan-info.json', data);
  res.json(data[idx]);
});
app.delete('/api/permohonan-info/:id', authMiddleware, (req, res) => {
  let data = readData('permohonan-info.json') || [];
  data = data.filter(s => s.id != req.params.id);
  writeData('permohonan-info.json', data);
  res.json({ message: 'Dihapus' });
});

// ====================== PENGADUAN ======================
app.get('/api/pengaduan', authMiddleware, (req, res) => {
  let data = readData('pengaduan.json') || [];
  data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(data);
});
app.post('/api/pengaduan', (req, res) => {
  const data = readData('pengaduan.json') || [];
  const newItem = { ...req.body, id: Date.now(), created_at: new Date().toISOString(), status: 'Menunggu' };
  data.push(newItem);
  writeData('pengaduan.json', data);
  res.json(newItem);
});
app.put('/api/pengaduan/:id', authMiddleware, (req, res) => {
  const data = readData('pengaduan.json') || [];
  const idx = data.findIndex(s => s.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tidak ditemukan' });
  data[idx] = { ...data[idx], ...req.body };
  writeData('pengaduan.json', data);
  res.json(data[idx]);
});
app.delete('/api/pengaduan/:id', authMiddleware, (req, res) => {
  let data = readData('pengaduan.json') || [];
  data = data.filter(s => s.id != req.params.id);
  writeData('pengaduan.json', data);
  res.json({ message: 'Dihapus' });
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  const berita = readData('berita.json') || [];
  const listing = readData('listing.json') || [];
  const perangkat = readData('perangkat.json') || [];
  
  let jumlah_penduduk = 0;
  let jumlah_kk = 0;
  
  try {
    const [stats] = await db.query('SELECT COUNT(*) as pop, COUNT(DISTINCT no_kk) as kk FROM penduduk');
    jumlah_penduduk = stats[0].pop;
    jumlah_kk = stats[0].kk;
  } catch(e) {
    // Fallback if DB fails
    const pendudukJson = readData('penduduk.json') || { statistik: {} };
    jumlah_penduduk = pendudukJson.statistik.jumlah_penduduk || 0;
    jumlah_kk = pendudukJson.statistik.jumlah_kk || 0;
  }

  res.json({
    total_berita: berita.length,
    total_listing: listing.length,
    total_perangkat: perangkat.length,
    jumlah_penduduk: jumlah_penduduk,
    jumlah_kk: jumlah_kk
  });
});

// ====================== START ======================
async function initServer() {
  // Auto-hash default password on first run
  const usersData = readData('users.json');
  if (usersData && usersData.users && usersData.users.length > 0) {
    let changed = false;
    for (let u of usersData.users) {
      if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        u.password = await bcrypt.hash(u.password, 10);
        changed = true;
      }
    }
    // If hash looks invalid, reset to default
    try {
      const test = await bcrypt.compare('kauman2024', usersData.users[0].password);
      if (!test && !await bcrypt.compare('test', usersData.users[0].password)) {
        usersData.users[0].password = await bcrypt.hash('kauman2024', 10);
        changed = true;
      }
    } catch(e) {
      usersData.users[0].password = await bcrypt.hash('kauman2024', 10);
      changed = true;
    }
    if (changed) writeData('users.json', usersData);
  }

  app.listen(PORT, () => {
    console.log(`\n🏡 Website Desa Kauman berjalan di http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: admin / kauman2024\n`);
  });
}
initServer();
