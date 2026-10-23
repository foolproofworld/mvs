# 纯前端 MV：Skill 调研与制作节奏

执行进展：已在项目安装 `music-mv`，完成音轨提取、抽帧、首轮节拍分析、OCR 与本地 ASR。当前事实和数据质量请以 [素材解析](../song.md) 为准；下文“待分析”描述保留为初始计划记录。

调研日期：2026-10-23。目标：以项目中的 MP4 为音源与视听参考，用浏览器中的文字、图形和动画重新演绎整首歌，节拍、演唱和画面事件同步。默认保留完整歌曲，先按 16:9 设计；最终是静态前端页面，制作阶段可以用本地分析工具，不依赖线上后端。

## 1. 已确认的素材与待分析项

- 源文件：`26488341311-1-192.mp4`，38,747,870 字节。
- Windows Shell 读取的媒体属性：270.048 秒（约 4:30）、1280×720、30fps、音频采样率 44,100Hz。后续以解码器的精确探测结果校验。
- 当前未取得歌曲名、演唱语言、准确歌词、BPM、拍号、第一拍偏移、逐拍时间、段落边界；不能据文件名推断。
- 当前 PATH 未发现 ffmpeg / ffprobe。尚未听辨、抽帧、提取音频或执行自动转写。

## 2. GitHub Skill 选型

更新：新增用户指定的 [Win-Hao/music-mv](https://github.com/Win-Hao/music-mv)，作为首要创作流程参考。具体源码评估、同步缺口及制作节奏调整见 [参考评估](Win-Hao-music-mv参考评估.md)。实现优先考虑 Canvas 2D + 独立歌词层；Remotion 保留为备选，HyperFrames 用于可选导出，不作为网页播放必需依赖。

以下为已查看原始 README / SKILL 内容的候选，不代表已安装或已运行验证。

| Skill | 适用部分 | 本项目建议 |
| --- | --- | --- |
| [realtime-music-mv-skill](https://github.com/13055751/realtime-music-mv-skill) | 音频时钟、可跳转的确定性渲染、音乐和歌词驱动实时画面 | 工程思路最贴合网页 MV；仓库已声明迁移，旧版设计指导存在已知不足，仅作参考 |
| [video-scheduler](https://github.com/tsukikage-yura/video-scheduler) | 素材分析、风格、动画与运镜、分镜制作流程 | 是上项声明的迁移目的地；README 自述实验性且未端到端验证，默认不把整套调度器作为项目依赖 |
| [remotion-dev/skills](https://github.com/remotion-dev/skills/tree/main/skills/remotion-best-practices) | React 动画、字幕时间轴、音频可视化及预览 | Remotion 官方候选；若选择 React / Remotion Player 路线，再安装相关 skill。浏览器页面交付不需要先导出 MP4 |
| [clip-music-video-creator](https://github.com/joshegreenfield2/clip-music-video-creator/blob/main/SKILL.md) | 镜头切分、歌词转写、beat map、按拍组织剪辑 | 借鉴分析步骤；主要面向视频素材混剪，不能直接等同于代码绘制的网页 MV，也不照搬其强制所有切点落拍的规则 |
| [ACE-Step acestep-simplemv](https://github.com/ace-step/ACE-Step-1.5/blob/main/.claude/skills/acestep-simplemv/SKILL.md) | 音频 + LRC / JSON 歌词、波形、同步字幕 | 可作简版时间轴参考；主要交付 MP4、偏波形歌词模板，无法单独满足完整视觉演出 |

选型结论（修订）：采用“Win-Hao/music-mv 的创作流程 + 实时 MV 的时间模型 + 独立的歌词／节拍分析”。先确定作品视觉语言，优先轻量 Canvas/SVG；需要时再选 React + Remotion Player。避免仅因为发现 skill 就把多套框架装入空仓库。

关键原始资料：

- [实时 MV 的 SKILL.md](https://github.com/13055751/realtime-music-mv-skill/blob/main/SKILL.md)
- [音乐与视觉映射](https://github.com/13055751/realtime-music-mv-skill/blob/main/references/music-visual-mapping.md)
- [官方字幕转写指引](https://github.com/remotion-dev/skills/blob/main/skills/remotion-best-practices/remotion-captions/transcribe-captions.md)

注意：旧 MV skill 中按音节比例推算再吸附 onset 的逐词方法只能形成候选，鼓点 onset 不等于演唱起音。本项目不以此作为准确歌词时间轴。

## 3. 同步设计

只有一个播放时钟：`t = audio.currentTime`。歌词修正使用独立的 `lyricOffsetMs`；若需全局视听校准，使用明确的 `visualOffsetMs`，分别保存，避免重复叠加。

每帧调用 `render(t)`，从数据计算画面；`requestAnimationFrame` 只负责刷新，不能累加时间。暂停、拖动、重新播放时，相同时间应得到相同构图；随机图形使用固定种子。CSS / 动画库若有自己的时间轴，必须由媒体时钟定位。

三层数据各司其职：

1. **演唱时间轴**：逐句／逐词的 start、end；决定文字出现、高亮、关键词事件。来源为准确歌词 + 对齐 + 人工校准。不能把词强行量化到 BPM 网格。
2. **音乐时间轴**：实际 beat、downbeat、onset、能量；决定脉冲、形变、粒子、镜头冲击。不能仅凭平均 BPM 或频谱柱假装卡点。
3. **叙事时间轴**：前奏、主歌、副歌、间奏、尾奏等实际段落；决定布局、色彩和视觉母题的变化，边界在分析后填写。

播放时直接读取预生成数据，Web Audio Analyser 作为额外的实时细节响应；它的音量／频谱不是歌词时间的来源。不得修改歌曲速度去迎合画面。首次播放由用户点击启动，符合浏览器媒体播放机制。

## 4. 制作节奏与产物

| 阶段 | 具体工作 | 产物与进入下一阶段条件 |
| --- | --- | --- |
| A 素材解析 | 复核媒体属性；抽取音轨；抽帧看画面和烧录字幕；识别歌曲、语言、视觉参考 | `analysis/source.json`、音轨、参考接触表；素材可解码 |
| B 全曲时间轴 | 检测 beat / onset / 能量；区分半速／倍速 BPM；标注真实段落；转写并校对歌词，有正确文本时优先做强制对齐；混音干扰严重时才做人声分离 | `beats.json`、`lyrics.json`、`sections.json`；全曲覆盖，低置信度区间显式标记 |
| C 视觉分镜 | 从全曲含义提取少量视觉母题；制定字体、配色、构图、动态规则；逐段说明歌词意象和音乐如何改变画面 | 全曲段落表 + 样片分镜；不能把每句歌词做成重复字幕卡 |
| D 代表样片 | 选实际的主歌→副歌转折，约 20–40 秒；实现播放、拖动、歌词、节拍脉冲和一次完整场景转换 | 浏览器可播放样片；先解决风格与同步问题 |
| E 全曲扩展 | 复用样片视觉语法，按音乐段落制作；每批约 20–45 秒，长度以乐句为准；加强副歌、保留主歌留白 | 覆盖 270.048 秒的完整页面；批次接缝无时间偏移 |
| F 校准交付 | 逐段听看；检查开头、中段、尾部及所有转折；拖动、暂停、倍速、窗口变化、移动端播放；记录性能 | 静态站点源码、启动说明、可编辑时间数据、已知问题 |

该顺序是制作计划，不是已执行结果；所需时间取决于歌词可得性、音频质量及视觉复杂度，不预先承诺固定工时。

## 5. 画面如何跟音乐走

- 前奏：建立主题和空间，给后续变化留余地。
- 主歌：降低密度，围绕歌词意象做连续动作；每 2–4 小节的构图变化仅为初始设计候选。
- 过渡：随真实能量上升增加运动和层次，在乐句结束或重拍准备转场。
- 副歌：放大核心母题，增强运动；句内由真实 beat 控制次级动作，重拍控制较强冲击，不必每拍换镜头。
- 间奏：减少文字，通过图形、空间和节奏延续叙事。
- 尾奏：根据实际音乐收束，处理余音和最终停帧。

以上是编排原则，尚不是这首歌的实际结构。需要先完成 B 阶段才能填入具体秒数。

## 6. 数据约定

全部以原始音轨 0 秒为基准，统一秒单位；导入毫秒字幕时仅在入口转换一次。保留来源、置信度与校准状态，不能把待确认时间标成已验证。

```ts
type Beat = { time: number; strength: number; downbeat?: boolean };
type Lyric = {
  start: number; end: number; text: string;
  words?: { start: number; end: number; text: string }[];
  verified: boolean;
};
type Section = { start: number; end: number; label: string; sceneId: string };
```

时间数据分析后再生成，不写入假歌词、假 beat 或假 BPM。逐字歌词与语义事件共用同一词级时间表。保留源文件不变，抽取音轨只为分析和页面播放；是否复用原画面在看过素材后确定。

## 7. 验收目标

- 基础对齐：词开始和核心落拍在浏览器播放中目标误差约 ≤80ms；这是项目目标，必须人工听看核验，不能仅通过 JSON 时间值宣称达标。
- 长音、弱起、切分音、连唱单独校准；词尾高亮考虑实际延音。
- 全曲开头／中间／结尾不发生累积漂移；拖到任意段落仍能正确呈现画面与歌词。
- 主歌、副歌、间奏有层次且保持统一视觉语言；歌词可读，字幕之外有持续的视觉演出。
- 桌面目标 60fps，低性能设备允许降低粒子密度与渲染分辨率；音频时钟始终不受影响。
- 运行时不需要后端和 API key；所有必要媒体、字体和时间数据由静态站点提供。

## 下一步

先执行 A/B：复核媒体、抽帧与提取音轨、生成可核验的歌词和音乐时间轴。此后才能确定具体 BPM、每句歌词的秒数、全曲分镜与样片区间。
