// 分镜试做：四个小镜头，同一份场景描述交给三种画风画。画面只由 t 决定，随机数用固定种子。
// 状态：草稿，用于用户在定画风前比较效果；剧情、角色和镜头都未经用户确认。
import {build} from './character.js';
import {mix} from './storyboard-renderer.js';
import {noise} from './visual-state.js';
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const x=clamp(v);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const back=v=>{const x=clamp(v),c=1.9;return 1+(c+1)*(x-1)**3+c*(x-1)**2;};   // 略过头再回弹
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const disc=(cx,cy,rx,ry=rx,n=24)=>Array.from({length:n},(_,i)=>[cx+Math.cos(i/n*Math.PI*2)*rx,cy+Math.sin(i/n*Math.PI*2)*ry]);
const P=(k,p,c,o={})=>({t:'poly',k,p,c,...o});
const L=(k,p,c,w=2,o={})=>({t:'line',k,p,c,w,...o});
// 角色：同一个 character.js；像素风走路离散成 4 张
function person(ctx,o,{alpha=1,recolor=null,drop=null}={}){
  let parts=build({...o,steps:ctx.style==='pixel'?4:undefined}).parts;
  if(drop)parts=parts.filter(p=>!drop.test(p.k||''));
  return parts.map(p=>({...p,...(alpha<1&&p.t!=='group-end'?{a:alpha}:{}),...(recolor&&recolor[p.c]?{c:recolor[p.c]}:{})}));
}
const OTHER={'#6d7f8c':'#5c4f42','#4a5a66':'#3a3634','#2b3d4a':'#24333e'};   // 离开的那个人：深棕外套、无围巾
const rain=(t,n,a=.45)=>Array.from({length:n},(_,i)=>{const x=noise(i+.11)*1800-100,v=950+noise(i+.7)*400,y=((noise(i+.3)*1100+t*v)%1100)-120;return L(`rain${i}`,[[x,y],[x-7,y+34]],'#a9c2c4',2,{a,boil:false});});

export const SHOTS=[
{
  id:'s1',n:1,start:21.0,end:31.3,key:26.0,lines:[1,3],title:'雨夜街口',
  say:'他走了，我站着没追，也没转身逃开。',
  picture:'雨夜街口，她撑浅色伞站在路灯下（背影）；他撑深色伞沿街走远、越来越小。第 2 句开头伞沿往下一沉，第 3 句他消失在雨里。',
  camera:'中景，慢推 1.00→1.05，只推一次',mood:'冷蓝夜色，唯一暖色是路灯；围巾是全片唯一强调色',
  beat:'21.41 拍：他起步；25.47 拍：伞沉下；30.58 拍：他消失',next:'（整片里接第 4 句）雨不停，镜头继续推近她的伞面',
  scene(t,ctx){
    const e=ease((t-this.start)/(this.end-this.start)),cam={x:800-55*e,y:452+12*e,z:1+.05*e};
    const items=[{t:'sky',bands:['#1d2a35','#24333e','#2b3d4a'],y0:0,y1:420}];
    for(let i=0;i<9;i++){const x=840+i*34,h=40+noise(i+3)*70;items.push(P(`far${i}`,rect(x,440-h,30,h+10),i%2?'#2b3d4a':'#24333e',{edge:2,sh:2}));if(noise(i+9)>.4)items.push(P(`farw${i}`,rect(x+10,445-h+12,6,7),'#f3dfa6',{edge:0,sh:0}));}
    items.push(P('bldL',[[-80,-40],[880,330],[880,455],[-80,705]],'#24333e',{sh:8,edge:3}));
    items.push(P('bldR',[[1680,-40],[1090,340],[1090,455],[1680,725]],'#2b3d4a',{sh:8,edge:3}));
    // 两侧楼面的窗：越远越小，亮着的几扇是暖黄
    for(const side of [-1,1])for(let c=0;c<5;c++)for(let r=0;r<3;r++){
      const u=1-Math.pow(1-c/5,1.5),x0=side<0?lerp(-20,860,u):lerp(1640,1105,u),s=1-u*.82,top=side<0?lerp(10,345,u):lerp(10,352,u),y=top+(70+r*120)*s;
      const lit=noise(c*7+r*3+(side>0?50:0))>.62;items.push(P(`win${side}${c}${r}`,[[x0,y],[x0+side*-62*s,y+side*-.04*62*s],[x0+side*-62*s,y+80*s],[x0,y+80*s]],lit?'#f3dfa6':'#3d5563',{edge:lit?0:2,sh:0}));
    }
    items.push(P('walkL',[[-80,705],[880,455],[905,457],[-80,795]],'#3d5563',{sh:3}));
    items.push(P('walkR',[[1090,455],[1680,725],[1680,815],[1065,457]],'#3d5563',{sh:3}));
    items.push(P('road',[[-80,795],[905,457],[1065,457],[1680,815],[1680,980],[-80,980]],'#2b3d4a',{sh:0,edge:0}));
    for(let i=0;i<7;i++){const u0=Math.pow(i/7,.6),u1=Math.pow((i+.45)/7,.6),y0=lerp(900,462,u0),y1=lerp(900,462,u1),w0=lerp(9,1,u0),w1=lerp(9,1,u1),x0=lerp(800,985,u0),x1=lerp(800,985,u1);items.push(P(`dash${i}`,[[x0-w0,y0],[x0+w0,y0],[x1+w1,y1],[x1-w1,y1]],'#587482',{edge:0,sh:0}));}
    // 路灯：灯杆、灯头、落在她身上的光锥；光锥亮度随实测拍点轻轻起伏
    const glow=.24+.05*ctx.pulse;
    items.push(P('cone',[[600,292],[688,292],[860,770],[400,770]],'#f3dfa6',{glow:true,a:glow}));
    items.push(L('reflect',[[648,775],[650,880]],'#f3dfa6',7,{a:.35}));
    items.push(P('pole',rect(640,262,10,500),'#1d2a35',{edge:2,sh:4}));
    items.push(P('lampHead',[[606,250],[690,250],[676,292],[620,292]],'#3a3634',{edge:3,sh:4}));
    items.push(P('bulb',[[626,282],[670,282],[662,296],[634,296]],'#f3dfa6',{edge:0,sh:0}));
    // 他：沿街走远，按透视缩小；走到很远时被雨吞掉
    const d=(t-21)*.62+.22,s=1/(1+d),fade=clamp((s-.115)/.06);
    if(fade>0)items.push(...person(ctx,{x:lerp(985,800,s),y:lerp(458,742,s),size:285*s,facing:'back',action:'walk',u:(t-21)*1.9,t,hold:{type:'umbrella',color:'#3d5563'},key:'him'},{alpha:fade,recolor:OTHER,drop:/scarf/}));
    // 她：背影，第 2 句开头伞沿一沉，之后只抬回一半
    const dip=ease((t-25.15)/.7)*.16-ease((t-27.2)/2.2)*.07;
    items.push(...person(ctx,{x:520,y:745,size:300,facing:'back',action:'idle',t,hold:{type:'umbrella',color:'#d9cfb8',tilt:-.06-dip},wind:.2,key:'her'}));
    items.push(...rain(t,ctx.style==='pixel'?40:80));
    return {cam,items};
  }
},
{
  id:'s2',n:2,start:149.4,end:156.4,key:150.75,lines:[31,32],title:'梦被摇醒',
  say:'美梦被现实摇醒：说好的幸福不会来了。',
  picture:'清晨卧室侧面。她睡着，头顶一片暖色梦（两人同撑一把伞）；第 31 句起梦晃动、碎成纸片落下，她猛地坐起；第 32 句垮下肩、低头，最后抬头望向窗。围巾挂在床尾。',
  camera:'近景慢推 1.45→1.52（情绪句推近）；最后 1 秒推进窗户',mood:'梦是暖黄，醒后房间褪成灰蓝；窗外天色慢慢亮',
  beat:'149.77 拍：梦开始晃；150.28 拍：碎裂；152.83 拍：低头；155.40 起推进窗户，156.39 拍落到下一镜',next:'推进窗户 → 窗里的天空就是下一镜的天空（一镜到底）',
  scene(t,ctx){
    const base=ease((t-this.start)/6),k=ease((t-155.35)/.95);
    const cam={x:lerp(640-30*base,1075,k),y:lerp(400+8*base,272,k),z:lerp(1.45+.07*base,7.6,k*k)};
    const warm=1-ease((t-150.3)/1.2),gray=ease((t-150.4)/2.6)*.45,dawn=ease((t-153)/3.4);
    const wall=mix(mix('#d9cfb8','#f3dfa6',warm*.35),'#7f9aa3',gray);
    const items=[P('wall',rect(-300,-300,2200,940),wall,{edge:0,sh:0,still:true})];
    items.push(P('winFrame',rect(950,150,250,290),'#efe8d8',{sh:6}));
    items.push(P('winSky',rect(965,165,220,85),'#cddbd8',{edge:0,sh:0}));
    items.push(P('winSky2',rect(965,250,220,175),'#e3b9a4',{edge:0,sh:0}));
    const sway=Math.sin(t*.9)*6;
    items.push(P('curtL',[[905,130],[975,130],[965+sway,470],[915,476]],'#b9ab8e',{sh:5}),P('curtR',[[1175,130],[1245,130],[1235,476],[1185+sway,470]],'#b9ab8e',{sh:5}));
    items.push(P('beam',[[965,300],[1185,300],[1020,640],[680,640]],mix('#f3dfa6','#cddbd8',gray*1.6),{glow:true,a:.16+dawn*.12}));
    items.push(P('floor',rect(-300,640,2200,500),mix('#b9ab8e','#7f9aa3',gray*.6),{edge:0,sh:0,still:true}));
    for(let i=0;i<9;i++)items.push(L(`board${i}`,[[-300,690+i*45],[1900,690+i*45]],'#8a7b64',1.5,{a:.5}));
    // 床：床头、床架、床尾柱上挂着围巾
    items.push(P('headboard',rect(240,380,46,262),'#8a7b64',{sh:6}),P('frame',rect(240,560,780,62),'#8a7b64',{sh:6}));
    items.push(P('legA',rect(252,620,22,34),'#5c4f42',{edge:2}),P('legB',rect(990,620,22,34),'#5c4f42',{edge:2}));
    items.push(P('post',rect(990,470,32,152),'#8a7b64',{sh:5}));
    items.push(P('mattress',rect(282,520,712,46),'#efe8d8',{sh:3}),P('pillow',disc(410,507,78,26,20),'#efe8d8',{sh:4}));
    items.push(P('scarfHang',[[982,488],[1030,486],[1036,512],[1022,600],[1004,604],[1004,520],[984,514]],'#b9664d',{edge:3,sh:4}),P('scarfFringe',[[1004,600],[1022,600],[1020,618],[1006,618]],'#8a4436',{edge:2,sh:0}));
    // 梦：暖色气泡里两人同撑一把伞；拍点 149.77 起晃动，150.40 碎成纸片下落
    const shake=t>=149.77&&t<150.4?Math.sin(t*70)*10*ease((t-149.77)/.4):0,broke=t>=150.4,dt=t-150.4;
    const bx=370+shake,by=120,bw=420,bh=220;
    if(!broke){
      items.push(P('thought1',disc(450,440,12),'#f3dfa6',{sh:3}),P('thought2',disc(470,388,19),'#f3dfa6',{sh:3}));
      items.push(P('dream',[[bx,by+20],[bx+20,by],[bx+bw-20,by],[bx+bw,by+20],[bx+bw,by+bh-20],[bx+bw-20,by+bh],[bx+20,by+bh],[bx,by+bh-20]],'#f3dfa6',{sh:7}));
      items.push(P('dreamSun',disc(bx+350,by+70,30),'#e7bf6e',{edge:2,sh:2}),P('dreamHill',[[bx+12,by+bh-50],[bx+160,by+bh-82],[bx+320,by+bh-60],[bx+bw-12,by+bh-78],[bx+bw-12,by+bh-12],[bx+12,by+bh-12]],'#c5d0b4',{edge:2,sh:2}));
      items.push(...person(ctx,{x:bx+190,y:by+bh-26,size:120,facing:'right',expression:'smile',t,key:'dreamHer',seed:.6}));
      items.push(...person(ctx,{x:bx+262,y:by+bh-26,size:132,facing:'left',expression:'smile',t,hold:{type:'umbrella',color:'#efe8d8',tilt:.1},key:'dreamHim',seed:.1},{recolor:OTHER,drop:/scarf/}));
    }else if(dt<2.2){
      // 碎片：把梦切成 5×3 块，各自带着下落、旋转、变淡
      for(let r=0;r<3;r++)for(let c=0;c<5;c++){
        const id=r*5+c,j=(i,a)=>(noise(id*13+i)-.5)*a,x0=bx+c*bw/5,y0=by+r*bh/3,w=bw/5,h=bh/3;
        const pts=[[x0+j(1,14),y0+j(2,10)],[x0+w+j(3,14),y0+j(4,10)],[x0+w+j(5,14),y0+h+j(6,10)],[x0+j(7,14),y0+h+j(8,10)]];
        const cx=x0+w/2,cy=y0+h/2,vx=(noise(id+40)-.5)*160,rot=(noise(id+60)-.5)*2.4*dt,fall=60*dt+420*dt*dt*(.7+noise(id+80)*.6);
        const moved=pts.map(([x,y])=>{const dx=x-cx,dy=y-cy;return [cx+vx*dt+dx*Math.cos(rot)-dy*Math.sin(rot),cy+fall+dx*Math.sin(rot)+dy*Math.cos(rot)];});
        items.push(P(`shard${id}`,moved,[ '#f3dfa6','#e3b9a4','#c5d0b4'][(r*2+c)%3],{a:1-clamp(dt/2.2),sh:4}));
      }
    }
    // 她：躺着（lean≈-π/2，头在左）→ 第 31 句起猛地坐起并略过头回弹 → 第 32 句塌下去 → 最后抬头望窗
    const sit=back((t-149.95)/1.05),slump=ease((t-152.8)/1.3),look=ease((t-155.25)/.8);
    const lean=lerp(-1.52,0,sit)+.34*slump*(1-look)+.06*look,head=.38*slump*(1-look)-.5*look;
    const expression=t<149.95?'sleep':t<152.8?'calm':look>.5?'calm':'sad';
    items.push(...person(ctx,{x:560,y:522,size:262,seat:true,legs:false,facing:'right',expression,t,pose:{lean,head,arms:[[.15,.2],[.1,.25]]},key:'her',seed:.3}));
    items.push(P('blanket',[[520,500],[995,492],[1004,572],[505,578]],'#6f8f7b',{sh:6}),P('fold',[[520,500],[640,496],[648,522],[524,528]],'#9fb294',{edge:3,sh:3}));
    return {cam,items};
  }
},
{
  id:'s3',n:3,start:156.4,end:162.1,key:159.95,lines:[33,34],title:'翻越',
  say:'笑着原谅，然后自己走过去。',
  picture:'从窗里的天空往下摇到清晨山坡。她侧面向右上坡，嘴角带一点心酸的笑；第 34 句（约 159.8 秒）走上坡顶停下，坡那边露出河谷和日出，围巾被风吹起。',
  camera:'开头约 0.9 秒从天空落到山坡；之后跟着她向右走，一个方向到底',mood:'粉蓝晨色 → 坡顶暖金',
  beat:'156.39 拍：接上一镜；159.45/159.94 拍：踏上坡顶',next:'（整片里接第 35 句）她在坡顶站定，镜头继续向右越过坡顶',
  scene(t,ctx){
    const ground=x=>x<1500?760-(x-300)*.25:460+(x-1500)*.3;
    const walkEnd=159.8,x=t<walkEnd?lerp(520,1478,clamp((t-156.4)/(walkEnd-156.4))):1478+22*ease((t-walkEnd)/.6);
    const y=ground(x),settle=ease((t-156.4)/.95),reveal=ease((t-159.4)/2.7);
    const follow={x:x+160+260*reveal,y:y-235};
    const cam={x:lerp(follow.x+80,follow.x,settle),y:lerp(60,follow.y,settle),z:lerp(2.6,1,settle)};
    const warm=ease((t-158.6)/3),items=[{t:'sky',bands:['#cddbd8','#cddbd8',mix('#e3b9a4','#f3dfa6',warm*.6),mix('#e3b9a4','#f3dfa6',warm)],y0:0,y1:600}];
    // 远景跟镜头走得慢（视差）；坡顶就是地平线，坡那边的河谷比坡顶略低、在画面里露出来
    const par=(px,k)=>px+(cam.x-800)*(1-k),sunY=330-80*ease((t-157)/5);
    items.push(P('sunGlow',disc(par(1600,.3),sunY,160),'#f3dfa6',{glow:true,a:.25+.25*warm}),P('sun',disc(par(1600,.3),sunY,62),'#e7bf6e',{edge:4,sh:3}));
    const ridge=[];for(let i=0;i<=12;i++)ridge.push([par(400+i*260,.35),i%2?380-noise(i)*30:270+noise(i+4)*40]);
    items.push(P('farHills',[...ridge,[par(3520,.35),620],[par(400,.35),620]],'#a9c2c4',{torn:4,sh:5}));
    items.push(P('valley',[[par(1000,.55),445],[par(2000,.55),430],[par(3400,.55),450],[par(3400,.55),900],[par(1000,.55),900]],mix('#c5d0b4','#f3dfa6',warm*.3),{torn:3,sh:4}));
    items.push(P('river',[[par(1500,.55),500],[par(1900,.55),478],[par(2400,.55),506],[par(3400,.55),484],[par(3400,.55),512],[par(2400,.55),536],[par(1900,.55),510],[par(1500,.55),526]],'#a9c2c4',{sh:2}));
    for(let i=0;i<7;i++){const hx=par(2050+i*62,.55),hy=452+noise(i)*14;items.push(P(`house${i}`,[[hx,hy],[hx+20,hy-16],[hx+40,hy],[hx+40,hy+24],[hx,hy+24]],i%2?'#d9cfb8':'#b9ab8e',{edge:2,sh:2}));}
    const hill=[[-600,1400]];for(let gx=-600;gx<=3400;gx+=100)hill.push([gx,ground(gx)]);hill.push([3400,1400]);
    items.push(P('hill',hill,mix('#6f8f7b','#9fb294',warm*.4),{torn:3,sh:8}));
    const path=[];for(let gx=-600;gx<=3400;gx+=100)path.push([gx,ground(gx)-2]);for(let gx=3400;gx>=-600;gx-=100)path.push([gx,ground(gx)+16]);
    items.push(P('path',path,'#b9ab8e',{edge:0,sh:2}));
    // 坡顶前的一棵树
    items.push(P('trunk',[[1255,ground(1255)+4],[1268,ground(1268)-170],[1280,ground(1280)-170],[1290,ground(1290)+4]],'#5c4f42',{edge:3,sh:4}));
    for(let i=0;i<7;i++){const a=i*2.4,cx=1272+Math.cos(a)*(60+noise(i)*30),cy=ground(1272)-210+Math.sin(a)*55;items.push(P(`leaf${i}`,disc(cx+Math.sin(t*1.2+i)*3,cy,46,38,10),i%3?'#47685f':'#6f8f7b',{edge:3,sh:4}));}
    for(let i=0;i<34;i++){const gx=-300+i*100+noise(i)*60,gy=ground(gx),bend=Math.sin(t*2.2+i)*6*(1+warm);items.push(L(`grass${i}`,[[gx,gy+2],[gx+bend,gy-22]],'#47685f',3));}
    items.push(...person(ctx,{x,y,size:250,facing:'right',action:t<walkEnd+.3?'walk':'idle',u:(x-520)/120,t,expression:'smile',wind:.35+.4*warm,pose:t<walkEnd?{lean:.1}:{lean:.1-.1*reveal,head:-.22*reveal},key:'her',seed:.3}));
    return {cam,items};
  }
},
{
  id:'s4',n:4,start:233.7,end:245.6,key:240.6,lines:[48,49],title:'选择',
  say:'终于懂了：快乐不是等来的，是自己选的。',
  picture:'黄昏河岸的岔路口。她先侧身望着左边树荫下的空长椅（样片里的那张）；第 48 句里低头、再抬头；第 49 句开头卡拍转身，沿右边洒满阳光的小路走远。',
  camera:'中景，慢拉 1.06→1.00，只拉一次',mood:'左侧树荫偏冷，右侧暖金逆光；光点向上飘',
  beat:'234.17 拍：第 48 句起；237.75 拍：转身；244.85 拍：最后一字落下',next:'（整片里接尾奏）她走进光里变小，画面留给河面和光',
  scene(t,ctx){
    const pull=ease((t-this.start)/(this.end-this.start)),cam={x:800+20*pull,y:448,z:1.06-.06*pull};
    const go=t>=237.75,p=ease((t-237.75)/7.6);
    const items=[{t:'sky',bands:['#efe8d8','#f3dfa6','#f3dfa6','#e7bf6e'],y0:0,y1:440}];
    items.push(P('sunGlow',disc(1270,330,170),'#f3dfa6',{glow:true,a:.3+.2*p}),P('sun',disc(1270,330,58),'#e7bf6e',{edge:4,sh:3}));
    items.push(P('farBank',[[-100,420],[300,380],[700,410],[1050,370],[1500,400],[1700,390],[1700,470],[-100,470]],'#9fb294',{torn:4,sh:5}));
    for(let i=0;i<8;i++){const hx=880+i*48,hy=392+noise(i+5)*16;items.push(P(`town${i}`,[[hx,hy],[hx+18,hy-16],[hx+36,hy],[hx+36,hy+26],[hx,hy+26]],i%2?'#d9cfb8':'#b9ab8e',{edge:2,sh:2}));}
    items.push(P('river',[[-100,462],[1700,456],[1700,540],[-100,548]],'#a9c2c4',{sh:4}));
    for(let i=0;i<14;i++){const gx=980+noise(i+20)*520,gy=470+noise(i+30)*60,len=20+noise(i)*40,a=.35+.4*Math.max(0,Math.sin(t*2.4+i))+.2*ctx.pulse;items.push(L(`glint${i}`,[[gx,gy],[gx+len,gy]],'#f3dfa6',3,{a:Math.min(1,a),boil:false}));}
    items.push(P('bank',[[-100,530],[1700,522],[1700,1100],[-100,1100]],'#c5d0b4',{torn:3,sh:6}));
    // 两条路：左边进树荫通向空长椅，右边进阳光
    items.push(P('pathL',[[700,742],[836,742],[470,634],[412,634]],'#b9ab8e',{edge:0,sh:2}));
    items.push(P('pathR',[[736,742],[880,742],[1296,530],[1252,530]],'#d9cfb8',{edge:0,sh:2}));
    items.push(P('pathStem',[[640,920],[940,920],[880,742],[700,742]],'#d9cfb8',{edge:0,sh:2}));
    items.push(P('shade',[[-100,500],[700,520],[820,760],[-100,800]],'#47685f',{glow:false,a:.32,edge:0,sh:0}));
    // 空长椅（样片的那张），在树荫里
    items.push(P('benchSeat',[[300,604],[420,602],[422,612],[298,614]],'#49686a',{edge:3,sh:4}),P('benchBack',[[302,572],[418,570],[418,580],[302,582]],'#738a7d',{edge:3,sh:3}));
    items.push(P('benchLegA',rect(308,612,6,26),'#38565b',{edge:2}),P('benchLegB',rect(406,610,6,26),'#38565b',{edge:2}));
    items.push(P('treeTrunk',[[150,640],[175,240],[200,240],[228,640]],'#5c4f42',{sh:6}));
    for(let i=0;i<9;i++){const a=i*2.3,cx=190+Math.cos(a)*(150+noise(i)*60),cy=210+Math.sin(a)*90;items.push(P(`canopy${i}`,disc(cx+Math.sin(t+i)*3,cy,110,80,12),i%3?'#47685f':'#6f8f7b',{sh:6}));}
    for(let i=0;i<30;i++){const gx=-80+i*60+noise(i+3)*40,gy=600+noise(i+9)*160,bend=Math.sin(t*1.8+i)*5;items.push(L(`grass${i}`,[[gx,gy],[gx+bend,gy-20]],'#6f8f7b',3));}
    for(let i=0;i<18;i++){const mx=900+noise(i+70)*600,my=760-((t*28+noise(i+90)*500)%500),a=clamp(.25+p*.6)*(.4+.6*noise(i+5));items.push(P(`mote${i}`,disc(mx+Math.sin(t+i)*10,my,4),'#f3dfa6',{a,edge:0,sh:0}));}
    // 她：先望长椅（向左），低头又抬头；237.75 拍转身向右，沿亮的那条路走远（近大远小）
    const nod=ease((t-235.6)/.6)-ease((t-236.6)/.9);
    const x=go?lerp(790,1235,p):790,y=go?lerp(735,540,p):735,size=go?lerp(230,118,p):230;
    items.push(...person(ctx,{x,y,size,facing:go?'right':'left',action:go?'walk':'idle',u:(t-237.75)*2,t,expression:go?'smile':nod>.2?'sad':'calm',wind:.35,pose:go?{}:{head:.35*nod},key:'her',seed:.3}));
    return {cam,items};
  }
}];

export function shotAt(time){return SHOTS.find(s=>time>=s.start&&time<s.end)||null;}
