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
  let p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.setContent(html.replace('<script>', mock(true, 'u1') + '\n<script>'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
  await p.click('.nav button[data-go="team"]'); await p.waitForTimeout(400);
  let t = await p.evaluate(() => document.querySelector('#main').innerText);
  ok('Team page lists 3 staff + add form', /Team/.test(t) && /Panda/.test(t) && /Add staff/.test(t) && /How a person gets in/.test(t));
  await p.screenshot({ path: __dirname + '/out/n4-team.png' });
  // add
  await p.fill('#m-name', 'Simran'); await p.selectOption('#m-role', 'editor'); await p.click('form[data-form="member"] button[type="submit"]'); await p.waitForTimeout(500);
  ok('added Simran as editor', await p.evaluate(() => Object.values(__store.team).some(m => m.name==='Simran' && m.role==='editor')));
  ok('input cleared', await p.evaluate(() => document.getElementById('m-name').value === ''));
  await p.fill('#m-name', 'simran'); await p.click('form[data-form="member"] button[type="submit"]'); await p.waitForTimeout(400);
  ok('duplicate name blocked', await p.evaluate(() => Object.values(__store.team).filter(m => m.name.toLowerCase()==='simran').length === 1));
  const sid = await p.evaluate(() => Object.entries(__store.team).find(([k,m]) => m.name==='Simran')[0]);
  // rename
  await p.fill(`#mn-${sid}`, 'Simran K'); await p.click(`form[data-id="${sid}"] button[type="submit"]`); await p.waitForTimeout(400);
  ok('renamed', await p.evaluate(id => __store.team[id].name === 'Simran K', sid));
  // role
  await p.selectOption(`#mr-${sid}`, 'partner'); await p.waitForTimeout(400);
  ok('role changed', await p.evaluate(id => __store.team[id].role === 'partner', sid));
  // assign a task to Panda is already so; remove Panda (has partner rules + tasks)
  const before = await p.evaluate(() => S.tasks.filter(t => t.status!=='done' && t.assignee==='panda').length);
  await p.click('button[data-act="delMember"][data-id="panda"]'); await p.waitForTimeout(200);
  await p.click('button[data-act="delMember"][data-id="panda"]'); await p.waitForTimeout(1200);
  ok('Panda removed', await p.evaluate(() => !__store.team.panda));
  ok('their open tasks unassigned (' + before + ')', await p.evaluate(() => Object.values(__store.tasks).filter(t => t.status!=='done' && t.assignee==='panda').length === 0));
  ok('partner rules naming Panda ended', await p.evaluate(() => !__store.clients.djyps.partner && !__store.clients.masterwheels.partner));
  ok('owner cannot be removed (no button)', await p.evaluate(() => !document.querySelector('button[data-act="delMember"][data-id="me"]')));
  await p.click('.nav button[data-go="tasks"]'); await p.waitForTimeout(400);
  ok('Tasks page keeps workload + Manage team link', /Team workload/.test(await p.evaluate(() => document.querySelector('#main').innerText)) && await p.evaluate(() => !!document.querySelector('[data-go="team"]')));
  await p.close();
  console.log('errors:', errs.length ? errs : 'none', '| fails:', fails); await b.close();
})();
