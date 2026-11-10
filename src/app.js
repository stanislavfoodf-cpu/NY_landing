export const pairs=[[[1,6],[2,7],[3,4],[4,8]],[[6,5],[2,5],[5,3],[1,6]],[[6,1],[2,7],[3,4],[8,4]],[[1,7],[7,2],[7,3],[8,4]],[[6,1],[2,5],[3,4],[5,8]]];
export const priority=[7,8,5,2,6,1,3,4];
export function scoreAnswers(answers){const scores=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,0])); answers.forEach((a,i)=>{if(pairs[i]?.[a]){const [x,y]=pairs[i][a]; scores[x]+=2;scores[y]++;}});return scores;}
export function chooseResult(scores,answers){const max=Math.max(...Object.values(scores));const tied=priority.filter(i=>scores[i]===max);for(const q of [3,0]){const primary=pairs[q]?.[answers[q]]?.[0];if(tied.includes(primary))return primary;}return tied[0];}
export function renderLetterSentState(card,template){card.replaceChildren(template.content.cloneNode(true));card.classList.add('letter-card--sent');card.setAttribute('aria-live','polite');}
export function validateLetter({letter,email,consent}){return {letter:letter.trim()?'':'Напишите письмо.',email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())?'':'Укажите корректный email.',consent:consent?'':'Необходимо согласие.'};}
const questions=[['Идеальный Новый год для вас — это…','Когда дома и спокойно','Когда все свои собрались','Когда людей много и громко','Когда вообще без обязательной программы'],['Что важнее всего на праздничном столе?','То, что люблю именно я','Чтобы хватило всем','Чтобы можно было попробовать всё','Чтобы я это не готовил'],['В 23:30 вы скорее…','Уже под пледом','Наливаете всем бокалы','Где-то между третьей компанией и четвёртым адресом','Ещё не решили, где будете встречать Новый год'],['Если часть близких встречает праздник далеко…','Спокойно поздравим и созвонимся позже','Видеозвонок обязателен — все должны быть вместе','Подключим их прямо к столу и празднику','Встретимся в другой день — праздник не обязан быть 31-го'],['1 января — это день для…','Пижамы и сериалов','Доедания всего вместе','Продолжения банкета','Новых гастрономических решений']];
const results=[['Тихий Новый год','Ваш главный новогодний план — чтобы планов было поменьше.'],['Только свои','Вам не нужна большая вечеринка. Вам нужны правильные люди.'],['Я только на час','Каждый ваш Новый год начинается со слов «ненадолго».'],['Праздник где угодно','Дата и место вторичны. Главное — чтобы праздник случился.'],['Каждый найдёт своё','Ваш идеальный праздник — когда никому не приходится выбирать одно на всех.'],['Новый год в пижаме','Красивый наряд — факультатив. Хорошая еда — обязательна.'],['На расстоянии, но вместе','Вы умеете оставаться рядом, даже когда между вами километры.'],['31 декабря — понятие относительное','Ваш Новый год начинается тогда, когда собрались все нужные люди.']];
if(typeof document!=='undefined'){
const $=s=>document.querySelector(s), overlay=$('#overlay'), dialog=$('.dialog'), content=$('#dialog-content');let previous,answers=[],step=0,pendingStory=null;
const analytics=(type,detail={})=>document.dispatchEvent(new CustomEvent('sk-ny:analytics',{detail:{type,...detail}}));
function markStoryViewed(){if(!pendingStory)return;const {button,index}=pendingStory;button.classList.add('viewed');if(!button.getAttribute('aria-label').includes('просмотрено'))button.setAttribute('aria-label',button.getAttribute('aria-label')+', просмотрено');try{sessionStorage.setItem('window-v5-'+index,'1')}catch{}pendingStory=null;}
function open(html,kind=''){if(!overlay.hidden&&dialog.classList.contains('story-dialog')&&kind!=='story-dialog')markStoryViewed();if(overlay.hidden)previous=document.activeElement;content.innerHTML=html;content.scrollTop=0;dialog.className='dialog '+kind;overlay.hidden=false;dialog.scrollTop=0;document.body.classList.add('modal-open');dialog.focus();}
function close(){if(dialog.classList.contains('story-dialog'))markStoryViewed();overlay.hidden=true;document.body.classList.remove('modal-open');previous?.focus();}
$('.close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape')close();if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not([disabled]),input,textarea,[href]')];if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
const grid=$('#windows'), windowButtons=[];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
function updateWindow(button,state){
  const locked=!state.available;
  button.classList.toggle('locked',locked);
  if(locked)button.classList.remove('viewed');
  button.setAttribute('aria-label',`Окно ${state.id}: ${state.title||'История'}${locked?', откроется '+state.unlockLabel:''}`);
  button.innerHTML=locked?`<span>♙<small>открывается<br><b>${escapeHtml(state.unlockLabel)}</b></small></span>`:'';
  if(!locked){try{if(sessionStorage.getItem('window-v5-'+(state.id-1))){button.classList.add('viewed');button.setAttribute('aria-label',button.getAttribute('aria-label')+', просмотрено')}}catch{}}
}
async function fetchWindowStates(){
  const response=await fetch('/api/windows',{cache:'no-store'});
  if(!response.ok)throw new Error('Не удалось загрузить состояния окон');
  const data=await response.json();
  if(!Array.isArray(data.windows)||data.windows.length!==14)throw new Error('Некорректный ответ сервера');
  data.windows.forEach(state=>{
    let button=windowButtons[state.id-1];
    if(!button){
      button=document.createElement('button');button.type='button';button.className='window';windowButtons[state.id-1]=button;grid.append(button);
      button.onclick=async()=>{
        if(button.getAttribute('aria-busy')==='true')return;
        button.setAttribute('aria-busy','true');
        try{
          const result=await fetch(`/api/windows/${state.id}/story`,{cache:'no-store'});
          const story=await result.json();
          if(result.status===423){analytics('window',{number:state.id,locked:true});updateWindow(button,{id:state.id,title:null,available:false,unlockLabel:story.unlockLabel});button.removeAttribute('aria-busy');open(`<h2 id="dialog-title" class="locked-title">Здесь пока тихо.</h2><p>Загляните ${escapeHtml(story.unlockLabel)}.</p>`,'locked-dialog');return}
          if(!result.ok)throw new Error('История недоступна');
          analytics('window',{number:state.id,locked:false});
          updateWindow(button,{id:state.id,title:story.title,available:true});
          button.removeAttribute('aria-busy');
          if(story.id===1){
            open(`<h2 id="dialog-title" class="sr-only">${escapeHtml(story.title)}</h2><picture class="first-story-image"><source media="(prefers-reduced-motion: reduce)" srcset="src/assets/figma/raw/story-first-still.png"><img src="src/assets/figma/raw/story-first.gif" alt="Новогодняя встреча друзей. ${escapeHtml(story.line1)} ${escapeHtml(story.line2)}"></picture>`,'story-dialog first-story-dialog');
          }else{
            open(`<div class="story-scene"><h2 id="dialog-title" class="sr-only">${escapeHtml(story.title)}</h2><div class="story-art"></div><p class="ribbon">${escapeHtml(story.line1)}</p>${story.line2?`<p class="ribbon second">${escapeHtml(story.line2)}</p>`:''}${story.letterLink?'<button class="letter-open">Написать себе в будущее</button>':''}</div>`,'story-dialog');
          }
          pendingStory={button,index:state.id-1};
        }catch{button.removeAttribute('aria-busy');open('<h2 id="dialog-title">Не удалось открыть историю</h2><p>Проверьте соединение и попробуйте ещё раз.</p>','locked-dialog')}
      };
    }
    updateWindow(button,state);
  });
}
window.__storiesReady=fetchWindowStates();
window.__storiesReady.catch(()=>{});
const refreshWindowStates=()=>fetchWindowStates().catch(()=>{});
setInterval(refreshWindowStates,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWindowStates()});
function quiz(){answers=Array(questions.length).fill(null);step=0;analytics('quiz',{action:'start'});renderQuestion()}
function renderQuestion(){const q=questions[step];open(`<h2 id="dialog-title" class="quiz-heading">А какой Новый год ваш?</h2><p class="quiz-progress" aria-live="polite">Вопрос ${step+1} из ${questions.length}</p><form id="quiz-form"><fieldset><legend>${step+1}. ${q[0]}</legend>${q.slice(1).map((a,i)=>`<label class="option"><input type="radio" name="answer" value="${i}" ${answers[step]===i?'checked':''}><span>${a}</span></label>`).join('')}</fieldset><p id="quiz-error" class="quiz-error" role="alert"></p><div class="quiz-nav"><button type="button" id="quiz-prev" aria-label="Предыдущий вопрос" ${step===0?'disabled':''}>←</button><button type="submit" id="quiz-next" aria-label="${step===questions.length-1?'Узнать результат':'Следующий вопрос'}">${step===questions.length-1?'Узнать ответ':'→'}</button></div></form>`,'quiz-dialog quiz-survey');$('#quiz-prev').onclick=()=>{const selected=$('#quiz-form input:checked');if(selected)answers[step]=Number(selected.value);step--;renderQuestion()};$('#quiz-form').onsubmit=e=>{e.preventDefault();const selected=$('#quiz-form input:checked');if(!selected){$('#quiz-error').textContent='Выберите вариант ответа.';return}answers[step]=Number(selected.value);analytics('quiz',{action:'answer',question:step+1,answer:answers[step]});if(step<questions.length-1){step++;renderQuestion();return}const id=chooseResult(scoreAnswers(answers),answers),r=results[id-1];analytics('result',{id:'R'+id});open(`<p class="result-label">Ваш результат:</p><h2 id="dialog-title" class="result-title">${r[0]}</h2><p class="result-copy">${r[1]}</p><div class="result-art" aria-hidden="true"></div><button id="repeat">Повторить</button>`,'quiz-dialog quiz-result');$('#repeat').onclick=quiz}}
function letter(){analytics('letter',{action:'open'});open(`<h2 id="dialog-title" class="sr-only">Письмо себе в будущий Новый год</h2><form id="letter-form" novalidate><div class="letter-to">Кому: &nbsp;Себе в 2027!</div><label class="email-field"><span>Куда:</span><input name="email" type="email" aria-label="Ваш email" placeholder="введите ваш e-mail" required></label><small id="email-error"></small><label class="letter-field"><span class="sr-only">Ваше письмо</span><textarea name="letter" maxlength="250" aria-label="Ваше письмо" placeholder="Напишите себе письмо. Максимум 250 символов." required></textarea></label><small id="letter-error"></small><p class="letter-hint">Не забудьте проверить название почты перед отправкой</p><div class="consent"><input type="checkbox" id="letter-consent" name="consent" aria-describedby="consent-error" required><span><label for="letter-consent">Выражаю согласие на обработку</label> <a href="https://secret-kitchen.ru/privacy-policy" target="_blank" rel="noopener noreferrer">персональных данных</a></span></div><small id="consent-error" aria-live="polite"></small><button type="submit">Отправить</button><p id="letter-status" role="status" aria-live="polite"></p></form>`,'letter-dialog');const form=$('#letter-form');form.consent.addEventListener('change',()=>{if(form.consent.checked){form.consent.setAttribute('aria-invalid','false');$('#consent-error').textContent=''}});form.onsubmit=e=>{e.preventDefault();const f=e.currentTarget,errors=validateLetter({letter:f.letter.value,email:f.email.value,consent:f.consent.checked});for(const key of Object.keys(errors)){$('#'+key+'-error').textContent=errors[key];f[key].setAttribute('aria-invalid',String(Boolean(errors[key])));f[key].setAttribute('aria-describedby',key+'-error')}if(!Object.values(errors).some(Boolean)){$('#letter-status').textContent='Отправка пока недоступна: не настроен сервис будущих писем';analytics('letter',{action:'submit_unavailable'})}}}
document.addEventListener('click',e=>{if(e.target.closest('.letter-open'))letter()});$('#quiz-open').onclick=quiz;analytics('landing',{utm:location.search});
}
