const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add to nav-menu if missing
  if (!content.includes('layanan-surat.html') || (content.includes('nav-menu') && !content.substring(content.indexOf('nav-menu'), content.indexOf('nav-burger')).includes('layanan-surat.html'))) {
    // Find the end of nav-menu
    // Usually it looks like <a href="/ppid.html" class="nav-link">📂 PPID</a>\n  </div>
    // or similar. Let's just find the closing tag of nav-menu by looking for the nav-burger.
    
    // Safer way: replace 📂 PPID</a> with 📂 PPID</a><a href="/layanan-surat.html" class="btn btn-outline" style="padding:6px 14px;margin-left:8px;border-color:var(--primary);color:var(--primary);font-size:0.85rem;border-radius:100px">✉️ Layanan Surat</a> inside nav-menu.
    // However, in ppid.html, it is `<a href="/ppid.html" class="nav-link active">📂 PPID</a>`
    
    // Let's use regex to find `<a href="/ppid.html" ...>📂 PPID</a>` and append the Layanan Surat link.
    // There are two occurrences: one in nav-menu, one in nav-mobile.
    
    content = content.replace(/(<a href="\/ppid\.html"[^>]*>📂 PPID<\/a>)/g, (match, p1, offset, string) => {
      // Check if this is the nav-mobile one
      // The nav-mobile one doesn't need the btn-outline class.
      // We can distinguish them based on whether they are inside <div class="nav-mobile"> or <div class="nav-menu">.
      // A simpler heuristic: if the matched string is in nav-menu (offset < string.indexOf('nav-mobile'))
      if (offset < string.indexOf('nav-mobile')) {
         return match + '<a href="/layanan-surat.html" class="btn btn-outline" style="padding:6px 14px;margin-left:8px;border-color:var(--primary);color:var(--primary);font-size:0.85rem;border-radius:100px">✉️ Layanan Surat</a>';
      } else {
         return match + '<a href="/layanan-surat.html" class="nav-link">✉️ Layanan Surat</a>';
      }
    });
    changed = true;
  }

  // Double check if there are duplicates
  if (content.split('Layanan Surat').length > 5) {
     // Revert if messed up, but it shouldn't.
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated navbar in ${file}`);
  }
});
console.log('Done');
