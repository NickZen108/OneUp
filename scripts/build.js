const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const staticExtensions = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.webmanifest',
  '.txt',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf'
]);
const excludedDirs = new Set([
  '.git',
  'android',
  'dist',
  'node_modules',
  'scripts',
  'tests'
]);
const requiredFiles = ['index.html', 'script.js', 'styles.css'];

function copyFile(sourcePath, relativePath) {
  const targetPath = path.join(distDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function copyStaticFiles(currentDir, relativeDir = '') {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || excludedDirs.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(currentDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      copyStaticFiles(sourcePath, relativePath);
      continue;
    }

    if (entry.isFile() && staticExtensions.has(path.extname(entry.name).toLowerCase())) {
      copyFile(sourcePath, relativePath);
    }
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
copyStaticFiles(rootDir);

for (const requiredFile of requiredFiles) {
  const targetPath = path.join(distDir, requiredFile);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Build output is missing ${requiredFile}`);
  }
}

console.log(`Built OneUp static app in ${path.relative(rootDir, distDir)}`);
