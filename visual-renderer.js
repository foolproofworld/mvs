import {sceneState,noise} from './visual-state.js';
const W=1600,H=900;
const polygon=(g,points)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();};
const rectPoints=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const mix=(a,b,t)=>{const channel=(hex,i)=>parseInt(hex.slice(i,i+2),16);return `rgb(${[1,3,5].map(i=>Math.round(channel(a,i)+(channel(b,i)-channel(a,i))*t)).join(',')})`;};

function cut(g,points,color,seed=1,shadow=6){
  g.save();polygon(g,points);g.shadowColor='#293c3b30';g.shadowBlur=shadow;g.shadowOffsetY=shadow*.65;
  g.lineJoin='round';g.lineWidth=10;g.strokeStyle='#f8f3e8';g.stroke();g.fillStyle=color;g.fill();g.shadowColor='transparent';g.clip();
  // Each individual sheet has its own fixed fibers; movement never reseeds its fill.
  g.strokeStyle='#fff7df32';g.lineWidth=.8;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  for(let i=0;i<90;i++){const x=x0+noise(seed+i*3)*(x1-x0),y=y0+noise(seed+i*3+1)*(y1-y0);g.beginPath();g.moveTo(x,y);g.lineTo(x+6+noise(i+seed)*23,y+2);g.stroke();}
  g.restore();
}

function paper(g,s){
  g.fillStyle='#e9e4d8';g.fillRect(0,0,W,H);
  g.save();g.translate(800,390);g.scale(s.zoom,s.zoom);g.translate(-800,-390);
  cut(g,rectPoints(86,61,1428,652),mix('#b7c9c4','#c6cbb6',s.warm),1,10);
  // The sun is a cut disc, with a separate paper edge and shadow.
  g.save();g.translate(1220,175-12*s.warm);g.beginPath();g.arc(0,0,53+3*s.pulse,0,Math.PI*2);g.fillStyle=mix('#e1d5ae','#d6b76c',s.warm);g.shadowColor='#7d816230';g.shadowBlur=6;g.shadowOffsetY=5;g.fill();g.restore();
  for(const [i,x,y,scale] of [[0,330,173,1],[1,850,132,.7]]){
    g.save();g.translate(x+s.cloud,y);g.scale(scale,scale);
    cut(g,[[-110,13],[-95,-8],[-55,-8],[-40,-27],[7,-31],[30,-7],[74,-6],[95,11],[79,24],[-104,25]],'#ececdf',50+i,4);g.restore();
  }
  cut(g,[[80,380],[245,301],[436,339],[674,275],[852,347],[1064,295],[1315,323],[1515,283],[1515,500],[80,500]],'#8ca299',2);
  for(let i=0;i<8;i++){
    const x=870+i*64,y=335-noise(i+31)*55;
    cut(g,[[x,y],[x+40,y-5],[x+44,402],[x,406]],i%2?'#d4d3b9':'#b9bca7',71+i,3);
    g.fillStyle='#6a8381';g.fillRect(x+12,y+19,8,14);
  }
  cut(g,[[85,439],[1515,395],[1515,680],[85,680]],'#6c918d',3);
  for(let i=0;i<20;i++){
    const x=130+noise(i+102)*1290,y=451+noise(i+132)*165;
    cut(g,rectPoints(x+s.wind*(2+i%3),y,18+noise(i)*56,2+i%2),'#c1d1c0',130+i,0);
  }
  cut(g,[[80,629],[582,595],[884,635],[1518,589],[1518,724],[80,724]],'#9fa98e',4,5);
  cut(g,[[75,681],[1519,666],[1530,768],[68,778]],'#c6c5ae',5,5);
  // A tree, assembled from separate pieces, sits behind the window and bench.
  cut(g,[[231,610],[250,292],[264,294],[258,611]],'#6b7667',6,4);
  for(let i=0;i<12;i++){
    const x=245+Math.cos(i*2.4)*(75+noise(i)*55)+s.wind*2,y=290+Math.sin(i*2.4)*75;
    cut(g,[[x-36,y],[x-21,y-33],[x+25,y-26],[x+43,y+9],[x+7,y+35],[x-30,y+24]],i%3?'#6d8d7d':'#a0b09a',12+i,3);
  }
  // Window jambs and sill share the scene camera, with the outside layers.
  cut(g,rectPoints(68,50,29,686),'#e8e0ce',20,7);cut(g,rectPoints(1504,50,29,686),'#e8e0ce',21,7);
  cut(g,rectPoints(70,49,1460,22),'#f4eedf',22,7);cut(g,rectPoints(59,722,1482,25),'#f5eddb',23,7);
  for(let i=0;i<22;i++){
    const x=110+noise(i+200)*1370,y=100+((noise(i+250)*500+s.frame*2)%520);
    g.strokeStyle=`rgba(240,245,231,${s.rain*.35})`;g.lineWidth=1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x-7,y+27);g.stroke();
  }
  g.save();g.translate(0,110);
  cut(g,[[390,527],[795,520],[805,550],[386,557]],'#49686a',24,7);
  cut(g,rectPoints(414,426,14,184),'#38565b',25,4);cut(g,rectPoints(758,419,14,191),'#38565b',26,4);
  cut(g,[[407,437],[780,428],[780,455],[407,465]],'#738a7d',27,5);
  cut(g,[[407,476],[780,467],[780,493],[407,504]],'#738a7d',28,5);
  // A scarf lifts from the empty seat as the first chorus opens out.
  g.save();g.translate(650+s.release*350,470-s.release*170+s.wind*5);g.rotate(-s.release*.4);
  cut(g,[[-21,-22],[25,-19],[36,23],[20,56],[41,93],[25,104],[0,66],[10,28],[-15,20]],'#b9664d',30,5);
  g.strokeStyle='#e0a182';g.lineWidth=2;for(let i=0;i<4;i++){g.beginPath();g.moveTo(26+i*4,94);g.lineTo(24+i*4,110);g.stroke();}g.restore();
  g.restore();g.restore();
  // A clean strip of the same paper is reserved for readable lyrics.
  g.fillStyle='#e9e4d8';g.fillRect(0,777,W,123);
}

function sketchLine(g,points,color,seed,frame,width=2){
  for(let k=0;k<2;k++){
    g.beginPath();g.strokeStyle=color;g.globalAlpha=k?.4:.8;g.lineWidth=width*(k?.65:1);
    points.forEach(([x,y],i)=>{const j=(noise(seed+i*7+frame+k*98)-.5)*2; i?g.lineTo(x+j,y+j):g.moveTo(x+j,y+j);});g.stroke();
  }g.globalAlpha=1;
}
function hatch(g,points,color,seed,spacing=9){
  g.save();polygon(g,points);g.clip();g.strokeStyle=color;g.globalAlpha=.45;g.lineWidth=1;
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  for(let x=x0-(y1-y0);x<x1;x+=spacing){g.beginPath();g.moveTo(x,y1+noise(x+seed)*4);g.lineTo(x+(y1-y0)*.5,y0-5);g.stroke();}g.restore();
}
function pencil(g,s){
  g.fillStyle='#f0ebdf';g.fillRect(0,0,W,H);
  g.save();g.translate(800,390);g.scale(s.zoom,s.zoom);g.translate(-800,-390);
  const ink='#566d71',frame=s.frame;
  hatch(g,rectPoints(105,75,1390,500),'#96a9aa',1,12);
  g.fillStyle=mix('#e0d4b3','#d5bd84',s.warm);g.beginPath();g.arc(1210,175,48,0,Math.PI*2);g.fill();
  for(let k=0;k<4;k++){
    const x=350+k*266+s.cloud;
    sketchLine(g,[[x-50,183-k*14],[x-25,166-k*14],[x+15,164-k*14],[x+40,184-k*14],[x+77,183-k*14]],'#94a6a2',40+k,frame,1.4);
  }
  const hills=[[100,381],[280,324],[450,359],[660,295],[920,349],[1140,307],[1495,342],[1495,455],[100,455]];
  hatch(g,hills,'#76908a',5,5);sketchLine(g,hills.slice(0,-2),ink,5,frame,2);
  for(let i=0;i<9;i++){
    const x=900+i*52,y=343-noise(i+71)*48;
    sketchLine(g,[[x,403],[x,y],[x+34,y-3],[x+34,403]],'#7b8e88',i+61,frame,1.5);
    hatch(g,rectPoints(x+4,y+5,26,55),'#a6b0a3',i,6);
  }
  // Water is drawn in individual pencil strokes, rather than a filled cutout.
  for(let i=0;i<150;i++){
    const x=120+noise(i*3+8)*1320,y=430+noise(i*3+9)*209,dx=15+noise(i+66)*70;
    const wiggle=Math.sin(s.time*.5+i)*2+s.pulse*.5;
    sketchLine(g,[[x,y],[x+dx*.4,y+wiggle],[x+dx,y-1]],i%5?'#88a3a0':'#c4b58e',i+300,0,.9);
  }
  hatch(g,[[98,652],[680,614],[1500,625],[1500,725],[98,725]],'#9da58c',22,5);
  sketchLine(g,[[98,652],[680,614],[1500,625]],ink,60,frame,2.5);
  // Hand drawn tree: branches, narrow leaves and hatching rather than paper chips.
  sketchLine(g,[[236,624],[247,435],[246,256]],ink,90,frame,5);
  for(let i=0;i<16;i++){
    const angle=i*2.4,x=248+Math.cos(angle)*(80+noise(i)*40)+s.wind*2,y=309+Math.sin(angle)*88;
    sketchLine(g,[[246,377],[x,y]],'#728877',100+i,frame,1.2);
    for(let j=0;j<6;j++){const a=angle+j;sketchLine(g,[[x,y],[x+Math.cos(a)*25,y+Math.sin(a)*20]],'#829b85',140+i*6+j,frame,1.7);}
  }
  for(const x of [79,97,1500,1518])sketchLine(g,[[x,58],[x,733]],ink,x,frame,2);
  for(const y of [58,77,728,741])sketchLine(g,[[79,y],[1518,y]],ink,y,frame,2);
  // Bench: visible graphite joints, separate slats, and an uneven seat hatch.
  g.save();g.translate(0,110);
  hatch(g,[[384,539],[805,529],[817,550],[383,560]],'#7a8e86',230,4);
  sketchLine(g,[[384,539],[805,529],[817,550],[383,560],[384,539]],ink,210,frame,3);
  for(const x of [418,764])sketchLine(g,[[x,423],[x,611]],ink,x,frame,4);
  for(const y of [440,478]){hatch(g,[[409,y],[785,y-8],[785,y+17],[409,y+25]],'#7a8e86',y,4);sketchLine(g,[[409,y],[785,y-8],[785,y+17],[409,y+25],[409,y]],ink,y,frame,2);}
  const sx=650+s.release*350,sy=473-s.release*170+s.wind*4;
  for(let i=0;i<15;i++){
    const d=i*1.8;sketchLine(g,[[sx-19+d,sy-24],[sx-6+d,sy+9],[sx-12+d,sy+44],[sx+10+d,sy+99]],'#aa614b',700+i,frame,1.8);
  }
  g.restore();g.restore();g.fillStyle='#f0ebdf';g.fillRect(0,777,W,123);
}

function pixel(g,s){
  const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  r(0,0,320,180,'#d8cfb9');r(16,12,288,137,'#c0cfbf');
  // Ordered sparse pixels are part of the native 320x180 drawing.
  for(let y=20;y<80;y+=4)for(let x=20;x<300;x+=4)if((x+y)%12===0)r(x,y,1,1,'#b5c8ba');
  const circle=(cx,cy,radius,color)=>{for(let y=-radius;y<=radius;y++){const w=Math.floor(Math.sqrt(radius*radius-y*y));r(cx-w,cy+y,w*2+1,1,color);}};
  circle(245,34,10,s.warm>.5?'#d7bd8b':'#e6ddbd');
  for(let k=0;k<2;k++){const x=55+k*105+Math.floor(s.cloud/5);r(x,33-k*8,37,5,'#e8e7cf');r(x+7,29-k*8,21,5,'#e8e7cf');}
  for(let x=18;x<301;x+=4){const y=65+Math.floor(Math.sin(x*.04)*5);r(x,y,4,25,'#91ab94');}
  for(let i=0;i<8;i++){const x=180+i*12,y=64-Math.floor(noise(i+6)*9);r(x,y,8,21,'#b7bba3');r(x+3,y+4,2,3,'#72978e');}
  r(18,83,283,55,'#72978e');
  for(let i=0;i<95;i++){const x=22+Math.floor(noise(i+90)*271),y=88+Math.floor(noise(i+210)*44);r(x+Math.floor(s.wind),y,2+Math.floor(noise(i)*10),1,i%3?'#a7bfb0':'#d2ccb0');}
  for(let x=18;x<301;x+=3)r(x,128+Math.sin(x*.03)*2,3,20,'#a2ad90');
  r(48,55,3,69,'#476b61');r(48,65,16,2,'#476b61');
  for(let i=0;i<15;i++){const x=48+Math.cos(i*2.4)*(12+noise(i)*8),y=60+Math.sin(i*2.4)*16;r(x+s.wind*.3,y,9,6,i%3?'#6f917a':'#96a982');}
  r(14,10,4,138,'#435c58');r(302,10,4,138,'#435c58');r(14,10,292,4,'#eee7d0');r(12,145,296,4,'#f0e9d6');
  g.save();g.translate(0,22);
  r(82,85,3,40,'#243f4b');r(154,84,3,41,'#243f4b');r(79,89,80,5,'#648878');r(79,98,80,5,'#648878');r(76,109,87,5,'#315c64');
  const sx=130+Math.floor(s.release*70),sy=94-Math.floor(s.release*34)+Math.round(s.wind);
  r(sx-3,sy-4,7,11,'#b85b43');r(sx,sy+6,5,8,'#b85b43');r(sx+2,sy+13,7,7,'#b85b43');r(sx+5,sy+19,1,3,'#783f34');r(sx+8,sy+19,1,3,'#783f34');
  g.restore();
  for(let i=0;i<17*s.rain;i++){const x=22+Math.floor(noise(i+66)*272),y=20+((i*17+Math.floor(s.frame/3))%112);r(x,y,1,4,'#d2ddd0');}
  r(0,152,320,28,'#243f4b');r(12,155,296,1,'#72978e');
}

export function createVisualRenderer(canvas){
  const g=canvas.getContext('2d',{alpha:false});
  const low=document.createElement('canvas');low.width=320;low.height=180;
  const pg=low.getContext('2d',{alpha:false});
  return function render(style,time,beats=[],reducedMotion=false){
    const s=sceneState(time,beats,reducedMotion);
    g.save();g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    if(style==='pixel'){
      pixel(pg,s);g.imageSmoothingEnabled=false;g.drawImage(low,0,0,W,H);
    }else if(style==='pencil')pencil(g,s);else paper(g,s);
    g.restore();return s;
  };
}
