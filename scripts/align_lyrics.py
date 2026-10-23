"""Align draft corrected text with Whisper cross attention, preserving uncertainty."""
import json
from pathlib import Path
import librosa
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import pad_or_trim
from faster_whisper.tokenizer import Tokenizer

root = Path(__file__).resolve().parents[1]
source = json.loads((root/'data/lyrics-source.json').read_text(encoding='utf-8'))
audio, sr = librosa.load(root/'analysis/audio/analysis.wav', sr=16000)
model = WhisperModel('base',device='cpu',compute_type='int8',cpu_threads=4,download_root=str(root/'analysis/models'))
tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual,task='transcribe',language='zh')
lines = []
raw = []
for performance in source['performances']:
    for i, text in enumerate(source[performance['text']]):
        left, right = performance['boundaries'][i:i+2]
        crop_start = max(0,left-.6)
        chunk = audio[int(crop_start*sr):int((right+.5)*sr)]
        features = pad_or_trim(model.feature_extractor(chunk))
        alignment = model.find_alignment(tokenizer,[tokenizer.encode(text)],model.encode(features),int(np.ceil(len(chunk)/160)))[0]
        raw.append(dict(text=text,crop_start=crop_start,alignment=[{k:float(v) if isinstance(v,np.generic) else v for k,v in w.items()} for w in alignment]))
        chars = []
        for word_index, word in enumerate(alignment):
            glyphs = list(word['word'].strip())
            word_start = word['start']
            # Attention alignment includes leading crop silence in its first token.
            # Cap that artifact using the rough phrase onset and retain raw timings above.
            if word_index == 0:
                word_start = min(word['end']-.04, max(word_start,left-crop_start,word['end']-max(.7,.45*len(glyphs))))
                word_start = max(0,word_start)
            for k,glyph in enumerate(glyphs):
                start = crop_start+word_start+(word['end']-word_start)*k/len(glyphs)
                end = crop_start+word_start+(word['end']-word_start)*(k+1)/len(glyphs)
                chars.append(dict(text=glyph,start=round(start,3),end=round(end,3),probability=round(float(word['probability']),4),method='attention-onset-estimate' if word_index==0 else ('attention' if len(glyphs)==1 else 'split-token'),verified=False))
        if ''.join(c['text'] for c in chars) != text:
            raise ValueError(f'Alignment text mismatch at line {len(lines)+1}')
        # Zero-duration alignments cannot show individual jumps. Preserve raw above;
        # use a clearly marked estimate for collapsed lines rather than silently hiding letters.
        if any(c['end']-c['start'] < .015 for c in chars) or any(b['start']-a['start'] < .025 for a,b in zip(chars,chars[1:])):
            for k,c in enumerate(chars):
                c.update(start=round(left+(right-left)*k/len(chars),3),end=round(left+(right-left)*(k+1)/len(chars),3),method='estimated-line-distribution')
        lines.append(dict(id=f'line-{len(lines)+1:02}',section=performance['section'],text=text,start=chars[0]['start'],end=chars[-1]['end'],chars=chars,verified=False))
        print(f'Aligned {len(lines)}/51',flush=True)
result=dict(version=1,title=source['title'],artist=source['artist'],duration=270.047846,status='draft',method='Whisper base attention alignment of source-subtitle draft; collapsed results explicitly estimated',lines=lines)
for key in ('textStatus','textReview'):
    if key in source:
        result[key]=source[key]
result['timingStatus']='draft'
(root/'data/lyrics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'analysis/forced-alignment-raw.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf-8')
print('Saved data/lyrics.json',flush=True)
