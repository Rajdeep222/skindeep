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
 const sample = async (p, o) => { window.__lp = p; const items = [
   {client:'eroe',title:'Swatch grid: six tees in autumn colours with a hook',kind:'ai',mins:30,priority:'medium'},
   {client:'eroe',title:'Second AI visual: bold flat lay',kind:'ai',mins:30},
   {client:'eroe',title:'Fix wholesale page: add MOQ and price tiers',kind:'website',mins:45},
   {client:'rkjewellers',title:'Karwa Chauth reel: bangles and the moon, hook mehendi aa gayi',kind:'reel',mins:40,due:'2026-10-24'},
   {client:'omsons',title:'Groom carousel: fabric to fitting',kind:'carousel',mins:40}]; let t='';
   for (const it of items){ const d = JSON.stringify(it)+String.fromCharCode(10); t+=d; if (o && o.onText) o.onText({delta:d, text:t}); } return {text:t}; };
 sample.json = async (p) => p.includes('"ideas"') ? {ideas:[{angle:'Behind the colour story',hook:'Kaun sa rang?',why:'Colour posts get saved'},{angle:'Fit check',hook:'Size guide in 10 sec',why:'Answers a common DM'}]} : {what:'w',outcome:'o',steps:[{t:'step one',who:'Owner',mins:10}],how:['h'],need:['n'],check:['c'],avoid:['a'],post:null,mins:10};
 sample.limits = async()=>({tools:null,images:null});
 window.claude={use:async k=>{ if(k==='sample') return sample; if(k==='db') return db; if(k==='user') return {canEdit:async()=>${canEdit},id:async()=>'${uid}'}; throw new Error('na'); }};
 ${canEdit ? '' : "store['data']={users:{}}; const _doc=db.doc; db.doc=p=>p.startsWith('data/users/')?{get:async()=>({exists:true,data:()=>({member:'panda'})})}:_doc(p);"}
})();
<\/script>`;
(async () => {
  const b = await chromium.launch(); const errs = []; let fails = 0;
  const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) fails++; };
  let p = await b.newPage({ viewport: { width: 1366, height: 900 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.setContent(html.replace('<script>', mock(true, 'u1') + '\n<script>'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
  // 1 who does what
  await p.evaluate(() => go('client', 'eroe', 'settings')); await p.waitForTimeout(400);
  await p.selectOption('#ow-ai', 'editor'); await p.click('form[data-form="owners"] button[type="submit"]'); await p.waitForTimeout(500);
  ok('owners saved', await p.evaluate(() => __store.clients.eroe.owners && __store.clients.eroe.owners.ai === 'editor'));
  await p.evaluate(() => addTask({title:'Post AI visual', client:'eroe', kind:'ai'})); await p.waitForTimeout(500);
  ok('new task auto-assigned to Editor', await p.evaluate(() => S.tasks.some(t => t.title==='Post AI visual' && t.assignee==='editor')));
  ok('manual choice still wins', await p.evaluate(async () => { await addTask({title:'Manual pick', client:'eroe', kind:'ai', assignee:'panda'}); await new Promise(r=>setTimeout(r,400)); return S.tasks.find(t => t.title==='Manual pick').assignee === 'panda'; }));
  // 3 away
  await p.evaluate(() => go('team')); await p.waitForTimeout(400);
  await p.fill('#aw-n-editor', 'Wedding'); await p.click('form[data-form="away"][data-id="editor"] button[type="submit"]'); await p.waitForTimeout(500);
  ok('time off saved + away today', await p.evaluate(() => isAway('editor', today) && __store.team.editor.away.length === 1));
  ok('Away today badge shown', /Away today/.test(await p.evaluate(() => document.querySelector('#main').innerText)));
  ok('default owner skipped while away', await p.evaluate(() => defaultOwner('eroe','ai',today) === ''));
  await p.evaluate(() => addTask({title:'While away', client:'eroe', kind:'ai'})); await p.waitForTimeout(400);
  ok('task stays unassigned while away', await p.evaluate(() => S.tasks.find(t => t.title==='While away').assignee === ''));
  // away unassign
  await p.evaluate(async () => { const t = S.tasks.find(q => q.title==='Post AI visual'); await db.collection('tasks').doc(t.id).update({due: today}); }); await p.waitForTimeout(400);
  const unassignBtn = await p.$('button[data-act="awayUnassign"]'); ok('unassign button offered', !!unassignBtn);
  await unassignBtn.click(); await p.waitForTimeout(600);
  ok('their tasks in that window unassigned', await p.evaluate(() => S.tasks.filter(t => t.assignee==='editor' && t.status!=='done' && t.due===today).length === 0));
  await p.click('button[data-act="awayDel"][data-id="editor"]'); await p.waitForTimeout(400);
  ok('time off removed', await p.evaluate(() => !isAway('editor', today)));
  // 2 hours
  await p.fill('#mh-editor', '10'); await p.click('form[data-form="memberHours"][data-id="editor"] button[type="submit"]'); await p.waitForTimeout(400);
  ok('hours saved', await p.evaluate(() => __store.team.editor.hours === 10));
  await p.evaluate(async () => { for (let i = 0; i < 3; i++) await addTask({title:'Edit bulk ' + i, client:'omsons', kind:'reel', assignee:'editor', due:today, mins:240}); }); await p.waitForTimeout(700);
  const li = await p.evaluate(() => loadInfo(M('editor')));
  ok('load in hours and overbooked: ' + li.text, /of 10 h booked/.test(li.text) && li.heavy);
  await p.screenshot({ path: __dirname + '/out/n5-team.png', fullPage: true });
  // 4 doneBy + stats
  const tid = await p.evaluate(() => S.tasks.find(t => t.title==='Manual pick').id);
  await p.evaluate(() => go('tasks')); await p.waitForTimeout(300);
  await p.evaluate(async id => { const el = document.getElementById('st-' + id); el.value = 'done'; el.dispatchEvent(new Event('change', {bubbles:true})); }, tid); await p.waitForTimeout(600);
  ok('doneBy recorded', await p.evaluate(id => __store.tasks[id].doneBy === 'me', tid));
  await p.evaluate(() => go('team')); await p.waitForTimeout(300);
  ok('stats table counts it', await p.evaluate(() => teamStats(M('me')).week >= 1) && /Who finished what/.test(await p.evaluate(() => document.querySelector('#main').innerText)));
  // plan prompt
  await p.evaluate(() => planDay()); await p.waitForTimeout(1200);
  const lp = await p.evaluate(() => window.__lp || '');
  ok('plan prompt carries team hours', /Editor \(editor, 10 h a week, [\d.]+ h already booked this week\)/.test(lp));
  ok('plan prompt has whoDoesWhat', /whoDoesWhat/.test(lp) && /Post AI visual|AI visual: Editor/.test(lp));
  ok('plan prompt TEAM rule', /Never assign work to someone who is AWAY/.test(lp));
  // 5 remove clears defaults
  await p.evaluate(() => go('team')); await p.waitForTimeout(300);
  await p.click('button[data-act="delMember"][data-id="editor"]'); await p.waitForTimeout(200); await p.click('button[data-act="delMember"][data-id="editor"]'); await p.waitForTimeout(1200);
  ok('removing Editor clears who-does-what', await p.evaluate(() => !__store.clients.eroe.owners || !Object.values(__store.clients.eroe.owners).includes('editor')));
  await p.close();
  console.log('errors:', errs.length ? errs : 'none', '| fails:', fails); await b.close();
})();
