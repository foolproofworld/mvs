// 歌词写进画面：每个字在 KRC 3 的唱入时刻开始“写出来”，按镜头给的路径落在场景里（纸页、路面、雨窗……）。
// layoutLine 只算每个字的状态（纯函数，可随机跳转）；drawGlyphs 用石墨质感画到叠在场景上的透明画布。
// 场景每秒画 12 张，字按每帧的媒体时间求值，唱入时刻不被 12 张/秒量化。
import {noise} from './visual-state.js';
export const FONT='"KaiTi","STKaiti","Kaiti SC","楷体",serif';
const clamp=v=>Math.max(0,Math.min(1,v));
export const INKS={graphite:['#26343a',.88],paper:['#f0ebdf',.92],night:['#1d2a35',.8],gold:['#d89a55',.95]};

// 沿折线按弧长取点；每个点可带第三个值作为该处的字号倍率（透视远小近大）
function along(path,d){
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(d<=l||i===path.length-1){const u=l?Math.min(1,d/l):0;return {x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,s:(a[2]??1)+((b[2]??1)-(a[2]??1))*u,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}
    d-=l;
  }
  const p=path[path.length-1];return {x:p[0],y:p[1],s:p[2]??1,angle:0};
}
const length=path=>path.slice(1).reduce((sum,b,i)=>sum+Math.hypot(b[0]-path[i][0],b[1]-path[i][1]),0);

// 写出一个字要多久：短音更快，最长 0.24 秒
export const writeDuration=c=>Math.max(.08,Math.min(.24,(c.end-c.start)*.7));

// L：{path, size, spacing, align:'start'|'center', ink, squash, follow(沿路径转角), exit:{type,at,dur}, erase:{from,to,start,end,ghost}}
// 每个字在路径上的落点（与时间无关），镜头里的笔尖也按这个位置去写
export function slots(line,L){
  const size=L.size,spacing=L.spacing??1.08,total=length(L.path),advances=[];let d=0;
  for(const _ of line.chars){advances.push(d);d+=size*along(L.path,d).s*spacing;}
  const shift=L.align==='center'?Math.max(0,(total-d)/2):0;
  return advances.map(a=>{const p=along(L.path,a+shift+size*along(L.path,a+shift).s*spacing/2);return {x:p.x,y:p.y,size:size*p.s,angle:p.angle};});
}

export function layoutLine(line,lt,L){
  const at=slots(line,L);
  return line.chars.map((c,i)=>{
    if(lt<c.start)return null;
    const p=at[i];
    const g={ch:c.text,i,x:p.x,y:p.y,size:p.size,rot:L.follow?p.angle:(L.rot||0),sx:1,sy:L.squash||1,reveal:clamp((lt-c.start)/writeDuration(c)),alpha:1,erase:0,ghost:0,ink:L.ink||'graphite'};
    const ex=L.exit;
    if(ex?.type==='fade')g.alpha*=1-clamp((lt-ex.at)/(ex.dur||.8));
    if(ex?.type==='flow'){
      // 唱的时候字已经在玻璃上慢慢往下渗；整句唱完后一个个被雨水拖下去
      g.y+=Math.max(0,lt-c.start)*5+Math.sin(lt*1.7+i)*1.5;
      const k=clamp((lt-ex.at-noise(i+7)*(ex.stagger??.5))/(ex.dur||1.2));
      g.y+=280*k*k;g.sy*=1+.8*k;g.alpha*=1-k*k;
    }
    if(L.erase){
      // 橡皮从右往左擦：擦过的部分只剩很浅的痕
      const e=L.erase,x=e.from+(e.to-e.from)*clamp((lt-e.start)/(e.end-e.start));
      g.erase=lt<e.start?0:clamp((p.x+g.size/2-x)/g.size);g.ghost=e.ghost??.14;
    }
    return g.alpha>.01?g:null;
  }).filter(Boolean);
}

// 每个字先画进一块小画布：石墨两遍（主笔 + 偏一点的轻笔），再用纸纹挖出颗粒；按字、字号、墨色缓存
const cache=new Map();
function glyphCanvas(ch,px,ink){
  const key=`${ch}|${px}|${ink}`;if(cache.has(key))return cache.get(key);
  const pad=Math.ceil(px*.25),c=document.createElement('canvas');c.width=c.height=px+pad*2;
  const g=c.getContext('2d'),[color,alpha]=INKS[ink]||[ink,.9];
  g.font=`${px}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;
  g.globalAlpha=alpha;g.fillText(ch,c.width/2,c.height/2);
  g.globalAlpha=alpha*.3;g.fillText(ch,c.width/2+px*.012,c.height/2+px*.01);
  g.globalAlpha=1;g.globalCompositeOperation='destination-out';
  const seed=ch.charCodeAt(0);
  for(let i=0;i<px*px*.05;i++){const x=noise(seed+i*1.37)*c.width,y=noise(seed+i*2.11+5)*c.height;g.fillStyle=`rgba(0,0,0,${.25+noise(i+seed)*.5})`;g.fillRect(x,y,1+noise(i)*1.2,1);}
  if(cache.size>600)cache.clear();
  cache.set(key,c);return c;
}

// cam 与场景同一台镜头（1600×900 逻辑坐标）；canvas 是透明叠层
export function drawGlyphs(canvas,glyphs,cam,{frame=0,reduced=false}={}){
  const g=canvas.getContext('2d'),k=canvas.width/1600;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);
  for(const gl of glyphs){
    const sx=((gl.x-cam.x)*cam.z+800)*k,sy=((gl.y-cam.y)*cam.z+450)*k,px=Math.max(8,Math.round(gl.size*cam.z*k/2)*2);
    const img=glyphCanvas(gl.ch,px,gl.ink),h=img.width/2,jit=reduced?0:(noise(gl.i*13+frame)-.5)*1.2*k;
    g.save();g.translate(sx+jit,sy-jit);g.rotate(gl.rot);g.scale(gl.sx,gl.sy);g.globalAlpha=gl.alpha;
    // 写出来：从左上往右下扫开（汉字大体的笔顺方向）
    if(gl.reveal<1){const c=-px+gl.reveal*2*px;g.beginPath();g.moveTo(-2*px,-2*px);g.lineTo(c+2*px,-2*px);g.lineTo(-2*px,c+2*px);g.closePath();g.clip();}
    if(gl.erase>0){
      g.globalAlpha=gl.alpha*gl.ghost;g.drawImage(img,-h,-h);
      if(gl.erase<1){g.globalAlpha=gl.alpha;g.beginPath();g.rect(-h,-h,h+px/2-gl.erase*px,img.width);g.clip();g.drawImage(img,-h,-h);}
    }else g.drawImage(img,-h,-h);
    g.restore();
  }
}
