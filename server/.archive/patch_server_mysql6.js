const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf-8');

// 1. Remove function readData and writeData entirely
code = code.replace(/function readData\(file\) {[\s\S]*?return false;\n  }\n}/, '');
code = code.replace(/function writeData\(file, data\) {[\s\S]*?return false;\n  }\n}/, '');

// 2. Patch AUTH (login)
code = code.replace(
  /app\.post\('\/api\/auth\/login', loginRateLimit, async \(req, res\) => {[\s\S]*?res\.json\(\{ token, user: \{ id: user\.id, username: user\.username, nama: user\.nama, role: user\.role \} \}\);\s*}\);/,
  `app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Username atau password salah' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Username atau password salah' });
    loginAttempts.delete(req.ip || req.connection.remoteAddress);
    const token = jwt.sign({ id: user.id, username: user.username, nama: user.nama, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, nama: user.nama, role: user.role } });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 3. Patch AUTH (change password)
code = code.replace(
  /app\.put\('\/api\/auth\/change-password', authMiddleware, async \(req, res\) => {[\s\S]*?res\.json\(\{ message: 'Password berhasil diubah' \}\);\s*}\);/,
  `app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { password_lama, password_baru } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    const valid = await bcrypt.compare(password_lama, rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Password lama salah' });
    const hashed = await bcrypt.hash(password_baru, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password berhasil diubah' });
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 4. Patch DESA GET
code = code.replace(
  /const desa = readData\('desa\.json'\) \|\| \{\};/,
  `let desa = {};
  try {
    const [dRows] = await db.query('SELECT * FROM desa_profil LIMIT 1');
    if (dRows.length > 0) desa = dRows[0];
  } catch(e) {}`
);

// 5. Patch DESA PUT
code = code.replace(
  /app\.put\('\/api\/desa', authMiddleware, \(req, res\) => {[\s\S]*?res\.json\(updated\);\s*}\);/,
  `app.put('/api/desa', authMiddleware, async (req, res) => {
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
    res.json(data);
  } catch(e) { res.status(500).json({error: e.message}); }
});`
);

// 6. Patch PENDUDUK fallback
code = code.replace(
  /const fallback = readData\('penduduk\.json'\) \|\| \{\};\s*res\.json\(\{\s*data: fallback\.penduduk \|\| \[\],\s*total: fallback\.total \|\| 0\s*\}\);/,
  `res.json({ data: [], total: 0 });`
);

fs.writeFileSync('server.js', code);
console.log('Final patch complete');
