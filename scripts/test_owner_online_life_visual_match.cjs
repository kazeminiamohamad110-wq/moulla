#!/usr/bin/env node
/* Regression: newly published 'دیدن خدا در زندگی' must render through exactly
 * the same session row renderer (row_blank.webp + session-label) as 1..17. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/index.html'),'utf8');
const online=fs.readFileSync(path.join(root,'app/src/main/assets/pmm_online_updates.js'),'utf8');
assert.match(html,/const records=DATA\[section\]/);
assert.match(html,/class="session \$\{x\.url/);
assert.match(html,/src="\$\{IMG\['row_blank\.webp'\]\}"/);
assert.match(html,/class="session-label" lang="fa"/);
function element(){return {
 hidden:true,isConnected:false,value:'',textContent:'',children:[],listeners:{},
 appendChild(x){this.children.push(x)},addEventListener(type,cb){this.listeners[type]=cb},
 setAttribute(){},focus(){},remove(){},classList:{add(){},remove(){}},
};}
const scene=element(),notice=element(),accept=element(),later=element(),nodes={
 scene,'pmm-update-summary':notice,'pmm-update-accept':accept,'pmm-update-later':later,
};
const DATA={life:Array.from({length:17},(_,n)=>({number:n+1,title:'دیدن خدا در زندگی '+(n+1),url:'https://www.aparat.com/v/static'+(n+1)}))};
const original=JSON.stringify(DATA.life);
const contents=element();let normalRender=0;let nativeRows=[];
const events=[];
const context={
 window:{PMM_UPDATE_ORIGIN:'https://pmm-content-updates.kazeminia-mohamad110.workers.dev',PMM_NEW_UI:{showToast:()=>{}}},
 document:{getElementById:id=>nodes[id]??null,createElement:()=>element(),querySelector:()=>null,activeElement:null},
 localStorage:{getItem:()=>null,setItem:(k,v)=>events.push({k,v})},
 DATA,contents,VIDEO_CLIPS:[],
 screen:'list',section:'life',
 renderList:function(){normalRender++;nativeRows=DATA.life.map(x=>x.number)},
 renderClips:()=>{},render:function(){context.renderList()},
 goBack:()=>{},setState:()=>{},openEitaa:()=>{},
 console,URL,Number,Set,Object,Array,JSON,Math,Date,Error,
};
vm.runInNewContext(online,context,{filename:'pmm_online_updates.js',timeout:1000});
const update=context.window.PMM_CONTENT_UPDATES;
assert.equal(typeof update.receiveManifest,'function');
const mk=(id,title,url,revision)=>({id,section:'see_god',title,url,revision});
const item18=mk('12345678-1111-4111-a111-123456789abc','جلسه ۱۸','https://www.aparat.com/v/lesson18',1);
const item19=mk('12345678-2222-4222-a222-123456789abc','جلسه ۱۹','https://www.aparat.com/v/lesson19',2);
update.receiveManifest(JSON.stringify({schema:1,revision:1,items:[item18]}));
assert.equal(DATA.life.length,17,'Content must not change before user accepts');
assert.equal(typeof accept.listeners.click,'function');
accept.listeners.click();
assert.equal(DATA.life.length,18,'new lesson not appended to native catalog');
assert.equal(DATA.life.at(-1).number,18);
assert.equal(DATA.life.at(-1).pmmOnlineId,item18.id);
assert.equal(DATA.life.at(-1).url,item18.url);
assert.equal(nativeRows.at(-1),18,'Native list did not rerender with lesson 18');
assert.equal(contents.children.length,0,'Separate “مطالب تازه” panel still inserted');
assert.equal(JSON.stringify(DATA.life.slice(0,17)),original,'Original 17 sessions changed');
assert.equal(update.getOnlineCounts().see_god,1);
update.receiveManifest(JSON.stringify({schema:1,revision:2,items:[item18,item19]}));
accept.listeners.click();
assert.equal(DATA.life.length,19);
assert.equal(DATA.life.at(-1).number,19);
assert.deepEqual(Array.from(nativeRows.slice(-2)),[18,19]);
assert.equal(contents.children.length,0);
update.receiveManifest(JSON.stringify({schema:1,revision:2,items:[item18,item19]}));
assert.equal(DATA.life.length,19,'Repeated manifest duplicated online lessons');
assert.equal(update.getOnlineCounts().see_god,2);
assert.equal(events.at(-1).v,'2');
console.log('PASS: session 18 and 19 use the exact native golden session rows, with no separate fresh-content card.');
