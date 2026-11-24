#!/usr/bin/env node
/* All seven online sections must reuse the exact native UI/catalog and operations. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'app/src/main/assets/pmm_online_updates.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'online-content/cloudflare-dashboard-single-file.js'),'utf8');
for(const pattern of [/row_blank\.webp/,/session-label/,/poster:c\.coverUrl/,/pmmClipPlayer=video/,/window\.PMM_WISDOM_UI/,/setOnlinePhotos:function/,/PMM_KAFI_SPEEDS/])
 assert.match(html,pattern);
assert.match(worker,/function validOwnerAudio/);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
 if(m[1].trim())new vm.Script(m[1]);
function el(){return{hidden:false,disabled:false,textContent:'',value:'',events:{},children:[],classList:{add(){},remove(){}},
 appendChild(v){this.children.push(v)},addEventListener(k,f){this.events[k]=f},setAttribute(){},focus(){},remove(){}}}
const nodes={};const e=id=>nodes[id]||(nodes[id]=el());
const native={
 PMM_UPDATE_ORIGIN:'https://pmm-content-updates.kazeminia-mohamad110.workers.dev',
 PMM_NEW_UI:{showToast(){}},
 PMM_PHOTO_QUOTES_VIEW:{setOnlinePhotos(urls){this.urls=urls.slice()}},
 PMM_WISDOM_UI:{setOnlineSentences(rows){this.rows=rows.slice()}}
};
const data={life:[{number:1,title:'جلسه ۱',url:'https://www.aparat.com/v/oldL'}],
 towhid:[{number:1,title:'جلسه ۱',url:'https://www.aparat.com/v/oldT'}],
 kafi:[{number:1,title:'جلسه ۱',url:'https://www.aparat.com/v/oldK'}]};
const ng={sermons:[{id:'sermon-1',number:1,title:'خطبه ۱'}],letters:[],wisdoms:[]};
const np={'sermon-1':['https://dl.kazeminia110.ir/Audio/nahj-al-balaghe/tartibi/khotbe/khotbe%201.mp3']};
const clips=[{number:1,title:'کلیپ ۱',url:'https://dl.kazeminia110.ir/Video/video-clip/video-clip 1.mp4'}];
const contents=el(),store=new Map(),ctx={
 window:native,document:{getElementById:e,createElement:el,activeElement:null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))},
 DATA:data,NAHJ_AUDIO_ITEMS:ng,NAHJ_AUDIO_PARTS:np,VIDEO_CLIPS:clips,
 screen:'list',section:'life',contents,renderList(){},renderClips(){},render(){},goBack(){},setState(){},openEitaa(){},
 console,URL,Set,JSON,Number,Object,Math,Date,Array,Error
};
vm.runInNewContext(js,ctx);
const api=native.PMM_CONTENT_UPDATES;assert.equal(typeof api.receiveManifest,'function');
const uuid=i=>'aaaaaaaa-bbbb-4ccc-8ddd-'+String(i).padStart(12,'0');
const mk=(i,section,title,url,extra={})=>({id:uuid(i),section,title,url,revision:1,...extra});
const cover='https://pmm-content-updates.kazeminia-mohamad110.workers.dev/media/'+uuid(101);
const entries=[
 mk(1,'towhid','جلسه ۲','https://www.aparat.com/v/towhid2'),
 mk(2,'see_god','جلسه ۱۸','https://www.aparat.com/v/life18'),
 mk(3,'kafi','جلسه ۵۵','https://dl.kazeminia110.ir/Audio/kafi/kafi%2055.mp3'),
 mk(4,'nahj_audio','خطبه ۲','https://dl.kazeminia110.ir/Audio/nahj-al-balaghe/tartibi/khotbe/khotbe%202.mp3'),
 mk(5,'videos','کلیپ ۲۰۲','https://dl.kazeminia110.ir/Video/video-clip/video-clip%20202.mp4',{coverUrl:cover}),
 mk(6,'photo_quotes','عکس‌نوشته جدید',cover),
 {...mk(7,'guest_sentence_new','جمله تازه'),arabic:'عربی جدید',persian:'ترجمه فارسی جدید'}
];
api.receiveManifest({schema:1,revision:1,items:entries});
assert.equal(data.life.length,1,'No content before owner/user approves update');
e('pmm-update-accept').events.click();
assert.equal(data.life.at(-1).number,18);assert.equal(data.towhid.length,2);assert.equal(data.kafi.at(-1).number,55);
assert.equal(ng.sermons.length,2);assert.equal(np[ng.sermons[1].id][0],entries[3].url);
assert.equal(clips[1].coverUrl,cover);assert.equal(native.PMM_PHOTO_QUOTES_VIEW.urls[0],cover);
assert.equal(native.PMM_WISDOM_UI.rows[0].title,'جمله تازه');
assert.equal(contents.children.length,0,'No foreign fresh-content card');
for(const k of ['towhid','see_god','kafi','nahj_audio','videos','photo_quotes','guest_sentence_new'])
 assert.equal(api.getOnlineCounts()[k],1);
api.receiveManifest({schema:1,revision:1,items:entries});
assert.equal(data.life.length,2);assert.equal(clips.length,2);
const kept=entries.filter(v=>!['see_god','photo_quotes'].includes(v.section));
api.receiveManifest({schema:1,revision:2,items:kept});e('pmm-update-accept').events.click();
assert.equal(data.life.length,1);assert.equal(native.PMM_PHOTO_QUOTES_VIEW.urls.length,0);
assert.equal(data.towhid.length,2);assert.equal(clips.length,2);
console.log('PASS: all seven sections reuse native art, playback/catalog, photo wheel, reading panels; no duplication or lost originals');
