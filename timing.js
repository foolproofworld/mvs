export function sampleLine(line, audioTime, offsetMs=0, lineOffsetMs=0) {
  const time=audioTime-(offsetMs+lineOffsetMs)/1000;
  const visibleStart=Math.min(...line.chars.map(c=>c.appearAt??c.start-.12));
  const visibleEnd=Math.max(...line.chars.map(c=>c.disappearAt??line.end+.35));
  return {time, active:time>=visibleStart && time<visibleEnd, charIndex:line.chars.findLastIndex(c=>time>=c.start)};
}
export function selectLine(lines,time,offsetMs=0,lineOffsets={}) {
  // A positive offset delays lyrics. Search from the end to resolve draft overlaps.
  return lines.findLastIndex(l=>sampleLine(l,time,offsetMs,lineOffsets[l.id]||0).active);
}
export function jumpAt(time,start) {
  if(time<=start || time>=start+.2)return 0;
  const progress=Math.max(0,Math.min(1,(time-start)/.2));
  return Math.sin(Math.PI*progress);
}
export function formatTime(value) {
  const t=Number.isFinite(value)?Math.max(0,value):0;
  return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
}

export function glyphState(time,char,lineEnd) {
  const duration=Math.max(.02,char.end-char.start);
  const appearAt=char.appearAt??char.start-.12;
  const disappearAt=char.disappearAt??lineEnd+.35;
  const onset=time-char.start;
  const active=time>=char.start && time<char.end;
  const sung=time>=char.start;
  const progress=Math.max(0,Math.min(1,onset/duration));
  // Longer singing sustains the lift; release is tied to THIS glyph's end.
  const attack=Math.min(.10,duration*.25);
  const release=Math.min(.16,duration*.3);
  const lift=active?Math.min(1,Math.max(0,onset/attack),Math.max(0,(char.end-time)/release)):0;
  const fade=Math.min(1,Math.max(0,(time-appearAt)/.08),Math.max(0,(disappearAt-time)/.12));
  return {active,sung,progress,lift,opacity:time>=appearAt&&time<disappearAt?fade:0,duration};
}

export function applyCharEdits(baseLines,edits) {
  return baseLines.map(line=>{
    const chars=line.chars.map((c,index)=>({...c,...(edits[`${line.id}:${index}`]||{})}));
    return {...line,chars,start:Math.min(...chars.map(c=>c.start)),end:Math.max(...chars.map(c=>c.end))};
  });
}
