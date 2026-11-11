import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const mediaPattern = '**/story-first-video*.mp4*';

try {
  for (const width of [375, 768, 1440, 1920]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    const requests=[];
    page.on('request', request => { if (/story-first-video.*\.mp4/.test(request.url())) requests.push(request.url()); });
    await page.goto(baseUrl, {waitUntil:'networkidle',timeout:60000});
    assert.equal(requests.length,0,'video should not load before the story is opened');
    const window = page.locator('.window').first();
    await window.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('.first-story-dialog');
    await dialog.waitFor({state:'visible'});
    const video = dialog.locator('.story-video');
    await dialog.locator('.story-video-status').waitFor({state:'hidden',timeout:30000});
    assert.ok(requests.length > 0,'video request starts when its story opens');
    assert.equal(await video.evaluate(el=>el.paused),false);
    assert.equal(await video.evaluate(el=>el.loop),true);
    const box=await video.boundingBox(), close=await dialog.locator('.close').boundingBox();
    assert.ok(box.x+box.width*.81<close.x+close.width/2 && close.x+close.width/2<box.x+box.width*.91);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
    if (width===1440) {
      const initial=await video.evaluate(el=>el.currentTime);
      await page.waitForFunction(time=>document.querySelector('.story-video')?.currentTime>time,initial,{timeout:5000});
      const sound=dialog.locator('.story-video-sound');
      await sound.waitFor({state:'visible'});
      const muted=await video.evaluate(el=>el.muted);
      await sound.click();
      assert.notEqual(await video.evaluate(el=>el.muted),muted,'sound button toggles mute');
      await sound.focus();
      await page.keyboard.press('Tab');
      assert.equal(await dialog.locator('.close').evaluate(el=>el===document.activeElement),true,'Tab wraps to the close button');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await sound.evaluate(el=>el===document.activeElement),true,'Shift+Tab wraps to the visible sound button');
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overlay').isHidden(),true);
    assert.equal(await video.evaluate(el=>el.paused && !el.hasAttribute('src')),true,'closed video stops and releases its source');
    assert.equal(await window.evaluate(el=>el===document.activeElement),true,'focus returns to the window');
    assert.equal(await window.evaluate(el=>el.classList.contains('viewed')),true,'played story is marked viewed when closed');
    await page.reload({waitUntil:'networkidle',timeout:60000});
    assert.equal(await window.evaluate(el=>el.classList.contains('viewed')),true);
    console.log(width,'video story and focus passed');
    await page.close();
  }

  {
    const page=await browser.newPage({viewport:{width:393,height:852}});
    let release, started;
    const held=new Promise(resolve=>{release=resolve});
    const requested=new Promise(resolve=>{started=resolve});
    await page.route(mediaPattern,async route=>{started();await held;await route.continue().catch(()=>{});});
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:60000});
    await page.locator('.window').first().click();
    await requested;
    await page.locator('.story-video-status').waitFor({state:'visible'});
    assert.match(await page.locator('.story-video-message').textContent(),/Загружаем/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.window').first().evaluate(el=>el.classList.contains('viewed')),false,'closing while loading must not mark viewed');
    assert.equal(await page.locator('.story-video').evaluate(el=>el.paused && !el.hasAttribute('src')),true);
    release();
    await page.close();
    console.log('delayed video and close while loading passed');
  }

  {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    let attempts=0;
    await page.route(mediaPattern,route=>++attempts===1?route.abort():route.continue());
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:60000});
    await page.locator('.window').first().click();
    const retry=page.locator('.story-video-retry');
    await retry.waitFor({state:'visible',timeout:30000});
    assert.match(await page.locator('.story-video-message').textContent(),/Не удалось загрузить/);
    await retry.click();
    await page.locator('.story-video-status').waitFor({state:'hidden',timeout:30000});
    assert.ok(attempts>=2,'retry requests the video again');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.window').first().evaluate(el=>el.classList.contains('viewed')),true);
    await page.close();
    console.log('video error and retry passed');
  }

  {
    const page=await browser.newPage({viewport:{width:375,height:812},reducedMotion:'reduce'});
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:60000});
    await page.locator('.window').first().click();
    const play=page.locator('.story-video-play');
    await play.waitFor({state:'visible',timeout:30000});
    assert.equal(await page.locator('.story-video').evaluate(el=>el.paused),true,'reduced motion waits for user action');
    await play.click();
    await page.locator('.story-video-status').waitFor({state:'hidden',timeout:30000});
    assert.equal(await page.locator('.story-video').evaluate(el=>el.paused),false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overlay').isHidden(),true);
    await page.close();
    console.log('reduced motion manual playback passed');
  }
} finally {
  await browser.close();
}
