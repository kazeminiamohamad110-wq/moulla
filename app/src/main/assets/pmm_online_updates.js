/* PMM owner-requested online CONTENT updates only; no executable code updates.
   Source-of-truth is HTTPS manifest loaded by the restricted Android bridge.
   No remote content is stored in localStorage, IndexedDB, or files.
   The only persisted value is the acknowledged numeric revision. */
(function(){
'use strict';
var REVISION_KEY='pmm_content_accepted_revision_v1';
var sections={
  nahj_audio:{legacy:'nahj',name:'شرح جامع صوتی نهج‌البلاغه'},
  towhid:{legacy:'towhid',name:'توحید کاربردی'},
  see_god:{legacy:'life',name:'دیدن خدا در زندگی'},
  kafi:{legacy:'kafi',name:'شرح اصول کافی'},
  videos:{legacy:'clips',name:'کلیپ‌های تصویری'},
  photo_quotes:{legacy:'gallery',name:'عکس‌نوشته'},
  guest_sentence_new:{legacy:'wisdom',name:'یک جمله مهمان مولا'}
};
var current=null,shown=false,accepted=0;
var inMemoryIds=new Set();
var onlineBySection={};
Object.keys(sections).forEach(function(k){onlineBySection[k]=[]});
try{accepted=Math.max(0,parseInt(localStorage.getItem(REVISION_KEY)||'0',10)||0)}catch(_){}
var scene=document.getElementById('scene');
if(!scene)return;

var modal=document.createElement('section');
modal.id='pmm-update-dialog';modal.className='pmm-update-overlay';modal.hidden=true;
modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','pmm-update-heading');
modal.innerHTML=
  '<div class="pmm-update-card" dir="rtl">'+
  '<div class="pmm-update-emblem" aria-hidden="true">✦</div>'+
  '<h2 id="pmm-update-heading">مطالب جدید پای منبر مولا</h2>'+
  '<p class="pmm-update-subtitle">مطالب تازه برای شما آماده شده است</p>'+
  '<div id="pmm-update-summary" class="pmm-update-summary" aria-live="polite"></div>'+
  '<p class="pmm-update-footnote">مطالب جدید به‌صورت آنلاین نمایش داده می‌شوند و فضای ذخیره‌سازی گوشی را اشغال نمی‌کنند. برای مشاهده آن‌ها اینترنت لازم است.</p>'+
  '<div class="pmm-update-actions">'+
  '<button type="button" id="pmm-update-accept" class="pmm-update-confirm">دریافت مطالب جدید</button>'+
  '<button type="button" id="pmm-update-later" class="pmm-update-later">بعداً</button>'+
  '</div></div>';
scene.appendChild(modal);
var summary=document.getElementById('pmm-update-summary');
var acceptButton=document.getElementById('pmm-update-accept');
var laterButton=document.getElementById('pmm-update-later');
var focusBefore=null;

function allowedLink(value) {
  try {
    var u=new URL(value);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
      ((u.hostname==='eitaa.com'&&/^\/(?:joinchat\/[a-zA-Z0-9]+|[a-zA-Z0-9_]+\/[0-9]+)\/?$/.test(u.pathname))||
       ((u.hostname==='aparat.com'||u.hostname==='www.aparat.com')&&/^\/v\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname)));
  }catch(_){return false;}
}
// Only exact owner-hosted media may enter native media players (not random URLs).
function ownerAudioUrl(url,section){
 try{
  var u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='dl.kazeminia110.ir'||u.port||u.username||u.password||u.search||u.hash)return false;
  if(section==='kafi')return /^\/Audio\/kafi\/(?:kafi kotobe arbae|kafi(?: |%20)[1-9][0-9]{0,2})\.mp3$/.test(u.pathname);
  if(section==='nahj_audio')return /^\/Audio\/nahj-al-balaghe\/tartibi\/(?:khotbe\/khotbe|name\/name|hekmat\/hekmat)(?: |%20)[A-Za-z0-9. &%]+\.mp3$/i.test(u.pathname);
  return false;
 }catch(_){return false}
}
function ownerVideoUrl(url){
 try{
  var u=new URL(url);
  return u.protocol==='https:'&&u.hostname==='dl.kazeminia110.ir'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&
   /^\/Video\/video-clip\/video-clip(?: |%20)[1-9][0-9]{0,4}\.mp4$/i.test(u.pathname);
 }catch(_){return false}
}
function safePhotoUrl(value){
  try {
    var host=String(window.PMM_UPDATE_ORIGIN||'');
    if(!host)return false;
    var u=new URL(value);
    return u.protocol==='https:'&&u.origin===host&&/^\/media\/[a-f0-9-]{36}$/.test(u.pathname)&&!u.search&&!u.hash;
  }catch(_){return false;}
}
function validManifest(value) {
  if(!value||value.schema!==1||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.items)||value.items.length>3000)return false;
  var ids=new Set();
  return value.items.every(function(item){
    if(!item||!sections[item.section]||typeof item.id!=='string'||!(/^[0-9a-f-]{36}$/.test(item.id))||
      ids.has(item.id)||typeof item.title!=='string'||item.title.trim().length<2||item.title.length>180)return false;
    ids.add(item.id);
    if(item.section==='guest_sentence_new'){
      return typeof item.arabic==='string'&&item.arabic.trim().length>=3&&item.arabic.length<=3500&&
             typeof item.persian==='string'&&item.persian.trim().length>=3&&item.persian.length<=3500;
    }
    if(item.section==='photo_quotes')return safePhotoUrl(item.url);
    if(item.section==='videos')return (allowedLink(item.url)||ownerVideoUrl(item.url))&&
      (!item.coverUrl||safePhotoUrl(item.coverUrl));
    if(item.section==='kafi'||item.section==='nahj_audio')
      return allowedLink(item.url)||ownerAudioUrl(item.url,item.section);
    return allowedLink(item.url);
  });
}
function faNum(n){return Number(n).toLocaleString('fa-IR')}
function titleCounts(manifest){
  var counts={};
  manifest.items.forEach(function(item){
    if(Number(item.revision||0)>accepted)counts[item.section]=(counts[item.section]||0)+1;
  });
  var descriptions=Object.keys(counts).filter(function(k){return counts[k]>0}).map(function(k){
    return faNum(counts[k])+' مورد در «'+sections[k].name+'»';
  });
  return descriptions.length?descriptions:['فهرست مطالب به‌روزرسانی شده است.'];
}
function showModal(manifest){
  if(shown)return;
  var descriptions=titleCounts(manifest);
  summary.textContent='';
  descriptions.forEach(function(line){
    var p=document.createElement('p');p.textContent='✦ '+line;summary.appendChild(p);
  });
  shown=true;focusBefore=document.activeElement;
  modal.hidden=false;acceptButton.focus({preventScroll:true});
}
function closeModal(){
  shown=false;modal.hidden=true;
  if(focusBefore&&focusBefore.isConnected)focusBefore.focus({preventScroll:true});
}
// Every new record is added to its ORIGINAL native renderer. No extra card styles.
function titleNumber(title){
  var digits=String(title).match(/(?:جلسه|شماره|خطبه|نامه|حکمت)[\s\u200c]*(?:شماره[\s\u200c]*)?([0-9۰-۹٠-٩]{1,4})(?![0-9۰-۹٠-٩])/);
  return digits?Number(digits[1].replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776))
   .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632))):0;
}
function appendNativeLesson(item,target){
  var records=DATA[target];
  if(!Array.isArray(records))throw Error('Native lesson catalog missing: '+target);
  if(records.some(row=>row.pmmOnlineId===item.id||row.url===item.url))return;
  var max=records.reduce((v,row)=>Math.max(v,Number(row.number)||0),0);
  var suggested=titleNumber(item.title);
  var number=suggested>max&&suggested<=500?suggested:max+1;
  records.push({number,title:item.title,url:item.url,source:'آنلاین',pmmOnlineId:item.id});
}
function nahjGroup(item){
  var url=String(item.url),title=String(item.title);
  if(/\/khotbe\/khotbe(?: |%20)/.test(url)||/خطبه/.test(title))return 'sermons';
  if(/\/name\/name(?: |%20)/.test(url)||/نامه/.test(title))return 'letters';
  if(/\/hekmat\/hekmat(?: |%20)/.test(url)||/حکمت/.test(title))return 'wisdoms';
  return null;
}
function appendNativeNahj(item){
  var group=nahjGroup(item);
  if(!group)throw Error('عنوان نهج البلاغه باید مشخص کند: خطبه، نامه یا حکمت.');
  var records=NAHJ_AUDIO_ITEMS[group];
  if(!Array.isArray(records))throw Error('Nahj owner audio group unavailable');
  if(records.some(row=>row.pmmOnlineId===item.id||
      (Array.isArray(NAHJ_AUDIO_PARTS[row.id])&&NAHJ_AUDIO_PARTS[row.id].includes(item.url))))return;
  var number=titleNumber(item.title);
  if(!number){number=records.reduce((n,row)=>Math.max(n,Number(row.number)||0),0)+1;}
  var id='online-'+group+'-'+item.id;
  records.push({id,kind:'online',title:item.title,number,pmmOnlineId:item.id});
  NAHJ_AUDIO_PARTS[id]=[item.url];
}
function pruneStaleEntries(active){
  ['towhid','life','kafi'].forEach(target=>{
   var records=DATA[target];if(!Array.isArray(records))return;
   for(var i=records.length-1;i>=0;i--){
     if(records[i].pmmOnlineId&&!active.has(records[i].pmmOnlineId))records.splice(i,1);
   }
  });
  ['sermons','letters','wisdoms'].forEach(group=>{
   var records=NAHJ_AUDIO_ITEMS[group];if(!Array.isArray(records))return;
   for(var i=records.length-1;i>=0;i--){
     var row=records[i];
     if(row.pmmOnlineId&&!active.has(row.pmmOnlineId)){
       records.splice(i,1);delete NAHJ_AUDIO_PARTS[row.id];
     }
   }
  });
  for(var i=VIDEO_CLIPS.length-1;i>=0;i--){
   if(VIDEO_CLIPS[i].pmmOnlineId&&!active.has(VIDEO_CLIPS[i].pmmOnlineId))VIDEO_CLIPS.splice(i,1);
  }
  VIDEO_CLIPS.forEach((clip,index)=>{if(clip.pmmOnlineId)clip.number=index+1});
  inMemoryIds.forEach(id=>{if(!active.has(id))inMemoryIds.delete(id)});
}
var initialRenderList=renderList;
renderList=function(){initialRenderList()};
var initialRenderClips=renderClips;
renderClips=function(){
  initialRenderClips();
  if(VIDEO_CLIPS.length){
    var note=contents.querySelector('.pmm-clips-note');
    if(note)note.textContent='برای تماشای کلیپ، قاب مربوط را لمس کنید.';
  }
};
function applyManifest(manifest){
  if(!validManifest(manifest))throw Error('فهرست محتوای نامعتبر دریافت شد.');
  // Validate all destinations BEFORE touching any existing native content.
  manifest.items.forEach(item=>{
    if(item.section==='nahj_audio'&&!nahjGroup(item))
      throw Error('نوع خطبه/نامه/حکمت مشخص نشده است: '+item.title);
  });
  var active=new Set(manifest.items.map(item=>item.id));
  pruneStaleEntries(active);
  var urls=[],guest=[];
  var groups={};Object.keys(sections).forEach(k=>{groups[k]=[]});
  manifest.items.forEach(function(item){
    groups[item.section].push(item);
    if(item.section==='photo_quotes'){urls.push(item.url);return;}
    if(item.section==='guest_sentence_new'){guest.push(item);return;}
    if(inMemoryIds.has(item.id))return;
    if(item.section==='videos'){
      if(!VIDEO_CLIPS.some(v=>v.pmmOnlineId===item.id||v.url===item.url))
        VIDEO_CLIPS.push({number:VIDEO_CLIPS.length+1,title:item.title,url:item.url,
         tags:'',coverUrl:item.coverUrl||'',pmmOnlineId:item.id});
    }else if(item.section==='nahj_audio'){
      appendNativeNahj(item);
    }else{
      appendNativeLesson(item,sections[item.section].legacy);
    }
    inMemoryIds.add(item.id);
  });
  Object.keys(sections).forEach(k=>{onlineBySection[k]=groups[k]});
  if(!window.PMM_PHOTO_QUOTES_VIEW||typeof window.PMM_PHOTO_QUOTES_VIEW.setOnlinePhotos!=='function')
    throw Error('Native photo gallery not ready');
  window.PMM_PHOTO_QUOTES_VIEW.setOnlinePhotos(urls);
  if(!window.PMM_WISDOM_UI||typeof window.PMM_WISDOM_UI.setOnlineSentences!=='function')
    throw Error('Native wisdom reader not ready');
  window.PMM_WISDOM_UI.setOnlineSentences(guest);
  if(screen==='list'&&['nahj','towhid','life','kafi','clips'].includes(section))render();
  if(screen==='gallery'&&typeof galleryRenderGrid==='function')galleryRenderGrid();
}
function receiveManifest(raw){
  var manifest;
  try{manifest=typeof raw==='string'?JSON.parse(raw):raw}catch(_){return;}
  if(!validManifest(manifest))return;
  current=manifest;
  if(manifest.revision>accepted){showModal(manifest);return;}
  try{applyManifest(manifest)}catch(err){console.warn('PMM content integration:',err.message)}
}
acceptButton.addEventListener('click',function(){
  if(!current)return;
  acceptButton.disabled=true;
  try{
    applyManifest(current);
    accepted=current.revision;
    try{localStorage.setItem(REVISION_KEY,String(accepted))}catch(_){}
    closeModal();
    if(window.PMM_NEW_UI&&window.PMM_NEW_UI.showToast)window.PMM_NEW_UI.showToast('مطالب جدید در بخش‌های مربوط در دسترس است.');
  }catch(err){
    console.warn('Could not activate online content',err);
    var p=document.createElement('p');p.textContent='نمایش مطالب جدید انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.';summary.appendChild(p);
  }finally{acceptButton.disabled=false;}
});
laterButton.addEventListener('click',closeModal);
// Physical Android Back while the dialog is open behaves as "بعداً"; never exits.
var previousBack=goBack;
goBack=function(){if(shown){closeModal();return}return previousBack()};
modal.addEventListener('keydown',function(e){
  if(e.key==='Tab'){
    if(e.shiftKey&&document.activeElement===acceptButton){e.preventDefault();laterButton.focus()}
    else if(!e.shiftKey&&document.activeElement===laterButton){e.preventDefault();acceptButton.focus()}
  }
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeModal()}
});
window.PMM_CONTENT_UPDATES=Object.freeze({
  receiveManifest:receiveManifest,
  isVisible:function(){return shown},
  acceptedRevision:function(){return accepted},
  getOnlineCounts:function(){return Object.keys(onlineBySection).reduce(function(out,k){out[k]=onlineBySection[k].length;return out},{})}
});
// The Android host calls checkContentUpdates() on each fresh application load.
// No permission for remote server to inject scripts, HTML, Android intents, or arbitrary native actions.
})();