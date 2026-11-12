import assert from 'node:assert/strict';
import { createLandingServer } from '../server.mjs';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const server = createLandingServer({now: () => new Date('2026-11-12T00:00:00Z')});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const base = `http://127.0.0.1:${server.address().port}`;
try {
  for (const width of [375, 393, 768, 1440, 1920]) {
    const page = await browser.newPage({viewport:{width, height:900}, reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/windows/1/image', route => route.abort());
    await page.goto(base, {waitUntil:'networkidle'});
    const arrow = page.getByRole('button', {name:'Перейти к квизу и письму'});
    assert.equal(await arrow.isHidden(), true);
    await page.locator('.window').first().click({force:true});
    const image = page.locator('.first-story-static img');
    await image.waitFor();
    await image.evaluate(el => el.decode());
    assert.match(await image.getAttribute('src'), /\/stories\/window-1\.webp$/);
    assert.equal(await arrow.isVisible(), false);
    await page.keyboard.press('Escape');
    assert.equal(await arrow.isVisible(), true);
    const pos = await arrow.boundingBox();
    assert.ok(pos.x >= 0 && pos.x + pos.width <= width && pos.y >= 0 && pos.y + pos.height <= 900);
    if (width <= 700) assert.ok(Math.abs(pos.x + pos.width / 2 - width / 2) < 1);
    await arrow.click();
    await page.waitForTimeout(400);
    assert.equal(await arrow.locator('img').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('scroll-to-cards-clicked')), '1');
    assert.ok(await page.locator('.cards').evaluate(el => {const r=el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0;}));
    const link = page.locator('.footer-menu');
    const [buttonBox, logoBox] = await Promise.all([link.boundingBox(), page.locator('.footer-logo').boundingBox()]);
    assert.ok(buttonBox.x >= 0 && buttonBox.x + buttonBox.width <= width);
    if (width > 850) assert.ok(buttonBox.x - logoBox.x - logoBox.width < 65);
    assert.equal(await link.evaluate(el => getComputedStyle(el, '::before').backgroundImage.includes('figma-arrow-goat.svg')), true);
    assert.deepEqual(errors, []);
    console.log(width, 'story fallback, scroll arrow and footer passed');
    await page.close();
  }
  const page = await browser.newPage({viewport:{width:1440, height:900}, reducedMotion:'no-preference'});
  await page.goto(base, {waitUntil:'networkidle'});
  const arrow = page.getByRole('button', {name:'Перейти к квизу и письму'});
  await page.locator('.window').first().click({force:true});
  await page.locator('.first-story-static img').evaluate(el => el.decode());
  await page.keyboard.press('Escape');
  assert.equal(await arrow.locator('img').evaluate(el => getComputedStyle(el).animationName), 'scroll-arrow-bounce');
  await arrow.click();
  assert.equal(await arrow.locator('img').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await arrow.locator('img').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
