'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const records=new Map();let n=0;
for(const g of ['sermons','letters','wisdoms'])for(const f of fs.readdirSync(path.join(assets,'pmm-transcripts',g))){
 let data;vm.runInNewContext(fs.readFileSync(path.join(assets,'pmm-transcripts',g,f),'utf8'),{window:{PMM_NAHJ_TRANSCRIPT_ACCEPT(d){data=d}}});assert.equal(data.group,g);assert.equal(data.number,Number(f.slice(0,-3)));assert(data.parts.every(t=>typeof t==='string'&&t.trim()));records.set(g+'/'+data.number,data);n+=data.parts.length;
}
assert.equal(records.size,796);assert.equal(n,1016);
const w={};vm.runInNewContext(fs.readFileSync(path.join(assets,'nahj_audio_links.js'),'utf8'),{window:w});
let tracks=0,mapped=0;const exceptions=[];
for(const [group,entries] of Object.entries(w.PMM_NAHJ_AUDIO_DATA.items))for(const record of entries){const urls=w.PMM_NAHJ_AUDIO_DATA.parts[record.id];if(!urls.length)continue;tracks+=urls.length;const nums=record.id.split('-').slice(1).map(Number);const counts=nums.map(n=>records.get(group+'/'+n)?.parts.length||0);if(nums.length>1?urls.length===1&&counts.every(n=>n===1):counts[0]===urls.length)mapped+=urls.length;else exceptions.push({group,id:record.id,audioParts:urls.length,textParts:counts});}
assert.equal(tracks,1019);assert.equal(mapped,982);assert.equal(exceptions.length,6);console.log('PASS: 796 data files / 1016 text parts; 982 of 1019 audio positions map by catalog number/count; 37 intentionally withheld.');
const scripts=[],timers=new Map();let seq=0;const doc={currentScript:null,createElement(){return{remove(){this.removed=true}}},head:{append(t){scripts.push(t)}}};
const ctx=vm.createContext({document:doc,window:{},URL,screen:'home',section:'',render(){},goBack(){},setTimeout(fn){timers.set(++seq,fn);return seq},clearTimeout(k){timers.delete(k)}});
const src=fs.readFileSync(path.join(assets,'pmm_session_text_v152.js'),'utf8');assert(src.endsWith('})();\n'));
vm.runInContext(src.replace(/\}\)\(\);\s*$/,'window.testApi={load,display,reference,requests,cache,pending,mount};})();'),ctx);
const api=ctx.window.testApi;
function serve(tag){doc.currentScript=tag;vm.runInContext(fs.readFileSync(path.join(assets,tag.src),'utf8'),ctx);doc.currentScript=null;tag.onload()}
async function run(){
 const a=api.load('sermons',3),b=api.load('sermons',3);assert.equal(a,b);assert.equal(scripts.length,1);serve(scripts[0]);const rec=await a;assert.equal(rec.parts.length,3);assert.equal(timers.size,0);
 const row=w.PMM_NAHJ_AUDIO_DATA.items.sermons.find(x=>x.id==='sermon-3'),urls=w.PMM_NAHJ_AUDIO_DATA.parts[row.id];
 const ref=api.reference('sermons',row,urls,2,encodeURI(urls[2]));assert.equal(ref.part,3);assert.equal(api.reference('sermons',row,urls,2,urls[1]),null);
 const body={isConnected:true,scrollTop:15},panel={hidden:false};await api.display(ref,body,panel);assert.equal(body.textContent,rec.parts[2]);assert.equal(body.scrollTop,0);
 await api.display({...ref,total:4},body,panel);assert.match(body.textContent,/متفاوت/);
 assert.equal(await api.load('../',1),null);assert.equal(await api.load('letters',80),null);
 const miss=api.load('sermons',97);scripts.at(-1).onerror();assert.equal(await miss,null);
 const expired=api.load('letters',2);const old=scripts.at(-1);Array.from(timers.values())[0]();assert.equal(await expired,null);const fresh=api.load('letters',2);serve(old);assert.equal(api.pending.size,1);serve(scripts.at(-1));assert.equal((await fresh).number,2);
 const joint={group:'sermons',nums:[13,14],part:1,total:1};const j=api.display(joint,body,panel);const tags=scripts.slice(-2);tags.forEach(serve);await j;assert.equal(body.textContent,records.get('sermons/13').parts[0]+'\n\n'+records.get('sermons/14').parts[0]);
 const delayed=api.display({group:'letters',nums:[3],part:1,total:1},body,panel);api.requests.delete(body);panel.hidden=true;const before=body.textContent;serve(scripts.at(-1));await delayed;assert.equal(body.textContent,before);
 for(let i=4;i<=9;i++){const p=api.load('letters',i);serve(scripts.at(-1));await p}assert.equal(api.cache.size,4);
 console.log('PASS: loader concurrent/cache, exact part 3, joint text, mismatch, missing, timeout/late response, close-race, path validation.');
 const bridgeCode=fs.readFileSync(path.join(assets,'pmm_unified_background_audio_v124.js'),'utf8');const calls=[];const window={PMMNative:{pmmAudioStart:(...a)=>calls.push(a),kafiStatus:()=>'{"valid":true,"active":true}',kafiToggle(){},kafiSeek(){},kafiSpeed(){}}};vm.runInNewContext(bridgeCode,{window});const bridge=window.PMM_GLOBAL_AUDIO;
 for(const no of [54,55,999])assert(bridge.approved(`https://dl.kazeminia110.ir/Audio/kafi/kafi%20${no}.mp3`));assert(!bridge.approved('https://dl.kazeminia110.ir/Audio/kafi/kafi 1000.mp3'));assert(!bridge.approved('https://evil.test/Audio/kafi/kafi 55.mp3'));assert.equal(calls.length,0);assert(bridge.start('https://dl.kazeminia110.ir/Audio/kafi/kafi%2055.mp3','جلسه ۵۵',1.5,0));assert.equal(calls[0][0],'https://dl.kazeminia110.ir/Audio/kafi/kafi 55.mp3');
 assert.match(src,/if\(isAudio&&speed\)/);console.log('PASS: Kafi 55–999 approved, untrusted URLs rejected, gear only on audio card with speed controls (static guard).');
}
run().catch(err=>{console.error(err);process.exitCode=1});
