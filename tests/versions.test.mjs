import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root)));
const catalog=read('data/versions.json');
const normalize=text=>text.replaceAll('透澈','透彻');
const text=data=>normalize(data.lines.map(l=>l.chars.map(c=>c.text).join('')).join(''));
test('four downloaded KRC timing profiles preserve full source lyric text',()=>{
  assert.equal(catalog.filter(v=>v.provider==='kugou').length,4);
  const reference=text(read('data/lyrics.json'));
  for(const version of catalog.filter(v=>v.provider==='kugou')){
    const data=read(version.url);
    assert.equal(text(data),reference);
    assert.equal(data.lines.flatMap(l=>l.chars).length,325);
    assert.equal(data.source.lyricId,version.id.replace('kugou-',''));
    for(const line of data.lines)for(const c of line.chars){assert.equal(c.method,'krc-character');assert.ok(c.start<c.end);}
  }
});
test('downloaded version 3 is honestly a half-second shift of version 1',()=>{
  const a=read('data/versions/kugou-223522842.json').lines.flatMap(l=>l.chars);
  const b=read('data/versions/kugou-135049983.json').lines.flatMap(l=>l.chars);
  for(let i=0;i<a.length;i++){assert.ok(Math.abs(b[i].start-a[i].start-.5)<1e-6);assert.ok(Math.abs(b[i].end-a[i].end-.5)<1e-6);}
});
