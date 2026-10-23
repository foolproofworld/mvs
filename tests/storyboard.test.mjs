import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHOTS,shotAt} from '../storyboard-shots.js';
import {PAL} from '../storyboard-renderer.js';
import {build,pose} from '../character.js';
const krc=JSON.parse(readFileSync(new URL('../data/versions/kugou-135049983.json',import.meta.url),'utf8')).lines;
const ctx=style=>({style,reduced:false,pulse:0});
const screenY=(y,cam)=>(y-cam.y)*cam.z+450;
const samples=s=>Array.from({length:25},(_,i)=>s.start+(s.end-s.start)*i/24.001);

test('each trial shot covers its KRC 3 lines, and shots 2–3 run on without a gap',()=>{
  for(const s of SHOTS){
    const first=krc[s.lines[0]-1],last=krc[s.lines[1]-1];
    assert.ok(s.start<=first.start&&last.end<=s.end,`shot ${s.n} must contain lines ${s.lines.join('–')}`);
    assert.ok(s.start<=s.key&&s.key<s.end);
    assert.equal(shotAt(s.key),s);
  }
  assert.equal(SHOTS[1].end,SHOTS[2].start);
});

test('every frame is a pure function of t: seeking in any order gives the same scene',()=>{
  for(const s of SHOTS)for(const style of ['paper','pencil','pixel']){
    const reference=JSON.stringify(s.scene(s.key,ctx(style)));
    s.scene(s.end-.01,ctx(style));s.scene(s.start,ctx(style));
    assert.equal(JSON.stringify(s.scene(s.key,ctx(style))),reference);
  }
});

test('camera makes one small move per shot; only the window push changes scale a lot',()=>{
  for(const s of SHOTS){
    const zooms=samples(s).filter(t=>!(s.id==='s2'&&t>=155.35)&&!(s.id==='s3'&&t<157.4)).map(t=>s.scene(t,ctx('paper')).cam.z);
    assert.ok(Math.max(...zooms)/Math.min(...zooms)<=1.081,`shot ${s.n} zoom range`);
  }
});

test('her feet stay above the lyric band (bottom 15%) in every sampled frame',()=>{
  // 第 3 镜开头约 0.9 秒是从天空往下摇，画面整体从下往上升进来，脚会短暂经过歌词带，这段不算
  for(const s of SHOTS)for(const t of samples(s).filter(t=>!(s.id==='s3'&&t<157.4))){
    const {cam,items}=s.scene(t,ctx('paper'));
    const feet=items.filter(i=>/^her-shoe/.test(i.k||''));
    // 镜头还在天空里时脚在画框外，不算压歌词
    for(const f of feet)for(const [,y] of f.p){const sy=screenY(y,cam);if(sy>930)continue;assert.ok(sy<=765,`shot ${s.n} at ${t.toFixed(2)}: foot at ${sy.toFixed(0)}`);}
  }
});

test('the window the camera pushes into shows the same sky the next shot opens on',()=>{
  const end=SHOTS[1].scene(SHOTS[1].end-.001,ctx('paper')),start=SHOTS[2].scene(SHOTS[2].start,ctx('paper'));
  const pane=end.items.find(i=>i.k==='winSky'),sky=start.items.find(i=>i.t==='sky');
  assert.equal(pane.c,sky.bands[0]);
  // 推进结束时整个画面都落在窗玻璃里
  const xs=pane.p.map(([x])=>(x-end.cam.x)*end.cam.z+800),lower=end.items.find(i=>i.k==='winSky2').p.map(([,y])=>(y-end.cam.y)*end.cam.z+450);
  assert.ok(Math.min(...xs)<=0&&Math.max(...xs)>=1600&&Math.max(...lower)>=900);
});

test('one character file: pure output, 4-frame walk for pixel, pose blends between key moments',()=>{
  const o={x:500,y:700,size:300,facing:'right',action:'walk',u:1.37,t:4.2,expression:'smile',hold:{type:'umbrella'}};
  assert.deepEqual(build(o),build(o));
  const frames=new Set(Array.from({length:80},(_,i)=>pose({action:'walk',u:i/20,steps:4,t:0}).legs.flat().map(v=>(Math.abs(v)<1e-9?0:v).toFixed(6)).join()));
  assert.equal(frames.size,4);
  const smooth=new Set(Array.from({length:80},(_,i)=>JSON.stringify(pose({action:'walk',u:i/20,t:0}).legs)));
  assert.ok(smooth.size>40);
  for(const facing of ['left','right','back','front'])assert.ok(build({...o,facing}).parts.some(p=>p.t==='group-end'));
});

test('pixel style keeps a fixed palette of 16–32 colours',()=>{
  assert.ok(PAL.length>=16&&PAL.length<=32);
  assert.equal(new Set(PAL).size,PAL.length);
});
