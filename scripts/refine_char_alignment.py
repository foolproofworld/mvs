"""Refine each character independently; never distribute a phrase uniformly."""
import json
import argparse
from pathlib import Path
import librosa
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import pad_or_trim
from faster_whisper.tokenizer import Tokenizer

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--model',default='base',choices=['base','small'])
args=parser.parse_args()
data=json.loads((root/'data/lyrics.json').read_text(encoding='utf-8'))
backup=root/'analysis/lyrics-before-char-refinement.json'
if not backup.exists(): backup.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
# Phrase anchors from the lyric-platform cross-check are only crop hints.
anchors=[21.36,24.64,28.22,31.48,37.73,40.94,44.51,47,49.03,
54.23,57.65,59.95,64,66.77,70.6,73.88,76.25,80.23,83.07,86.79,
107.05,110.29,113.83,117.09,123.28,126.59,130.10,132.5,134.72,
139.76,143.05,145.4,149.42,152.24,156.06,159.29,161.64,165.7,168.57,172.17,
205.03,208.12,210.41,214.52,217.3,221.08,224.68,226.74,230.8,233.57,237.24]
audio,sr=librosa.load(root/'analysis/audio/analysis.wav',sr=16000)
model=WhisperModel(args.model,device='cpu',compute_type='int8',cpu_threads=4,download_root=str(root/'analysis/models'),local_files_only=args.model=='base')
tokenizer=Tokenizer(model.hf_tokenizer,model.model.is_multilingual,task='transcribe',language='zh')
raw=[]
for index,line in enumerate(data['lines']):
    start_hint=anchors[index]
    next_start=anchors[index+1] if index+1<len(anchors) else 243.0
    # Preserve breaks instead of including an entire instrumental bridge in a lyric crop.
    end_hint=min(next_start-.04,max(line['end'],start_hint+.5))
    crop_start=max(0,start_hint-.22)
    crop_end=end_hint+.25
    clip=audio[int(crop_start*sr):int(crop_end*sr)]
    features=pad_or_trim(model.feature_extractor(clip))
    tokens=[token for glyph in line['text'] for token in tokenizer.encode(glyph)]
    aligned=model.find_alignment(tokenizer,[tokens],model.encode(features),int(np.ceil(len(clip)/160)))[0]
    assert ''.join(w['word'] for w in aligned)==line['text']
    assert all(len(w['word'])==1 for w in aligned)
    raw.append(dict(id=line['id'],cropStart=crop_start,cropEnd=crop_end,chars=[{k:float(v) if isinstance(v,np.generic) else v for k,v in w.items()} for w in aligned]))
    candidates=[]
    for j,word in enumerate(aligned):
        start=crop_start+float(word['start']);end=crop_start+float(word['end'])
        notes=[]
        if j==0:
            # DTW attaches crop-leading silence to the first glyph. Use the phrase
            # onset hint for that glyph only; this boundary remains a review item.
            start=max(start,start_hint);notes.append('first-character-onset-hint')
        if j==len(aligned)-1 and end>end_hint:
            end=end_hint;notes.append('phrase-tail-boundary')
        if float(word['probability'])<.35: notes.append('low-model-probability')
        if end-start<.04: notes.append('collapsed-duration')
        candidates.append(dict(text=word['word'],start=round(start,3),end=round(max(start,end),3),probability=round(float(word['probability']),4),method=f'{args.model}-character-attention',reviewReasons=notes,verified=False))
    # Invalid/collapsed sequences keep the previous data, explicitly pending review.
    invalid=any(c['end']<=c['start']+.015 for c in candidates) or any(b['start']<=a['start'] for a,b in zip(candidates,candidates[1:]))
    if invalid:
        for c in line['chars']:
            c['reviewReasons']=list(set(c.get('reviewReasons',[])+[f'{args.model}-alignment-collapsed-retained-prior']))
            c['verified']=False
    else:
        line['chars']=candidates
        line['start']=candidates[0]['start'];line['end']=candidates[-1]['end']
    print(f'Refined {index+1}/{len(data["lines"])}'+(' (prior retained)' if invalid else ''),flush=True)
data.update(method=f'Whisper {args.model} character-token attention; no uniform phrase fallback; onset/release boundaries require listening review',timingStatus='character-draft',alignmentRevision=2)
(root/'data/lyrics.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'analysis/char-alignment-raw.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
print('Saved character revision 2.',flush=True)
