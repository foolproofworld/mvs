import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleLine,selectLine,jumpAt,glyphState,applyCharEdits} from '../timing.js';
const lines=JSON.parse(readFileSync(new URL('../data/lyrics.json',import.meta.url))).lines;
test('complete full-song data and individually addressable characters',()=>{
  assert.equal(lines.length,51);
  for(const line of lines){assert.equal(line.chars.map(c=>c.text).join(''),line.text);assert.ok(line.start<line.end);for(const [i,c] of line.chars.entries()){assert.ok(Number.isFinite(c.start)&&c.end>=c.start);if(i)assert.ok(c.start>line.chars[i-1].start);}}
});
test('production candidate uses no uniform sentence distribution and separates display from voice',()=>{
  const chars=lines.flatMap(l=>l.chars);
  assert.equal(chars.length,325);
  for(const c of chars){assert.notEqual(c.method,'estimated-line-distribution');assert.ok(c.appearAt<=c.start);assert.ok(c.disappearAt>=c.end);}
  assert.ok(new Set(chars.map(c=>(c.end-c.start).toFixed(2))).size>10);
});
test('a sustained vowel stays highlighted beyond the old fixed 200ms animation',()=>{
  const c={start:10,end:11.6,appearAt:9.9,disappearAt:12};
  assert.ok(glyphState(10.8,c,12).active);
  assert.equal(glyphState(10.8,c,12).lift,1);
  assert.ok(!glyphState(11.7,c,12).active);
  assert.equal(glyphState(11.7,c,12).lift,0);
});
test('independent display interval and vocal rests are respected',()=>{
  const c={start:10,end:10.3,appearAt:9.5,disappearAt:11.5};
  assert.ok(glyphState(9.7,c,12).opacity>0);
  assert.ok(!glyphState(9.7,c,12).active);
  assert.ok(!glyphState(10.8,c,12).active);
  assert.ok(glyphState(11.4,c,12).opacity>0);
  assert.equal(glyphState(11.6,c,12).opacity,0);
});
test('editing one glyph leaves other glyph timings and source immutable',()=>{
  const c=lines[0].chars[2],oldStart=c.start;
  const result=applyCharEdits(lines,{[`${lines[0].id}:2`]:{start:oldStart+.02,end:c.end+.03,verified:true}});
  assert.equal(result[0].chars[2].start,oldStart+.02);
  assert.equal(lines[0].chars[2].start,oldStart);
  assert.deepEqual(result[0].chars[1],lines[0].chars[1]);
  assert.deepEqual(result[1],lines[1]);
  assert.ok(result[0].chars[2].verified);
});
test('positive offset delays the same glyph without accumulating drift',()=>{
  const l=lines[0],t=l.chars[2].start+.001;
  assert.equal(sampleLine(l,t,0).charIndex,2);
  assert.equal(sampleLine(l,t+.5,500).charIndex,2);
  assert.equal(sampleLine(l,t+.7,500,200).charIndex,2);
});
test('random seeks and pause evaluation are stateless',()=>{
  for(const index of [50,0,25,10,50]){const l=lines[index];const time=l.chars[2].start+.001;assert.equal(selectLine(lines,time),index);assert.equal(sampleLine(l,time).charIndex,2);}
  assert.equal(selectLine(lines,0),-1);assert.equal(selectLine(lines,265),-1);assert.equal(jumpAt(0,1),0);assert.equal(jumpAt(2,1),0);
});
