'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createTempoStream}=require('../offline-voice.js');

function transform(input,frequency,rate,packets){
  const stream=createTempoStream(frequency),parts=[];
  function drain(){
    let block;
    while((block=stream.read(rate,Math.round(frequency*.12))))parts.push(block.slice());
  }
  for(let offset=0,packet=0;offset<input.length;packet++){
    const count=packets[packet%packets.length];stream.append(input.subarray(offset,offset+count));offset+=count;drain();
  }
  stream.finish();drain();assert(stream.done);
  const result=new Float32Array(parts.reduce((sum,part)=>sum+part.length,0));
  let offset=0;
  for(const part of parts){result.set(part,offset);offset+=part.length;}
  return result;
}

test('speech tempo changes duration while preserving voiced fundamental frequency',()=>{
  for(const frequency of [16000,44100,48000]){
    for(const pitch of [103,211,367]){
      const input=Float32Array.from({length:frequency*2},(_,i)=>Math.sin(i*pitch*2*Math.PI/frequency));
      for(const rate of [.75,.95,1.05,1.25]){
        const output=transform(input,frequency,rate,[17,2137,1,40,4000]);
        assert.equal(output.length,Math.round(input.length/rate));
        // Count entire cycles away from the two sentence edges.
        const crossings=[];
        for(let i=Math.round(.08*frequency);i<output.length-.08*frequency;i++){
          if(output[i-1]<=0&&output[i]>0)crossings.push(i);
        }
        const observed=(crossings.length-1)*frequency/(crossings.at(-1)-crossings[0]);
        assert(Math.abs(observed-pitch)<pitch*.005,`${pitch} Hz became ${observed} Hz at ${rate}x`);
      }
    }
  }
});

// Compare loudness at corresponding points in the actual recording. Silence,
// syllables and phrases must remain aligned through the entire time change.
function envelopeCorrelation(input,output,frequency,rate){
  const step=Math.round(frequency*.04),window=2*step;
  function rms(samples,start,end){
    let power=0;
    for(let i=start;i<end;i++)power+=samples[i]*samples[i];
    return Math.sqrt(power/(end-start));
  }
  let n=0,x=0,y=0,xx=0,yy=0,xy=0;
  for(let i=0;i+window<=input.length;i+=step){
    const a=rms(input,i,i+window),b=rms(output,Math.round(i/rate),Math.round((i+window)/rate));
    n++;x+=a;y+=b;xx+=a*a;yy+=b*b;xy+=a*b;
  }
  return (n*xy-x*y)/Math.sqrt((n*xx-x*x)*(n*yy-y*y));
}

test('Mark Arabic speech retains the same waveform through arbitrary decoder packet splits at every setting',()=>{
  const wav=fs.readFileSync(path.join(__dirname,'../assets/reference-voice/samples/ar.wav'));
  const start=wav.indexOf('data')+8,frequency=wav.readUInt32LE(24);
  const input=Float32Array.from({length:(wav.length-start)/2},(_,i)=>wav.readInt16LE(start+i*2)/32768);
  for(const rate of [.75,.8,.85,.9,.95,1,1.05,1.1,1.15,1.2,1.25]){
    const output=transform(input,frequency,rate,[1,313,4029,9216,57]);
    assert.equal(output.length,Math.round(input.length/rate));
    if(rate===1)assert.deepEqual(output,input);
    else assert.deepEqual(output,transform(input,frequency,rate,[input.length]));
    assert(envelopeCorrelation(input,output,frequency,rate)>.97);
    assert.equal(output[0],input[0]);
    assert(Math.abs(output.at(-1)-input.at(-1))<1e-7,'the end of the utterance is retained');
  }
});
