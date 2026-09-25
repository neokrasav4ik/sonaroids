/* Which phones play and how well the sonar works on them (v0.29). Reads the database, changes nothing.
   Run on the server:  cd /opt/sonaroids && sudo -u sonaroids DB=/var/lib/sonaroids/sonaroids.db node --no-warnings server/stats.js [days]
   One row per kind of phone (system / browser / model): games, players, median score, median share of time the palm was seen,
   median probe signal-to-noise, how often the band equalizer was on, how often the browser left noise suppression / echo cancelling on.
   Games from before v0.29 have no phone data; they are counted in the last row.
   Then the same kinds of phone by how getting ready went (every player, also those who never got to play):
   caught — the palm range was caught; nocatch — left the wave step without it; quiet / noprobe — the probe too weak or not heard;
   nomic — no microphone; lost — the probe went away mid-game; flips — the game suggested the other end of the phone. */
const path=require('node:path');
let DatabaseSync; try{ ({DatabaseSync}=require('node:sqlite')); }catch(e){ console.error('Node 22.13 or newer is needed (node:sqlite).'); process.exit(1); }
const DB=process.env.DB||path.join(__dirname,'sonaroids.db'), days=+(process.argv[2]||30);
let db; try{ db=new DatabaseSync(DB,{readOnly:true}); }catch(e){ db=new DatabaseSync(DB); }
const cols=db.prepare('PRAGMA table_info(games)').all().map(c=>c.name);
const rows=db.prepare(`SELECT player, score, ${cols.includes('dev')?'dev':'NULL AS dev'}, ${cols.includes('seen')?'seen':'NULL AS seen'} FROM games WHERE created>=?`)
  .all(Date.now()-days*86400000);

const kindOf=d=>d?[d.os||'?',d.br||'?',d.model||''].join(' / ').replace(/ \/ $/,''):'(unknown)';
const med=a=>{ a=a.filter(v=>v!==null&&v!==undefined&&isFinite(v)).sort((x,y)=>x-y); return a.length?a[Math.floor((a.length-1)/2)]:null; };
const share=(a,k)=>{ const v=a.filter(d=>typeof d[k]==='boolean'); return v.length?Math.round(100*v.filter(d=>d[k]).length/v.length)+'%':'–'; };
const groups=new Map();
for(const r of rows){ let d=null; try{ d=r.dev?JSON.parse(r.dev):null; }catch(e){}
  const key=d?kindOf(d):'(before v0.29, unknown)';
  if(!groups.has(key)) groups.set(key,{games:0,players:new Set(),score:[],seen:[],snr:[],devs:[]});
  const g=groups.get(key); g.games++; g.players.add(r.player); g.score.push(r.score); g.seen.push(r.seen); if(d){ g.snr.push(d.snr); g.devs.push(d); } }

const out=[['phone','games','players','score','palm seen','probe SNR','EQ on','NS on','EC on']];
[...groups.entries()].sort((a,b)=>(a[0].startsWith('(')-b[0].startsWith('('))||b[1].games-a[1].games).forEach(([k,g])=>{
  const s=med(g.seen), n=med(g.snr);
  out.push([k,g.games,g.players.size,med(g.score)??'–',s===null?'–':Math.round(s*100)+'%',n===null?'–':n.toFixed(0)+' dB',share(g.devs,'eq'),share(g.devs,'ns'),share(g.devs,'ec')]); });
const print=out=>{ const w=out[0].map((_,i)=>Math.max(...out.map(r=>String(r[i]).length)));
out.forEach((r,j)=>{ console.log(r.map((c,i)=>i?String(c).padStart(w[i]):String(c).padEnd(w[i])).join('  ')); if(!j) console.log(w.map(n=>'-'.repeat(n)).join('  ')); }); };
console.log(`games, last ${days} days: ${rows.length}\n`);
print(out);

/* getting ready */
const hasSetups=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='setups'").get();
const su=hasSetups?db.prepare('SELECT player, result, t, flips, dev FROM setups WHERE created>=?').all(Date.now()-days*86400000):[];
const RES=['caught','nocatch','quiet','noprobe','nomic','noaudio','error','lost'], sg=new Map();
for(const r of su){ let d=null; try{ d=r.dev?JSON.parse(r.dev):null; }catch(e){} const k=kindOf(d);
  if(!sg.has(k)) sg.set(k,{n:0,players:new Set(),res:{},tc:[],fl:0}); const g=sg.get(k); g.n++; g.players.add(r.player); g.res[r.result]=(g.res[r.result]||0)+1;
  if(r.result==='caught'&&r.t!==null) g.tc.push(r.t); if(r.flips>0) g.fl++; }
console.log(`\ngetting ready, last ${days} days: ${su.length} reports\n`);
if(su.length){ const o=[['phone','reports','players'].concat(RES,['catch time','flips'])];
  [...sg.entries()].sort((a,b)=>b[1].n-a[1].n).forEach(([k,g])=>{ const t=med(g.tc);
    o.push([k,g.n,g.players.size].concat(RES.map(x=>g.res[x]?Math.round(100*g.res[x]/g.n)+'%':'–'),[t===null?'–':t.toFixed(1)+' s',g.fl?Math.round(100*g.fl/g.n)+'%':'–'])); });
  print(o); }
