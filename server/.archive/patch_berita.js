const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

const regex = /app\.get\('\/api\/berita', async \(req, res\) => \{[\s\S]*?res\.json\(rows\);\s*\} catch \(err\) \{ res\.status\(500\)\.json\(\{error: err\.message\}\); \}\s*\}\);/;

const replacement = \`app.get('/api/berita', async (req, res) => {
  try {
    const { limit, page, search } = req.query;
    let query = "SELECT * FROM berita WHERE aktif = 1";
    let countQuery = "SELECT COUNT(*) as total FROM berita WHERE aktif = 1";
    let params = [];

    if (search) {
      query += " AND (judul LIKE ? OR ringkasan LIKE ?)";
      countQuery += " AND (judul LIKE ? OR ringkasan LIKE ?)";
      params.push('%' + search + '%', '%' + search + '%');
    }

    const [totalRows] = await db.query(countQuery, params);
    const total = totalRows[0].total;

    let p = 1;
    let l = 100;
    
    if (page) p = parseInt(page);
    if (limit) l = parseInt(limit);
    
    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(l, (p - 1) * l);

    const [rows] = await db.query(query, params);
    res.json({ data: rows, total, page: p, limit: l });
  } catch (err) { res.status(500).json({error: err.message}); }
});\`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.js', code);
console.log('Fixed berita pagination');
