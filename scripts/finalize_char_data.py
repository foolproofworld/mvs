"""Materialize independently editable visual boundaries and alignment review statistics."""
import json
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'data/lyrics.json'
data=json.loads(path.read_text(encoding='utf-8'))
for line in data['lines']:
    for char in line['chars']:
        char.setdefault('appearAt',round(max(0,char['start']-.12),3))
        char.setdefault('disappearAt',round(line['end']+.35,3))
        char.setdefault('emphasis',1)
        char['verified']=False
chars=[c for l in data['lines'] for c in l['chars']]
assert len(chars)==325
assert all(c['method']!='estimated-line-distribution' for c in chars)
assert all(c['start']<c['end'] and c['appearAt']<=c['start'] and c['disappearAt']>=c['end'] for c in chars)
review=dict(characters=len(chars),methods=dict(Counter(c['method'] for c in chars)),confirmed=0,
    lowModelProbability=sum(c.get('probability',0)<.35 for c in chars),
    shortestCandidateDuration=round(min(c['end']-c['start'] for c in chars),3),
    longestCandidateDuration=round(max(c['end']-c['start'] for c in chars),3),
    status='All timestamps are model estimates pending listening; visual intervals are editorial defaults, not measured phoneme boundaries.',
    limitations=['First-character onset hints are estimates.', 'Attention end boundaries can include breath or silence.', 'Larger small-model download failed; used cached base with per-character tokenization and wider-context retry.'])
path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'analysis/character-timing-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(review,ensure_ascii=False,indent=2))
