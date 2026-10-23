import {createShotRenderer} from './storyboard-renderer.js';
import {SHOTS,shotAt} from './storyboard-shots.js';
import {STYLES,beatEnvelope} from './visual-state.js';
import {applyCharEdits,selectLine,sampleLine,formatTime} from './timing.js';
import {groupWords,wordState} from './words.js';
const $=id=>document.getElementById(id),audio=$('visualAudio');
const draw=createShotRenderer($('scene'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let style='paper',shot=SHOTS[0],beats=[],lines=[],offset=0,lineOffsets={},current=-2,units=[],spans=[],lastKey='',ready=false;
const tabs={shot:[],style:[],thumbs:[]};

// 画面每秒更新 12 次（定格／线条抖动的节奏），歌词每帧按媒体时间求值
function frameData(s,t){const tq=Math.floor(t*12)/12;return s.scene(tq,{style,reduced:reduced.matches,pulse:reduced.matches?0:beatEnvelope(tq,beats)});}
function render(force=false){
  const t=audio.currentTime||shot.start,frame=Math.floor(t*12);
  const key=`${style}:${shot.id}:${frame}:${reduced.matches}`;
  if(force||key!==lastKey){draw(style,frameData(shot,t),{frame,reduced:reduced.matches});lastKey=key;}
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
function selectShot(s,{seekTo=s.start}={}){
  shot=s;$('visualSeek').min=s.start;$('visualSeek').max=s.end;$('shotRange').textContent=` / 镜头 ${s.n} · ${formatTime(s.start)}–${formatTime(s.end)}`;
  tabs.shot.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===s.id)));
  document.querySelectorAll('.shot-row').forEach(r=>r.classList.toggle('current',r.dataset.id===s.id));
  updateThumbs();if(seekTo!==null)seek(seekTo);else render(true);
}
function chooseStyle(id){style=id;$('screen').dataset.style=id;tabs.style.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===id)));updateThumbs();render(true);}
function updateThumbs(){tabs.thumbs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===shot.id&&b.dataset.style===style)));}
function seek(time){audio.currentTime=time;current=-2;render(true);}
async function play(){try{if(audio.paused){if(audio.currentTime>=shot.end-.05||audio.currentTime<shot.start)seek(shot.start);await audio.play();}else audio.pause();$('visualError').textContent='';}catch(e){$('visualError').textContent=e.message;}}
// 镜头边界：画面帧和音频 timeupdate 都会检查，后台标签页不画帧时也能按时停下或接下一镜
function boundary(){
  const t=audio.currentTime;
  if(audio.paused||t<shot.end)return;
  const next=SHOTS[SHOTS.indexOf(shot)+1];
  // 连播：相邻镜头在原曲里连着就不跳时间，否则跳到下一镜开头
  if($('chain').checked&&next)selectShot(next,{seekTo:Math.abs(next.start-shot.end)<.05?null:next.start});
  else{audio.pause();audio.currentTime=shot.end-.001;}
}
function frame(){if(ready){boundary();render();}requestAnimationFrame(frame);}
audio.addEventListener('timeupdate',()=>{if(ready)boundary();});
$('visualPlay').onclick=play;
audio.addEventListener('play',()=>{$('visualPlay').textContent='暂停';});audio.addEventListener('pause',()=>{$('visualPlay').textContent='播放本镜';render(true);});
audio.addEventListener('error',()=>{$('visualError').textContent='音轨加载失败，请从本地服务器打开。';});
$('visualSeek').oninput=e=>seek(Number(e.target.value));
$('replay').onclick=async()=>{seek(shot.start);if(audio.paused)await play();};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('screen').requestFullscreen();}catch(e){$('visualError').textContent=e.message;}};
$('saveStill').onclick=e=>{e.currentTarget.download=`mvs-shot${shot.n}-${style}-${audio.currentTime.toFixed(2)}.png`;e.currentTarget.href=$('scene').toDataURL('image/png');};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();play();}else if(e.code==='ArrowLeft'){e.preventDefault();seek(Math.max(shot.start,audio.currentTime-2));}else if(e.code==='ArrowRight'){e.preventDefault();seek(Math.min(shot.end-.01,audio.currentTime+2));}});

function buildBoard(){
  for(const s of SHOTS){
    const tab=document.createElement('button');tab.dataset.id=s.id;tab.textContent=`${s.n} ${s.title}`;tab.onclick=()=>selectShot(s);$('shotTabs').append(tab);tabs.shot.push(tab);
    const row=document.createElement('article');row.className='shot-row';row.dataset.id=s.id;
    const meta=document.createElement('div');meta.className='shot-meta';
    const h=document.createElement('h3');h.textContent=`${s.n}. ${s.title}`;const small=document.createElement('small');small.textContent=`${formatTime(s.start)}–${formatTime(s.end)} · 第 ${s.lines[0]}–${s.lines[1]} 句`;h.append(small);
    const lyric=document.createElement('p');lyric.className='lyric';lyric.textContent=lines.slice(s.lines[0]-1,s.lines[1]).map(l=>l.text).join(' / ');
    const dl=document.createElement('dl');
    for(const [label,value] of [['这句在说什么',s.say],['画面',s.picture],['景别、运镜',s.camera],['情绪、色调',s.mood],['卡在哪一拍',s.beat],['怎么接下一个',s.next]]){const pair=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;pair.append(dt,dd);dl.append(pair);}
    meta.append(h,lyric);
    const thumbs=document.createElement('div');thumbs.className='thumbs';
    for(const item of STYLES){
      const b=document.createElement('button');b.className='thumb';b.dataset.id=s.id;b.dataset.style=item.id;b.setAttribute('aria-label',`镜头 ${s.n} · ${item.name}`);
      const c=document.createElement('canvas');c.width=640;c.height=360;c.setAttribute('aria-hidden','true');
      const data=s.scene(s.key,{style:item.id,reduced:true,pulse:0});createShotRenderer(c)(item.id,data,{frame:0,reduced:true});
      const label=document.createElement('span');label.textContent=`${item.name} · ${formatTime(s.key)}`;b.append(c,label);
      b.onclick=()=>{chooseStyle(item.id);selectShot(s,{seekTo:s.key});$('screen').scrollIntoView({behavior:'smooth',block:'center'});};
      thumbs.append(b);tabs.thumbs.push(b);
    }
    row.append(meta,thumbs,dl);$('board').append(row);
  }
  for(const item of STYLES){const b=document.createElement('button');b.dataset.style=item.id;b.textContent=item.name;b.onclick=()=>chooseStyle(item.id);$('styleTabs').append(b);tabs.style.push(b);}
}

try{
  const responses=await Promise.all([fetch('data/project.json'),fetch('song-analysis.json'),fetch('data/versions.json')]);
  if(responses.some(r=>!r.ok))throw Error('分镜数据未加载');
  const [config,analysis,versions]=await Promise.all(responses.map(r=>r.json()));beats=analysis.beats;
  const version=versions.find(v=>v.id===config.selectedVersion);
  if(!version)throw Error('未找到定稿歌词版本');
  const response=await fetch(version.url);if(!response.ok)throw Error('定稿时间轴未加载');
  const lyrics=await response.json();let edits={};
  try{const stored=JSON.parse(localStorage.getItem(`mvs-calibration-v1:${config.selectedVersion}`)||'null');if(stored?.version===1){offset=Number.isFinite(stored.offset)?stored.offset:0;lineOffsets=stored.lineOffsets||{};edits=stored.charEdits||{};}}catch{}
  lines=applyCharEdits(lyrics.lines,edits);
  buildBoard();chooseStyle(style);
  ready=true;$('visualPlay').disabled=false;selectShot(SHOTS[0],{seekTo:SHOTS[0].key});frame();
}catch(e){$('visualError').textContent=e.message;console.error(e);}
