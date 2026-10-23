// Every visual unit is one source character, with its original KRC timing.
export function groupWords(line) {
  return line.chars.map((char, index) => ({
    text: char.text, from: index, to: index + 1,
    start: char.start, end: char.end,
    disappearAt: char.disappearAt ?? line.end + .35,
    emphasis: char.emphasis ?? 1,
    expressive: false,
  }));
}

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => {const t = clamp(value); return t*t*(3-2*t);};

export function wordState(time, word, {reducedMotion = false} = {}) {
  const age = time - word.start;
  const duration = word.end - word.start;
  // Quick syllables settle quickly enough to keep their vocal attack clear.
  const arrival = Math.min(word.expressive ? .18 : .13, Math.max(.045, duration * .4));
  const entered = smooth(age / (reducedMotion ? Math.min(.06,arrival) : arrival));
  const leaving = smooth((word.disappearAt - time) / .3);
  const active = time >= word.start && time < word.end;
  // Each word's own singing interval controls the sustained emphasis, including
  // long notes and rests. Everything is sampled from the media clock, not CSS timers.
  const hold = active ? smooth(age / Math.min(.16, duration * .25)) * smooth((word.end - time) / Math.min(.24, duration * .3)) : 0;
  const strength = Math.min(2, Math.max(0, word.emphasis));
  return {
    active, opacity: entered * leaving,
    y: reducedMotion ? 0 : (1-entered)*(word.expressive ? 7 : 5) - hold*1.8*strength,
    blur: reducedMotion ? 0 : (1-entered)*(word.expressive ? 2 : 1.5),
    scale: reducedMotion ? 1 : 1 + hold*.014*strength,
    warmth: hold * (word.expressive ? 1 : .5),
    glow: reducedMotion ? 0 : hold * (word.expressive ? 15 : 5) * strength,
  };
}
