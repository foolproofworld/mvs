"""Evidence summaries; visual subtitle intervals are NOT vocal alignment."""
import json
import re
import subprocess
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

import imageio_ffmpeg
import librosa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'analysis'


def main():
    rows = json.loads((OUT / 'ocr-raw.json').read_text(encoding='utf-8-sig'))
    groups = []
    for row in rows:
        text = re.sub(r'\s+', '', row['text'])
        if len(text) < 4:
            continue
        previous = groups[-1] if groups else None
        if previous and row['time'] - previous['lastSample'] <= 1.5 and max(SequenceMatcher(None, text, variant).ratio() for variant in previous['variants']) >= 0.35:
            previous['lastSample'] = row['time']
            previous['variants'].append(text)
        else:
            groups.append(dict(firstSample=row['time'], lastSample=row['time'], variants=[text]))
    for i, group in enumerate(groups):
        group['id'] = i + 1
        group['ocrText'] = max(Counter(group['variants']), key=lambda s: Counter(group['variants'])[s] * min(len(s), 12))
        group['verified'] = False
    (OUT / 'subtitle-candidates.json').write_text(json.dumps(dict(method='Windows OCR on bottom crop; 0.5 second sampling; display times only, may miss fades or unreadable text', groups=groups), ensure_ascii=False, indent=2), encoding='utf-8')

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    result = subprocess.run([ffmpeg, '-v', 'error', '-i', str(ROOT / '26488341311-1-192.mp4'), '-vf', 'fps=10,scale=160:90,format=gray', '-f', 'rawvideo', '-'], capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    frames = np.frombuffer(result.stdout, dtype=np.uint8).reshape(-1,90,160)
    diff = np.abs(np.diff(frames.astype(np.int16), axis=0)).mean(axis=(1,2))
    cuts = []
    for i, value in enumerate(diff):
        neighbors = np.r_[diff[max(0,i-5):i],diff[i+1:i+6]]
        if value > 18 and value > 2 * np.median(neighbors) and (not cuts or (i+1)/10-cuts[-1] > 0.15):
            cuts.append(round((i+1)/10,2))
    beats = np.array(json.loads((ROOT / 'song-analysis.json').read_text())['beats'])
    intervals = np.diff(beats)
    cuts_in_music = [t for t in cuts if t >= 21.4 and t < 243]
    rhythm = dict(method='10fps 160x90 gray frame difference; candidate hard cuts only, not full shot boundaries', cutTimes=cuts, candidateCutCount=len(cuts), cutBeatDistanceMedianSec=float(np.median([np.min(abs(beats-t)) for t in cuts_in_music])), fractionOfMusicCutsWithin80ms=float(np.mean([np.min(abs(beats-t)) <= .08 for t in cuts_in_music])), medianBeatInterval=float(np.median(intervals)), beatInterval10th90thPercentile=np.percentile(intervals,[10,90]).tolist())
    (OUT / 'visual-rhythm.json').write_text(json.dumps(rhythm,indent=2),encoding='utf-8')

    y,sr = librosa.load(OUT / 'audio' / 'analysis.wav',sr=None)
    hop = int(sr*.25)
    energy = []
    for start in range(0,len(y),hop):
        chunk = y[start:start+hop]
        energy.append(dict(time=round(start/sr,3),rmsDb=round(float(20*np.log10(max(float(np.sqrt(np.mean(chunk**2))),1e-8))),2)))
    (OUT / 'energy.json').write_text(json.dumps(energy),encoding='utf-8')
    print(json.dumps(dict(subtitleGroups=len(groups),rhythm=rhythm),ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
