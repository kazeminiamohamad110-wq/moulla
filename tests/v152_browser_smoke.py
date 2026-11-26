"""Local WebView-like browser tests, no external media or Android runtime."""
from pathlib import Path
import json, shutil, http.server, threading, functools
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]; assets=root/'app/src/main/assets'
server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(assets)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':393,'height':852},is_mobile=True,has_touch=True)
 page.route('https://**/*',lambda route:route.abort()); errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 page.goto('http://127.0.0.1:'+str(server.server_port)+'/index.html');page.wait_for_timeout(500)
 page.evaluate('window.PMM_V7.openLegacy("nahj")')
 def open_nahj(group,id):
  page.evaluate('(a)=>setState("list","nahj",{nahjGroup:a[0],nahjEntry:a[1]})',[group,id])
 def check_text(card,group,n,part):
  card.locator('button[aria-label="متن"]').click(force=True)
  body=card.locator('.pmm-transcript-scroll');expected=json.loads((assets/f'pmm-transcripts/{group}/{n}.js').read_text().strip()[len('window.PMM_NAHJ_TRANSCRIPT_ACCEPT('):-2])['parts'][part-1]
  page.wait_for_function('(args)=>document.querySelectorAll(".pmm-transcript-scroll")[args[0]].textContent===args[1]',arg=[part-1,expected],timeout=5000)
  assert body.text_content()==expected
  assert body.evaluate('(e)=>getComputedStyle(e).userSelect')=='none'
  assert body.evaluate('(e)=>e.scrollHeight>e.clientHeight')
  assert card.locator('.pmm-transcript-header button').is_visible()
  body.evaluate('(e)=>e.scrollTop=100');assert body.evaluate('(e)=>e.scrollTop')>0
  assert body.evaluate('(e)=>!e.dispatchEvent(new Event("copy",{bubbles:true,cancelable:true}))')
  card.locator('.pmm-transcript-header button').click(force=True);assert card.locator('.pmm-session-transcript').is_hidden()
 open_nahj('sermons','sermon-3');cards=page.locator('section.nahj-part-card');assert cards.count()==3;check_text(cards.nth(2),'sermons',3,3)
 card=cards.first;assert card.locator('.nahj-part-speed').is_hidden();card.locator('button[aria-label="تنظیم سرعت پخش"]').click(force=True);assert card.locator('.nahj-part-speed').is_visible();card.locator('[data-nahj-speed="1.5"]').click(force=True);assert card.locator('[data-nahj-speed="1.5"]').get_attribute('aria-pressed')=='true'
 open_nahj('sermons','sermon-13-14');card=page.locator('section.nahj-part-card').first;card.locator('button[aria-label="متن"]').click(force=True);page.wait_for_function('document.querySelector(".pmm-transcript-scroll").textContent.length>1000');assert '\n\n' in card.locator('.pmm-transcript-scroll').text_content();page.evaluate('goBack()');assert card.locator('.pmm-session-transcript').is_hidden()
 open_nahj('letters','letter-31');card=page.locator('section.nahj-part-card').first;card.locator('button[aria-label="متن"]').click(force=True);page.wait_for_function('document.querySelector(".pmm-transcript-scroll").textContent.includes("متفاوت")')
 open_nahj('sermons','sermon-97');card=page.locator('section.nahj-part-card').first;card.locator('button[aria-label="متن"]').click(force=True);page.wait_for_function('document.querySelector(".pmm-transcript-scroll").textContent.includes("در دسترس نیست")')
 page.evaluate('setState("player","kafi",DATA.kafi.find(x=>x.number===22))');assert page.locator('.kafi-audio-card button[aria-label="تنظیم سرعت پخش"]').count()==1;assert page.locator('.kafi-audio-card button[aria-label="متن"]').count()==1
 page.evaluate('setState("player","life",DATA.life[0])');assert page.locator('.pmm-session-tools button[aria-label="متن"]').count()==1;assert page.locator('.pmm-session-tools button[aria-label="تنظیم سرعت پخش"]').count()==0
 page.evaluate('openSavedLesson("towhid",1)');assert page.locator('#pmm-session-eitaa').count()==1;assert page.locator('.pmm-session-tools button[aria-label="متن"]').count()==1;assert page.locator('.pmm-session-tools button[aria-label="تنظیم سرعت پخش"]').count()==0
 assert not errors,errors
 print('PASS: real Chromium local HTTP UI: exact sermon part 3, joint sermon, mismatch/missing safe, audio gear, no video gear, close, local loading, scroll and selection/copy protection, Eitaa session.')
 b.close()
