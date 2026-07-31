const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Get all HTML files in the public directory (not layanan-masyarakat itself)
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html') && f !== 'layanan-masyarakat.html' && f !== 'layanan-surat.html');

// Old navbar button text+href patterns to replace
const oldPatterns = [
  // Old: "✉️ Layanan Surat" link style
  { find: `href="/layanan-surat.html" style="background:var(--bg-white);color:var(--primary-dark);padding:8px 18px;margin-left:12px;border-radius:100px;font-size:0.85rem;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" >✉️ Layanan Surat</a>`,
    replace: `href="/layanan-masyarakat.html" style="background:var(--primary,#2e7d32);color:#fff;padding:8px 18px;margin-left:12px;border-radius:100px;font-size:0.85rem;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 4px 12px rgba(46,125,50,0.4);display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s,box-shadow 0.2s" onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 20px rgba(46,125,50,0.5)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(46,125,50,0.4)'">🏛️ Layanan Masyarakat</a>` },
  
  // Escaped version with \\' 
  { find: `href="/layanan-surat.html" style="background:var(--bg-white);color:var(--primary-dark);padding:8px 18px;margin-left:12px;border-radius:100px;font-size:0.85rem;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s" onmouseover="this.style.transform=\\'scale(1.05)\\'\" onmouseout="this.style.transform=\\'scale(1)\\'\" >✉️ Layanan Surat</a>`,
    replace: `href="/layanan-masyarakat.html" style="background:var(--primary,#2e7d32);color:#fff;padding:8px 18px;margin-left:12px;border-radius:100px;font-size:0.85rem;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 4px 12px rgba(46,125,50,0.4);display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s,box-shadow 0.2s" onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 20px rgba(46,125,50,0.5)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(46,125,50,0.4)'">🏛️ Layanan Masyarakat</a>` },

  // Mobile nav simple link
  { find: `href="/layanan-surat.html" class="nav-link">✉️ Layanan Surat</a>`,
    replace: `href="/layanan-masyarakat.html" class="nav-link">🏛️ Layanan Masyarakat</a>` },
];

let totalUpdated = 0;

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Simple string replacements
  oldPatterns.forEach(p => {
    if (content.includes(p.find)) {
      content = content.split(p.find).join(p.replace);
      changed = true;
    }
  });

  // Also update title in layanan-surat related pages
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ Updated navbar:', file);
    totalUpdated++;
  } else {
    // Check if still has old link
    if (content.includes('/layanan-surat.html')) {
      console.log('⚠️  Still has layanan-surat:', file);
    } else {
      console.log('➖ No change needed:', file);
    }
  }
});

console.log(`\n📊 Total updated: ${totalUpdated} / ${files.length} files`);
