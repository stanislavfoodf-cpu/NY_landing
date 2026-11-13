import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4179';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for(const width of [320,375,393,700,701,768,1099,1100,1440,1920,1921,2560]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base,{waitUntil:'networkidle',timeout:60000});
    const geometry=await page.evaluate(()=>{
      const body=getComputedStyle(document.body),size=body.backgroundSize.split(',')[0].split(' ').map(parseFloat),position=body.backgroundPosition.split(',')[0].split(' '),goat=document.querySelector('.goat-character img'),roof=document.querySelector('.house-animation img'),box=goat.getBoundingClientRect();
      const arrow=document.querySelector('.house-arrow-goat'),arrowStyle=getComputedStyle(arrow),arrowWidth=parseFloat(arrowStyle.width),arrowHeight=parseFloat(arrowStyle.height),origin=arrowStyle.transformOrigin.split(' ').map(parseFloat),matrix=new DOMMatrix(arrowStyle.transform),tip=new DOMPoint(arrowWidth*59.15/70.8207-origin[0],arrowHeight*94.28/95.7832-origin[1]).matrixTransform(matrix),parent=arrow.offsetParent.getBoundingClientRect();
      return {seatX:box.left+scrollX+box.width*.327,seatY:box.top+scrollY+box.height*.652,giftX:(innerWidth-size[0])/2+size[0]*.439,giftY:parseFloat(position[1])+size[1]*.6873,headX:box.left+box.width*.35,headY:box.top+box.height*.22,tipX:parent.left+arrow.offsetLeft+origin[0]+tip.x,tipY:parent.top+arrow.offsetTop+origin[1]+tip.y,houseWidth:size[0],goat:goat.currentSrc,goatLoaded:goat.naturalWidth,roof:roof.currentSrc,roofLoaded:roof.naturalWidth,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    const tolerance=Math.max(2,geometry.houseWidth*.003);
    assert.ok(Math.abs(geometry.seatX-geometry.giftX)<tolerance,`${width}: goat horizontal seat ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(geometry.seatY-geometry.giftY)<tolerance,`${width}: goat vertical seat ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(geometry.tipX-geometry.headX+10)<2 && Math.abs(geometry.tipY-geometry.headY)<2,`${width}: arrow is 10px left of goat's head ${JSON.stringify(geometry)}`);
    assert.match(geometry.goat,/goat-animated\.7a949995fed6140b\.webp/);
    assert.match(geometry.roof,/roof-animated\.ad60364aecdceba0\.webp/);
    assert.equal(geometry.goatLoaded,306);assert.equal(geometry.roofLoaded,1112);
    assert.equal(geometry.overflow,0);assert.deepEqual(errors,[]);await page.close();console.log(width,'alignment and assets passed');
  }
  const moving=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await moving.goto(base,{waitUntil:'networkidle'});
  for(const selector of ['.goat-character','.house-animation']){
    const element=moving.locator(selector);await element.scrollIntoViewIfNeeded();
    const first=await element.screenshot();await moving.waitForTimeout(1100);const second=await element.screenshot();
    assert.equal(first.equals(second),false,`${selector} frames should change`);
  }
  await moving.close();
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
  await page.goto(base,{waitUntil:'networkidle'});
  assert.match(await page.locator('.goat-character img').evaluate(el=>el.currentSrc),/goat-static\.df4000bdf4831b26\.png/);
  assert.equal(await page.locator('.house-animation').evaluate(el=>getComputedStyle(el).display),'none');
  await page.close();console.log('reduced motion passed');
} finally {await browser.close()}
