"""Record text-only cross-check without changing timings or line identities."""
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
source_path=root/'data/lyrics-source.json'
data_path=root/'data/lyrics.json'
source=json.loads(source_path.read_text(encoding='utf-8'))
data=json.loads(data_path.read_text(encoding='utf-8'))
expected=[(p['section'],text) for p in source['performances'] for text in source[p['text']]]
assert len(expected)==51
assert [(l['section'],l['text']) for l in data['lines']]==expected
assert all(''.join(c['text'] for c in l['chars'])==l['text'] for l in data['lines'])
review={
    'checkedAt':'2026-10-23',
    'textStatus':'cross-checked',
    'userConfirmed':False,
    'timingStatus':'draft',
    'mainLines':51,
    'order':['主歌 1','副歌 1','主歌 2','副歌 2','副歌 3'],
    'sources':[
        {'name':'LINE MUSIC','url':'https://music-tw.line.me/track/1020112005'},
        {'name':'JOOX','url':'https://www.joox.com/hk/single/JzjFoizcyxjxP7BO1ugw1A=='},
        {'name':'酷狗音乐','url':'https://www.kugou.com/song-36/7aaodd.html'},
        {'name':'本地 MV 字幕样本','file':'analysis/lyric-spelling-reference.jpg','time':127.5}
    ],
    'conclusion':'正文与平台歌词交叉比对一致（统一简繁、忽略分句和字形版本差异）；未发现正文漏句或重复顺序错误。时间尚未确认。',
    'spellingNote':'本地 MV 与 LINE MUSIC 为“透澈”；JOOX／酷狗为“透彻”。本项目保留本地 MV 的“透澈”，不将该差异判为漏字或错词。',
    'omittedVocalizations':[
        {'referenceTime':181.95,'text':'啊 耶耶','status':'platform-listed-local-vocal-check-pending'},
        {'referenceTime':202.71,'text':'哦 耶耶','status':'platform-listed-local-vocal-check-pending'}
    ],
    'vocalizationNote':'平台列出的两处间奏哼唱单独记录；未在本地音轨确认前，不加入正式逐字时间轴。'
}
source['textStatus']='cross-checked'
source['note']='正文已与音乐平台和本地MV字幕交叉核对；保留本地MV字形。逐字时间和用户确认仍待完成。'
source['textReview']=review
data['textStatus']='cross-checked'
data['timingStatus']='draft'
data['textReview']=review
source_path.write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
data_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'analysis/lyric-text-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Text cross-check passed: 51 main lyric lines; timing values unchanged.')
