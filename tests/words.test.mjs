import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {groupWords,wordState} from '../words.js';
const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root)));
const catalog=read('data/versions.json');

test('KRC 3 is the project default and every candidate is covered by the frozen archive',()=>{
  const config=read('data/project.json'), manifest=read(config.archiveManifest);
  assert.equal(config.selectedVersion,'kugou-135049983');
  assert.equal(config.displayMode,'words');
  assert.equal(createHash('sha256').update(readFileSync(new URL(config.archive,root))).digest('hex'),manifest.archiveSha256);
  for(const version of catalog)assert.ok(manifest.files.some(f=>f.path===version.url));
  for(const file of manifest.files)assert.equal(createHash('sha256').update(readFileSync(new URL(file.path,root))).digest('hex'),file.sha256,file.path);
});

test('curated words cover every character of all five versions and preserve exact source times',()=>{
  for(const version of catalog)for(const line of read(version.url).lines){
    const words=groupWords(line);
    assert.equal(words.map(w=>w.text).join(''),line.chars.map(c=>c.text).join(''));
    for(const word of words){
      const source=line.chars.slice(word.from,word.to);
      assert.equal(word.start,Math.min(...source.map(c=>c.start)));
      assert.equal(word.end,Math.max(...source.map(c=>c.end)));
      assert.ok(word.end>word.start);
    }
  }
});

test('every display unit remains exactly one source character across all versions',()=>{
  for(const version of catalog)for(const line of read(version.url).lines){
    const units=groupWords(line);
    assert.equal(units.length,line.chars.length);
    units.forEach((unit,index)=>{
      assert.equal([...unit.text].length,1);
      assert.equal(unit.text,line.chars[index].text);
      assert.equal(unit.from,index);
      assert.equal(unit.to,index+1);
      assert.equal(unit.start,line.chars[index].start);
      assert.equal(unit.end,line.chars[index].end);
    });
  }
});

test('a short syllable settles before its singing interval ends',()=>{
  const unit={start:3,end:3.12,disappearAt:4,emphasis:1,expressive:false};
  assert.equal(wordState(3.08,unit).opacity,1);
  assert.equal(wordState(3.08,unit).blur,0);
});

test('word expression holds for its actual duration, disappears on exit, and is deterministic after seeking',()=>{
  const word={start:3,end:5.4,disappearAt:6,emphasis:1,expressive:true};
  assert.equal(wordState(3.5,word).active,true);
  assert.equal(wordState(5.1,word).active,true);
  assert.ok(wordState(5.1,word).warmth>0);
  assert.equal(wordState(5.5,word).active,false);
  assert.equal(wordState(5.5,word).warmth,0);
  assert.equal(wordState(6,word).opacity,0);
  const reference=wordState(3.8,word);
  wordState(5.9,word);wordState(0,word);
  assert.deepEqual(wordState(3.8,word),reference);
  const reduced=wordState(3.8,word,{reducedMotion:true});
  assert.equal(reduced.y,0);assert.equal(reduced.scale,1);assert.equal(reduced.blur,0);
});
