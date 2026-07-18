const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const generatedDir = path.join(rootDir, 'android/app/src/main/assets/public');
const trackedCopies = ['index.html', 'script.js', 'styles.css', 'package.json', 'package-lock.json', 'capacitor.config.js'];

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const mismatches = [];
for (const relative of trackedCopies) {
  const source = path.join(rootDir, relative);
  const generated = path.join(generatedDir, relative);
  if (!fs.existsSync(source) || !fs.existsSync(generated)) {
    mismatches.push(`${relative}: missing source or generated copy`);
    continue;
  }
  if (hash(source) !== hash(generated)) mismatches.push(relative);
}

if (mismatches.length) {
  console.error('Generated Android web assets are out of sync:');
  for (const mismatch of mismatches) console.error(`- ${mismatch}`);
  console.error('Run: npm run build && npx cap sync android');
  process.exit(1);
}

console.log('Generated Android web assets match source files.');
