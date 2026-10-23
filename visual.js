import {createVisualRenderer} from './visual-renderer.js';
import {SAMPLE,STYLES,sceneState} from './visual-state.js';
import {applyCharEdits,selectLine,sampleLine,formatTime} from './timing.js';
import {groupWords,wordState} from './words.js';
const $=id=>document.getElementById(id),audio=$('visualAudio');
const draw=createVisualRenderer($('scene'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let style='paper',beats=[],lines=[],offset=0,lineOffsets={},current=-2,units=[],spans=[],lastKey='',ready=false;
const cards=[];

function chooseStyle(id){style=id;$('screen').dataset.style=id;cards.forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.style===id)));render(true);}
function render(force=false){
  const t=audio.currentTime||SAMPLE.start,s=sceneState(t,beats,reduced.matches);
  const key=`${style}:${Math.floor(s.time*12)}:${reduced.matches}`;
  if(force||key!==lastKey){draw(style,t,beats,reduced.matches);lastKey=key;}
  const index=selectLine(lines,t,offset,lineOffsets);
  if(index!==current){
    current=index;$('visualLyrics').replaceChildren();spans=[];units=[];
    if(index>=0){units=groupWords(lines[index]);for(const unit of units){const span=document.createElement('span');span.textContent=unit.text;$('visualLyrics').append(span);spans.push(span);}}
  }
  if(index>=0){
    const line=lines[index],{time}=sampleLine(line,t,offset,lineOffsets[line.id]||0);
    spans.forEach((span,i)=>{const state=wordState(time,units[i],{reducedMotion:reduced.matches});span.style.opacity=state.opacity;span.style.transform=`translateY(${state.y*.6}px) scale(${state.scale})`;});
  }
  $('visualSeek').value=t;$('visualTime').textContent=formatTime(t);
}
function seek(time){audio.currentTime=time;current=-2;render(true);}
async function play(){try{if(audio.paused){if(audio.currentTime>=SAMPLE.end-.05)seek(SAMPLE.start);await audio.play();}else audio.pause();$('visualError').textContent='';}catch(e){$('visualError').textContent=e.message;}}
function frame(){if(ready){if(!audio.paused&&audio.currentTime>=SAMPLE.end){audio.pause();audio.currentTime=SAMPLE.end;}render();}requestAnimationFrame(frame);}
$('visualPlay').onclick=play;
audio.addEventListener('play',()=>{$('visualPlay').textContent='暂停';});audio.addEventListener('pause',()=>{$('visualPlay').textContent='播放样片';render();});
audio.addEventListener('error',()=>{$('visualError').textContent='音轨加载失败，请从本地服务器打开。';});
$('visualSeek').oninput=e=>seek(Number(e.target.value));
$('sampleReplay').onclick=async()=>{seek(SAMPLE.start);if(audio.paused)await play();};
$('opening').onclick=()=>{audio.pause();seek(SAMPLE.opening);$('playNote').textContent='同一开场 · 00:25.80 · 可切换三种画风进行比较';};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('screen').requestFullscreen();}catch(e){$('visualError').textContent=e.message;}};
$('saveStill').onclick=e=>{e.currentTarget.download=`mvs-${style}-${audio.currentTime.toFixed(2)}.png`;e.currentTarget.href=$('scene').toDataURL('image/png');};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();play();}else if(e.code==='ArrowLeft'){e.preventDefault();seek(Math.max(20.7,audio.currentTime-3));}else if(e.code==='ArrowRight'){e.preventDefault();seek(Math.min(SAMPLE.end,audio.currentTime+3));}});

try{
  const responses=await Promise.all([fetch('data/project.json'),fetch('song-analysis.json'),fetch('data/versions.json')]);
  if(responses.some(r=>!r.ok))throw Error('样片数据未加载');
  const [config,analysis,versions]=await Promise.all(responses.map(r=>r.json()));beats=analysis.beats;
  const version=versions.find(v=>v.id===config.selectedVersion);
  if(!version)throw Error('未找到定稿歌词版本');
  const response=await fetch(version.url);if(!response.ok)throw Error('定稿时间轴未加载');
  const lyrics=await response.json();let edits={};
  try{const stored=JSON.parse(localStorage.getItem(`mvs-calibration-v1:${config.selectedVersion}`)||'null');if(stored?.version===1){offset=Number.isFinite(stored.offset)?stored.offset:0;lineOffsets=stored.lineOffsets||{};edits=stored.charEdits||{};}}catch{}
  lines=applyCharEdits(lyrics.lines,edits);
  for(const item of STYLES){
    const card=document.createElement('button');card.className='style-card';card.dataset.style=item.id;card.setAttribute('aria-label',`切换${item.name}`);card.setAttribute('aria-pressed',String(item.id===style));
    const thumbnail=document.createElement('canvas');thumbnail.width=640;thumbnail.height=360;thumbnail.setAttribute('aria-hidden','true');createVisualRenderer(thumbnail)(item.id,SAMPLE.opening,beats,true);
    const body=document.createElement('div');body.className='card-body';const title=document.createElement('div');title.className='card-title';const name=document.createElement('span'),num=document.createElement('small');name.textContent=item.name;num.textContent=item.number;title.append(name,num);
    const reason=document.createElement('p');reason.textContent=item.reason;const palette=document.createElement('div');palette.className='swatches';for(const color of item.palette){const swatch=document.createElement('i');swatch.style.background=color;palette.append(swatch);}body.append(title,reason,palette);card.append(thumbnail,body);card.onclick=()=>chooseStyle(item.id);$('styleCards').append(card);cards.push(card);
  }
  ready=true;$('visualPlay').disabled=false;seek(SAMPLE.start);frame();
}catch(e){$('visualError').textContent=e.message;}
