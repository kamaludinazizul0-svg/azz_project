const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

// 1. Patch GET /api/surat
code = code.replace(
  /app\.get\('\/api\/surat', authMiddleware, \(req, res\) => \{\s*let data = readData\('surat\.json'\) \|\| \[\];\s*data\.sort\(\(a, b\) => new Date\(b\.created_at\) - new Date\(a\.created_at\)\);\s*res\.json\(data\);\s*\}\);/,
  `app.get('/api/surat', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM surat ORDER BY created_at DESC');
    res.json(rows);
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 2. Patch GET /api/tracking-surat
code = code.replace(
  /app\.get\('\/api\/tracking-surat', \(req, res\) => {[\s\S]*?res\.json\(safeResults\);\n}\);/,
  `app.get('/api/tracking-surat', async (req, res) => {
  const { nik, nama } = req.query;
  if (!nik || !nama) return res.status(400).json({ error: 'NIK dan Nama wajib diisi' });
  
  try {
    const [rows] = await db.query('SELECT * FROM surat WHERE nik = ?', [nik]);
    const results = rows.filter(s => s.nama.toLowerCase().includes(nama.toLowerCase()));
    
    const safeResults = results.map(s => ({
      id: s.id,
      created_at: s.created_at,
      jenis_surat: s.jenis_surat,
      keperluan: s.keperluan,
      workflow_stage: s.workflow_stage || 'Operator',
      status: s.status || 'Pending',
      catatan: s.catatan,
      hasil_surat: s.hasil_surat
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(safeResults);
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 3. Patch POST /api/surat
code = code.replace(
  /app\.post\('\/api\/surat', upload\.fields\(\[\s*\{\s*name: 'lampiran_ktp',\s*maxCount: 1\s*\},\s*\{\s*name: 'lampiran',\s*maxCount: 1\s*\}\s*\]\), \(req, res\) => {[\s\S]*?res\.json\(newItem\);\s*}\);/,
  `app.post('/api/surat', upload.fields([
    { name: 'lampiran_ktp', maxCount: 1 },
    { name: 'lampiran', maxCount: 1 }
  ]), async (req, res) => {
  try {
    const newId = Date.now();
    const data = { ...req.body, id: newId, created_at: new Date().toISOString(), workflow_stage: 'Operator', status: 'Pending' };
    
    if (req.files && req.files['lampiran_ktp']) {
      data.lampiran_ktp = '/uploads/' + req.files['lampiran_ktp'][0].filename;
    } else { data.lampiran_ktp = null; }
    
    if (req.files && req.files['lampiran']) {
      data.lampiran = '/uploads/' + req.files['lampiran'][0].filename;
    } else { data.lampiran = null; }

    if (data.nama === undefined) data.nama = null;
    if (data.nik === undefined) data.nik = null;
    if (data.alamat === undefined) data.alamat = null;
    if (data.no_wa === undefined) data.no_wa = null;
    if (data.jenis_surat === undefined) data.jenis_surat = null;
    if (data.keperluan === undefined) data.keperluan = null;
    if (data.catatan === undefined) data.catatan = null;
    if (data.hasil_surat === undefined) data.hasil_surat = null;

    const query = 'INSERT INTO surat (id, nama, nik, alamat, no_wa, jenis_surat, keperluan, lampiran_ktp, lampiran, created_at, workflow_stage, status, catatan, hasil_surat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [newId, data.nama, data.nik, data.alamat, data.no_wa, data.jenis_surat, data.keperluan, data.lampiran_ktp, data.lampiran, data.created_at, data.workflow_stage, data.status, data.catatan, data.hasil_surat];
    
    await db.query(query, values);
    res.json(data);
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 4. Patch PUT /api/surat/:id
code = code.replace(
  /app\.put\('\/api\/surat\/:id', authMiddleware, \(req, res\) => {[\s\S]*?res\.json\(data\[idx\]\);\s*}\);/,
  `app.put('/api/surat/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/surat/:id', 'Mengubah data');
  try {
    const { workflow_stage, status, catatan, hasil_surat } = req.body;
    
    let updates = [];
    let values = [];
    
    if (workflow_stage !== undefined) { updates.push('workflow_stage = ?'); values.push(workflow_stage); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (catatan !== undefined) { updates.push('catatan = ?'); values.push(catatan); }
    if (hasil_surat !== undefined) { updates.push('hasil_surat = ?'); values.push(hasil_surat); }
    
    if (updates.length > 0) {
      const query = 'UPDATE surat SET ' + updates.join(', ') + ' WHERE id = ?';
      values.push(req.params.id);
      await db.query(query, values);
    }
    
    res.json({ message: 'Berhasil diubah' });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 5. Patch DELETE /api/surat/:id
code = code.replace(
  /app\.delete\('\/api\/surat\/:id', authMiddleware, \(req, res\) => {[\s\S]*?res\.json\(\{ message: 'Dihapus' \}\);\s*}\);/,
  `app.delete('/api/surat/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/surat/:id', 'Menghapus data');
  try {
    await db.query('DELETE FROM surat WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dihapus' });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 6. Patch /api/login
code = code.replace(
  /app\.post\('\/api\/login', \(req, res\) => {[\s\S]*?res\.json\(\{ token, user: \{ username: user\.username, role: user\.role \} \}\);\s*}\);/,
  `app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token, user: { username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: 'Username atau password salah' });
    }
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 7. Patch logActivity
code = code.replace(
  /function logActivity\(username, aksi, detail\) {[\s\S]*?writeData\('logs\.json', logs\);\n}/,
  `async function logActivity(username, aksi, detail) {
  try {
    await db.query('INSERT INTO logs (id, waktu, username, aksi, detail) VALUES (?, ?, ?, ?, ?)', [Date.now(), new Date().toISOString(), username || 'Sistem', aksi, detail]);
  } catch(e) { console.error('Gagal mencatat log', e); }
}`
);

// 8. Patch GET /api/logs
code = code.replace(
  /app\.get\('\/api\/logs', authMiddleware, \(req, res\) => {[\s\S]*?res\.json\(\{ logs: sortedLogs \}\);\s*}\);/,
  `app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM logs ORDER BY waktu DESC');
    res.json({ logs: rows });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

fs.writeFileSync('server.js', code);
console.log('Patched remaining endpoints');
