const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Fix logs
code = code.replace(
  "const [rows] = await db.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');",
  "const [rows] = await db.query('SELECT * FROM logs ORDER BY waktu DESC LIMIT 100');"
);

// Fix program
const programOld = `app.get('/api/program', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM program'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/program/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM program WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/program', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/program', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    
    await db.query('INSERT INTO program (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/program/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/program/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM program WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    
    await db.query('UPDATE program SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});`;

const programNew = `app.get('/api/program', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM program'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
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
});`;

code = code.replace(programOld, programNew);

// Fix pembangunan
const pembangunanOld = `app.get('/api/pembangunan', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM pembangunan'); res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data)); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/pembangunan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM pembangunan WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.post('/api/pembangunan', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'POST /api/pembangunan', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    
    await db.query('INSERT INTO pembangunan (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.put('/api/pembangunan/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/pembangunan/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM pembangunan WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    if (req.file) data.foto = '/uploads/' + req.file.filename;
    
    await db.query('UPDATE pembangunan SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});`;

const pembangunanNew = `app.get('/api/pembangunan', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM pembangunan'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
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
});`;

code = code.replace(pembangunanOld, pembangunanNew);

// Fix statistik-tambahan
const statistikOld = `app.get('/api/statistik-tambahan', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM statistik_tambahan LIMIT 1'); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/statistik-tambahan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.id]); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.put('/api/statistik-tambahan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/statistik-tambahan/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM statistik_tambahan WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    
    
    await db.query('UPDATE statistik_tambahan SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});`;

const statistikNew = `app.get('/api/statistik-tambahan', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM statistik_tambahan'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });
app.get('/api/statistik-tambahan/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM statistik_tambahan WHERE id = ?', [req.params.id]); res.json(rows.length ? rows[0] : {}); } catch (err) { res.status(500).json({error: err.message}); } });
app.put('/api/statistik-tambahan/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/statistik-tambahan/:id', 'Mengubah data');
  try {
    await db.query('UPDATE statistik_tambahan SET kategori=?, label=?, nilai=?, warna=? WHERE id = ?', [req.body.kategori || '', req.body.label || '', req.body.nilai || 0, req.body.warna || '', req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});
app.post('/api/statistik-tambahan', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/statistik-tambahan', 'Menambahkan data');
  try {
    const newId = Date.now();
    await db.query('INSERT INTO statistik_tambahan (id, kategori, label, nilai, warna) VALUES (?, ?, ?, ?, ?)', [newId, req.body.kategori || '', req.body.label || '', req.body.nilai || 0, req.body.warna || '']);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});`;

code = code.replace(statistikOld, statistikNew);

fs.writeFileSync('server.js', code);
console.log('Fixed schemas for program, pembangunan, statistik_tambahan, and logs in server.js');
