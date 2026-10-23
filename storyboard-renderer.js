// 分镜试做的渲染器：镜头给出同一份场景描述（世界坐标的纸片／线／天空），三种画风各用自己的画法画。
// 纸艺：每片独立纸片、暖白边、投影、固定纤维，12 张/秒定格抖动；铅笔：浅底色 + 排线 + 每秒 12 次抖动的轮廓，填色不抖；
// 像素：320×180 索引缓冲、固定调色板、有序抖动，人物外描一圈深色像素，最后整数放大。
import {noise} from './visual-state.js';
export const W=1600,H=900;
export const PAL=['#1d2a35','#2b3d4a','#3d5563','#587482','#7f9aa3','#b3c4c4','#efe8d8','#d9cfb8','#b9ab8e','#8a7b64','#5c4f42','#c5d0b4','#9fb294','#6f8f7b','#47685f','#f3dfa6','#e7bf6e','#d89a55','#b9664d','#8a4436','#6d7f8c','#4a5a66','#e8c4a6','#c99a7e','#2a2423','#e3b9a4','#cddbd8','#a9c2c4','#24333e','#3a3634'];
const PAPER='#efe8d8',PENCIL_PAPER='#f0ebdf',INK='#26343a';
const hexRGB=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const toHex=c=>'#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
export const mix=(a,b,t)=>{const x=hexRGB(a),y=hexRGB(b);return toHex(x.map((v,i)=>v+(y[i]-v)*t));};
export const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)%100000;};
const lum=h=>{const [r,g,b]=hexRGB(h);return (r*.3+g*.59+b*.11)/255;};

function screenItems(items,cam){
  const z=cam.z,m=([x,y])=>[(x-cam.x)*z+W/2,(y-cam.y)*z+H/2];
  return items.map(it=>{
    if(it.fixed||it.t==='group-end'||it.t==='sky')return it;
    return {...it,p:it.p.map(m),w:it.w&&it.w*z,edge:(it.edge??6)*Math.min(1.6,z),sh:(it.sh??5)*Math.min(1.6,z)};
  });
}
const bbox=pts=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const [x,y] of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,y0,x1,y1};};
const path=(g,p)=>{g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
// 撕纸毛边：沿边细分，种子固定在纸片上，移动时毛边不变
function torn(p,key,amp=3){
  const out=[],s=hash(key);
  p.forEach((a,i)=>{const b=p[(i+1)%p.length],n=Math.max(1,Math.floor(Math.hypot(b[0]-a[0],b[1]-a[1])/26));
    for(let j=0;j<n;j++){const u=j/n,nx=a[1]-b[1],ny=b[0]-a[0],l=Math.hypot(nx,ny)||1,d=(noise(s+i*31+j)-.5)*amp*2;out.push([a[0]+(b[0]-a[0])*u+nx/l*d,a[1]+(b[1]-a[1])*u+ny/l*d]);}});
  return out;
}

// ---------- 纸艺 ----------
function paperPiece(g,it,frame,reduced){
  const s=hash(it.k||'x'),amp=reduced?0:(it.still?0:1.3);
  const dx=(noise(s+frame*7.3)-.5)*2*amp,dy=(noise(s+frame*5.1+3)-.5)*2*amp;
  let p=it.p.map(([x,y])=>[x+dx,y+dy]);if(it.torn)p=torn(p,it.k,it.torn);
  g.save();g.globalAlpha=it.a??1;
  if(it.glow){path(g,p);g.fillStyle=it.c;g.globalAlpha=(it.a??.4)*.8;g.fill();g.restore();return;}
  const b=bbox(p),area=(b.x1-b.x0)*(b.y1-b.y0);
  // 大纸片的模糊投影很贵：改成两层错开的半透明影子，视觉上同样是垫在下面的软影
  if(area>250000&&it.sh>0){g.fillStyle='#1f2c2b1c';for(const k of [.55,1]){g.save();g.translate(it.sh*.35*k,it.sh*.6*k);path(g,p);g.fill();g.restore();}path(g,p);}
  else{path(g,p);g.shadowColor='#1f2c2b44';g.shadowBlur=it.sh;g.shadowOffsetX=it.sh*.35;g.shadowOffsetY=it.sh*.6;}
  g.lineJoin='round';if(it.edge>0){g.lineWidth=it.edge*1.6;g.strokeStyle='#fbf5e6';g.stroke();}
  g.fillStyle=it.c;g.fill();g.shadowColor='transparent';
  if(area>900){g.clip();g.strokeStyle=lum(it.c)>.55?'#8a7b6420':'#fff7df24';g.lineWidth=.9;
    const n=Math.min(70,Math.max(4,area/6000));
    g.beginPath();for(let i=0;i<n;i++){const x=b.x0+noise(s+i*3)*(b.x1-b.x0),y=b.y0+noise(s+i*3+1)*(b.y1-b.y0),l=5+noise(s+i)*20;g.moveTo(x,y);g.quadraticCurveTo(x+l*.5,y+(noise(s+i*5)-.5)*5,x+l,y+1);}g.stroke();}
  g.restore();
}
function paperFrame(g,items,frame,reduced,lyricStrip){
  g.fillStyle=PAPER;g.fillRect(0,0,W,H);
  for(const it of items){
    if(it.t==='sky'){it.bands.forEach((c,i)=>{const y0=it.y0+(it.y1-it.y0)*i/it.bands.length;paperPiece(g,{k:`sky${i}`,p:[[-30,y0-(i?14:40)],[W+30,y0-(i?8:40)],[W+30,it.y1+60],[-30,it.y1+60]],c,edge:0,sh:i?5:0,torn:i?4:0,still:!i},frame,reduced);});continue;}
    if(it.t==='poly')paperPiece(g,it,frame,reduced);
    else if(it.t==='line'||it.t==='mark'){g.save();g.globalAlpha=it.a??1;g.strokeStyle=it.c;g.lineWidth=Math.max(1,it.w||2);g.lineCap='round';g.beginPath();it.p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.restore();}
  }
  // 歌词纸条：一条撕边的米白纸，字贴在上面
  if(lyricStrip)paperPiece(g,{k:'lyric-strip',p:[[300,792],[1300,786],[1306,884],[296,880]],c:'#f6efdd',edge:0,sh:7,torn:3},frame,reduced);
}

// ---------- 铅笔 ----------
let grainCanvas=null;
function grain(){
  if(grainCanvas)return grainCanvas;
  const small=document.createElement('canvas');small.width=400;small.height=225;
  const sg=small.getContext('2d'),img=sg.createImageData(400,225);
  for(let i=0;i<img.data.length;i+=4){const v=232+noise(i*.25+7)*23;img.data[i]=v;img.data[i+1]=v-2;img.data[i+2]=v-8;img.data[i+3]=255;}
  sg.putImageData(img,0,0);
  // 先放大到成片尺寸存好，每帧叠的时候不再缩放
  grainCanvas=document.createElement('canvas');grainCanvas.width=1920;grainCanvas.height=1080;grainCanvas.getContext('2d').drawImage(small,0,0,1920,1080);
  return grainCanvas;
}
function sketch(g,p,color,seed,frame,width,closed=false,alpha=1){
  const pts=closed?[...p,p[0]]:p;
  for(let k=0;k<2;k++){g.beginPath();g.strokeStyle=color;g.globalAlpha=(k?.35:.8)*alpha;g.lineWidth=width*(k?.6:1);
    pts.forEach(([x,y],i)=>{const jx=(noise(seed+i*7+frame*13+k*98)-.5)*2.2,jy=(noise(seed+i*11+frame*17+k*51)-.5)*2.2;i?g.lineTo(x+jx,y+jy):g.moveTo(x+jx,y+jy);});g.stroke();}
  g.globalAlpha=1;
}
function hatchFill(g,p,color,seed,spacing,angle){
  // 只在画面里的那一部分排线：超出画框的大块面不白画
  const o=bbox(p),b={x0:Math.max(-4,o.x0),y0:Math.max(-4,o.y0),x1:Math.min(W+4,o.x1),y1:Math.min(H+4,o.y1)};
  if(b.x1<=b.x0||b.y1<=b.y0)return;
  const cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,r=Math.hypot(b.x1-b.x0,b.y1-b.y0)/2+4;
  // 大块面排线放宽一点；所有线合成一条路径一次描出
  const step=spacing*(r>500?2:r>200?1.3:1);
  g.save();path(g,p);g.clip();g.translate(cx,cy);g.rotate(angle);g.strokeStyle=color;g.lineWidth=1;g.globalAlpha=.55;g.beginPath();
  for(let y=-r;y<r;y+=step){g.moveTo(-r,y+(noise(seed+y)-.5)*2);g.lineTo(r,y+(noise(seed+y+.5)-.5)*3);}
  g.stroke();g.restore();
}
function pencilFrame(g,items,frame,reduced,lyricStrip){
  g.fillStyle=PENCIL_PAPER;g.fillRect(0,0,W,H);const boil=reduced?0:frame;
  for(const it of items){
    if(it.t==='sky'){it.bands.forEach((c,i)=>{const y0=it.y0+(it.y1-it.y0)*i/it.bands.length,y1=it.y1+40,p=[[-10,y0],[W+10,y0],[W+10,y1],[-10,y1]];g.fillStyle=mix(c,PENCIL_PAPER,.3);g.fillRect(-10,y0,W+20,y1-y0);hatchFill(g,p,mix(c,INK,.25),i*19,7+i,.12+i*.05);});continue;}
    const s=hash(it.k||'x');
    if(it.t==='poly'){
      if(it.glow){
        // 光用加色叠上去，从中心往外淡出，不是一块实心圆
        const b=bbox(it.p),cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,r=Math.max(b.x1-b.x0,b.y1-b.y0)/2,gr=g.createRadialGradient(cx,cy,r*.15,cx,cy,r),[R,G,B]=hexRGB(it.c);
        gr.addColorStop(0,`rgba(${R},${G},${B},${(it.a??.4)*.55})`);gr.addColorStop(1,`rgba(${R},${G},${B},0)`);
        g.save();g.globalCompositeOperation='lighter';path(g,it.p);g.fillStyle=gr;g.fill();g.restore();continue;
      }
      // 很小的块（远处的窗、手）只平涂加轮廓，排线在这个尺寸下看不出来
      const b=bbox(it.p),small=(b.x1-b.x0)*(b.y1-b.y0)<3000,l=lum(it.c);
      g.save();g.globalAlpha=it.a??1;path(g,it.p);g.fillStyle=mix(it.c,PENCIL_PAPER,small?.1:.22);g.fill();
      if(!small&&it.hatch!==false){hatchFill(g,it.p,mix(it.c,INK,.45),s,3+l*7,[.62,.95,-.5][s%3]);if(l<.35)hatchFill(g,it.p,mix(it.c,INK,.6),s+9,(5+l*8)*1.4,[-.7,.3,1.2][s%3]);}
      g.restore();
      if(it.outline!==false)sketch(g,it.p,mix(it.c,INK,.65),s,boil,it.g?1.6:1.8,true,it.a??1);
    }else if(it.t==='line'&&it.boil===false){g.globalAlpha=(it.a??1)*.8;g.strokeStyle=it.c;g.lineWidth=Math.max(.8,it.w||1.5)*.8;g.beginPath();it.p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.globalAlpha=1;}
    else if(it.t==='line')sketch(g,it.p,it.c,s,boil,Math.max(.8,it.w||1.5),false,it.a??1);
    else if(it.t==='mark')sketch(g,it.p,INK,s,boil,Math.max(1.2,(it.w||2)*.8));
  }
  // 绘本下方留一块空白纸给歌词（歌词写进画面时不留）
  if(lyricStrip){g.fillStyle=PENCIL_PAPER;g.globalAlpha=.86;g.beginPath();g.moveTo(0,790);for(let x=0;x<=W;x+=40)g.lineTo(x,786+noise(x*.37)*8);g.lineTo(W,H);g.lineTo(0,H);g.closePath();g.fill();g.globalAlpha=1;
  sketch(g,Array.from({length:41},(_,i)=>[i*40,786+noise(i*40*.37)*8]),'#8e9a96',77,boil,1.1);}
  g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='multiply';g.drawImage(grain(),0,0,g.canvas.width,g.canvas.height);g.restore();
}

// ---------- 像素 ----------
const LW=320,LH=180,S=W/LW;
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const PAL_RGB=PAL.map(hexRGB),nearest=new Map();
export function palIndex(hex){
  if(nearest.has(hex))return nearest.get(hex);
  const c=hexRGB(hex);let best=0,bd=1e9;
  PAL_RGB.forEach((p,i)=>{const d=(p[0]-c[0])**2*.3+(p[1]-c[1])**2*.59+(p[2]-c[2])**2*.11;if(d<bd){bd=d;best=i;}});
  nearest.set(hex,best);return best;
}
// 半透明（光锥、树荫、渐隐）不用棋盘点：把底下那格的颜色和它按透明度混合，再取调色板里最近的一格（光照 pass）
const lit=new Map();
function litIndex(bg,ci,alpha){
  const key=`${bg},${ci},${Math.round(alpha*12)}`;
  if(!lit.has(key))lit.set(key,palIndex(mix(PAL[bg],PAL[ci],Math.round(alpha*12)/12)));
  return lit.get(key);
}
function rasterPoly(buf,mask,p,ci,alpha=1){
  const q=p.map(([x,y])=>[x/S,y/S]),b=bbox(q),y0=Math.max(0,Math.floor(b.y0)),y1=Math.min(LH-1,Math.ceil(b.y1));
  for(let y=y0;y<=y1;y++){
    const yc=y+.5,xs=[];
    for(let i=0;i<q.length;i++){const a=q[i],c=q[(i+1)%q.length];if((a[1]<=yc)!==(c[1]<=yc))xs.push(a[0]+(yc-a[1])/(c[1]-a[1])*(c[0]-a[0]));}
    xs.sort((u,v)=>u-v);
    for(let k=0;k+1<xs.length;k+=2){const x0=Math.max(0,Math.round(xs[k])),x1=Math.min(LW,Math.round(xs[k+1]));
      for(let x=x0;x<x1;x++){const i=y*LW+x;buf[i]=alpha<1?litIndex(buf[i],ci,alpha):ci;if(mask)mask[i]=1;}}
  }
}
function rasterLine(buf,mask,p,ci,w=1,alpha=1){
  const thick=Math.max(1,Math.round(w/S));
  for(let i=0;i+1<p.length;i++){
    const [ax,ay]=p[i].map(v=>v/S),[bx,by]=p[i+1].map(v=>v/S),n=Math.max(1,Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))));
    for(let j=0;j<=n;j++){const x=Math.round(ax+(bx-ax)*j/n),y=Math.round(ay+(by-ay)*j/n);
      for(let ty=0;ty<thick;ty++)for(let tx=0;tx<thick;tx++){const X=x+tx,Y=y+ty;if(X<0||Y<0||X>=LW||Y>=LH)continue;if(alpha<1&&alpha<=BAYER[(Y&3)*4+(X&3)])continue;buf[Y*LW+X]=ci;if(mask)mask[Y*LW+X]=1;}}
  }
}
function pixelFrame(img,items){
  const buf=new Uint8Array(LW*LH);let mask=null,group=null,box=null;
  // 人物外描：只在这个人物的范围里找挨着人物的空格，涂深色
  const outline=(oc)=>{const ci=palIndex(oc),out=[],x0=Math.max(0,Math.floor(box.x0/S)-1),x1=Math.min(LW-1,Math.ceil(box.x1/S)+1),y0=Math.max(0,Math.floor(box.y0/S)-1),y1=Math.min(LH-1,Math.ceil(box.y1/S)+1);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*LW+x;if(mask[i])continue;if((x>0&&mask[i-1])||(x<LW-1&&mask[i+1])||(y>0&&mask[i-LW])||(y<LH-1&&mask[i+LW]))out.push(i);}
    for(const i of out)buf[i]=ci;};
  for(const it of items){
    if(it.t==='group-end'){if(mask)outline(it.oc);mask=null;group=null;continue;}
    if(it.g&&it.g!==group){mask=new Uint8Array(LW*LH);group=it.g;box={x0:1e9,y0:1e9,x1:-1e9,y1:-1e9};}
    if(it.g&&it.p){const b=bbox(it.p);box.x0=Math.min(box.x0,b.x0);box.y0=Math.min(box.y0,b.y0);box.x1=Math.max(box.x1,b.x1);box.y1=Math.max(box.y1,b.y1);}
    if(it.t==='sky'){const n=it.bands.length;for(let y=0;y<LH;y++){const v=Math.max(0,Math.min(n-1.001,(y*S-it.y0)/(it.y1-it.y0)*n-.5)),k=Math.floor(v),f=v-k;
      for(let x=0;x<LW;x++){const c=f>BAYER[(y&3)*4+(x&3)]?it.bands[Math.min(k+1,n-1)]:it.bands[k];buf[y*LW+x]=palIndex(c);}}continue;}
    const ci=palIndex(it.c),a=it.glow?(it.a??.4)*.8:(it.a??1);
    if(it.t==='poly')rasterPoly(buf,it.g?mask:null,it.p,ci,a);
    else if(it.t==='line')rasterLine(buf,null,it.p,ci,it.w,a);
    else if(it.t==='mark')rasterLine(buf,null,it.p.length>2?[it.p[0],it.p[it.p.length-1]]:it.p,ci,1,1);
  }
  // 对话框：歌词放进像素框
  const panel=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)buf[j*LW+i]=palIndex(c);};
  panel(36,152,248,24,'#efe8d8');panel(37,153,246,22,'#1d2a35');panel(38,154,244,20,'#24333e');panel(39,155,242,18,'#1d2a35');
  for(let i=0;i<LW*LH;i++){const c=PAL_RGB[buf[i]];img.data[i*4]=c[0];img.data[i*4+1]=c[1];img.data[i*4+2]=c[2];img.data[i*4+3]=255;}
}

export function createShotRenderer(canvas){
  const g=canvas.getContext('2d',{alpha:false});
  const low=document.createElement('canvas');low.width=LW;low.height=LH;
  const lg=low.getContext('2d'),img=lg.createImageData(LW,LH);
  return function render(style,frameData,{frame=0,reduced=false,lyricStrip=true}={}){
    const items=screenItems(frameData.items,frameData.cam);
    g.save();
    if(style==='pixel'){pixelFrame(img,items);lg.putImageData(img,0,0);g.imageSmoothingEnabled=false;g.drawImage(low,0,0,canvas.width,canvas.height);}
    else{g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);if(style==='pencil')pencilFrame(g,items,frame,reduced,lyricStrip);else paperFrame(g,items,frame,reduced,lyricStrip);}
    g.restore();
  };
}
