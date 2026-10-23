"""Decode public KRC payloads and package distinct source timing versions."""
import base64
import hashlib
import json
import re
import statistics
import zlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'analysis/online-lyrics'
DEST=ROOT/'data/versions'
DEST.mkdir(exist_ok=True)
base=json.loads((ROOT/'data/lyrics.json').read_text(encoding='utf-8'))
canonical=''.join(l['text'] for l in base['lines'])
norm=lambda s: re.sub(r'\s+','',s).replace('透澈','透彻')
key=bytes.fromhex('404761775e3274475136312dced26e69')
manifest=json.loads((RAW/'manifest.json').read_text(encoding='utf-8'))
catalog=[dict(id='auto',name='本地自动对齐 · 对照基线',format='模型候选',url='data/lyrics.json',provider='local',description='原有本地逐字候选，保留已有人工校准记录。')]
seen={}
report=[]
for entry in manifest:
    if entry['provider']!='kugou':continue
    payload=json.loads((RAW/entry['response']).read_text(encoding='utf-8'))
    raw=base64.b64decode(payload['content'])
    assert raw[:4]==b'krc1'
    text=zlib.decompress(bytes(value^key[i%16] for i,value in enumerate(raw[4:]))).decode('utf-8-sig')
    (RAW/f'{entry["id"]}.krc').write_text(text,encoding='utf-8')
    lines=[]
    for rawline in text.splitlines():
        m=re.match(r'^\[(\d+),(\d+)\](.*)',rawline)
        if not m:continue
        start_ms,length_ms=int(m[1]),int(m[2])
        units=re.findall(r'<(\d+),(\d+),(\d+)>([^<]*)',m[3])
        line_text=''.join(u[3] for u in units).strip()
        if start_ms<12000 or len(norm(line_text))<2 or norm(line_text) not in norm(canonical):continue
        chars=[]
        for offset,duration,_,unit_text in units:
            glyphs=[ch for ch in unit_text if not ch.isspace()]
            for ch in glyphs:
                chars.append(dict(text=ch,start=round((start_ms+int(offset))/1000,3),end=round((start_ms+int(offset)+int(duration))/1000,3),method='krc-character' if len(glyphs)==1 else 'krc-shared-unit',verified=False,emphasis=1))
        if not chars:continue
        end=max(c['end'] for c in chars)
        for c in chars:c.update(appearAt=max(0,c['start']-.12),disappearAt=end+.35)
        lines.append(dict(id=f'krc-{entry["id"]}-line-{len(lines)+1:02}',text=line_text,start=chars[0]['start'],end=end,chars=chars,section='网络原始分句',verified=False))
    fingerprint=hashlib.sha256(json.dumps([[(c['text'],c['start'],c['end']) for c in l['chars']] for l in lines],ensure_ascii=False).encode()).hexdigest()
    item=dict(sourceId=entry['id'],lineCount=len(lines),charCount=sum(len(l['chars']) for l in lines),firstStart=lines[0]['start'] if lines else None,lastEnd=lines[-1]['end'] if lines else None,fingerprint=fingerprint)
    if not lines:item['excluded']='No matching main lyric lines';report.append(item);continue
    if fingerprint in seen:item['duplicateOf']=seen[fingerprint];report.append(item);continue
    seen[fingerprint]=entry['id']
    vid=f'kugou-{entry["id"]}'
    data=dict(version=1,title='开始懂了',artist='孙燕姿',duration=270.047846,status='online-unverified',timingStatus='provider-timing',method='Downloaded KRC; original timing units preserved, no interpolation',lines=lines,source=dict(provider='酷狗 KRC',lyricId=entry['id'],sourceUrl=entry['url'],candidateDurationMs=entry['candidate'].get('duration'),downloadedAt='2026-10-23',raw=f'analysis/online-lyrics/{entry["id"]}.krc'))
    (DEST/f'{vid}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    catalog.append(dict(id=vid,name=f'酷狗 KRC {len(catalog)} · ID {entry["id"]}',format='逐字 KRC',url=f'data/versions/{vid}.json',provider='kugou',description=f'原始分句 {len(lines)} 行 · {item["charCount"]} 字 · 首句 {lines[0]["start"]:.3f}s；音源时长 {entry["candidate"].get("duration",0)/1000:.3f}s，尚未验证与本地MV完全一致。',firstStart=lines[0]['start'],lastEnd=lines[-1]['end']))
    report.append(item)
if len(catalog)>2:
    first=json.loads((ROOT/catalog[1]['url']).read_text(encoding='utf-8'))
    reference=[c for l in first['lines'] for c in l['chars']]
    for version in catalog[2:]:
        other=json.loads((ROOT/version['url']).read_text(encoding='utf-8'))
        chars=[c for l in other['lines'] for c in l['chars']]
        shifts=[b[k]-a[k] for a,b in zip(reference,chars) for k in ('start','end')]
        median=statistics.median(shifts)
        if len(chars)==len(reference) and abs(median)>.001 and max(abs(s-median) for s in shifts)<.002:
            version['name']+=f' · 比版本1整体偏移 {median:+.3f}s'
            version['description']+=f' 与版本1相对字时长一致，只差整体 {median:+.3f}s。'
(ROOT/'data/versions.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
(RAW/'comparison-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'versions':catalog,'downloads':report},ensure_ascii=False,indent=2))
