// 分镜 02 的铅笔样张：从 storyboard.md 里挑 4 个镜头，检验“歌词写进画面”的几种方式。
// 画面只由 t 决定；歌词由 lyric-layer.js 按每帧媒体时间单独求值（镜头返回 lyrics 规格，不在这里画字）。
import {build} from './character.js';
import {mix} from './storyboard-renderer.js';
import {SHOTS} from './storyboard-shots.js';
import {slots,writeDuration} from './lyric-layer.js';
import {noise} from './visual-state.js';
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const x=clamp(v);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const disc=(cx,cy,rx,ry=rx,n=20)=>Array.from({length:n},(_,i)=>[cx+Math.cos(i/n*Math.PI*2)*rx,cy+Math.sin(i/n*Math.PI*2)*ry]);
const P=(k,p,c,o={})=>({t:'poly',k,p,c,...o});
const Ln=(k,p,c,w=2,o={})=>({t:'line',k,p,c,w,...o});
const CLEAN={hatch:false};

// ---------- 书桌上的手和笔（俯拍；笔尖在 tip，笔身朝右下）----------
// mode: 'lead' 用笔芯写；'eraser' 倒过来用橡皮；flip 0–1 为翻笔过程（侧过去时笔看起来变短）
function hand(tip,{mode='lead',flip=0,angle=.85}={}){
  const d=[Math.cos(angle),Math.sin(angle)],n=[-d[1],d[0]],W=([u,v])=>[tip[0]+d[0]*u+n[0]*v,tip[1]+d[1]*u+n[1]*v];
  const items=[],add=(k,pts,c,o={})=>items.push(P(`hand-${k}`,pts.map(W),c,{edge:3,sh:3,...o}));
  add('sleeve',[[262,-74],[700,-96],[700,96],[262,78]],'#a9c2c4');
  add('cuff',[[248,-76],[290,-78],[290,80],[248,78]],'#8fa9ab',{hatch:false});
  add('palm',disc(212,-4,72,58,18),'#e8c4a6');
  add('thumb',[[72,10],[112,28],[168,40],[176,20],[150,12]],'#e8c4a6');
  const k=Math.abs(Math.cos(Math.PI*flip)),u=x=>x*k,lead=mode==='lead'||(flip>0&&flip<.5);
  if(lead){add('wood',[[u(34),-8],[u(300),-8],[u(300),8],[u(34),8]],'#d9cfb8');add('cone',[[u(10),-2.6],[u(34),-8],[u(34),8],[u(10),2.6]],'#e8d9bc',CLEAN);add('lead',[[0,0],[u(10),-2.6],[u(10),2.6]],'#26343a',CLEAN);}
  else{add('wood',[[u(40),-8],[u(300),-8],[u(300),8],[u(40),8]],'#d9cfb8');add('ferrule',[[u(24),-8.6],[u(40),-8.6],[u(40),8.6],[u(24),8.6]],'#b3c4c4',CLEAN);add('rubber',[[0,-6],[u(4),-8.5],[u(24),-8.5],[u(24),8.5],[u(4),8.5],[0,6]],'#e3b9a4',CLEAN);}
  add('index',[[58,-9],[92,-24],[176,-34],[184,-14],[104,-8]],'#e8c4a6');
  items.push(Ln('hand-knuckle',[W([200,-50]),W([214,-28]),W([236,-40])],'#c99a7e',1.4));
  return items;
}

// 笔尖跟着正在写的字走：每个字从左上划到右下；字和字之间抬笔移过去
function penTip(line,lt,at,rest){
  const cs=line.chars,start=(i)=>[at[i].x-at[i].size*.34,at[i].y-at[i].size*.3],end=(i)=>[at[i].x+at[i].size*.34,at[i].y+at[i].size*.32];
  if(lt<cs[0].start){const k=ease((lt-(cs[0].start-.4))/.4);const s=start(0);return [lerp(rest[0],s[0],k),lerp(rest[1],s[1],k)];}
  for(let i=0;i<cs.length;i++){
    const c=cs[i],w=writeDuration(c);
    if(lt<c.start+w){const k=clamp((lt-c.start)/w),a=start(i),b=end(i),z=Math.sin(k*Math.PI*5)*at[i].size*.12;return [lerp(a[0],b[0],k)+z,lerp(a[1],b[1],k)-z*.5];}
    const next=cs[i+1];
    if(next&&lt<next.start){const k=ease((lt-(c.start+w))/Math.max(.05,Math.min(.35,next.start-c.start-w)));const a=end(i),b=start(i+1);return [lerp(a[0],b[0],k),lerp(a[1],b[1],k)-Math.sin(k*Math.PI)*14];}
  }
  const last=end(cs.length-1);return [last[0]+12,last[1]+10];
}

function desk(t,{dawn}){
  const wood=dawn?mix('#8a7b64','#566d71',.55):'#8a7b64',page=dawn?mix('#f0ebdf','#cddbd8',.35):mix('#f0ebdf','#f3dfa6',.18),items=[P('desk',rect(-300,-60,2200,1200),wood,{edge:0,sh:0,still:true})];
  for(let i=0;i<14;i++)items.push(Ln(`grain${i}`,[[-300,10+i*70+noise(i)*20],[700,22+i*70+noise(i+3)*30],[1900,8+i*70+noise(i+5)*20]],'#8a7b64',1.2,{a:.45}));
  items.push(P('bookShadow',[[262,176],[1362,160],[1356,792],[268,800]],'#5c4f42',{a:.35,edge:0,sh:0,hatch:false,outline:false}));
  items.push(P('pageL',[[240,150],[790,170],[790,770],[250,760]],page,{...CLEAN,sh:4}),P('pageR',[[790,170],[1340,150],[1330,760],[790,770]],page,{...CLEAN,sh:4}));
  for(let i=0;i<4;i++)items.push(Ln(`spine${i}`,[[786+i*3,172],[786+i*3,768]],'#8a7b64',1,{a:.35-i*.07}));
  items.push(P('mug',disc(1490,230,74),'#d9cfb8',{sh:5}),P('coffee',disc(1490,230,54),'#5c4f42',{edge:0,sh:0}));
  items.push(P('eraserBlock',[[150,690],[214,676],[226,716],[160,730]],'#efe8d8',{sh:3}),P('eraserSleeve',[[176,684],[204,678],[216,720],[188,726]],'#a9c2c4',{edge:0,sh:0}));
  return items;
}
// 左页上那张小画：雨夜街口，她撑伞挥手，他已经走远（第 8 镜画的内容）
function sketchOnPage(ctx,t,alpha=1){
  const c='#8e9a96',items=[];
  // 先用浅排线铺楼面和路面，再勾线，像她真的画过的一页
  for(const [k,p,col] of [['bL',[[300,250],[520,322],[520,338],[300,500]],'#7f9aa3'],['bR',[[740,240],[560,322],[560,338],[740,500]],'#7f9aa3'],['road',[[300,560],[520,338],[560,338],[740,560]],'#a9c2c4'],['wL',[[300,500],[520,338],[300,560]],'#b3c4c4'],['wR',[[740,500],[560,338],[740,560]],'#b3c4c4']])items.push(P('pg-'+k,p,col,{a:alpha*.6,edge:0,sh:0,outline:false}));
  for(let i=0;i<8;i++){const u=i/8,x=lerp(312,500,u),y=lerp(275,326,u),s=1-u*.8;if(noise(i+3)>.45)items.push(P('pg-win'+i,[[x,y+12*s],[x+20*s,y+16*s],[x+20*s,y+44*s],[x,y+40*s]],'#f3dfa6',{a:alpha,edge:0,sh:0,hatch:false}));}
  items.push(P('pg-glow',[[410,336],[430,336],[470,560],[370,560]],'#f3dfa6',{glow:true,a:alpha*.5}));
  for(const [k,p] of [['l1',[[300,560],[520,330]]],['l2',[[740,560],[560,330]]],['h',[[300,330],[740,330]]],['b1',[[300,250],[520,330]]],['b2',[[740,240],[560,330]]]])items.push(Ln(`pg-${k}`,p,c,1.6,{a:alpha}));
  items.push(Ln('pg-pole',[[420,560],[420,330]],c,2,{a:alpha}),Ln('pg-lamp',[[404,330],[436,330]],c,2,{a:alpha}));
  for(let i=0;i<26;i++){const x=300+noise(i+40)*440,y=240+noise(i+60)*300;items.push(Ln(`pg-rain${i}`,[[x,y],[x-4,y+16]],c,1,{a:alpha*.7,boil:false}));}
  const wave=Math.sin(t*5)*.3;
  items.push(...build({x:470,y:560,size:120,facing:'back',t,hold:{type:'umbrella',color:'#efe8d8'},key:'pgHer',pose:{arms:[[0,.12],[-1.6+wave,.2]]}}).parts.map(p=>({...p,a:alpha*.8})));
  items.push(...build({x:548,y:352,size:34,facing:'back',action:'walk',u:t*2,t,key:'pgHim'}).parts.filter(p=>!/scarf/.test(p.k||'')).map(p=>({...p,a:alpha*.6})));
  return items;
}

export const DEMOS=[
{
  id:'A',no:'6',title:'路面透视',start:28.4,end:31.9,lines:[2],
  note:'第 3 句按透视写在路面上，一路伸向他走去的方向；在暗处用“橡皮擦出来”的纸色字。',
  scene(t,ctx){
    const base=SHOTS[0].scene(t,ctx);
    return {...base,lyrics:[{line:2,layout:{path:[[1120,870,1],[1000,520,.46]],size:108,spacing:1.02,ink:'paper',squash:.72,exit:{type:'fade',at:31.25,dur:.6}}}]};
  }
},
{
  id:'B',no:'9–11',title:'笔尖手写 → 雨窗流走',start:41.2,end:50.6,lines:[5,6,7],
  note:'第 6 句由她的笔尖一个字一个字写在页边；镜头上摇到窗，第 7 句出现在起雾的玻璃上，唱完后被雨水拖走；镜头摇回桌面，第 8 句已经写在她看着的那页上。',
  scene(t,ctx){
    const pull=ease((t-41.2)/1),up=ease((t-44.9)/1),push=ease((t-45.9)/3.5);
    const down=ease((t-49.5)/.8),cam={x:lerp(lerp(520,800,pull),800,up),y:lerp(lerp(lerp(400,462,pull),-488,up),470,down),z:lerp(2,1,pull)*(1+.04*push*(1-down))};
    const items=[];
    // 墙和窗在桌子“上方”：俯拍的桌面往上摇就看到窗
    items.push(P('wall',rect(-300,-1100,2200,1060),'#8a8f84',{edge:0,sh:0,still:true}));
    items.push(P('winFrame',rect(170,-910,1260,830),'#d9cfb8',{sh:6}),P('glass',rect(214,-866,1172,742),'#2b3d4a',{...CLEAN,edge:0,sh:0}));
    for(let i=0;i<18;i++){const x=260+noise(i+11)*1080,y=-840+noise(i+31)*690,r=26+noise(i+51)*48;items.push(P(`bokeh${i}`,disc(x,y,r),i%3?'#f3dfa6':'#a9c2c4',{glow:true,a:.55}));}
    items.push(P('fog',rect(214,-866,1172,742),'#a9c2c4',{a:.5,...CLEAN,edge:0,sh:0,outline:false}));
    items.push(P('lampReflect',disc(420,-250,170),'#f3dfa6',{glow:true,a:.22}));
    // 雨水：一道道往下爬的水痕，头上挂一颗水珠
    for(let i=0;i<16;i++){const x=240+noise(i+70)*1120,v=40+noise(i+90)*90,head=-860+((t*v+noise(i+80)*700)%740),pts=[];for(let k=0;k<7;k++){const y=Math.max(-866,head-k*34);pts.push([x+Math.sin(y*.03+i)*5,y]);}items.push(Ln(`rill${i}`,pts,'#dfe7e6',3,{a:.75,boil:false}),P(`drop${i}`,disc(pts[0][0],head+6,6,8,8),'#dfe7e6',{...CLEAN,edge:0,sh:0,a:.85}));}
    items.push(P('mullion',rect(214,-340,1172,14),'#d9cfb8',{sh:3}));
    items.push(P('sill',rect(150,-96,1300,44),'#d9cfb8',{sh:5}));
    items.push(...desk(t,{dawn:false}),...sketchOnPage(ctx,t));
    items.push(P('lamp',disc(180,140,880),'#f3dfa6',{glow:true,a:.42}));
    const L6={path:[[870,330],[1310,330]],size:66,spacing:1.08};
    const at=slots(ctx.lines[5],L6),tip=penTip(ctx.lines[5],ctx.lt(5),at,[560,430]);
    items.push(...hand(tip));
    return {cam,items,lyrics:[
      {line:5,layout:{...L6,ink:'graphite'}},
      {line:6,layout:{path:[[300,-560],[1300,-560]],size:68,spacing:1.06,align:'center',ink:'night',exit:{type:'flow',at:48.97,dur:.75,stagger:.25}}},
      {line:7,layout:{path:[[870,470],[1310,470]],size:56,spacing:1.06,ink:'graphite'}},
    ]};
  }
},
{
  id:'C',no:'22',title:'写下，又擦掉',start:87.0,end:96.6,lines:[18],
  note:'第 19 句由她亲手写在地平线下；停了一会儿，她把笔倒过来，从右往左擦掉，只留下擦不干净的浅痕和橡皮屑。',
  scene(t,ctx){
    const cam={x:900,y:480,z:1+.05*ease((t-87)/9.6)};
    const L19={path:[[872,575],[1272,575]],size:72,spacing:1.08};
    const line=ctx.lines[18],lt=ctx.lt(18),at=slots(line,L19),erase={from:1300,to:850,start:94.34,end:95.6,ghost:.14};
    const items=[...desk(t,{dawn:true})];
    // 左页是翻过去那页的背面，透出一点上一页的画；右页有压痕、地平线、小太阳（前两镜画的）
    items.push(...sketchOnPage(ctx,t,.1).map(i=>i.p?{...i,p:i.p.map(([x,y])=>[1030-x,y])}:i));
    for(const [k,p] of [['emb1',[[960,560],[1000,410],[1040,560]]],['emb2',[[1040,560],[1080,400],[1120,560]]],['embU',[[930,410],[1000,350],[1080,345],[1150,400]]]])items.push(Ln(k,p,'#b9ab8e',1.4,{a:.35,boil:false}));
    items.push(Ln('horizon',[[830,470],[1060,466],[1300,472]],'#26343a',2.4),P('sun',disc(1180,442,28,28,16),'#f0ebdf',{...CLEAN,sh:0,edge:0}));
    items.push(Ln('sunArc',disc(1180,442,28,28,16).filter(([,y])=>y<=470),'#26343a',2));
    // 擦过的地方落下橡皮屑
    const ex=erase.from+(erase.to-erase.from)*clamp((lt-erase.start)/(erase.end-erase.start));
    for(let i=0;i<26;i++){const x=860+noise(i+5)*430;if(lt<erase.start||x<ex)continue;const y=545+noise(i+9)*70,r=3+noise(i+13)*5,a=noise(i+17)*3;items.push(P(`crumb${i}`,[[x,y],[x+r*Math.cos(a),y+r*Math.sin(a)],[x+r*.6,y+r],[x-r*.4,y+r*.7]],'#d9cfb8',{edge:1,sh:1,hatch:false}));}
    items.push(P('dawn',disc(820,-160,980),'#cddbd8',{glow:true,a:.4}));
    // 写完 → 悬着发抖 → 翻笔 → 从右往左擦 → 手收走
    let tip=penTip(line,lt,at,[1000,720]),mode='lead',flip=0;
    if(lt>line.end){
      const lastEnd=[at.at(-1).x+at.at(-1).size*.34,at.at(-1).y+at.at(-1).size*.32];
      const hover=ease((lt-line.end)/.8),tremble=Math.sin(lt*58)*2.2*clamp((lt-line.end)/.4);
      tip=[lastEnd[0]+30*hover+tremble,lastEnd[1]-46*hover];
      flip=clamp((lt-93.5)/.7);if(flip>0){const k=ease(flip);tip=[lerp(tip[0],erase.from,k),lerp(tip[1],575,k)];mode='eraser';}
      if(lt>=erase.start){const zig=Math.sin(lt*44)*24;tip=[Math.max(erase.to,ex),575+zig];}
      const away=ease((lt-95.7)/.8);tip=[lerp(tip[0],1750,away),lerp(tip[1],980,away)];
    }
    items.push(...hand(tip,{mode,flip:mode==='eraser'?flip:0}));
    return {cam,items,lyrics:[{line:18,layout:{...L19,ink:'graphite',erase}}]};
  }
}];
