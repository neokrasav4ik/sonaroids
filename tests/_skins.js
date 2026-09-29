const {chromium}=require('playwright');const path=require('path');const O='/tmp/claude-0/-home-claude/bbc0b708-945d-5ca4-977c-a6f0ad9bab2e/scratchpad/sk/';require('fs').mkdirSync(O,{recursive:true});
(async()=>{const b=await chromium.launch();for(const sk of (process.env.SKS||'vector,neon,note,lcd').split(','))for(const g of (process.env.GS||'hd,pixel').split(',')){
const p=await b.newPage({viewport:{width:844,height:390},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(`localStorage.setItem('sonaroids_seen','1');localStorage.setItem('sonaroids_lang','ru');localStorage.setItem('sonaroids_gfx','${g}');localStorage.setItem('sonaroids_skin','${sk}');`);
await p.goto('file://'+path.resolve('game/play/index.html'));await p.waitForTimeout(300);await p.evaluate(()=>__sonaroids.act.hub_rocks());await p.waitForTimeout(2500);
await p.screenshot({path:O+sk+'_'+g+'.png'});console.log(sk,g,errs.join(' | ')||'ok');await p.close();}await b.close();})();
