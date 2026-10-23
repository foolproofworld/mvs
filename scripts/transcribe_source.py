"""Local CPU transcription; all words are provisional, especially in singing."""
import json
from pathlib import Path
import librosa
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parents[1]
model = WhisperModel('base',device='cpu',compute_type='int8',cpu_threads=4,download_root=str(root/'analysis/models'))
audio, _ = librosa.load(root/'analysis/audio/analysis.wav', sr=16000, mono=True)
segments, info = model.transcribe(audio,language='zh',beam_size=5,word_timestamps=True,vad_filter=False,condition_on_previous_text=False)
rows=[]
for segment in segments:
    rows.append(dict(start=segment.start,end=segment.end,text=segment.text,avg_logprob=segment.avg_logprob,no_speech_prob=segment.no_speech_prob,words=[dict(start=w.start,end=w.end,text=w.word,probability=w.probability) for w in segment.words or []],verified=False))
    (root/'analysis/transcript-draft.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Processed to {segment.end:.1f}s',flush=True)
(root/'analysis/transcription-status.json').write_text(json.dumps(dict(complete=True,model='base',language=info.language,segments=len(rows),verified=False)),encoding='utf-8')
