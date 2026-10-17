const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs'), path = require('path'); const SP = process.env.FIXTURES || path.resolve(__dirname, 'fixtures');
const load = dir => { const o = {}; for (const f of fs.readdirSync(dir)) { const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); o[f.replace('.json','')] = d.data || d; } return o; };
const clients = load(SP + '/clients/'), tasks = load(SP + '/tasks/');
for (const k in clients) delete clients[k].id; for (const k in tasks) delete tasks[k].id;
clients.djyps.partner = {by:'panda', kinds:['reel']}; clients.masterwheels.partner = {by:'panda', kinds:['reel']};
const html = fs.readFileSync(path.resolve(__dirname, '..', 'reach-theory-desk.html'), 'utf8');
const mock = (canEdit, uid) => `<script>
(function(){
 const store = {clients:${JSON.stringify(clients)}, tasks:${JSON.stringify(tasks)}, team:{me:{name:'Rajdeep',role:'owner',createdAt:1},panda:{name:'Panda',role:'partner',createdAt:2,partnerWork:[{cid:'djyps',name:'DJ YPS',kinds:['reel']},{cid:'masterwheels',name:'Master Wheels Khanna',kinds:['reel']}]},editor:{name:'Editor',role:'editor',createdAt:3}}, insights:{}, prompts:{}, reports:{}, campaigns:{}, invoices:{}, meta:{}};
 window.__store = store; const subs=[]; const snap=n=>{const docs=Object.entries(store[n]||{}).map(([id,d])=>({id,exists:true,data:()=>d}));return {docs,size:docs.length,empty:!docs.length};};
 const fire=n=>subs.filter(s=>s.n===n).forEach(s=>setTimeout(()=>s.cb(snap(n)),0)); const dsubs={};
 const docRef=(n,id)=>({id,onSnapshot:cb=>{const k=n+'/'+id;(dsubs[k]=dsubs[k]||[]).push(cb);setTimeout(()=>cb({exists:!!(store[n]||{})[id],data:()=>(store[n]||{})[id]}),0);return ()=>{};},get:async()=>({exists:!!(store[n]||{})[id],data:()=>(store[n]||{})[id]}),set:async d=>{(store[n]=store[n]||{})[id]=d;fire(n);(dsubs[n+'/'+id]||[]).forEach(cb=>cb({exists:true,data:()=>d}));},update:async d=>{Object.assign((store[n]=store[n]||{})[id]=store[n][id]||{},d);fire(n);},delete:async()=>{delete store[n][id];fire(n);}});
 const db={collection:n=>({get:async()=>snap(n),onSnapshot:(cb)=>{subs.push({n,cb});setTimeout(()=>cb(snap(n)),0);return ()=>{};},add:async d=>{const id='x'+Math.random().toString(36).slice(2);(store[n]=store[n]||{})[id]=d;fire(n);return docRef(n,id);},doc:id=>docRef(n,id)}),doc:p=>{const s=p.split('/');return docRef(s.slice(0,-1).join('/'),s.at(-1));}};
 window.claude={use:async k=>{ if(k==='db') return db; if(k==='user') return {canEdit:async()=>${canEdit},id:async()=>'${uid}'}; throw new Error('na'); }};
 ${canEdit ? '' : "store['data']={users:{}}; const _doc=db.doc; db.doc=p=>p.startsWith('data/users/')?{get:async()=>({exists:true,data:()=>({member:'panda'})})}:_doc(p);"}
})();
<\/script>`;
(async () => {
  const b = await chromium.launch(); const errs = []; let fails = 0;
  const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) fails++; };
  // ---- owner
  let p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.setContent(html.replace('<script>', mock(true, 'u1') + '\n<script>'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900);
  const txt = () => p.evaluate(() => document.querySelector('#main').innerText);
  let t = await txt();
  ok('opens on Focus', /Focus/.test(t) && await p.evaluate(() => ui.view) === 'focus');
  ok('DJ YPS reel hidden from Focus tasks', !/crowd-moment reel/.test(t));
  ok('partner panel lists DJ YPS and Master Wheels', /Handled by your partner/.test(t) && /Reel posted today/.test(t));
  ok('open tasks exclude handled', await p.evaluate(() => openTasks().every(x => !(x.client==='djyps' && x.kind==='reel'))));
  await p.screenshot({ path: __dirname + '/out/n-focus.png' });
  // picker
  await p.click('button[data-act="focusPick"][data-cid="rkjewellers"]'); await p.waitForTimeout(300);
  t = await txt(); ok('focus on RK only: no Reach Theory task', !/Fix bio and add highlights/.test(t) && /Navratri/.test(t));
  ok('focus saved to meta/focus', await p.evaluate(() => __store.meta.focus && __store.meta.focus.clients.join() === 'rkjewellers' && __store.meta.focus.d === today));
  await p.click('button[data-act="focusAll"]'); await p.waitForTimeout(300);
  ok('All businesses restores', /Fix bio and add highlights/.test(await txt()));
  // posted today
  const before = await p.evaluate(() => S.tasks.filter(t => t.partnerPosted).length);
  await p.click('button[data-act="partnerPosted"][data-cid="djyps"]'); await p.waitForTimeout(400);
  ok('log creates a done reel task for DJ YPS', await p.evaluate(b0 => { const n = S.tasks.filter(t => t.partnerPosted && t.client==='djyps' && t.kind==='reel' && t.status==='done' && t.doneMonth===monthKey).length; return n === 1; }, before));
  ok('shows "1 reel this month"', /1 reel this month/.test(await txt()));
  ok('target count includes it', await p.evaluate(() => posted(C('djyps')) >= 1));
  // client page settings
  await p.evaluate(() => go('client', 'djyps', 'settings')); await p.waitForTimeout(300);
  t = await txt(); ok('settings shows handled-by section', /Handled by someone else/.test(t));
  await p.evaluate(() => go('client', 'djyps', 'overview')); await p.waitForTimeout(300);
  t = await txt(); ok('overview shows partner strip + hidden note', /Handled by Panda/.test(t) && /hidden from your lists/.test(t));
  // save the form: Eroe handled-by Panda for 'post' then verify sync + hiding
  await p.evaluate(() => go('client', 'eroe', 'settings')); await p.waitForTimeout(300);
  await p.selectOption('#pt-by', 'panda'); await p.check('input[name="pt-k"][value="ai"]'); await p.click('form[data-form="partner"] button[type="submit"]'); await p.waitForTimeout(700);
  ok('partner saved on client', await p.evaluate(() => __store.clients.eroe.partner && __store.clients.eroe.partner.by === 'panda' && __store.clients.eroe.partner.kinds.join() === 'ai'));
  ok('team/panda partnerWork synced (3 clients)', await p.evaluate(() => __store.team.panda.partnerWork.length === 3));
  ok('Eroe unassigned AI task hidden, the one assigned to me stays', await p.evaluate(() => !openTasks().some(t => t.title.startsWith('Plan Halloween')) && openTasks().some(t => t.title.startsWith('Post AI colour'))));
  // turn it off
  await p.selectOption('#pt-by', ''); await p.click('form[data-form="partner"] button[type="submit"]'); await p.waitForTimeout(700);
  ok('turning off shows tasks again + team synced', await p.evaluate(() => __store.team.panda.partnerWork.length === 2 && openTasks().some(t => t.client==='eroe')));
  ok('validItems drops handled kinds', await p.evaluate(() => validItems([{client:'djyps',title:'x reel',kind:'reel'},{client:'djyps',title:'y post',kind:'post'}], 'djyps').map(i=>i.kind).join() === 'post'));
  ok('Claude is told', await p.evaluate(() => activeNotes(C('djyps'))[0].includes('handled by Panda')));
  await p.close();
  // ---- Panda (editor view)
  p = await b.newPage({ viewport: { width: 1000, height: 800 } });
  p.on('pageerror', e => errs.push('panda: ' + e.message));
  await p.setContent(html.replace('<script>', mock(false, 'u2') + '\n<script>'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900);
  t = await p.evaluate(() => document.querySelector('#main').innerText);
  ok('Panda sees Mark a post as live', /Mark a post as live/.test(t) && /DJ YPS/.test(t) && /Reel posted today/.test(t));
  await p.screenshot({ path: __dirname + '/out/n-panda.png' });
  await p.click('button[data-act="partnerPosted"][data-cid="masterwheels"]'); await p.waitForTimeout(400);
  ok('Panda logs a reel for Master Wheels', await p.evaluate(() => S.tasks.some(t => t.client==='masterwheels' && t.partnerPosted && t.assignee==='panda' && t.status==='done')));
  await p.close();
  console.log('errors:', errs.length ? errs : 'none', '| fails:', fails); await b.close();
})();
