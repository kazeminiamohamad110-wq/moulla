/* Owner-approved transcript drawer. No remote scripts or audio requests. */
(function(){
'use strict';
const bounds={sermons:241,letters:79,wisdoms:480};
const cache=new Map(),pending=new Map(),requests=new WeakMap();
let serial=0;
const readingSizes=[16,19,22,25,28,32];
const readingSizeKey='pmm_transcript_reading_size_v152';
let readingSize=16;
try{const n=Number(localStorage.getItem(readingSizeKey));if(readingSizes.includes(n))readingSize=n}catch(_){}
let activeReader=null;
// The reading layer is attached to the golden stage, not the scrolling player.
// Never move/re-render the card or its audio element to open or close text.
function fitReader(layer,tools,stage){
 const sr=stage.getBoundingClientRect();
 if(sr.width<=0)return;
 // R4: centered reader, 3% margin at each stage edge on every viewport.
 layer.style.setProperty('--pmm-reader-left','3%');
 layer.style.setProperty('--pmm-reader-width','94%');
}
window.addEventListener?.('resize',()=>{if(activeReader)activeReader.fit()});
function key(raw){try{return decodeURI(new URL(raw).href)}catch(_){return ''}}
function valid(g,n){return Object.prototype.hasOwnProperty.call(bounds,g)&&Number.isInteger(n)&&n>=1&&n<=bounds[g]}
window.PMM_NAHJ_TRANSCRIPT_ACCEPT=function(data){
 if(!data||!valid(data.group,data.number)||!Array.isArray(data.parts)||!data.parts.length||!data.parts.every(t=>typeof t==='string'&&t.trim()))return;
 const p=pending.get(data.group+'/'+data.number);if(p&&document.currentScript===p.tag)p.finish(data);
};
function load(g,n){
 if(!valid(g,n))return Promise.resolve(null);
 const k=g+'/'+n;
 if(cache.has(k)){const v=cache.get(k);cache.delete(k);cache.set(k,v);return Promise.resolve(v)}
 if(pending.has(k))return pending.get(k).promise;
 let resolve,timer,finished=false;const tag=document.createElement('script'),promise=new Promise(r=>resolve=r);
 function finish(data){if(finished)return;finished=true;clearTimeout(timer);pending.delete(k);tag.remove();if(data){cache.set(k,data);while(cache.size>4)cache.delete(cache.keys().next().value)}resolve(data)}
 pending.set(k,{promise,tag,finish});tag.onerror=tag.onload=()=>finish(null);tag.src='pmm-transcripts/'+k+'.js';tag.charset='utf-8';timer=setTimeout(()=>finish(null),8000);
 try{document.head.append(tag)}catch(_){finish(null)}return promise;
}
function reference(group,record,urls,index,raw){
 if(!record||record.kind==='online'||record.kind==='gharaib'||!key(raw)||key(raw)!==key(urls[index]))return null;
 const prefix={sermons:'sermon',letters:'letter',wisdoms:'wisdom'}[group];
 if(!prefix||!new RegExp('^'+prefix+'-[0-9]+(?:-[0-9]+)*$').test(record.id))return null;
 const nums=record.id.split('-').slice(1).map(Number);if(!nums.every(n=>valid(group,n))||nums[0]!==record.number)return null;
 if(nums.length>1&&urls.length!==1)return null;
 return {group,nums,part:index+1,total:urls.length};
}
async function display(ref,body,panel){
 const token={};requests.set(body,token);body.textContent='در حال خواندن متن…';
 const data=await Promise.all(ref.nums.map(n=>load(ref.group,n)));
 if(!body.isConnected||panel.hidden||requests.get(body)!==token)return;
 if(data.some(x=>!x)){body.textContent='متن این شماره هنوز در دسترس نیست.';return}
 if(ref.nums.length>1){
  if(data.some(x=>x.parts.length!==1)){body.textContent='تطبیق متن و صوت نیازمند بررسی است.';return}
  body.textContent=data.map(x=>x.parts[0]).join('\n\n');
 }else if(data[0].parts.length===ref.total){body.textContent=data[0].parts[ref.part-1]}
 else{body.textContent='تعداد بخش‌های متن و صوت متفاوت است؛ تطبیق این شماره نیازمند بررسی است.'}
 body.scrollTop=0;
}
function button(label,html){const b=document.createElement('button');b.type='button';b.className='pmm-session-tool';b.setAttribute('aria-label',label);b.innerHTML=html;return b}
const gearIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2h4l1 3 2 1 3-1 2 3-2 2v4l2 2-2 3-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-3 2-2v-4L2 8l2-3 3 1 2-1z"/><circle cx="12" cy="12" r="3"/></svg>';
const textIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h6"/></svg>';
function mount(card,ref){
 if(card.dataset.pmmTextMounted)return;card.dataset.pmmTextMounted='1';
 const audio=card.querySelector('audio'),isAudio=!!audio;
 let speed=card.querySelector('.nahj-part-speed');
 if(isAudio&&!speed){
  speed=document.createElement('div');speed.className='nahj-part-speed';
  const rates=document.createElement('div');rates.className='nahj-part-rates';rates.setAttribute('role','group');rates.setAttribute('aria-label','سرعت پخش صوت');
  const values=[.75,1,1.25,1.5,2];let selected=1;try{const v=Number(localStorage.getItem('pmm_direct_audio_rate_v152'));if(values.includes(v))selected=v}catch(_){}
  function apply(){audio.playbackRate=selected;const url=audio.dataset.src;window.PMM_GLOBAL_AUDIO?.speed?.(url,selected);rates.querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.rate)===selected;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))})}
  for(const rate of values){const b=button('سرعت '+rate+' برابر',String(rate)+'×');b.className='nahj-part-rate';b.dataset.rate=String(rate);b.addEventListener('click',()=>{selected=rate;try{localStorage.setItem('pmm_direct_audio_rate_v152',String(rate))}catch(_){}apply()});rates.append(b)}
  speed.append(rates);audio.addEventListener('play',apply);apply();
 }
 const tools=document.createElement('div');tools.className='pmm-session-tools';
 const text=button('متن',textIcon+'<span>متن</span>');text.classList.add('pmm-text-trigger');text.setAttribute('aria-expanded','false');text.setAttribute('aria-haspopup','dialog');
 const panel=document.createElement('section');panel.className='pmm-session-transcript';panel.id='pmm-session-text-'+(++serial);panel.hidden=true;panel.setAttribute('aria-label','متن جلسه');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');text.setAttribute('aria-controls',panel.id);
 const header=document.createElement('div');header.className='pmm-transcript-header';const title=document.createElement('span');title.className='pmm-transcript-title';title.textContent='متن';
 const sizeControls=document.createElement('div');sizeControls.className='pmm-transcript-size-controls';sizeControls.setAttribute('role','group');sizeControls.setAttribute('aria-label','اندازه متن');
 const larger=button('بزرگ کردن متن','الف+');larger.title='بزرگ کردن متن';
 const smaller=button('کوچک کردن متن','الف−');smaller.title='کوچک کردن متن';
 sizeControls.append(larger,smaller);
 const close=button('بستن متن','×');close.classList.add('pmm-transcript-close');header.append(title,sizeControls,close);
 const body=document.createElement('div');body.className='pmm-transcript-scroll';body.tabIndex=0;body.setAttribute('aria-label','متن قابل پیمایش');body.textContent='متن این جلسه هنوز ثبت نشده است.';panel.append(header,body);
 function syncReadingSize(){panel.style.setProperty('--pmm-reading-size',readingSize+'px');larger.disabled=readingSize===readingSizes[readingSizes.length-1];smaller.disabled=readingSize===readingSizes[0]}
 function changeReadingSize(direction){const ratio=body.scrollHeight>0?body.scrollTop/body.scrollHeight:0;const i=readingSizes.indexOf(readingSize);readingSize=readingSizes[Math.max(0,Math.min(readingSizes.length-1,i+direction))];try{localStorage.setItem(readingSizeKey,String(readingSize))}catch(_){}syncReadingSize();body.scrollTop=Math.round(ratio*body.scrollHeight)}
 larger.addEventListener('click',()=>changeReadingSize(1));smaller.addEventListener('click',()=>changeReadingSize(-1));syncReadingSize();
 const stage=document.getElementById('stage');
 const layer=document.createElement('div');layer.className='pmm-reader-layer';layer.hidden=true;
 layer.append(panel);
 const reader={close:focus=>closeText(!!focus),fit:()=>fitReader(layer,tools,stage)};
 layer.addEventListener('click',e=>{if(e.target===layer)closeText(true)});
 for(const event of ['copy','cut','contextmenu','selectstart','dragstart'])panel.addEventListener(event,e=>e.preventDefault());
 function closeText(focus){
  requests.delete(body);const wasOpen=activeReader===reader;
  if(wasOpen)activeReader=null;
  panel.hidden=true;layer.hidden=true;layer.remove();text.setAttribute('aria-expanded','false');
  if(wasOpen&&focus&&text.isConnected){try{text.focus({preventScroll:true})}catch(_){text.focus()}}
 }
 let gear=null;function closeSpeed(){if(gear){speed.hidden=true;gear.setAttribute('aria-expanded','false')}}
 if(isAudio&&speed){speed.classList.add('pmm-session-speed');speed.hidden=true;speed.id='pmm-session-speed-'+serial;gear=button('تنظیم سرعت پخش',gearIcon);gear.setAttribute('aria-expanded','false');gear.setAttribute('aria-controls',speed.id);gear.addEventListener('click',()=>{const open=speed.hidden;closeText(false);speed.hidden=!open;gear.setAttribute('aria-expanded',String(open))});tools.append(gear)}
 tools.append(text);text.addEventListener('click',()=>{
  if(!panel.hidden){closeText(true);return}if(!stage||!card.isConnected)return;
  closeSpeed();if(activeReader&&activeReader!==reader)activeReader.close();
  activeReader=reader;syncReadingSize();reader.fit();stage.append(layer);layer.hidden=false;panel.hidden=false;
  text.setAttribute('aria-expanded','true');body.scrollTop=0;
  try{close.focus({preventScroll:true})}catch(_){close.focus()}
  if(ref)display(ref,body,panel);
 });
 close.addEventListener('click',()=>closeText(true));panel.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeText(true);return}
  if(e.key==='Tab'){
   const focusable=[larger,smaller,close,body].filter(el=>!el.disabled),i=focusable.indexOf(document.activeElement);
   if(e.shiftKey&&i<=0){e.preventDefault();focusable[focusable.length-1].focus()}
   else if(!e.shiftKey&&(i<0||i===focusable.length-1)){e.preventDefault();focusable[0].focus()}
  }
 });
 const back=card.querySelector('#player-back');const elements=gear?[tools,speed]:[tools];if(back)back.before(...elements);else card.append(...elements);
}
function scan(){
 if(activeReader){activeReader.close();activeReader=null;}
 if(screen==='list'&&section==='nahj'&&item?.nahjEntry){
  const group=item.nahjGroup,record=NAHJ_AUDIO_ITEMS[group]?.find(r=>r.id===item.nahjEntry),urls=record?NAHJ_AUDIO_PARTS[record.id]||[]:[];
  const cards=Array.from(contents.querySelectorAll('section.nahj-part-card'));
  cards.forEach((card,i)=>{const raw=card.querySelector('audio')?.dataset.src||card.dataset.transcriptUrl||'';mount(card,cards.length===urls.length?reference(group,record,urls,i,raw):null)});return;
 }
 if(screen==='player'&&['nahj','towhid','life','kafi'].includes(section)&&item){const card=contents.querySelector('.kafi-audio-card')||contents.querySelector('.content-box');if(card)mount(card,null)}
}
const oldRender=render;render=function(){if(activeReader)activeReader.close();const result=oldRender.apply(this,arguments);scan();return result};
const oldBack=goBack;goBack=function(){if(document.getElementById('pmm-update-dialog')?.hidden===false)return oldBack.apply(this,arguments);if(activeReader){activeReader.close(true);return}return oldBack.apply(this,arguments)};
scan();
})();
