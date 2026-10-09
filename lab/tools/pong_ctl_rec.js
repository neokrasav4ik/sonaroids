/* SonaPong control in the game (src/16_pong_ctl.js) on a lab recording (sonararc_pong_*.wav): the sound through DSP2 again, the game's
   calibration holds and mix on it, compared with what the phone logged (cal:низ / cal:верх / cal:сдвиг and the mix in every play row).
   Run: node lab/tools/pong_ctl_rec.js запись.wav [...] */
const C=require('./common'), fs=require('fs'), Ctl=require('../../src/16_pong_ctl.js');
let src=fs.readFileSync(__dirname+'/eval_arc.js','utf8').replace("module.exports={analyse,report};","module.exports={analyse,report,replay};").replace(/if\(require\.main===module\)[\s\S]*$/,'');
const mod={exports:{}}; new Function('require','module','__dirname',src)(p=>require(p.startsWith('.')?__dirname+'/'+p.slice(2):p),mod,__dirname);
for(const f of process.argv.slice(2)){ const {meta,x}=C.loadWav(f); const rows=mod.exports.replay(meta,x), mk=meta.marks, N=512, FS=48000;
const ev=meta.log.filter(e=>typeof e[1]==='string'&&/^cal/.test(e[1])).map(e=>e[1]).join(' ');
const c=Ctl.create(); Ctl.start(c); let done=null, low=null;
const tw=mk.wave/FS, tc=mk.count/FS, tp=mk.play/FS; const byK=new Map(); const mixes=[];
for(const r of rows){ const counting=r.t>=tc&&r.t<tp; if(r.t<tw) continue; Ctl.frame(c,r,N,FS,meta.cal.s,counting&&c.mxCal===null);
  if(Ctl.holding(c)){ const h=Ctl.hold(c,r.t); if(h.caught==='low') low=c.lin.b; if(h.caught==='top') done=r.t; }
  if(r.t>=tp) byK.set(r.k,c.mix); }
const L=meta.log.filter(e=>typeof e[1]!=='string'&&e[4]!=null&&e[0]<14063), d=[]; for(const e of L){ const m=byK.get(e[0]); if(m!=null) d.push(m-e[4]); }
d.sort((p,q)=>p-q);
console.log(require("path").basename(f),'| телефон:',ev,'| здесь: низ',low&&low.toFixed(0),'верх',c.lin&&c.lin.t.toFixed(0),'сдвиг',c.mxCal!=null?c.mxCal.toFixed(0):'-','| смесь здесь − на телефоне: медиана',d.length?d[d.length>>1].toFixed(1):'-','мм, 90% в пределах',d.length?Math.max(-d[Math.floor(d.length*0.05)],d[Math.floor(d.length*0.95)]).toFixed(1):'-','мм');
}
