const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const contentTypes = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}

function luminance(rgb) {
  const values = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, colorScheme:'light' });
    await page.addInitScript(() => localStorage.setItem('oneupSettings', JSON.stringify({theme:'dark'})));
    await page.goto(`http://127.0.0.1:${server.address().port}/#today`);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    const darkBody = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    const darkCard = await page.locator('[data-home-card-id="status"]').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.ok(luminance(darkBody) < 0.08, `dark body is too bright: ${darkBody}`);
    assert.ok(luminance(darkCard) < 0.18, `dark card is too bright: ${darkCard}`);

    await page.locator('[data-main-nav="profile"]').click();
    const selector = page.locator('[data-theme-setting]');
    assert.equal(await selector.inputValue(), 'dark');
    await selector.selectOption('light');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    const lightBody = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    assert.ok(luminance(lightBody) > luminance(darkBody), 'light mode must be visibly brighter than dark mode');

    await selector.selectOption('dark');
    await page.locator('#profile-name').fill('Testbruger');
    await page.locator('#profile-save-button').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('oneupSettings')).theme), 'dark');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'saved dark mode must survive reload');

    await page.emulateMedia({ colorScheme:'dark' });
    await page.locator('[data-main-nav="profile"]').click();
    await page.locator('[data-theme-setting]').selectOption('system');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'system mode must follow a dark device');
    console.log('Dark mode browser test passed');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
