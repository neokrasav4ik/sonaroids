<script>
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
/* 27.09 (0.39q): проба стереомикрофона — оба канала входа, кадр 512 отсчётов каждого, без смешивания */
class Cap2 extends AudioWorkletProcessor{
  constructor(){ super(); this.a=new Float32Array(512); this.b=new Float32Array(512); this.n=0; this.seq=0; }
  process(inputs){ const i0=inputs[0]||[], x=i0[0], y=i0[1], len=x?x.length:128;
    for(let i=0;i<len;i++){ this.a[this.n]=x?x[i]:0; this.b[this.n]=y?y[i]:(x?x[i]:0); this.n++;
      if(this.n===512){ const A=this.a, B=this.b; this.port.postMessage({a:A,b:B,s:this.seq++,nch:i0.length},[A.buffer,B.buffer]); this.a=new Float32Array(512); this.b=new Float32Array(512); this.n=0; } }
    return true; }
}
registerProcessor('cap2',Cap2);
`;
