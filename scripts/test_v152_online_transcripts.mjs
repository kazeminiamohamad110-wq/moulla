import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import fs from 'node:fs';
import vm from 'node:vm';
const source=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,source),'utf8');
const actual=JSON.parse(read('owner-content/items/57642ffc-392e-46f9-bb90-d4a245f8aa31.json'));
const original={schema:1,revision:2,items:[actual]};
const testText='متن آزمایشی فقط برای آزمون\nنَصّ عربي\n<img src=x onerror=alert(1)>\n  پایان  ';
for(const file of ['worker.js','cloudflare-dashboard-single-file.js']){
 const {default:worker}=await import('../online-content/'+file);
 const memory=new Map([['manifest-v1',JSON.stringify(original)]]), origin='https://test.example';
 const env={PMM_ADMIN_PASSWORD:'test-password-only-12345',PMM_SESSION_SECRET:'test-secret-only-12345678901234567890',PMM_CONTENT:{async get(k,f){const v=memory.get(k);return f==='json'&&v?JSON.parse(v):v??null},async put(k,v){memory.set(k,v)}}};
 let cookie='';
 const send=(path,data,headers={})=>worker.fetch(new Request(origin+path,{method:data===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json',...headers},body:data===undefined?undefined:JSON.stringify(data)}),env);
 const save=(text,rev=2,id=actual.id,headers={})=>send('/api/admin/transcript',{id,expectedRevision:rev,text},headers);
 assert.equal((await save(testText)).status,401);
 let res=await send('/api/login',{password:env.PMM_ADMIN_PASSWORD});assert.equal(res.status,200);cookie=res.headers.get('set-cookie').split(';')[0];
 assert.equal((await save(testText,2,actual.id,{origin:'https://other.example'})).status,403);
 assert.equal((await save(testText,2,'wrong-id')).status,404);
 assert.equal((await save(' ')).status,400);
 assert.equal((await save('x'.repeat(128*1024+1))).status,400);
 assert.equal((await save('متن\0')).status,400);
 res=await save(testText);assert.equal(res.status,200);let m=(await res.json()).manifest;
 assert.equal(m.revision,3);assert.deepEqual(m.items,original.items);assert.equal(m.transcripts[actual.id].text,testText);assert.equal(m.transcripts[actual.id].revision,3);
 assert.equal((await save('ویرایش قدیمی',2)).status,409);
 res=await save(testText,3);assert.equal((await res.json()).manifest.revision,3);
 res=await save('ویرایش دوم',3);m=(await res.json()).manifest;assert.equal(m.revision,4);assert.equal(m.transcripts[actual.id].text,'ویرایش دوم');
 res=await send('/api/admin/publish',{section:'see_god',title:'جلسه آزمون',url:'https://www.aparat.com/v/test',transcript:'متن جدید'});assert.equal(res.status,200);m=(await res.json()).manifest;const next=m.items.at(-1);assert.equal(m.revision,5);assert.equal(m.transcripts[next.id].text,'متن جدید');assert.equal(m.transcripts[actual.id].text,'ویرایش دوم');
 res=await save(null,5);m=(await res.json()).manifest;assert.equal(m.revision,6);assert(!m.transcripts[actual.id]);assert.deepEqual(m.items[0],actual);
 res=await send('/api/admin/remove',{id:next.id});m=(await res.json()).manifest;assert.equal(m.revision,7);assert(!m.transcripts[next.id]);assert.deepEqual(m.items,[actual]);
 res=await send('/api/manifest');assert.deepEqual(await res.json(),m);
 const page=await (await send('/admin')).text();assert(page.includes('id="transcript-editor"'));assert(page.includes('id="transcript-file"'));assert(page.includes('id="edit-transcript-file"'));assert(page.includes('expectedRevision:editingRevision'));for(const match of page.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
 console.log('PASS '+file+': exact session 19 id, auth, origin, size, stale revision, no duplication, create/edit/remove transcript, manifest, admin UI syntax');
}
// Manifest client, real bundled item, simulated DOM: no catalog re-render for text-only update.
function node(){return {hidden:true,disabled:false,children:[],events:{},appendChild(x){this.children.push(x)},addEventListener(k,f){this.events[k]=f},setAttribute(){},focus(){}}}
const nodes={},el=id=>nodes[id]||(nodes[id]=node()),store=new Map();let renders=0;
const DATA={life:[{number:19,url:actual.url,pmmOwnerId:actual.id}],towhid:[],kafi:[]};
const window={PMM_UPDATE_ORIGIN:'https://pmm-content-updates.kazeminia-mohamad110.workers.dev',PMM_PHOTO_QUOTES_VIEW:{setOnlinePhotos(){}},PMM_WISDOM_UI:{setOnlineSentences(){}}};
const ctx={window,DATA,NAHJ_AUDIO_ITEMS:{sermons:[],letters:[],wisdoms:[]},NAHJ_AUDIO_PARTS:{},VIDEO_CLIPS:[],screen:'list',section:'life',contents:node(),document:{getElementById:el,createElement:node,activeElement:null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},render(){renders++},renderList(){},renderClips(){},goBack(){},URL,TextEncoder,console};
vm.runInNewContext(read('app/src/main/assets/pmm_online_updates.js'),ctx);const api=window.PMM_CONTENT_UPDATES;
api.receiveManifest(original);assert(!api.isVisible());const before=renders;
const changed={...original,revision:3,transcripts:{[actual.id]:{revision:3,text:testText}}};
api.receiveManifest(changed);assert(api.isVisible());assert.equal(api.getTranscript('see_god',actual.id,actual.url),null);el('pmm-update-accept').events.click();assert.equal(api.getTranscript('see_god',actual.id,actual.url),testText);assert.equal(api.getTranscript('see_god',null,actual.url),testText);assert.equal(api.getTranscript('kafi',actual.id,actual.url),null);assert.equal(api.getTranscript('see_god',actual.id,'https://www.aparat.com/v/different'),null);assert.equal(renders,before);assert.equal(DATA.life.length,1);
api.receiveManifest({...changed,revision:4,transcripts:{other:{revision:4,text:'invalid'}}});assert(!api.isVisible());assert.equal(api.getTranscript('see_god',actual.id,actual.url),testText);
api.receiveManifest({...changed,revision:4,transcripts:{}});assert(api.isVisible());el('pmm-update-accept').events.click();assert.equal(api.getTranscript('see_god',actual.id,actual.url),null);assert.equal(renders,before);
console.log('PASS app: session 19 accepted update, no wrong match, no duplicate, no list rebuild, removal, invalid map rejected');
