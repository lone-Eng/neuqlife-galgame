# 音频素材来源与许可

本目录下的音频全部来自 **OpenGameArt.org**，许可均为 **CC0 1.0 通用（公有领域奉献）**。

CC0 允许在任意项目中使用、修改、再分发，**包括商业用途，且无需署名**。
下面列出出处仅为便于追溯，并非许可要求。

| 文件 | 用途（BGM key） | 曲名 | 来源页面 |
|---|---|---|---|
| `title.mp3` | `title` 标题画面 | Happy Lullaby (song17) | <https://opengameart.org/content/happy-lullaby-song17> |
| `daily.mp3` | `daily` 校园日常 | Chill lofi inspired | <https://opengameart.org/content/chill-lofi-inspired> |
| `festival.mp3` | `festival` 节庆 | Bossa Nova | <https://opengameart.org/content/bossa-nova> |
| `romantic.mp3` | `romantic` 恋爱 | Next to You | <https://opengameart.org/content/next-to-you> |
| `sad.ogg` | `sad` 感伤 | Snowfall (Looped ver.) | <https://opengameart.org/content/snowfall> |
| `tension.ogg` | `tension` 紧张 | Insistent: background loop | <https://opengameart.org/content/insistent-background-loop> |
| `ending.mp3` | `ending` 收束 | The Field Of Dreams | <https://opengameart.org/content/the-field-of-dreams> |
| `cat.mp3` | `cat` 校园猫 | Talking Cute (Chiptune) | <https://opengameart.org/content/talking-cute-chiptune> |

## 说明

- 这些曲目**同名覆盖**了游戏内置的合成 BGM（见 `js/vn/bgm_extra.js`）。
  把 `bgm_extra.js` 里对应的那一行删掉，就会自动退回合成版，不会出错。
- 曲风是按**标题与页面标签**挑选的 —— 挑选时无法试听，如果你觉得某首不搭，
  换掉 `bgm_extra.js` 里的路径即可。
- 其余音效（38 种）与校歌以外的氛围音仍由 Web Audio 实时合成，见 `js/vn/audio.js`。
- 若要补充自己的音乐，放进本目录并在 `js/vn/bgm_extra.js` 里加一行即可。
