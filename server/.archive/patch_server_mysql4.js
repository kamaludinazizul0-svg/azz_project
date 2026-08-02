const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

const remainingEntities = [
  { name: 'SLIDER', table: 'slider', fields: ['judul', 'deskripsi', 'gambar', 'aktif'], hasImage: true, imageField: 'gambar' },
  { name: 'LISTING UMKM', table: 'listing', fields: ['nama', 'deskripsi', 'kategori', 'harga', 'kontak', 'gambar', 'penjual'], hasImage: true, imageField: 'gambar' },
  { name: 'APBDesa', table: 'apbdesa', fields: ['tahun', 'pendapatan', 'belanja', 'pembiayaan', 'rincian'], hasImage: false },
  { name: 'IDM', table: 'idm', fields: ['tahun', 'skor', 'status', 'indikator'], hasImage: false },
  { name: 'GALERI', table: 'galeri', fields: ['judul', 'kategori', 'gambar', 'tanggal'], hasImage: true, imageField: 'gambar' },
  { name: 'PROGRAM KERJA', table: 'program', fields: ['nama', 'deskripsi', 'anggaran', 'status', 'progress', 'foto'], hasImage: true, imageField: 'foto' },
  { name: 'PEMBANGUNAN', table: 'pembangunan', fields: ['nama', 'lokasi', 'anggaran', 'sumber_dana', 'progress', 'foto'], hasImage: true, imageField: 'foto' },
  { name: 'STATISTIK TAMBAHAN', table: 'statistik_tambahan', fields: ['kategori', 'label', 'nilai', 'warna'], hasImage: false },
];

function generateCrud(entity) {
  let str = `// ====================== ${entity.name} ======================\n`;
  const routeName = entity.table === 'statistik_tambahan' ? 'statistik-tambahan' : (entity.table === 'listing' ? 'listing' : entity.table);

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
    
    // For JSON fields like rincian or indikator
    ${entity.fields.map(f => `if (typeof data.${f} === 'object') data.${f} = JSON.stringify(data.${f});`).join('\n    ')}
    
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
    
    ${entity.fields.map(f => `if (typeof data.${f} === 'object') data.${f} = JSON.stringify(data.${f});`).join('\n    ')}
    
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
  const regexName = ent.name === 'LISTING UMKM' ? 'LISTING' : ent.name;
  const regex = new RegExp(`// ====================== ${regexName} ======================[\\s\\S]*?(?=\\n// ====================== |\\n// ===== )`);
  if (code.match(regex)) {
    const newCode = generateCrud(ent);
    code = code.replace(regex, newCode.trim() + '\n\n');
  }
});

// Patch Desa Profile
code = code.replace(
  /app\.get\('\/api\/desa', \(req, res\) => {[\s\S]*?res\.json\(desa\);\s*}\);/,
  `app.get('/api/desa', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM desa_profil LIMIT 1');
    res.json(rows.length > 0 ? rows[0] : {});
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);
code = code.replace(
  /app\.post\('\/api\/desa', authMiddleware, \(req, res\) => {[\s\S]*?res\.json\(\{ message: 'Profil disimpan' \}\);\s*}\);/,
  `app.post('/api/desa', authMiddleware, async (req, res) => {
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
    res.json({ message: 'Profil disimpan' });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

fs.writeFileSync('server.js', code);
console.log('Patched remaining tables');
