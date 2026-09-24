/* The echo processing (DSP2) moved over from the lab unchanged: src/11_dsp.js must match lab/src/02_dsp.js.
   If one of them changes on purpose, change the other too (and re-run the lab's checks on recordings). */
const fs=require('fs'), path=require('path');
const game=fs.readFileSync(path.join(__dirname,'..','src','11_dsp.js'),'utf8').replace("\nif(typeof module!=='undefined') module.exports=DSP2;\n",'').trim();
const lab=fs.readFileSync(path.join(__dirname,'..','lab','src','02_dsp.js'),'utf8').trim();
const ok=game===lab; console.log('DSP2 in the game is the same as in the lab:',ok); console.log(ok?'RESULT: ok':'RESULT: FAIL'); process.exitCode=ok?0:1;
