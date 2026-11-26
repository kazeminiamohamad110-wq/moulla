import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';if(!globalThis.crypto)globalThis.crypto=webcrypto;
for(const file of ['worker.js','cloudflare-dashboard-single-file.js']){
 const {default:app}=await import('../online-content/'+file);const memory=new Map(),meta=new Map();const env={PMM_ADMIN_PASSWORD:'VERY-LONG-TEST-PASSWORD-ONLY',PMM_SESSION_SECRET:'VERY-LONG-TEST-SESSION-SECRET-ONLY-12345',PMM_CONTENT:{async get(k,f){const v=memory.get(k);return f==='json'&&v?JSON.parse(v):v??null},async put(k,v,o){memory.set(k,v);if(o?.metadata)meta.set(k,o.metadata)},async getWithMetadata(k){return{value:memory.get(k),metadata:meta.get(k)}},async delete(k){memory.delete(k);meta.delete(k)}}};const origin='https://test.example';let cookie='';
 const send=(url,body,extra={})=>app.fetch(new Request(origin+url,{method:body===undefined?'GET':'POST',headers:{origin,cookie,'content-type':'application/json',...extra},body}),env);
 let res=await send('/api/login',JSON.stringify({password:env.PMM_ADMIN_PASSWORD}));assert.equal(res.status,200);cookie=res.headers.get('set-cookie').split(';')[0];
 res=await send('/api/admin/publish',JSON.stringify({section:'kafi',title:'جلسه ۵۵',url:'https://dl.kazeminia110.ir/Audio/kafi/kafi%2055.mp3'}));assert.equal(res.status,200);
 res=await send('/api/admin/publish',JSON.stringify({section:'kafi',title:'مقدمه کافی',url:'https://dl.kazeminia110.ir/Audio/kafi/kafi%20kotobe%20arbae.mp3'}));assert.equal(res.status,200);
 res=await send('/api/admin/publish',JSON.stringify({section:'towhid',title:'جلسه تازه',url:'https://www.aparat.com/v/test?unexpected=1'}));assert.equal(res.status,400);
 res=await send('/api/admin/publish',JSON.stringify({title:'x'.repeat(70000)}));assert.equal(res.status,400);
 res=await send('/api/admin/upload',new Uint8Array([137,80,78,71,13,10,26,10,1]),{'content-type':'image/png'});assert.equal(res.status,200);const photo=(await res.json()).url;
 for(let i=0;i<2;i++){res=await send('/api/admin/publish',JSON.stringify({section:'photo_quotes',title:'عکس آزمایشی '+i,url:photo}));assert.equal(res.status,200)}
 const rows=(await (await send('/api/manifest')).json()).items.filter(i=>i.section==='photo_quotes');res=await send('/api/admin/remove',JSON.stringify({id:rows[0].id}));assert.equal(res.status,200);assert.equal((await send(new URL(photo).pathname)).status,200);res=await send('/api/admin/remove',JSON.stringify({id:rows[1].id}));assert.equal(res.status,200);assert.equal((await send(new URL(photo).pathname)).status,404);
 console.log('PASS '+file+': capped JSON bodies, encoded Kafi links, URL restriction, shared image retained until last reference removed.');
}
