import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {layoutLine,slots,writeDuration} from '../lyric-layer.js';
import {DEMOS} from '../storyboard-demo.js';
const read=p=>JSON.parse(readFileSync(new URL(`../${p}`,import.meta.url),'utf8'));
const lines=read('data/versions/kugou-135049983.json').lines;
const ctx=t=>({style:'pencil',reduced:false,pulse:0,lines,lt:()=>t});

test('project records the user-selected pencil style and in-scene lyrics',()=>{
  const config=read('data/project.json');
  assert.equal(config.visualStyle,'pencil');assert.equal(config.visualStyleStatus,'user-selected');
  assert.equal(config.lyricPlacement,'in-scene-handwriting');assert.equal(config.storyboardStatus,'draft');
});

test('each character starts being written exactly at its KRC 3 start, never earlier',()=>{
  const line=lines[5],L={path:[[0,0],[600,0]],size:60};
  line.chars.forEach((c,i)=>{
    assert.equal(layoutLine(line,c.start-.001,L).some(g=>g.i===i),false);
    const g=layoutLine(line,c.start,L).find(g=>g.i===i);
    assert.equal(g.reveal,0);
    assert.equal(layoutLine(line,c.start+writeDuration(c),L).find(g=>g.i===i).reveal,1);
  });
  // 字的位置与时间无关：同一个字前后时刻落在同一处
  const at=slots(line,L),late=layoutLine(line,line.end,L);
  late.forEach(g=>{assert.equal(g.x,at[g.i].x);assert.equal(g.y,at[g.i].y);});
});

test('short syllables finish writing before their sung end; long notes keep the glyph on screen',()=>{
  for(const line of lines)for(const c of line.chars){
    assert.ok(writeDuration(c)<=Math.max(.08,c.end-c.start)+1e-9);
    assert.ok(writeDuration(c)<=.24);
  }
});

test('erasing sweeps right to left and leaves a faint trace; flowing words slide down and vanish',()=>{
  const line=lines[18],L={path:[[872,575],[1272,575]],size:72,erase:{from:1300,to:850,start:94.34,end:95.6,ghost:.14}};
  const mid=layoutLine(line,94.97,L);
  assert.ok(mid[mid.length-1].erase>mid[0].erase,'right end is erased first');
  const done=layoutLine(line,95.7,L);
  assert.ok(done.every(g=>g.erase===1&&g.ghost>0),'all erased with a trace left');
  const w=lines[6],F={path:[[300,-560],[1300,-560]],size:68,align:'center',exit:{type:'flow',at:48.97,dur:.75,stagger:.25}};
  const before=layoutLine(w,48.9,F),after=layoutLine(w,49.98,F);
  assert.equal(before.length,w.chars.length);
  assert.equal(after.length,0,'all washed away within about a second of the line ending');
});

test('demo shots follow the storyboard: deterministic frames and lyrics only from KRC 3 lines they cover',()=>{
  for(const d of DEMOS){
    const t=(d.start+d.end)/2,a=JSON.stringify(d.scene(t,ctx(t)));
    d.scene(d.end-.01,ctx(d.end-.01));d.scene(d.start,ctx(d.start));
    assert.equal(JSON.stringify(d.scene(t,ctx(t))),a);
    const used=d.scene(t,ctx(t)).lyrics.map(l=>l.line);
    assert.deepEqual(used,d.lines);
    for(const i of d.lines)assert.ok(lines[i].start>=d.start&&lines[i].start<d.end,`demo ${d.id} line ${i+1}`);
  }
});

test('in-scene lyrics stay legible: no glyph smaller than 4% of frame height on screen',()=>{
  for(const d of DEMOS)for(const i of d.lines){
    const line=lines[i],t=line.end-.01,{cam,lyrics}=d.scene(t,ctx(t));
    const L=lyrics.find(l=>l.line===i).layout;
    for(const g of layoutLine(line,t,L))assert.ok(g.size*cam.z>=36,`demo ${d.id} line ${i+1}: ${g.ch} ${(g.size*cam.z).toFixed(0)}px`);
  }
});
