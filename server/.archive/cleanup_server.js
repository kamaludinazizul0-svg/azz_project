const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf-8');

// Find the line where the duplicate "PROGRAM PRIORITAS" starts
const garbageIndex = code.indexOf('// ====================== PROGRAM PRIORITAS ======================');

if (garbageIndex !== -1) {
  let goodCode = code.substring(0, garbageIndex);
  
  // Append the server listen block properly
  goodCode += `
// ====================== INIT SERVER ======================
async function initServer() {
  app.listen(PORT, () => {
    console.log('\\n🏡 Website Desa Kauman berjalan di http://localhost:' + PORT);
    console.log('📊 Admin Panel: http://localhost:' + PORT + '/admin');
    console.log('🔑 Login: admin / kauman2024\\n');
  });
}
initServer();
`;
  fs.writeFileSync('server.js', goodCode);
  console.log('Cleaned up server.js');
} else {
  console.log('Garbage not found');
}
