import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const baseUrl=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  for(const width of [375,768,1440,1920]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const requests=[];const errors=[];
    page.on('request',r=>{if(/story-first-(2026\.png|video.*\.mp4)/.test(r.url()))requests.push(r.url())});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(baseUrl,{waitUntil:'networkidle'});
    assert.equal(requests.length,0,'story media is deferred');
    const window=page.locator('.window').first();await window.focus();await page.keyboard.press('Enter');
    const dialog=page.locator('.first-story-static');await dialog.waitFor({state:'visible'});
    const image=dialog.locator('img');await image.evaluate(el=>el.decode());
    assert.equal(await image.evaluate(el=>el.naturalWidth),1180);
    assert.equal(await dialog.locator('video').count(),0);
    assert.ok(requests.some(url=>url.includes('story-first-2026.png')));
    assert.ok(!requests.some(url=>url.includes('.mp4')));
    assert.equal(await window.evaluate(el=>el.classList.contains('viewed')),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
    assert.equal(await dialog.getByRole('button',{name:'Закрыть'}).isVisible(),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overlay').isHidden(),true);
    assert.equal(await window.evaluate(el=>el===document.activeElement),true);
    assert.equal(await window.evaluate(el=>el.classList.contains('viewed')),true);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await window.evaluate(el=>el.classList.contains('viewed')),true);
    assert.deepEqual(errors,[]);await page.close();console.log(width,'image story and focus passed');
  }
}finally{await browser.close()}
