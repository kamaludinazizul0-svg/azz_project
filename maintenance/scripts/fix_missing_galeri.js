const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Check if galeri is missing from nav-menu
  // We look for listing link but make the emoji optional / wildcard
  if (!content.includes('href="/galeri.html" class="nav-link"')) {
    // Replace <a href="/listing.html" class="nav-link">... Listing</a>
    content = content.replace(/(<a href="\/listing\.html"[^>]*>.*?Listing<\/a>)/g, '<a href="/galeri.html" class="nav-link">📷 Galeri</a>\n      $1');
    
    // In case the file uses HTML entities for Galeri, we don't care, just inserting the emoji is fine because it will render the same.
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added Galeri navbar link in ${file}`);
  }
});
