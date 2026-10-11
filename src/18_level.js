/* ── PROBE LEVEL FIT (v1.60z): one rule for the game (src/20_sonar.js autoLevel) and the lab (lab/src/04_audio_engine.js autoLevel; the lab's
   build includes this file). Pure: given what was measured so far — [{g: our probe gain, snr: dB, peak: the microphone's loudest sample}] —
   says which gain to try next, or that the fit is done and which gain to keep.
   Before (both): the gain was only ever turned UP towards 48 dB signal-to-noise. On a phone at 100% media volume (the maintainer, 11 Oct,
   records 16:36 and 16:38, iPhone) the microphone heard the probe 10× louder than usual (peak 0.19–0.25 against 0.024) yet with LESS
   signal-to-noise (35 dB against 45): the speaker driven hard distorts, its own noise rises with it, the gain stayed at the top (0.3) and
   the echo's distance slid to the nearest — the rackets lay on the bottom, the palm had to climb higher and higher.
   Now: 1) the microphone overloaded (peak above 0.09) — turn down in proportion, towards 0.045; 2) quieter than the target — turn up as
   before, but not to a gain already tried that was no cleaner; 3) at the top and still well under target — try half once: if our own
   loudness is the dirt, half is cleaner, and it keeps halving while that helps; 4) the kept gain: the quietest of those that reach the
   target, else the cleanest tried (of two within 1 dB, the quieter). At most 6 measurements (~2.4 s, was up to 3). ── */
var LevelFit=(function(){
  var TARGET=48, G_MIN=0.015, G_MAX=0.3, PEAK_HI=0.09, PEAK_OK=0.045, MAXN=6;
  function tried(h,g){ for(var i=0;i<h.length;i++) if(Math.abs(Math.log(h[i].g/g))<0.08) return true; return false; }
  // the kept gain: of those that reach the target (−1 dB), the quietest; if none does, the cleanest (and of two within 1 dB, the quieter)
  function best(h){ var ok=h.filter(function(q){ return q.snr>=TARGET-1; }); if(ok.length) return ok.reduce(function(a,q){ return q.g<a.g?q:a; });
    var b=null; h.forEach(function(q){ if(!b||q.snr>b.snr+1||(Math.abs(q.snr-b.snr)<=1&&q.g<b.g)) b=q; }); return b; }
  function next(h){ var cur=h[h.length-1], b=best(h), atMax=b.g>=G_MAX*0.99&&b.snr<TARGET-6;
    if(h.length>=MAXN) return {g:b.g,done:true,why:'tries',atMax:atMax};
    // 1) overloaded microphone
    if(cur.peak>PEAK_HI&&cur.g>G_MIN*1.01){ var gl=Math.max(G_MIN,cur.g*Math.max(0.25,PEAK_OK/cur.peak)); if(!tried(h,gl)) return {g:gl,done:false,why:'loud'}; }
    // 2) quieter than the target: up, unless a higher gain was tried and was no cleaner; more than enough: down to the target (as before)
    var raw=cur.g*Math.pow(10,(TARGET-cur.snr)/20), want=Math.max(G_MIN,Math.min(G_MAX,raw)), higher=h.filter(function(q){ return q.g>cur.g*1.05; });
    var upOk=!higher.length;   // a higher gain already tried: the answer is among the tried ones
    if(want>cur.g*1.12&&upOk&&cur.peak<=PEAK_HI&&!tried(h,want)) return {g:want,done:false,why:'quiet'};
    if(want<cur.g/1.12&&cur.snr>=TARGET-1&&!tried(h,want)) return {g:want,done:false,why:'margin'};
    // 3) at the top (or coming down helped) and still well under target: try half
    var lower=h.filter(function(q){ return q.g<cur.g*0.95; }), helped=higher.length&&higher.every(function(q){ return q.snr<cur.snr-1; });
    if(cur.snr<TARGET-6&&!lower.length&&(cur.g>=G_MAX*0.9||helped)&&cur.g/2>=G_MIN&&!tried(h,cur.g/2)) return {g:cur.g/2,done:false,why:'down'};
    return {g:b.g,done:true,why:'fit',atMax:atMax}; }
  return {next:next,best:best,TARGET:TARGET,G_MIN:G_MIN,G_MAX:G_MAX,PEAK_HI:PEAK_HI};
})();
if(typeof module!=='undefined') module.exports=LevelFit;
