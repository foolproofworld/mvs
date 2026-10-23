const $=id=>document.getElementById(id);
const fields={charStart:'start',charEnd:'end',charAppear:'appearAt',charDisappear:'disappearAt'};
export function createCharEditor({getLines,getShift,getTime,onChange,onListen}) {
  let lineIndex=0,charIndex=0;
  const current=()=>{const l=getLines()[lineIndex];return {line:l,char:l?.chars[charIndex],lineIndex,charIndex};};
  function choose(li,ci=0){lineIndex=li;charIndex=ci;refresh();}
  function refresh(){
    const lines=getLines();if(!lines.length)return;
    const {line,char}=current();
    if(!$('editLine').options.length)lines.forEach((l,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1}. ${l.text} · ${l.section}`;$('editLine').append(option);});
    $('editLine').value=lineIndex;
    $('charButtons').replaceChildren();
    line.chars.forEach((c,i)=>{const b=document.createElement('button');b.className=(i===charIndex?'picked ':'')+(c.verified?'confirmed':'');b.setAttribute('aria-label',`第${i+1}字 ${c.text}`);b.setAttribute('aria-pressed',String(i===charIndex));const glyph=document.createElement('span');glyph.textContent=c.text;const small=document.createElement('small');small.textContent=`${(c.end-c.start).toFixed(3)}s`;b.append(glyph,small);b.onclick=()=>choose(lineIndex,i);$('charButtons').append(b);});
    const values={start:char.start,end:char.end,appearAt:char.appearAt??char.start-.12,disappearAt:char.disappearAt??line.end+.35};
    Object.entries(fields).forEach(([id,key])=>{$(id).value=Math.max(0,values[key]).toFixed(3);});
    $('charVerified').checked=!!char.verified;
    $('charEmphasis').value=char.emphasis??1;
    const human=char.method==='human-adjusted';
    const online=char.method?.startsWith('krc-');
    const caution=!human&&!online&&(char.probability??0)<.35?' · 低置信，优先核对':'';
    $('charEditorInfo').textContent=`第 ${lineIndex+1} 句 · 第 ${charIndex+1} 字「${char.text}」 · 唱音 ${(char.end-char.start).toFixed(3)}s · 画面 ${(values.disappearAt-values.appearAt).toFixed(3)}s · ${human?'人工调整':online?'网络原始逐字时间':char.method?.includes('character-attention')?'逐字模型候选':'旧版估计'}${char.verified?' · 已确认':' · 待试听'}${caution}`;
    $('verifiedCount').textContent=`全曲已确认 ${lines.flatMap(l=>l.chars).filter(c=>c.verified).length} / ${lines.reduce((n,l)=>n+l.chars.length,0)} 字`;
  }
  function commit(patch){
    const {line,char}=current();if(!char)return;
    const c={...char,appearAt:char.appearAt??char.start-.12,disappearAt:char.disappearAt??line.end+.35,...patch};
    if('start' in patch&&!('appearAt' in patch))c.appearAt=Math.min(c.appearAt,c.start);
    if('end' in patch&&!('disappearAt' in patch))c.disappearAt=Math.max(c.disappearAt,c.end+.12);
    if(![c.start,c.end,c.appearAt,c.disappearAt,c.emphasis??1].every(Number.isFinite)||c.start<0||c.end<=c.start||c.appearAt<0||c.appearAt>c.start||c.disappearAt<c.end||c.disappearAt>270.048||(c.emphasis??1)<0||(c.emphasis??1)>2){$('editorError').textContent='需满足：0 ≤ 出现 ≤ 唱入 < 唱止 ≤ 退场 ≤ 全曲时长，强调强度为 0–2';refresh();return;}
    if((charIndex>0&&c.start<=line.chars[charIndex-1].start)||(charIndex<line.chars.length-1&&c.start>=line.chars[charIndex+1].start)){$('editorError').textContent='唱入时间须保持本句各字的先后顺序';refresh();return;}
    $('editorError').textContent='';
    onChange(lineIndex,charIndex,{start:c.start,end:c.end,appearAt:c.appearAt,disappearAt:c.disappearAt,emphasis:c.emphasis??1,verified:'verified' in patch?patch.verified:false,method:'human-adjusted'});
    refresh();
  }
  $('editLine').onchange=e=>choose(Number(e.target.value));
  Object.entries(fields).forEach(([id,key])=>{$(id).onchange=e=>commit({[key]:Number(e.target.value)});});
  function shiftBy(delta){const {line,char}=current();commit({start:char.start+delta,end:char.end+delta,appearAt:(char.appearAt??char.start-.12)+delta,disappearAt:(char.disappearAt??line.end+.35)+delta});}
  $('charEarlier').onclick=()=>shiftBy(-.02);$('charLater').onclick=()=>shiftBy(.02);
  $('markStart').onclick=()=>commit({start:getTime()-getShift(current().line)});
  $('markEnd').onclick=()=>commit({end:getTime()-getShift(current().line)});
  $('listenChar').onclick=()=>onListen(lineIndex,charIndex);
  $('resetChar').onclick=()=>{onChange(lineIndex,charIndex,null);refresh();};
  $('charVerified').onchange=e=>commit({verified:e.target.checked});
  $('charEmphasis').onchange=e=>commit({emphasis:Number(e.target.value)});
  return {choose,refresh,current};
}
