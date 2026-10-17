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
 const sample = async (p, o) => { const items = [
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
  await p.setContent(html.replace('<script>', mock(true, 'u1') + '\n<script>'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200);
  ok('themeFor: rk near Karwa Chauth', await p.evaluate(() => !!themeFor('rkjewellers', '2026-10-24') && themeFor('rkjewellers','2026-10-24').name.includes('Karwa')));
  ok('themeFor: eroe today is plain', await p.evaluate(() => themeFor('eroe', today) === null));
  ok('themeFor: far date is plain', await p.evaluate(() => themeFor('rkjewellers', '2026-12-05') === null));
  await p.evaluate(() => { go('today'); }); await p.waitForTimeout(300);
  await p.evaluate(() => planDay()); await p.waitForTimeout(1500);
  const plan = await p.evaluate(() => ui.dayPlan.map(i => ({c:i.client,t:i.title,k:i.kind,plain:!!i.plain,why:i.why})));
  console.log(JSON.stringify(plan));
  ok('plain eroe ai visual', plan.some(i => i.c==='eroe' && i.k==='ai' && i.t==='Post AI visual' && i.plain));
  ok('second eroe ai dropped (one per kind per day)', plan.filter(i => i.c==='eroe' && i.k==='ai').length === 1);
  ok('practical work keeps its title', plan.some(i => i.k==='website' && /MOQ/.test(i.t) && !i.plain));
  ok('themed rk reel keeps idea', plan.some(i => i.c==='rkjewellers' && /Karwa Chauth/.test(i.t) && !i.plain));
  ok('omsons carousel near Dussehra is themed and keeps idea', plan.some(i => i.c==='omsons' && /Groom carousel/.test(i.t)));
  ok('why shows monthly count', plan.find(i => i.plain).why.includes('posted this month'));
  await p.screenshot({ path: __dirname + '/out/n3-plan.png' });
  await p.click('[data-act="addAllSug"]'); await p.waitForTimeout(2500);
  const tasks = await p.evaluate(() => S.tasks.filter(t => t.createdAt > Date.now() - 20000).map(t => ({t:t.title,plain:!!t.plain,brief:!!t.brief,id:t.id,k:t.kind})));
  console.log(JSON.stringify(tasks));
  ok('plain task saved with flag, no brief written', tasks.some(t => t.t==='Post AI visual' && t.plain && !t.brief));
  ok('themed task got its brief automatically', tasks.some(t => /Karwa/.test(t.t) && t.brief));
  ok('plain tasks may repeat (dupOf lets them through)', await p.evaluate(() => dupOf('eroe','Post AI visual') === null));
  // open the plain task
  const pid = tasks.find(t => t.plain).id;
  await p.evaluate(() => go('client','eroe','overview')); await p.waitForTimeout(400);
  await p.click(`[data-tid="${pid}"] .tlink`); await p.waitForTimeout(600);
  ok('opening plain task does not auto-write steps', await p.evaluate(id => !S.tasks.find(t => t.id===id).brief && !ui.busy['brief:'+id], pid));
  const txt = await p.evaluate(() => document.querySelector('#main').innerText);
  ok('shows Write the steps + Get inspiration', /Write the steps/.test(txt) && /Get inspiration/.test(txt));
  await p.click(`[data-bf="${pid}"] [data-act="inspoGet"]`); await p.waitForTimeout(1500);
  ok('inspiration appears', /Behind the colour story/.test(await p.evaluate(() => document.querySelector('#main').innerText)));
  await p.screenshot({ path: __dirname + '/out/n3-inspo.png' });
  await p.click(`[data-bf="${pid}"] [data-act="inspoUse"]`); await p.waitForTimeout(600);
  ok('Use this idea sets the title', await p.evaluate(id => S.tasks.find(t => t.id===id).title.startsWith('Post AI visual: Behind the colour story'), pid));
  await p.click(`[data-bf="${pid}"] [data-act="briefAgain"]`); await p.waitForTimeout(1500);
  ok('Write the steps works on demand', await p.evaluate(id => !!S.tasks.find(t => t.id===id).brief, pid));
  await p.close();
  console.log('errors:', errs.length ? errs : 'none', '| fails:', fails); await b.close();
})();
