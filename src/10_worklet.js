/* ── AudioWorklet: the microphone stream in whole 512-sample frames, numbered so gaps are visible (from the lab, unchanged) ── */
var WORKLET=`
class Cap extends AudioWorkletProcessor{
  constructor(){ super(); this.buf=new Float32Array(512); this.n=0; this.seq=0; }
  process(inputs){
    const x=inputs[0]&&inputs[0][0];
    const len=x?x.length:128;
    for(let i=0;i<len;i++){ this.buf[this.n++]=x?x[i]:0;
      if(this.n===512){ const o=this.buf; this.port.postMessage({f:o,s:this.seq++},[o.buffer]);
        this.buf=new Float32Array(512); this.n=0; } }
    return true; }
}
registerProcessor('cap',Cap);
`;
