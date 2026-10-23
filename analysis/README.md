# 分析数据说明

主报告：[song.md](../song.md)。分析媒体为项目中的 `26488341311-1-192.mp4`。

| 文件 | 含义 | 可信范围 |
| --- | --- | --- |
| `source.json`、`ffmpeg-source.txt` | 源文件哈希、解码器媒体信息 | 实测，源文件未改动 |
| `source-loudness.json` | 原始立体声音轨 LUFS / dBTP | FFmpeg ebur128 读数 |
| `source-contact-sheet.jpg` | 22 张代表帧及时间标签 | 稀疏概览，不能测精确镜头边界 |
| `../song-analysis.json` | 上游音乐分析脚本原始输出，包含 beats | 自动候选；downbeat 默认假设 4/4 |
| `song-analysis-summary.md` | 上项摘要 | 响度为分析用单声道 WAV，非源立体声 |
| `energy.json` | 0.25 秒窗口 RMS | 原始相对能量，非 LUFS / 情绪标签 |
| `visual-rhythm.json` | 灰度帧差硬切与节拍距离 | 10fps 粗筛，有误报，非精确镜头表 |
| `ocr-raw.json` | 本地 Windows OCR 原始样本 | 字幕上屏时间，含错字漏字 |
| `subtitle-candidates.json` | OCR 相似文本归组 | 非正式歌词、非精确演唱时间 |
| `transcript-draft.json` | 本地 Whisper base 识别草稿 | 质量未达制作标准，禁止直接作为最终歌词 |
| `transcription-status.json` | 转写执行是否完成 | complete 仅指程序执行完，不代表文字准确 |
| `forced-alignment-raw.json` | 用整理后的字幕文本逐句做 cross-attention 对齐 | 保留原始结果；部分 token 包含句前静音或多个汉字 |
| `requirements-lock.txt` | 本项目 Python 分析环境版本 | 用于追溯与复现 |

`audio/`、`frames/`、`ocr-frames/`、`models/` 为本地可再生成数据，已被 git 忽略。所有自动歌词／分段均尚未人工确认。

## 工具来源

本项目 `.agents/skills/music-mv` 通过 skill-installer 安装自 Win-Hao/music-mv，固定提交 `0088b1422f7f82cdf51b456436a6313127a26d6b`。上游 MIT 许可和 NOTICE 原样保留。

本项目新增的 `scripts/prepare_source.py`、`scripts/ocr_subtitles.ps1`、`scripts/summarize_source.py`、`scripts/transcribe_source.py` 用于抽取、OCR、辅助统计和转写。所有识别在本机运行；模型下载不等于上传源音频。

转写脚本直接传入 16kHz numpy waveform，规避当前 faster-whisper 1.2.1 与 PyAV 19.0.2 的文件解码接口不兼容；不修改第三方包。

后续校准预览使用 `../data/lyrics-source.json` 中整理的 51 句字幕文本和粗区间，运行 `scripts/align_lyrics.py` 生成 `../data/lyrics.json`。首 token 起点约束、多字 token 内部分配、坍缩对齐回退都保留方法标记，仍是人工试听前的时间草稿。旧的 `transcript-draft.json` 不作为播放器歌词来源。
