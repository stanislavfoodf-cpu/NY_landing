import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { createLandingServer } from '../server.mjs';

const clock={current:'2026-12-19T20:59:59Z'};
const server=createLandingServer({now:()=>new Date(clock.current)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2030-01-01T00:00:00Z']))}static now(){return new OriginalDate('2030-01-01T00:00:00Z').getTime()}}});
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base,{waitUntil:'networkidle'});
  const window=page.locator('.window').nth(5);
  assert.equal(await window.evaluate(el=>el.classList.contains('locked')),true);
  await window.click();
  await page.getByText('Здесь пока тихо.').waitFor({state:'visible'});
  assert.match(await page.getByRole('dialog').textContent(),/20 декабря/);
  await page.keyboard.press('Escape');
  assert.equal(await window.evaluate(el=>el===document.activeElement),true);
  clock.current='2026-12-19T21:00:00Z';
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForFunction(()=>!document.querySelectorAll('.window')[5].classList.contains('locked'));
  await window.click();
  await page.getByText('С друзьями любое число может быть 31 декабря.').waitFor({state:'visible'});
  await page.keyboard.press('Escape');
  assert.equal(await window.evaluate(el=>el.classList.contains('viewed')),true);
  await page.close();
  const offline=await browser.newPage();
  await offline.route('**/api/windows',route=>route.abort());
  await offline.goto(base,{waitUntil:'load'});
  await offline.locator('#page-loader-retry').waitFor({state:'visible'});
  assert.match(await offline.locator('#page-loader-message').textContent(),/Не удалось загрузить/);
  await offline.close();
  console.log('Server-controlled window browser checks passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
