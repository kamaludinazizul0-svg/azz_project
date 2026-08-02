const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

const entities = [
  {
    name: 'BERITA',
    table: 'berita',
    fields: ['judul', 'kategori', 'tanggal', 'waktu', 'ringkasan', 'konten', 'gambar', 'penulis', 'dilihat', 'aktif', 'slug', 'lokasi'],
    hasImage: true,
    imageField: 'gambar'
  },
  {
    name: 'AGENDA',
    table: 'agenda',
    fields: ['nama', 'tanggal', 'waktu', 'lokasi', 'deskripsi'],
    hasImage: false
  },
  {
    name: 'PENGADUAN',
    table: 'pengaduan',
    fields: ['nama', 'no_hp', 'nik', 'kategori', 'judul', 'isi', 'prioritas', 'foto', 'status', 'created_at', 'catatan'],
    hasImage: true,
    imageField: 'foto'
  },
  {
    name: 'PERMOHONAN INFORMASI',
    table: 'permohonan_info',
    fields: ['nama', 'no_hp', 'email', 'instansi', 'informasi_diminta', 'tujuan', 'format', 'status', 'created_at', 'catatan', 'link_dokumen'],
    hasImage: false
  },
  {
    name: 'PERANGKAT DESA',
    table: 'perangkat',
    fields: ['nama', 'jabatan', 'foto', 'nip', 'periode', 'urutan'],
    hasImage: true,
    imageField: 'foto'
  },
  {
    name: 'MITRA / UMKM',
    table: 'mitra',
    fields: ['nama', 'deskripsi', 'kontak', 'foto', 'link'],
    hasImage: true,
    imageField: 'foto'
  },
  {
    name: 'PPID (INFORMASI PUBLIK)',
    table: 'ppid',
    fields: ['kategori', 'judul', 'file', 'tanggal', 'nama', 'deskripsi', 'aktif'],
    hasImage: true,
    imageField: 'file' // pdf/docs treated as file upload
  }
];

// Helper to generate boilerplate CRUD for an entity
function generateCrud(entity) {
  let str = `// ====================== ${entity.name} ======================\n`;
  const routeName = entity.table === 'permohonan_info' ? 'permohonan-info' : entity.table;

  // GET All
  str += `app.get('/api/${routeName}', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ${entity.table}');
    res.json(rows);
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  // GET One
  str += `app.get('/api/${routeName}/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ${entity.table} WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({error: 'Not found'});
    res.json(rows[0]);
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  // POST
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

  // PUT
  str += `app.put('/api/${routeName}/:id', authMiddleware${uploadMiddleware}, async (req, res) => {
  logActivity(req.user?.username, 'PUT /api/${routeName}/:id', 'Mengubah data');
  try {
    const [existing] = await db.query('SELECT * FROM ${entity.table} WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({error: 'Not found'});
    
    const data = { ...existing[0], ...req.body };
    ${entity.hasImage ? `if (req.file) data.${entity.imageField} = '/uploads/' + req.file.filename;` : ''}
    
    const query = 'UPDATE ${entity.table} SET ${entity.fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?';
    const values = [${entity.fields.map(f => `data.${f}`).join(', ')}, req.params.id];
    await db.query(query, values);
    res.json({ message: 'Berhasil diubah' });
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  // DELETE
  str += `app.delete('/api/${routeName}/:id', authMiddleware, async (req, res) => {
  logActivity(req.user?.username, 'DELETE /api/${routeName}/:id', 'Menghapus data');
  try {
    await db.query('DELETE FROM ${entity.table} WHERE id = ?', [req.params.id]);
    res.json({ message: 'Dihapus' });
  } catch (err) { res.status(500).json({error: err.message}); }
});\n`;

  return str;
}

// 1. Replace db import
if (!code.includes('const db = require(\'./db\');')) {
  code = code.replace(/const multer = require\('multer'\);/, "const multer = require('multer');\nconst db = require('./db');");
}

// 2. Replace the entities blocks
entities.forEach(ent => {
  // Find the block from // ====== ENTITY ====== up to the next // ======
  const regex = new RegExp(`// ====================== ${ent.name} ======================[\\s\\S]*?(?=\\n// ====================== |\\n// ===== )`);
  const newCode = generateCrud(ent);
  code = code.replace(regex, newCode.trim() + '\n\n');
});

fs.writeFileSync('server2.js', code);
console.log('Drafted server2.js');
