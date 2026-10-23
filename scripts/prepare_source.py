"""Extract local source audio and timestamped reference frames without uploading media."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

import imageio_ffmpeg
import av
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '26488341311-1-192.mp4'
OUT = ROOT / 'analysis'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(args):
    return subprocess.run([FFMPEG, '-hide_banner', '-y', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')


def main():
    for folder in [OUT, OUT / 'audio', OUT / 'frames']:
        folder.mkdir(parents=True, exist_ok=True)
    info = run(['-i', str(SOURCE)])
    (OUT / 'ffmpeg-source.txt').write_text(info.stderr, encoding='utf-8')
    match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info.stderr)
    duration = int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3])
    with SOURCE.open('rb') as source_stream:
        digest = hashlib.file_digest(source_stream, 'sha256').hexdigest()
    with av.open(str(SOURCE)) as container:
        duration = container.duration / 1_000_000
        streams = [dict(type=s.type, duration=float(s.duration*s.time_base) if s.duration else None, codec=s.codec_context.name) for s in container.streams]
    meta = dict(file=SOURCE.name, size=SOURCE.stat().st_size, sha256=digest, duration=duration, streams=streams, ffmpeg=FFMPEG)
    (OUT / 'source.json').write_text(json.dumps(meta, indent=2), encoding='utf-8')
    for dest, opts in [('song.m4a', ['-c:a', 'copy']), ('analysis.wav', ['-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le'])]:
        result = run(['-i', str(SOURCE), '-vn', *opts, str(OUT / 'audio' / dest)])
        if result.returncode:
            raise RuntimeError(result.stderr)
    times = sorted(set([0, 3, 8, 15, 25, *range(35, int(duration), 15), int(duration)-2]))
    cells = []
    for t in times:
        dest = OUT / 'frames' / f'{t:06.1f}.jpg'
        result = run(['-ss', str(t), '-i', str(SOURCE), '-frames:v', '1', '-q:v', '2', str(dest)])
        if result.returncode:
            raise RuntimeError(result.stderr)
        cells.append((t, dest))
    width, height, cols = 426, 240, 4
    sheet = Image.new('RGB', (cols*width, ((len(cells)+cols-1)//cols)*(height+30)), '#15171b')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 18)
    for i, (t, path) in enumerate(cells):
        x, y = (i%cols)*width, (i//cols)*(height+30)
        with Image.open(path) as im:
            sheet.paste(im.resize((width,height)), (x,y))
        draw.text((x+8,y+height+2), f'{int(t)//60:02}:{t%60:04.1f}', fill='#ffe18d', font=font)
    sheet.save(OUT / 'source-contact-sheet.jpg', quality=94)
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
