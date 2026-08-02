const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const agendaRoute = `
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
`;

code = code.replace('// ====================== BERITA ======================', agendaRoute + '\n// ====================== BERITA ======================');
fs.writeFileSync('server.js', code);
console.log('Restored agenda route');
