export const SAMPLE={start:44.45,end:75.5,opening:25.8};
export const STYLES=[
  {id:'paper',name:'纸艺拼贴',number:'01',reason:'把回忆留在纸上，放开的动作轻一点。',palette:['#e9e4d8','#8ca299','#47686a','#b9664d']},
  {id:'pencil',name:'铅笔绘本',number:'02',reason:'细密笔触与留白，保留平静里的心酸。',palette:['#f0ebdf','#a8b5b2','#566d71','#aa614b']},
  {id:'pixel',name:'像素回忆',number:'03',reason:'低分辨率的旧日街景，让告别带一点距离。',palette:['#c0cfbf','#72978e','#243f4b','#b85b43']},
];
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{const x=clamp(v);return x*x*(3-2*x);};
export const noise=(seed)=>{const x=Math.sin(seed*127.1+311.7)*43758.5453123;return x-Math.floor(x);};

export function beatEnvelope(time,beats){
  let lo=0,hi=beats.length-1,index=-1;
  while(lo<=hi){const mid=(lo+hi)>>1;if(beats[mid]<=time){index=mid;lo=mid+1;}else hi=mid-1;}
  if(index<0)return 0;
  const elapsed=time-beats[index];
  return elapsed<.3?Math.exp(-elapsed*12):0;
}

export function sceneState(time,beats=[],reducedMotion=false){
  const t=Math.max(20.7,Math.min(SAMPLE.end,time));
  const frame=reducedMotion?0:Math.floor(t*12);
  const visualTime=reducedMotion?t:frame/12;
  const warm=ease((visualTime-51.8)/12);
  const release=ease((visualTime-44.2)/15);
  return {time:visualTime,frame,warm,release,
    wind:reducedMotion?0:Math.sin(frame/12*.8),
    cloud:reducedMotion?0:Math.floor((t-20.7)*.8),
    pulse:reducedMotion?0:beatEnvelope(visualTime,beats),
    zoom:reducedMotion?1:1+ease((visualTime-20.7)/54.8)*.025,
    rain:1-ease((visualTime-49)/15),
  };
}
