const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

const tables = ['slider', 'listing', 'apbdesa', 'idm', 'galeri', 'program', 'pembangunan', 'statistik-tambahan'];
const entities = [
  { name: 'SLIDER', table: 'slider', hasImage: true, imageField: 'gambar' },
  { name: 'LISTING UMKM', table: 'listing', hasImage: true, imageField: 'gambar' },
  { name: 'APBDesa', table: 'apbdesa', hasImage: false },
  { name: 'IDM', table: 'idm', hasImage: false },
  { name: 'GALERI', table: 'galeri', hasImage: true, imageField: 'gambar' },
  { name: 'PROGRAM KERJA', table: 'program', hasImage: true, imageField: 'foto' },
  { name: 'PEMBANGUNAN', table: 'pembangunan', hasImage: true, imageField: 'foto' },
  { name: 'STATISTIK TAMBAHAN', table: 'statistik-tambahan', hasImage: false },
];

function generateCrud(entity) {
  let str = `// ====================== ${entity.name} ======================\n`;
  const routeName = entity.table;
  const dbTable = entity.table === 'statistik-tambahan' ? 'statistik_tambahan' : entity.table;

  str += `app.get('/api/${routeName}', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM ${dbTable}'); res.json(rows.map(r => r.data)); } catch (err) { res.status(500).json({error: err.message}); } });\n`;
  str += `app.get('/api/${routeName}/:id', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM ${dbTable} WHERE id = ?', [req.params.id]); res.json(rows.length ? rows[0].data : {}); } catch (err) { res.status(500).json({error: err.message}); } });\n`;
  
  const uploadMiddleware = entity.hasImage ? `, upload.single('${entity.imageField}')` : '';
  str += `app.post('/api/${routeName}', authMiddleware${uploadMiddleware}, async (req, res) => {
  logActivity(req.user?.username, 'POST /api/${routeName}', 'Menambahkan data');
  try {
    const newId = Date.now();
    const data = { id: newId, ...req.body };
    ${entity.hasImage ? `if (req.file) data.${entity.imageField} = '/uploads/' + req.file.filename;` : ''}
    
    await db.query('INSERT INTO ${dbTable} (id, data) VALUES (?, ?)', [newId, JSON.stringify(data)]);
    res.json({ message: 'Berhasil ditambahkan', id: newId });
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  str += `app.put('/api/${routeName}/:id', authMiddleware${uploadMiddleware}, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/${routeName}/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT data FROM ${dbTable} WHERE id = ?', [req.params.id]);
    const data = { ...(existing.length ? existing[0].data : {}), ...req.body };
    ${entity.hasImage ? `if (req.file) data.${entity.imageField} = '/uploads/' + req.file.filename;` : ''}
    
    await db.query('UPDATE ${dbTable} SET data = ? WHERE id = ?', [JSON.stringify(data), req.params.id]);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  str += `app.delete('/api/${routeName}/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/${routeName}/:id', 'Menghapus data');
  try { await db.query('DELETE FROM ${dbTable} WHERE id = ?', [req.params.id]); res.json({ message: 'Dihapus' }); } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  return str;
}

entities.forEach(ent => {
  const regexName = ent.name === 'LISTING UMKM' ? 'LISTING' : ent.name;
  const regex = new RegExp(`// ====================== ${regexName} ======================[\\s\\S]*?(?=\\n// ====================== |\\n// ===== |$)`);
  if (code.match(regex)) {
    const newCode = generateCrud(ent);
    code = code.replace(regex, newCode.trim() + '\n\n');
  } else {
    // If block doesn't exist, append it
    code += '\n\n' + generateCrud(ent);
  }
});

fs.writeFileSync('server.js', code);
console.log('Patched server.js with JSON endpoints');
