import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneState,beatEnvelope,STYLES,SAMPLE,noise} from '../visual-state.js';
test('visual motion uses measured beats without generating a BPM grid',()=>{
  const beats=[21.409,21.943,22.477];
  assert.equal(beatEnvelope(21,beats),0);
  assert.equal(beatEnvelope(21.943,beats),1);
  assert.ok(beatEnvelope(22,beats)>0);
  assert.equal(beatEnvelope(25,beats),0);
});
test('sample has a gradual release and lighting transition, with no accumulated seek state',()=>{
  assert.equal(STYLES.length,3);assert.ok(Math.abs(SAMPLE.end-SAMPLE.start-31.05)<1e-9);
  const before=sceneState(44.45),middle=sceneState(54),after=sceneState(65);
  assert.ok(before.release<middle.release&&middle.release<after.release);
  assert.ok(before.warm<middle.warm&&middle.warm<after.warm);
  assert.ok(before.rain>middle.rain&&middle.rain>after.rain);
  const reference=sceneState(54,[53.5,54]);sceneState(75);sceneState(21);
  assert.deepEqual(sceneState(54,[53.5,54]),reference);
  assert.equal(noise(31),noise(31));
});
test('reduced motion removes camera drift, wind jitter and beat pulses',()=>{
  const s=sceneState(54,[54],true);
  assert.equal(s.zoom,1);assert.equal(s.wind,0);assert.equal(s.pulse,0);assert.equal(s.cloud,0);assert.equal(s.frame,0);
});
