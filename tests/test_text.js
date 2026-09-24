/* Strings: both languages have the same keys, every character exists in the pixel font,
   and every single-line label (buttons) fits a button column on the smallest landscape phone (568×320 → ~380 game pixels wide). */
const fs=require('fs'), path=require('path'), PF=require('../game/font.js');
const STR=new Function(fs.readFileSync(path.join(__dirname,'..','src','30_lang_en.js'),'utf8')+fs.readFileSync(path.join(__dirname,'..','src','31_lang_ru.js'),'utf8')+'\nreturn STR;')();
const keys=l=>Object.keys(STR[l]).sort().join(','), sameKeys=keys('en')===keys('ru'), miss=new Set(), wide=[];
const BUTTONS=['play','howto','lang','sfx_on','sfx_off','next','allow','start','again','menu','logs','retry','resume','quit','exit'];
for(const l of ['en','ru']){ for(const k in STR[l]) for(const c of STR[l][k]) if(!PF.has(c)) miss.add(c);
  BUTTONS.forEach(k=>{ const w=PF.width(STR[l][k]); if(w>150) wide.push(l+'.'+k+' '+w+'px'); }); }
console.log(`same keys in EN and RU: ${sameKeys} | characters missing from the font: ${[...miss].join('')||'none'} | button labels wider than 150 px: ${wide.join(', ')||'none'}`);
const ok=sameKeys&&!miss.size&&!wide.length; console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
