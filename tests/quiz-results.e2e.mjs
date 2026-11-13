import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { scoreAnswers, chooseResult } from '../src/app.js';

const expected=['Тихий Новый год','Только свои','Я только на час','Праздник где угодно','Каждый найдёт своё','Новый год в пижаме','На расстоянии, но вместе','31 декабря — понятие относительное'];
const examples=new Map();
for(let n=0;n<4**5;n++){
  let value=n;const answers=Array.from({length:5},()=>{const a=value%4;value=Math.floor(value/4);return a});
  const result=chooseResult(scoreAnswers(answers),answers);
  if(!examples.has(result))examples.set(result,answers);
}
assert.equal(examples.size,8,'all eight results must be reachable');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  for(const width of [375,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:4179',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Пройти квиз'}).click();
    for(const [id,answers] of examples){
      for(let q=0;q<5;q++)await page.locator(`input[name="answer-${q}"]`).nth(answers[q]).check();
      await page.getByRole('button',{name:'Узнать результат'}).click();
      assert.equal(await page.locator('.result-title').textContent(),expected[id-1]);
      const image=page.locator('.result-art img');
      await image.evaluate(async el=>{if(!el.complete)await new Promise((resolve,reject)=>{el.onload=resolve;el.onerror=reject})});
      assert.ok(await image.evaluate(el=>el.naturalWidth>0),'result image loads');
      assert.ok((await image.getAttribute('src')).endsWith(`/quiz-results/${id}.webp`));
      await page.getByRole('button',{name:'Повторить'}).click();
      assert.equal(await page.locator('#quiz-form fieldset').count(),5);
      assert.equal(await page.locator('#quiz-form input:checked').count(),0);
    }
    assert.deepEqual(errors,[]);await page.close();console.log(`${width}px: all eight results and restart passed`);
  }
}finally{await browser.close()}
