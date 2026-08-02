const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf-8');

// Replace GET arrays
code = code.replace(/res\.json\(rows\.map\(r => r\.data\)\);/g, "res.json(rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data));");

// Replace GET objects
code = code.replace(/res\.json\(rows\.length \? rows\[0\]\.data : \{\}\);/g, "res.json(rows.length ? (typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data) : {});");

fs.writeFileSync('server.js', code);
console.log('Fixed JSON parsing in server.js');
