const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const contentTypes = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };

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

async function cardOrder(page) {
  return page.locator('[data-page="today"] > [data-home-card-id]').evaluateAll(cards => cards.map(card => card.dataset.homeCardId));
}

async function move(page, id, direction) {
  const card = page.locator(`[data-home-card-id="${id}"]`);
  await card.locator('.home-card-menu-button').click();
  const item = card.locator(`[data-home-move="${direction}"]`);
  assert.equal(await item.isEnabled(), true, `${id} should be able to move ${direction}`);
  await item.click();
  await page.waitForTimeout(650);
}

async function reset(page) {
  const first = page.locator('[data-page="today"] > [data-home-card-id]').first();
  await first.locator('.home-card-menu-button').click();
  await first.locator('[data-home-move="reset"]').click();
  await page.waitForTimeout(50);
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
    await page.goto(`http://127.0.0.1:${server.address().port}/#today`);
    await page.evaluate(() => localStorage.removeItem('oneupHomeCardOrderV1'));
    await page.reload();
    await page.waitForSelector('[data-home-card-id="versus"] .home-card-menu-button');

    const defaults = ['status','versus','coop','trophy'];
    assert.deepEqual(await cardOrder(page), defaults);

    for (const id of defaults) {
      await reset(page);
      let order = [...defaults];
      while (order.indexOf(id) < order.length - 1) {
        const index = order.indexOf(id);
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        await move(page, id, 'down');
        assert.deepEqual(await cardOrder(page), order, `${id} failed while moving down`);
      }
      while (order.indexOf(id) > 0) {
        const index = order.indexOf(id);
        [order[index], order[index - 1]] = [order[index - 1], order[index]];
        await move(page, id, 'up');
        assert.deepEqual(await cardOrder(page), order, `${id} failed while moving up`);
      }
    }

    await reset(page);
    const top = page.locator('[data-home-card-id="status"]');
    await top.locator('.home-card-menu-button').click();
    assert.equal(await top.locator('[data-home-move="up"]').isDisabled(), true);
    await page.keyboard.press('Escape');
    const bottom = page.locator('[data-home-card-id="trophy"]');
    await bottom.locator('.home-card-menu-button').click();
    assert.equal(await bottom.locator('[data-home-move="down"]').isDisabled(), true);
    await page.keyboard.press('Escape');

    await move(page, 'versus', 'down');
    const persisted = await cardOrder(page);
    await page.reload();
    assert.deepEqual(await cardOrder(page), persisted, 'saved card order must survive reload');
    await reset(page);
    assert.deepEqual(await cardOrder(page), defaults);
    console.log('Home card reorder browser test passed');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
