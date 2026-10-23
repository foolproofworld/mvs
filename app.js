import {sampleLine,selectLine,glyphState,applyCharEdits,formatTime} from './timing.js';
import {createCharEditor} from './editor.js';
import {groupWords,wordState} from './words.js';
const $=id=>document.getElementById(id);
const audio=$('audio');
const KEY='mvs-calibration-v1';
let activeVersion='auto',versions=[],previousOnline='kugou-135049983',loadSequence=0,project;
let displayMode='words',currentWords=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const storageKey=()=>activeVersion==='auto'?KEY:`${KEY}:${activeVersion}`;
let lines=[],baseLines=[],beats=[],data,shown=-1,focused=-1,spans=[],rows=[],offset=0,lineOffsets={},charEdits={},lastFrameIndex=-2,editor,loopSpec=null;
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored?.version===1&&Number.isFinite(stored.offset)){offset=stored.offset;lineOffsets=stored.lineOffsets||{};charEdits=stored.charEdits||{};}}catch{}
const showError=message=>$('error').textContent=message;
function save(){try{localStorage.setItem(storageKey(),JSON.stringify({version:1,offset,lineOffsets,charEdits}));$('saveStatus').textContent='已保存本版本校准';}catch{$('saveStatus').textContent='浏览器存储不可用，请导出校准';}}
function lineOffset(line){return lineOffsets[line.id]||0;}
function go(index){if(!lines.length)return;loopSpec=null;focused=Math.max(0,Math.min(lines.length-1,index));editor?.choose(focused,0);const l=lines[focused];audio.currentTime=Math.max(0,l.start+(offset+lineOffset(l))/1000-.65);$('lineOffset').disabled=false;$('lineOffset').value=lineOffset(l);render();}
function render(){
  if(!lines.length)return;
  const t=audio.currentTime;
  const index=selectLine(lines,t,offset,lineOffsets);
  if(index!==shown){
    shown=index;$('lyrics').replaceChildren();spans=[];$('lyrics').classList.toggle('word-mode',displayMode==='words');
    if(index>=0){
      const l=lines[index];
      currentWords=groupWords(l);
      const units=displayMode==='words'?currentWords:l.chars;
      for(const [i,unit] of units.entries()){const span=document.createElement('span');span.className=displayMode==='words'?'word':'char';span.textContent=unit.text;span.title='点击打开时间微调';span.onclick=()=>{$('calibrationTools').open=true;editor.choose(index,displayMode==='words'?unit.from:i);};$('lyrics').append(span);spans.push(span);}
      focused=index;$('lineOffset').value=lineOffset(l);$('lineOffset').disabled=false;
    }
  }
  if(index>=0){
    const l=lines[index],state=sampleLine(l,t,offset,lineOffset(l));
    if(displayMode==='words')spans.forEach((span,i)=>{
      const g=wordState(state.time,currentWords[i],{reducedMotion:reducedMotion.matches});
      span.className='word'+(g.active?' active':'');span.style.opacity=g.opacity;
      span.style.transform=`translateY(${g.y}px) scale(${g.scale})`;span.style.filter=`blur(${g.blur}px)`;
      span.style.color=`rgb(${Math.round(220+g.warmth*23)} ${Math.round(217+g.warmth*6)} ${Math.round(207-g.warmth*28)})`;
      span.style.textShadow=`0 0 ${g.glow}px rgba(219,186,123,${g.warmth*.25})`;
    });
    else spans.forEach((span,i)=>{const g=glyphState(state.time,l.chars[i],l.end);const picked=editor?.current(),strength=l.chars[i].emphasis??1;span.className='char'+(g.sung?' sung':'')+(g.active?' active':'')+(picked?.lineIndex===index&&picked.charIndex===i?' picked':'');span.style.transform=`translateY(${-12*g.lift*strength}px) scale(${1+.08*g.lift*strength})`;span.style.opacity=g.opacity;});
    const c=l.chars.findLast(c=>state.time>=c.start&&state.time<c.end);
    $('lineStatus').textContent=`${l.section} · 第 ${index+1} / ${lines.length} 句`;
    const word=currentWords.find(w=>state.time>=w.start&&state.time<w.end);
    $('charStatus').textContent=displayMode==='words'?(word?`「${word.text}」 · ${(word.end-word.start).toFixed(2)}s`:'换气 / 词间留白'):(c?`「${c.text}」 ${(c.end-c.start).toFixed(3)}s · ${c.verified?'已确认':activeVersion==='auto'?'逐字候选 · 待试听':'网络逐字时间'}`:'换气 / 字间留白');
  } else {
    $('lineStatus').textContent=t<lines[0].start?'前奏':t>lines.at(-1).end?'尾奏':'间奏 / 句间留白';$('charStatus').textContent='—';
  }
  if(lastFrameIndex!==index){rows.forEach((row,i)=>row.classList.toggle('selected',i===index));lastFrameIndex=index;}
  $('seek').value=t;$('time').textContent=formatTime(t);
  if($('showBeat').checked){let b=beats.findLast(v=>v<=t);$('beat').style.opacity=b===undefined?'0':String(Math.max(0,1-(t-b)/.18));}
}
function frame(){
  if(loopSpec&&!audio.paused){const l=lines[loopSpec.li],c=l.chars[loopSpec.ci],shift=(offset+lineOffset(l))/1000;if(audio.currentTime>=c.end+shift+.4){if($('loopChar').checked)audio.currentTime=Math.max(0,c.start+shift-.4);else {audio.pause();loopSpec=null;}}}
  render();requestAnimationFrame(frame);
}
$('play').onclick=async()=>{try{if(audio.paused)await audio.play();else audio.pause();showError('');}catch(e){showError(`播放失败：${e.message}`);}};
audio.addEventListener('play',()=>{$('play').textContent='暂停';});
audio.addEventListener('pause',()=>{$('play').textContent='播放';render();});
audio.addEventListener('ended',()=>{$('play').textContent='重播';render();});
audio.addEventListener('error',()=>showError('音轨加载失败，请确认通过本地服务打开页面。'));
$('seek').oninput=e=>{loopSpec=null;audio.currentTime=Number(e.target.value);render();};
$('rate').onchange=e=>{audio.playbackRate=Number(e.target.value);};
$('prev').onclick=()=>{const current=shown>=0?shown:lines.findLastIndex(l=>l.start+(offset+lineOffset(l))/1000<=audio.currentTime);go(shown>=0?current-1:current);};
$('next').onclick=()=>{const current=shown>=0?shown:lines.findLastIndex(l=>l.start+(offset+lineOffset(l))/1000<=audio.currentTime);go(current+1);};
$('replay').onclick=()=>{if(focused>=0)go(focused);else go(0);};
function setOffset(value){offset=Math.max(-10000,Math.min(10000,Number(value)||0));$('offset').value=offset;save();render();}
$('offset').value=offset;$('offset').oninput=e=>setOffset(e.target.value);
$('earlier').onclick=()=>setOffset(offset-50);$('later').onclick=()=>setOffset(offset+50);
$('lineOffset').oninput=e=>{if(focused<0)return;lineOffsets[lines[focused].id]=Math.max(-10000,Math.min(10000,Number(e.target.value)||0));save();render();};
$('reset').onclick=()=>{lineOffsets={};charEdits={};lines=applyCharEdits(baseLines,charEdits);shown=-2;setOffset(0);$('lineOffset').value=0;editor.refresh();render();};
$('showBeat').onchange=e=>{$('beat').hidden=!e.target.checked;render();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch(e){showError(e.message);}};
$('reviewLyrics').onclick=()=>{audio.pause();$('lyricDialog').showModal();};
$('closeReview').onclick=()=>$('lyricDialog').close();
$('export').onclick=()=>{
  const result={...data,status:'human-adjusted-draft',calibration:{versionId:activeVersion,globalOffsetMs:offset,lineOffsetsMs:lineOffsets,charEdits,exportedAt:new Date().toISOString()},lines:lines.map(l=>{const shift=(offset+lineOffset(l))/1000;return {...l,start:l.start+shift,end:l.end+shift,chars:l.chars.map(c=>({...c,start:c.start+shift,end:c.end+shift,appearAt:(c.appearAt??c.start-.12)+shift,disappearAt:(c.disappearAt??l.end+.35)+shift}))};})};
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`lyrics-${activeVersion}-calibrated.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();$('play').click();}else if(e.code==='ArrowLeft'){e.preventDefault();audio.currentTime=Math.max(0,audio.currentTime-3);}else if(e.code==='ArrowRight'){e.preventDefault();audio.currentTime=Math.min(audio.duration||270,audio.currentTime+3);}});
try{
  const responses=await Promise.all([fetch('data/lyrics.json'),fetch('song-analysis.json'),fetch('data/versions.json'),fetch('data/project.json')]);
  if(responses.some(r=>!r.ok))throw Error('时间轴文件尚未就绪');
  data=await responses[0].json();baseLines=data.lines;lines=applyCharEdits(baseLines,charEdits);beats=(await responses[1].json()).beats;
  versions=await responses[2].json();
  project=await responses[3].json();displayMode=project.displayMode;$('displayMode').value=displayMode;
  $('archiveDownload').href=project.archive;
  versions.forEach(v=>{const option=document.createElement('option');option.value=v.id;option.textContent=v.id===project.selectedVersion?'酷狗 KRC 3 · 已选定':v.name;$('versionSelect').append(option);});
  if(!lines?.length||lines.some(l=>!l.chars?.length))throw Error('歌词数据不完整');
  editor=createCharEditor({getLines:()=>lines,getTime:()=>audio.currentTime,getShift:l=>(offset+lineOffset(l))/1000,
    onChange:(li,ci,patch)=>{const key=`${lines[li].id}:${ci}`;if(patch===null)delete charEdits[key];else charEdits[key]={...charEdits[key],...patch};lines=applyCharEdits(baseLines,charEdits);shown=-2;save();render();},
    onListen:async(li,ci)=>{const l=lines[li],c=l.chars[ci];loopSpec={li,ci};audio.currentTime=Math.max(0,c.start+(offset+lineOffset(l))/1000-.4);try{await audio.play();showError('');}catch(e){showError(e.message);}}
  });editor.choose(0,0);
  rebuildLists();
  $('play').disabled=false;render();frame();
  const requested=new URLSearchParams(location.search).get('version');
  await loadVersion(versions.some(v=>v.id===requested)?requested:project.selectedVersion);
  if(new URLSearchParams(location.search).get('review')==='lyrics')$('lyricDialog').showModal();
}catch(e){$('lineStatus').textContent='加载失败';showError(e.message);}

function rebuildLists(){
  $('reviewSummary').textContent=`本版本 ${lines.length} 个分句、${lines.reduce((n,l)=>n+l.chars.length,0)} 字正文；网络版与本地版分句可能不同。此处只核对文字，时间仍需与本地音轨试听。`;
  $('reviewText').replaceChildren();$('lineList').replaceChildren();$('editLine').replaceChildren();
  for(const section of [...new Set(lines.map(l=>l.section))]){
    const block=document.createElement('section'),title=document.createElement('h3');title.textContent=section;block.append(title);
    for(const line of lines.filter(l=>l.section===section)){const p=document.createElement('p');p.textContent=line.text;block.append(p);}
    $('reviewText').append(block);
  }
  $('count').textContent=`${lines.length} 句`;
  rows=lines.map((line,index)=>{const row=document.createElement('button');row.className='line-row';row.title='定位到本句前 0.65 秒';const values=[String(index+1).padStart(2,'0'),formatTime(line.start),line.text,line.section,activeVersion==='auto'?'模型候选':'原始 KRC'];['number','stamp','text','section','method'].forEach((className,i)=>{const span=document.createElement('span');span.className=className;span.textContent=values[i];row.append(span);});row.onclick=()=>go(index);$('lineList').append(row);return row;});
}
async function loadVersion(id){
  const version=versions.find(v=>v.id===id);if(!version)return;
  const sequence=++loadSequence;
  $('versionSelect').disabled=true;$('swapVersion').disabled=true;
  try{
    const response=await fetch(version.url);if(!response.ok)throw Error('版本文件加载失败');
    const next=await response.json();if(sequence!==loadSequence)return;
    if(!next.lines?.length||next.lines.some(l=>!l.chars?.length))throw Error('版本缺少逐字时间');
    // Keep the same audio element, media time and playing state throughout A/B switching.
    activeVersion=id;if(id!=='auto')previousOnline=id;loopSpec=null;
    data=next;baseLines=data.lines;offset=0;lineOffsets={};charEdits={};
    try{const stored=JSON.parse(localStorage.getItem(storageKey())||'null');if(stored?.version===1){offset=Number.isFinite(stored.offset)?stored.offset:0;lineOffsets=stored.lineOffsets||{};charEdits=stored.charEdits||{};}}catch{}
    lines=applyCharEdits(baseLines,charEdits);shown=-2;lastFrameIndex=-2;
    $('offset').value=offset;$('versionSelect').value=id;$('versionDescription').textContent=id===project.selectedVersion?'你已试听选定 KRC 3 作为本项目时间轴。保留原始 49 句、325 字及每字唱入／唱止；其余版本和下载原文均已归档。':version.description;
    $('selectionStatus').textContent=id===project.selectedVersion?'KRC 3 已定稿 · 逐字演绎 03':'正在对照其他版本 · 定稿仍为 KRC 3';
    $('saveStatus').textContent='校准按版本独立保存';
    rebuildLists();focused=Math.max(0,selectLine(lines,audio.currentTime,offset,lineOffsets));editor.choose(focused,0);render();showError('');
  }catch(e){$('versionSelect').value=activeVersion;showError(e.message);}
  finally{if(sequence===loadSequence){$('versionSelect').disabled=false;$('swapVersion').disabled=false;}}
}
$('versionSelect').onchange=e=>loadVersion(e.target.value);
$('swapVersion').onclick=()=>loadVersion(activeVersion==='auto'?previousOnline:'auto');
$('displayMode').onchange=e=>{displayMode=e.target.value;shown=-2;render();};
for(const [id,time] of [['previewWords',44.45],['compareVerse',20.7],['compareChorus',53.5],['compareFinal',204.3]])$(id).onclick=async()=>{loopSpec=null;audio.currentTime=time;try{await audio.play();showError('');}catch(e){showError(e.message);}};
