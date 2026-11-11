import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const baseUrl=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const [width,height] of [[320,568],[375,667],[393,852],[393,462],[700,900],[768,900],[1440,900]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(baseUrl,{waitUntil:'networkidle'});
    for (const type of ['letter','quiz']) {
      const open=type==='letter'?page.getByLabel('Ещё истории').getByRole('button',{name:'Отправить в будущее'}):page.getByRole('button',{name:'Пройти квиз'});
      await open.click();
      const dialog=page.getByRole('dialog');
      const geometry=await dialog.evaluate(el=>{const r=el.getBoundingClientRect(),frame=el.querySelector('.modal-garland'),f=frame.getBoundingClientRect(),overlay=document.querySelector('#overlay'),top=frame.querySelector('.modal-garland__top').getBoundingClientRect(),bottom=frame.querySelector('.modal-garland__bottom').getBoundingClientRect(),left=frame.querySelector('.modal-garland__left').getBoundingClientRect(),right=frame.querySelector('.modal-garland__right').getBoundingClientRect();return{w:r.width,h:r.height,top:r.top,frameVisible:getComputedStyle(frame).display!=='none',frameWidth:f.width,frameHeight:f.height,capRatio:top.height/top.width,joins:[left.top-top.bottom,left.bottom-bottom.top,right.top-top.bottom,right.bottom-bottom.top],scrollHeight:overlay.scrollHeight,clientHeight:overlay.clientHeight,overflow:document.documentElement.scrollWidth-innerWidth,decorative:frame.getAttribute('aria-hidden')==='true'&&getComputedStyle(frame).pointerEvents==='none'};});
      assert.equal(geometry.overflow,0,`${width} ${type} horizontal overflow`);
      if(width<=700){
        assert.ok(Math.abs(geometry.h/geometry.w-1550/880)<.02,`${width} ${type} portrait aspect`);
        assert.equal(geometry.frameVisible,true,`${width} ${type} garland visible`);
        assert.equal(geometry.decorative,true,`${width} ${type} garland remains non-interactive`);
        assert.ok(Math.abs(geometry.frameWidth/geometry.w-1.1594)<.01);
        assert.ok(Math.abs((geometry.frameHeight-geometry.h)/geometry.w-.24)<.01);
        assert.ok(Math.abs(geometry.capRatio-320/1600)<.01,'top slice keeps its proportions');
        assert.ok(geometry.joins.every(distance=>Math.abs(distance)<1),'side slices meet the top and bottom slices');
        if(height===462){assert.ok(geometry.top>=19,`${type} starts inside short viewport`);assert.ok(geometry.scrollHeight>geometry.clientHeight,`${type} scrolls on short viewport`);}
      }else{assert.ok(Math.abs(geometry.w-geometry.h)<1,`${width} ${type} desktop remains square`);assert.equal(geometry.frameVisible,false);}
      if(type==='letter'){
        await page.getByLabel('Ваш email').fill('test@example.com');
        await page.getByLabel('Ваше письмо').fill('Тестовое письмо');
        await page.getByRole('checkbox',{name:'Выражаю согласие на обработку'}).check();
        await dialog.getByRole('button',{name:'Отправить',exact:true}).click();
        assert.match(await page.locator('#letter-status').textContent(),/недоступна/);
      }else{
        assert.equal(await page.locator('#quiz-form fieldset').count(),5);
        assert.equal(await page.locator('.quiz-heading').evaluate(el=>getComputedStyle(el).fontSize),'50px');
        await page.getByRole('button',{name:'Узнать результат'}).click();
        assert.equal(await page.locator('.quiz-question-error:visible').count(),5);
        for(let i=0;i<5;i++)await page.locator(`input[name="answer-${i}"]`).first().check();
        await page.getByRole('button',{name:'Узнать результат'}).click();
        assert.equal(await page.getByText('Новый год в пижаме').isVisible(),true);
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#overlay').isHidden(),true);
      assert.equal(await open.evaluate(el=>el===document.activeElement),true,`${type} restores focus`);
    }
    assert.deepEqual(errors,[]);
    console.log(width,height,'mobile dialog geometry, interactions and focus passed');
    await page.close();
  }
  const page=await browser.newPage();await page.goto(baseUrl);
  const alpha=await page.evaluate(async()=>{const result=[];for(const path of ['/src/assets/figma/raw/garland-top.606f0ab9668c.png','/src/assets/figma/raw/garland-side.37102a4ff72d.png']){const img=new Image();img.src=path;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);result.push([[0,0],[img.width-1,0],[0,img.height-1],[img.width-1,img.height-1]].map(([x,y])=>ctx.getImageData(x,y,1,1).data[3]));}return result;});
  assert.deepEqual(alpha,[[0,0,0,0],[0,0,0,0]],'slice corners remain transparent');
  await page.close();
  console.log('garland slice transparency passed');
} finally {await browser.close();}
