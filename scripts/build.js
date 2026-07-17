const fs = require('node:fs');
const path = require('node:path');

const outDir = path.join(process.cwd(), 'dist');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of ['index.html', 'script.js', 'styles.css']) {
  fs.copyFileSync(path.join(process.cwd(), file), path.join(outDir, file));
}

console.log('Built OneUp web assets in dist/.');
