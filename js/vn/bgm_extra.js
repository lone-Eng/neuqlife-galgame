/**
 * ============================================================
 *  东秦校园人生 · 外部 BGM 扩展
 *  ------------------------------------------------------------
 *  游戏自带的 8 首 BGM 全部由 Web Audio 实时合成（无版权风险、
 *  零体积）。如果你想换成/补充成真实录音，把音频文件放进本目录
 *  并在下面的 BGM_EXTRA 里登记一行即可，无需改动其它代码。
 *
 *  示例：
 *      var BGM_EXTRA = {
 *        bgm_campus:  'audio/campus.mp3',     // 校园日常
 *        bgm_romance: 'audio/romance.mp3',    // 恋爱
 *        bgm_sad:     'audio/sad.mp3'         // 离别
 *      };
 *
 *  登记后就能直接使用：
 *      VN.run([ VN.bgm('bgm_campus') ])        // 剧本里切歌
 *      BGM.play('bgm_campus')                   // 或直接调用
 *
 *  也可以让某个场景自动使用它 —— 在 js/vn/adapter.js 的
 *  BGM_RULES 里把对应的背景 key 映射到你的曲目名即可。
 *
 *  注意：
 *    · 支持浏览器能解码的格式（mp3 / ogg / m4a / wav）
 *    · 外部曲目与合成 BGM 共用同一套音量控制与总开关
 *    · 文件缺失 / 解码失败时自动退回合成曲目，不会卡住剧情
 *    · 若从网上下载音乐，请确认授权允许你在项目中分发
 * ============================================================ */
(function () {
  'use strict';

  var BGM_EXTRA = {
    // ---- 已配置：CC0（公有领域）真实录音，覆盖同名的合成曲目 ----
    // 用同名的 key 登记即可"替换"合成版；文件缺失会自动退回合成版，
    // 所以删掉某一行不会有任何副作用。来源与许可见 audio/CREDITS.md。
    title:    'audio/title.mp3',     // 《Happy Lullaby》   舒缓音乐盒
    daily:    'audio/daily.mp3',     // 《Chill lofi inspired》 校园日常
    festival: 'audio/festival.mp3',  // 《Bossa Nova》      轻快
    romantic: 'audio/romantic.mp3',  // 《Next to You》     温柔
    sad:      'audio/sad.ogg',       // 《Snowfall》        清冷感伤
    tension:  'audio/tension.ogg',   // 《Insistent》       紧张
    ending:   'audio/ending.mp3',    // 《The Field Of Dreams》 怀旧收束
    cat:      'audio/cat.mp3'        // 《Talking Cute》    撸猫专用

    // 想再加自己的曲目，继续往下写即可（同样要放在 audio/ 目录里）：
    // mysong: 'audio/mysong.mp3',
  };

  if (typeof AUDIO === 'undefined' || !AUDIO || !AUDIO.registerExternal) return;
  try {
    // 始终把内置的校歌与用户登记的曲目一起注册
    AUDIO.registerExternal(BGM_EXTRA);
  } catch (e) {
    if (window.console) console.warn('[BGM] 外部曲目登记失败', e);
  }
})();
