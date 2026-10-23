import {createShotRenderer} from './storyboard-renderer.js';
import {DEMOS} from './storyboard-demo.js';
import {layoutLine,drawGlyphs,FONT} from './lyric-layer.js';
import {beatEnvelope} from './visual-state.js';
import {applyCharEdits,selectLine,sampleLine,formatTime} from './timing.js';
import {groupWords,wordState} from './words.js';
const $=id=>document.getElementById(id),audio=$('visualAudio');
const draw=createShotRenderer($('scene'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let demo=DEMOS[0],beats=[],lines=[],offset=0,lineOffsets={},lastKey='',scene=null,ready=false,current=-2,units=[],spans=[];
const tabs=[];

// 歌词时间：整曲偏移 + 单句偏移，与校准页同一公式
const lyricTime=(t,i)=>t-(offset+(lineOffsets[lines[i]?.id]||0))/1000;
function ctxAt(t){return {style:'pencil',reduced:reduced.matches,pulse:reduced.matches?0:beatEnvelope(t,beats),lines,lt:i=>lyricTime(t,i)};}

function render(force=false){
  const t=audio.currentTime||demo.start,frame=Math.floor(t*12),tq=frame/12;
  const key=`${demo.id}:${frame}:${reduced.matches}`;
  // 场景每秒 12 张；字每帧按真实媒体时间写，镜头用同一张场景的机位
  if(force||key!==lastKey){scene=demo.scene(tq,ctxAt(tq));draw('pencil',scene,{frame,reduced:reduced.matches,lyricStrip:false});lastKey=key;}
  const glyphs=scene.lyrics.flatMap(({line,layout})=>layoutLine(lines[line],lyricTime(t,line),layout));
  drawGlyphs($('ink'),glyphs,scene.cam,{frame,reduced:reduced.matches});
  if($('aux').checked)aux(t);
  $('visualSeek').value=t;$('visualTime').textContent=formatTime(t);
}
// 辅助字幕（默认关）：沿用校准页的逐字层
function aux(t){
  const index=selectLine(lines,t,offset,lineOffsets);
  if(index!==current){current=index;$('visualLyrics').replaceChildren();spans=[];units=[];if(index>=0){units=groupWords(lines[index]);for(const u of units){const s=document.createElement('span');s.textContent=u.text;$('visualLyrics').append(s);spans.push(s);}}}
  if(index>=0){const line=lines[index],{time}=sampleLine(line,t,offset,lineOffsets[line.id]||0);spans.forEach((s,i)=>{const st=wordState(time,units[i],{reducedMotion:reduced.matches});s.style.opacity=st.opacity;s.style.transform=`translateY(${st.y*.6}px) scale(${st.scale})`;});}
}
function selectDemo(d,seekTo=d.start){
  demo=d;$('visualSeek').min=d.start;$('visualSeek').max=d.end;$('shotRange').textContent=` / 分镜 #${d.no} · ${formatTime(d.start)}–${formatTime(d.end)}`;$('demoNote').textContent=d.note;
  tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===d.id)));seek(seekTo);
}
function seek(time){audio.currentTime=time;current=-2;render(true);}
async function play(){try{if(audio.paused){if(audio.currentTime>=demo.end-.05||audio.currentTime<demo.start)seek(demo.start);await audio.play();}else audio.pause();$('visualError').textContent='';}catch(e){$('visualError').textContent=e.message;}}
// 样张边界：画面帧和 timeupdate 都检查，后台标签页也能按时停
function boundary(){if(!audio.paused&&audio.currentTime>=demo.end){audio.pause();audio.currentTime=demo.end-.001;}}
function frame(){if(ready){boundary();render();}requestAnimationFrame(frame);}
audio.addEventListener('timeupdate',()=>{if(ready)boundary();});
audio.addEventListener('play',()=>{$('visualPlay').textContent='暂停';});audio.addEventListener('pause',()=>{$('visualPlay').textContent='播放样张';render(true);});
audio.addEventListener('error',()=>{$('visualError').textContent='音轨加载失败，请从本地服务器打开。';});
$('visualPlay').onclick=play;$('replay').onclick=async()=>{seek(demo.start);if(audio.paused)await play();};
$('visualSeek').oninput=e=>seek(Number(e.target.value));
$('aux').onchange=e=>{$('visualLyrics').hidden=!e.target.checked;current=-2;render(true);};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('screen').requestFullscreen();}catch(e){$('visualError').textContent=e.message;}};
// 保存画面时把写进画面的字一起合进去
$('saveStill').onclick=e=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;const g=c.getContext('2d');g.drawImage($('scene'),0,0);g.drawImage($('ink'),0,0);e.currentTarget.download=`mvs-storyboard-${demo.no}-${audio.currentTime.toFixed(2)}.png`;e.currentTarget.href=c.toDataURL('image/png');};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();play();}else if(e.code==='ArrowLeft'){e.preventDefault();seek(Math.max(demo.start,audio.currentTime-2));}else if(e.code==='ArrowRight'){e.preventDefault();seek(Math.min(demo.end-.01,audio.currentTime+2));}});

try{
  const responses=await Promise.all([fetch('data/project.json'),fetch('song-analysis.json'),fetch('data/versions.json')]);
  if(responses.some(r=>!r.ok))throw Error('样张数据未加载');
  const [config,analysis,versions]=await Promise.all(responses.map(r=>r.json()));beats=analysis.beats;
  const version=versions.find(v=>v.id===config.selectedVersion);if(!version)throw Error('未找到定稿歌词版本');
  const response=await fetch(version.url);if(!response.ok)throw Error('定稿时间轴未加载');
  const lyrics=await response.json();let edits={};
  try{const stored=JSON.parse(localStorage.getItem(`mvs-calibration-v1:${config.selectedVersion}`)||'null');if(stored?.version===1){offset=Number.isFinite(stored.offset)?stored.offset:0;lineOffsets=stored.lineOffsets||{};edits=stored.charEdits||{};}}catch{}
  lines=applyCharEdits(lyrics.lines,edits);
  await document.fonts.load(`48px ${FONT}`).catch(()=>{});
  for(const d of DEMOS){const b=document.createElement('button');b.dataset.id=d.id;b.textContent=`#${d.no} ${d.title}`;b.onclick=()=>selectDemo(d);$('demoTabs').append(b);tabs.push(b);}
  ready=true;$('visualPlay').disabled=false;selectDemo(DEMOS[0]);frame();
}catch(e){$('visualError').textContent=e.message;console.error(e);}
