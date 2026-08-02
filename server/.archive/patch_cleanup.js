const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Remove duplicate listing route (the one that does SELECT *)
const badListingRouteRegex = /app\.get\('\/api\/listing', async \(req, res\) => \{ try \{ const \[rows\] = await db\.query\('SELECT \* FROM listing'\); res\.json\(rows\); \} catch \(err\) \{ res\.status\(500\)\.json\(\{error: err\.message\}\); \} \}\);\s*app\.get\('\/api\/listing\/:id', async \(req, res\) => \{ try \{ const \[rows\] = await db\.query\('SELECT \* FROM listing WHERE id = \?', \[req\.params\.id\]\); res\.json\(rows\[0\] \|\| \{\}\); \} catch \(err\) \{ res\.status\(500\)\.json\(\{error: err\.message\}\); \} \}\);/g;
code = code.replace(badListingRouteRegex, '');

// 2. Add pendidikan route (we will use JSON column for it since it's exactly like the others)
const pendidikanRoute = `
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
`;

if (!code.includes('/api/pendidikan')) {
  code = code.replace('// ====================== GALERI ======================', pendidikanRoute + '\n// ====================== GALERI ======================');
}

fs.writeFileSync('server.js', code);
console.log('Cleaned up routes and added pendidikan');
