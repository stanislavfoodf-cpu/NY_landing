export const pairs=[[[1,6],[2,7],[3,4],[4,8]],[[6,5],[2,5],[5,3],[1,6]],[[6,1],[2,7],[3,4],[8,4]],[[1,7],[7,2],[7,3],[8,4]],[[6,1],[2,5],[3,4],[5,8]]];
export const priority=[7,8,5,2,6,1,3,4];
export function scoreAnswers(answers){const scores=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,0])); answers.forEach((a,i)=>{if(pairs[i]?.[a]){const [x,y]=pairs[i][a]; scores[x]+=2;scores[y]++;}});return scores;}
export function chooseResult(scores,answers){const max=Math.max(...Object.values(scores));const tied=priority.filter(i=>scores[i]===max);for(const q of [3,0]){const primary=pairs[q]?.[answers[q]]?.[0];if(tied.includes(primary))return primary;}return tied[0];}
export function renderLetterSentState(card,template){card.replaceChildren(template.content.cloneNode(true));card.classList.add('letter-card--sent');card.setAttribute('aria-live','polite');}
export function validateLetter({letter,email,consent}){return {letter:letter.trim()?'':'Напишите письмо.',email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())?'':'Укажите корректный email.',consent:consent?'':'Необходимо согласие.'};}
const questions=[['Идеальный Новый год для вас — это…','Когда дома и спокойно','Когда все свои собрались','Когда людей много и громко','Когда вообще без обязательной программы'],['Что важнее всего на праздничном столе?','То, что люблю именно я','Чтобы хватило всем','Чтобы можно было попробовать всё','Чтобы я это не готовил'],['В 23:30 вы скорее…','Уже под пледом','Наливаете всем бокалы','Где-то между третьей компанией и четвёртым адресом','Ещё не решили, где будете встречать Новый год'],['Если часть близких встречает праздник далеко…','Спокойно поздравим и созвонимся позже','Видеозвонок обязателен — все должны быть вместе','Подключим их прямо к столу и празднику','Встретимся в другой день — праздник не обязан быть 31-го'],['1 января — это день для…','Пижамы и сериалов','Доедания всего вместе','Продолжения банкета','Новых гастрономических решений']];
const results=[['Тихий Новый год','Ваш главный новогодний план — чтобы планов было поменьше.'],['Только свои','Вам не нужна большая вечеринка. Вам нужны правильные люди.'],['Я только на час','Каждый ваш Новый год начинается со слов «ненадолго».'],['Праздник где угодно','Дата и место вторичны. Главное — чтобы праздник случился.'],['Каждый найдёт своё','Ваш идеальный праздник — когда никому не приходится выбирать одно на всех.'],['Новый год в пижаме','Красивый наряд — факультатив. Хорошая еда — обязательна.'],['На расстоянии, но вместе','Вы умеете оставаться рядом, даже когда между вами километры.'],['31 декабря — понятие относительное','Ваш Новый год начинается тогда, когда собрались все нужные люди.']];
if(typeof document!=='undefined'){
const $=s=>document.querySelector(s), overlay=$('#overlay'), dialog=$('.dialog'), content=$('#dialog-content'),scrollToCards=$('.scroll-to-cards');let previous,answers=[],pendingStory=null;
const analytics=(type,detail={})=>document.dispatchEvent(new CustomEvent('sk-ny:analytics',{detail:{type,...detail}}));
function markStoryViewed(){if(!pendingStory)return;const {button,index}=pendingStory;button.classList.add('viewed');if(!button.getAttribute('aria-label').includes('просмотрено'))button.setAttribute('aria-label',button.getAttribute('aria-label')+', просмотрено');try{sessionStorage.setItem('window-v5-'+index,'1')}catch{}pendingStory=null;scrollToCards.hidden=false;updateScrollArrowVisibility();}
const updateScrollArrowVisibility=()=>{scrollToCards.classList.toggle('past-house',$('.cards').getBoundingClientRect().top<=window.innerHeight+30)};
let scrollArrowUpdatePending=false;
function scheduleScrollArrowUpdate(){if(scrollArrowUpdatePending)return;scrollArrowUpdatePending=true;requestAnimationFrame(()=>{scrollArrowUpdatePending=false;updateScrollArrowVisibility()})}
window.addEventListener('scroll',scheduleScrollArrowUpdate,{passive:true});window.addEventListener('resize',scheduleScrollArrowUpdate,{passive:true});updateScrollArrowVisibility();
try{if(sessionStorage.getItem('scroll-to-cards-clicked'))scrollToCards.classList.add('is-used');}catch{}
scrollToCards.addEventListener('click',()=>{scrollToCards.classList.add('is-used');try{sessionStorage.setItem('scroll-to-cards-clicked','1')}catch{}$('.cards').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
function releaseStoryVideo(){const video=content.querySelector('video.story-video');if(video){video.pause();video.removeAttribute('src');video.load();}}
function open(html,kind=''){if(!overlay.hidden&&dialog.classList.contains('story-dialog')&&kind!=='story-dialog')markStoryViewed();if(overlay.hidden)previous=document.activeElement;releaseStoryVideo();dialog.querySelector('.modal-garland')?.remove();content.innerHTML=html;content.scrollTop=0;dialog.className='dialog '+kind;if(kind==='quiz-dialog quiz-survey'||kind==='quiz-dialog quiz-result'){const frame=document.createElement('div');frame.className='modal-garland';frame.setAttribute('aria-hidden','true');frame.innerHTML='<span class="modal-garland__top"></span><span class="modal-garland__bottom"></span><span class="modal-garland__left"></span><span class="modal-garland__right"></span>';dialog.append(frame);}overlay.hidden=false;overlay.scrollTop=0;dialog.scrollTop=0;document.body.classList.add('modal-open');dialog.focus({preventScroll:true});}
function close(){if(dialog.classList.contains('story-dialog'))markStoryViewed();overlay.hidden=true;releaseStoryVideo();document.body.classList.remove('modal-open');previous?.focus();}
$('.close').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape')close();if(e.key==='Tab'){const items=[...dialog.querySelectorAll('button:not([disabled]),input,textarea,[href]')].filter(item=>item.getClientRects().length&&getComputedStyle(item).visibility!=='hidden');if(!items.length)return;const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
const grid=$('#windows'), windowButtons=[];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const storyVideos = {};
function openImageStory(story,button){
  open(`<h2 id="dialog-title" class="sr-only">${escapeHtml(story.title)}</h2><div class="first-story-image"><img src="/api/windows/${story.id}/image" width="1624" height="1635" alt="${escapeHtml(story.title)}. ${escapeHtml(story.line1)} ${escapeHtml(story.line2)}"></div>`,'story-dialog first-story-dialog first-story-static');
  const image=content.querySelector('img');
  const markReady=()=>{if(image.isConnected&&!overlay.hidden)pendingStory={button,index:story.id-1}};
  image.addEventListener('load',markReady,{once:true});
  image.addEventListener('error',()=>{if(!image.isConnected||overlay.hidden)return;if(story.id<=5&&!image.dataset.fallback){image.dataset.fallback='true';image.src=`/src/assets/figma/stories/window-${story.id}.webp`;return}const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='Не удалось загрузить историю. Попробуйте ещё раз.';image.replaceWith(message);});
  if(image.complete&&image.naturalWidth)markReady();
}
function openVideoStory(story,button){
  const description=`Новогодняя встреча друзей. ${story.line1} ${story.line2}`;
  open(`<h2 id="dialog-title" class="sr-only">${escapeHtml(story.title)}</h2><div class="first-story-image story-video-frame"><video class="story-video" playsinline loop preload="auto" aria-label="${escapeHtml(description)}"></video><div class="story-video-status" role="status" aria-live="polite"><span class="story-video-spinner" aria-hidden="true"></span><p class="story-video-message">Загружаем историю…</p><button class="story-video-retry" type="button" hidden>Попробовать снова</button><button class="story-video-play" type="button" hidden>Воспроизвести видео</button></div><button class="story-video-sound" type="button" hidden>Выключить звук</button></div>`,'story-dialog first-story-dialog');
  const video=content.querySelector('.story-video'),status=content.querySelector('.story-video-status'),message=content.querySelector('.story-video-message'),spinner=content.querySelector('.story-video-spinner'),retry=content.querySelector('.story-video-retry'),playButton=content.querySelector('.story-video-play'),soundButton=content.querySelector('.story-video-sound');
  dialog.style.removeProperty('--story-video-ratio');
  const active=()=>video.isConnected&&!overlay.hidden;
  const loading=()=>{if(!active())return;dialog.classList.add('is-video-loading');status.hidden=false;spinner.hidden=false;message.textContent='Загружаем историю…';retry.hidden=true;playButton.hidden=true;};
  const failure=()=>{if(!active())return;dialog.classList.add('is-video-loading');status.hidden=false;spinner.hidden=true;message.textContent='Не удалось загрузить видео. Проверьте соединение и попробуйте снова.';retry.hidden=false;playButton.hidden=true;soundButton.hidden=true;};
  const syncSound=()=>{soundButton.textContent=video.muted?'Включить звук':'Выключить звук';};
  const play=async()=>{try{await video.play();}catch(error){if(!active()||error.name==='AbortError')return;if(error.name==='NotAllowedError'&&!video.muted){video.muted=true;syncSound();try{await video.play();return;}catch(second){if(!active()||second.name==='AbortError')return;}}if(!active())return;if(video.error){failure();return;}dialog.classList.add('is-video-loading');status.hidden=false;spinner.hidden=true;message.textContent='';retry.hidden=true;playButton.hidden=false;}};
  video.addEventListener('playing',()=>{if(!active())return;status.hidden=true;dialog.classList.remove('is-video-loading');soundButton.hidden=false;syncSound();pendingStory={button,index:story.id-1};});
  video.addEventListener('waiting',loading);
  video.addEventListener('error',failure);
  video.addEventListener('loadedmetadata',()=>{if(active()&&video.videoWidth&&video.videoHeight)dialog.style.setProperty('--story-video-ratio',String(video.videoWidth/video.videoHeight));});
  video.addEventListener('loadeddata',()=>{if(active()&&matchMedia('(prefers-reduced-motion: reduce)').matches&&video.paused){dialog.classList.add('is-video-loading');status.hidden=false;spinner.hidden=true;message.textContent='';playButton.hidden=false;}});
  retry.addEventListener('click',()=>{loading();video.load();play();});
  playButton.addEventListener('click',()=>{loading();play();});
  soundButton.addEventListener('click',()=>{video.muted=!video.muted;syncSound();});
  loading();video.src=storyVideos[story.id];video.load();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
}
function updateWindow(button,state){
  const locked=!state.available;
  button.classList.toggle('locked',locked);
  if(locked)button.classList.remove('viewed');
  button.setAttribute('aria-label',`Окно ${state.id}: ${state.title||'История'}${locked?(state.unlockLabel?', откроется '+state.unlockLabel:', закрыто'):''}`);
  button.innerHTML=locked?`<span>♙${state.unlockLabel?`<small>открывается<br><b>${escapeHtml(state.unlockLabel)}</b></small>`:''}</span>`:'';
  if(!locked){try{if(sessionStorage.getItem('window-v5-'+(state.id-1))){button.classList.add('viewed');button.setAttribute('aria-label',button.getAttribute('aria-label')+', просмотрено');scrollToCards.hidden=false}}catch{}}
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
          if(result.status===423){analytics('window',{number:state.id,locked:true});updateWindow(button,{id:state.id,title:null,available:false,unlockLabel:story.unlockLabel});button.removeAttribute('aria-busy');open(`<h2 id="dialog-title" class="locked-title">Здесь пока тихо</h2>${story.unlockLabel?`<p>Загляните ${escapeHtml(story.unlockLabel)}.</p>`:''}`,'locked-dialog');return}
          if(!result.ok)throw new Error('История недоступна');
          analytics('window',{number:state.id,locked:false});
          updateWindow(button,{id:state.id,title:story.title,available:true});
          button.removeAttribute('aria-busy');
          if(story.id>=1&&story.id<=6){
            openImageStory(story,button);
          }else if(storyVideos[story.id]){
            openVideoStory(story,button);
          }else{
            open(`<div class="story-scene"><h2 id="dialog-title" class="sr-only">${escapeHtml(story.title)}</h2><div class="story-art"></div><p class="ribbon">${escapeHtml(story.line1)}</p>${story.line2?`<p class="ribbon second">${escapeHtml(story.line2)}</p>`:''}</div>`,'story-dialog');
            pendingStory={button,index:state.id-1};
          }
        }catch{button.removeAttribute('aria-busy');open('<h2 id="dialog-title">Не удалось открыть историю</h2><p>Проверьте соединение и попробуйте ещё раз.</p>','locked-dialog')}
      };
    }
    updateWindow(button,state);
  });
}
window.__storiesReady=fetchWindowStates();
window.__storiesReady.catch(()=>{});
const refreshWindowStates=()=>fetchWindowStates().catch(()=>{});
setInterval(()=>{if(!document.hidden)refreshWindowStates()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWindowStates()});
function quiz(){
  answers=Array(questions.length).fill(null);
  analytics('quiz',{action:'start'});
  open(`<h2 id="dialog-title" class="quiz-heading">А какой Новый год ваш?</h2><form id="quiz-form" novalidate>${questions.map((q,index)=>`<fieldset><legend>${index+1}. ${q[0]}</legend>${q.slice(1).map((answer,i)=>`<label class="option"><input type="radio" name="answer-${index}" value="${i}" required><span>${answer}</span></label>`).join('')}<p class="quiz-question-error" id="quiz-question-error-${index}" hidden>Выберите вариант ответа.</p></fieldset>`).join('')}<p id="quiz-error" class="quiz-error" role="alert"></p><div class="quiz-nav"><button type="submit" id="quiz-next" aria-label="Узнать результат">Узнать ответ</button></div></form>`,'quiz-dialog quiz-survey');
  const form=$('#quiz-form');
  const groups=[...form.querySelectorAll('fieldset')];
  function updateGroup(group,invalid){
    const error=group.querySelector('.quiz-question-error');
    error.hidden=!invalid;
    group.querySelectorAll('input').forEach(input=>{
      input.setAttribute('aria-invalid',String(invalid));
      if(invalid)input.setAttribute('aria-describedby',error.id);
      else input.removeAttribute('aria-describedby');
    });
  }
  form.addEventListener('change',event=>{
    if(event.target.matches('input[type="radio"]'))updateGroup(event.target.closest('fieldset'),false);
    if(groups.every(group=>group.querySelector('input:checked')))$('#quiz-error').textContent='';
  });
  form.onsubmit=event=>{
    event.preventDefault();
    const selected=groups.map(group=>group.querySelector('input:checked'));
    groups.forEach((group,index)=>updateGroup(group,!selected[index]));
    const firstMissing=selected.findIndex(answer=>!answer);
    if(firstMissing!==-1){
      $('#quiz-error').textContent='Ответьте на все вопросы.';
      groups[firstMissing].querySelector('input').focus();
      return;
    }
    answers=selected.map(input=>Number(input.value));
    answers.forEach((answer,index)=>analytics('quiz',{action:'answer',question:index+1,answer}));
    const id=chooseResult(scoreAnswers(answers),answers),r=results[id-1];
    analytics('result',{id:'R'+id});
    open(`<p class="result-label">Ваш результат:</p><h2 id="dialog-title" class="result-title">${r[0]}</h2><p class="result-copy">${r[1]}</p><div class="result-art" aria-hidden="true"><img src="src/assets/figma/quiz-results/${id}.webp" alt="" width="1080" height="1080"></div><button id="repeat">Повторить</button>`,'quiz-dialog quiz-result');
    $('#repeat').onclick=quiz;
  };
}
$('#quiz-open').onclick=quiz;analytics('landing',{utm:location.search});
}
