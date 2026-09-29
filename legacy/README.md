本目录保存重构前的原始文件，仅作回溯参考，游戏运行时不再加载。

- script.js  : 原单体脚本（5867 行），已按原执行顺序拆分为 js/00-core.js … js/11-phone.js，
               其渲染层由 js/vn/adapter.js 覆盖为视觉小说演出。
- style.css  : 原样式表，已拆分为 css/base.css 与 css/panels.css，
               界面部分由新增的 css/vn.css 取代。
