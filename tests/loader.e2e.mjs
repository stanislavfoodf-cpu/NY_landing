import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    let release;
    const waitForRelease = new Promise(resolve => { release = resolve; });
    await page.route('**/house-animation.gif', async route => { await waitForRelease; await route.continue(); });
    const navigation = page.goto(baseUrl, {waitUntil:'commit'});
    await page.locator('.page-loader').waitFor({state:'visible'});
    assert.equal(await page.locator('main').isHidden(), true);
    release();
    await navigation;
    await page.locator('.page-loader').waitFor({state:'hidden'});
    assert.equal(await page.locator('main').isVisible(), true);
    await page.close();
  }
  for (const failedAsset of ['lock.png', 'loader.js', 'styles.css']) {
    const page = await browser.newPage();
    await page.route(`**/${failedAsset}`, route => route.abort());
    await page.goto(baseUrl, {waitUntil:'load'});
    await page.locator('#page-loader-retry').waitFor({state:'visible'});
    assert.match(await page.locator('#page-loader-message').textContent(), /Не удалось загрузить/);
    await page.close();
  }
  const reduced = await browser.newPage({reducedMotion:'reduce'});
  await reduced.goto(baseUrl, {waitUntil:'load'});
  await reduced.locator('.page-loader').waitFor({state:'hidden'});
  assert.match(await reduced.locator('.goat-character img').evaluate(img => img.currentSrc), /goat-still\.png$/);
  assert.equal(await reduced.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('main-07.png'))), false);
  await reduced.close();
  const noScript = await browser.newPage({javaScriptEnabled:false});
  await noScript.goto(baseUrl, {waitUntil:'load'});
  assert.equal(await noScript.locator('main').isVisible(), true);
  assert.equal(await noScript.locator('.page-loader').isHidden(), true);
  await noScript.close();
  console.log('Loader checks passed.');
} finally {
  await browser.close();
}
