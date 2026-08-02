const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf-8');

const remainingEntities = [
  { name: 'PERANGKAT', table: 'perangkat', fields: ['nama', 'jabatan', 'foto', 'nip', 'periode', 'urutan'], hasImage: true, imageField: 'foto' },
  { name: 'MITRA', table: 'mitra', fields: ['nama', 'deskripsi', 'kontak', 'foto', 'link'], hasImage: true, imageField: 'foto' },
  { name: 'PPID', table: 'ppid', fields: ['kategori', 'judul', 'file', 'tanggal', 'nama', 'deskripsi', 'aktif'], hasImage: true, imageField: 'file' }
];

function generateCrud(entity) {
  let str = `// ====================== ${entity.name} ======================\n`;
  const routeName = entity.table;

  str += `app.get('/api/${routeName}', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM ${entity.table}'); res.json(rows); } catch (err) { res.status(500).json({error: err.message}); } });\n`;
  str += `app.get('/api/${routeName}/:id', async (req, res) => { try { const [rows] = await db.query('SELECT * FROM ${entity.table} WHERE id = ?', [req.params.id]); res.json(rows[0] || {}); } catch (err) { res.status(500).json({error: err.message}); } });\n`;
  
  const uploadMiddleware = entity.hasImage ? `, upload.single('${entity.imageField}')` : '';
  str += `app.post('/api/${routeName}', authMiddleware${uploadMiddleware}, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/${routeName}', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    ${entity.hasImage ? `if (req.file) data.${entity.imageField} = '/uploads/' + req.file.filename;` : ''}
    ${entity.fields.map(f => `if (data.${f} === undefined) data.${f} = null;`).join('\n    ')}
    
    const query = 'INSERT INTO ${entity.table} (id, ${entity.fields.join(', ')}) VALUES (?, ${entity.fields.map(() => '?').join(', ')})';
    const values = [newId, ${entity.fields.map(f => `data.${f}`).join(', ')}];
    await db.query(query, values);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  str += `app.put('/api/${routeName}/:id', authMiddleware${uploadMiddleware}, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/${routeName}/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT * FROM ${entity.table} WHERE id = ?', [req.params.id]);
    const data = { ...existing[0], ...req.body };
    ${entity.hasImage ? `if (req.file) data.${entity.imageField} = '/uploads/' + req.file.filename;` : ''}
    
    const query = 'UPDATE ${entity.table} SET ${entity.fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?';
    const values = [${entity.fields.map(f => `data.${f}`).join(', ')}, req.params.id];
    await db.query(query, values);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  str += `app.delete('/api/${routeName}/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/${routeName}/:id', 'Menghapus data');
  try { await db.query('DELETE FROM ${entity.table} WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  return str;
}

remainingEntities.forEach(ent => {
  const regex = new RegExp(`// ====================== ${ent.name} ======================[\\s\\S]*?(?=\\n// ====================== |\\n// ===== )`);
  if (code.match(regex)) {
    const newCode = generateCrud(ent);
    code = code.replace(regex, newCode.trim() + '\n\n');
  }
});

// Also fix stats
code = code.replace(
  /app\.get\('\/api\/stats', \(req, res\) => {[\s\S]*?res\.json\(stats\);\s*}\);/,
  `app.get('/api/stats', async (req, res) => {
  try {
    const [surat] = await db.query('SELECT COUNT(*) as c FROM surat');
    const [pengaduan] = await db.query('SELECT COUNT(*) as c FROM pengaduan');
    const [penduduk] = await db.query('SELECT SUM(jumlah) as c FROM penduduk_stats WHERE kategori = "total_penduduk"');
    const [berita] = await db.query('SELECT COUNT(*) as c FROM berita');
    
    res.json({
      surat: surat[0].c,
      pengaduan: pengaduan[0].c,
      penduduk: penduduk[0].c || 0,
      berita: berita[0].c
    });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

fs.writeFileSync('server.js', code);
console.log('Fixed remaining readData calls');
