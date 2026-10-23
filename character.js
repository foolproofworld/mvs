// character.js：主角草案——短发、灰蓝长外套、锈红围巾的年轻女生。造型仅供分镜试做，尚未经用户确认。
// build(o) 只看参数、不存状态，输出世界坐标里的部件，交给各画风用自己的画法画：
//   o.x, o.y      脚底中点（o.seat 时为臀部坐点）
//   o.size        身高（像素）
//   o.facing      'left' | 'right' | 'back' | 'front'
//   o.expression  'calm' | 'sad' | 'smile' | 'sleep'
//   o.action      'idle' | 'walk'；o.u 为走路相位（步数，可小数），o.t 为全片时间（呼吸、眨眼）
//   o.pose        覆盖姿势：lean 身体前倾、head 低头、arm 抬手（弧度）
//   o.legs        false 时不画腿（被子里）；o.hold = {type:'umbrella', color, tilt}
//   o.steps       走路离散成几张（像素风 4），不传则连续补间
//   o.key         部件种子前缀；o.wind 0–1 围巾被风吹起的程度
export const LOOK={hair:'#2a2423',skin:'#e8c4a6',coat:'#6d7f8c',coatShade:'#4a5a66',scarf:'#b9664d',scarfShade:'#8a4436',legs:'#2b3d4a',shoe:'#1d2a35',line:'#1d2a35'};
const TAU=Math.PI*2;
const dir=a=>[Math.sin(a),Math.cos(a)];
const add=(p,v,k=1)=>[p[0]+v[0]*k,p[1]+v[1]*k];
const quad=(a,b,w0,w1)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;return [[a[0]+nx*w0,a[1]+ny*w0],[b[0]+nx*w1,b[1]+ny*w1],[b[0]-nx*w1,b[1]-ny*w1],[a[0]-nx*w0,a[1]-ny*w0]];};
const ring=(c,rx,ry,n=18,a0=0,a1=TAU)=>Array.from({length:n},(_,i)=>{const a=a0+(a1-a0)*i/(n-1+(a1-a0<TAU?0:1));return [c[0]+Math.cos(a)*rx,c[1]+Math.sin(a)*ry];});

export function pose(o){
  const p={lean:0,head:0,arm:0,bob:0,legs:[[0,0],[0,0]],arms:[[0,.12],[0,.12]],lift:[0,0]};
  const breath=Math.sin((o.t||0)*TAU/3.6)*.008;
  if(o.action==='walk'){
    let phase=(o.u||0)*Math.PI;
    if(o.steps)phase=Math.floor(phase/TAU*o.steps)/o.steps*TAU;
    for(let i=0;i<2;i++){const f=phase+i*Math.PI;p.legs[i]=[.42*Math.sin(f),.1+.65*Math.max(0,Math.cos(f))];p.arms[i]=[-.32*Math.sin(f),.28];p.lift[i]=Math.max(0,Math.sin(f))*.05;}
    p.bob=-.012*Math.cos(2*phase);
  }else p.bob=breath;
  Object.assign(p,o.pose||{});
  return p;
}

// 输出 {parts, hands}：parts 按前后顺序，坐标已换到世界坐标
export function build(o){
  const H=o.size,f=o.facing==='left'?-1:1,side=o.facing==='left'||o.facing==='right',view=side?'side':o.facing;
  const P=pose(o),key=o.key||'hero',parts=[],g=key;
  const W=(p)=>[o.x+p[0]*H*f,o.y+p[1]*H];   // 局部坐标（以身高为 1，脚底为 0，向前为 +x）→ 世界
  const poly=(name,pts,c,extra={})=>parts.push({t:'poly',k:`${key}-${name}`,g,p:pts.map(W),c,edge:3,sh:2,...extra});
  const mark=(name,pts,c=LOOK.line,w=.006)=>parts.push({t:'mark',k:`${key}-${name}`,g,p:pts.map(W),c,w:w*H});
  const hip=o.seat?[0,0]:[0,-.47+P.bob];
  const up=[Math.sin(P.lean),-Math.cos(P.lean)];
  const shoulder=add(hip,up,.33+P.bob*.5),neck=add(hip,up,.37);
  const hd=[Math.sin(P.lean+P.head),-Math.cos(P.lean+P.head)];
  const head=add(neck,hd,.085);
  const across=[-up[1],up[0]];                    // 垂直于身体的方向
  const hand=[];
  // 背面：伞柄在身后；腿、手、外套、头、伞依次叠
  const umbrella=o.hold?.type==='umbrella';
  const limbs=(which)=>{
    if(side){
      const order=which==='back'?[1]:[0];
      for(const i of order){
        if(o.legs!==false){
          const [th,kn]=P.legs[i],knee=add(hip,dir(th),.24),foot=add(knee,dir(th-kn),.23);
          const c=i?LOOK.shoe:LOOK.legs;
          poly(`thigh${i}`,quad(hip,knee,.04,.034),i?'#24333e':LOOK.legs);poly(`shin${i}`,quad(knee,foot,.034,.026),i?'#24333e':LOOK.legs);
          poly(`shoe${i}`,[add(foot,[-.025,-.012]),add(foot,[.06,-.008]),add(foot,[.065,.012]),add(foot,[-.028,.012])],c,{edge:2});
        }
      }
    }else if(which==='back'&&o.legs!==false){
      for(let i=0;i<2;i++){const x=(i?.055:-.055)+(P.lift[i]?Math.sin((o.u||0)*Math.PI)*.004:0),top=[x,hip[1]+.02],foot=[x,-P.lift[i]];
        poly(`leg${i}`,quad(top,foot,.04,.03),LOOK.legs);poly(`shoe${i}`,[[x-.035,foot[1]-.03],[x+.035,foot[1]-.03],[x+.04,foot[1]+.005],[x-.04,foot[1]+.005]],LOOK.shoe,{edge:2});}
    }
  };
  const arm=(i)=>{
    const raise=umbrella&&i===0;
    if(side){
      const s=add(shoulder,across,i?.02:-.02),[a,b]=raise?[1.2+(P.arm||0),1.4]:P.arms[i];
      // 手臂角度相对身体：身体前倾 lean 时，向下的方向是 dir(a-lean)
      const e=add(s,dir(a-P.lean),.17),h=add(e,dir(a+b-P.lean),.16);
      poly(`upper${i}`,quad(s,e,.032,.028),i?LOOK.coatShade:LOOK.coat);poly(`fore${i}`,quad(e,h,.028,.024),i?LOOK.coatShade:LOOK.coat);
      poly(`hand${i}`,ring(h,.022,.022,8),LOOK.skin,{edge:2});hand[i]=h;
    }else{
      const sx=(i?1:-1)*.105,s=add(shoulder,across,sx),swing=P.arms[i][0]*.3;
      if(raise){const h=add(shoulder,[0,1],.1);hand[i]=h;if(view==='front'){poly(`upper${i}`,quad(s,add(s,[.02,.12]),.03,.027),LOOK.coat);poly(`fore${i}`,quad(add(s,[.02,.12]),h,.027,.024),LOOK.coat);poly(`hand${i}`,ring(h,.022,.022,8),LOOK.skin,{edge:2});}return;}
      const e=add(s,[sx*.12+swing*.2,.17]),h=add(e,[sx*.05,.16]);
      poly(`upper${i}`,quad(s,e,.032,.028),LOOK.coat);poly(`fore${i}`,quad(e,h,.028,.024),LOOK.coat);
      poly(`hand${i}`,ring(h,.022,.022,8),view==='back'?LOOK.skin:LOOK.skin,{edge:2});hand[i]=h;
    }
  };
  const tilt=o.hold?.tilt||0;
  const shaft=()=>{const h=hand[0];mark('shaft',[h,add(h,[Math.sin(tilt),-Math.cos(tilt)],.4)],'#3a3634',.008);};
  const canopy=()=>{
    const top=add(hand[0],[Math.sin(tilt),-Math.cos(tilt)],.4),r=.36,n=13,rim=[];
    for(let i=0;i<n;i++){const a=Math.PI+Math.PI*i/(n-1)+tilt;rim.push([top[0]+Math.cos(a)*r,top[1]+.06+Math.sin(a)*r*.55]);}
    const L=rim[0],R=rim[n-1],lower=[];
    for(let j=1;j<6;j++){const s=j/6;lower.push(add([R[0]+(L[0]-R[0])*s,R[1]+(L[1]-R[1])*s],[Math.sin(tilt),-Math.cos(tilt)],j%2?.045:.012));}
    poly('canopy',[...rim,...lower],o.hold.color||'#d9cfb8',{edge:3,sh:4});
  };
  limbs('back');
  // 背面：伞握在身前，只露出头顶上方的伞柄
  if(umbrella&&view==='back'){hand[0]=add(shoulder,[0,1],.1);shaft();}
  if(side)arm(1);
  // 外套：肩到下摆的梯形，侧面偏窄
  const sw=side?.085:.115,hw=side?.12:.14,hem=add(hip,up,-.2);
  const hemAcross=across;
  if(side&&o.legs!==false)limbs('front');
  poly('coat',[add(shoulder,across,-sw),add(shoulder,across,sw+(side?.01:0)),add(hem,hemAcross,hw+(side?.02:0)),add(hem,hemAcross,-hw)],LOOK.coat,{edge:3,sh:3});
  if(!side){arm(0);arm(1);}
  // 围巾：领口一圈，尾巴随风
  const wind=o.wind||0,tailBase=add(neck,across,side?-.05:-.03);
  poly('scarf',[add(neck,across,-.07),add(neck,across,.07),add(add(neck,across,.075),up,-.05),add(add(neck,across,-.075),up,-.05)],LOOK.scarf,{edge:2});
  const tail=[tailBase];let ang=side?.35*(1+wind*2.6):.08;
  for(let i=1;i<=4;i++){ang+=(side?.12:.04)*Math.sin((o.t||0)*(3+wind*5)+i*1.3)*(.4+wind);tail.push(add(tail[i-1],[side?-Math.sin(ang):Math.sin(ang),Math.cos(ang)*(1-wind*.6)],.055));}
  const tailPoly=[...tail.map(p=>add(p,across,-.022)),...tail.slice().reverse().map(p=>add(p,across,.022))];
  poly('scarfTail',tailPoly,LOOK.scarfShade,{edge:2});
  // 头与头发
  const hr=.088;
  if(view!=='back')poly('head',ring(head,hr*.92,hr,20),LOOK.skin,{edge:3});
  if(view==='back')poly('hair',[...ring(head,hr,hr,16,Math.PI,TAU),add(head,[hr,hr*.55]),add(head,[0,hr*.75]),add(head,[-hr,hr*.55])],LOOK.hair,{edge:3});
  else if(side){const a=P.lean+P.head,c=Math.cos(a),n=Math.sin(a),r=([x,y])=>[head[0]+c*x-n*y,head[1]+n*x+c*y];
    poly('hair',[...ring([0,0],hr*1.04,hr*1.06,14,Math.PI*.95,Math.PI*2.05),[hr*.3,-hr*.35],[-hr*.9,hr*.65],[-hr*1.08,hr*.1]].map(r),LOOK.hair,{edge:3});}
  else poly('hair',[...ring(head,hr*1.05,hr*1.05,16,Math.PI*.98,Math.PI*2.02),add(head,[hr*1.05,hr*.6]),add(head,[hr*.78,hr*.62]),add(head,[hr*.7,-hr*.25]),add(head,[-hr*.7,-hr*.25]),add(head,[-hr*.78,hr*.62]),add(head,[-hr*1.05,hr*.6])],LOOK.hair,{edge:3});
  // 表情：眨眼按 t 算；sleep 闭眼，sad 眉尾下垂，smile 嘴角上扬
  if(view!=='back'){
    const blink=((o.t||0)*.27+(o.seed||0))%1<.035,closed=o.expression==='sleep'||blink;
    const a=side?P.lean+P.head:0,ex=side?[.045]:[-.034,.034];
    for(const x of ex){
      const e=add(head,[Math.cos(a)*x-Math.sin(a)*-.004,Math.sin(a)*x+Math.cos(a)*-.004]);
      if(closed)mark(`eye${x}`,[add(e,[-.012,0]),add(e,[0,.006]),add(e,[.012,0])],LOOK.line,.005);
      else mark(`eye${x}`,[add(e,[0,-.006]),add(e,[0,.008])],LOOK.line,.012);
      if(o.expression==='sad'||o.expression==='smile')mark(`brow${x}`,[add(e,[-.016*Math.sign(x||1),-.032]),add(e,[.014*Math.sign(x||1),-.024])],LOOK.line,.005);
    }
    const m=add(head,side?[Math.cos(a)*.05-Math.sin(a)*.045,Math.sin(a)*.05+Math.cos(a)*.045]:[0,.048]);
    if(o.expression==='smile')mark('mouth',[add(m,[-.016,-.004]),add(m,[0,.006]),add(m,[.016,-.004])],LOOK.line,.005);
    else if(o.expression==='sad')mark('mouth',[add(m,[-.013,.004]),add(m,[0,-.002]),add(m,[.013,.004])],LOOK.line,.005);
    else if(o.expression!=='sleep')mark('mouth',[add(m,[-.01,0]),add(m,[.01,0])],LOOK.line,.005);
  }
  if(side)arm(0);
  if(umbrella){if(view!=='back')shaft();canopy();}
  parts.push({t:'group-end',g,oc:LOOK.line});
  return {parts,hands:hand.map(h=>h&&W(h)),head:W(head)};
}

export function handAt(o,which='right'){const {hands}=build(o);return hands[which==='left'?1:0];}
