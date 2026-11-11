import { chromium } from '/Users/stas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const issues = [];
const motionPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await motionPage.goto(baseUrl, { waitUntil: 'networkidle' });
const animatedHouse = motionPage.locator('.house-animation');
if (!(await animatedHouse.isVisible())) issues.push({ scenario: 'house animation', errors: ['animated layer is hidden'] });
const frame1 = await animatedHouse.screenshot();
await motionPage.waitForTimeout(800);
const frame2 = await animatedHouse.screenshot();
if (frame1.equals(frame2)) issues.push({ scenario: 'house animation', errors: ['frames did not change'] });
await motionPage.emulateMedia({ reducedMotion: 'reduce' });
if (await animatedHouse.isVisible()) issues.push({ scenario: 'reduced motion', errors: ['animated layer remains visible'] });
await motionPage.close();
for (const width of [375, 768, 1440, 1920, 2560]) {
  const page = await browser.newPage({ viewport: { width, height: width < 800 ? 812 : 1080 } });
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fontStatus = await page.evaluate(async () => {
    await Promise.all([document.fonts.load('700 24px FUD'), document.fonts.load('700 24px Source'), document.fonts.load('400 24px Source')]);
    return ['700 24px FUD', '700 24px Source', '400 24px Source'].every(font => document.fonts.check(font));
  });
  if (!fontStatus) errors.push('supplied fonts did not load');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) errors.push(`horizontal overflow: ${overflow}px`);
  const garlandLayout = await page.locator('.quiz-card').evaluate(el => {
    const rect=el.getBoundingClientRect(), frame=getComputedStyle(el,'::after');
    const button=el.querySelector('button').getBoundingClientRect();
    return {square:Math.abs(rect.width-rect.height), widthRatio:parseFloat(frame.width)/rect.width, leftRatio:parseFloat(frame.left)/rect.width, topRatio:parseFloat(frame.top)/rect.height, buttonContained:button.bottom<=rect.bottom-8};
  });
  if (garlandLayout.square>1 || !garlandLayout.buttonContained || Math.abs(garlandLayout.widthRatio-1.307)>.02 || Math.abs(garlandLayout.leftRatio+.098)>.02 || Math.abs(garlandLayout.topRatio+.135)>.02) errors.push(`garland alignment: ${JSON.stringify(garlandLayout)}`);
  if (await page.locator('.window').count() !== 14) errors.push('expected 14 window buttons');
  const windowAlignment = await page.locator('.house').evaluate(house => {
    const style=getComputedStyle(document.body);
    const [backgroundWidth,backgroundHeight]=style.backgroundSize.split(',').at(-1).trim().split(/\s+/).map(parseFloat);
    const backgroundLeft=(innerWidth-backgroundWidth)/2;
    const backgroundTop=parseFloat(style.backgroundPositionY.split(',').at(-1));
    const placements=[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[3,2],[2,2],[2,3],[3,3]];
    // Measured outer frame bounds in the 3072 × 3278 V6 house image.
    return [...house.querySelectorAll('.window')].every((el,i)=>{const r=el.getBoundingClientRect(), [col,row]=placements[i], x=backgroundLeft+backgroundWidth*(1194+190.6667*col)/3072, y=backgroundTop+backgroundHeight*(1190+200*row)/3278; return Math.abs(r.left-x)<3 && Math.abs(r.top-y)<3 && Math.abs(r.width-backgroundWidth*104/3072)<3 && Math.abs(r.height-backgroundHeight*165/3278)<3;});
  });
  if (!windowAlignment) errors.push('window hotspots are not aligned to facade coordinates');
  const goat = page.locator('#goat');
  if (await goat.evaluate(el => el.tagName !== 'DIV' || el.tabIndex >= 0 || /огонь/i.test(el.textContent))) errors.push('goat notice is interactive or exposes the promo code');
  for (const [label, url] of [['Secret Kitchen в Telegram', 'https://t.me/secretkitchen_ru'], ['Secret Kitchen ВКонтакте', 'https://vk.com/public206552267']]) {
    if (await page.getByRole('link', { name: label }).getAttribute('href') !== url) errors.push(`incorrect ${label} link`);
  }
  await mkdir('artifacts/screenshots', { recursive: true });
  await page.screenshot({ path: `artifacts/screenshots/landing-${width}.png`, fullPage: true });
  issues.push({ width, overflow, errors });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
const firstWindow = page.getByRole('button', { name: 'Окно 1: Свои' });
await firstWindow.click();
await page.getByRole('dialog').waitFor({state:'visible'});
if (!(await page.getByRole('dialog').isVisible())) issues.push({ scenario: 'story', errors: ['dialog did not open'] });
if (await firstWindow.evaluate(el=>el.classList.contains('viewed'))) issues.push({ scenario: 'story', errors: ['window changed before the story was closed'] });
await page.locator('.story-video-status').waitFor({state:'hidden',timeout:30000});
if (!(await page.locator('.story-video').getAttribute('src')).includes('.mp4')) issues.push({ scenario: 'first story', errors: ['video story is missing'] });
await page.screenshot({ path: 'artifacts/screenshots/story-375.png', fullPage: true });
await page.keyboard.press('Escape');
if (!(await firstWindow.evaluate(element => element === document.activeElement))) issues.push({ scenario: 'story', errors: ['focus was not returned'] });
const viewedAppearance = await firstWindow.evaluate(el=>({viewed:el.classList.contains('viewed'),image:getComputedStyle(el,'::after').backgroundImage}));
if (!viewedAppearance.viewed || !viewedAppearance.image.includes('open-window-v5-1000.da7c53b5f7b9.webp')) issues.push({ scenario: 'story', errors: ['viewed window image is missing'] });
await page.reload({ waitUntil: 'networkidle' });
if (!(await firstWindow.evaluate(el=>el.classList.contains('viewed')))) issues.push({ scenario: 'story', errors: ['viewed state was not restored after reload'] });
for (let i = 1; i < 4; i++) {
  const window = page.locator('.window').nth(i);
  await window.click();
  if (i === 1) {
    const storyLayers = await page.locator('.story-scene').evaluate(el => {
      const decoration=getComputedStyle(el,'::after'), text=getComputedStyle(el.querySelector('.ribbon'));
      const matrix=new DOMMatrix(decoration.transform);
      return {behind:Number(decoration.zIndex)<Number(text.zIndex),angle:Math.round(Math.atan2(matrix.b,matrix.a)*180/Math.PI),decorative:decoration.pointerEvents==='none'};
    });
    if (!storyLayers.behind || storyLayers.angle !== 45 || !storyLayers.decorative) issues.push({scenario:'story garland',errors:['garland layer or rotation is incorrect']});
  }
  await page.getByRole('button', { name: 'Закрыть' }).click();
  const image = await window.evaluate(el => getComputedStyle(el, '::after').backgroundImage);
  if (!image.includes('open-window-v5-1000.da7c53b5f7b9.webp')) issues.push({ scenario: 'window variants', errors: [`missing variant ${i + 1}`] });
}
await page.getByRole('button', { name: /Окно 6:.*20 декабря/ }).click();
await page.getByText('Здесь пока тихо.').waitFor({state:'visible'});
if (!(await page.getByText('Здесь пока тихо.').isVisible())) issues.push({ scenario: 'locked', errors: ['locked date message missing'] });
await page.keyboard.press('Escape');
if (await page.getByRole('button', { name: /Окно 6:.*20 декабря/ }).evaluate(el=>el.classList.contains('viewed'))) issues.push({ scenario: 'locked', errors: ['locked window was marked viewed'] });
await page.getByRole('button', { name: 'Пройти квиз' }).click();
await page.getByRole('button', { name: 'Закрыть' }).click();
if (await page.getByRole('dialog').isVisible()) issues.push({ scenario: 'quiz close', errors: ['close button did not close dialog'] });
await page.getByRole('button', { name: 'Пройти квиз' }).click();
await page.screenshot({ path: 'artifacts/screenshots/quiz-375.png', fullPage: true });
const portraitRatio = await page.getByRole('dialog').evaluate(el => { const r = el.getBoundingClientRect(); return r.height/r.width; });
if (Math.abs(portraitRatio - 1550/880) > .02) issues.push({ scenario: 'quiz portrait', errors: [`unexpected aspect ratio ${portraitRatio}`] });
for (let i = 0; i < 5; i++) await page.locator(`input[name="answer-${i}"]`).first().check();
await page.getByRole('button', { name: 'Узнать результат' }).click();
if (!(await page.getByText('Новый год в пижаме').isVisible())) issues.push({ scenario: 'quiz', errors: ['unexpected result'] });
await page.screenshot({ path: 'artifacts/screenshots/quiz-result-375.png', fullPage: true });
await page.keyboard.press('Escape');
await page.getByLabel('Ещё истории').getByRole('button', { name: 'Отправить в будущее' }).click();
await page.getByRole('button', { name: 'Закрыть' }).focus();
await page.keyboard.press('Enter');
if (await page.getByRole('dialog').isVisible()) issues.push({ scenario: 'letter close', errors: ['keyboard activation did not close dialog'] });
await page.getByLabel('Ещё истории').getByRole('button', { name: 'Отправить в будущее' }).click();
const emailAlignment = await page.locator('.email-field').evaluate(element => {
  const label = element.querySelector('span').getBoundingClientRect();
  const input = element.querySelector('input').getBoundingClientRect();
  return { labelRight: label.right, inputLeft: input.left, labelMid: (label.top + label.bottom) / 2, inputMid: (input.top + input.bottom) / 2, inputWidth: input.width };
});
if (emailAlignment.inputLeft < emailAlignment.labelRight || Math.abs(emailAlignment.labelMid - emailAlignment.inputMid) > 7 || emailAlignment.inputWidth < 80) issues.push({ scenario: 'letter email layout', errors: ['label and email input are not aligned on one row'] });
const letterGeometry = await page.getByRole('dialog').evaluate(el => { const dialog=el.getBoundingClientRect(), field=el.querySelector('textarea').getBoundingClientRect(), content=el.querySelector('#dialog-content'); return { ratio:dialog.height/dialog.width, contained:field.left>=dialog.left && field.right<=dialog.right, clipped:getComputedStyle(content).overflowY === 'auto' && content.getBoundingClientRect().bottom<=dialog.bottom }; });
if (Math.abs(letterGeometry.ratio - 1550/880) > .02 || !letterGeometry.contained || !letterGeometry.clipped) issues.push({ scenario: 'letter geometry', errors: ['letter field is outside the portrait dialog'] });
await page.getByRole('dialog').getByRole('button', { name: 'Отправить', exact: true }).click();
if ((await page.locator('#letter-error').textContent()) !== 'Напишите письмо.') issues.push({ scenario: 'letter', errors: ['letter validation missing'] });
const consent = page.getByRole('checkbox', { name: 'Выражаю согласие на обработку' });
if (await consent.getAttribute('aria-invalid') !== 'true') issues.push({ scenario: 'letter consent', errors: ['unchecked consent was not marked invalid'] });
if (await page.getByRole('link', { name: 'персональных данных' }).getAttribute('href') !== 'https://secret-kitchen.ru/privacy-policy') issues.push({ scenario: 'letter consent', errors: ['privacy policy link is incorrect'] });
await page.getByLabel('Ваше письмо').fill('Привет мне из будущего');
await page.getByLabel('Ваш email').fill('test@example.com');
await consent.check();
if (await consent.getAttribute('aria-invalid') !== 'false' || await page.locator('#consent-error').textContent()) issues.push({ scenario: 'letter consent', errors: ['consent error was not cleared'] });
await page.getByRole('dialog').getByRole('button', { name: 'Отправить', exact: true }).click();
if (!(await page.getByText(/Отправка пока недоступна/).isVisible())) issues.push({ scenario: 'letter', errors: ['unavailable integration state missing'] });
await page.screenshot({ path: 'artifacts/screenshots/letter-375.png', fullPage: true });

const designPage = await browser.newPage({ viewport: { width: 802, height: 1426 } });
await designPage.goto(baseUrl, { waitUntil: 'networkidle' });
await designPage.getByRole('button', { name: 'Пройти квиз' }).click();
const quizRect = await designPage.getByRole('dialog').evaluate(element => {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, bottom: rect.bottom, height: rect.height, innerHeight: window.innerHeight };
});
if (quizRect.top < 0 || quizRect.bottom > quizRect.innerHeight + 1) issues.push({ scenario: 'quiz-802', errors: ['dialog is not centered inside viewport'] });
await designPage.screenshot({ path: 'artifacts/screenshots/quiz-802.png' });
await designPage.keyboard.press('Escape');
await designPage.getByLabel('Ещё истории').getByRole('button', { name: 'Отправить в будущее' }).click();
await designPage.screenshot({ path: 'artifacts/screenshots/letter-802.png' });
await designPage.close();
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
await desktop.getByLabel('Ещё истории').getByRole('button', { name: 'Отправить в будущее' }).click();
await desktop.getByRole('dialog').getByRole('button', { name: 'Отправить', exact: true }).click();
const buttonVisible = await desktop.getByRole('dialog').evaluate(el => {
  const container=el.querySelector('#dialog-content'), button=el.querySelector('button[type="submit"]');
  container.scrollTop=0;
  const b=button.getBoundingClientRect(), c=container.getBoundingClientRect();
  return b.top>=c.top && b.bottom<=c.bottom && b.bottom<=innerHeight;
});
if (!buttonVisible) issues.push({ scenario: 'letter 1440x900', errors: ['submit button requires scrolling'] });
await desktop.close();
await browser.close();

console.log(JSON.stringify(issues, null, 2));
if (issues.some(item => item.errors?.length)) process.exitCode = 1;
