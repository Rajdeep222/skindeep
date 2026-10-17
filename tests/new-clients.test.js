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
 sample.json = async (p) => p.includes('"type":""') ? {ideas:[{type:'Sweet shops',area:'GT Road, Khanna',find:'Search Instagram for sweets khanna and Google Maps sweet shop near GT Road',signal:'Posts only festival banners, no reels',fit:'Same festive-gifting rhythm as RK Jewellers',opener:'Sat Sri Akal ji, tuhadi Instagram page vekhi. Free audit karna chahunde aan?'},{type:'Opticals',area:'Samrala',find:'Google Maps optical Samrala',signal:'No bio link',fit:'Local trust like Om Sons',opener:'Sat Sri Akal'}]} : p.includes('"ideas"') ? {ideas:[{angle:'Behind the colour story',hook:'Kaun sa rang?',why:'Colour posts get saved'},{angle:'Fit check',hook:'Size guide in 10 sec',why:'Answers a common DM'}]} : {what:'w',outcome:'o',steps:[{t:'step one',who:'Owner',mins:10}],how:['h'],need:['n'],check:['c'],avoid:['a'],post:null,mins:10};
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
  await p.click('.nav button[data-go="pipeline"]'); await p.waitForTimeout(500);
  let t = await p.evaluate(() => document.querySelector('#main').innerText);
  ok('page is called New clients', /New clients/.test(t) && !/Grow your clients/.test(t));
  ok('Find new clients is first and open', /Find new clients/.test(t) && /Suggest who to approach/.test(t));
  ok('no upsell ideas listed', !/Write the pitch/.test(t) && !/Meta ads \(Click-to-WhatsApp\)/.test(t));
  ok('messaged-this-week chip', /of 10 messaged this week/.test(t));
  await p.click('[data-act="findProspects"]'); await p.waitForTimeout(1200);
  t = await p.evaluate(() => document.querySelector('#main').innerText);
  ok('suggestions appear', /Sweet shops/.test(t) && /Find them:/.test(t) && /Why us:/.test(t));
  await p.screenshot({ path: __dirname + '/out/n6-find.png', fullPage: true });
  await p.click('[data-act="ideaUse"][data-n="0"]'); await p.waitForTimeout(500);
  ok('Add as prospect prefills the form', await p.evaluate(() => document.getElementById('pr-b').value.includes('Sweet shops') && document.getElementById('pr-a').value === 'GT Road, Khanna'));
  await p.fill('#pr-n', 'Sharma Sweets'); await p.click('form[data-form="prospect"] button[type="submit"]'); await p.waitForTimeout(500);
  ok('prospect added', await p.evaluate(() => __store.meta.pipeline && __store.meta.pipeline.items.some(x => x.name === 'Sharma Sweets')));
  await p.fill('#pb-t', 'Gill Opticals, @gillopticals\nBedi Tailors, GT Road\nSharma Sweets'); await p.click('form[data-form="prospectBulk"] button[type="submit"]'); await p.waitForTimeout(500);
  ok('bulk adds 2 new, skips the duplicate', await p.evaluate(() => { const it = __store.meta.pipeline.items; return it.length === 3 && it.some(x => x.name === 'Gill Opticals' && x.handle === '@gillopticals') && it.some(x => x.name === 'Bedi Tailors' && x.area === 'GT Road'); }));
  // moving to Messaged counts toward the weekly number
  const pid = await p.evaluate(() => __store.meta.pipeline.items[0].id);
  await p.evaluate(async id => { const el = document.getElementById('ps-' + id); el.value = 'contacted'; el.dispatchEvent(new Event('change', {bubbles:true})); }, pid); await p.waitForTimeout(500);
  ok('weekly count goes up', /1 of 10 messaged this week|1\s*of 10 messaged/.test((await p.evaluate(() => document.querySelector('#main').innerText)).replace(/\n/g, ' ')));
  await p.close();
  console.log('errors:', errs.length ? errs : 'none', '| fails:', fails); await b.close();
})();
