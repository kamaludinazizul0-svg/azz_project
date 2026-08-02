const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

const singularTables = ['apbdesa', 'idm', 'statistik-tambahan'];

singularTables.forEach(table => {
  const dbTable = table === 'statistik-tambahan' ? 'statistik_tambahan' : table;
  const regex = new RegExp(\`app\\.get\\('/api/\${table}', async \\(req, res\\) => \\{ try \\{ const \\[rows\\] = await db\\.query\\('SELECT data FROM \${dbTable}'\\); res\\.json\\(rows\\.map\\(r => typeof r\\.data === 'string' \\? JSON\\.parse\\(r\\.data\\) : r\\.data\\)\\); \\} catch \\(err\\) \\{ res\\.status\\(500\\)\\.json\\(\\{error: err\\.message\\}\\); \\} \\}\\);\`);
  
  const replacement = \`app.get('/api/\${table}', async (req, res) => { try { const [rows] = await db.query('SELECT data FROM \${dbTable} LIMIT 1'); res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {}); } catch (err) { res.status(500).json({error: err.message}); } });\`;
  
  code = code.replace(regex, replacement);
});

fs.writeFileSync('server.js', code);
console.log('Fixed singular GET endpoints');
