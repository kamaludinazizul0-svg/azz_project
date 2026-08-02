const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

const adminRoutes = `
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
    const [[{c_berita}]] = await db.query('SELECT COUNT(*) as c_berita FROM berita');
    const [[{c_surat}]] = await db.query('SELECT COUNT(*) as c_surat FROM surat');
    const [[{c_pengaduan}]] = await db.query('SELECT COUNT(*) as c_pengaduan FROM pengaduan');
    const [[{c_umkm}]] = await db.query('SELECT COUNT(*) as c_umkm FROM listing');
    
    res.json({
      penduduk: c_penduduk,
      berita: c_berita,
      surat_masuk: c_surat,
      pengaduan: c_pengaduan,
      umkm: c_umkm
    });
  } catch (err) { res.status(500).json({error: err.message}); }
});

// ====================== LOGS ======================
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});
`;

if (!code.includes('/api/tracking-surat')) {
  code = code.replace('// ====================== INIT SERVER ======================', adminRoutes + '\\n// ====================== INIT SERVER ======================');
}

fs.writeFileSync('server.js', code);
console.log('Restored admin routes successfully');
