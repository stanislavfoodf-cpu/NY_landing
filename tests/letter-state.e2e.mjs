import assert from 'node:assert/strict';
import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  for (const width of [375,768,1440,1920]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:60000});
    await page.locator('.cards .letter-open').click();
    await page.getByLabel('Ваш email').fill('test@example.com');
    await page.getByLabel('Ваше письмо').fill('Письмо в будущее');
    await page.locator('#letter-consent').check();
    await page.getByRole('dialog').getByRole('button',{name:'Отправить',exact:true}).click();
    assert.match(await page.locator('#letter-status').textContent(),/недоступна/);
    assert.equal(await page.locator('.letter-card--sent').count(),0);
    await page.keyboard.press('Escape');
    await page.evaluate(async()=>{const {renderLetterSentState}=await import('/src/app.js');renderLetterSentState(document.querySelector('.letter-card'),document.querySelector('#letter-sent-template'))});
    const card=page.locator('.letter-card--sent');
    assert.match(await card.textContent(),/Готово\.\s*Увидимся через год!/);
    assert.match(await card.textContent(),/декабре 2027/);
    assert.equal(await card.locator('button').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
    if(width===1440)await card.screenshot({path:'/tmp/letter-sent-preview.png'});
    await page.close();
  }
  console.log('Letter success preview and unavailable integration checks passed.');
} finally { await browser.close(); }
