"""Retrieve public lyric candidates; keep raw responses and provenance."""
import concurrent.futures
import json
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'analysis/online-lyrics'
OUT.mkdir(exist_ok=True)
QUERY='孙燕姿 开始懂了'
HEADERS={'User-Agent':'Mozilla/5.0','Referer':'https://music.163.com/'}

def get(name,url,params=None):
    try:
        cached=OUT/f'{name}.response'
        if cached.exists():
            try:payload=json.loads(cached.read_text(encoding='utf-8'))
            except ValueError:payload=None
            return dict(name=name,url=requests.Request('GET',url,params=params).prepare().url,status=200,data=payload)
        r=requests.get(url,params=params,headers=HEADERS,timeout=20)
        (OUT/f'{name}.response').write_bytes(r.content)
        try: data=r.json()
        except ValueError:data=None
        print(json.dumps({'name':name,'status':r.status_code,'bytes':len(r.content),'keys':list(data)[:8] if isinstance(data,dict) else None},ensure_ascii=False),flush=True)
        return dict(name=name,url=r.url,status=r.status_code,data=data)
    except Exception as e:
        print(name,type(e).__name__,str(e)[:160],flush=True)
        return dict(name=name,url=url,error=str(e))

jobs=[
 ('kugou-search','https://lyrics.kugou.com/search',{'ver':1,'man':'yes','client':'pc','keyword':QUERY,'duration':270000,'hash':'93f260998a10f4ad6b46606af5c8ec72'}),
 ('netease-search','https://music.163.com/api/search/get/web',{'s':QUERY,'type':1,'limit':12}),
 ('amll-index','https://raw.githubusercontent.com/amll-dev/amll-ttml-db/main/metadata/raw-lyrics-index.jsonl',None),
]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(lambda job:get(*job),jobs))
manifest=[]
for result in results:
    data=result.get('data') or {}
    if result['name']=='kugou-search':
        candidates=data.get('candidates',[])
        (OUT/'kugou-candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding='utf-8')
        print('Kugou candidates',[(c.get('id'),c.get('singer'),c.get('song'),c.get('duration')) for c in candidates],flush=True)
        for c in candidates[:8]:
            name=f'kugou-{c["id"]}'
            response=get(name,'https://lyrics.kugou.com/download',{'id':c['id'],'accesskey':c['accesskey'],'fmt':'krc','charset':'utf8','client':'mobi','ver':1})
            if (response.get('data') or {}).get('content'):manifest.append(dict(provider='kugou',id=str(c['id']),candidate=c,response=f'{name}.response',url=response['url'],format='krc'))
    if result['name']=='netease-search':
        result_data=data.get('result',{})
        if isinstance(result_data,str):
            try:result_data=json.loads(result_data)
            except ValueError:result_data={}
        songs=result_data.get('songs',[]) if isinstance(result_data,dict) else []
        print('Netease candidates',[(s.get('id'),s.get('name'),[a.get('name') for a in s.get('artists',[])]) for s in songs],flush=True)
        for s in songs[:5]:
            name=f'netease-{s["id"]}'
            response=get(name,'https://music.163.com/api/song/lyric/v1',{'id':s['id'],'lv':-1,'kv':-1,'tv':-1,'yv':-1})
            if response.get('data'):manifest.append(dict(provider='netease',id=str(s['id']),candidate=s,response=f'{name}.response',url=response['url'],format='yrc-or-lrc'))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Downloaded candidate payloads:',len(manifest),flush=True)
