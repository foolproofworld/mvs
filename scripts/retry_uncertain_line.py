"""Retry the collapsed first-verse phrase using wider source-audio contexts."""
import json
from pathlib import Path
import numpy as np
import librosa
from faster_whisper import WhisperModel
from faster_whisper.audio import pad_or_trim
from faster_whisper.tokenizer import Tokenizer
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'data/lyrics.json').read_text(encoding='utf-8'))
line=data['lines'][4]
audio,sr=librosa.load(root/'analysis/audio/analysis.wav',sr=16000)
model=WhisperModel('base',device='cpu',compute_type='int8',cpu_threads=4,download_root=str(root/'analysis/models'),local_files_only=True)
tok=Tokenizer(model.hf_tokenizer,model.model.is_multilingual,task='transcribe',language='zh')
tokens=[t for ch in line['text'] for t in tok.encode(ch)]
candidates=[]
for left in [34.5,35.5,36.5,37.0]:
    chunk=audio[int(left*sr):int(41.3*sr)]
    words=model.find_alignment(tok,[tokens],model.encode(pad_or_trim(model.feature_extractor(chunk))),int(np.ceil(len(chunk)/160)))[0]
    chars=[]
    for i,w in enumerate(words):
        start=left+float(w['start']);end=left+float(w['end'])
        if i==0:start=max(left,min(37.73,end-.12))
        chars.append(dict(text=w['word'],start=round(start,3),end=round(end,3),probability=float(w['probability']),method='base-character-attention-context-retry',reviewReasons=['first-onset-estimated-from-next-character'] if i==0 else [],verified=False))
    valid=''.join(c['text'] for c in chars)==line['text'] and all(c['end']-c['start']>.03 for c in chars) and all(a['start']<b['start'] for a,b in zip(chars,chars[1:]))
    print(f'context {left}: valid={valid}, mean probability={np.mean([c["probability"] for c in chars]):.3f}',flush=True)
    if valid:candidates.append(chars)
if candidates:
    chars=max(candidates,key=lambda cs:sum(c['probability'] for c in cs))
    line.update(chars=chars,start=chars[0]['start'],end=chars[-1]['end'])
    (root/'data/lyrics.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Recovered line 5 without uniform timing.')
else:print('No reliable recovery; retained prior and review flag.')
