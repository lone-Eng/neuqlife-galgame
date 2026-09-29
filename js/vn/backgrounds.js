/* ============================================================================
 * 《东秦校园人生》 —— VN 场景背景库（纯数据 SVG）
 *
 * 全局对象：BGS
 *   BGS.get(key)  -> SVG 字符串（未知 key 返回 black 背景）
 *   BGS.has(key)  -> 布尔
 *   BGS.KEYS      -> 全部 key 数组（按声明顺序）
 *   BGS.meta(key) -> { name: '中文短名', night: true|false }
 *
 * 每个背景都是 1280x720（16:9）的整屏不透明图层，位于立绘与对话框之下：
 *   · 细节集中在画面上方 2/3，下方约 1/3 相对安静、偏暗，保证文字可读
 *   · 底部统一叠加一层黑色线性渐变（bottom vignette）压暗
 *   · 所有 gradient / clipPath 的 id 形如 bg_<key>_<n>，同一文档内绝不重复
 *   · 无任何外部资源（不使用 <image>、不引用 URL）
 * ========================================================================== */
var BGS = (function () {
  'use strict';

  var W = 1280, H = 720;
  var DEF = {};    /* key -> { name, night, make, vig } */
  var ORDER = [];  /* 声明顺序 */
  var CACHE = {};  /* key -> 已生成的完整 SVG 字符串 */

  /* key, 中文短名, 是否夜间, 生成函数, 底部压暗强度(0 = 不叠加) */
  function def(key, name, night, make, vig) {
    DEF[key] = { name: name, night: !!night, make: make, vig: (vig === undefined ? 0.55 : vig) };
    ORDER.push(key);
  }

  /* ------------------------------------------------------------- 基础工具 */
  function r(v) { return Math.round(v * 100) / 100; }

  function stops(list) {
    var out = '', i, s;
    for (i = 0; i < list.length; i++) {
      s = list[i];
      out += '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' +
        (s.length > 2 ? ' stop-opacity="' + s[2] + '"' : '') + '/>';
    }
    return out;
  }
  function lgGrad(gid, x1, y1, x2, y2, list) {
    return '<linearGradient id="' + gid + '" gradientUnits="userSpaceOnUse" x1="' + x1 +
      '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops(list) + '</linearGradient>';
  }
  function rgGrad(gid, cx, cy, rad, list) {
    return '<radialGradient id="' + gid + '" gradientUnits="userSpaceOnUse" cx="' + cx +
      '" cy="' + cy + '" r="' + rad + '">' + stops(list) + '</radialGradient>';
  }
  function defs(inner) { return '<defs>' + inner + '</defs>'; }

  function rect(x, y, w, h, fill, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function path(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function circ(cx, cy, rad, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rad + '" fill="' + fill + '"' +
      (extra ? ' ' + extra : '') + '/>';
  }
  function ell(cx, cy, rx, ry, fill, extra) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function poly(pts, fill, extra) {
    return '<polygon points="' + pts + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function line(x1, y1, x2, y2, stroke, sw, extra) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + stroke + '" stroke-width="' + sw + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function strokePath(d, stroke, sw, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + sw +
      '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function txt(x, y, str, fill, size, extra) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + fill +
      '" font-family="Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"' +
      (extra ? ' ' + extra : '') + '>' + str + '</text>';
  }

  /* 比例云：以 (x, y) 为左下基准点，sc 为缩放 */
  function cloud(x, y, sc, fill, op) {
    var d = 'M' + x + ' ' + y +
      ' q' + r(46 * sc) + ' ' + r(-30 * sc) + ' ' + r(58 * sc) + ' ' + r(-36 * sc) +
      ' q' + r(52 * sc) + ' ' + r(-26 * sc) + ' ' + r(52 * sc) + ' ' + r(4 * sc) +
      ' q' + r(30 * sc) + ' ' + r(-16 * sc) + ' ' + r(54 * sc) + ' ' + r(8 * sc) +
      ' q' + r(20 * sc) + ' ' + r(14 * sc) + ' ' + r(4 * sc) + ' ' + r(20 * sc) +
      ' v' + r(30 * sc) + ' h' + r(-168 * sc) + ' Z';
    return path(d, fill, op === undefined ? '' : 'opacity="' + op + '"');
  }

  /* 一棵树：树冠 + 树干，(x, y) 为树根 */
  function tree(x, y, sc, trunk, leaf, op) {
    var g = (op === undefined ? '' : 'opacity="' + op + '"');
    var out = strokePath('M' + x + ' ' + y + ' q' + r(7 * sc) + ' ' + r(-52 * sc) + ' ' +
      r(2 * sc) + ' ' + r(-92 * sc), trunk, r(13 * sc), 'stroke-linecap="round"');
    out += ell(r(x - 40 * sc), r(y - 96 * sc), r(54 * sc), r(40 * sc), leaf, g);
    out += ell(r(x + 40 * sc), r(y - 102 * sc), r(50 * sc), r(38 * sc), leaf, g);
    out += ell(r(x + 2 * sc), r(y - 142 * sc), r(62 * sc), r(48 * sc), leaf, g);
    return out;
  }

  /* 顶部为半圆拱的路径（哥特/图书馆高窗） */
  function archPath(x, y, w, h) {
    var rad = r(w / 2);
    return 'M' + x + ' ' + (y + h) + ' L' + x + ' ' + r(y + rad) +
      ' q0 ' + (-rad) + ' ' + rad + ' ' + (-rad) +
      ' q' + rad + ' 0 ' + rad + ' ' + rad +
      ' L' + r(x + w) + ' ' + r(y + h) + ' Z';
  }

  /* 确定性伪随机（保证每次加载画面一致） */
  function prng(seed) {
    var s = (seed | 0) || 987654321;
    return function () {
      s ^= s << 13; s |= 0;
      s ^= s >>> 17;
      s ^= s << 5; s |= 0;
      return (s >>> 0) % 100000 / 100000;
    };
  }

  /* 星空：n 颗星，分布在 [x0,y0]-[x1,y1] 内 */
  function starField(n, x0, y0, x1, y1, seed, fill, maxR, maxOp) {
    var rnd = prng(seed), out = '', i, x, y, rr, op;
    for (i = 0; i < n; i++) {
      x = r(x0 + rnd() * (x1 - x0));
      y = r(y0 + rnd() * (y1 - y0));
      rr = r(0.8 + rnd() * (maxR - 0.8));
      op = r(0.35 + rnd() * (maxOp - 0.35));
      out += circ(x, y, rr, fill, 'opacity="' + op + '"');
    }
    return out;
  }

  /* ------------------------------------------------------- 1. 纯黑 / 纯白 */
  def('black', '黑场', false, function () {
    return rect(0, 0, W, H, '#000000');
  }, 0);

  def('white', '白场', false, function () {
    return rect(0, 0, W, H, '#ffffff');
  }, 0);

  /* ----------------------------------------------------------- 3. 校门·晨 */
  def('campus_gate', '校门·晨', false, function (nm) {
    var sky = nm(), ground = nm(), road = nm(), sun = nm(), haze = nm(),
      pillar = nm(), beam = nm(), banner = nm(), booth = nm(), glow = nm();
    var s = defs(
      lgGrad(sky, 0, 0, 0, 400, [[0, '#3d95dd'], [0.48, '#8fcbf4'], [1, '#e8f5fe']]) +
      lgGrad(haze, 0, 250, 0, 400, [[0, '#e8f5fe', 0], [1, '#e8f5fe', 0.92]]) +
      rgGrad(sun, 1010, 118, 300, [[0, '#fffbdd', 0.95], [0.35, '#ffefa8', 0.42], [1, '#ffefa8', 0]]) +
      lgGrad(ground, 0, 400, 0, 720, [[0, '#9fae85'], [0.4, '#77855f'], [1, '#39412f']]) +
      lgGrad(road, 0, 470, 0, 720, [[0, '#8d8f86'], [0.45, '#63665e'], [1, '#33362f']]) +
      lgGrad(pillar, 200, 0, 300, 0, [[0, '#bb8a5c'], [0.45, '#d8a877'], [1, '#a2703f']]) +
      lgGrad(beam, 0, 96, 0, 200, [[0, '#f2ece0'], [0.55, '#cfc6b6'], [1, '#a89e8c']]) +
      lgGrad(banner, 0, 210, 0, 320, [[0, '#d63b2f'], [0.5, '#bd2117'], [1, '#8f150f']]) +
      lgGrad(booth, 0, 400, 0, 520, [[0, '#e3e9ec'], [1, '#93a0a8']]) +
      rgGrad(glow, 0, 0, 90, [[0, '#fff6cf', 0.9], [1, '#fff6cf', 0]])
    );
    /* 天空 / 朝阳 / 云 */
    s += rect(0, 0, W, 400, 'url(#' + sky + ')');
    s += circ(1010, 118, 300, 'url(#' + sun + ')');
    s += circ(1010, 118, 58, '#fffdf0', 'opacity="0.96"');
    s += cloud(90, 210, 1.15, '#ffffff', 0.88);
    s += cloud(420, 140, 0.8, '#ffffff', 0.7);
    s += cloud(690, 232, 1.0, '#ffffff', 0.8);
    s += cloud(1010, 300, 0.66, '#ffffff', 0.55);
    /* 远处树线 / 教学楼剪影 */
    s += rect(760, 300, 130, 100, '#b9c7c2', 'opacity="0.6"');
    s += rect(905, 272, 90, 128, '#adbcb8', 'opacity="0.55"');
    s += path('M0 372 q110 -46 236 -26 q104 -38 214 -6 q136 -32 282 -2 q156 -28 292 6 q86 18 256 4 L1280 400 L0 400 Z', '#8fb27a', 'opacity="0.6"');
    s += path('M0 386 q150 -28 306 -10 q146 -20 320 -2 q174 -16 322 8 q126 12 332 2 L1280 400 L0 400 Z', '#6d9a60', 'opacity="0.55"');
    s += rect(0, 250, W, 150, 'url(#' + haze + ')');
    /* 地面 */
    s += rect(0, 398, W, 322, 'url(#' + ground + ')');
    /* 校门：门柱 */
    s += rect(196, 168, 104, 348, 'url(#' + pillar + ')');
    s += rect(186, 148, 124, 30, '#e6ded0');
    s += rect(186, 500, 124, 24, '#c6b9a4');
    s += rect(1076 - 96, 168, 104, 348, 'url(#' + pillar + ')');
    s += rect(1076 - 106, 148, 124, 30, '#e6ded0');
    s += rect(1076 - 106, 500, 124, 24, '#c6b9a4');
    /* 横梁与校名牌 */
    s += rect(170, 96, 940, 96, 'url(#' + beam + ')');
    s += rect(170, 186, 940, 12, '#8f8676');
    s += rect(456, 112, 364, 62, '#8c1f18');
    s += rect(462, 118, 352, 50, '#a82a1f');
    s += txt(640, 155, '东北大学秦皇岛分校', '#ffe9a8', 30, 'text-anchor="middle" letter-spacing="3" font-weight="bold"');
    /* 红底迎新横幅 */
    s += rect(268, 214, 744, 92, 'url(#' + banner + ')');
    s += rect(268, 214, 744, 9, '#ef6a5c');
    s += rect(268, 297, 744, 9, '#7c110c');
    s += txt(640, 276, '热烈欢迎新同学', '#fff3c4', 46, 'text-anchor="middle" letter-spacing="10" font-weight="bold"');
    s += strokePath('M268 214 L196 186', '#8f8676', 3);
    s += strokePath('M1012 214 L1084 186', '#8f8676', 3);
    /* 两侧铁栅栏 */
    s += rect(0, 404, 196, 12, '#cdd6d2');
    s += rect(0, 466, 196, 10, '#b7c1bd');
    s += rect(1064, 404, 216, 12, '#cdd6d2');
    s += rect(1064, 466, 216, 10, '#b7c1bd');
    var i, bx;
    for (i = 0; i < 7; i++) {
      bx = 14 + i * 26;
      s += rect(bx, 392, 7, 96, '#9fadaa', 'opacity="0.85"');
      s += rect(1078 + i * 28, 392, 7, 96, '#9fadaa', 'opacity="0.85"');
    }
    /* 道路与中线 */
    s += poly('472,470 800,470 1112,720 168,720', 'url(#' + road + ')');
    s += poly('472,470 800,470 796,486 476,486', '#b9bcb2', 'opacity="0.5"');
    s += rect(632, 496, 26, 26, '#e8e6d8', 'opacity="0.75"');
    s += rect(626, 548, 32, 34, '#e8e6d8', 'opacity="0.7"');
    s += rect(618, 620, 40, 44, '#e8e6d8', 'opacity="0.62"');
    s += rect(608, 686, 52, 40, '#e8e6d8', 'opacity="0.5"');
    /* 岗亭 */
    s += rect(852, 402, 118, 116, 'url(#' + booth + ')');
    s += rect(844, 388, 134, 18, '#5f6c73');
    s += rect(866, 424, 60, 46, '#bfe4f7', 'opacity="0.9"');
    s += rect(866, 470, 60, 6, '#6f7c83');
    /* 路灯 */
    s += rect(392, 330, 9, 172, '#6a736f');
    s += rect(360, 322, 74, 14, '#48504d');
    s += circ(392, 348, 46, 'url(#' + glow + ')');
    s += rect(872, 330, 9, 172, '#6a736f');
    s += rect(840, 322, 74, 14, '#48504d');
    /* 近景绿篱与暗角 */
    s += ell(96, 690, 260, 96, '#2f3a28', 'opacity="0.75"');
    s += ell(1200, 700, 280, 100, '#2f3a28', 'opacity="0.7"');
    s += tree(70, 470, 1.35, '#5c4732', '#4f7f3f', 0.95);
    s += tree(1230, 486, 1.5, '#5c4732', '#43703a');
    s += tree(330, 458, 0.85, '#5c4732', '#5b8f47');
    return s;
  });

  /* ------------------------------------------------------- 4. 校园林荫道 */
  def('campus_path', '林荫道', false, function (nm) {
    var sky = nm(), far = nm(), ground = nm(), stone = nm(), haze = nm(),
      leafA = nm(), leafB = nm(), sunGlow = nm(), bldg = nm();
    var i, x, y, w, sc;
    var s = defs(
      lgGrad(sky, 0, 0, 0, 430, [[0, '#66b6ea'], [0.5, '#a8dcf7'], [1, '#f2fbe9']]) +
      lgGrad(far, 0, 300, 0, 470, [[0, '#e9f7d8', 0], [1, '#dff2c9', 0.95]]) +
      rgGrad(sunGlow, 640, 250, 460, [[0, '#fffde0', 0.75], [0.45, '#fff4b8', 0.3], [1, '#fff4b8', 0]]) +
      lgGrad(ground, 0, 430, 0, 720, [[0, '#8d9c6e'], [0.45, '#5f7049'], [1, '#2c3522']]) +
      lgGrad(stone, 0, 440, 0, 720, [[0, '#b9b3a0'], [0.42, '#918a78'], [1, '#4a473d']]) +
      lgGrad(haze, 0, 260, 0, 430, [[0, '#eaf8e2', 0], [1, '#eaf8e2', 0.85]]) +
      lgGrad(leafA, 0, 0, 0, 260, [[0, '#3f7a33'], [1, '#7cb85a']]) +
      lgGrad(leafB, 0, 40, 0, 320, [[0, '#2f6329'], [1, '#5f9c46']]) +
      lgGrad(bldg, 0, 300, 0, 470, [[0, '#eef3e0'], [1, '#c8cfae']])
    );
    s += rect(0, 0, W, 430, 'url(#' + sky + ')');
    s += circ(640, 250, 460, 'url(#' + sunGlow + ')');
    s += cloud(140, 120, 0.9, '#ffffff', 0.65);
    s += cloud(880, 96, 0.75, '#ffffff', 0.6);
    /* 尽头的教学楼 */
    s += rect(486, 296, 308, 138, 'url(#' + bldg + ')');
    s += rect(474, 284, 332, 18, '#b5bd9d');
    s += rect(598, 258, 84, 40, '#d6dcc0');
    s += txt(640, 288, '教 学 楼', '#8b9370', 20, 'text-anchor="middle" letter-spacing="4"');
    for (i = 0; i < 7; i++) {
      s += rect(500 + i * 42, 316, 26, 32, '#9fb3c4', 'opacity="0.85"');
      s += rect(500 + i * 42, 366, 26, 32, '#9fb3c4', 'opacity="0.7"');
    }
    s += rect(0, 258, W, 172, 'url(#' + haze + ')');
    /* 地面与石板路 */
    s += rect(0, 428, W, 292, 'url(#' + ground + ')');
    s += poly('534,430 746,430 1046,720 234,720', 'url(#' + stone + ')');
    for (i = 0; i < 7; i++) {
      y = 452 + i * i * 3.6 + i * 24;
      w = 12 + i * 10;
      x = 640 - w - i * 24;
      s += rect(r(x), r(y), r(w * 2), r(4 + i * 1.4), '#e6e0cc', 'opacity="0.28"');
    }
    /* 斑驳阳光 */
    for (i = 0; i < 16; i++) {
      var rnd = prng(1000 + i);
      x = r(300 + rnd() * 680);
      y = r(452 + i * 16 + rnd() * 24);
      sc = r(18 + rnd() * 46);
      s += ell(x, y, sc, r(sc * 0.5), '#fffbd0', 'opacity="0.16"');
    }
    /* 两侧行道树：由远及近 */
    s += tree(508, 462, 0.55, '#5b4630', '#4b8a3d', 0.9);
    s += tree(772, 462, 0.55, '#5b4630', '#4b8a3d', 0.9);
    s += tree(430, 520, 0.85, '#584430', '#417c36', 0.95);
    s += tree(852, 520, 0.85, '#584430', '#417c36', 0.95);
    s += tree(268, 622, 1.35, '#54412e', '#33682c');
    s += tree(1014, 622, 1.35, '#54412e', '#33682c');
    s += tree(60, 720, 1.9, '#4d3b2a', '#2b5a26');
    s += tree(1226, 720, 1.9, '#4d3b2a', '#2b5a26');
    /* 顶部树冠拱廊 */
    s += path('M-20 0 q120 92 300 96 q150 4 236 76 q-260 40 -536 -8 Z', 'url(#' + leafA + ')', 'opacity="0.95"');
    s += path('M1300 0 q-140 96 -330 100 q-140 8 -224 74 q280 44 554 -10 Z', 'url(#' + leafB + ')', 'opacity="0.95"');
    s += path('M340 0 q120 60 260 62 q140 2 240 -62 L840 0 Z', 'url(#' + leafB + ')', 'opacity="0.75"');
    /* 灯柱与道旗 */
    s += rect(506, 452, 8, 160, '#6b7268');
    s += rect(514, 470, 62, 22, '#c0392b');
    s += rect(514, 502, 62, 22, '#2f6fa8');
    s += rect(766, 452, 8, 160, '#6b7268');
    s += rect(704, 470, 62, 22, '#2f6fa8');
    s += rect(704, 502, 62, 22, '#c0392b');
    /* 长椅与垃圾桶 */
    s += rect(300, 606, 150, 12, '#8a6141');
    s += rect(300, 592, 150, 10, '#9c6f4b');
    s += rect(310, 618, 10, 34, '#6c4c33');
    s += rect(430, 618, 10, 34, '#6c4c33');
    s += rect(946, 616, 44, 62, '#4f6b4a');
    s += rect(938, 604, 60, 14, '#3d5439');
    /* 近景压暗 */
    s += ell(640, 748, 720, 118, '#20281a', 'opacity="0.6"');
    return s;
  });

  /* ------------------------------------------------------------ 5. 宿舍·日 */
  def('dorm', '宿舍·日', false, function (nm) {
    var wall = nm(), floor = nm(), win = nm(), beam = nm(), lampG = nm(),
      mat = nm(), screen = nm(), quilt = nm(), post = nm();
    var i;
    var s = defs(
      lgGrad(wall, 0, 0, 0, 540, [[0, '#f2e6cf'], [0.55, '#e6d4b6'], [1, '#d3bd9a']]) +
      lgGrad(floor, 0, 520, 0, 720, [[0, '#a9764a'], [0.4, '#8a5d38'], [1, '#4e3320']]) +
      lgGrad(win, 0, 110, 0, 400, [[0, '#79c0ee'], [0.6, '#bfe4fa'], [1, '#eff9ff']]) +
      lgGrad(beam, 900, 110, 520, 700, [[0, '#fff8d8', 0.5], [1, '#fff8d8', 0]]) +
      rgGrad(lampG, 620, 40, 300, [[0, '#fff4cc', 0.65], [1, '#fff4cc', 0]]) +
      lgGrad(mat, 0, 150, 0, 200, [[0, '#e8e2d4'], [1, '#c9c0ad']]) +
      lgGrad(screen, 0, 0, 0, 100, [[0, '#4a5a6b'], [1, '#1d2733']]) +
      lgGrad(quilt, 0, 0, 0, 100, [[0, '#7fa8c9'], [1, '#4d7291']]) +
      lgGrad(post, 0, 0, 0, 120, [[0, '#c9b79a'], [1, '#9a866a']])
    );
    /* 墙 / 天花板 */
    s += rect(0, 0, W, 540, 'url(#' + wall + ')');
    s += rect(0, 0, W, 74, '#efe7d6');
    s += rect(0, 74, W, 8, '#cbb99b');
    s += rect(0, 500, W, 16, '#c2ac8b');
    /* 顶灯 */
    s += rect(492, 24, 300, 26, '#fbf6e6');
    s += rect(484, 18, 316, 12, '#b9ac93');
    s += rect(0, 0, W, 240, 'url(#' + lampG + ')');
    /* 窗（右侧） */
    s += rect(886, 96, 306, 316, '#eae0cb');
    s += rect(898, 108, 282, 292, 'url(#' + win + ')');
    s += rect(898, 108, 282, 14, '#ffffff', 'opacity="0.55"');
    s += rect(1030, 108, 12, 292, '#f1e8d6');
    s += rect(898, 240, 282, 12, '#f1e8d6');
    s += rect(878, 400, 322, 18, '#e3d8c0');
    s += rect(878, 412, 322, 12, '#cbbb9d');
    /* 窗外光带 */
    s += poly('900,120 1180,120 640,720 300,720', 'url(#' + beam + ')');
    /* 窗帘 */
    s += path('M862 92 q46 96 26 320 l-40 0 q12 -220 -18 -320 Z', '#f2ead9');
    s += path('M1216 92 q-46 96 -26 320 l40 0 q-12 -220 18 -320 Z', '#f2ead9');
    /* 上下铺 */
    s += rect(58, 92, 20, 400, 'url(#' + post + ')');
    s += rect(438, 92, 20, 400, 'url(#' + post + ')');
    s += rect(58, 288, 400, 16, '#b39a78');
    s += rect(58, 448, 400, 16, '#a68d6c');
    s += rect(78, 246, 360, 44, 'url(#' + mat + ')');
    s += rect(78, 404, 360, 46, 'url(#' + mat + ')');
    s += rect(78, 236, 360, 24, 'url(#' + quilt + ')');
    s += rect(78, 396, 360, 26, 'url(#' + quilt + ')');
    s += ell(150, 262, 52, 20, '#fdfaf0');
    s += ell(150, 420, 54, 22, '#fdfaf0');
    s += rect(60, 180, 396, 10, '#b9a684');
    for (i = 0; i < 5; i++) {
      s += rect(96 + i * 76, 138, 8, 44, '#b0a086');
    }
    /* 梯子 */
    s += rect(458, 150, 10, 320, '#b6a184');
    s += rect(508, 150, 10, 320, '#b6a184');
    for (i = 0; i < 6; i++) {
      s += rect(458, 190 + i * 48, 60, 8, '#a08f74');
    }
    /* 挂着的外套 / 毛巾 */
    s += rect(486, 246, 34, 62, '#c85c50', 'opacity="0.95"');
    s += rect(486, 404, 34, 58, '#4c7fa4', 'opacity="0.95"');
    /* 书桌 */
    s += rect(560, 396, 348, 22, '#c8a878');
    s += rect(556, 414, 356, 12, '#a8875c');
    s += rect(572, 426, 12, 118, '#a8875c');
    s += rect(884, 426, 12, 118, '#a8875c');
    s += rect(700, 426, 88, 76, '#b79770');
    s += rect(700, 426, 88, 12, '#d5b98e');
    /* 两台笔记本 */
    s += poly('600,438 700,438 712,392 612,392', '#5d6a77');
    s += rect(612, 330, 100, 62, 'url(#' + screen + ')');
    s += rect(620, 338, 84, 46, '#8fb7cf', 'opacity="0.75"');
    s += rect(748, 438, 132, 10, '#cfd6db');
    s += poly('760,428 872,428 884,386 772,386', '#66727e');
    s += rect(772, 326, 112, 60, 'url(#' + screen + ')');
    s += rect(782, 336, 92, 42, '#a9c8d8', 'opacity="0.7"');
    /* 桌上杂物 */
    s += rect(578, 358, 26, 40, '#cf5f8a');
    s += rect(578, 346, 26, 12, '#e88bac');
    s += rect(626, 372, 16, 26, '#4f7a58');
    s += rect(560, 380, 30, 18, '#e0d6c0');
    s += rect(880, 358, 18, 40, '#7d6a92');
    s += rect(846, 366, 30, 32, '#ece3cf');
    s += rect(906, 380, 34, 18, '#a8bf7a');
    /* 台灯 */
    s += rect(898, 350, 8, 48, '#6d7a85');
    s += path('M862 352 q44 -40 88 0 Z', '#5e8fbf');
    s += circ(900, 384, 46, 'url(#' + lampG + ')');
    /* 墙上海报 */
    s += rect(556, 132, 116, 152, '#f6f1e2');
    s += rect(564, 140, 100, 108, '#8fb2cd');
    s += rect(564, 256, 100, 18, '#c9b48f');
    s += rect(690, 148, 96, 130, '#f6f1e2');
    s += rect(697, 156, 82, 90, '#c98f6a');
    s += rect(697, 252, 82, 16, '#c9b48f');
    /* 椅子 */
    s += rect(608, 546, 72, 14, '#8a6a45');
    s += rect(608, 496, 14, 62, '#8a6a45');
    s += rect(608, 486, 72, 16, '#9d7c53');
    s += rect(806, 546, 72, 14, '#8a6a45');
    s += rect(864, 496, 14, 62, '#8a6a45');
    s += rect(806, 486, 72, 16, '#9d7c53');
    /* 地板 */
    s += rect(0, 540, W, 180, 'url(#' + floor + ')');
    for (i = 0; i < 5; i++) {
      s += rect(0, 556 + i * 34, W, 3, '#6c452a', 'opacity="0.55"');
    }
    return s;
  }, 0.5);

  /* ------------------------------------------------------------ 6. 宿舍·夜 */
  def('dorm_night', '宿舍·夜', true, function (nm) {
    var wall = nm(), floor = nm(), win = nm(), moonG = nm(), lampG = nm(),
      mat = nm(), screen = nm(), quilt = nm(), post = nm(), beam = nm();
    var i;
    var s = defs(
      lgGrad(wall, 0, 0, 0, 540, [[0, '#232a3c'], [0.55, '#1b2131'], [1, '#121724']]) +
      lgGrad(floor, 0, 520, 0, 720, [[0, '#3a2c25'], [0.4, '#2a1f1a'], [1, '#14100e']]) +
      lgGrad(win, 0, 100, 0, 400, [[0, '#0b1330'], [0.55, '#16224a'], [1, '#2b3a63']]) +
      rgGrad(moonG, 1010, 176, 150, [[0, '#e9f0ff', 0.95], [0.25, '#c9d8f7', 0.35], [1, '#c9d8f7', 0]]) +
      rgGrad(lampG, 900, 368, 260, [[0, '#ffcf82', 0.92], [0.35, '#ffb85c', 0.35], [1, '#ffb85c', 0]]) +
      lgGrad(mat, 0, 150, 0, 200, [[0, '#5b6070'], [1, '#3f434f']]) +
      lgGrad(screen, 0, 0, 0, 100, [[0, '#6f93ab'], [1, '#2b3f4f']]) +
      lgGrad(quilt, 0, 0, 0, 100, [[0, '#3d5a7a'], [1, '#22334a']]) +
      lgGrad(post, 0, 0, 0, 120, [[0, '#6a5f4e'], [1, '#3f382d']]) +
      lgGrad(beam, 900, 100, 480, 720, [[0, '#cfe0ff', 0.24], [1, '#cfe0ff', 0]])
    );
    s += rect(0, 0, W, 540, 'url(#' + wall + ')');
    s += rect(0, 0, W, 74, '#2a3245');
    s += rect(0, 500, W, 16, '#242b3c');
    /* 月光带 */
    s += poly('900,132 1176,132 620,720 300,720', 'url(#' + beam + ')');
    /* 窗 */
    s += rect(886, 96, 306, 316, '#2c3446');
    s += rect(898, 108, 282, 292, 'url(#' + win + ')');
    s += rect(1030, 108, 12, 292, '#39415a');
    s += rect(898, 240, 282, 12, '#39415a');
    s += circ(1010, 176, 150, 'url(#' + moonG + ')');
    s += circ(1010, 176, 46, '#f4f8ff');
    s += circ(996, 164, 9, '#dbe4f5', 'opacity="0.8"');
    s += circ(1022, 192, 6, '#dbe4f5', 'opacity="0.7"');
    s += circ(1012, 152, 4, '#dbe4f5', 'opacity="0.6"');
    s += starField(16, 906, 118, 1172, 386, 4711, '#ffffff', 2.2, 0.9);
    s += rect(878, 400, 322, 18, '#333b4d');
    s += path('M862 92 q46 96 26 320 l-40 0 q12 -220 -18 -320 Z', '#2b3244');
    s += path('M1216 92 q-46 96 -26 320 l40 0 q-12 -220 18 -320 Z', '#2b3244');
    /* 上下铺 */
    s += rect(58, 92, 20, 400, 'url(#' + post + ')');
    s += rect(438, 92, 20, 400, 'url(#' + post + ')');
    s += rect(58, 288, 400, 16, '#4a4235');
    s += rect(58, 448, 400, 16, '#443c31');
    s += rect(78, 246, 360, 44, 'url(#' + mat + ')');
    s += rect(78, 404, 360, 46, 'url(#' + mat + ')');
    s += rect(78, 236, 360, 24, 'url(#' + quilt + ')');
    s += rect(78, 396, 360, 26, 'url(#' + quilt + ')');
    s += ell(150, 262, 52, 20, '#8d93a3', 'opacity="0.85"');
    s += ell(150, 420, 54, 22, '#8d93a3', 'opacity="0.85"');
    s += rect(60, 180, 396, 10, '#4d4638');
    for (i = 0; i < 5; i++) {
      s += rect(96 + i * 76, 138, 8, 44, '#4a4438');
    }
    s += rect(458, 150, 10, 320, '#4a4335');
    s += rect(508, 150, 10, 320, '#4a4335');
    for (i = 0; i < 6; i++) {
      s += rect(458, 190 + i * 48, 60, 8, '#3f3a2e');
    }
    s += rect(486, 246, 34, 62, '#6c3b39');
    s += rect(486, 404, 34, 58, '#2f4a60');
    /* 书桌 */
    s += rect(560, 396, 348, 22, '#4c3f31');
    s += rect(556, 414, 356, 12, '#3d332a');
    s += rect(572, 426, 12, 118, '#3b3128');
    s += rect(884, 426, 12, 118, '#3b3128');
    s += rect(700, 426, 88, 76, '#443a2e');
    /* 台灯 + 暖光 */
    s += circ(900, 368, 260, 'url(#' + lampG + ')');
    s += rect(898, 350, 8, 48, '#4f5866');
    s += path('M862 352 q44 -40 88 0 Z', '#3f6a94');
    s += ell(760, 404, 210, 34, '#ffc978', 'opacity="0.2"');
    /* 笔记本（屏幕光） */
    s += poly('600,438 700,438 712,392 612,392', '#31383f');
    s += rect(612, 330, 100, 62, 'url(#' + screen + ')');
    s += rect(620, 338, 84, 46, '#cfe4f2', 'opacity="0.85"');
    s += circ(664, 380, 90, 'url(#' + lampG + ')');
    s += rect(748, 438, 132, 10, '#5d636a');
    s += poly('760,428 872,428 884,386 772,386', '#343b41');
    s += rect(772, 326, 112, 60, '#26333c');
    /* 桌上杂物 */
    s += rect(578, 358, 26, 40, '#8a4360');
    s += rect(578, 346, 26, 12, '#9c5a76');
    s += rect(626, 372, 16, 26, '#33483a');
    s += rect(560, 380, 30, 18, '#93876f');
    s += rect(880, 358, 18, 40, '#4b4059');
    s += rect(846, 366, 30, 32, '#8e8672');
    /* 海报（被月光照亮一点） */
    s += rect(556, 132, 116, 152, '#3f4557');
    s += rect(564, 140, 100, 108, '#3a5570');
    s += rect(690, 148, 96, 130, '#3f4557');
    s += rect(697, 156, 82, 90, '#5a4740');
    /* 椅子 */
    s += rect(608, 546, 72, 14, '#3a2f24');
    s += rect(608, 496, 14, 62, '#3a2f24');
    s += rect(806, 546, 72, 14, '#3a2f24');
    s += rect(864, 496, 14, 62, '#3a2f24');
    /* 地板 */
    s += rect(0, 540, W, 180, 'url(#' + floor + ')');
    for (i = 0; i < 5; i++) {
      s += rect(0, 556 + i * 34, W, 3, '#0f0c0a', 'opacity="0.5"');
    }
    s += ell(760, 596, 260, 40, '#ffb85c', 'opacity="0.12"');
    return s;
  }, 0.68);

  /* ------------------------------------------------------------ 7. 教室·日 */
  def('classroom', '教室·日', false, function (nm) {
    var wall = nm(), floor = nm(), board = nm(), winSky = nm(), shaft = nm(),
      deskTop = nm(), deskFront = nm(), ceil = nm(), tubeG = nm();
    var i, j, row, cx, dw, dy;
    var s = defs(
      lgGrad(wall, 0, 0, 0, 470, [[0, '#f4efe1'], [0.6, '#e8e0cd'], [1, '#d8cdb4']]) +
      lgGrad(ceil, 0, 0, 0, 80, [[0, '#fbf8ef'], [1, '#e7e0cd']]) +
      lgGrad(floor, 0, 470, 0, 720, [[0, '#c9b48c'], [0.35, '#a8916b'], [1, '#5f4c33']]) +
      lgGrad(board, 0, 90, 0, 330, [[0, '#2f5344'], [0.5, '#274639'], [1, '#1c332b']]) +
      lgGrad(winSky, 0, 80, 0, 420, [[0, '#7cc2ef'], [0.55, '#c7e8fb'], [1, '#f4fbff']]) +
      lgGrad(shaft, 1160, 120, 420, 700, [[0, '#fffbe0', 0.42], [1, '#fffbe0', 0]]) +
      lgGrad(deskTop, 0, 0, 0, 40, [[0, '#e8cfa4'], [1, '#c9ac7d']]) +
      lgGrad(deskFront, 0, 0, 0, 60, [[0, '#b99a70'], [1, '#8d7150']]) +
      rgGrad(tubeG, 500, 44, 320, [[0, '#fffdf0', 0.7], [1, '#fffdf0', 0]])
    );
    s += rect(0, 0, W, 470, 'url(#' + wall + ')');
    s += rect(0, 0, W, 80, 'url(#' + ceil + ')');
    s += rect(0, 78, W, 8, '#cfc6b0');
    /* 地板先铺，桌椅压在上层 */
    s += rect(0, 468, W, 252, 'url(#' + floor + ')');
    for (i = 0; i < 4; i++) {
      s += rect(0, 500 + i * 56, W, 3, '#6d593c', 'opacity="0.35"');
    }
    /* 日光灯 */
    s += rect(300, 26, 300, 20, '#fdfbef');
    s += rect(292, 20, 316, 10, '#c8bfa6');
    s += rect(760, 26, 300, 20, '#fdfbef');
    s += rect(752, 20, 316, 10, '#c8bfa6');
    s += rect(180, 0, W, 150, 'url(#' + tubeG + ')');
    /* 后墙标语 */
    s += rect(332, 30, 616, 54, '#c0392b');
    s += txt(640, 70, '勤学 善思 求实 创新', '#ffeeb0', 32, 'text-anchor="middle" letter-spacing="8" font-weight="bold"');
    /* 黑板 */
    s += rect(112, 96, 640, 246, '#8a6a44');
    s += rect(124, 108, 616, 220, 'url(#' + board + ')');
    s += txt(170, 168, '今日课程', '#e9f2df', 30, 'opacity="0.86" letter-spacing="4"');
    s += txt(170, 216, '高等数学  大学英语', '#dbe8d2', 24, 'opacity="0.7" letter-spacing="3"');
    s += txt(170, 254, '线性代数  体育', '#dbe8d2', 24, 'opacity="0.62" letter-spacing="3"');
    s += txt(500, 168, '值日：李雷', '#e9f2df', 24, 'opacity="0.6"');
    s += strokePath('M500 196 q60 -10 118 0 q-46 12 -118 0', '#e9f2df', 3, 'opacity="0.45"');
    s += strokePath('M150 288 q90 -12 176 0', '#e9f2df', 3, 'opacity="0.32"');
    s += rect(112, 342, 640, 14, '#a3845c');
    s += rect(180, 334, 30, 8, '#fdfbf2');
    s += rect(220, 336, 24, 6, '#f2b5b5');
    s += rect(260, 334, 34, 9, '#cfd8e8');
    s += rect(560, 328, 44, 18, '#5c6a70');
    /* 右侧窗墙 */
    s += rect(890, 66, 390, 400, '#efe9da');
    for (i = 0; i < 3; i++) {
      var wx = 902 + i * 126;
      s += rect(wx, 84, 112, 340, '#f7f2e5');
      s += rect(wx + 8, 92, 96, 324, 'url(#' + winSky + ')');
      s += rect(wx + 52, 92, 8, 324, '#f2ecdc');
      s += rect(wx + 8, 240, 96, 10, '#f2ecdc');
      s += rect(wx + 8, 92, 96, 10, '#ffffff', 'opacity="0.5"');
    }
    /* 斜射光柱 */
    s += poly('900,110 1180,110 520,720 220,720', 'url(#' + shaft + ')');
    s += poly('1150,110 1210,110 760,720 640,720', 'url(#' + shaft + ')');
    /* 讲台 */
    s += rect(70, 396, 236, 26, '#b08a5c');
    s += rect(66, 418, 244, 14, '#95724a');
    s += rect(86, 432, 204, 130, '#8a6a45');
    s += rect(96, 452, 184, 74, '#a07c52');
    s += rect(70, 348, 60, 48, '#d8c8a6');
    s += rect(86, 340, 28, 12, '#8a6a45');
    /* 课桌：3 排 x 4 列，近大远小 */
    for (row = 0; row < 3; row++) {
      dy = 468 + row * 72;
      dw = 150 + row * 26;
      for (j = 0; j < 3; j++) {
        cx = 560 + (j - 1) * (dw + 22);
        s += rect(r(cx - dw / 2), dy, dw, r(16 + row * 3), 'url(#' + deskTop + ')');
        s += rect(r(cx - dw / 2), r(dy + 16 + row * 3), dw, r(38 + row * 8), 'url(#' + deskFront + ')');
        s += rect(r(cx - dw / 2 + 10), r(dy - 44 - row * 6), r(dw * 0.42), r(30 + row * 5), '#9c7d57', 'opacity="0.9"');
      }
    }
    s += rect(0, 700, W, 20, '#4a3b28', 'opacity="0.5"');
    return s;
  }, 0.5);

  /* ------------------------------------------------------------ 8. 教室·夜 */
  def('classroom_night', '教室·夜', true, function (nm) {
    var wall = nm(), floor = nm(), board = nm(), winSky = nm(), shaft = nm(),
      deskTop = nm(), deskFront = nm(), ceil = nm(), hallG = nm(), moonG = nm(), wedge = nm();
    var i, j, row, cx, dw, dy;
    var s = defs(
      lgGrad(wall, 0, 0, 0, 470, [[0, '#232b3f'], [0.6, '#1b2233'], [1, '#131826']]) +
      lgGrad(ceil, 0, 0, 0, 80, [[0, '#2c3549'], [1, '#1d2434']]) +
      lgGrad(floor, 0, 470, 0, 720, [[0, '#2f3242'], [0.35, '#242734'], [1, '#12141c']]) +
      lgGrad(board, 0, 90, 0, 330, [[0, '#1d2f2a'], [1, '#12211d']]) +
      lgGrad(winSky, 0, 80, 0, 420, [[0, '#0a1330'], [0.55, '#152046'], [1, '#2c3c66']]) +
      lgGrad(shaft, 1160, 120, 460, 720, [[0, '#b9cdf5', 0.28], [1, '#b9cdf5', 0]]) +
      lgGrad(deskTop, 0, 0, 0, 40, [[0, '#4a4436'], [1, '#332f26']]) +
      lgGrad(deskFront, 0, 0, 0, 60, [[0, '#3a3529'], [1, '#241f18']]) +
      lgGrad(hallG, 0, 150, 0, 470, [[0, '#ffe0a4', 0.92], [1, '#ffc471', 0.5]]) +
      lgGrad(wedge, 0, 452, 0, 720, [[0, '#ffd48a', 0.42], [1, '#ffd48a', 0]]) +
      rgGrad(moonG, 1100, 180, 130, [[0, '#e6eeff', 0.8], [0.3, '#c8d8f8', 0.28], [1, '#c8d8f8', 0]])
    );
    s += rect(0, 0, W, 470, 'url(#' + wall + ')');
    s += rect(0, 0, W, 80, 'url(#' + ceil + ')');
    s += rect(0, 78, W, 8, '#2e3648');
    /* 地板先铺，桌椅压在上层 */
    s += rect(0, 468, W, 252, 'url(#' + floor + ')');
    for (i = 0; i < 4; i++) {
      s += rect(0, 500 + i * 56, W, 3, '#0e1017', 'opacity="0.4"');
    }
    s += rect(300, 26, 300, 20, '#3a4356');
    s += rect(760, 26, 300, 20, '#3a4356');
    /* 后墙标语（暗） */
    s += rect(332, 30, 616, 54, '#5c1f1b');
    s += txt(640, 70, '勤学 善思 求实 创新', '#8d7a4e', 32, 'text-anchor="middle" letter-spacing="8" font-weight="bold"');
    /* 黑板 */
    s += rect(112, 96, 640, 246, '#3a3025');
    s += rect(124, 108, 616, 220, 'url(#' + board + ')');
    s += txt(170, 168, '今日课程', '#8fa08c', 30, 'opacity="0.4" letter-spacing="4"');
    s += txt(170, 216, '高等数学  大学英语', '#8fa08c', 24, 'opacity="0.3" letter-spacing="3"');
    s += txt(500, 168, '值日：李雷', '#8fa08c', 24, 'opacity="0.28"');
    s += strokePath('M150 288 q90 -12 176 0', '#8fa08c', 3, 'opacity="0.18"');
    s += rect(112, 342, 640, 14, '#42372a');
    /* 走廊灯光从后门渗入（门在黑板与窗墙之间） */
    s += rect(778, 158, 112, 310, '#262c3b');
    s += rect(786, 166, 96, 302, 'url(#' + hallG + ')');
    s += rect(830, 166, 6, 302, '#3a3126');
    s += poly('788,466 882,466 1010,720 636,720', 'url(#' + wedge + ')');
    /* 右侧窗墙 */
    s += rect(890, 66, 390, 400, '#242c3e');
    for (i = 0; i < 3; i++) {
      var wx = 902 + i * 126;
      s += rect(wx, 84, 112, 340, '#2b3448');
      s += rect(wx + 8, 92, 96, 324, 'url(#' + winSky + ')');
      s += rect(wx + 52, 92, 8, 324, '#333d52');
      s += rect(wx + 8, 240, 96, 10, '#333d52');
    }
    s += circ(1100, 180, 130, 'url(#' + moonG + ')');
    s += circ(1100, 180, 34, '#eef3ff', 'opacity="0.95"');
    s += starField(14, 906, 100, 1178, 400, 8123, '#ffffff', 2, 0.85);
    s += poly('900,110 1180,110 520,720 220,720', 'url(#' + shaft + ')');
    /* 讲台 */
    s += rect(70, 396, 236, 26, '#3d3428');
    s += rect(66, 418, 244, 14, '#332c22');
    s += rect(86, 432, 204, 130, '#2e281f');
    /* 课桌 */
    for (row = 0; row < 3; row++) {
      dy = 468 + row * 72;
      dw = 150 + row * 26;
      for (j = 0; j < 3; j++) {
        cx = 560 + (j - 1) * (dw + 22);
        s += rect(r(cx - dw / 2), dy, dw, r(16 + row * 3), 'url(#' + deskTop + ')');
        s += rect(r(cx - dw / 2), r(dy + 16 + row * 3), dw, r(38 + row * 8), 'url(#' + deskFront + ')');
      }
    }
    s += ell(700, 640, 320, 84, '#ffd48a', 'opacity="0.09"');
    return s;
  }, 0.7);

  /* --------------------------------------------------------- 9. 操场·烈日 */
  def('playground', '操场·烈日', false, function (nm) {
    var sky = nm(), sun = nm(), infield = nm(), near = nm(), far = nm(),
      haze = nm(), flag = nm(), metal = nm(), stand = nm(), grass = nm();
    var i;
    var s = defs(
      lgGrad(sky, 0, 0, 0, 440, [[0, '#5fabe4'], [0.42, '#b6dff6'], [0.78, '#f6f1c8'], [1, '#fdf8db']]) +
      rgGrad(sun, 900, 92, 400, [[0, '#ffffff', 0.98], [0.26, '#fff9cf', 0.55], [1, '#fff9cf', 0]]) +
      lgGrad(infield, 0, 470, 0, 595, [[0, '#a3bf64'], [1, '#7b9848']]) +
      lgGrad(far, 0, 432, 0, 472, [[0, '#c97456'], [1, '#a64f36']]) +
      lgGrad(near, 0, 578, 0, 720, [[0, '#cb6f4e'], [0.45, '#a8503a'], [1, '#763628']]) +
      lgGrad(haze, 0, 396, 0, 486, [[0, '#fffbdc', 0], [0.55, '#fffbdc', 0.6], [1, '#fffbdc', 0]]) +
      lgGrad(flag, 0, 0, 0, 60, [[0, '#e83a2e'], [1, '#b71c12']]) +
      lgGrad(metal, 0, 180, 0, 470, [[0, '#f2f5f7'], [0.5, '#c6cfd5'], [1, '#8d979e']]) +
      lgGrad(stand, 0, 360, 0, 434, [[0, '#e2e8ea'], [1, '#a6b2b6']]) +
      lgGrad(grass, 0, 424, 0, 452, [[0, '#8fae62'], [1, '#7a9950']])
    );
    s += rect(0, 0, W, 440, 'url(#' + sky + ')');
    s += circ(900, 92, 400, 'url(#' + sun + ')');
    s += circ(900, 92, 76, '#ffffff', 'opacity="0.98"');
    s += cloud(110, 146, 0.62, '#ffffff', 0.45);
    s += cloud(1060, 190, 0.5, '#ffffff', 0.4);
    /* 远处树线、看台 */
    s += path('M0 424 q150 -34 300 -14 q140 -22 320 -4 q170 -16 320 8 q120 10 340 2 L1280 440 L0 440 Z', '#8aa860', 'opacity="0.75"');
    s += rect(0, 392, W, 90, 'url(#' + haze + ')');
    s += rect(58, 364, 324, 66, 'url(#' + stand + ')');
    s += rect(50, 352, 340, 16, '#78868c');
    for (i = 0; i < 8; i++) {
      s += rect(74 + i * 39, 382, 27, 11, '#8d99a0');
      s += rect(74 + i * 39, 400, 27, 11, '#98a4aa');
    }
    /* 远端直道 */
    s += rect(0, 432, W, 42, 'url(#' + far + ')');
    for (i = 0; i < 4; i++) {
      s += rect(0, r(440 + i * 9), W, 2.4, '#ffffff', 'opacity="0.55"');
    }
    /* 草坪与标线 */
    s += rect(0, 470, W, 122, 'url(#' + infield + ')');
    s += rect(0, 426, W, 8, 'url(#' + grass + ')', 'opacity="0.7"');
    s += rect(0, 500, W, 3, '#ffffff', 'opacity="0.4"');
    s += rect(160, 500, 3, 40, '#ffffff', 'opacity="0.35"');
    s += rect(1120, 500, 3, 40, '#ffffff', 'opacity="0.35"');
    s += ell(640, 546, 100, 24, 'none', 'stroke="#ffffff" stroke-width="3" opacity="0.4"');
    s += ell(420, 566, 74, 14, '#d9c19a', 'opacity="0.7"');
    /* 旗杆 */
    s += rect(976, 176, 8, 300, 'url(#' + metal + ')');
    s += circ(980, 172, 8, '#e8eef2');
    s += path('M984 196 q40 16 70 4 q30 -12 64 8 l0 48 q-34 -20 -64 -8 q-30 12 -70 -4 Z', 'url(#' + flag + ')');
    /* 场边小树 */
    s += tree(230, 474, 0.46, '#6b543a', '#5d8f43');
    s += tree(1064, 470, 0.42, '#6b543a', '#548640');
    s += tree(48, 466, 0.4, '#6b543a', '#61934a');
    /* 近端直道 */
    s += path('M0 578 Q640 548 1280 578 L1280 720 L0 720 Z', 'url(#' + near + ')');
    for (i = 0; i < 4; i++) {
      s += strokePath('M0 ' + r(602 + i * 26) + ' Q640 ' + r(572 + i * 26) + ' 1280 ' + r(602 + i * 26), '#ffffff', 3, 'opacity="0.4"');
    }
    /* 热浪 */
    s += strokePath('M0 512 q160 -10 320 0 q160 10 320 0 q160 -10 320 0 q160 10 320 0', '#ffffff', 5, 'opacity="0.14"');
    s += strokePath('M0 528 q180 -8 360 0 q180 8 360 0 q180 -8 360 0 q90 4 200 0', '#ffffff', 6, 'opacity="0.12"');
    s += ell(640, 700, 760, 90, '#5c2a1e', 'opacity="0.55"');
    return s;
  }, 0.5);

  /* --------------------------------------------------------- 10. 操场·夜 */
  def('playground_night', '操场·夜', true, function (nm) {
    var sky = nm(), infield = nm(), near = nm(), far = nm(), flood = nm(),
      cone = nm(), metal = nm(), city = nm(), stand = nm(), flag = nm();
    var i;
    var s = defs(
      lgGrad(sky, 0, 0, 0, 440, [[0, '#070c1e'], [0.5, '#111a38'], [1, '#243158']]) +
      lgGrad(infield, 0, 470, 0, 595, [[0, '#28361f'], [1, '#1a2416']]) +
      lgGrad(far, 0, 432, 0, 472, [[0, '#4a2b26'], [1, '#38201d']]) +
      lgGrad(near, 0, 578, 0, 720, [[0, '#4e2c25'], [0.45, '#3a201b'], [1, '#211210']]) +
      rgGrad(flood, 0, 0, 220, [[0, '#fff4cf', 0.95], [0.28, '#ffe6a8', 0.4], [1, '#ffe6a8', 0]]) +
      lgGrad(cone, 0, 0, 0, 300, [[0, '#fff2c8', 0.36], [1, '#fff2c8', 0]]) +
      lgGrad(metal, 0, 180, 0, 470, [[0, '#7c8794'], [1, '#39414b']]) +
      rgGrad(city, 640, 442, 620, [[0, '#ffcf8e', 0.34], [1, '#ffcf8e', 0]]) +
      lgGrad(stand, 0, 356, 0, 434, [[0, '#232c3d'], [1, '#161d2b']]) +
      lgGrad(flag, 0, 0, 0, 60, [[0, '#8e2119'], [1, '#5c1410']])
    );
    s += rect(0, 0, W, 440, 'url(#' + sky + ')');
    s += starField(52, 0, 30, 1280, 380, 20249, '#ffffff', 2.4, 0.95);
    s += circ(640, 442, 620, 'url(#' + city + ')');
    s += path('M0 424 q150 -34 300 -14 q140 -22 320 -4 q170 -16 320 8 q120 10 340 2 L1280 440 L0 440 Z', '#1d2a1a');
    s += rect(58, 364, 324, 66, 'url(#' + stand + ')');
    s += rect(50, 352, 340, 16, '#20293a');
    for (i = 0; i < 5; i++) {
      s += rect(96 + i * 62, 396, 22, 12, '#3a4457');
    }
    /* 远端直道 */
    s += rect(0, 432, W, 42, 'url(#' + far + ')');
    for (i = 0; i < 4; i++) {
      s += rect(0, r(440 + i * 9), W, 2.2, '#ffffff', 'opacity="0.18"');
    }
    /* 草坪 */
    s += rect(0, 470, W, 122, 'url(#' + infield + ')');
    s += rect(0, 500, W, 3, '#ffffff', 'opacity="0.12"');
    s += ell(640, 546, 100, 24, 'none', 'stroke="#ffffff" stroke-width="3" opacity="0.12"');
    /* 旗杆 */
    s += rect(976, 176, 8, 300, 'url(#' + metal + ')');
    s += circ(980, 172, 8, '#8d99a6');
    s += path('M984 196 q40 16 70 4 q30 -12 64 8 l0 48 q-34 -20 -64 -8 q-30 12 -70 -4 Z', 'url(#' + flag + ')');
    /* 小树剪影 */
    s += tree(230, 474, 0.46, '#2a2318', '#1e2c1a');
    s += tree(1064, 470, 0.42, '#2a2318', '#1b2818');
    /* 照明灯柱 */
    s += poly('96,206 176,206 430,720 -230,720', 'url(#' + cone + ')');
    s += rect(128, 202, 12, 268, 'url(#' + metal + ')');
    s += rect(96, 176, 78, 34, '#4a5462');
    s += circ(134, 192, 220, 'url(#' + flood + ')');
    s += ell(120, 470, 300, 40, '#fff0c0', 'opacity="0.12"');
    s += rect(1088, 206, 12, 264, 'url(#' + metal + ')');
    s += rect(1056, 180, 78, 34, '#4a5462');
    s += circ(1094, 196, 190, 'url(#' + flood + ')');
    s += rect(608, 216, 10, 254, '#39414b');
    s += rect(580, 192, 66, 30, '#414a58');
    s += circ(613, 206, 130, 'url(#' + flood + ')');
    /* 近端直道 */
    s += path('M0 578 Q640 548 1280 578 L1280 720 L0 720 Z', 'url(#' + near + ')');
    for (i = 0; i < 4; i++) {
      s += strokePath('M0 ' + r(602 + i * 26) + ' Q640 ' + r(572 + i * 26) + ' 1280 ' + r(602 + i * 26), '#ffffff', 3, 'opacity="0.16"');
    }
    s += ell(120, 660, 420, 70, '#fff0c0', 'opacity="0.08"');
    return s;
  }, 0.62);

  /* ------------------------------------------------------------- 11. 食堂 */
  def('canteen', '食堂', false, function (nm) {
    var ceil = nm(), wall = nm(), floor = nm(), metal = nm(), food = nm(),
      steam = nm(), lightG = nm(), guard = nm(), menu = nm(), fridge = nm();
    var i, x, y;
    var s = defs(
      lgGrad(ceil, 0, 0, 0, 130, [[0, '#fdf3dd'], [1, '#e8d5b4']]) +
      lgGrad(wall, 0, 130, 0, 470, [[0, '#f6ead0'], [0.6, '#e6d3b0'], [1, '#cfb78e']]) +
      lgGrad(floor, 0, 470, 0, 720, [[0, '#cfc3a6'], [0.4, '#a99b7c'], [1, '#6b5f47']]) +
      lgGrad(metal, 0, 300, 0, 470, [[0, '#eef2f4'], [0.45, '#c4ccd1'], [1, '#8d979d']]) +
      lgGrad(food, 0, 0, 0, 60, [[0, '#f7e6c4'], [1, '#d8bd8e']]) +
      lgGrad(steam, 0, 200, 0, 340, [[0, '#ffffff', 0], [0.4, '#ffffff', 0.5], [1, '#ffffff', 0]]) +
      rgGrad(lightG, 0, 0, 200, [[0, '#fff3cc', 0.8], [1, '#fff3cc', 0]]) +
      lgGrad(guard, 0, 250, 0, 340, [[0, '#ffffff', 0.5], [1, '#dff0f5', 0.16]]) +
      lgGrad(menu, 0, 130, 0, 300, [[0, '#3a3126'], [1, '#241d15']]) +
      lgGrad(fridge, 0, 200, 0, 470, [[0, '#dff0f7'], [1, '#9fbcc9']])
    );
    /* 顶棚与灯带 */
    s += rect(0, 0, W, 130, 'url(#' + ceil + ')');
    for (i = 0; i < 4; i++) {
      x = 120 + i * 300;
      s += rect(x, 40, 220, 18, '#fffaea');
      s += ell(x + 110, 76, 190, 60, 'url(#' + lightG + ')');
    }
    s += rect(0, 126, W, 10, '#c2ab86');
    /* 后墙与厨房 */
    s += rect(0, 130, W, 340, 'url(#' + wall + ')');
    for (i = 0; i < 7; i++) {
      s += rect(0, r(140 + i * 48), W, 2, '#d6c39f', 'opacity="0.5"');
    }
    s += rect(880, 150, 300, 250, '#d9c8a6');
    s += rect(896, 166, 268, 218, '#f0e2c2');
    s += rect(896, 166, 268, 12, '#c9b48e');
    /* 菜单牌 */
    s += rect(140, 132, 700, 168, '#8a6a44');
    s += rect(150, 142, 680, 148, 'url(#' + menu + ')');
    s += txt(172, 182, '今日菜谱', '#ffd98a', 30, 'letter-spacing="4" font-weight="bold"');
    s += txt(196, 222, '红烧肉          6.00', '#e8dcc0', 20, 'opacity="0.85"');
    s += txt(196, 250, '宫保鸡丁        5.00', '#e8dcc0', 20, 'opacity="0.85"');
    s += txt(196, 278, '番茄炒蛋        4.00', '#e8dcc0', 20, 'opacity="0.8"');
    s += txt(520, 222, '紫菜蛋花汤  2.00', '#e8dcc0', 20, 'opacity="0.8"');
    s += txt(520, 250, '米饭          1.00', '#e8dcc0', 20, 'opacity="0.78"');
    for (i = 0; i < 6; i++) {
      s += rect(172 + i * 116, 296, 96, 24, '#ffd98a', 'opacity="0.35"');
    }
    /* 售饭台 */
    s += rect(110, 330, 760, 22, 'url(#' + metal + ')');
    s += rect(110, 352, 760, 118, '#b9c1c6');
    s += rect(120, 366, 740, 90, '#a4adb3');
    for (i = 0; i < 4; i++) {
      s += rect(120, r(374 + i * 22), 740, 2, '#8d979d', 'opacity="0.7"');
    }
    /* 不锈钢餐盘与菜 */
    for (i = 0; i < 5; i++) {
      x = 150 + i * 146;
      s += rect(x, 302, 128, 30, '#dde4e8');
      s += rect(x + 4, 306, 120, 22, '#f2f6f8', 'opacity="0.6"');
      s += ell(x + 34, 318, 26, 11, '#c9762f');
      s += ell(x + 92, 318, 26, 11, '#7aa84c');
    }
    /* 防溅玻璃 */
    s += poly('140,254 850,254 872,302 118,302', 'url(#' + guard + ')');
    s += rect(118, 298, 756, 6, '#dfe7ea');
    /* 蒸汽 */
    s += ell(300, 272, 110, 40, 'url(#' + steam + ')');
    s += ell(520, 256, 130, 46, 'url(#' + steam + ')');
    s += ell(690, 280, 96, 36, 'url(#' + steam + ')');
    /* 右侧饮料柜 */
    s += rect(990, 190, 210, 290, 'url(#' + fridge + ')');
    s += rect(1002, 202, 186, 266, '#eaf6fb', 'opacity="0.55"');
    for (i = 0; i < 4; i++) {
      for (var j = 0; j < 5; j++) {
        s += rect(r(1012 + j * 36), r(216 + i * 62), 24, 46, ['#d94f4f', '#4f8fd9', '#e8c05a', '#6fbf8a', '#b06fd9'][(i + j) % 5], 'opacity="0.9"');
      }
      s += rect(1002, r(268 + i * 62), 186, 4, '#b9cdd6');
    }
    s += rect(1188, 200, 8, 270, '#8fb0bf');
    /* 长桌与长凳 */
    for (i = 0; i < 3; i++) {
      y = 500 + i * 74;
      var tw = 620 + i * 160, tx = 640 - tw / 2;
      s += rect(r(tx), y, tw, r(18 + i * 5), '#dcb98a');
      s += rect(r(tx), r(y + 18 + i * 5), tw, r(12 + i * 3), '#b08a5c');
      s += rect(r(tx - 26), r(y + 14 + i * 4), tw + 52, r(10 + i * 3), '#c69a6a');
    }
    /* 地面 */
    s += rect(0, 470, W, 250, 'url(#' + floor + ')');
    for (i = 0; i < 4; i++) {
      s += rect(0, r(540 + i * 46), W, 3, '#8b7e60', 'opacity="0.45"');
    }
    for (i = 0; i < 5; i++) {
      s += rect(120 + i * 260, 470, 3, 250, '#8b7e60', 'opacity="0.3"');
    }
    /* 近景托盘 */
    s += rect(40, 636, 300, 22, '#c9a978');
    s += rect(56, 604, 120, 34, '#dfe4e8');
    s += ell(116, 632, 56, 14, '#c9a978');
    s += ell(116, 616, 46, 16, '#f4f7f9');
    s += ell(230, 622, 44, 20, '#e8e2d2');
    s += ell(230, 610, 36, 12, '#cbbfa4');
    return s;
  }, 0.52);

  /* ----------------------------------------------------------- 12. 图书馆 */
  def('library', '图书馆', false, function (nm) {
    var wood = nm(), woodDark = nm(), floor = nm(), beam = nm(), glass = nm(),
      bookA = nm(), bookB = nm(), lampG = nm(), paper = nm(), ceil = nm();
    var i, j, x, y;
    var s = defs(
      lgGrad(wood, 0, 400, 0, 470, [[0, '#a87a4c'], [1, '#7d5632']]) +
      lgGrad(woodDark, 0, 90, 0, 430, [[0, '#6f4c2c'], [1, '#4a3220']]) +
      lgGrad(floor, 0, 470, 0, 720, [[0, '#9a6f45'], [0.4, '#7a5231'], [1, '#3f2a1a']]) +
      lgGrad(beam, 300, 60, 900, 700, [[0, '#fff2c4', 0.42], [1, '#fff2c4', 0]]) +
      lgGrad(glass, 0, 60, 0, 420, [[0, '#bfe5fa'], [0.5, '#e8f7ff'], [1, '#fffdf2']]) +
      lgGrad(bookA, 0, 0, 0, 60, [[0, '#c25a4a'], [1, '#8e3428']]) +
      lgGrad(bookB, 0, 0, 0, 60, [[0, '#4f7fa8'], [1, '#2f5474']]) +
      rgGrad(lampG, 0, 0, 160, [[0, '#ffe9ae', 0.9], [0.35, '#ffd98a', 0.3], [1, '#ffd98a', 0]]) +
      lgGrad(paper, 0, 0, 0, 20, [[0, '#fdf8e8'], [1, '#e6dcc4']]) +
      lgGrad(ceil, 0, 0, 0, 90, [[0, '#f6ecd6'], [1, '#ddc8a4']])
    );
    /* 顶棚 */
    s += rect(0, 0, W, 90, 'url(#' + ceil + ')');
    s += rect(0, 86, W, 10, '#c2a97e');
    /* 左侧高拱窗 */
    s += rect(40, 40, 280, 400, '#b99a70');
    s += path(archPath(56, 62, 112, 356), 'url(#' + glass + ')');
    s += path(archPath(184, 62, 112, 356), 'url(#' + glass + ')');
    s += rect(52, 200, 260, 10, '#c8ac82');
    s += rect(52, 310, 260, 10, '#c8ac82');
    s += rect(108, 62, 10, 356, '#c8ac82');
    s += rect(236, 62, 10, 356, '#c8ac82');
    s += poly('60,80 200,80 700,720 300,720', 'url(#' + beam + ')');
    s += poly('200,80 340,80 900,720 620,720', 'url(#' + beam + ')');
    /* 后墙书架 */
    s += rect(380, 96, 520, 344, 'url(#' + woodDark + ')');
    for (i = 0; i < 4; i++) {
      y = 104 + i * 84;
      s += rect(388, y, 504, 8, '#8a6440');
      for (j = 0; j < 9; j++) {
        x = 396 + j * 55;
        s += rect(x, r(y + 10), 44, 66, 'url(#' + (j % 2 ? bookA : bookB) + ')');
        s += rect(x, r(y + 24), 44, 6, '#f2e4c8', 'opacity="0.45"');
      }
    }
    s += rect(380, 430, 520, 16, '#5c3f26');
    /* 右侧书架（近景透视） */
    s += rect(1000, 60, 280, 420, '#4f3620');
    for (i = 0; i < 4; i++) {
      y = 78 + i * 100;
      s += rect(1010, y, 264, 8, '#7d5836');
      for (j = 0; j < 5; j++) {
        s += rect(r(1018 + j * 52), r(y + 10), 42, 80, 'url(#' + (j % 2 ? bookB : bookA) + ')');
      }
    }
    /* 阅览桌 */
    s += rect(360, 520, 480, 22, 'url(#' + wood + ')');
    s += rect(360, 542, 480, 14, '#6f4c2c');
    s += rect(384, 556, 14, 118, '#5c3f26');
    s += rect(802, 556, 14, 118, '#5c3f26');
    s += rect(560, 520, 80, 12, 'url(#' + paper + ')');
    s += rect(700, 522, 70, 10, 'url(#' + paper + ')');
    /* 绿罩台灯 */
    for (i = 0; i < 3; i++) {
      x = 430 + i * 170;
      s += rect(r(x), 494, 8, 26, '#3f6a52');
      s += path('M' + r(x - 42) + ' 494 q42 -34 84 0 Z', '#2f5c44');
      s += rect(r(x - 46), 492, 92, 6, '#254a37');
      s += circ(r(x + 2), 520, 150, 'url(#' + lampG + ')');
      s += ell(r(x + 2), 528, 110, 26, '#ffe0a0', 'opacity="0.16"');
    }
    s += txt(600, 512, '静', '#e8dcc0', 26, 'opacity="0.5" letter-spacing="4"');
    /* 地板 */
    s += rect(0, 470, W, 250, 'url(#' + floor + ')');
    for (i = 0; i < 6; i++) {
      s += rect(0, r(492 + i * 40), W, 3, '#4a3220', 'opacity="0.5"');
    }
    s += ell(640, 640, 420, 90, '#ffe0a0', 'opacity="0.1"');
    return s;
  }, 0.5);

  /* ------------------------------------------------------------ 13. 樱花道 */
  def('sakura_path', '樱花道', false, function (nm) {
    var sky = nm(), ground = nm(), stone = nm(), bloomA = nm(), bloomB = nm(),
      glow = nm(), bokeh = nm(), haze = nm(), trunk = nm();
    var i, rnd = prng(31337), x, y, sc;
    var s = defs(
      lgGrad(sky, 0, 0, 0, 430, [[0, '#a9cdf0'], [0.45, '#e8dcf2'], [0.8, '#fde8e4'], [1, '#fff6ee']]) +
      lgGrad(ground, 0, 428, 0, 720, [[0, '#9fae72'], [0.4, '#788a52'], [1, '#3a4429']]) +
      lgGrad(stone, 0, 440, 0, 720, [[0, '#d8c8bc'], [0.4, '#bda898'], [1, '#6f5f55']]) +
      lgGrad(bloomA, 0, 0, 0, 300, [[0, '#f7b8cf'], [1, '#f3a0be']]) +
      lgGrad(bloomB, 0, 40, 0, 340, [[0, '#f6c8da'], [1, '#eb8fb0']]) +
      rgGrad(glow, 640, 200, 520, [[0, '#fff3d6', 0.7], [0.45, '#ffe9c4', 0.26], [1, '#ffe9c4', 0]]) +
      lgGrad(haze, 0, 260, 0, 430, [[0, '#ffeef0', 0], [1, '#ffeef0', 0.85]]) +
      lgGrad(trunk, 0, 0, 0, 200, [[0, '#6b5240'], [1, '#463228']]) +
      '<radialGradient id="' + bokeh + '">' +
        '<stop offset="0" stop-color="#fff0f6" stop-opacity="0.7"/>' +
        '<stop offset="0.6" stop-color="#ffdcea" stop-opacity="0.3"/>' +
        '<stop offset="1" stop-color="#ffdcea" stop-opacity="0"/>' +
      '</radialGradient>'
    );
    s += rect(0, 0, W, 430, 'url(#' + sky + ')');
    s += circ(640, 200, 520, 'url(#' + glow + ')');
    /* 远处教学楼（雾中） */
    s += rect(500, 300, 280, 130, '#e6d5cd');
    s += rect(490, 288, 300, 16, '#d4c0b6');
    for (i = 0; i < 6; i++) {
      s += rect(516 + i * 44, 320, 26, 30, '#c3a3a8', 'opacity="0.7"');
      s += rect(516 + i * 44, 366, 26, 30, '#c3a3a8', 'opacity="0.55"');
    }
    s += rect(0, 258, W, 172, 'url(#' + haze + ')');
    /* 地面与石板路 */
    s += rect(0, 428, W, 292, 'url(#' + ground + ')');
    s += poly('540,430 740,430 1040,720 240,720', 'url(#' + stone + ')');
    for (i = 0; i < 7; i++) {
      y = r(452 + i * i * 4 + i * 24);
      var w = 14 + i * 12;
      s += rect(r(640 - w - i * 26), y, r(w * 2), r(5 + i * 1.6), '#f2e2e6', 'opacity="0.3"');
    }
    /* 两侧樱花树 */
    s += tree(520, 456, 0.6, '#544133', '#f0a8c4');
    s += tree(764, 456, 0.6, '#544133', '#f0a8c4');
    s += tree(388, 540, 1.0, '#4c3a2d', '#ee9cbc');
    s += tree(896, 540, 1.0, '#4c3a2d', '#ee9cbc');
    s += tree(180, 668, 1.6, '#453427', '#eb92b4');
    s += tree(1104, 668, 1.6, '#453427', '#eb92b4');
    /* 顶部花冠 */
    s += path('M-20 0 q140 108 330 110 q160 2 250 82 q-300 46 -590 -8 Z', 'url(#' + bloomA + ')');
    s += path('M1300 0 q-150 110 -350 112 q-150 4 -240 80 q300 48 600 -12 Z', 'url(#' + bloomB + ')');
    s += path('M360 0 q120 70 280 72 q150 2 250 -72 Z', 'url(#' + bloomB + ')', 'opacity="0.85"');
    /* 飘落花瓣 */
    for (i = 0; i < 26; i++) {
      x = r(rnd() * 1280);
      y = r(60 + rnd() * 620);
      sc = r(4 + rnd() * 5);
      s += ell(x, y, sc * 1.5, sc, '#fde3ec', 'opacity="' + r(0.5 + rnd() * 0.4) + '" transform="rotate(' + r(rnd() * 60 - 30) + ' ' + x + ' ' + y + ')"');
    }
    /* 地面落花 */
    for (i = 0; i < 14; i++) {
      x = r(360 + rnd() * 560);
      y = r(470 + rnd() * 230);
      s += ell(x, y, r(7 + rnd() * 8), r(4 + rnd() * 4), '#f6d0dc', 'opacity="0.55"');
    }
    /* 柔光斑（bokeh） */
    for (i = 0; i < 7; i++) {
      x = r(80 + rnd() * 1120);
      y = r(90 + rnd() * 420);
      sc = r(30 + rnd() * 60);
      s += circ(x, y, sc, 'url(#' + glow + ')', 'opacity="0.5"');
    }
    /* 长椅 */
    s += rect(230, 596, 190, 14, '#a67a55');
    s += rect(230, 580, 190, 12, '#b98c62');
    s += rect(244, 610, 12, 38, '#7d5a3d');
    s += rect(394, 610, 12, 38, '#7d5a3d');
    s += ell(640, 748, 700, 110, '#2b3320', 'opacity="0.55"');
    return s;
  }, 0.5);

  /* @@SCENES_MORE@@ */

  /* ------------------------------------------------------------ 构建 / API */
  function build(key) {
    var s = DEF[key];
    var i = 0;
    function nm() { i += 1; return 'bg_' + key + '_' + i; }
    var inner = s.make(nm);
    if (s.vig) {
      var v = nm();
      inner = defs(lgGrad(v, 0, 430, 0, 720,
        [[0, '#000000', 0], [0.45, '#000000', r(s.vig * 0.35)], [1, '#000000', s.vig]])) +
        inner + rect(0, 0, W, H, 'url(#' + v + ')');
    }
    return '<svg class="vn-bg-svg" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
      inner + '</svg>';
  }

  function get(key) {
    var k = DEF[key] ? key : 'black';
    if (!CACHE[k]) { CACHE[k] = build(k); }
    return CACHE[k];
  }

  /* --------------------------------------------------------------------
   * 外部扩展：允许后续加载的脚本文件注册更多背景（不覆盖已有 key）
   *
   * 用法：
   *   BGS.register({
   *     sea_day: {
   *       name: '海边·白天', night: false, vig: 0.5,
   *       // nm() 返回一个全局唯一的渐变 id，形如 bg_sea_day_1
   *       make: function (nm) {
   *         var T = BGS.T, g = nm();
   *         return T.defs(T.lgGrad(g, 0, 0, 0, 460, [[0,'#8ecbf0'],[1,'#dcf0ff']])) +
   *                T.rect(0, 0, T.W, T.H, 'url(#' + g + ')');
   *       }
   *     }
   *   });
   *
   * 绘图原语见 BGS.T（W,H,r,stops,lgGrad,rgGrad,defs,rect,path,circ,ell,
   * poly,line,strokePath,txt,cloud,tree,archPath,prng,starField）。
   * 底部压暗由 vig 自动叠加，make 内部不需要自己画 vignette。
   * ------------------------------------------------------------------ */
  function register(map) {
    if (!map) return ORDER.length;
    for (var k in map) {
      if (!map.hasOwnProperty(k)) continue;
      if (DEF[k]) continue;                       // 已存在则不覆盖
      var d = map[k];
      if (typeof d.make !== 'function') continue;
      def(k, d.name || k, d.night, d.make, d.vig);
      delete CACHE[k];
    }
    return ORDER.length;
  }

  var TOOLS = {
    W: W, H: H,
    r: r, stops: stops, lgGrad: lgGrad, rgGrad: rgGrad, defs: defs,
    rect: rect, path: path, circ: circ, ell: ell, poly: poly, line: line,
    strokePath: strokePath, txt: txt, cloud: cloud, tree: tree,
    archPath: archPath, prng: prng, starField: starField
  };

  var API = {
    get: get,
    has: function (key) { return !!DEF[key]; },
    meta: function (key) {
      var d = DEF[key] || DEF['black'];
      return { name: d.name, night: d.night };
    },
    register: register,
    T: TOOLS
  };

  /* KEYS 必须是"实时"的：后续文件通过 register() 追加的背景也要出现在列表里。
     若写成 KEYS: ORDER.slice(0)，那只是模块初始化时的一份快照。 */
  Object.defineProperty(API, 'KEYS', {
    get: function () { return ORDER.slice(0); },
    enumerable: true
  });

  return API;
})();
