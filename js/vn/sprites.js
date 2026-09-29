/*!
 * NEUQlife-Galgame - VN 立绘精灵库 (SVG character sprite library)
 * ---------------------------------------------------------------------------
 * 纯数据 / 纯函数实现，经典脚本（非 ES module），无外部依赖，无网络与图片引用。
 * 每个精灵直接返回一段完整可插入 DOM 的 <svg> 字符串（透明背景，膝上半身构图）。
 *
 *   var svg = SPRITES.get('suxiaonuan', 'smile');   // -> String (SVG)
 *   SPRITES.has('suxiaonuan');                      // -> true
 *   SPRITES.meta('suxiaonuan');                     // -> {name, color, group}
 *   SPRITES.IDS;                                    // -> [id, ...]
 *   SPRITES.EMOTIONS;                               // -> ['normal', ...]
 *
 * 引擎可用的 CSS 动画钩子类:
 *   .spr-hair  (后发 + 前发两组)   .spr-eyes (双眼)   .spr-body (躯干四肢)
 *   .spr-mouth (嘴部路径)          .spr-blush (腮红)
 *
 * 渐变 id 规则: g_<id>_<emotion>_<n>  —— 同一帧多个立绘同时存在也不会冲突。
 */
var SPRITES = (function () {
  'use strict';

  /* =========================================================================
   * 0. 工具函数
   * ========================================================================= */

  var VW = 420, VH = 760;         // viewBox 尺寸
  var CX = 210;                   // 画面中轴

  var EMOTIONS = ['normal', 'smile', 'happy', 'sad', 'angry', 'shy', 'surprise'];

  var SKIN = '#fdeee6';           // 基础肤色
  var SKIN_SH = '#f4d3c4';        // 肤色阴影
  var SKIN_DP = '#e9bfae';        // 肤色深阴影
  var SKIN_LN = '#dcae9d';        // 肤色描线
  var BLUSH_C = '#f7859a';        // 腮红
  var LIP = '#c4717e';            // 唇色
  var MOUTH_IN = '#a94a5f';       // 口腔
  var TONGUE = '#e8909c';         // 舌

  function r1(v) { return Math.round(v * 10) / 10; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /** <path d="..." attrs/>  —— attrs 为原始属性字符串 */
  function P(d, a) { return '<path d="' + d + '"' + (a ? ' ' + a : '') + '/>'; }
  function E(cx, cy, rx, ry, a) {
    return '<ellipse cx="' + r1(cx) + '" cy="' + r1(cy) + '" rx="' + r1(rx) +
      '" ry="' + r1(ry) + '"' + (a ? ' ' + a : '') + '/>';
  }
  function C(cx, cy, r, a) {
    return '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(r) + '"' + (a ? ' ' + a : '') + '/>';
  }
  function G(kids, a) {
    var s = kids && kids.join ? kids.join('') : (kids || '');
    return '<g' + (a ? ' ' + a : '') + '>' + s + '</g>';
  }

  /**
   * 锥形肢体：从 (x1,y1) 到 (x2,y2)，两端宽度 w1 / w2，端头为半圆。
   * 大量用于手臂、腿、发丝、眉毛、睫毛。
   */
  function limb(x1, y1, x2, y2, w1, w2, a) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / L, ny = dx / L, h1 = w1 / 2, h2 = w2 / 2;
    var ax = x1 + nx * h1, ay = y1 + ny * h1;
    var bx = x2 + nx * h2, by = y2 + ny * h2;
    var cx = x2 - nx * h2, cy = y2 - ny * h2;
    var dx2 = x1 - nx * h1, dy2 = y1 - ny * h1;
    var d = 'M' + r1(ax) + ' ' + r1(ay) + 'L' + r1(bx) + ' ' + r1(by) +
      'A' + r1(h2) + ' ' + r1(h2) + ' 0 0 0 ' + r1(cx) + ' ' + r1(cy) +
      'L' + r1(dx2) + ' ' + r1(dy2) +
      'A' + r1(h1) + ' ' + r1(h1) + ' 0 0 0 ' + r1(ax) + ' ' + r1(ay) + 'Z';
    return P(d, a);
  }

  /**
   * 刘海下缘生成器：从 x0（右）向 x1（左）生成一段锯齿/波浪边缘。
   * spiky=true 用折线（男性硬朗），false 用二次曲线（女性柔和）。
   */
  function fringeEdge(x0, x1, y, n, amp, spiky, endY) {
    var step = (x0 - x1) / n, d = '', i, xa, xb, ya, yb, k;
    for (i = 0; i < n; i++) {
      k = (i % 2) ? -1 : 1;
      xa = x0 - i * step;
      xb = xa - step;
      ya = y + k * amp * 0.55;
      yb = (i === n - 1) ? (endY == null ? y : endY) : y - k * amp;
      if (spiky) {
        d += 'L' + r1(xa - step * 0.28) + ' ' + r1(ya - amp * 1.25) +
          'L' + r1(xb) + ' ' + r1(yb);
      } else {
        d += 'Q' + r1((xa + xb) / 2 + step * 0.1) + ' ' + r1(ya + amp * 1.5) +
          ' ' + r1(xb) + ' ' + r1(yb);
      }
    }
    return d;
  }

  /* =========================================================================
   * 1. 渐变上下文 —— 保证 id 唯一
   * ========================================================================= */

  function Ctx(id, emo) {
    this.id = id;
    this.emo = emo;
    this.k = 0;
    this.defs = [];
  }
  Ctx.prototype.uid = function () {
    this.k++;
    return 'g_' + this.id + '_' + this.emo + '_' + this.k;
  };
  /** 线性渐变（默认 userSpaceOnUse，可跨路径连续过渡） */
  Ctx.prototype.lin = function (stops, x1, y1, x2, y2) {
    var id = this.uid(), s = '', i, st;
    for (i = 0; i < stops.length; i++) {
      st = stops[i];
      s += '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' +
        (st[2] != null ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
    }
    this.defs.push('<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + r1(x1) +
      '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '">' + s + '</linearGradient>');
    return 'url(#' + id + ')';
  };
  /** 径向渐变 */
  Ctx.prototype.rad = function (stops, cx, cy, r, fx, fy) {
    var id = this.uid(), s = '', i, st;
    for (i = 0; i < stops.length; i++) {
      st = stops[i];
      s += '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' +
        (st[2] != null ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
    }
    this.defs.push('<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + r1(cx) +
      '" cy="' + r1(cy) + '" r="' + r1(r) + '" fx="' + r1(fx == null ? cx : fx) +
      '" fy="' + r1(fy == null ? cy : fy) + '">' + s + '</radialGradient>');
    return 'url(#' + id + ')';
  };

  /* =========================================================================
   * 2. 骨架几何（所有角色共用，保证同一套骨骼）
   * ========================================================================= */

  var EY = 170;                   // 眼睛中心线
  var FACE_TOP = 64, CHIN = 248;  // 面部上下缘
  var NECK_TOP = 200, NECK_BOT = 274;
  var SHOULDER_Y = 312, WAIST_Y = 474;

  /** 面部轮廓（cy=156 时上缘 64 / 下巴 248） */
  function headPath(o) {
    o = o || {};
    var cy = o.cy == null ? 156 : o.cy;
    var rx = o.rx == null ? 78 : o.rx;
    var ry = o.ry == null ? 92 : o.ry;
    var jw = o.jw == null ? 0.60 : o.jw;   // 下颌宽度系数（男性更方）
    var ch = o.ch == null ? 1 : o.ch;      // 下巴长度系数
    return 'M' + r1(CX - rx) + ' ' + r1(cy - 12) +
      'C' + r1(CX - rx) + ' ' + r1(cy - 70) + ' ' + r1(CX - rx * 0.72) + ' ' + r1(cy - ry) + ' ' + CX + ' ' + r1(cy - ry) +
      'C' + r1(CX + rx * 0.72) + ' ' + r1(cy - ry) + ' ' + r1(CX + rx) + ' ' + r1(cy - 70) + ' ' + r1(CX + rx) + ' ' + r1(cy - 12) +
      'C' + r1(CX + rx) + ' ' + r1(cy + 26 * ch) + ' ' + r1(CX + rx * jw) + ' ' + r1(cy + 72 * ch) + ' ' + CX + ' ' + r1(cy + ry * ch) +
      'C' + r1(CX - rx * jw) + ' ' + r1(cy + 72 * ch) + ' ' + r1(CX - rx) + ' ' + r1(cy + 26 * ch) + ' ' + r1(CX - rx) + ' ' + r1(cy - 12) + 'Z';
  }

  function ears(o) {
    o = o || {};
    var skin = o.skin || SKIN;
    return E(CX - 76, 176, 11, 19, 'fill="' + skin + '" stroke="' + SKIN_LN + '" stroke-width="1.4"') +
      E(CX + 76, 176, 11, 19, 'fill="' + skin + '" stroke="' + SKIN_LN + '" stroke-width="1.4"') +
      P('M' + (CX - 77) + ' 168c4 3 5 12 1 17', 'fill="none" stroke="' + SKIN_LN + '" stroke-width="1.6"') +
      P('M' + (CX + 77) + ' 168c-4 3 -5 12 -1 17', 'fill="none" stroke="' + SKIN_LN + '" stroke-width="1.6"');
  }

  /** 脖子 */
  function neckPath(o) {
    o = o || {};
    var g = o.grad || SKIN;
    var out = P('M184 192C184 234 177 258 169 272L251 272C243 258 236 234 236 192Z',
      'fill="' + g + '" stroke="' + SKIN_LN + '" stroke-width="1.4" stroke-opacity="0.7"');
    if (o.shade !== false) {
      out += P('M184 194C184 224 182 240 178 250C196 262 224 262 242 250C238 240 236 224 236 194Z',
        'fill="' + SKIN_DP + '" fill-opacity="0.42"');
    }
    return out;
  }

  /** 脸颊阴影 + 额头刘海投影 */
  function faceShade(o) {
    o = o || {};
    return P('M148 148C178 166 242 166 272 148C272 158 269 168 264 174C234 190 186 190 156 174C151 168 148 158 148 148Z',
      'fill="#e6b6a6" fill-opacity="' + (o.brow === false ? 0.3 : 0.34) + '"') +
      P('M140 196C138 214 142 230 152 240C144 232 138 214 140 196Z', 'fill="' + SKIN_SH + '" fill-opacity="0.5"') +
      P('M280 196C282 214 278 230 268 240C276 232 282 214 280 196Z', 'fill="' + SKIN_SH + '" fill-opacity="0.5"');
  }

  /* =========================================================================
   * 3. 五官
   * ========================================================================= */

  /* --- 3.1 眼睛 -----------------------------------------------------------
   * s = -1 画面左眼 / +1 画面右眼
   * 参数 sp: {lid 上睑下压 0~1, low 下睑上抬 0~1, arc 闭眼弧上拱量,
   *           ix/iy 瞳位偏移, is 瞳孔缩放, spark 高光数量}
   */
  function oneEye(c, s, sp, o) {
    var lid = clamp(sp.lid, -0.3, 1);
    var low = clamp(sp.low || 0, 0, 1);
    var arc = sp.arc || 0;
    var lashCol = o.lash || '#3b3050';
    var out = [];

    /* --- 关键点 --- */
    var ex = CX + s * 44, ey = EY;
    var ix = CX + s * 19, iy = ey + 10;                       // 内眼角
    var ox = CX + s * 71, oy = ey - 4;                        // 外眼角
    var t1x = CX + s * 25, t1y = mix(ey - 33, ey + 14, lid) - arc;
    var t2x = CX + s * 53, t2y = mix(ey - 41, ey + 16, lid) - arc;
    var b1x = CX + s * 58, b1y = mix(ey + 22, ey + 6, low);
    var b2x = CX + s * 30, b2y = mix(ey + 27, ey + 9, low);

    var sclera = 'M' + r1(ix) + ' ' + r1(iy) +
      'C' + r1(t1x) + ' ' + r1(t1y) + ' ' + r1(t2x) + ' ' + r1(t2y) + ' ' + r1(ox) + ' ' + r1(oy) +
      'C' + r1(b1x) + ' ' + r1(b1y) + ' ' + r1(b2x) + ' ' + r1(b2y) + ' ' + r1(ix) + ' ' + r1(iy) + 'Z';

    if (!sp.closed) {
      /* 眼白 */
      var gw = c.lin([[0, '#ffffff'], [0.68, '#fdfbff'], [1, '#e4ddf2']], CX, ey - 40, CX, ey + 30);
      out.push(P(sclera, 'fill="' + gw + '"'));
      /* 虹膜 */
      var isz = (sp.is == null ? 1 : sp.is) * 20;
      var icx = ex + (sp.ix || 0) * s * 0.6 + (sp.ix || 0);
      var icy = ey - 3 + (sp.iy || 0);
      var gi = c.lin([[0, o.irisTop || '#5a4590'], [0.42, o.irisMid || '#8b6fc4'], [1, o.irisBot || '#c9a8e8']],
        CX, icy - isz, CX, icy + isz);
      out.push(E(icx, icy, isz, isz, 'fill="' + gi + '"'));
      /* 下部亮环 */
      var gg = c.rad([[0, o.irisGlow || '#e2cef8', 0.95], [1, o.irisGlow || '#e2cef8', 0]], icx, icy + isz * 0.42, isz * 0.85);
      out.push(E(icx, icy + isz * 0.16, isz * 0.74, isz * 0.6, 'fill="' + gg + '"'));
      /* 边缘暗环 */
      out.push(E(icx, icy, isz, isz, 'fill="none" stroke="' + (o.limbal || '#4b3878') + '" stroke-width="2.6" stroke-opacity="0.85"'));
      /* 瞳孔 */
      out.push(E(icx, icy - isz * 0.16, isz * 0.4, isz * 0.46, 'fill="#33254e" fill-opacity="0.94"'));
      /* 高光 + 火花 */
      out.push(E(icx - isz * 0.34, icy - isz * 0.42, isz * 0.33, isz * 0.4,
        'fill="#ffffff" fill-opacity="0.95" transform="rotate(-18 ' + r1(icx - isz * 0.34) + ' ' + r1(icy - isz * 0.42) + ')"'));
      if (sp.spark !== 0) {
        out.push(C(icx + isz * 0.36, icy + isz * 0.4, isz * 0.17, 'fill="#ffffff" fill-opacity="0.85"'));
        out.push(C(icx + isz * 0.1, icy + isz * 0.62, isz * 0.08, 'fill="#ffffff" fill-opacity="0.6"'));
      }
    }

    /* 下眼睑线 */
    out.push(P('M' + r1(ix) + ' ' + r1(iy) + 'C' + r1(b2x) + ' ' + r1(b2y) + ' ' + r1(b1x) + ' ' + r1(b1y) + ' ' + r1(ox) + ' ' + r1(oy),
      'fill="none" stroke="' + SKIN_LN + '" stroke-width="1.8" stroke-opacity="0.5"'));
    /* 内眼角泪堂 */
    out.push(P('M' + r1(ix) + ' ' + r1(iy) + 'l' + r1(s * 7) + ' -5l0 7z', 'fill="#ea9aa4" fill-opacity="0.75"'));

    /* 睫毛（镰刀状镜面） */
    var t = 7 + 7 * lid;
    var lash = 'M' + r1(ix) + ' ' + r1(iy) +
      'C' + r1(t1x) + ' ' + r1(t1y - t) + ' ' + r1(t2x) + ' ' + r1(t2y - t) + ' ' + r1(ox) + ' ' + r1(oy - t * 0.45) +
      'C' + r1(t2x) + ' ' + r1(t2y) + ' ' + r1(t1x) + ' ' + r1(t1y) + ' ' + r1(ix) + ' ' + r1(iy) + 'Z';
    out.push(P(lash, 'fill="' + lashCol + '"'));
    /* 眼角睫毛尖 */
    out.push(limb(ox, oy - 1, ox + s * 17, oy - 12, 7, 0.8, 'fill="' + lashCol + '"'));
    out.push(limb(ox, oy + 5, ox + s * 13, oy + 9, 4.5, 0.6, 'fill="' + lashCol + '"'));
    if (s < 0) {
      out.push(limb(ix + s * 2, iy - 2, ix + s * 12, iy - 9, 4, 0.6, 'fill="' + lashCol + '"'));
    }
    /* 双眼皮褶 */
    if (o.crease !== false) {
      out.push(P('M' + r1(ix + s * 4) + ' ' + r1(iy - 12) + 'C' + r1(t1x) + ' ' + r1(t1y - 16) + ' ' + r1(t2x) + ' ' + r1(t2y - 15) + ' ' + r1(ox - s * 4) + ' ' + r1(oy - 12),
        'fill="none" stroke="' + (o.creaseCol || '#c79aa0') + '" stroke-width="1.8" stroke-opacity="' + (o.creaseOp == null ? 0.45 : o.creaseOp) + '"'));
    }
    return out.join('');
  }

  function eyes(c, sp, o) {
    o = o || {};
    var a = oneEye(c, -1, sp, o);
    var b = oneEye(c, 1, sp, o);
    return G([a, b], 'class="spr-eyes"');
  }

  /* --- 3.2 眉毛 --- */
  function brows(c, sp, o) {
    o = o || {};
    var col = o.browCol || '#6b5a86';
    var w = o.browW || 1;
    var di = sp.browI || 0, doo = sp.browO || 0;
    var baseI = o.browYI == null ? 134 : o.browYI;
    var baseO = o.browYO == null ? 127 : o.browYO;
    var out = [], k, s, ix, iy, ox, oy, mx, my;
    for (k = 0; k < 2; k++) {
      s = k ? 1 : -1;
      ix = CX + s * 22; iy = baseI + di;
      ox = CX + s * 70; oy = baseO + doo;
      mx = (ix + ox) / 2; my = (iy + oy) / 2 - 7;
      out.push(limb(ix, iy, mx, my, 9 * w, 6 * w, 'fill="' + col + '"'));
      out.push(limb(mx, my, ox, oy, 6 * w, 2.2 * w, 'fill="' + col + '"'));
    }
    return G(out, 'class="spr-brows"');
  }

  /* --- 3.3 鼻子 / 嘴 --- */
  function nose(o) {
    o = o || {};
    return P('M' + (CX - 6) + ' 209c3 5 8 6 12 2', 'fill="none" stroke="' + (o.col || SKIN_LN) +
      '" stroke-width="2.2" stroke-linecap="round"');
  }

  function mouth(sp, o) {
    o = o || {};
    var y = o.y == null ? 226 : o.y;
    var k = sp.mouth || 'calm';
    var col = o.lip || LIP;
    var st = 'fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round"';
    var d = '', extra = '';
    if (k === 'calm') {
      d = 'M' + (CX - 12) + ' ' + (y - 2) + 'Q' + CX + ' ' + (y + 7) + ' ' + (CX + 12) + ' ' + (y - 2);
    } else if (k === 'smile') {
      d = 'M' + (CX - 17) + ' ' + (y - 5) + 'Q' + CX + ' ' + (y + 12) + ' ' + (CX + 17) + ' ' + (y - 5);
    } else if (k === 'grin') {
      d = 'M' + (CX - 19) + ' ' + (y - 8) + 'Q' + CX + ' ' + (y - 14) + ' ' + (CX + 19) + ' ' + (y - 8) +
        'Q' + (CX + 17) + ' ' + (y + 18) + ' ' + CX + ' ' + (y + 20) +
        'Q' + (CX - 17) + ' ' + (y + 18) + ' ' + (CX - 19) + ' ' + (y - 8) + 'Z';
      extra = P(d, 'fill="' + MOUTH_IN + '"') +
        P('M' + (CX - 10) + ' ' + (y + 6) + 'Q' + CX + ' ' + (y + 2) + ' ' + (CX + 10) + ' ' + (y + 6) +
          'Q' + (CX + 9) + ' ' + (y + 19) + ' ' + CX + ' ' + (y + 20) +
          'Q' + (CX - 9) + ' ' + (y + 19) + ' ' + (CX - 10) + ' ' + (y + 6) + 'Z', 'fill="' + TONGUE + '"') +
        P('M' + (CX - 16) + ' ' + (y - 8) + 'Q' + CX + ' ' + (y - 13) + ' ' + (CX + 16) + ' ' + (y - 8) +
          'Q' + CX + ' ' + (y - 1) + ' ' + (CX - 16) + ' ' + (y - 8) + 'Z', 'fill="#ffffff"');
      return G([extra], 'class="spr-mouth"');
    } else if (k === 'frown') {
      d = 'M' + (CX - 13) + ' ' + (y + 5) + 'Q' + CX + ' ' + (y - 6) + ' ' + (CX + 13) + ' ' + (y + 5);
    } else if (k === 'angry') {
      d = 'M' + (CX - 18) + ' ' + (y - 4) + 'Q' + CX + ' ' + (y + 3) + ' ' + (CX + 18) + ' ' + (y - 4) +
        'Q' + CX + ' ' + (y + 17) + ' ' + (CX - 18) + ' ' + (y - 4) + 'Z';
      extra = P(d, 'fill="' + MOUTH_IN + '"') +
        P('M' + (CX - 14) + ' ' + (y - 3) + 'Q' + CX + ' ' + (y + 2) + ' ' + (CX + 14) + ' ' + (y - 3) +
          'Q' + CX + ' ' + (y + 4) + ' ' + (CX - 14) + ' ' + (y - 3) + 'Z', 'fill="#ffffff" fill-opacity="0.9"');
      return G([extra], 'class="spr-mouth"');
    } else if (k === 'wavy') {
      d = 'M' + (CX - 14) + ' ' + (y + 2) + 'q6 -8 11 0q5 8 11 0q4 -6 7 -2';
    } else if (k === 'o') {
      extra = E(CX, y, 8.5, 11.5, 'fill="' + MOUTH_IN + '"') +
        E(CX, y + 5, 5.5, 5, 'fill="' + TONGUE + '"') +
        E(CX - 2.5, y - 5, 2.4, 3, 'fill="#ffffff" fill-opacity="0.55"');
      return G([extra], 'class="spr-mouth"');
    } else {
      d = 'M' + (CX - 12) + ' ' + y + 'Q' + CX + ' ' + (y + 6) + ' ' + (CX + 12) + ' ' + y;
    }
    return P(d, st + ' class="spr-mouth"');
  }

  /* --- 3.4 腮红 --- */
  function blush(c, lv, o) {
    o = o || {};
    if (!lv || lv <= 0.02) return '';
    var y = o.y == null ? 202 : o.y;
    var g = c.rad([[0, BLUSH_C, 0.9], [0.55, BLUSH_C, 0.55], [1, BLUSH_C, 0]], CX, y, 34);
    var out = [E(CX - 45, y, 21, 11.5, 'fill="' + g + '"'),
      E(CX + 45, y, 21, 11.5, 'fill="' + g + '"')];
    if (lv > 0.4) {
      var i, xs;
      for (i = 0; i < 3; i++) {
        xs = -6 + i * 7;
        out.push(P('M' + (CX - 48 + xs) + ' ' + (y + 5) + 'l5 -8', 'fill="none" stroke="#e0687f" stroke-width="2" stroke-opacity="0.55" stroke-linecap="round"'));
        out.push(P('M' + (CX + 38 + xs) + ' ' + (y + 5) + 'l5 -8', 'fill="none" stroke="#e0687f" stroke-width="2" stroke-opacity="0.55" stroke-linecap="round"'));
      }
    }
    return G(out, 'class="spr-blush"');
  }

  /* --- 3.5 表情总表 --- */
  var EXPR = {
    normal: { lid: 0.05, low: 0.05, arc: 0, ix: 0, iy: 0, is: 1.00, browI: 0, browO: 0, mouth: 'calm', blush: 0.12, spark: 1 },
    smile: { lid: 0.22, low: 0.22, arc: 0, ix: 0, iy: 1, is: 1.00, browI: -2, browO: -4, mouth: 'smile', blush: 0.30, spark: 1 },
    happy: { lid: 1.00, low: 0, arc: 25, closed: 1, ix: 0, iy: 0, is: 1.00, browI: -5, browO: -9, mouth: 'grin', blush: 0.66, spark: 1 },
    sad: { lid: 0.34, low: 0.06, arc: 0, ix: 0, iy: 3, is: 1.02, browI: -10, browO: 7, mouth: 'frown', blush: 0.05, spark: 1, tear: 1 },
    angry: { lid: 0.42, low: 0.30, arc: 0, ix: 0, iy: 0, is: 0.98, browI: 9, browO: -9, mouth: 'angry', blush: 0.24, spark: 1, mark: 1 },
    shy: { lid: 0.30, low: 0.24, arc: 0, ix: -6, iy: 5, is: 1.00, browI: -4, browO: -1, mouth: 'wavy', blush: 0.88, spark: 1 },
    surprise: { lid: -0.16, low: 0, arc: 0, ix: 0, iy: -2, is: 0.84, browI: -9, browO: -8, mouth: 'o', blush: 0.16, spark: 1, mark: 2 }
  };

  /** 表情附加符号：泪珠 / 怒筋 / 惊叹 */
  function emoMark(sp, o) {
    o = o || {};
    var out = [];
    if (sp.tear) {
      out.push(P('M' + (CX - 68) + ' ' + (EY + 16) + 'c-6 9 -8 14 -8 18a7 7 0 0 0 14 0c0 -4 -2 -9 -6 -18Z',
        'fill="#9fd8f2" fill-opacity="0.92"'));
      out.push(E(CX - 72, EY + 33, 2.2, 2.6, 'fill="#ffffff" fill-opacity="0.9"'));
    }
    if (sp.mark === 1) {
      out.push(G([
        P('M' + (CX + 74) + ' 84c-8 0 -12 6 -12 12c0 7 6 12 13 11', 'fill="none" stroke="#e2606f" stroke-width="3.4" stroke-linecap="round"'),
        P('M' + (CX + 62) + ' 96c-6 -1 -11 3 -12 9c-1 7 4 12 11 12', 'fill="none" stroke="#e2606f" stroke-width="3.4" stroke-linecap="round"'),
        P('M' + (CX + 76) + ' 94l10 -8', 'fill="none" stroke="#e2606f" stroke-width="3.4" stroke-linecap="round"'),
        P('M' + (CX + 66) + ' 106l-11 6', 'fill="none" stroke="#e2606f" stroke-width="3.4" stroke-linecap="round"')
      ]));
    }
    if (sp.mark === 2) {
      out.push(P('M' + (CX + 86) + ' 54c3 12 3 20 0 27c-3 -7 -3 -15 0 -27Z', 'fill="#f2c14e"') +
        P('M' + (CX + 86) + ' 90a4 4 0 1 0 0 8a4 4 0 1 0 0 -8Z', 'fill="#f2c14e"'));
    }
    return out.join('');
  }

  /** 眼睛 + 眉 + 鼻 + 嘴 + 腮红 的完整脸部（供角色 draw 调用） */
  function face(c, sp, o) {
    o = o || {};
    var eo = o.eyes || {};
    return eyes(c, sp, eo) + brows(c, sp, o.brow || {}) + nose(o.nose || {}) +
      mouth(sp, o.mouth || {}) + blush(c, sp.blush * (o.blushScale == null ? 1 : o.blushScale), o.blush || {}) +
      emoMark(sp, o);
  }

  /* =========================================================================
   * 4. 身体（共用“学生体型”）
   * ========================================================================= */

  /** 躯干（上衣/连衣裙的基础轮廓） */
  function bodiceD(o) {
    o = o || {};
    var sx = o.sx == null ? 92 : o.sx;      // 肩半宽
    var wx = o.wx == null ? 64 : o.wx;      // 腰半宽
    var y0 = o.y0 == null ? 258 : o.y0;
    var y1 = o.y1 == null ? SHOULDER_Y : o.y1;
    var y2 = o.y2 == null ? WAIST_Y : o.y2;
    var y3 = o.y3 == null ? 620 : o.y3;     // 下摆
    return 'M176 ' + y0 +
      'C150 ' + r1(y0 + 10) + ' ' + r1(CX - sx + 10) + ' ' + r1(y0 + 26) + ' ' + r1(CX - sx) + ' ' + y1 +
      'C' + r1(CX - sx - 2) + ' ' + r1(y1 + 38) + ' ' + r1(CX - wx - 4) + ' ' + r1((y1 + y2) / 2) + ' ' + r1(CX - wx) + ' ' + y2 +
      'L' + r1(CX + wx) + ' ' + y2 +
      'C' + r1(CX + wx + 4) + ' ' + r1((y1 + y2) / 2) + ' ' + r1(CX + sx + 2) + ' ' + r1(y1 + 38) + ' ' + r1(CX + sx) + ' ' + y1 +
      'C' + r1(CX + sx - 10) + ' ' + r1(y0 + 26) + '270 ' + r1(y0 + 10) + ' 244 ' + y0 + 'Z';
  }

  /** 裙摆（A 字，下缘可做花瓣/圆弧） */
  function skirtD(o) {
    o = o || {};
    var y0 = o.y0, h0 = o.h0, h1 = o.h1, y1 = o.y1;
    var hem = o.hem || 'arc';
    var d = 'M' + r1(CX - h0) + ' ' + y0 + 'L' + r1(CX - h1) + ' ' + y1;
    if (hem === 'arc') {
      d += 'Q' + CX + ' ' + r1(y1 + 16) + ' ' + r1(CX + h1) + ' ' + y1;
    } else {
      var n = o.n || 6, i, xa, xb, step = (2 * h1) / n;
      for (i = 0; i < n; i++) {
        xa = CX - h1 + i * step;
        xb = xa + step;
        d += 'Q' + r1(xa + step * 0.5) + ' ' + r1(y1 + 13) + ' ' + r1(xb) + ' ' + r1(y1);
      }
    }
    d += 'L' + r1(CX + h0) + ' ' + y0 + 'Z';
    return d;
  }

  /** 腿（裙下露出的部分） */
  function legs(o) {
    o = o || {};
    var skin = o.skin || SKIN;
    var y0 = o.y0 == null ? 560 : o.y0;
    var out = [];
    out.push(limb(CX - 26, y0, CX - 30, VH + 10, o.w || 62, 56, 'fill="' + skin + '"'));
    out.push(limb(CX + 26, y0, CX + 30, VH + 10, o.w || 62, 56, 'fill="' + skin + '"'));
    out.push(P('M' + (CX - 4) + ' ' + (y0 + 10) + 'l-3 210l7 0l3 -210Z', 'fill="' + SKIN_DP + '" fill-opacity="0.35"'));
    out.push(P('M' + (CX + 4) + ' ' + (y0 + 10) + 'l3 210l-7 0l-3 -210Z', 'fill="' + SKIN_DP + '" fill-opacity="0.35"'));
    return G(out, '');
  }

  /** 裤子（男生） */
  function trousers(o) {
    o = o || {};
    var g = o.grad;
    var y0 = o.y0 == null ? 470 : o.y0;
    var out = [];
    out.push(limb(CX - 26, y0 - 30, CX - 30, VH + 10, o.w || 74, 68, 'fill="' + g + '"'));
    out.push(limb(CX + 26, y0 - 30, CX + 30, VH + 10, o.w || 74, 68, 'fill="' + g + '"'));
    out.push(P('M' + (CX - 2) + ' ' + (y0 + 6) + 'l-2 250l5 0l2 -250Z', 'fill="#000000" fill-opacity="0.22"'));
    out.push(P('M' + (CX + 2) + ' ' + (y0 + 6) + 'l2 250l-5 0l-2 -250Z', 'fill="#000000" fill-opacity="0.22"'));
    return G(out, '');
  }

  /** 手臂（自然下垂）s: -1 左 / +1 右 */
  function armDown(c, s, o) {
    o = o || {};
    var skin = o.skin || SKIN;
    var sl = o.sleeveGrad || o.sleeve || '#ffffff';
    var len = o.sleeveLen == null ? 0.42 : o.sleeveLen;   // 袖长（占上臂比例）
    var shx = CX + s * 95, shy = 316;
    var elx = CX + s * 104, ely = 428;
    var wrx = CX + s * 94, wry = 548;
    var out = [];
    /* 上臂 + 前臂（肤色） */
    out.push(limb(shx, shy, elx, ely, o.w1 || 46, o.w2 || 36, 'fill="' + skin + '"'));
    out.push(limb(elx - s * 3, ely - 10, wrx, wry, o.w2 || 36, o.w3 || 25, 'fill="' + skin + '"'));
    /* 袖 */
    var ex = mix(shx, elx, len), ey = mix(shy, ely, len);
    out.push(limb(shx - s * 2, shy - 8, ex, ey, (o.w1 || 46) + 8, (o.w1 || 46) * 0.86 + 6, 'fill="' + sl + '"'));
    if (o.cuff !== false) {
      out.push(limb(ex - s * 1, ey - 4, ex + s * 1, ey + 4, (o.w1 || 46) * 0.86 + 7, (o.w1 || 46) * 0.86 + 6,
        'fill="' + (o.cuffCol || sl) + '" stroke="' + (o.sleeveLine || '#00000022') + '" stroke-width="1.2"'));
    }
    /* 手 */
    out.push(E(wrx + s * 2, wry + 16, 15, 20, 'fill="' + skin + '" transform="rotate(' + (s * 8) + ' ' + r1(wrx + s * 2) + ' ' + r1(wry + 16) + ')"'));
    out.push(P('M' + r1(wrx + s * 4) + ' ' + r1(wry + 8) + 'c' + r1(s * 9) + ' 6 ' + r1(s * 8) + ' 16 0 22',
      'fill="none" stroke="' + SKIN_LN + '" stroke-width="1.4" stroke-opacity="0.7"'));
    /* 袖口阴影 */
    out.push(P('M' + r1(shx - s * 24) + ' ' + r1(shy + 6) + 'q' + r1(s * 10) + ' 6 ' + r1(s * 20) + ' 2',
      'fill="none" stroke="#000000" stroke-opacity="0.10" stroke-width="3"'));
    return out.join('');
  }

  /** 手臂（双手交握于胸前，用于苏小暖等） */
  function armChest(c, s, o) {
    o = o || {};
    var skin = o.skin || SKIN;
    var sl = o.sleeveGrad || o.sleeve || '#ffffff';
    var out = [];
    var shx = CX + s * 95, shy = 316;
    var elx = CX + s * 100, ely = 452;
    var hx = CX + s * 20, hy = 468;
    out.push(limb(shx, shy, elx, ely, o.w1 || 46, o.w2 || 36, 'fill="' + skin + '"'));
    out.push(limb(elx - s * 2, ely - 12, hx, hy, o.w2 || 36, o.w3 || 25, 'fill="' + skin + '"'));
    /* 泡泡短袖 */
    out.push(limb(shx - s * 2, shy - 10, CX + s * 104, 398, (o.w1 || 46) + 12, (o.w1 || 46) * 0.9 + 8, 'fill="' + sl + '"'));
    out.push(P('M' + r1(shx - s * 34) + ' ' + r1(shy + 2) + 'C' + r1(shx - s * 44) + ' ' + r1(shy + 34) + ' ' +
      r1(CX + s * 78) + ' 396 ' + r1(CX + s * 70) + ' 400',
      'fill="none" stroke="#000000" stroke-opacity="0.10" stroke-width="4"'));
    /* 手 */
    out.push(E(hx + s * 6, hy, 16, 15, 'fill="' + skin + '" transform="rotate(' + (s * -14) + ' ' + r1(hx + s * 6) + ' ' + r1(hy) + ')"'));
    out.push(P('M' + r1(hx - s * 2) + ' ' + r1(hy - 6) + 'q' + r1(s * 10) + ' 5 ' + r1(s * 12) + ' 14',
      'fill="none" stroke="' + SKIN_LN + '" stroke-width="1.3" stroke-opacity="0.6"'));
    out.push(P('M' + r1(hx - s * 4) + ' ' + r1(hy + 2) + 'q' + r1(s * 9) + ' 4 ' + r1(s * 11) + ' 12',
      'fill="none" stroke="' + SKIN_LN + '" stroke-width="1.3" stroke-opacity="0.6"'));
    return out.join('');
  }

  /* =========================================================================
   * 5. 头发系统
   * ========================================================================= */

  /**
   * 发色梯度（垂直，贯穿整幅立绘，保证后发/侧发/刘海颜色连续）
   * pal: {hi, mid, lo, tip, dark, line}
   */
  function hairGrad(c, pal, y0, y1) {
    return c.lin([
      [0, pal.hi || pal.mid],
      [0.34, pal.mid],
      [0.68, pal.lo || pal.mid],
      [1, pal.tip || pal.lo || pal.mid]
    ], CX, y0 == null ? 10 : y0, CX, y1 == null ? 750 : y1);
  }

  /** 发顶高光条（白色柔光），可用 op 调节强度 */
  function shine(c, o) {
    o = o || {};
    var op = o.op == null ? 0.55 : o.op;
    var g = c.lin([[0, '#ffffff', op], [0.55, '#ffffff', op * 0.55], [1, '#ffffff', 0]],
      CX, o.y == null ? 60 : o.y, CX, (o.y == null ? 60 : o.y) + 90);
    var x = o.x == null ? CX : o.x, y = o.y == null ? 60 : o.y, sc = o.sc == null ? 1 : o.sc;
    return G([
      P('M' + r1(x - 62 * sc) + ' ' + r1(y + 46 * sc) +
        'C' + r1(x - 54 * sc) + ' ' + r1(y + 8 * sc) + ' ' + r1(x - 22 * sc) + ' ' + r1(y - 14 * sc) + ' ' + r1(x + 14 * sc) + ' ' + r1(y - 12 * sc) +
        'C' + r1(x - 14 * sc) + ' ' + r1(y - 2 * sc) + ' ' + r1(x - 40 * sc) + ' ' + r1(y + 20 * sc) + ' ' + r1(x - 46 * sc) + ' ' + r1(y + 50 * sc) +
        'C' + r1(x - 50 * sc) + ' ' + r1(y + 66 * sc) + ' ' + r1(x - 64 * sc) + ' ' + r1(y + 62 * sc) + ' ' + r1(x - 62 * sc) + ' ' + r1(y + 46 * sc) + 'Z',
        'fill="' + g + '"'),
      P('M' + r1(x - 58 * sc) + ' ' + r1(y + 58 * sc) +
        'C' + r1(x - 16 * sc) + ' ' + r1(y + 40 * sc) + ' ' + r1(x + 30 * sc) + ' ' + r1(y + 40 * sc) + ' ' + r1(x + 66 * sc) + ' ' + r1(y + 54 * sc) +
        'C' + r1(x + 30 * sc) + ' ' + r1(y + 68 * sc) + ' ' + r1(x - 18 * sc) + ' ' + r1(y + 70 * sc) + ' ' + r1(x - 58 * sc) + ' ' + r1(y + 58 * sc) + 'Z',
        'fill="' + g + '"')
    ]);
  }

  /** 头顶弧（发旋 / 分层线） */
  function hairArc(c, x, y, w, h, col, op, sw) {
    return P('M' + r1(x - w) + ' ' + r1(y) + 'Q' + r1(x) + ' ' + r1(y - h) + ' ' + r1(x + w) + ' ' + r1(y),
      'fill="none" stroke="' + col + '" stroke-opacity="' + (op == null ? 0.45 : op) + '" stroke-width="' + (sw || 2.4) + '" stroke-linecap="round"');
  }

  /**
   * 发帽（头顶 + 刘海）—— 所有角色共用，靠参数区分风格。
   * o: {top, lx, rx, by, fy, n, amp, spiky}
   */
  function capD(o) {
    o = o || {};
    var top = o.top == null ? 30 : o.top;
    var lx = o.lx == null ? 124 : o.lx;
    var rx = o.rx == null ? 296 : o.rx;
    var by = o.by == null ? 152 : o.by;
    var d = 'M' + r1(lx) + ' ' + r1(by) +
      'C' + r1(lx - 12) + ' ' + r1(top + 54) + ' ' + r1(CX - 58) + ' ' + r1(top) + ' ' + CX + ' ' + r1(top) +
      'C' + r1(CX + 58) + ' ' + r1(top) + ' ' + r1(rx + 12) + ' ' + r1(top + 54) + ' ' + r1(rx) + ' ' + r1(by);
    d += fringeEdge(rx, lx, o.fy == null ? 138 : o.fy, o.n || 5, o.amp == null ? 9 : o.amp, o.spiky, by);
    return d + 'Z';
  }

  /** 女性前发（刘海），style: 'blunt' 齐刘海 / 'sweep' 斜刘海 / 'split' 中分 */
  function bangsFem(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark, out = [];
    if (o.style === 'split') {
      out.push(P(capD({ top: 28, lx: 122, rx: 298, by: 150, fy: 132, n: 4, amp: 8, spiky: false }), 'fill="' + g + '"'));
      out.push(P('M' + CX + ' 34C' + (CX + 30) + ' 44 ' + (CX + 52) + ' 76 ' + (CX + 58) + ' 118C' + (CX + 44) + ' 86 ' + (CX + 22) + ' 62 ' + CX + ' 56Z',
        'fill="' + dk + '" fill-opacity="0.35"'));
      out.push(P('M' + CX + ' 34C' + (CX - 30) + ' 44 ' + (CX - 52) + ' 76 ' + (CX - 58) + ' 118C' + (CX - 44) + ' 86 ' + (CX - 22) + ' 62 ' + CX + ' 56Z',
        'fill="' + dk + '" fill-opacity="0.22"'));
    } else if (o.style === 'sweep') {
      out.push(P(capD({ top: 30, lx: 124, rx: 296, by: 152, fy: 128, n: 4, amp: 10, spiky: false }), 'fill="' + g + '"'));
      out.push(P('M136 124C144 66 190 34 246 44C288 52 302 92 300 134C288 96 258 70 216 70C182 70 154 92 136 124Z',
        'fill="' + g + '"'));
      out.push(P('M136 124C144 88 168 70 200 68C176 78 156 98 146 130Z', 'fill="' + dk + '" fill-opacity="0.3"'));
    } else { /* blunt */
      out.push(P(capD({ top: 30, lx: 122, rx: 298, by: 154, fy: o.fy == null ? 150 : o.fy, n: 5, amp: o.amp == null ? 8 : o.amp }), 'fill="' + g + '"'));
      out.push(P('M140 60C160 44 184 38 210 38C186 48 166 62 152 84C146 92 138 82 140 60Z', 'fill="' + dk + '" fill-opacity="0.18"'));
    }
    return out;
  }

  /** 男性前发，style: 'short' / 'buzz' / 'messy' / 'sidePart' */
  function bangsMale(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark, out = [];
    if (o.style === 'buzz') {
      out.push(P(capD({ top: 46, lx: 132, rx: 288, by: 142, fy: 132, n: 3, amp: 5, spiky: false }), 'fill="' + g + '"'));
    } else if (o.style === 'messy') {
      out.push(P(capD({ top: 26, lx: 120, rx: 300, by: 156, fy: 124, n: 7, amp: 19, spiky: true }), 'fill="' + g + '"'));
      out.push(P('M120 156C126 128 140 108 164 96C150 116 142 136 140 158Z', 'fill="' + dk + '" fill-opacity="0.28"'));
      out.push(P('M300 156C292 126 276 106 252 96C268 118 276 138 280 158Z', 'fill="' + dk + '" fill-opacity="0.28"'));
    } else if (o.style === 'sidePart') {
      out.push(P(capD({ top: 28, lx: 122, rx: 298, by: 152, fy: 126, n: 4, amp: 12, spiky: false }), 'fill="' + g + '"'));
      out.push(P('M126 132C132 74 176 38 232 44C276 50 300 84 302 128C288 92 258 68 216 68C178 68 146 94 126 132Z', 'fill="' + g + '"'));
      out.push(P('M126 132C132 92 154 70 188 64C160 78 140 100 132 136Z', 'fill="' + dk + '" fill-opacity="0.32"'));
      out.push(P('M126 60C150 44 176 40 200 46', 'fill="none" stroke="' + dk + '" stroke-opacity="0.4" stroke-width="3"'));
    } else {
      out.push(P(capD({ top: 30, lx: 124, rx: 296, by: 150, fy: 128, n: 5, amp: 13, spiky: true }), 'fill="' + g + '"'));
      out.push(P('M124 150C130 120 144 100 170 88C154 108 146 128 144 152Z', 'fill="' + dk + '" fill-opacity="0.26"'));
    }
    return out;
  }

  /** 后发（长发大块，可带下摆波浪），o: {grad, y0, yEnd, wide, tip} */
  function backMassLong(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var y0 = 24, wy = o.wy == null ? 96 : o.wy;        // 最宽处半宽
    var e1 = o.yEnd == null ? 660 : o.yEnd;
    var out = [];
    out.push(P('M' + (CX - 86) + ' 148' +
      'C' + (CX - 98) + ' 68 ' + (CX - 54) + ' ' + y0 + ' ' + CX + ' ' + y0 +
      'C' + (CX + 54) + ' ' + y0 + ' ' + (CX + 98) + ' 68 ' + (CX + 86) + ' 148' +
      'C' + (CX + 100) + ' 240 ' + (CX + wy + 12) + ' 360 ' + (CX + wy + 12) + ' 470' +
      'C' + (CX + wy + 12) + ' 560 ' + (CX + wy + 4) + ' 618 ' + (CX + wy - 2) + ' ' + e1 +
      'C' + (CX + wy - 18) + ' ' + (e1 + 16) + ' ' + (CX + wy - 30) + ' ' + (e1 + 14) + ' ' + (CX + wy - 34) + ' ' + (e1 - 12) +
      'C' + (CX + wy - 40) + ' ' + (e1 + 14) + ' ' + (CX + wy - 56) + ' ' + (e1 + 18) + ' ' + (CX + wy - 60) + ' ' + (e1 - 10) +
      'C' + (CX + wy - 68) + ' ' + (e1 + 16) + ' ' + (CX + wy - 84) + ' ' + (e1 + 16) + ' ' + (CX + wy - 88) + ' ' + (e1 - 14) +
      'C' + (CX + wy - 96) + ' ' + (e1 + 12) + ' ' + (CX + wy - 112) + ' ' + (e1 + 14) + ' ' + (CX + wy - 118) + ' ' + (e1 - 12) +
      'C' + (CX + wy - 132) + ' ' + (e1 + 10) + ' ' + (CX - wy + 130) + ' ' + (e1 + 10) + ' ' + (CX - wy + 116) + ' ' + (e1 - 14) +
      'C' + (CX - wy + 108) + ' ' + (e1 + 14) + ' ' + (CX - wy + 92) + ' ' + (e1 + 12) + ' ' + (CX - wy + 86) + ' ' + (e1 - 14) +
      'C' + (CX - wy + 80) + ' ' + (e1 + 16) + ' ' + (CX - wy + 62) + ' ' + (e1 + 18) + ' ' + (CX - wy + 56) + ' ' + (e1 - 10) +
      'C' + (CX - wy + 50) + ' ' + (e1 + 14) + ' ' + (CX - wy + 34) + ' ' + (e1 + 16) + ' ' + (CX - wy + 30) + ' ' + (e1 - 12) +
      'C' + (CX - wy + 24) + ' ' + (e1 + 12) + ' ' + (CX - wy + 8) + ' ' + (e1 + 14) + ' ' + (CX - wy + 2) + ' ' + e1 +
      'C' + (CX - wy - 4) + ' 618 ' + (CX - wy - 12) + ' 560 ' + (CX - wy - 12) + ' 470' +
      'C' + (CX - wy - 12) + ' 360 ' + (CX - 100) + ' 240 ' + (CX - 86) + ' 148Z', 'fill="' + g + '"'));
    /* 内侧阴影，增加体积感 */
    out.push(P('M' + (CX - 62) + ' 150C' + (CX - 74) + ' 260 ' + (CX - 76) + ' 400 ' + (CX - 66) + ' 560C' + (CX - 60) + ' 620 ' + (CX - 54) + ' 650 ' + (CX - 50) + ' 672' +
      'C' + (CX - 70) + ' 620 ' + (CX - 84) + ' 480 ' + (CX - 82) + ' 340C' + (CX - 80) + ' 250 ' + (CX - 74) + ' 190 ' + (CX - 62) + ' 150Z',
      'fill="' + dk + '" fill-opacity="0.16"'));
    return out;
  }

  /** 一侧长发垂落（双马尾式的粗发束）s: -1 / +1 */
  function fallLong(c, pal, s, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var x0 = CX + s * 58, x1 = CX + s * 108;
    var yTop = o.yTop == null ? 128 : o.yTop;
    var yTip = o.yTip == null ? 716 : o.yTip;
    return P('M' + r1(x0) + ' ' + yTop +
      'C' + r1(x1 - s * 4) + ' ' + (yTop + 26) + ' ' + r1(x1 + s * 4) + ' ' + (yTop + 84) + ' ' + r1(x1 + s * 4) + ' ' + (yTop + 150) +
      'C' + r1(x1 + s * 6) + ' ' + (yTop + 280) + ' ' + r1(x1 + s * 6) + ' ' + (yTop + 430) + ' ' + r1(x1 + s * 2) + ' ' + (yTip - 90) +
      'C' + r1(x1 - s * 4) + ' ' + (yTip - 24) + ' ' + r1(x1 - s * 22) + ' ' + yTip + ' ' + r1(x1 - s * 30) + ' ' + (yTip - 24) +
      'C' + r1(x1 - s * 44) + ' ' + (yTip - 62) + ' ' + r1(x1 - s * 48) + ' ' + (yTip - 190) + ' ' + r1(x1 - s * 50) + ' ' + (yTop + 300) +
      'C' + r1(x1 - s * 52) + ' ' + (yTop + 190) + ' ' + r1(x1 - s * 54) + ' ' + (yTop + 60) + ' ' + r1(x0 - s * 22) + ' ' + (yTop + 8) + 'Z',
      'fill="' + g + '"') +
      P('M' + r1(x1 - s * 16) + ' ' + (yTop + 40) + 'C' + r1(x1 - s * 12) + ' ' + (yTop + 240) + ' ' + r1(x1 - s * 14) + ' ' + (yTop + 400) + ' ' + r1(x1 - s * 20) + ' ' + (yTip - 120),
        'fill="none" stroke="' + dk + '" stroke-opacity="0.22" stroke-width="5" stroke-linecap="round"');
  }

  /** 长鬓发（贴脸垂下的两缕）s: -1 / +1 */
  function sideLock(c, pal, s, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var yb = o.yBot == null ? 540 : o.yBot;
    var w = o.w == null ? 20 : o.w;
    return P('M' + r1(CX + s * 58) + ' ' + (o.yTop == null ? 96 : o.yTop) +
      'C' + r1(CX + s * 82) + ' ' + 106 + ' ' + r1(CX + s * 86) + ' ' + 140 + ' ' + r1(CX + s * 84) + ' ' + 186 +
      'C' + r1(CX + s * 80) + ' 270 ' + r1(CX + s * 78) + ' 360 ' + r1(CX + s * 74) + ' ' + (yb - 70) +
      'C' + r1(CX + s * 72) + ' ' + (yb - 20) + ' ' + r1(CX + s * 64) + ' ' + (yb + 8) + ' ' + r1(CX + s * 58) + ' ' + (yb - 4) +
      'C' + r1(CX + s * 50) + ' ' + (yb - 26) + ' ' + r1(CX + s * 46) + ' ' + (yb - 90) + ' ' + r1(CX + s * 48) + ' ' + 300 +
      'C' + r1(CX + s * 50) + ' 230 ' + r1(CX + s * 52) + ' 150 ' + r1(CX + s * 54) + ' 112Z',
      'fill="' + g + '"') +
      P('M' + r1(CX + s * 74) + ' ' + 170 + 'C' + r1(CX + s * 70) + ' 280 ' + r1(CX + s * 68) + ' 400 ' + r1(CX + s * 64) + ' ' + (yb - 30),
        'fill="none" stroke="' + dk + '" stroke-opacity="0.2" stroke-width="4" stroke-linecap="round"');
  }

  /** 短发布块（男生后脑 / 男生后颈） */
  function backMassShort(c, pal, o) {
    o = o || {};
    var g = o.grad;
    return P('M' + (CX - 84) + ' 130C' + (CX - 92) + ' 56 ' + (CX - 50) + ' 26 ' + CX + ' 26' +
      'C' + (CX + 50) + ' 26 ' + (CX + 92) + ' 56 ' + (CX + 84) + ' 130' +
      'C' + (CX + 88) + ' 168 ' + (CX + 86) + ' 194 ' + (CX + 80) + ' 212' +
      'C' + (CX + 50) + ' 226 ' + (CX - 50) + ' 226 ' + (CX - 80) + ' 212' +
      'C' + (CX - 86) + ' 194 ' + (CX - 88) + ' 168 ' + (CX - 84) + ' 130Z', 'fill="' + g + '"');
  }

  /** 中长发后块（及肩） */
  function backMassMid(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var wy = o.wy == null ? 92 : o.wy, ye = o.yEnd == null ? 420 : o.yEnd;
    return P('M' + (CX - 86) + ' 146C' + (CX - 98) + ' 66 ' + (CX - 54) + ' 22 ' + CX + ' 22' +
      'C' + (CX + 54) + ' 22 ' + (CX + 98) + ' 66 ' + (CX + 86) + ' 146' +
      'C' + (CX + 96) + ' 220 ' + (CX + wy + 8) + ' 300 ' + (CX + wy) + ' ' + ye +
      'C' + (CX + wy - 6) + ' ' + (ye + 26) + ' ' + (CX + wy - 22) + ' ' + (ye + 34) + ' ' + (CX + wy - 28) + ' ' + (ye + 6) +
      'C' + (CX + wy - 34) + ' ' + (ye + 40) + ' ' + (CX + wy - 52) + ' ' + (ye + 44) + ' ' + (CX + wy - 56) + ' ' + (ye + 12) +
      'C' + (CX + wy - 62) + ' ' + (ye + 42) + ' ' + (CX - wy + 60) + ' ' + (ye + 42) + ' ' + (CX - wy + 54) + ' ' + (ye + 12) +
      'C' + (CX - wy + 50) + ' ' + (ye + 44) + ' ' + (CX - wy + 32) + ' ' + (ye + 40) + ' ' + (CX - wy + 26) + ' ' + (ye + 6) +
      'C' + (CX - wy + 20) + ' ' + (ye + 34) + ' ' + (CX - wy + 4) + ' ' + (ye + 26) + ' ' + (CX - wy - 2) + ' ' + ye +
      'C' + (CX - wy - 10) + ' 300 ' + (CX - 96) + ' 220 ' + (CX - 86) + ' 146Z', 'fill="' + g + '"') +
      P('M' + (CX - 66) + ' 150C' + (CX - 76) + ' 250 ' + (CX - 78) + ' 350 ' + (CX - 70) + ' ' + (ye + 20) +
        'C' + (CX - 76) + ' 350 ' + (CX - 88) + ' 250 ' + (CX - 84) + ' 180Z',
        'fill="' + dk + '" fill-opacity="0.15"');
  }

  /** 马尾（后脑一束） */
  function ponytail(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var s = o.s == null ? 1 : o.s;
    var tie = o.tie || '#e05a78';
    var baseX = CX + s * 62, baseY = o.y == null ? 104 : o.y;
    return P('M' + r1(baseX) + ' ' + baseY +
      'C' + r1(baseX + s * 40) + ' ' + (baseY + 18) + ' ' + r1(baseX + s * 54) + ' ' + (baseY + 96) + ' ' + r1(baseX + s * 50) + ' ' + (baseY + 176) +
      'C' + r1(baseX + s * 46) + ' ' + (baseY + 260) + ' ' + r1(baseX + s * 34) + ' ' + (baseY + 336) + ' ' + r1(baseX + s * 18) + ' ' + (baseY + 392) +
      'C' + r1(baseX + s * 8) + ' ' + (baseY + 424) + ' ' + r1(baseX - s * 6) + ' ' + (baseY + 418) + ' ' + r1(baseX - s * 6) + ' ' + (baseY + 386) +
      'C' + r1(baseX - s * 6) + ' ' + (baseY + 300) + ' ' + r1(baseX + s * 2) + ' ' + (baseY + 190) + ' ' + r1(baseX + s * 6) + ' ' + (baseY + 110) + 'Z',
      'fill="' + g + '"') +
      P('M' + r1(baseX + s * 20) + ' ' + (baseY + 40) + 'C' + r1(baseX + s * 30) + ' ' + (baseY + 150) + ' ' + r1(baseX + s * 24) + ' ' + (baseY + 280) + ' ' + r1(baseX + s * 8) + ' ' + (baseY + 370),
        'fill="none" stroke="' + dk + '" stroke-opacity="0.24" stroke-width="5" stroke-linecap="round"') +
      E(baseX + s * 6, baseY + 8, 15, 11, 'fill="' + tie + '" transform="rotate(' + (s * -24) + ' ' + r1(baseX + s * 6) + ' ' + r1(baseY + 8) + ')"') +
      P('M' + r1(baseX - s * 2) + ' ' + (baseY + 4) + 'l' + r1(s * 26) + ' -10', 'fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2"');
  }

  /** 低发髻 (后颈) */
  function bunHair(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var bx = o.x == null ? CX + 62 : o.x, by = o.y == null ? 186 : o.y;
    return E(bx, by, 36, 32, 'fill="' + g + '"') +
      P('M' + r1(bx - 30) + ' ' + (by - 16) + 'C' + r1(bx - 10) + ' ' + (by - 30) + ' ' + r1(bx + 14) + ' ' + (by - 28) + ' ' + r1(bx + 30) + ' ' + (by - 8),
        'fill="none" stroke="' + dk + '" stroke-opacity="0.3" stroke-width="4" stroke-linecap="round"') +
      P('M' + r1(bx - 32) + ' ' + (by + 6) + 'C' + r1(bx - 12) + ' ' + (by + 22) + ' ' + r1(bx + 16) + ' ' + (by + 20) + ' ' + r1(bx + 32) + ' ' + (by + 2),
        'fill="none" stroke="' + dk + '" stroke-opacity="0.22" stroke-width="4" stroke-linecap="round"') +
      E(bx - 6, by - 14, 9, 6, 'fill="#ffffff" fill-opacity="0.35"');
  }

  /** 波浪卷发块（及肩，外缘 S 形） */
  function backMassWavy(c, pal, o) {
    o = o || {};
    var g = o.grad, dk = pal.dark;
    var ye = o.yEnd == null ? 430 : o.yEnd;
    var wy = o.wy == null ? 96 : o.wy;
    return P('M' + (CX - 86) + ' 146C' + (CX - 98) + ' 66 ' + (CX - 54) + ' 22 ' + CX + ' 22' +
      'C' + (CX + 54) + ' 22 ' + (CX + 98) + ' 66 ' + (CX + 86) + ' 146' +
      'C' + (CX + 104) + ' 210 ' + (CX + wy + 22) + ' 260 ' + (CX + wy + 16) + ' ' + (ye - 40) +
      'C' + (CX + wy + 22) + ' ' + (ye + 4) + ' ' + (CX + wy + 8) + ' ' + (ye + 34) + ' ' + (CX + wy - 6) + ' ' + (ye + 6) +
      'C' + (CX + wy - 18) + ' ' + (ye + 36) + ' ' + (CX + wy - 34) + ' ' + (ye + 30) + ' ' + (CX + wy - 40) + ' ' + (ye - 2) +
      'C' + (CX + wy - 52) + ' ' + (ye + 26) + ' ' + (CX + wy - 68) + ' ' + (ye + 16) + ' ' + (CX + wy - 72) + ' ' + (ye - 8) +
      'C' + (CX + wy - 84) + ' ' + (ye + 12) + ' ' + (CX - wy + 82) + ' ' + (ye + 12) + ' ' + (CX - wy + 70) + ' ' + (ye - 8) +
      'C' + (CX - wy + 66) + ' ' + (ye + 16) + ' ' + (CX - wy + 50) + ' ' + (ye + 26) + ' ' + (CX - wy + 38) + ' ' + (ye - 2) +
      'C' + (CX - wy + 32) + ' ' + (ye + 30) + ' ' + (CX - wy + 16) + ' ' + (ye + 36) + ' ' + (CX - wy + 4) + ' ' + (ye + 6) +
      'C' + (CX - wy - 10) + ' ' + (ye + 34) + ' ' + (CX - wy - 24) + ' ' + (ye + 4) + ' ' + (CX - wy - 18) + ' ' + (ye - 40) +
      'C' + (CX - wy - 24) + ' 260 ' + (CX - 104) + ' 210 ' + (CX - 86) + ' 146Z', 'fill="' + g + '"') +
      P('M' + (CX - 70) + ' 160C' + (CX - 80) + ' 250 ' + (CX - 84) + ' 340 ' + (CX - 76) + ' ' + (ye + 6) +
        'C' + (CX - 82) + ' 320 ' + (CX - 92) + ' 230 ' + (CX - 86) + ' 170Z',
        'fill="' + dk + '" fill-opacity="0.14"');
  }

  /** 卷发外缘小卷（用于妈妈烫发），沿椭圆排布 */
  function curlRing(c, pal, o) {
    o = o || {};
    var g = o.grad;
    var out = [], xs = [-84, -62, -22, 22, 62, 84, 80, 52, 52, 80], ys = [96, 44, 20, 20, 44, 96, 128, 152, 152, 128], i;
    for (i = 0; i < xs.length; i++) {
      out.push(C(CX + xs[i], ys[i] + 14, o.r == null ? 17 : o.r, 'fill="' + g + '"'));
    }
    return out.join('');
  }

  /* =========================================================================
   * 6. 服装部件
   * ========================================================================= */

  /** 圆角矩形路径 */
  function rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return 'M' + r1(x + r) + ' ' + r1(y) + 'H' + r1(x + w - r) +
      'A' + r1(r) + ' ' + r1(r) + ' 0 0 1 ' + r1(x + w) + ' ' + r1(y + r) +
      'V' + r1(y + h - r) + 'A' + r1(r) + ' ' + r1(r) + ' 0 0 1 ' + r1(x + w - r) + ' ' + r1(y + h) +
      'H' + r1(x + r) + 'A' + r1(r) + ' ' + r1(r) + ' 0 0 1 ' + r1(x) + ' ' + r1(y + h - r) +
      'V' + r1(y + r) + 'A' + r1(r) + ' ' + r1(r) + ' 0 0 1 ' + r1(x + r) + ' ' + r1(y) + 'Z';
  }

  /** 衬衫圆领 + 领片 + 门襟 */
  function collarShirt(c, o) {
    o = o || {};
    var g = o.grad || '#fdfcfa', sh = o.shade || '#ded9e8', ln = o.line || '#c6c0d3';
    var op = o.op == null ? 1 : o.op;
    var out = [];
    out.push(P('M182 252C186 284 234 284 238 252C232 246 222 242 210 242C198 242 188 246 182 252Z',
      'fill="' + sh + '" fill-opacity="' + (0.9 * op) + '"'));
    out.push(P('M180 258C170 268 167 285 176 296C194 303 211 294 212 278C212 266 200 253 180 258Z',
      'fill="' + g + '" stroke="' + ln + '" stroke-width="1.5"'));
    out.push(P('M240 258C250 268 253 285 244 296C226 303 209 294 208 278C208 266 220 253 240 258Z',
      'fill="' + g + '" stroke="' + ln + '" stroke-width="1.5"'));
    if (o.placket !== false) {
      out.push(P('M206 292L206 ' + (o.plackEnd || 430) + 'M214 292L214 ' + (o.plackEnd || 430),
        'fill="none" stroke="' + ln + '" stroke-width="1.6"'));
      out.push(C(210, 314, 3.4, 'fill="' + (o.btn || '#e8e4ef') + '" stroke="' + ln + '" stroke-width="1.2"'));
      out.push(C(210, 356, 3.4, 'fill="' + (o.btn || '#e8e4ef') + '" stroke="' + ln + '" stroke-width="1.2"'));
      out.push(C(210, 398, 3.4, 'fill="' + (o.btn || '#e8e4ef') + '" stroke="' + ln + '" stroke-width="1.2"'));
    }
    return out.join('');
  }

  /** V 领（西装 / 开衫内衬的衬衫三角） */
  function shirtV(c, o) {
    o = o || {};
    var g = o.grad || '#fdfcfa', ln = o.line || '#c6c0d3';
    var out = [];
    out.push(P('M178 258C182 292 196 316 210 330C224 316 238 292 242 258C230 252 190 252 178 258Z',
      'fill="' + g + '" stroke="' + ln + '" stroke-width="1.4"'));
    out.push(P('M182 254C188 286 198 308 210 322C222 308 232 286 238 254C226 266 194 266 182 254Z',
      'fill="' + (o.shade || '#e6e2ee') + '" fill-opacity="0.75"'));
    return out.join('');
  }

  /** 西装 / 外套的翻领 + 门襟（覆盖在 bodice 上） */
  function lapels(c, o) {
    o = o || {};
    var g = o.grad, ln = o.line || '#00000033', out = [];
    var y0 = o.y0 == null ? 300 : o.y0;
    out.push(P('M' + (CX - 34) + ' ' + y0 + 'L' + CX + ' ' + (y0 + 46) + 'L' + (CX - 30) + ' ' + (y0 + 76) +
      'L' + (CX - 62) + ' ' + (y0 + 18) + 'Z', 'fill="' + g + '" stroke="' + ln + '" stroke-width="1.4"'));
    out.push(P('M' + (CX + 34) + ' ' + y0 + 'L' + CX + ' ' + (y0 + 46) + 'L' + (CX + 30) + ' ' + (y0 + 76) +
      'L' + (CX + 62) + ' ' + (y0 + 18) + 'Z', 'fill="' + g + '" stroke="' + ln + '" stroke-width="1.4"'));
    out.push(P('M' + (CX - 6) + ' ' + (y0 + 50) + 'L' + (CX - 10) + ' 760M' + (CX + 6) + ' ' + (y0 + 50) + 'L' + (CX + 10) + ' 760',
      'fill="none" stroke="' + ln + '" stroke-width="2"'));
    out.push(E(CX + 16, y0 + 120, 3.6, 3.6, 'fill="' + (o.btn || '#d8d3e0') + '" stroke="' + ln + '" stroke-width="1"'));
    out.push(E(CX + 18, y0 + 168, 3.6, 3.6, 'fill="' + (o.btn || '#d8d3e0') + '" stroke="' + ln + '" stroke-width="1"'));
    return out.join('');
  }

  /** 连帽衫：帽子 + 抽绳 + 口袋 */
  function hoodie(c, o) {
    o = o || {};
    var g = o.grad, sh = o.shade || '#00000022', cord = o.cord || '#f2f2f6';
    var out = [];
    out.push(P('M' + (CX - 56) + ' ' + 262 + 'C' + (CX - 76) + ' ' + 260 + ' ' + (CX - 88) + ' ' + 278 + ' ' + (CX - 84) + ' ' + 306 +
      'C' + (CX - 40) + ' ' + 292 + ' ' + (CX + 40) + ' ' + 292 + ' ' + (CX + 84) + ' ' + 306 +
      'C' + (CX + 88) + ' ' + 278 + ' ' + (CX + 76) + ' ' + 260 + ' ' + (CX + 56) + ' ' + 262 + 'Z',
      'fill="' + (o.hoodGrad || g) + '"'));
    out.push(P('M' + (CX - 60) + ' ' + 268 + 'C' + (CX - 74) + ' ' + 272 + ' ' + (CX - 82) + ' ' + 288 + ' ' + (CX - 80) + ' ' + 302 +
      'C' + (CX - 40) + ' ' + 290 + ' ' + (CX + 40) + ' ' + 290 + ' ' + (CX + 80) + ' ' + 302,
      'fill="none" stroke="' + sh + '" stroke-width="4"'));
    out.push(P('M' + (CX - 16) + ' ' + 296 + 'C' + (CX - 20) + ' ' + 340 + ' ' + (CX - 24) + ' ' + 372 + ' ' + (CX - 22) + ' ' + 402,
      'fill="none" stroke="' + cord + '" stroke-width="5" stroke-linecap="round"'));
    out.push(P('M' + (CX + 16) + ' ' + 296 + 'C' + (CX + 20) + ' ' + 340 + ' ' + (CX + 24) + ' ' + 372 + ' ' + (CX + 22) + ' ' + 402,
      'fill="none" stroke="' + cord + '" stroke-width="5" stroke-linecap="round"'));
    out.push(E(CX - 22, 408, 4, 7, 'fill="' + (o.aglet || '#c8c8d4') + '"'));
    out.push(E(CX + 22, 408, 4, 7, 'fill="' + (o.aglet || '#c8c8d4') + '"'));
    if (o.pocket !== false) {
      out.push(P(rrect(CX - 76, 540, 152, 92, 16), 'fill="' + sh + '" fill-opacity="0.55"'));
      out.push(P('M' + (CX - 76) + ' ' + 552 + 'L' + (CX + 76) + ' ' + 552, 'fill="none" stroke="' + sh + '" stroke-width="3"'));
    }
    return out.join('');
  }

  /** 围裙（妈妈） */
  function apron(c, o) {
    o = o || {};
    var g = o.grad || '#f6efe2', ln = o.line || '#d8cbb4';
    var out = [];
    out.push(P('M' + (CX - 40) + ' ' + 300 + 'L' + (CX - 96) + ' ' + 470, 'fill="none" stroke="' + g + '" stroke-width="14"'));
    out.push(P('M' + (CX + 40) + ' ' + 300 + 'L' + (CX + 96) + ' ' + 470, 'fill="none" stroke="' + g + '" stroke-width="14"'));
    out.push(P('M' + (CX - 46) + ' ' + 336 + 'C' + (CX - 54) + ' ' + 300 + ' ' + (CX - 20) + ' ' + 288 + ' ' + CX + ' ' + 288 +
      'C' + (CX + 20) + ' ' + 288 + ' ' + (CX + 54) + ' ' + 300 + ' ' + (CX + 46) + ' ' + 336 +
      'C' + (CX + 52) + ' ' + 400 + ' ' + (CX + 58) + ' ' + 450 + ' ' + (CX + 62) + ' ' + 520 +
      'L' + (CX - 62) + ' ' + 520 + 'C' + (CX - 58) + ' ' + 450 + ' ' + (CX - 52) + ' ' + 400 + ' ' + (CX - 46) + ' ' + 336 + 'Z',
      'fill="' + g + '" stroke="' + ln + '" stroke-width="1.6"'));
    out.push(P('M' + (CX - 34) + ' ' + 405 + 'L' + (CX + 34) + ' ' + 405 + 'L' + (CX + 34) + ' ' + 448 + 'L' + (CX - 34) + ' ' + 448 + 'Z',
      'fill="none" stroke="' + ln + '" stroke-width="1.6" stroke-dasharray="5 4"'));
    out.push(P('M' + (CX - 108) + ' ' + 462 + 'C' + (CX - 60) + ' ' + 486 + ' ' + (CX + 60) + ' ' + 486 + ' ' + (CX + 108) + ' ' + 462,
      'fill="none" stroke="' + g + '" stroke-width="13" stroke-linecap="round"'));
    return out.join('');
  }

  /** 校服：水手领 + 领结 */
  function sailorCollar(c, o) {
    o = o || {};
    var g = o.grad || '#3d5a94', ln = o.line || '#2b4170', tie = o.tie || '#d8445e';
    var out = [];
    out.push(P('M176 256C180 300 194 336 210 352C226 336 240 300 244 256C232 248 188 248 176 256Z',
      'fill="' + g + '"'));
    out.push(P('M176 256C186 292 198 320 210 334C222 320 234 292 244 256C232 266 188 266 176 256Z',
      'fill="#fdfcfa"'));
    out.push(P('M180 262L' + CX + ' ' + 340 + 'L' + (CX - 26) + ' ' + 300 + 'Z', 'fill="' + g + '" stroke="' + ln + '" stroke-width="1.2"'));
    out.push(P('M240 262L' + CX + ' ' + 340 + 'L' + (CX + 26) + ' ' + 300 + 'Z', 'fill="' + g + '" stroke="' + ln + '" stroke-width="1.2"'));
    out.push(P('M' + CX + ' ' + 336 + 'l-14 -14l4 30z', 'fill="' + tie + '"'));
    out.push(P('M' + CX + ' ' + 336 + 'l14 -14l-4 30z', 'fill="' + tie + '"'));
    out.push(C(CX, 340, 5, 'fill="' + tie + '"'));
    return out.join('');
  }

  /* =========================================================================
   * 7. 配件与道具
   * ========================================================================= */

  /** 眼镜  o: {col, rx, ry, y, style:'rect'|'round'|'thin'} */
  function glasses(c, o) {
    o = o || {};
    var col = o.col || '#5b5b68', sw = o.style === 'thin' ? 2 : (o.style === 'gold' ? 3 : 3.4);
    var w = o.rx == null ? 34 : o.rx, h = o.ry == null ? 28 : o.ry;
    var y = o.y == null ? 168 : o.y;
    var r = o.style === 'rect' ? 9 : (o.style === 'round' ? 26 : 11);
    var g = c.lin([[0, '#ffffff', 0.4], [0.4, '#cfe0f5', 0.22], [1, '#ffffff', 0.3]],
      CX - 80, y - h, CX + 80, y + h);
    var out = [];
    out.push(P(rrect(CX - 44 - w, y - h, w * 2, h * 2, r), 'fill="' + g + '" stroke="' + col + '" stroke-width="' + sw + '" stroke-opacity="0.95"'));
    out.push(P(rrect(CX + 44 - w, y - h, w * 2, h * 2, r), 'fill="' + g + '" stroke="' + col + '" stroke-width="' + sw + '" stroke-opacity="0.95"'));
    out.push(P('M' + (CX - 10) + ' ' + (y - 6) + 'Q' + CX + ' ' + (y - 14) + ' ' + (CX + 10) + ' ' + (y - 6),
      'fill="none" stroke="' + col + '" stroke-width="' + (sw - 0.4) + '"'));
    out.push(P('M' + (CX - 44 - w - 2) + ' ' + (y - 8) + 'L' + (CX - 84) + ' ' + (y - 14) + 'L' + (CX - 92) + ' ' + (y - 6),
      'fill="none" stroke="' + col + '" stroke-width="' + (sw - 0.6) + '"'));
    out.push(P('M' + (CX + 44 + w + 2) + ' ' + (y - 8) + 'L' + (CX + 84) + ' ' + (y - 14) + 'L' + (CX + 92) + ' ' + (y - 6),
      'fill="none" stroke="' + col + '" stroke-width="' + (sw - 0.6) + '"'));
    out.push(P('M' + (CX - 44 - w + 8) + ' ' + (y + h - 8) + 'L' + (CX - 26) + ' ' + (y - h + 8),
      'fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="6" stroke-linecap="round"'));
    out.push(P('M' + (CX + 44 - w + 8) + ' ' + (y + h - 8) + 'L' + (CX + 26) + ' ' + (y - h + 8),
      'fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="6" stroke-linecap="round"'));
    return G(out, 'class="spr-glasses"');
  }

  /** 樱花（五瓣，带缺口花瓣 + 粉心） */
  function sakura(c, x, y, r, petal, center, line) {
    var out = [], i, a;
    var d = 'M' + r1(x) + ' ' + r1(y - r * 0.12) +
      'C' + r1(x - r * 0.64) + ' ' + r1(y - r * 0.4) + ' ' + r1(x - r * 0.58) + ' ' + r1(y - r * 0.94) + ' ' + r1(x - r * 0.2) + ' ' + r1(y - r * 0.97) +
      'C' + r1(x - r * 0.12) + ' ' + r1(y - r * 0.78) + ' ' + r1(x + r * 0.12) + ' ' + r1(y - r * 0.78) + ' ' + r1(x + r * 0.2) + ' ' + r1(y - r * 0.97) +
      'C' + r1(x + r * 0.58) + ' ' + r1(y - r * 0.94) + ' ' + r1(x + r * 0.64) + ' ' + r1(y - r * 0.4) + ' ' + r1(x) + ' ' + r1(y - r * 0.12) + 'Z';
    for (i = 0; i < 5; i++) {
      a = -90 + i * 72;
      out.push(P(d, 'fill="' + petal + '" stroke="' + (line || '#e6b9c8') + '" stroke-width="0.9" stroke-opacity="0.8" transform="rotate(' + a + ' ' + r1(x) + ' ' + r1(y) + ')"'));
    }
    out.push(C(x, y, r * 0.26, 'fill="' + center + '"'));
    for (i = 0; i < 5; i++) {
      a = (i * 72 + 18) * Math.PI / 180;
      out.push(C(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, r * 0.09, 'fill="' + (line || '#e6b9c8') + '"'));
    }
    return out.join('');
  }

  /** 手持的粉樱花小枝 */
  function flowerSprig(c, x, y) {
    var out = [];
    out.push(P('M' + r1(x) + ' ' + r1(y) + 'C' + r1(x - 4) + ' ' + r1(y - 50) + ' ' + r1(x + 8) + ' ' + r1(y - 96) + ' ' + r1(x + 4) + ' ' + r1(y - 148),
      'fill="none" stroke="#6f9a5a" stroke-width="5" stroke-linecap="round"'));
    out.push(P('M' + r1(x + 2) + ' ' + r1(y - 78) + 'C' + r1(x + 20) + ' ' + r1(y - 92) + ' ' + r1(x + 34) + ' ' + r1(y - 104) + ' ' + r1(x + 40) + ' ' + r1(y - 118),
      'fill="none" stroke="#6f9a5a" stroke-width="4" stroke-linecap="round"'));
    out.push(P('M' + r1(x - 1) + ' ' + r1(y - 116) + 'C' + r1(x - 18) + ' ' + r1(y - 124) + ' ' + r1(x - 28) + ' ' + r1(y - 134) + ' ' + r1(x - 32) + ' ' + r1(y - 146),
      'fill="none" stroke="#6f9a5a" stroke-width="3.4" stroke-linecap="round"'));
    out.push(P('M' + r1(x + 20) + ' ' + r1(y - 92) + 'C' + r1(x + 34) + ' ' + r1(y - 86) + ' ' + r1(x + 44) + ' ' + r1(y - 92) + ' ' + r1(x + 40) + ' ' + r1(y - 104) + 'Z',
      'fill="#7fae66"'));
    out.push(P('M' + r1(x - 16) + ' ' + r1(y - 124) + 'C' + r1(x - 30) + ' ' + r1(y - 118) + ' ' + r1(x - 40) + ' ' + r1(y - 126) + ' ' + r1(x - 34) + ' ' + r1(y - 138) + 'Z',
      'fill="#8cbb70"'));
    out.push(sakura(c, x + 6, y - 160, 17, '#f7c2d4', '#f0a0ba', '#e092ac'));
    out.push(sakura(c, x + 42, y - 126, 12.5, '#f9d0de', '#f0a0ba', '#e092ac'));
    out.push(sakura(c, x - 32, y - 152, 10.5, '#f7c2d4', '#f0a0ba', '#e092ac'));
    return G(out, 'class="spr-prop"');
  }

  /** 咖啡纸杯 */
  function coffeeCup(c, x, y) {
    var out = [], i;
    var g = c.lin([[0, '#f6f2ec'], [0.5, '#e6ded2'], [1, '#d2c6b6']], x - 22, y, x + 22, y);
    out.push(P('M' + r1(x - 24) + ' ' + r1(y) + 'L' + r1(x - 17) + ' ' + r1(y + 76) +
      'C' + r1(x - 16) + ' ' + r1(y + 84) + ' ' + r1(x + 16) + ' ' + r1(y + 84) + ' ' + r1(x + 17) + ' ' + r1(y + 76) +
      'L' + r1(x + 24) + ' ' + r1(y) + 'Z', 'fill="' + g + '"'));
    out.push(P('M' + r1(x - 26) + ' ' + r1(y - 12) + 'L' + r1(x + 26) + ' ' + r1(y - 12) + 'L' + r1(x + 24) + ' ' + r1(y + 2) + 'L' + r1(x - 24) + ' ' + r1(y + 2) + 'Z',
      'fill="#8a7f72"'));
    out.push(P('M' + r1(x - 28) + ' ' + r1(y - 20) + 'C' + r1(x - 28) + ' ' + r1(y - 28) + ' ' + r1(x + 28) + ' ' + r1(y - 28) + ' ' + r1(x + 28) + ' ' + r1(y - 20) +
      'L' + r1(x + 26) + ' ' + r1(y - 10) + 'L' + r1(x - 26) + ' ' + r1(y - 10) + 'Z', 'fill="#a89c8d"'));
    out.push(P('M' + r1(x - 22) + ' ' + r1(y + 22) + 'L' + r1(x + 22) + ' ' + r1(y + 22) + 'L' + r1(x + 20) + ' ' + r1(y + 56) + 'L' + r1(x - 20) + ' ' + r1(y + 56) + 'Z',
      'fill="#c98a5a"'));
    out.push(P('M' + r1(x - 20) + ' ' + r1(y + 26) + 'L' + r1(x + 20) + ' ' + r1(y + 26), 'fill="none" stroke="#00000018" stroke-width="3"'));
    out.push(P('M' + r1(x - 14) + ' ' + r1(y + 4) + 'C' + r1(x - 12) + ' ' + r1(y + 24) + ' ' + r1(x - 10) + ' ' + r1(y + 40) + ' ' + r1(x - 9) + ' ' + r1(y + 52),
      'fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="4" stroke-linecap="round"'));
    for (i = 0; i < 3; i++) {
      out.push(P('M' + r1(x - 12 + i * 12) + ' ' + r1(y - 34) + 'c-8 -8 6 -14 -1 -22', 'fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round"'));
    }
    return G(out, 'class="spr-prop"');
  }

  /** 书本 / 文件夹 */
  function bookProp(c, x, y, col) {
    return G([
      P('M' + r1(x - 34) + ' ' + r1(y) + 'L' + r1(x + 34) + ' ' + r1(y - 8) + 'L' + r1(x + 34) + ' ' + r1(y + 40) + 'L' + r1(x - 34) + ' ' + r1(y + 48) + 'Z', 'fill="' + (col || '#5a6ea8') + '"'),
      P('M' + r1(x - 34) + ' ' + r1(y) + 'L' + r1(x - 30) + ' ' + r1(y + 6) + 'L' + r1(x - 30) + ' ' + r1(y + 54) + 'L' + r1(x - 34) + ' ' + r1(y + 48) + 'Z', 'fill="#f4f0e6"'),
      P('M' + r1(x - 22) + ' ' + r1(y + 6) + 'L' + r1(x + 22) + ' ' + r1(y), 'fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3"')
    ], 'class="spr-prop"');
  }

  /* =========================================================================
   * 8. 角色定义
   * -------------------------------------------------------------------------
   * spec 字段：
   *   name    中文名        group 分组        color 代表色
   *   hair    {pal, style, bangs, twinFall, tie}
   *           pal   = {hi, mid, lo, tip, dark, line}
   *           style = 'long' | 'mid' | 'short' | 'wavy' | 'buzz' | 'ponytail' | 'bun'
   *           bangs = 'blunt' | 'sweep' | 'split' | 'short' | 'buzz' | 'messy' | 'sidePart'
   *   outfit  'pinafore' | 'blazer' | 'shirt' | 'hoodie' | 'sailor' | 'cardigan' | 'apron' | 'tank' | 'dress'
   *   arms    'chest' | 'down'
   *   eyes    {iris1, iris2, col}            虹膜配色
   *   face    {jw, rx, ry, ch}               脸型微调（男性更方）
   *   glasses {col, style}                   可选
   *   props   ['sakuraPin'|'flowerSprig'|'coffee'|'book']  可选
   *   emotions 允许的表情（缺省为 EMOTIONS 全部，缺失的自动回退到 normal）
   * ========================================================================= */

  var SK = SKIN, SKD = SKIN_SH;

  var CHARS = {

    /* ---------- 女主角 ---------- */
    suxiaonuan: {
      name: '苏小暖', group: 'heroine', color: '#8b8ce0',
      hair: {
        pal: { hi: '#8f9cec', mid: '#6f7fd8', lo: '#9d8ce0', tip: '#c0a8e8', dark: '#463a84', line: '#5a4fa0' },
        style: 'long', bangs: 'blunt', twinFall: true
      },
      outfit: 'pinafore',
      arms: 'chest',
      eyes: { iris1: '#8b6fc4', iris2: '#cbaaec', col: '#5f4a9c' },
      face: { jw: 0.62, rx: 78, ry: 92, ch: 1 },
      props: ['sakuraPin', 'flowerSprig']
    },

    /* ----------/ 教师 ---------- */
    hanpeng: {
      name: '韩鹏', group: 'teacher', color: '#4a6fa5',
      hair: { pal: { hi: '#4a4a58', mid: '#2e2e3a', lo: '#1e1e28', tip: '#141420', dark: '#101018', line: '#0c0c14' }, style: 'short', bangs: 'short' },
      outfit: 'blazer', outfitCol: '#5c6b7d', arms: 'down',
      eyes: { iris1: '#5a6a8a', iris2: '#8fa4c4', col: '#3a4460' },
      face: { jw: 0.72, rx: 80, ry: 92, ch: 1.04 },
      glasses: { col: '#4a4a55', style: 'rect' },
    },
    tania: {
      name: 'Tania', group: 'teacher', color: '#c98a5a',
      hair: { pal: { hi: '#c9a274', mid: '#a87c4e', lo: '#8a6038', tip: '#6e4a28', dark: '#5c3c1e', line: '#4a2e14' }, style: 'wavy', bangs: 'sweep' },
      outfit: 'cardigan', outfitCol: '#f2e6d2', arms: 'down',
      eyes: { iris1: '#4a8fc4', iris2: '#8fc8ec', col: '#2e6a9c' },
      face: { jw: 0.66, rx: 76, ry: 90, ch: 0.98 },
      props: ['coffee']
    },
    shijianming: {
      name: '史鉴明', group: 'teacher', color: '#6b5f50',
      hair: { pal: { hi: '#b8b4ae', mid: '#8e8a84', lo: '#6a6660', tip: '#524e48', dark: '#3e3a34', line: '#2e2a24' }, style: 'short', bangs: 'sidePart' },
      outfit: 'blazer', outfitCol: '#3e4650', arms: 'down',
      eyes: { iris1: '#6a5a4a', iris2: '#9c8a74', col: '#4a3e30' },
      face: { jw: 0.76, rx: 80, ry: 91, ch: 1.06 },
      glasses: { col: '#8a7a5a', style: 'round' },
    },
    zhourui: {
      name: '周蕊', group: 'teacher', color: '#7d7a9c',
      hair: { pal: { hi: '#3e3a4c', mid: '#2a2634', lo: '#1c1a26', tip: '#14121c', dark: '#0e0c16', line: '#0a0812' }, style: 'bun', bangs: 'split' },
      outfit: 'cardigan', outfitCol: '#9a9aa8', arms: 'down',
      eyes: { iris1: '#5a5a7a', iris2: '#9494b4', col: '#3c3c58' },
      face: { jw: 0.64, rx: 76, ry: 90, ch: 1 },
      glasses: { col: '#6a6a72', style: 'thin' },
    },
    hanjie: {
      name: '韩杰', group: 'teacher', color: '#3e5a86',
      hair: { pal: { hi: '#3a3644', mid: '#26222e', lo: '#181620', tip: '#100e18', dark: '#0c0a12', line: '#08060e' }, style: 'short', bangs: 'sidePart' },
      outfit: 'blazer', outfitCol: '#2e4a72', arms: 'down',
      eyes: { iris1: '#4a5a7a', iris2: '#8296b8', col: '#32405a' },
      face: { jw: 0.74, rx: 79, ry: 92, ch: 1.02 },
      glasses: { col: '#c9a96e', style: 'gold' },
    },
    cherry: {
      name: 'Cherry', group: 'teacher', color: '#c4544e',
      hair: { pal: { hi: '#a86a3e', mid: '#82492a', lo: '#63351c', tip: '#4a2812', dark: '#3e2010', line: '#2e1808' }, style: 'long', bangs: 'sweep' },
      outfit: 'cardigan', outfitCol: '#c4544e', arms: 'down',
      eyes: { iris1: '#7a5a3a', iris2: '#b8905c', col: '#5a4028' },
      face: { jw: 0.64, rx: 76, ry: 90, ch: 0.98 }
    },
    liguorui: {
      name: '李国瑞', group: 'teacher', color: '#5a7a6a',
      hair: { pal: { hi: '#3e3a44', mid: '#2a2630', lo: '#1a1822', tip: '#12101a', dark: '#0e0c14', line: '#0a080e' }, style: 'short', bangs: 'messy' },
      outfit: 'hoodie', outfitCol: '#5a7a6a', arms: 'down',
      eyes: { iris1: '#4a5a4a', iris2: '#829682', col: '#324032' },
      face: { jw: 0.72, rx: 79, ry: 91, ch: 1.02 },
    },
    songjunli: {
      name: '宋俊丽', group: 'teacher', color: '#6a6a86',
      hair: { pal: { hi: '#35313e', mid: '#231f2c', lo: '#17141e', tip: '#100e16', dark: '#0c0a12', line: '#080610' }, style: 'mid', bangs: 'split' },
      outfit: 'blazer', outfitCol: '#4a4a5c', arms: 'down',
      eyes: { iris1: '#5a5a72', iris2: '#9494ac', col: '#3c3c50' },
      face: { jw: 0.66, rx: 77, ry: 90, ch: 1 },
    },
    lixinyao: {
      name: '李心瑶', group: 'teacher', color: '#6a9ec4',
      hair: { pal: { hi: '#3e3a48', mid: '#2a2634', lo: '#1c1a26', tip: '#14121c', dark: '#0e0c16', line: '#0a0812' }, style: 'ponytail', bangs: 'sweep' },
      outfit: 'shirt', outfitCol: '#a8d0e8', arms: 'down',
      eyes: { iris1: '#4a7aa0', iris2: '#8ab8d8', col: '#325a7a' },
      face: { jw: 0.64, rx: 76, ry: 90, ch: 0.98 }
    },

    /* ---------- 室友 ---------- */
    huye: {
      name: '虎爷', group: 'roommate', color: '#8a5a3a',
      hair: { pal: { hi: '#33302c', mid: '#22201c', lo: '#161410', tip: '#100e0c', dark: '#0c0a08', line: '#080606' }, style: 'buzz', bangs: 'buzz' },
      outfit: 'tank', outfitCol: '#2e3440', arms: 'down',
      eyes: { iris1: '#5a4a3a', iris2: '#8a7458', col: '#3e3226' },
      face: { jw: 0.80, rx: 82, ry: 93, ch: 1.06 },
    },
    naikou: {
      name: '奶扣', group: 'roommate', color: '#7a8a9c',
      hair: { pal: { hi: '#3e3c48', mid: '#2a2832', lo: '#1a1822', tip: '#12101a', dark: '#0e0c14', line: '#0a080e' }, style: 'short', bangs: 'messy' },
      outfit: 'hoodie', outfitCol: '#9aa8b8', arms: 'down',
      eyes: { iris1: '#5a5a6a', iris2: '#8e8e9e', col: '#3c3c48' },
      face: { jw: 0.68, rx: 78, ry: 91, ch: 1 },
    },
    jingye: {
      name: '京爷', group: 'roommate', color: '#4a7a5a',
      hair: { pal: { hi: '#3a3642', mid: '#26222e', lo: '#181620', tip: '#100e18', dark: '#0c0a12', line: '#08060e' }, style: 'short', bangs: 'sidePart' },
      outfit: 'blazer', outfitCol: '#3a5a3e', arms: 'down',
      eyes: { iris1: '#4a5a4a', iris2: '#82967e', col: '#32402e' },
      face: { jw: 0.76, rx: 81, ry: 93, ch: 1.05 },
    },

    /* ---------- 家人 ---------- */
    mom: {
      name: '老妈', group: 'family', color: '#a86a6a',
      hair: { pal: { hi: '#6a5a50', mid: '#4e4038', lo: '#382c26', tip: '#28201a', dark: '#201812', line: '#18100c' }, style: 'wavy', bangs: 'sweep', midLen: true },
      outfit: 'apron', outfitCol: '#c48a8a', arms: 'down',
      eyes: { iris1: '#5a4a3a', iris2: '#8a7458', col: '#3e3226' },
      face: { jw: 0.68, rx: 77, ry: 90, ch: 0.98 },
    },

    /* ---------- 通用同学 ---------- */
    classmate_f: {
      name: '女同学', group: 'generic', color: '#a8794a',
      hair: { pal: { hi: '#a4713e', mid: '#82552a', lo: '#633f1c', tip: '#4a2e12', dark: '#3e2410', line: '#2e1a08' }, style: 'ponytail', bangs: 'blunt' },
      outfit: 'sailor', arms: 'down',
      eyes: { iris1: '#6a5a3a', iris2: '#a89058', col: '#4e4028' },
      face: { jw: 0.62, rx: 77, ry: 91, ch: 1 }
    },
    classmate_m: {
      name: '男同学', group: 'generic', color: '#5a6a7a',
      hair: { pal: { hi: '#3a3844', mid: '#26242e', lo: '#181620', tip: '#100e18', dark: '#0c0a12', line: '#08060e' }, style: 'short', bangs: 'short' },
      outfit: 'sailor', arms: 'down',
      eyes: { iris1: '#4a5a6a', iris2: '#82929e', col: '#323e48' },
      face: { jw: 0.74, rx: 79, ry: 92, ch: 1.03 }
    },

    /* ---------- 兜底 ---------- */
    _fallback: {
      name: '路人', group: 'generic', color: '#8a8a96',
      hair: { pal: { hi: '#4a4652', mid: '#332f3c', lo: '#221e2c', tip: '#181420', dark: '#14101c', line: '#0e0a16' }, style: 'short', bangs: 'short' },
      outfit: 'shirt', outfitCol: '#c8ccd4', arms: 'down',
      eyes: { iris1: '#5a5a6a', iris2: '#8e8e9e', col: '#3c3c48' },
      face: { jw: 0.70, rx: 78, ry: 91, ch: 1 }
    }
  };

  /* =========================================================================
   * 9. 服装
   * ========================================================================= */

  /** 根据 outfit 绘制躯干 + 下装 + 领口细节 */
  function buildBody(c, spec, skin, hg) {
    var out = [], i;
    var oc = spec.outfitCol || '#8a94a8';
    /* 上衣主渐变：顶部高光 → 本色 → 底部阴影（三档都必须不透明，
       否则本色会被 stop-opacity 抹掉，整件衣服变成灰黑） */
    var og = c.lin([[0, '#ffffff', 0.38], [0.22, oc], [0.62, oc], [1, '#000000', 0.26]], CX - 110, 250, CX + 110, 700);
    var oLite = c.lin([[0, '#ffffff', 0.32], [1, '#000000', 0.16]], CX - 100, 260, CX + 100, 620);
    var isFem = spec.group === 'heroine' || spec.group === 'teacher' && /tania|zhourui|cherry|songjunli|lixinyao/.test(spec.name) || spec.group === 'family' || spec.group === 'generic' && spec.name === '女同学';

    switch (spec.outfit) {

      /* 白衬衫 + 粉色背带裙 —— 苏小暖 */
      case 'pinafore': {
        out.push('<g class="spr-body">');
        /* 腿 */
        out.push(legs({ skin: skin, y0: 622 }));
        /* 白衬衫上身 */
        var sh = c.lin([[0, '#ffffff'], [0.55, '#fbfaff'], [1, '#e8e6f2']], CX - 90, 250, CX + 90, 520);
        out.push(P(bodiceD({ sx: 92, wx: 66, y0: 262, y1: 312, y2: 474, y3: 520 }), 'fill="' + sh + '"'));
        out.push(P('M178 268C176 320 172 380 170 440L250 440C248 380 244 320 242 268Z', 'fill="#000000" fill-opacity="0.045"'));
        /* 泡泡短袖 */
        out.push(armChest(c, -1, { skin: skin, sleeveGrad: sh }));
        out.push(armChest(c, 1, { skin: skin, sleeveGrad: sh }));
        /* 粉色背带裙 */
        var dg = c.lin([[0, '#fbc7d6'], [0.42, '#f4a8bf'], [0.78, '#ec93ae'], [1, '#dd7d9a']], CX, 300, CX, 700);
        out.push(P(bodiceD({ sx: 78, wx: 62, y0: 336, y1: 388, y2: 474, y3: 500 }), 'fill="' + dg + '"'));
        out.push(P(skirtD({ y0: 474, h0: 62, h1: 176, y1: 646, hem: 'arc' }), 'fill="' + dg + '"'));
        /* 裙摆内层白边 */
        out.push(P(skirtD({ y0: 606, h0: 138, h1: 168, y1: 668, hem: 'arc' }), 'fill="#fdfbff" fill-opacity="0.95"'));
        out.push(P(skirtD({ y0: 646, h0: 176, h1: 176, y1: 646, hem: 'arc' }), 'fill="none" stroke="#d97a96" stroke-width="1.6" stroke-opacity="0.55"'));
        /* 裙子褶皱 */
        for (i = -3; i <= 3; i++) {
          out.push(P('M' + r1(CX + i * 26) + ' 486C' + r1(CX + i * 34) + ' 546 ' + r1(CX + i * 40) + ' 600 ' + r1(CX + i * 44) + ' 646',
            'fill="none" stroke="#c96f8c" stroke-opacity="0.22" stroke-width="2.4" stroke-linecap="round"'));
        }
        /* 背带 + 扣子 */
        out.push(P('M' + (CX - 44) + ' 342L' + (CX - 40) + ' 396', 'fill="none" stroke="#e08ca8" stroke-width="13" stroke-linecap="round"'));
        out.push(P('M' + (CX + 44) + ' 342L' + (CX + 40) + ' 396', 'fill="none" stroke="#e08ca8" stroke-width="13" stroke-linecap="round"'));
        out.push(C(CX - 42, 392, 4.4, 'fill="#fdfbff" stroke="#d97a96" stroke-width="1.2"'));
        out.push(C(CX + 42, 392, 4.4, 'fill="#fdfbff" stroke="#d97a96" stroke-width="1.2"'));
        /* 领子 + 门襟 */
        out.push(collarShirt(c, { grad: '#ffffff', shade: '#e6e4f0', line: '#d2cee0', plackEnd: 420 }));
        /* 胸部阴影 */
        out.push(P('M' + (CX - 62) + ' 400C' + (CX - 40) + ' 418 ' + (CX + 40) + ' 418 ' + (CX + 62) + ' 400C' + (CX + 50) + ' 428 ' + (CX - 50) + ' 428 ' + (CX - 62) + ' 400Z',
          'fill="#000000" fill-opacity="0.06"'));
        out.push('</g>');
        break;
      }

      /* 西装外套 */
      case 'blazer': {
        out.push('<g class="spr-body">');
        if (isFem) { out.push(legs({ skin: skin, y0: 560, w: 58 })); }
        else { out.push(trousers({ grad: c.lin([[0, '#2e3440'], [1, '#1a1e26']], CX, 470, CX, 760), y0: 486 })); }
        out.push(P(bodiceD({ sx: 94, wx: 68, y0: 262, y1: 314, y2: 474, y3: 640 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.86, w1: 48 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.86, w1: 48 }));
        out.push(shirtV(c, { grad: '#fdfcfa', line: '#c6c0d3' }));
        out.push(lapels(c, { grad: oLite, y0: 300 }));
        if (isFem) out.push(P(skirtD({ y0: 470, h0: 68, h1: 118, y1: 606, hem: 'arc' }), 'fill="' + og + '"'));
        out.push('</g>');
        break;
      }

      /* 开衫 / 针织衫 */
      case 'cardigan': {
        out.push('<g class="spr-body">');
        if (isFem) { out.push(legs({ skin: skin, y0: 566, w: 58 })); }
        else { out.push(trousers({ grad: og, y0: 486 })); }
        out.push(P(bodiceD({ sx: 93, wx: 67, y0: 262, y1: 314, y2: 474, y3: 626 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.92, w1: 48 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.92, w1: 48 }));
        out.push(shirtV(c, { grad: '#fbfaf6', line: '#d8d2c4' }));
        /* 针织纹 */
        for (i = -3; i <= 3; i++) {
          out.push(P('M' + (CX + i * 20) + ' 330L' + (CX + i * 22) + ' 474',
            'fill="none" stroke="#000000" stroke-opacity="0.055" stroke-width="3"'));
        }
        out.push(P('M' + CX + ' 314L' + CX + ' 626', 'fill="none" stroke="#000000" stroke-opacity="0.14" stroke-width="2"'));
        if (isFem) out.push(P(skirtD({ y0: 470, h0: 66, h1: 112, y1: 596, hem: 'arc' }), 'fill="#3e4250"'));
        out.push('</g>');
        break;
      }

      /* 衬衫 */
      case 'shirt': {
        out.push('<g class="spr-body">');
        if (isFem) { out.push(legs({ skin: skin, y0: 566, w: 58 })); }
        else { out.push(trousers({ grad: c.lin([[0, '#3a4250'], [1, '#242a34']], CX, 470, CX, 760), y0: 486 })); }
        out.push(P(bodiceD({ sx: 92, wx: 66, y0: 262, y1: 314, y2: 474, y3: 620 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.4, w1: 46 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.4, w1: 46 }));
        out.push(collarShirt(c, { grad: '#fdfcfa', shade: '#e2e0ea', line: '#c6c0d3', plackEnd: 452 }));
        if (isFem) out.push(P(skirtD({ y0: 470, h0: 66, h1: 116, y1: 604, hem: 'n', n: 6 }), 'fill="#3a4250"'));
        out.push('</g>');
        break;
      }

      /* 连帽衫 */
      case 'hoodie': {
        out.push('<g class="spr-body">');
        if (isFem) { out.push(legs({ skin: skin, y0: 570, w: 58 })); }
        else { out.push(trousers({ grad: c.lin([[0, '#40485a'], [1, '#282e3a']], CX, 470, CX, 760), y0: 490 })); }
        out.push(P(bodiceD({ sx: 98, wx: 74, y0: 262, y1: 316, y2: 474, y3: 640 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.94, w1: 52 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.94, w1: 52 }));
        out.push(hoodie(c, { grad: og, shade: '#00000030', cord: '#f2f2f6' }));
        out.push('</g>');
        break;
      }

      /* 校服：水手领 */
      case 'sailor': {
        out.push('<g class="spr-body">');
        if (isFem) { out.push(legs({ skin: skin, y0: 560, w: 58 })); }
        else { out.push(trousers({ grad: c.lin([[0, '#3e4652'], [1, '#262c36']], CX, 470, CX, 760), y0: 486 })); }
        out.push(P(bodiceD({ sx: 93, wx: 67, y0: 262, y1: 314, y2: 474, y3: 618 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.36, w1: 46 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.36, w1: 46 }));
        out.push(sailorCollar(c, { grad: '#3d5a94', line: '#2b4170', tie: '#d8445e' }));
        if (isFem) out.push(P(skirtD({ y0: 470, h0: 66, h1: 128, y1: 600, hem: 'n', n: 8 }), 'fill="#2e4272"'));
        out.push('</g>');
        break;
      }

      /* 围裙（妈妈） */
      case 'apron': {
        out.push('<g class="spr-body">');
        out.push(legs({ skin: skin, y0: 566, w: 60 }));
        out.push(P(bodiceD({ sx: 96, wx: 70, y0: 264, y1: 314, y2: 474, y3: 620 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.34, w1: 50 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.34, w1: 50 }));
        out.push(apron(c, { grad: '#f6efe2', line: '#d8cbb4' }));
        out.push(P(skirtD({ y0: 470, h0: 68, h1: 118, y1: 610, hem: 'arc' }), 'fill="#6a5a52"'));
        out.push('</g>');
        break;
      }

      /* 背心（虎爷） */
      case 'tank': {
        out.push('<g class="spr-body">');
        out.push(trousers({ grad: c.lin([[0, '#3a4250'], [1, '#222832']], CX, 470, CX, 760), y0: 486 }));
        /* 裸露的肩臂 */
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: skin, sleeveLen: 0, cuff: false, w1: 54, w2: 42 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: skin, sleeveLen: 0, cuff: false, w1: 54, w2: 42 }));
        out.push(P(bodiceD({ sx: 96, wx: 72, y0: 268, y1: 316, y2: 474, y3: 500 }), 'fill="' + og + '"'));
        out.push(P('M' + (CX - 62) + ' 300C' + (CX - 40) + ' 330 ' + (CX - 34) + ' 400 ' + (CX - 36) + ' 474L' + (CX + 36) + ' 474C' + (CX + 34) + ' 400 ' + (CX + 40) + ' 330 ' + (CX + 62) + ' 300Z',
          'fill="' + skin + '"'));
        out.push(P('M' + (CX - 60) + ' 298L' + (CX - 36) + ' 474M' + (CX + 60) + ' 298L' + (CX + 36) + ' 474',
          'fill="none" stroke="#000000" stroke-opacity="0.12" stroke-width="2.4"'));
        out.push('</g>');
        break;
      }

      /* 连衣裙 */
      default: {
        out.push('<g class="spr-body">');
        out.push(legs({ skin: skin, y0: 570, w: 58 }));
        out.push(P(bodiceD({ sx: 90, wx: 62, y0: 262, y1: 312, y2: 474, y3: 500 }), 'fill="' + og + '"'));
        out.push(armDown(c, -1, { skin: skin, sleeveGrad: og, sleeveLen: 0.34, w1: 46 }));
        out.push(armDown(c, 1, { skin: skin, sleeveGrad: og, sleeveLen: 0.34, w1: 46 }));
        out.push(P(skirtD({ y0: 470, h0: 62, h1: 148, y1: 636, hem: 'arc' }), 'fill="' + og + '"'));
        out.push('</g>');
        break;
      }
    }
    return out.join('');
  }

  /* =========================================================================
   * 10. 头发
   * ========================================================================= */

  function buildHair(c, spec, emo) {
    var pal = spec.hair.pal;
    var hg = hairGrad(c, pal, 10, 750);
    var hs = hairGrad(c, pal, 10, 420);
    var H = { back: '', front: '' };
    var style = spec.hair.style;
    var bangs = spec.hair.bangs;
    var out = [];

    /* ---- 后发 ---- */
    if (style === 'long') {
      /* 后发收窄，让两侧垂落的粗发束（双马尾式）形成清晰剪影，
         而不是糊成一整块宽发帘 */
      out.push(backMassLong(c, pal, { grad: hg, wy: spec.hair.twinFall ? 74 : 104, yEnd: 700 }));
      if (spec.hair.twinFall) {
        out.push(fallLong(c, pal, -1, { grad: hg, yTop: 126, yTip: 730 }));
        out.push(fallLong(c, pal, 1, { grad: hg, yTop: 126, yTip: 730 }));
      }
    } else if (style === 'mid') {
      out.push(backMassMid(c, pal, { grad: hg, wy: 96, yEnd: 470 }));
    } else if (style === 'wavy') {
      out.push(backMassWavy(c, pal, { grad: hg, wy: 100, yEnd: spec.hair.midLen ? 400 : 470 }));
    } else if (style === 'ponytail') {
      out.push(backMassShort(c, pal, { grad: hs }));
      out.push(ponytail(c, pal, { grad: hg, s: 1, y: 96 }));
    } else if (style === 'bun') {
      out.push(backMassShort(c, pal, { grad: hs }));
      out.push(bunHair(c, pal, { grad: hs, x: CX + 60, y: 196 }));
    } else { /* short / buzz */
      out.push(backMassShort(c, pal, { grad: hs }));
    }
    H.back = G(out, 'class="spr-hair"');

    /* ---- 前发 ---- */
    var f = [];
    if (bangs === 'blunt' || bangs === 'sweep' || bangs === 'split') {
      f = f.concat(bangsFem(c, pal, { grad: hs, style: bangs }));
    } else {
      f = f.concat(bangsMale(c, pal, { grad: hs, style: bangs }));
    }
    /* 鬓发（贴脸两缕），长发与中长发角色才有 */
    if (style === 'long' || style === 'mid' || style === 'wavy') {
      f.push(sideLock(c, pal, -1, { grad: hs, yBot: 560, yTop: 96 }));
      f.push(sideLock(c, pal, 1, { grad: hs, yBot: 560, yTop: 96 }));
    }
    /* 头顶高光 */
    f.push(shine(c, { op: 0.5, y: 62, x: CX }));
    f.push(shine(c, { op: 0.3, y: 96, x: CX - 44, sc: 0.7 }));
    H.front = G(f, 'class="spr-hair-front"');
    return H;
  }

  /* =========================================================================
   * 11. 配件
   * ========================================================================= */

  function buildProps(c, spec, emo) {
    var out = [];
    var props = spec.props || [];
    var i;
    for (i = 0; i < props.length; i++) {
      switch (props[i]) {
        /* 白色五瓣樱花发饰（画面左侧刘海） */
        case 'sakuraPin':
          out.push(G([
            sakura(c, CX - 56, 76, 21, '#fdfcfa', '#f6bccf', '#e4d3dd'),
            sakura(c, CX - 84, 96, 14, '#fdfcfa', '#f6bccf', '#e4d3dd'),
            C(CX - 56, 76, 4.6, 'fill="#f3a8c2"')
          ], 'class="spr-orn"'));
          break;
        /* 胸前手持的粉樱花小枝 */
        case 'flowerSprig':
          out.push(flowerSprig(c, CX + 26, 500));
          break;
        /* 咖啡纸杯 */
        case 'coffee':
          out.push(coffeeCup(c, CX + 96, 486));
          break;
        /* 书本 */
        case 'book':
          out.push(bookProp(c, CX + 96, 496, '#5a6ea8'));
          break;
      }
    }
    /* 眼镜（最后画，压在脸上） */
    if (spec.glasses) out.push(glasses(c, spec.glasses));
    return out.join('');
  }

  /* =========================================================================
   * 12. 组装
   * ========================================================================= */

  var CACHE = {};

  function render(id, emo) {
    var key = id + '|' + emo;
    if (CACHE[key]) return CACHE[key];

    var spec = CHARS[id] || CHARS._fallback;
    if (spec.emotions && spec.emotions.indexOf(emo) < 0) emo = spec.emotions[0];
    if (!EXPR[emo]) emo = 'normal';

    var sp = EXPR[emo];
    var c = new Ctx(id, emo);

    var fm = spec.face || {};
    var skin = SKIN;

    /* --- 先构建（顺带收集渐变定义） --- */
    var hair = buildHair(c, spec, emo);                       // 后发在上、前发在下
    var body = buildBody(c, spec, skin, hair);                // 躯干 / 服装
    var faceMarkup = P(headPath({ cy: 156, rx: fm.rx == null ? 78 : fm.rx, ry: fm.ry == null ? 92 : fm.ry, jw: fm.jw == null ? 0.62 : fm.jw, ch: fm.ch == null ? 1 : fm.ch }),
      'fill="' + skin + '"') +
      ears({ skin: skin }) +
      faceShade({ brow: false }) +
      face(c, sp, { eyes: { iris1: spec.eyes.iris1, iris2: spec.eyes.iris2, col: spec.eyes.col } });
    var props = buildProps(c, spec, emo);

    /* --- 合成（顺序：后发 → 身体 → 颈 → 头 → 前发 → 配件） --- */
    var svg = '<defs>' + c.defs.join('') + '</defs>' +
      hair.back +
      body +
      neckPath({ grad: skin }) +
      '<g class="spr-head">' + faceMarkup + '</g>' +
      hair.front +
      props;

    var html = '<svg class="vn-sprite-svg" viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">' +
      svg + '</svg>';

    CACHE[key] = html;
    return html;
  }

  /* =========================================================================
   * 13. 对外接口
   * ========================================================================= */

  var IDS = [];
  (function () {
    for (var k in CHARS) {
      if (CHARS.hasOwnProperty(k) && k.charAt(0) !== '_') IDS.push(k);
    }
  })();

  function get(id, emotion) {
    if (!CHARS[id]) id = '_fallback';
    return render(id, emotion || 'normal');
  }

  return {
    get: get,
    has: function (id) { return !!CHARS[id] && id.charAt(0) !== '_'; },
    IDS: IDS,
    EMOTIONS: EMOTIONS.slice(0),
    meta: function (id) {
      var s = CHARS[id] || CHARS._fallback;
      return { name: s.name, color: s.color, group: s.group };
    }
  };
})();

/* ---------------------------------------------------------------------------
   角色清单（id → 中文名 / 分组 / 可用表情）
     suxiaonuan   苏小暖   heroine  全 7 种表情
     hanpeng      韩鹏     teacher  normal, smile
     tania        Tania    teacher  全 7 种
     shijianming  史鉴明   teacher  normal, smile
     zhourui      周蕊     teacher  normal, smile
     hanjie       韩杰     teacher  normal, smile
     cherry       Cherry   teacher  全 7 种
     liguorui     李国瑞   teacher  normal, happy
     songjunli    宋俊丽   teacher  normal, smile
     lixinyao     李心瑶   teacher  全 7 种
     huye         虎爷     roommate normal, happy
     naikou       奶扣     roommate normal, happy
     jingye       京爷     roommate normal, happy
     mom          老妈     family   normal, smile
     classmate_f  女同学   generic  全 7 种
     classmate_m  男同学   generic  全 7 种
   --------------------------------------------------------------------------- */
