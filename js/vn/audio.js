/* ============================================================================
 *  东秦校园人生 · 程序化音频引擎
 * ----------------------------------------------------------------------------
 *  文件：js/vn/audio.js
 *  纯 Web Audio API 实时合成 —— 没有任何音频素材文件，也不加载任何外部资源。
 *  所有的 BGM 与音效都由 振荡器(Oscillator) + 噪声(NoiseBuffer) +
 *  双二阶滤波器(BiquadFilter) + 增益包络(Gain) 现场合成。
 *
 *  对外暴露三个全局对象（经典脚本，非 ES Module）：
 *      AUDIO   音频总线：开关 / 音量 / AudioContext 管理
 *      BGM     背景音乐：play / stop / current / KEYS
 *      SFX     音效：play / NAMES
 *
 *  设计要点：
 *    · 所有对外接口都包了 try/catch —— 音频异常绝不冒泡进游戏逻辑
 *    · AudioContext 懒创建；被浏览器自动播放策略挂起时，注册一次性
 *      用户手势监听自动恢复，并在恢复后补播待播的 BGM
 *    · BGM 使用「预排 + 定时器」的 lookahead 调度器（约 0.1s 预排 / 25ms 心跳），
 *      不会一次性把整首曲子排进时间轴，长时间运行也稳定
 *    · 主输出挂了一个限幅器(DynamicsCompressor)，多轨叠加不爆音
 *    · 音效全部是"即用即弃"的短音，typying 额外做了 45ms 限流，CPU 占用极低
 * ========================================================================== */

var AUDIO = (function () {
  'use strict';

  // ==========================================================================
  // §0  常量与运行状态
  // ==========================================================================
  var TICK_MS       = 25;    // BGM 调度器心跳(ms)
  var LOOKAHEAD     = 0.12;  // 前台预排时长(s)：约 0.1 秒
  var LOOKAHEAD_BG  = 1.50;  // 后台标签页预排时长(s)：定时器被节流时靠它顶住
  var XFADE         = 0.8;   // BGM 交叉淡入淡出时长(s)
  var STOP_FADE     = 0.6;   // BGM 停止淡出时长(s)
  var STEPS_PER_BAR = 16;    // 每小节 16 个十六分音符

  var _win = (typeof window !== 'undefined') ? window : null;
  var _doc = (typeof document !== 'undefined') ? document : null;

  // 音量/开关。engine.js 会在读档时用玩家存档覆盖这三个值。
  var _settings = { enabled: true, bgmVolume: 0.5, seVolume: 0.7 };

  var _ctx = null;            // 共享 AudioContext
  var _master = null;         // 总线增益（受 enabled 控制）
  var _limiter = null;        // 限幅器
  var _bgmBus = null;         // BGM 总线音量
  var _seBus = null;          // 音效总线音量
  var _noiseBuf = null;       // 复用的白噪声缓冲
  var _noiseSR = 0;           // 噪声缓冲对应的采样率
  var _unlockArmed = false;   // 是否已挂上"等用户手势解锁"的监听
  var _lookahead = LOOKAHEAD; // 当前预排时长（随页面可见性调整）
  var _onUnlockCbs = [];      // ctx 解锁后的回调（BGM 用来补播）

  // ==========================================================================
  // §1  零散工具
  // ==========================================================================
  function warn(e) {
    try {
      if (_win && _win.console && _win.console.warn) _win.console.warn('[AUDIO]', e);
    } catch (x) { /* 忽略 */ }
  }
  function later(fn, ms) {
    try {
      return setTimeout(function () { try { fn(); } catch (e) { warn(e); } }, ms);
    } catch (e) { return 0; }
  }
  function clamp(v, lo, hi) {
    v = Number(v);
    if (v !== v) return lo;            // NaN
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }
  function clamp01(v) { return clamp(v, 0, 1); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }   // MIDI -> Hz
  function isRunning() { try { return !!(_ctx && _ctx.state === 'running'); } catch (e) { return false; } }
  function nowT() { try { return _ctx ? _ctx.currentTime : 0; } catch (e) { return 0; } }

  // 平滑地给一个 AudioParam 设定目标值（用于音量/淡入淡出）
  function rampTo(param, value, sec) {
    try {
      var t = nowT();
      var cur = param.value;
      param.cancelScheduledValues(t);
      param.setValueAtTime(cur, t);
      param.linearRampToValueAtTime(value, t + Math.max(0.01, sec));
    } catch (e) { /* 忽略 */ }
  }

  function onUnlock(fn) {
    try { if (typeof fn === 'function') _onUnlockCbs.push(fn); } catch (e) { /* 忽略 */ }
  }
  function fireUnlock() {
    var i;
    for (i = 0; i < _onUnlockCbs.length; i++) {
      try { _onUnlockCbs[i](); } catch (e) { warn(e); }
    }
  }

  // ==========================================================================
  // §2  AudioContext 生命周期
  // ==========================================================================

  // 复用同一块 2 秒白噪声，所有噪声类音色（沙锤/风声/快门…）都从它取样
  function makeNoiseBuffer(c, seconds) {
    try {
      var len = Math.floor(c.sampleRate * (seconds || 2));
      var buf = c.createBuffer(1, len, c.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    } catch (e) { warn(e); return null; }
  }

  // 页面可见性：后台标签页的定时器会被节流到 1s，此时把预排拉长避免断音
  function onVisibility() {
    try {
      _lookahead = (_doc && _doc.hidden) ? LOOKAHEAD_BG : LOOKAHEAD;
    } catch (e) { /* 忽略 */ }
  }

  // 挂载"一次性"用户手势监听：浏览器要求有手势才能出声
  function armUnlock() {
    if (_unlockArmed || !_doc) return;
    _unlockArmed = true;
    var evs = ['pointerdown', 'touchstart', 'keydown', 'mousedown'];
    function onGesture() {
      var i;
      for (i = 0; i < evs.length; i++) {
        try { _doc.removeEventListener(evs[i], onGesture, true); } catch (e) { /* 忽略 */ }
      }
      _unlockArmed = false;
      try {
        if (_ctx && _ctx.state !== 'running') {
          var pr = _ctx.resume();
          if (pr && typeof pr.then === 'function') {
            pr.then(function () { checkUnlocked(); }, function () { rearm(); });
          }
        }
      } catch (e) { /* 忽略 */ }
      later(checkUnlocked, 80);
    }
    for (var i = 0; i < evs.length; i++) {
      try { _doc.addEventListener(evs[i], onGesture, true); } catch (e) { /* 忽略 */ }
    }
  }
  function rearm() {
    later(function () {
      if (_ctx && _ctx.state !== 'running') armUnlock();
      else checkUnlocked();
    }, 120);
  }
  function checkUnlocked() {
    try {
      if (_ctx && _ctx.state !== 'running') { armUnlock(); return; }
      if (_ctx && _ctx.state === 'running') fireUnlock();
    } catch (e) { /* 忽略 */ }
  }

  // 懒创建 / 恢复 AudioContext
  function ensureCtx() {
    try {
      if (_ctx) {
        if (_ctx.state === 'suspended' || _ctx.state === 'interrupted') {
          try {
            var pr = _ctx.resume();
            if (pr && typeof pr.then === 'function') {
              pr.then(function () { checkUnlocked(); }, function () { armUnlock(); });
            }
          } catch (e) { /* 忽略 */ }
        }
        return _ctx;
      }
      var AC = (_win && (_win.AudioContext || _win.webkitAudioContext)) || null;
      if (!AC) return null;                     // 浏览器不支持 Web Audio：静默降级

      _ctx = new AC();

      // 音频图：  [BGM 总线] [音效总线] -> master -> limiter -> 扬声器
      _master = _ctx.createGain();
      _master.gain.value = _settings.enabled ? 1 : 0;

      _limiter = _ctx.createDynamicsCompressor();
      try {
        _limiter.threshold.value = -10;   // 限幅：多轨叠加时兜底
        _limiter.knee.value      = 12;
        _limiter.ratio.value     = 12;
        _limiter.attack.value    = 0.003;
        _limiter.release.value   = 0.2;
      } catch (e) { /* 忽略 */ }

      _bgmBus = _ctx.createGain();
      _bgmBus.gain.value = _settings.bgmVolume;
      _seBus = _ctx.createGain();
      _seBus.gain.value = _settings.seVolume;

      _bgmBus.connect(_master);
      _seBus.connect(_master);
      _master.connect(_limiter);
      _limiter.connect(_ctx.destination);

      _noiseBuf = makeNoiseBuffer(_ctx, 2);
      _noiseSR = _ctx.sampleRate;

      try {
        _ctx.onstatechange = function () {
          try { if (_ctx && _ctx.state === 'running') { checkUnlocked(); } } catch (e) { /* 忽略 */ }
        };
      } catch (e) { /* 忽略 */ }

      if (_doc) {
        try { _doc.addEventListener('visibilitychange', onVisibility, false); } catch (e) { /* 忽略 */ }
      }
      onVisibility();

      // 浏览器可能直接给一个 suspended 的 ctx，等用户第一次手势再恢复
      if (_ctx.state === 'suspended' || _ctx.state === 'interrupted') {
        try {
          var p2 = _ctx.resume();
          if (p2 && typeof p2.then === 'function') {
            p2.then(function () { checkUnlocked(); }, function () { armUnlock(); });
          }
        } catch (e) { /* 忽略 */ }
        armUnlock();
      } else {
        later(checkUnlocked, 0);
      }
    } catch (e) {
      warn(e);
      _ctx = null;
    }
    return _ctx;
  }

  // ==========================================================================
  // §3  合成原语
  // ==========================================================================

  /**
   * 通用增益包络。
   *   t0    起始时间
   *   peak  峰值增益
   *   atk   起音时长(s)
   *   dur   总时长(s)
   *   sus   0 = 击弦式指数衰减（钢琴/八音盒）；>0 = 保持 dur*sus 后释放（垫音/长音）
   */
  function shape(p, t0, peak, atk, dur, sus) {
    try {
      var pk = Math.max(0.0002, peak);
      if (atk < 0.0005) atk = 0.0005;
      if (dur < atk + 0.01) dur = atk + 0.01;
      p.setValueAtTime(0.0001, t0);
      p.exponentialRampToValueAtTime(pk, t0 + atk);
      if (sus > 0) {
        p.setValueAtTime(pk, t0 + Math.max(atk, dur * (1 - sus)));
        p.exponentialRampToValueAtTime(0.0001, t0 + dur);
      } else {
        p.exponentialRampToValueAtTime(0.0001, t0 + dur);
      }
      p.setValueAtTime(0, t0 + dur + 0.02);
    } catch (e) { /* 忽略 */ }
  }

  /**
   * 一个"音"：振荡器 -> (可选滤波) -> 包络 -> (可选声像) -> dest
   * o: { dest, type, freq, to, glide, dur, peak, atk, sus, detune, lp, lpTo, hp, bp, q, pan }
   */
  function tone(t0, o) {
    if (!_ctx || !o || !o.dest) return null;
    var osc = null;
    try {
      var dur = o.dur > 0 ? o.dur : 0.3;
      var atk = o.atk == null ? 0.006 : o.atk;
      var peak = o.peak == null ? 0.2 : o.peak;
      if (peak <= 0) return null;

      osc = _ctx.createOscillator();
      osc.type = o.type || 'sine';
      var f0 = (o.freq > 0) ? o.freq : 440;
      osc.frequency.setValueAtTime(f0, t0);
      if (o.to > 0 && o.to !== f0) {
        try { osc.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide > 0 ? o.glide : dur)); } catch (e) { /* 忽略 */ }
      }
      if (o.detune) osc.detune.setValueAtTime(o.detune, t0);

      var g = _ctx.createGain();
      shape(g.gain, t0, peak, atk, dur, o.sus > 0 ? o.sus : 0);
      // ⚠️ 必须把振荡器接到包络上。少了这一句，振荡器接不到任何东西，
      //    后面的 包络→滤波→输出 就永远没有输入 —— 结果就是"完全没声音"。
      osc.connect(g);

      var tail = g;
      var fType = o.lp ? 'lowpass' : (o.hp ? 'highpass' : (o.bp ? 'bandpass' : null));
      if (fType) {
        var f = _ctx.createBiquadFilter();
        f.type = fType;
        var fc = o.lp || o.hp || o.bp;
        f.frequency.setValueAtTime(fc, t0);
        if (o.lpTo > 0 || o.hpTo > 0 || o.bpTo > 0) {
          var ft = o.lpTo || o.hpTo || o.bpTo;
          try { f.frequency.exponentialRampToValueAtTime(Math.max(20, ft), t0 + (o.fTime > 0 ? o.fTime : dur)); } catch (e) { /* 忽略 */ }
        }
        try { f.Q.setValueAtTime(o.q == null ? 0.8 : o.q, t0); } catch (e) { /* 忽略 */ }
        g.connect(f);
        tail = f;
      }

      if (o.pan && _ctx.createStereoPanner) {
        var pn = _ctx.createStereoPanner();
        pn.pan.value = clamp(o.pan, -1, 1);
        tail.connect(pn);
        tail = pn;
      }

      tail.connect(o.dest);
      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
    } catch (e) {
      warn(e);
      return null;
    }
    return osc;
  }

  /**
   * 一段噪声：白噪声缓冲 -> 滤波器 -> 包络 -> dest
   * o: { dest, dur, peak, atk, type, f0, f1, q, pan }
   */
  function noise(t0, o) {
    if (!_ctx || !o || !o.dest) return null;
    try {
      if (!_noiseBuf || _noiseSR !== _ctx.sampleRate) {
        _noiseBuf = makeNoiseBuffer(_ctx, 2);
        _noiseSR = _ctx.sampleRate;
      }
      if (!_noiseBuf) return null;

      var dur = o.dur > 0 ? o.dur : 0.15;
      var atk = o.atk == null ? 0.001 : o.atk;
      var peak = o.peak == null ? 0.1 : o.peak;
      if (peak <= 0) return null;

      var src = _ctx.createBufferSource();
      src.buffer = _noiseBuf;
      src.loop = true;

      var g = _ctx.createGain();
      shape(g.gain, t0, peak, atk, dur, 0);
      // 同上：噪声源必须接到包络，否则整条链没有输入
      src.connect(g);

      var tail = g;
      var fType = o.type || 'bandpass';
      var f = _ctx.createBiquadFilter();
      f.type = fType;
      f.frequency.setValueAtTime(Math.max(30, o.f0 || 1000), t0);
      if (o.f1 > 0) {
        try { f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t0 + (o.fTime > 0 ? o.fTime : dur)); } catch (e) { /* 忽略 */ }
      }
      try { f.Q.setValueAtTime(o.q == null ? 0.8 : o.q, t0); } catch (e) { /* 忽略 */ }
      g.connect(f);
      tail = f;

      if (o.pan && _ctx.createStereoPanner) {
        var pn = _ctx.createStereoPanner();
        pn.pan.value = clamp(o.pan, -1, 1);
        tail.connect(pn);
        tail = pn;
      }
      tail.connect(o.dest);

      // 随机取相位，避免每次噪声都一模一样
      src.start(t0, Math.random() * 1.5);
      src.stop(t0 + dur + 0.06);
      return src;
    } catch (e) {
      warn(e);
      return null;
    }
  }

  // FM 钟：载波被一个非谐波比率的调制器调制，得到金属质感的铃声
  function fmBell(t0, dest, o) {
    if (!_ctx) return;
    try {
      var f = o.freq || 660;
      var dur = o.dur || 1.1;
      var peak = o.peak == null ? 0.14 : o.peak;

      var car = _ctx.createOscillator();
      car.type = 'sine';
      car.frequency.setValueAtTime(f, t0);
      car.detune.setValueAtTime(o.detune || 0, t0);

      // 调制器：比率 2.76 是钟/铃的经典非谐比
      var mod = _ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(f * 2.76, t0);
      var mg = _ctx.createGain();
      mg.gain.setValueAtTime(o.index == null ? 900 : o.index, t0);
      try { mg.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.45); } catch (e) { /* 忽略 */ }
      mod.connect(mg);
      mg.connect(car.frequency);

      var g = _ctx.createGain();
      shape(g.gain, t0, peak, 0.004, dur, 0);
      car.connect(g);
      g.connect(dest);

      car.start(t0); car.stop(t0 + dur + 0.06);
      mod.start(t0); mod.stop(t0 + dur + 0.06);
    } catch (e) { warn(e); }
  }

  // ==========================================================================
  // §4  打击乐原语（BGM 用，音量都很保守）
  // ==========================================================================
  function drumKick(t0, dest, o) {
    // 软底鼓：正弦快速下滑 + 极短噪声单击
    var gg = o.gain == null ? 0.34 : o.gain;
    tone(t0, { dest: dest, type: 'sine', freq: o.f0 || 128, to: o.f1 || 46, glide: 0.1, dur: o.dur || 0.24, peak: gg, atk: 0.002 });
    noise(t0, { dest: dest, dur: 0.022, peak: gg * 0.16, atk: 0.0006, type: 'lowpass', f0: 1400 });
  }
  function drumHat(t0, dest, o) {
    // 细碎闭合 hi-hat
    noise(t0, { dest: dest, dur: o.dur || 0.05, peak: o.gain == null ? 0.05 : o.gain, atk: 0.0006, type: 'highpass', f0: o.f0 || 7600, q: 0.7 });
  }
  function drumSnare(t0, dest, o) {
    // 轻军鼓/拍手：带通噪声 + 一点点鼓皮音
    var gg = o.gain == null ? 0.07 : o.gain;
    noise(t0, { dest: dest, dur: o.dur || 0.12, peak: gg, atk: 0.0008, type: 'bandpass', f0: o.f0 || 1900, q: 0.9 });
    tone(t0, { dest: dest, type: 'sine', freq: 205, to: 150, dur: 0.09, peak: gg * 0.6, atk: 0.001 });
  }
  function drumTimp(t0, dest, o) {
    // 定音鼓：音高跟随当前和弦根音
    var gg = o.gain == null ? 0.22 : o.gain;
    var f = o.freq || 73;
    tone(t0, { dest: dest, type: 'sine', freq: f, to: f * 0.72, glide: 0.32, dur: o.dur || 0.6, peak: gg, atk: 0.004 });
    tone(t0, { dest: dest, type: 'triangle', freq: f * 2, dur: 0.22, peak: gg * 0.22, atk: 0.004 });
    noise(t0, { dest: dest, dur: 0.07, peak: gg * 0.22, atk: 0.001, type: 'lowpass', f0: 420 });
  }
  function drumCym(t0, dest, o) {
    // 吊镲/踩镲长音
    noise(t0, { dest: dest, dur: o.dur || 0.9, peak: o.gain == null ? 0.07 : o.gain, atk: o.atk || 0.004, type: 'highpass', f0: o.f0 || 5200 });
  }

  // ==========================================================================
  // §5  音效 (SFX)
  //   每个音效都是 function(t0, out)，t0 为开始时间，out 为音效总线
  // ==========================================================================
  var _lastTypeAt = -1;   // typing 限流用

  var SFX_DEFS = {

    // 轻软的 UI 点击：短促的三角波下滑 + 一点点高频噪点
    click: function (t0, out) {
      tone(t0, { dest: out, type: 'triangle', freq: 1180, to: 620, glide: 0.05, dur: 0.07, peak: 0.15, atk: 0.002, lp: 4200, q: 0.7 });
      noise(t0, { dest: out, dur: 0.03, peak: 0.04, atk: 0.0006, type: 'highpass', f0: 2600 });
    },

    // 悬停：比 click 更轻更高更短，几乎只是一声气音
    // 悬停：比 click 更轻更高更短。v 让每个选项的音高不同，避免"每个都一样"
    hover: function (t0, out, v) {
      var f = 1760 * Math.pow(1.0595, (v || 0) * 3);      // 每个 variant 升高一个全音
      tone(t0, { dest: out, type: 'sine', freq: f, to: f * 0.85, glide: 0.04, dur: 0.045, peak: 0.045, atk: 0.002 });
      noise(t0, { dest: out, dur: 0.018, peak: 0.012, atk: 0.0005, type: 'highpass', f0: 3800 });
    },

    // 选择：上行两音。v 改变基频 → 同一个"选择"动作也有音高变化
    select: function (t0, out, v) {
      var base = 660 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'triangle', freq: base, dur: 0.09, peak: 0.14, atk: 0.003, lp: 5000, q: 0.7 });
      tone(t0 + 0.075, { dest: out, type: 'triangle', freq: base * 1.5, dur: 0.17, peak: 0.15, atk: 0.003, lp: 6000, q: 0.7 });
    },

    /* ---------------- 选项专用音效族 ----------------
       一组风格不同的"做选择"音效，按选项轮换使用，
       避免每次选择都是同一个声音。 */

    // 选项面板展开：柔和的上升扫频
    choiceOpen: function (t0, out) {
      tone(t0, { dest: out, type: 'sine', freq: 420, to: 880, glide: 0.14, dur: 0.22, peak: 0.075, atk: 0.02 });
      noise(t0, { dest: out, dur: 0.20, peak: 0.022, atk: 0.05, type: 'bandpass', f0: 1400, f1: 3200, q: 0.8 });
    },

    // 木质选择音：温暖、低沉
    pickWood: function (t0, out, v) {
      var f = 330 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'triangle', freq: f, dur: 0.13, peak: 0.16, atk: 0.002, lp: 2400, q: 1.4 });
      tone(t0 + 0.03, { dest: out, type: 'sine', freq: f * 2, dur: 0.16, peak: 0.06, atk: 0.003 });
      noise(t0, { dest: out, dur: 0.04, peak: 0.03, atk: 0.001, type: 'lowpass', f0: 900 });
    },

    // 铃音选择音：明亮、清脆
    pickBell: function (t0, out, v) {
      var f = 1320 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'sine', freq: f, dur: 0.42, peak: 0.13, atk: 0.002 });
      tone(t0 + 0.02, { dest: out, type: 'sine', freq: f * 1.5, dur: 0.30, peak: 0.07, atk: 0.002 });
      tone(t0 + 0.04, { dest: out, type: 'sine', freq: f * 2.01, dur: 0.22, peak: 0.035, atk: 0.003 });
    },

    // 电子气泡选择音：轻快
    pickBlip: function (t0, out, v) {
      var f = 760 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'square', freq: f, to: f * 1.7, glide: 0.05, dur: 0.10, peak: 0.075, atk: 0.002, lp: 3600, q: 1.1 });
      tone(t0 + 0.07, { dest: out, type: 'triangle', freq: f * 2, to: f * 3, glide: 0.06, dur: 0.12, peak: 0.055, atk: 0.002 });
    },

    // 风铃选择音：多个高频泛音，长衰减
    pickChime: function (t0, out, v) {
      var f = 1568 * Math.pow(1.0595, (v || 0) * 3);
      var r = [1, 2.76, 5.4, 8.9], i;              // 近似钟体泛音列
      for (i = 0; i < r.length; i++) {
        tone(t0, { dest: out, type: 'sine', freq: f * r[i], dur: 0.75 / (1 + i * 0.5),
          peak: 0.10 / (1 + i * 0.8), atk: 0.002 });
      }
      noise(t0, { dest: out, dur: 0.05, peak: 0.02, atk: 0.001, type: 'highpass', f0: 6000 });
    },

    // 拨弦选择音：锯齿波快速衰减，像拨了一下琴弦
    pickPluck: function (t0, out, v) {
      var f = 294 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'sawtooth', freq: f, dur: 0.34, peak: 0.10, atk: 0.002, lp: 2600, q: 2.4 });
      tone(t0, { dest: out, type: 'triangle', freq: f * 2, dur: 0.22, peak: 0.05, atk: 0.002, lp: 3400, q: 1.6 });
      tone(t0 + 0.006, { dest: out, type: 'sine', freq: f * 3, dur: 0.14, peak: 0.025, atk: 0.002 });
    },

    // 气泡选择音：正弦快速上滑，轻巧
    pickPop: function (t0, out, v) {
      var f = 520 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'sine', freq: f, to: f * 2.6, glide: 0.055, dur: 0.12, peak: 0.13, atk: 0.002 });
      tone(t0 + 0.055, { dest: out, type: 'triangle', freq: f * 2.6, to: f * 3.4, glide: 0.04, dur: 0.08, peak: 0.05, atk: 0.002 });
    },

    // 玻璃敲击选择音：高频清脆 + 轻微颤音
    pickGlass: function (t0, out, v) {
      var f = 2093 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'sine', freq: f, to: f * 0.985, glide: 0.30, dur: 0.40, peak: 0.085, atk: 0.001 });
      tone(t0, { dest: out, type: 'sine', freq: f * 1.52, dur: 0.26, peak: 0.045, atk: 0.001 });
      tone(t0, { dest: out, type: 'sine', freq: f * 2.41, dur: 0.18, peak: 0.022, atk: 0.001 });
    },

    // 犹疑 / 悬停未选：极轻的一口气音，带音高摆动
    hesitate: function (t0, out, v) {
      var f = 920 * Math.pow(1.0595, (v || 0) * 3);
      tone(t0, { dest: out, type: 'sine', freq: f, to: f * 0.94, glide: 0.06, dur: 0.075, peak: 0.035, atk: 0.006 });
      noise(t0, { dest: out, dur: 0.05, peak: 0.012, atk: 0.008, type: 'bandpass', f0: 2600, q: 1.6 });
    },

    // 确认：明亮的大三度铃音（A5 + C#6）加高八度闪光
    confirm: function (t0, out) {
      tone(t0, { dest: out, type: 'sine', freq: 880, dur: 0.5, peak: 0.19, atk: 0.004 });
      tone(t0, { dest: out, type: 'sine', freq: 1108.73, dur: 0.5, peak: 0.16, atk: 0.004 });
      tone(t0, { dest: out, type: 'triangle', freq: 1760, dur: 0.32, peak: 0.06, atk: 0.004 });
      tone(t0 + 0.045, { dest: out, type: 'sine', freq: 2637, dur: 0.3, peak: 0.035, atk: 0.004 });
    },

    // 取消：下行小二度，像一声泄气
    cancel: function (t0, out) {
      tone(t0, { dest: out, type: 'triangle', freq: 466.16, dur: 0.11, peak: 0.15, atk: 0.004, lp: 3000, q: 0.7 });
      tone(t0 + 0.095, { dest: out, type: 'triangle', freq: 440, dur: 0.24, peak: 0.14, atk: 0.004, lp: 2100, q: 0.7 });
      tone(t0 + 0.095, { dest: out, type: 'sine', freq: 220, dur: 0.22, peak: 0.06, atk: 0.006 });
    },

    // 返回：低频软闷响（不刺耳，像合上一本册子）
    back: function (t0, out) {
      tone(t0, { dest: out, type: 'sine', freq: 185, to: 70, glide: 0.2, dur: 0.26, peak: 0.22, atk: 0.004 });
      noise(t0, { dest: out, dur: 0.13, peak: 0.06, atk: 0.001, type: 'lowpass', f0: 620 });
    },

    // ---------------- 场景氛围与校园生活 ----------------

    // 军训哨声：高频尖锐、带一点颤音尾
    whistle: function (t0, out) {
      tone(t0, { dest: out, type: 'square', freq: 2350, to: 2280, glide: 0.06, dur: 0.10, peak: 0.10, atk: 0.004, lp: 5200, q: 1.2 });
      tone(t0 + 0.13, { dest: out, type: 'square', freq: 2350, to: 2260, glide: 0.06, dur: 0.16, peak: 0.10, atk: 0.004, lp: 5200, q: 1.2 });
      tone(t0, { dest: out, type: 'sine', freq: 4700, dur: 0.28, peak: 0.03, atk: 0.01 });
    },

    // 雷声：低频噪声爆发 + 很长衰减
    thunder: function (t0, out) {
      noise(t0, { dest: out, dur: 1.5, peak: 0.34, atk: 0.012, type: 'lowpass', f0: 420, f1: 90 });
      tone(t0, { dest: out, type: 'sine', freq: 78, to: 34, glide: 0.9, dur: 1.5, peak: 0.20, atk: 0.02 });
      noise(t0 + 0.25, { dest: out, dur: 1.2, peak: 0.10, atk: 0.2, type: 'lowpass', f0: 260 });
    },

    // 雨声：带通噪声，慢起慢落
    rain: function (t0, out) {
      noise(t0, { dest: out, dur: 1.6, peak: 0.10, atk: 0.3, type: 'bandpass', f0: 2400, f1: 3200, q: 0.5 });
      noise(t0 + 0.2, { dest: out, dur: 1.2, peak: 0.045, atk: 0.35, type: 'highpass', f0: 5200 });
    },

    // 风声：低频带通缓慢起伏
    wind: function (t0, out) {
      noise(t0, { dest: out, dur: 1.8, peak: 0.09, atk: 0.5, type: 'bandpass', f0: 520, f1: 900, q: 0.8 });
      noise(t0 + 0.6, { dest: out, dur: 1.4, peak: 0.05, atk: 0.5, type: 'bandpass', f0: 300, f1: 700, q: 0.8 });
    },

    // 鸟鸣：几个短促的高频滑音
    birds: function (t0, out) {
      var f = [3200, 3800, 3000, 4200], i;
      for (i = 0; i < f.length; i++) {
        tone(t0 + i * 0.13 + (i % 2) * 0.03, { dest: out, type: 'sine', freq: f[i], to: f[i] * 1.35, glide: 0.05, dur: 0.09, peak: 0.055, atk: 0.006 });
      }
    },

    // 人群嘈杂：宽带噪声 + 缓慢起伏
    crowd: function (t0, out) {
      noise(t0, { dest: out, dur: 1.7, peak: 0.075, atk: 0.4, type: 'bandpass', f0: 800, f1: 1400, q: 0.45 });
      noise(t0 + 0.15, { dest: out, dur: 1.3, peak: 0.04, atk: 0.4, type: 'highpass', f0: 1800 });
    },

    // 粉笔 / 板书：干燥的短促摩擦
    chalk: function (t0, out) {
      noise(t0, { dest: out, dur: 0.05, peak: 0.055, atk: 0.002, type: 'bandpass', f0: 3400, f1: 2600, q: 1.4 });
      noise(t0 + 0.06, { dest: out, dur: 0.04, peak: 0.04, atk: 0.002, type: 'bandpass', f0: 2900, f1: 3600, q: 1.4 });
    },

    // 开关门：低频撞击 + 一声吱呀
    door: function (t0, out) {
      tone(t0, { dest: out, type: 'sine', freq: 130, to: 58, glide: 0.08, dur: 0.22, peak: 0.20, atk: 0.003 });
      noise(t0, { dest: out, dur: 0.11, peak: 0.09, atk: 0.001, type: 'lowpass', f0: 900 });
      noise(t0 + 0.02, { dest: out, dur: 0.34, peak: 0.028, atk: 0.09, type: 'bandpass', f0: 1300, f1: 1900, q: 2.4 });
    },

    // 金钱：两枚硬币 + 金属泛音
    coin: function (t0, out) {
      tone(t0, { dest: out, type: 'triangle', freq: 1568, dur: 0.16, peak: 0.13, atk: 0.002, lp: 8000, q: 0.6 });
      tone(t0 + 0.055, { dest: out, type: 'triangle', freq: 2093, dur: 0.34, peak: 0.12, atk: 0.002, lp: 9000, q: 0.6 });
      tone(t0 + 0.055, { dest: out, type: 'sine', freq: 4186, dur: 0.26, peak: 0.035, atk: 0.004 });
    },

    // 荣誉 / 成就：明亮的小号式三音上行
    fanfare: function (t0, out) {
      var n = [523.25, 659.25, 783.99, 1046.50], i;
      for (i = 0; i < n.length; i++) {
        tone(t0 + i * 0.10, { dest: out, type: 'sawtooth', freq: n[i], dur: (i === n.length - 1 ? 0.75 : 0.20),
          peak: 0.085, atk: 0.008, lp: 3600, q: 0.9 });
        tone(t0 + i * 0.10, { dest: out, type: 'triangle', freq: n[i] * 2, dur: 0.18, peak: 0.04, atk: 0.006 });
      }
      noise(t0 + 0.30, { dest: out, dur: 0.55, peak: 0.02, atk: 0.18, type: 'bandpass', f0: 5200, f1: 8000, q: 1.0 });
    },

    // 时钟滴答：极短的高频点击
    tick: function (t0, out) {
      noise(t0, { dest: out, dur: 0.016, peak: 0.075, atk: 0.0004, type: 'bandpass', f0: 4200, q: 2.6 });
      tone(t0, { dest: out, type: 'square', freq: 1900, to: 1200, glide: 0.012, dur: 0.022, peak: 0.035, atk: 0.0004 });
    },

    // 水花
    splash: function (t0, out) {
      noise(t0, { dest: out, dur: 0.30, peak: 0.14, atk: 0.004, type: 'bandpass', f0: 1400, f1: 3600, q: 0.7 });
      tone(t0, { dest: out, type: 'sine', freq: 720, to: 180, glide: 0.20, dur: 0.26, peak: 0.06, atk: 0.005 });
    },

    // 猫叫：频率上滑再下滑，模拟一声"喵"
    cat: function (t0, out) {
      tone(t0, { dest: out, type: 'sawtooth', freq: 640, to: 980, glide: 0.10, dur: 0.16, peak: 0.10, atk: 0.02, lp: 3000, q: 3.2 });
      tone(t0 + 0.15, { dest: out, type: 'sawtooth', freq: 960, to: 520, glide: 0.24, dur: 0.30, peak: 0.095, atk: 0.02, lp: 2600, q: 3.2 });
      tone(t0, { dest: out, type: 'sine', freq: 1280, to: 700, glide: 0.3, dur: 0.4, peak: 0.03, atk: 0.03 });
    },

    // 猫呼噜：极低频调幅噪声
    purr: function (t0, out) {
      noise(t0, { dest: out, dur: 1.3, peak: 0.10, atk: 0.2, type: 'lowpass', f0: 220, q: 1.2 });
      tone(t0, { dest: out, type: 'sine', freq: 27, dur: 1.3, peak: 0.07, atk: 0.2 });
    },

    // 拨弦：短促的弹拨（用于社团 / 舞台）
    guitar: function (t0, out) {
      tone(t0, { dest: out, type: 'sawtooth', freq: 196, dur: 0.65, peak: 0.10, atk: 0.003, lp: 2200, q: 2.2 });
      tone(t0, { dest: out, type: 'triangle', freq: 392, dur: 0.5, peak: 0.055, atk: 0.003, lp: 3200, q: 1.6 });
      tone(t0 + 0.01, { dest: out, type: 'sine', freq: 784, dur: 0.3, peak: 0.03, atk: 0.003 });
    },

    // 手机震动：两声低频脉冲
    phoneVib: function (t0, out) {
      tone(t0, { dest: out, type: 'square', freq: 62, dur: 0.12, peak: 0.16, atk: 0.004, lp: 260, q: 1.5 });
      tone(t0 + 0.19, { dest: out, type: 'square', freq: 62, dur: 0.12, peak: 0.16, atk: 0.004, lp: 260, q: 1.5 });
      noise(t0, { dest: out, dur: 0.30, peak: 0.03, atk: 0.004, type: 'lowpass', f0: 300 });
    },

    // 好感度上升：温暖的上行琶音（C-E-G-C）+ 高频微光
    heart: function (t0, out) {
      var seq = [523.25, 659.25, 783.99, 1046.50];   // C5 E5 G5 C6
      var i, tt;
      for (i = 0; i < 4; i++) {
        tt = t0 + i * 0.085;
        tone(tt, { dest: out, type: 'triangle', freq: seq[i], dur: 0.6, peak: 0.15, atk: 0.004, lp: 5200, q: 0.7 });
        tone(tt, { dest: out, type: 'sine', freq: seq[i] * 2, dur: 0.34, peak: 0.045, atk: 0.004 });
      }
      tone(t0, { dest: out, type: 'sine', freq: 392, dur: 0.9, peak: 0.06, atk: 0.14, sus: 0.5 });
      tone(t0 + 0.34, { dest: out, type: 'sine', freq: 2093, dur: 0.55, peak: 0.03, atk: 0.22 });
      noise(t0 + 0.3, { dest: out, dur: 0.5, peak: 0.018, atk: 0.24, type: 'bandpass', f0: 6000, f1: 9500, q: 1.2 });
    },

    // 好感度下降：下行小调三音（A-F-D）+ 暗色低音
    heartbreak: function (t0, out) {
      var seq = [440, 349.23, 293.66];               // A4 F4 D4
      var i;
      for (i = 0; i < 3; i++) {
        tone(t0 + i * 0.17, { dest: out, type: 'triangle', freq: seq[i], dur: 0.6, peak: 0.15, atk: 0.006, lp: 2500, q: 0.7 });
      }
      tone(t0, { dest: out, type: 'sawtooth', freq: 110, dur: 1.0, peak: 0.05, atk: 0.09, lp: 620, q: 0.7, sus: 0.5 });
      tone(t0 + 0.32, { dest: out, type: 'sine', freq: 220, dur: 0.65, peak: 0.07, atk: 0.05, sus: 0.5 });
      tone(t0 + 0.32, { dest: out, type: 'sine', freq: 174.61, dur: 0.65, peak: 0.05, atk: 0.05, sus: 0.5 });
    },

    // CG / 成就解锁：上行四音琶音（G-C-E-G）+ 闪烁尾音
    unlock: function (t0, out) {
      var seq = [783.99, 1046.50, 1318.51, 1567.98];  // G5 C6 E6 G6
      var i, tt;
      for (i = 0; i < 4; i++) {
        tt = t0 + i * 0.07;
        tone(tt, { dest: out, type: 'triangle', freq: seq[i], dur: 0.78 - i * 0.06, peak: 0.14, atk: 0.002, lp: 9000, q: 0.7 });
        tone(tt, { dest: out, type: 'sine', freq: seq[i] * 2, dur: 0.3, peak: 0.035, atk: 0.002 });
      }
      // 闪烁尾音：上扬的带通噪声 + 高频泛音
      noise(t0 + 0.2, { dest: out, dur: 0.92, peak: 0.03, atk: 0.2, type: 'bandpass', f0: 4200, f1: 11000, q: 1.4 });
      tone(t0 + 0.28, { dest: out, type: 'sine', freq: 2093, dur: 0.8, peak: 0.045, atk: 0.06 });
      tone(t0 + 0.28, { dest: out, type: 'sine', freq: 3136, dur: 0.8, peak: 0.025, atk: 0.13 });
    },

    // 失败：发闷的下行锯齿嗡鸣
    fail: function (t0, out) {
      tone(t0, { dest: out, type: 'sawtooth', freq: 196, to: 108, glide: 0.42, dur: 0.5, peak: 0.13, atk: 0.01, lp: 900, lpTo: 380, q: 1.1, sus: 0.3 });
      tone(t0, { dest: out, type: 'square', freq: 98, to: 54, glide: 0.42, dur: 0.5, peak: 0.07, atk: 0.01, lp: 600, q: 0.7 });
      noise(t0, { dest: out, dur: 0.12, peak: 0.03, atk: 0.002, type: 'lowpass', f0: 700 });
    },

    // 成功：明亮的三音小号角（C-E-G，最后一音加长并叠上八度）
    success: function (t0, out) {
      var seq = [523.25, 659.25];                     // C5 E5 起头
      var i, tt;
      for (i = 0; i < 2; i++) {
        tt = t0 + i * 0.125;
        tone(tt, { dest: out, type: 'square', freq: seq[i], dur: 0.16, peak: 0.075, atk: 0.004, lp: 2600, q: 0.9, sus: 0.3 });
        tone(tt, { dest: out, type: 'sine', freq: seq[i], dur: 0.2, peak: 0.07, atk: 0.004, sus: 0.3 });
      }
      tone(t0 + 0.25, { dest: out, type: 'square', freq: 783.99, dur: 0.62, peak: 0.08, atk: 0.004, lp: 2800, q: 0.9, sus: 0.45 });
      tone(t0 + 0.25, { dest: out, type: 'square', freq: 1046.50, dur: 0.62, peak: 0.055, atk: 0.004, lp: 3000, q: 0.9, sus: 0.45 });
      tone(t0 + 0.25, { dest: out, type: 'sine', freq: 1567.98, dur: 0.5, peak: 0.035, atk: 0.006 });
    },

    // 场景切换：带通噪声扫频（低->高再回落）
    whoosh: function (t0, out) {
      noise(t0, { dest: out, dur: 0.5, peak: 0.19, atk: 0.15, type: 'bandpass', f0: 220, f1: 3400, q: 1.0, pan: 0 });
      noise(t0 + 0.02, { dest: out, dur: 0.46, peak: 0.08, atk: 0.18, type: 'highpass', f0: 3200, f1: 320, q: 0.7 });
      tone(t0, { dest: out, type: 'sine', freq: 180, to: 90, glide: 0.4, dur: 0.42, peak: 0.05, atk: 0.1, sus: 0.3 });
    },

    // 上课铃/校园钟：FM 金属音，长衰减，带一点失谐的"咣——"
    bell: function (t0, out) {
      fmBell(t0, out, { freq: 659.25, dur: 1.05, peak: 0.13, index: 950, detune: -4 });
      fmBell(t0, out, { freq: 663.0, dur: 1.0, peak: 0.07, index: 900, detune: 5 });   // 略微失谐 -> 拍频
      tone(t0, { dest: out, type: 'sine', freq: 2637, dur: 0.35, peak: 0.03, atk: 0.002 });
      noise(t0, { dest: out, dur: 0.03, peak: 0.035, atk: 0.0006, type: 'highpass', f0: 4200 });
      // 钟声的余韵回响（像铃声在校道上回荡）
      fmBell(t0 + 0.46, out, { freq: 663.0, dur: 0.66, peak: 0.045, index: 700, detune: 3 });
    },

    // 摔门/重物落地：短促的强噪声 + 低频冲击
    slam: function (t0, out) {
      noise(t0, { dest: out, dur: 0.17, peak: 0.42, atk: 0.0008, type: 'lowpass', f0: 1500, f1: 380, q: 0.9 });
      noise(t0, { dest: out, dur: 0.03, peak: 0.16, atk: 0.0006, type: 'highpass', f0: 3000 });
      tone(t0, { dest: out, type: 'sine', freq: 96, to: 42, glide: 0.16, dur: 0.28, peak: 0.34, atk: 0.002 });
      tone(t0 + 0.01, { dest: out, type: 'triangle', freq: 190, to: 90, glide: 0.12, dur: 0.16, peak: 0.09, atk: 0.002, lp: 900 });
    },

    // 戏剧性重音：镲片式的噪声渐强 + 低音重击（用于转折/登场）
    drama: function (t0, out) {
      noise(t0, { dest: out, dur: 0.75, peak: 0.13, atk: 0.3, type: 'bandpass', f0: 900, f1: 2600, q: 0.9 });   // 渐强的镲
      tone(t0 + 0.26, { dest: out, type: 'sine', freq: 78, to: 44, glide: 0.3, dur: 0.55, peak: 0.32, atk: 0.004 });
      tone(t0 + 0.26, { dest: out, type: 'sawtooth', freq: 110, dur: 0.5, peak: 0.07, atk: 0.01, lp: 420, q: 0.8, sus: 0.35 });
      noise(t0 + 0.26, { dest: out, dur: 0.62, peak: 0.11, atk: 0.003, type: 'highpass', f0: 3400 });           // 爆点
      tone(t0 + 0.26, { dest: out, type: 'triangle', freq: 440, to: 415.3, glide: 0.4, dur: 0.42, peak: 0.05, atk: 0.006, lp: 2600 });
    },

    // 打字机：极短极轻的电子滴答；内部限流 45ms，重复调用开销极小
    typing: function (t0, out) {
      if (t0 - _lastTypeAt < 0.045) return;   // 限流：每 45ms 最多一次
      _lastTypeAt = t0;
      var f = 1500 + Math.random() * 750;     // 轻微随机音高，避免机械感
      tone(t0, { dest: out, type: 'triangle', freq: f, to: f * 0.72, glide: 0.018, dur: 0.022, peak: 0.038, atk: 0.0008, lp: 6500, q: 0.7 });
    },

    // 警报：急促的双音交替蜂鸣
    alarm: function (t0, out) {
      var f = [880, 587.33];
      var i, tt;
      for (i = 0; i < 4; i++) {
        tt = t0 + i * 0.135;
        tone(tt, { dest: out, type: 'square', freq: f[i % 2], dur: 0.115, peak: 0.085, atk: 0.004, lp: 2600, q: 0.9, sus: 0.5 });
        tone(tt, { dest: out, type: 'sine', freq: f[i % 2] * 2, dur: 0.1, peak: 0.03, atk: 0.004, sus: 0.5 });
      }
    },

    // 翻书/翻页：几层带通噪声的"哗啦"
    page: function (t0, out) {
      noise(t0, { dest: out, dur: 0.11, peak: 0.085, atk: 0.012, type: 'bandpass', f0: 2400, f1: 5200, q: 0.7, pan: -0.2 });
      noise(t0 + 0.055, { dest: out, dur: 0.09, peak: 0.065, atk: 0.01, type: 'bandpass', f0: 1800, f1: 4200, q: 0.8, pan: 0.15 });
      noise(t0 + 0.11, { dest: out, dur: 0.08, peak: 0.045, atk: 0.008, type: 'bandpass', f0: 3000, f1: 6200, q: 0.7, pan: 0.3 });
      tone(t0, { dest: out, type: 'sine', freq: 320, dur: 0.06, peak: 0.02, atk: 0.003 });
    },

    // 水滴：正弦下滑 + 一点共鸣，像屋檐落水
    water: function (t0, out) {
      tone(t0, { dest: out, type: 'sine', freq: 1420, to: 620, glide: 0.13, dur: 0.17, peak: 0.15, atk: 0.002 });
      noise(t0, { dest: out, dur: 0.07, peak: 0.05, atk: 0.001, type: 'bandpass', f0: 1900, q: 7 });
      tone(t0 + 0.15, { dest: out, type: 'sine', freq: 900, to: 460, glide: 0.11, dur: 0.14, peak: 0.06, atk: 0.002 });
    },

    // 相机快门：两声机械咔嗒 + 轻微机身震动
    camera: function (t0, out) {
      noise(t0, { dest: out, dur: 0.032, peak: 0.26, atk: 0.0006, type: 'highpass', f0: 1900 });
      tone(t0, { dest: out, type: 'sine', freq: 150, to: 82, glide: 0.07, dur: 0.09, peak: 0.09, atk: 0.001 });
      noise(t0 + 0.058, { dest: out, dur: 0.036, peak: 0.2, atk: 0.0006, type: 'highpass', f0: 2500 });
      noise(t0 + 0.06, { dest: out, dur: 0.05, peak: 0.05, atk: 0.001, type: 'bandpass', f0: 1400, q: 1.5 });
    },

    // 脚步：低沉的脚步落地声（踩在走廊地板上）
    step: function (t0, out) {
      noise(t0, { dest: out, dur: 0.1, peak: 0.1, atk: 0.003, type: 'lowpass', f0: 420, f1: 220, q: 0.8 });
      tone(t0, { dest: out, type: 'sine', freq: 126, to: 55, glide: 0.09, dur: 0.13, peak: 0.11, atk: 0.002 });
      noise(t0, { dest: out, dur: 0.03, peak: 0.03, atk: 0.001, type: 'bandpass', f0: 1800, q: 1.2 });
    },

    // 手机消息提示：两声轻快的正弦（E6 -> A6）
    notification: function (t0, out) {
      tone(t0, { dest: out, type: 'sine', freq: 1318.51, dur: 0.1, peak: 0.12, atk: 0.004, sus: 0.4 });
      tone(t0 + 0.032, { dest: out, type: 'triangle', freq: 2637, dur: 0.07, peak: 0.028, atk: 0.004 });
      tone(t0 + 0.115, { dest: out, type: 'sine', freq: 1760, dur: 0.17, peak: 0.12, atk: 0.004, sus: 0.45 });
      tone(t0 + 0.145, { dest: out, type: 'triangle', freq: 3520, dur: 0.1, peak: 0.022, atk: 0.004 });
    }
  };

  // 音效名列表（顺序即文档顺序）
  var SFX_NAMES = [
    'click', 'hover', 'select', 'confirm', 'cancel', 'back',
    'heart', 'heartbreak', 'unlock', 'fail', 'success',
    'whoosh', 'bell', 'slam', 'drama', 'typing', 'alarm',
    'page', 'water', 'camera', 'step', 'notification',
    // —— 场景氛围与校园生活 ——
    'whistle',    // 军训哨声
    'thunder',    // 雷声
    'rain',       // 雨声（短循环感）
    'wind',       // 风声
    'birds',      // 鸟鸣
    'crowd',      // 人群嘈杂
    'chalk',      // 粉笔 / 板书
    'door',       // 开关门
    'coin',       // 金钱
    'fanfare',    // 荣誉 / 成就
    'tick',       // 时钟滴答
    'splash',     // 水花
    'cat',        // 猫叫
    'purr',       // 猫呼噜
    'guitar',     // 拨弦（社团 / 舞台）
    'phoneVib',   // 手机震动
    // —— 选项音效族（轮换使用，避免每次选择都是同一个声音）——
    'choiceOpen', // 选项面板展开
    'pickWood',   // 木质
    'pickBell',   // 铃音
    'pickBlip',   // 电子
    'pickChime',  // 风铃
    'pickPluck',  // 拨弦
    'pickPop',    // 气泡
    'pickGlass',  // 玻璃
    'hesitate'    // 悬停未选
  ];

  /* variant：可选的变体序号，音效定义里可用它改变音高等，
     让同一个动作（如"选择"）每次听起来不完全一样。 */
  function playSfx(name, variant) {
    try {
      if (!_settings.enabled) return;                  // 总开关关闭
      if (!name) return;
      var def = SFX_DEFS[name];
      if (typeof def !== 'function') return;           // 未知音效：静默无操作
      if (!_ctx) ensureCtx();
      if (!isRunning()) { ensureCtx(); return; }       // 还没解锁：静默丢弃（不排队，避免解锁后一次性爆响）
      def(nowT() + 0.005, _seBus, variant || 0);       // 留 5ms 余量，避开主线程抖动
    } catch (e) {
      warn(e);
    }
  }

  var sfx = {
    NAMES: SFX_NAMES,
    play: playSfx
  };

  // ==========================================================================
  // §6  音高/和弦记号解析
  //   模式串（pattern）语法：
  //     "步号:音高[:时值(拍)[:力度]]"   以空格分隔，# 开头为注释
  //     步号   = 小节内的十六分音符序号 0..15
  //     音高   = MIDI 数字 | R 记号 | P 记号
  //       R    = 当前和弦根音（和弦数组第一个音）        R7 = 根音+7(五度) R12 = 根音+12
  //       Pn   = 和弦的第 n 个音，超出和弦长度时自动向上翻八度
  //              (P1=根音 P2=三音 P3=五音 P4=根音+12 …)
  //   例：'0:P1:0.8 4:P3:0.8' 表示该小节第 1、5 个十六分音符各弹一个和弦音
  // ==========================================================================
  function parsePattern(src, defBeats) {
    var map = {}, toks, i, tk, parts, s, tok, beats, vel;
    if (!src) return map;
    toks = String(src).split(/\s+/);
    for (i = 0; i < toks.length; i++) {
      tk = toks[i];
      if (!tk || tk.charAt(0) === '#') continue;
      parts = tk.split(':');
      s = parseInt(parts[0], 10);
      if (!isFinite(s)) continue;
      s = ((s % STEPS_PER_BAR) + STEPS_PER_BAR) % STEPS_PER_BAR;
      tok = parts[1];
      if (tok == null || tok === '') continue;
      if (/^-?\d+$/.test(tok)) tok = parseInt(tok, 10);
      beats = (parts.length > 2) ? parseFloat(parts[2]) : defBeats;
      if (!isFinite(beats) || beats <= 0) beats = 1;
      vel = (parts.length > 3) ? parseFloat(parts[3]) : 1;
      if (!isFinite(vel)) vel = 1;
      if (!map[s]) map[s] = [];
      map[s].push({ tok: tok, beats: beats, vel: vel });
    }
    return map;
  }

  // 把「每小节一条模式串」的数组编译成 map[bar][step] = [事件]
  function compilePat(arr, bars, defBeats) {
    var out = [], i;
    if (!arr) return null;
    if (typeof arr === 'string') arr = [arr];
    if (!arr.length) return null;
    for (i = 0; i < bars; i++) out.push(parsePattern(arr[i % arr.length], defBeats));
    return out;
  }

  // 该步号上是否有音符
  function hasStep(map, k) { return !!(map && map[k]); }

  // 把记号解析成 MIDI 音高
  function resolveTok(tok, chord) {
    if (typeof tok === 'number') return tok;
    var s = String(tok);
    var ch = (chord && chord.length) ? chord : [60, 64, 67];
    var head = s.charAt(0);
    if (head === 'R') {
      var d = (s.length > 1) ? parseInt(s.slice(1), 10) : 0;
      if (!isFinite(d)) d = 0;
      return ch[0] + d;
    }
    if (head === 'P') {
      var n = (s.length > 1) ? parseInt(s.slice(1), 10) : 1;
      if (!isFinite(n) || n < 1) n = 1;
      var idx = (n - 1) % ch.length;
      return ch[idx] + 12 * Math.floor((n - 1) / ch.length);
    }
    return ch[0];
  }

  // ==========================================================================
  // §7  声部（BGM 的乐器）
  // ==========================================================================

  // 铺垫和声：锯齿波过低通 + 失谐展宽 + 高八度空气层
  function padVoice(t0, dest, chord, dur, o) {
    var n = chord.length, i, midi, panned;
    if (!n) return;
    for (i = 0; i < n; i++) {
      midi = chord[i];
      panned = (n > 1) ? ((i / (n - 1)) * 2 - 1) * (o.width == null ? 0.45 : o.width) : 0;
      tone(t0, {
        dest: dest, type: o.type || 'sawtooth', freq: mtof(midi),
        detune: (i - (n - 1) / 2) * (o.detune == null ? 7 : o.detune),
        dur: dur, atk: o.atk, sus: o.sus == null ? 0.55 : o.sus,
        peak: (o.gain / n) * (i === 0 ? 1.25 : 1),
        lp: o.lp || 1100, q: o.q == null ? 0.8 : o.q, pan: panned
      });
      if (o.air) {   // 空气感：高八度纯正弦
        tone(t0, {
          dest: dest, type: 'sine', freq: mtof(midi + 12),
          dur: dur * 0.9, atk: (o.atk || 0.5) * 1.15, sus: 0.5,
          peak: o.air / n, pan: -panned * 0.6
        });
      }
    }
  }

  // 低音：三角波打底 + 高八度正弦补清晰度（小喇叭也听得见）
  function bassVoice(t0, dest, midi, dur, o) {
    var gg = o.gain == null ? 0.26 : o.gain;
    tone(t0, { dest: dest, type: 'triangle', freq: mtof(midi), dur: dur, atk: o.atk == null ? 0.012 : o.atk, sus: o.sus == null ? 0.45 : o.sus, peak: gg, lp: o.lp || 540, q: 0.7 });
    tone(t0, { dest: dest, type: 'sine', freq: mtof(midi + 12), dur: dur * 0.8, atk: o.atk == null ? 0.012 : o.atk, sus: 0.4, peak: gg * 0.4 });
    if (o.punch) {
      tone(t0, { dest: dest, type: 'sawtooth', freq: mtof(midi), dur: Math.min(0.09, dur * 0.5), atk: 0.002, peak: gg * 0.3, lp: 950, q: 0.7 });
    }
  }

  // 主旋律：三角波/锯齿波 + 可选高八度闪光
  function leadVoice(t0, dest, midi, dur, o) {
    var gg = (o.gain == null ? 0.14 : o.gain);
    tone(t0, {
      dest: dest, type: o.type || 'triangle', freq: mtof(midi),
      dur: dur, atk: o.atk == null ? 0.008 : o.atk, sus: o.sus == null ? 0.35 : o.sus,
      peak: gg, lp: o.lp || 4200, q: 0.7
    });
    if (o.shine) {
      tone(t0, { dest: dest, type: 'sine', freq: mtof(midi + 12), dur: dur * 0.7, atk: (o.atk == null ? 0.008 : o.atk) * 1.4, sus: 0.3, peak: gg * 0.3 });
    }
  }

  // ==========================================================================
  // §8  BGM 曲库
  //   bpm / bars / chords(每小节一个和弦, 原位排列, 最低音即根音)
  //   bass / mel = 每小节一条模式串（数组循环使用）
  //   pad / lead = 音色参数（atk 单位为"拍"）
  //   drums      = 每小节固定的鼓型；drums.fill 只在最后一小节叠加
  // ==========================================================================
  var TRACKS = {

    // ── title ── 标题画面。C 大调 66BPM。
    //    温柔、充满希望的八音盒琶音，缓慢铺底，像开学第一天清晨的校园。
    title: {
      bpm: 66, bars: 8,
      chords: [
        [60, 64, 67],      // C
        [59, 62, 67],      // G/B
        [57, 60, 64],      // Am
        [55, 59, 64],      // Em/G
        [53, 57, 60],      // F
        [52, 55, 60],      // C/E
        [50, 53, 57, 60],  // Dm7
        [55, 59, 62, 65]   // G7 -> 回到 C
      ],
      pad:  { type: 'sawtooth', gain: 0.05, atk: 1.0, lp: 1000, air: 0.012, sus: 0.6, detune: 7 },
      bass: ['0:R:3.4'],
      bassOct: -12, bassGain: 0.24,
      // 前四小节：和弦琶音（P1..P4 自动跟随和声）；后四小节：一条会落回主音的小旋律
      mel: [
        '0:P4:0.85 2:P5:0.85 4:P6:0.85 6:P7:0.85 8:P6:0.85 10:P5:0.85 12:P4:0.85 14:P5:0.85',
        '0:P4:0.85 2:P5:0.85 4:P6:0.85 6:P7:0.85 8:P6:0.85 10:P5:0.85 12:P4:0.85 14:P5:0.85',
        '0:P4:0.85 2:P5:0.85 4:P6:0.85 6:P7:0.85 8:P6:0.85 10:P5:0.85 12:P4:0.85 14:P5:0.85',
        '0:P4:0.85 2:P5:0.85 4:P6:0.85 6:P7:0.85 8:P6:0.85 10:P5:0.85 12:P4:0.85 14:P5:0.85',
        '0:84:2.2 4:81:2.2 8:77:2.2 12:81:2.2',   // F  ：C6 A5 F5 A5
        '0:79:2.2 4:76:2.2 8:72:2.2 12:76:2.2',   // C/E：G5 E5 C5 E5
        '0:77:2.2 4:81:2.2 8:84:2.2 12:81:2.2',   // Dm7：F5 A5 C6 A5
        '0:83:2.2 4:79:2.2 8:74:2.2 12:71:2.2'    // G7 ：B5 G5 D5 B4
      ],
      lead: { type: 'triangle', gain: 0.12, lp: 5200, atk: 0.006, sus: 0, shine: true }
    },

    // ── daily ── 日常校园。C 大调 108BPM。
    //    轻快、暖色调，八分音符跳跃的旋律 + 软底鼓与细碎 hi-hat，像课间走廊。
    daily: {
      bpm: 108, bars: 8,
      chords: [
        [60, 64, 67],      // C
        [55, 59, 62],      // G
        [57, 60, 64],      // Am
        [53, 57, 60],      // F
        [60, 64, 67],      // C
        [55, 59, 62],      // G
        [53, 57, 60],      // F
        [55, 59, 62, 65]   // G7
      ],
      pad:  { type: 'sawtooth', gain: 0.042, atk: 0.5, lp: 1250, air: 0.01, sus: 0.5, detune: 6 },
      bass: ['0:R:1.5 6:R:0.9 8:R:1.4 14:R12:0.8'],   // 走动式低音：正拍 + 小跳
      bassOct: -12, bassGain: 0.26, bassPunch: true,
      mel: [
        '0:72:0.85 2:76:0.85 4:79:1.6 8:76:0.85 10:74:0.85 12:72:1.6',
        '0:71:0.85 2:74:0.85 4:79:1.6 8:74:0.85 10:71:0.85 12:74:1.6',
        '0:69:0.85 2:72:0.85 4:76:1.6 8:72:0.85 10:69:0.85 12:67:1.6',
        '0:65:0.85 2:69:0.85 4:72:0.85 6:77:1.2 8:76:0.85 12:72:1.6',
        '0:72:0.85 2:76:0.85 4:79:1.6 8:76:0.85 10:74:0.85 12:72:1.6',
        '0:71:0.85 2:74:0.85 4:79:1.6 8:76:0.85 10:74:0.85 12:71:1.6',
        '0:77:0.85 4:76:0.85 8:74:1.2 12:72:1.6',
        '0:71:0.85 2:74:0.85 4:79:1.2 8:76:0.85 12:74:1.6'
      ],
      lead: { type: 'triangle', gain: 0.14, lp: 4600, atk: 0.006, sus: 0.25, shine: true },
      drums: { kick: '0 8', hat: '4 6 12 14', snare: '4 12', kickG: 0.3, hatG: 0.04, snareG: 0.048 },
      fill:  { hat: '13 14 15', snare: '14' }
    },

    // ── festival ── 节庆/晚会。C 大调 132BPM。
    //    热烈明亮，铜管味的方波旋律跑句，四四拍底鼓 + 反拍军鼓。
    festival: {
      bpm: 132, bars: 8,
      chords: [
        [60, 64, 67],      // C
        [53, 57, 60],      // F
        [55, 59, 62],      // G
        [60, 64, 67],      // C
        [57, 60, 64],      // Am
        [53, 57, 60],      // F
        [55, 59, 62],      // G
        [60, 64, 67]       // C
      ],
      pad:  { type: 'sawtooth', gain: 0.048, atk: 0.25, lp: 1700, air: 0.012, sus: 0.32, detune: 8 },
      bass: ['0:R:0.8 4:R:0.8 8:R:0.8 12:R:0.8'],
      bassOct: -12, bassGain: 0.28, bassPunch: true,
      mel: [
        '0:72:0.4 2:76:0.4 4:79:0.4 6:84:0.7 8:79:0.4 10:76:0.4 12:79:0.4 14:84:0.7',
        '0:77:0.4 2:81:0.4 4:84:0.7 8:81:0.4 10:77:0.4 12:81:0.4 14:84:0.7',
        '0:79:0.4 2:83:0.4 4:86:0.7 8:83:0.4 10:79:0.4 12:83:0.4 14:86:0.7',
        '0:84:1.6 4:79:0.7 8:76:0.4 10:72:0.4 12:76:0.4 14:79:0.7',
        '0:81:0.4 2:84:0.4 4:81:0.7 8:76:0.4 10:72:0.4 12:76:0.4 14:81:0.7',
        '0:77:0.4 2:81:0.4 4:84:0.7 8:81:0.4 10:77:0.4 12:81:0.4 14:84:0.7',
        '0:79:0.4 2:83:0.4 4:86:0.7 8:86:0.4 10:83:0.4 12:79:0.4 14:74:0.7',
        '0:84:1.8 8:79:0.7 12:72:1.6'
      ],
      lead: { type: 'square', gain: 0.062, lp: 3000, atk: 0.004, sus: 0.3, shine: true },
      drums: { kick: '0 4 8 12', hat: '2 6 10 14', snare: '4 12', kickG: 0.28, hatG: 0.045, snareG: 0.062 },
      fill:  { snare: '12 13 14 15', kick: '14' }
    },

    // ── romantic ── 恋爱/心动。C 大调 58BPM。
    //    缓慢温柔，大七和弦厚垫 + 长音气息旋律，每小节末尾一下轻轻的贝斯心跳。
    romantic: {
      bpm: 58, bars: 8,
      chords: [
        [53, 57, 60, 64],  // Fmaj7
        [60, 64, 67, 71],  // Cmaj7
        [50, 53, 57, 60],  // Dm7
        [55, 59, 62, 65],  // G7
        [52, 55, 59, 62],  // Em7
        [57, 60, 64, 67],  // Am7
        [53, 57, 60, 64],  // Fmaj7
        [55, 60, 62, 65]   // G7sus4 -> 回到 Fmaj7
      ],
      pad:  { type: 'sawtooth', gain: 0.072, atk: 1.7, lp: 950, air: 0.02, sus: 0.68, detune: 9, width: 0.5 },
      bass: ['0:R:3.5 14:R:0.7'],   // 尾部轻轻一点，像心跳
      bassOct: -12, bassGain: 0.22,
      mel: [
        '0:81:3.0 8:84:3.0',   // Fmaj7：A5 C6
        '0:83:3.0 8:79:3.0',   // Cmaj7：B5 G5
        '0:81:3.0 8:77:3.0',   // Dm7  ：A5 F5
        '0:79:3.0 8:74:3.0',   // G7   ：G5 D5
        '0:76:3.0 8:79:3.0',   // Em7  ：E5 G5
        '0:72:3.0 8:76:3.0',   // Am7  ：C5 E5
        '0:77:3.0 8:81:3.0',   // Fmaj7：F5 A5
        '0:79:3.2 8:77:1.6'    // G7sus4：G5 F5（4-3 挂留，接回 A5 很顺）
      ],
      lead: { type: 'sine', gain: 0.125, lp: 4000, atk: 0.35, sus: 0.6, shine: true }
    },

    // ── sad ── 失落/离别。A 小调 54BPM。
    //    低沉稀疏，只有缓慢的长音与厚重的暗色垫子，末尾引导音 G# 指回主音。
    sad: {
      bpm: 54, bars: 8,
      chords: [
        [57, 60, 64],      // Am
        [53, 57, 60],      // F
        [60, 64, 67],      // C
        [55, 59, 62],      // G
        [57, 60, 64],      // Am
        [53, 57, 60],      // F
        [50, 53, 57],      // Dm
        [52, 56, 59, 62]   // E7 -> 回到 Am
      ],
      pad:  { type: 'sawtooth', gain: 0.055, atk: 1.9, lp: 700, air: 0.008, sus: 0.72, detune: 6 },
      bass: ['0:R:3.6'],
      bassOct: -12, bassGain: 0.26,
      mel: [
        '0:76:2.0 12:72:2.0',   // Am：E5 C5
        '0:77:2.0 12:72:2.0',   // F ：F5 C5
        '0:76:2.0 12:72:2.0',   // C ：E5 C5
        '0:79:2.0 12:74:2.0',   // G ：G5 D5
        '0:76:2.0 12:72:2.0',   // Am
        '0:81:2.0 12:77:2.0',   // F ：A5 F5
        '0:74:2.0 12:77:2.0',   // Dm：D5 F5
        '0:71:2.0 12:68:2.4'    // E7：B4 G#4（导音，回到主音）
      ],
      lead: { type: 'sine', gain: 0.115, lp: 2600, atk: 0.25, sus: 0.55 }
    },

    // ── tension ── 紧张/危机。D 小调 122BPM。
    //    八分音符脉冲低音 + 执拗的同音反复（D 在 Bb/Gm 上是和弦音，在 A7 上是挂留四度），
    //    像心跳监测仪一样一刻不停。
    tension: {
      bpm: 122, bars: 8,
      chords: [
        [62, 65, 69],      // Dm
        [62, 65, 69],      // Dm
        [58, 62, 65],      // Bb
        [57, 61, 64, 67],  // A7
        [62, 65, 69],      // Dm
        [62, 65, 69],      // Dm
        [55, 58, 62],      // Gm
        [57, 61, 64, 67]   // A7
      ],
      pad:  { type: 'sawtooth', gain: 0.05, atk: 0.4, lp: 780, air: 0.008, sus: 0.35, detune: 5 },
      bass: ['0:R:0.42 2:R:0.42 4:R:0.42 6:R:0.42 8:R:0.42 10:R:0.42 12:R:0.42 14:R:0.42'],
      bassOct: -12, bassGain: 0.3, bassPunch: true,
      mel: [
        '0:74:0.42 2:74:0.42 4:74:0.42 6:74:0.42 8:74:0.42 10:74:0.42 12:77:0.5 14:74:0.5',
        '0:74:0.42 2:74:0.42 4:74:0.42 6:74:0.42 8:77:0.42 10:77:0.42 12:81:0.5 14:77:0.5',
        '0:74:0.42 2:74:0.42 4:77:0.42 6:77:0.42 8:74:0.42 10:74:0.42 12:70:0.5 14:74:0.5',
        '0:73:0.42 2:73:0.42 4:76:0.42 6:76:0.42 8:73:0.42 10:73:0.42 12:76:0.5 14:79:0.5',
        '0:74:0.42 2:74:0.42 4:74:0.42 6:74:0.42 8:74:0.42 10:74:0.42 12:77:0.5 14:74:0.5',
        '0:74:0.42 2:74:0.42 4:77:0.42 6:77:0.42 8:81:0.42 10:81:0.42 12:84:0.5 14:81:0.5',
        '0:74:0.42 2:74:0.42 4:70:0.42 6:70:0.42 8:74:0.42 10:74:0.42 12:79:0.5 14:74:0.5',
        '0:73:0.42 2:73:0.42 4:76:0.42 6:76:0.42 8:79:0.42 10:79:0.42 12:76:0.5 14:73:0.5'
      ],
      lead: { type: 'triangle', gain: 0.085, lp: 3000, atk: 0.004, sus: 0.1 },
      drums: { kick: '0 8', hat: '2 6 10 14', timp: '12', kickG: 0.26, hatG: 0.038, timpG: 0.16 }
    },

    // ── drama ── 戏剧性场面（社团演出/重大转折）。D 小调 84BPM。
    //    大幅度的起伏：厚垫每小节涨落一次，弦乐味的锯齿主旋律从低到高爬升，
    //    定音鼓跟随和弦根音砸在强拍上。
    drama: {
      bpm: 84, bars: 8,
      chords: [
        [62, 65, 69],      // Dm
        [58, 62, 65],      // Bb
        [53, 57, 60],      // F
        [60, 64, 67],      // C
        [62, 65, 69],      // Dm
        [58, 62, 65],      // Bb
        [55, 58, 62],      // Gm
        [57, 61, 64]       // A  -> 回到 Dm
      ],
      pad:  { type: 'sawtooth', gain: 0.068, atk: 1.2, lp: 820, air: 0.016, sus: 0.62, detune: 10, width: 0.55 },
      bass: ['0:R:1.8 8:R:1.7'],
      bassOct: -12, bassGain: 0.28, bassPunch: true,
      mel: [
        '0:62:1.8 4:65:1.8 8:69:3.6',   // Dm：D4 F4 A4（主题动机上行）
        '0:70:3.6 8:65:3.6',            // Bb：Bb4 F4
        '0:72:1.8 4:69:1.8 8:65:3.6',   // F ：C5 A4 F4
        '0:67:1.8 4:72:1.8 8:76:3.6',   // C ：G4 C5 E5
        '0:74:1.8 4:77:1.8 8:81:3.6',   // Dm：D5 F5 A5（高潮）
        '0:82:3.6 8:77:3.6',            // Bb：Bb5 F5
        '0:79:1.8 4:74:1.8 8:70:3.6',   // Gm：G5 D5 Bb4
        '0:76:1.8 4:73:1.8 8:69:3.6'    // A ：E5 C#5 A4 -> 回主音
      ],
      lead: { type: 'sawtooth', gain: 0.075, lp: 2400, atk: 0.14, sus: 0.55, shine: true },
      drums: { timp: '0 10', timpG: 0.2 }
    },

    // ── ending ── 结局/回忆。C 大调 64BPM。
    //    温暖怀旧，长线条旋律一路下行再回望，最后停在属七上等待再一次循环，
    //    像是把这段校园时光慢慢收进相册。
    ending: {
      bpm: 64, bars: 8,
      chords: [
        [60, 64, 67],      // C
        [59, 62, 67],      // G/B
        [57, 60, 64],      // Am
        [55, 59, 64],      // Em/G
        [53, 57, 60],      // F
        [52, 55, 60],      // C/E
        [50, 53, 57, 60],  // Dm7
        [55, 59, 62, 65]   // G7 -> 回到 C
      ],
      pad:  { type: 'sawtooth', gain: 0.06, atk: 1.1, lp: 1000, air: 0.014, sus: 0.62, detune: 7 },
      bass: ['0:R:3.4 12:R12:0.9'],
      bassOct: -12, bassGain: 0.24,
      mel: [
        '0:72:3.0 8:76:3.0',   // C  ：C5 E5
        '0:74:3.0 8:71:3.0',   // G/B：D5 B4
        '0:69:3.0 8:72:3.0',   // Am ：A4 C5
        '0:71:3.0 8:67:3.0',   // Em ：B4 G4
        '0:69:3.0 8:65:3.0',   // F  ：A4 F4
        '0:64:3.0 8:67:3.0',   // C/E：E4 G4
        '0:72:1.4 4:74:1.4 8:77:3.0',  // Dm7：C5 D5 F5
        '0:79:1.4 4:77:1.4 8:76:3.4'   // G7 ：G5 F5 E5 -> 回 C5
      ],
      lead: { type: 'triangle', gain: 0.125, lp: 4600, atk: 0.02, sus: 0.3, shine: true }
    }
  };

  var BGM_KEYS = ['title', 'daily', 'festival', 'romantic', 'sad', 'tension', 'drama', 'ending'];

  // ==========================================================================
  // §9  BGM 调度器
  //   每个曲目实例 = 一个私有 GainNode(交叉淡入淡出用) + 一个 setInterval
  //   调度器按 16 分音符步进，只预排 lookahead 之内的音符。
  // ==========================================================================
  var _inst = null;        // 当前实例
  var _desired = null;     // 期望播放的曲目（挂起/静音时保留，恢复后补播）

  function compileTrack(key, def) {
    try {
      var bars = def.bars || (def.chords && def.chords.length) || 8;
      def._key = key;
      def._bars = bars;
      def._total = bars * STEPS_PER_BAR;
      def._spb = 60 / (def.bpm || 100);         // 每拍秒数
      def._step = def._spb / 4;                 // 十六分音符秒数
      def._chords = (def.chords && def.chords.length) ? def.chords : [[60, 64, 67]];
      def._mel = compilePat(def.mel, bars, def.melBeats || 1);
      def._bass = compilePat(def.bass, bars, def.bassBeats || 2);
      def._drums = null;
      if (def.drums) {
        def._drums = {
          kick: parsePattern(def.drums.kick), hat: parsePattern(def.drums.hat),
          snare: parsePattern(def.drums.snare), timp: parsePattern(def.drums.timp),
          cym: parsePattern(def.drums.cym),
          kickG: def.drums.kickG, hatG: def.drums.hatG, snareG: def.drums.snareG,
          timpG: def.drums.timpG, cymG: def.drums.cymG
        };
      }
      def._fill = def.fill ? {
        kick: parsePattern(def.fill.kick), hat: parsePattern(def.fill.hat),
        snare: parsePattern(def.fill.snare), timp: parsePattern(def.fill.timp),
        cym: parsePattern(def.fill.cym)
      } : null;
    } catch (e) { warn(e); }
    return def;
  }

  // 走一步（一个十六分音符）
  function scheduleStep(inst, s, t0) {
    var d = inst.def;
    var k = s % STEPS_PER_BAR;
    var bar = (s - k) / STEPS_PER_BAR;
    var chord = d._chords[bar % d._chords.length] || d._chords[0];
    var spb = d._spb;
    var ev, i, n, midi, dur;

    // --- 和声铺底：每小节头拍铺一次 ---
    if (k === 0 && d.pad) {
      padVoice(t0, inst.bus, chord, spb * 4 * 1.02, {
        type: d.pad.type, gain: d.pad.gain, atk: (d.pad.atk || 0.6) * spb,
        air: d.pad.air, lp: d.pad.lp, q: d.pad.q, sus: d.pad.sus,
        detune: d.pad.detune, width: d.pad.width
      });
    }

    // --- 低音 ---
    if (d._bass) {
      ev = d._bass[bar][k];
      if (ev) {
        for (i = 0; i < ev.length; i++) {
          midi = resolveTok(ev[i].tok, chord) + (d.bassOct == null ? -12 : d.bassOct);
          dur = ev[i].beats * spb;
          bassVoice(t0, inst.bus, midi, dur, { gain: (d.bassGain || 0.26) * ev[i].vel, punch: d.bassPunch, sus: 0.4 });
        }
      }
    }

    // --- 旋律 ---
    if (d._mel) {
      ev = d._mel[bar][k];
      if (ev) {
        n = ev.length;
        for (i = 0; i < n; i++) {
          midi = resolveTok(ev[i].tok, chord);
          dur = ev[i].beats * spb;
          leadVoice(t0, inst.bus, midi, dur, {
            type: d.lead && d.lead.type, gain: (d.lead && d.lead.gain ? d.lead.gain : 0.14) * ev[i].vel,
            lp: d.lead && d.lead.lp, atk: d.lead && d.lead.atk != null ? d.lead.atk * spb : 0.008,
            sus: d.lead && d.lead.sus != null ? d.lead.sus : 0.35,
            shine: d.lead && d.lead.shine, pan: (n > 1 ? (i - (n - 1) / 2) * 0.25 : 0)
          });
        }
      }
    }

    // --- 打击（每小节固定鼓型；最后一小节叠加 fill） ---
    var dm = d._drums;
    var last = (bar === d._bars - 1);
    if (dm) {
      if (hasStep(dm.kick, k)) drumKick(t0, inst.bus, { gain: dm.kickG });
      if (hasStep(dm.hat, k)) drumHat(t0, inst.bus, { gain: dm.hatG });
      if (hasStep(dm.snare, k)) drumSnare(t0, inst.bus, { gain: dm.snareG });
      if (hasStep(dm.timp, k)) drumTimp(t0, inst.bus, { gain: dm.timpG, freq: mtof(chord[0] - 24) });
      if (hasStep(dm.cym, k)) drumCym(t0, inst.bus, { gain: dm.cymG });
    }
    if (d._fill && last) {
      if (hasStep(d._fill.kick, k)) drumKick(t0, inst.bus, { gain: dm ? dm.kickG : 0.3 });
      if (hasStep(d._fill.hat, k)) drumHat(t0, inst.bus, { gain: dm ? dm.hatG : 0.045 });
      if (hasStep(d._fill.snare, k)) drumSnare(t0, inst.bus, { gain: dm ? dm.snareG : 0.06 });
      if (hasStep(d._fill.timp, k)) drumTimp(t0, inst.bus, { gain: dm ? dm.timpG : 0.2, freq: mtof(chord[0] - 24) });
      if (hasStep(d._fill.cym, k)) drumCym(t0, inst.bus, { gain: dm ? dm.cymG : 0.07 });
    }
  }

  function tick(inst) {
    try {
      if (!inst || inst.dead || !_ctx) return;
      if (!isRunning()) return;                      // 挂起时什么也不做（currentTime 冻结）
      var now = _ctx.currentTime;
      // 刚从挂起中恢复：把时间轴拉回现在，避免补出一大堆"迟到的音符"
      if (inst.nextT < now - 0.25) inst.nextT = now + 0.05;
      var guard = 0;
      while (inst.nextT < now + _lookahead && guard < 256) {
        scheduleStep(inst, inst.step, inst.nextT);
        inst.nextT += inst.def._step;
        inst.step = (inst.step + 1) % inst.def._total;
        guard++;
      }
    } catch (e) { warn(e); }
  }

  function stopInstance(inst, fade) {
    try {
      if (!inst || inst.dead) return;
      inst.dead = true;
      if (inst.timer) { clearInterval(inst.timer); inst.timer = 0; }
      if (inst.bus) {
        rampTo(inst.bus.gain, 0, fade);
        later(function () { try { inst.bus.disconnect(); } catch (e) { /* 忽略 */ } }, fade * 1000 + 160);
      }
    } catch (e) { warn(e); }
  }

  function startInstance(key, fadeIn) {
    var def = TRACKS[key];
    if (!def || !_ctx) return null;
    var inst = { key: key, def: def, bus: null, timer: 0, dead: false, step: 0, nextT: 0 };
    try {
      inst.bus = _ctx.createGain();
      inst.bus.gain.value = 0;
      inst.bus.connect(_bgmBus);
      inst.nextT = nowT() + 0.08;
      rampTo(inst.bus.gain, 1, fadeIn == null ? XFADE : fadeIn);
      inst.timer = setInterval(function () { tick(inst); }, TICK_MS);
      tick(inst);   // 立刻排一批，避免开头空一拍
    } catch (e) {
      warn(e);
      return null;
    }
    return inst;
  }

  // ctx 解锁后补播待播曲目
  function resumePending() {
    try {
      if (!_settings.enabled || !_desired) return;
      if (EXTERNAL[_desired]) {                 // 外部曲目：解锁后补播
        if (_extEl && _extKey === _desired) { try { _extEl.play(); } catch (e) {} }
        else extPlay(_desired);
        return;
      }
      if (!isRunning()) return;
      if (_inst && !_inst.dead && _inst.key === _desired) return;
      if (_inst) { var old = _inst; _inst = null; stopInstance(old, 0.2); }
      _inst = startInstance(_desired, 0.5);
    } catch (e) { warn(e); }
  }

  // --------------------------------------------------------------------------
  //  外部音频文件曲目
  //  有些曲子必须用真实录音（校歌），不能靠振荡器合成。
  //  这类曲目走 <audio> 播放，但与合成 BGM 共用同一套调度意图 (_desired)，
  //  因此 VN 层的 bgm / bgmIf 不需要区分二者。
  // --------------------------------------------------------------------------
  var EXTERNAL = { schoolsong: 'schoolmusic.mp3' };
  var _extEl = null, _extKey = null, _extFailed = {};

  /** 运行时登记更多外部音频曲目：
   *    AUDIO.registerExternal({ bgm_campus: 'audio/campus.mp3' })
   *  登记后即可用 BGM.play('bgm_campus') / VN.bgm('bgm_campus') 播放。 */
  function registerExternal(map) {
    if (!map) return Object.keys(EXTERNAL);
    for (var k in map) { if (map.hasOwnProperty(k) && map[k]) EXTERNAL[k] = map[k]; }
    return Object.keys(EXTERNAL);
  }

  function extVolume() { return _settings.enabled ? _settings.bgmVolume : 0; }

  function extStop(fadeMs) {
    if (!_extEl) return;
    var el = _extEl; _extEl = null; _extKey = null;
    try {
      var v0 = el.volume || 0, steps = 10, i = 0;
      var t = setInterval(function () {
        i++;
        try { el.volume = Math.max(0, v0 * (1 - i / steps)); } catch (e) {}
        if (i >= steps) { clearInterval(t); try { el.pause(); } catch (e) {} }
      }, Math.max(20, (fadeMs || 400) / steps));
    } catch (e) { try { el.pause(); } catch (e2) {} }
  }

  /* 自动播放被浏览器拦截时，挂一次性手势监听重试。
     缺少这一步的话，play() 的 Promise 被拒绝后没有任何补救，
     表现为「点进合唱场景，校歌一直不响」。 */
  var _gestureRetry = null;
  function armGestureRetry(key) {
    if (_gestureRetry) return;
    var fire = function () {
      disarmGestureRetry();
      if (_desired === key && _settings.enabled) extPlay(key);
    };
    _gestureRetry = fire;
    document.addEventListener('pointerdown', fire, true);
    document.addEventListener('keydown', fire, true);
    // 兜底：3 秒后自动放弃监听，避免长期挂着
    setTimeout(disarmGestureRetry, 3000);
  }
  function disarmGestureRetry() {
    if (!_gestureRetry) return;
    document.removeEventListener('pointerdown', _gestureRetry, true);
    document.removeEventListener('keydown', _gestureRetry, true);
    _gestureRetry = null;
  }

  /** 外部曲目淡入（换曲后调用，避免爆音） */
  function extFadeIn() {
    if (!_extEl) return;
    var el = _extEl, target = extVolume();
    var steps = 12, i = 0;
    try {
      var t = setInterval(function () {
        if (_extEl !== el) { clearInterval(t); return; }   // 期间又换曲了
        i++;
        try { el.volume = Math.min(target, target * (i / steps)); } catch (e) {}
        if (i >= steps) clearInterval(t);
      }, 22);
    } catch (e) { try { el.volume = target; } catch (e2) {} }
  }

  function extPlay(key) {
    var src = EXTERNAL[key];
    if (!src || _extFailed[key]) return false;
    try {
      if (!_extEl) {
        _extEl = new Audio(src);
        _extEl.loop = true;
        _extEl.preload = 'auto';
        // 加载失败（文件缺失 / 解码错误）时不要卡住调度，退回合成曲目
        _extEl.addEventListener('error', function () {
          _extFailed[key] = true;
          if (_desired === key) { _extEl = null; _playSynthOrFallback(key); }
        });
      }
      var switching = (_extKey !== key);
      if (switching) {
        // 换曲（例如"校歌 → 日常"）：直接改 src 会有一声爆音，
        // 先把音量压到 0，换源播放后再淡入。
        _extEl.volume = 0;
        _extEl.src = src;
        _extKey = key;
      }
      if (!switching) _extEl.volume = extVolume();
      var p = _extEl.play();
      if (switching) extFadeIn();
      if (p && p.catch) {
        p.catch(function () { armGestureRetry(key); });
      }
      return true;
    } catch (e) { _extFailed[key] = true; warn(e); return false; }
  }

  /** 外部曲目不可用时的兜底：退回合成的 festival 曲目 */
  function _playSynthOrFallback(key) {
    var fb = TRACKS[key] ? key : (TRACKS['festival'] ? 'festival' : null);
    if (!fb) return;
    if (!_inst || _inst.dead) { if (isRunning()) _inst = startInstance(fb, XFADE); }
  }

  function playBgm(key) {
    try {
      if (!key) return;
      if (EXTERNAL[key]) {
        _desired = key;
        if (_inst) { var o0 = _inst; _inst = null; stopInstance(o0, XFADE); }
        if (!_settings.enabled) return;                    // 静音中：只记住意图
        if (!extPlay(key)) _playSynthOrFallback(key);
        return;
      }
      if (!TRACKS[key]) return;                            // 未知 key：静默忽略
      _desired = key;
      if (_extEl) extStop(350);                            // 从外部曲目切回合成曲目
      if (!_settings.enabled) return;                      // 静音中：只记住意图
      if (!_ctx) ensureCtx();
      if (!isRunning()) { ensureCtx(); return; }           // 还没解锁：等用户手势后补播
      if (_inst && !_inst.dead && _inst.key === key) return; // 同一首：不重头播
      if (_inst) { var old = _inst; _inst = null; stopInstance(old, XFADE); }  // 换曲：交叉淡化
      _inst = startInstance(key, XFADE);
    } catch (e) { warn(e); }
  }

  function stopBgm() {
    try {
      _desired = null;
      if (_extEl) extStop(STOP_FADE);
      var old = _inst;
      _inst = null;
      if (old) stopInstance(old, STOP_FADE);
    } catch (e) { warn(e); }
  }

  function currentBgm() {
    try {
      if (_inst && !_inst.dead) return _inst.key;
      return _desired || null;
    } catch (e) { return null; }
  }

  var bgm = {
    play: playBgm,
    stop: stopBgm,
    current: currentBgm
  };

  /* KEYS 必须是"实时 + 去重"的：外部曲目可以覆盖同名的合成曲目
     （例如用 audio/daily.mp3 替换合成的 daily），此时不应出现两个 daily。
     写成静态数组会拿不到 registerExternal() 之后的变化。 */
  Object.defineProperty(bgm, 'KEYS', {
    get: function () {
      var a = BGM_KEYS.slice(), k;
      for (k in EXTERNAL) {
        if (EXTERNAL.hasOwnProperty(k) && a.indexOf(k) < 0) a.push(k);
      }
      return a;
    },
    enumerable: true
  });

  // ==========================================================================
  // §10  总开关与音量
  // ==========================================================================
  function setEnabled(on) {
    try {
      _settings.enabled = !!on;
      if (_master) rampTo(_master.gain, _settings.enabled ? 1 : 0, 0.25);
      if (!_settings.enabled) {
        // 静音：停掉调度器省 CPU，但 _desired 保留，重新开启时可续上
        if (_inst) { var old = _inst; _inst = null; stopInstance(old, 0.3); }
        if (_extEl) { try { _extEl.pause(); } catch (e) {} }
      } else {
        if (!_ctx) ensureCtx();
        if (_extEl && _extKey) { try { _extEl.volume = extVolume(); _extEl.play(); } catch (e) {} }
        if (isRunning()) resumePending();
      }
    } catch (e) { warn(e); }
  }
  function isEnabled() { return !!_settings.enabled; }

  function setBgmVolume(v) {
    try {
      _settings.bgmVolume = clamp01(v);
      if (_bgmBus) rampTo(_bgmBus.gain, _settings.bgmVolume, 0.2);
      if (_extEl) { try { _extEl.volume = extVolume(); } catch (e) {} }
    } catch (e) { warn(e); }
  }
  function setSeVolume(v) {
    try {
      _settings.seVolume = clamp01(v);
      if (_seBus) rampTo(_seBus.gain, _settings.seVolume, 0.2);
    } catch (e) { warn(e); }
  }
  function getSettings() {
    return { enabled: _settings.enabled, bgmVolume: _settings.bgmVolume, seVolume: _settings.seVolume };
  }

  // ==========================================================================
  // §11  初始化 & 导出
  // ==========================================================================
  (function compileAll() {
    var i;
    for (i = 0; i < BGM_KEYS.length; i++) {
      try { compileTrack(BGM_KEYS[i], TRACKS[BGM_KEYS[i]]); } catch (e) { warn(e); }
    }
  })();
  onUnlock(resumePending);

  return {
    ctx: ensureCtx,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    setBgmVolume: setBgmVolume,
    setSeVolume: setSeVolume,
    getSettings: getSettings,
    registerExternal: registerExternal,
    bgm: bgm,
    sfx: sfx,
    /**
     * 诊断用：把某个音效离线渲染一遍，返回 PCM 峰值。
     * 这是判断"音效到底有没有出声"最可靠的办法 —— 不依赖分析器、
     * 不受标签页节流 / 定时器精度影响，直接看最终采样值。
     * 返回 Promise<number|null>。
     */
    _offlinePeak: function (name, variant, seconds) {
      try {
        var AC = _win && (_win.OfflineAudioContext || _win.webkitOfflineAudioContext);
        if (!AC || typeof SFX_DEFS[name] !== 'function') return Promise.resolve(null);
        var sr = (_ctx && _ctx.sampleRate) || 44100;
        var oc = new AC(1, Math.ceil(sr * (seconds || 1.5)), sr);
        var g = oc.createGain();
        g.gain.value = 1;
        g.connect(oc.destination);
        var sc = _ctx, sb = _seBus;
        _ctx = oc; _seBus = g;
        try { SFX_DEFS[name](0.01, g, variant || 0); }
        finally { _ctx = sc; _seBus = sb; }
        return oc.startRendering().then(function (buf) {
          var d = buf.getChannelData(0), m = 0, i, v;
          for (i = 0; i < d.length; i++) { v = d[i] < 0 ? -d[i] : d[i]; if (v > m) m = v; }
          return m;
        });
      } catch (e) { return Promise.resolve(null); }
    },
    // 诊断用：查看外部音频文件曲目的实际播放状态
    extState: function () {
      if (!_extEl) return { exists: false, key: _extKey, failed: Object.keys(_extFailed) };
      return {
        exists: true, key: _extKey, src: _extEl.src,
        paused: _extEl.paused, time: _extEl.currentTime,
        readyState: _extEl.readyState, volume: _extEl.volume,
        err: _extEl.error ? _extEl.error.code : null,
        failed: Object.keys(_extFailed)
      };
    }
  };
})();

var BGM = AUDIO.bgm;   // 背景音乐 API
var SFX = AUDIO.sfx;   // 音效 API
