/* ============================================================================
 * 《东秦校园人生》 —— VN 场景背景扩展包 B（纯数据 SVG）
 * 依赖 backgrounds.js 的全局 BGS（BGS.register / BGS.T），在其后以普通 script 载入。
 * 载入即注册 9 个新场景（不覆盖已有 key）：station 车站 · home 家 · infirmary 医务室
 *   · supermarket 超市 · park 公园 · lab 机房 · snow_path 雪中校园
 *   · gym 体育馆 · study_room 自习室
 * 约定：make(nm) 只返回 1280x720 的内层标记（以 T.defs 开头）；每个渐变 id 都由该
 *   make 内部的 nm() 生成，跨场景不重复；细节在上方 2/3，下方 1/3 安静偏暗，
 *   底部压暗由 vig 自动叠加；纯手绘图形，无任何外部资源。
 * ========================================================================== */
(function () {
  'use strict';

  if (typeof BGS === 'undefined' || !BGS.register || !BGS.T) { return; }

  var T = BGS.T;
  var W = T.W, H = T.H;
  var r = T.r, lgGrad = T.lgGrad, rgGrad = T.rgGrad, defs = T.defs,
    rect = T.rect, path = T.path, circ = T.circ, ell = T.ell, poly = T.poly,
    line = T.line, strokePath = T.strokePath, txt = T.txt, cloud = T.cloud,
    tree = T.tree, prng = T.prng, starField = T.starField;

  /* --------------------------------------------------------------- 局部图元 */

  /* 冬季枯树：树干 + 四根分枝 + 枝上覆雪（雪为向上偏移的白色细描边） */
  function bareTree(x, y, sc, bark, snow, op) {
    var o = (op === undefined ? '' : ' opacity="' + op + '"');
    var cap = ' stroke-linecap="round"' + o;
    var tk = 'M' + x + ' ' + y + ' q' + r(-5 * sc) + ' ' + r(-68 * sc) + ' ' + r(3 * sc) + ' ' + r(-134 * sc);
    var b1 = 'M' + r(x + sc) + ' ' + r(y - 76 * sc) + ' q' + r(-30 * sc) + ' ' + r(-22 * sc) + ' ' + r(-56 * sc) + ' ' + r(-48 * sc);
    var b2 = 'M' + r(x + 2 * sc) + ' ' + r(y - 96 * sc) + ' q' + r(30 * sc) + ' ' + r(-20 * sc) + ' ' + r(54 * sc) + ' ' + r(-44 * sc);
    var b3 = 'M' + r(x + 3 * sc) + ' ' + r(y - 114 * sc) + ' q' + r(-22 * sc) + ' ' + r(-18 * sc) + ' ' + r(-30 * sc) + ' ' + r(-40 * sc);
    var b4 = 'M' + r(x + 3 * sc) + ' ' + r(y - 126 * sc) + ' q' + r(20 * sc) + ' ' + r(-16 * sc) + ' ' + r(32 * sc) + ' ' + r(-38 * sc);
    var s = strokePath(tk, bark, r(10 * sc), cap) +
      strokePath(b1, bark, r(5.4 * sc), cap) +
      strokePath(b2, bark, r(5.6 * sc), cap) +
      strokePath(b3, bark, r(4.2 * sc), cap) +
      strokePath(b4, bark, r(4 * sc), cap);
    var sf = ' stroke-linecap="round"' + o + ' transform="translate(' + r(-3.2 * sc) + ',' + r(-3.4 * sc) + ')"';
    s += strokePath(tk, snow, r(4.6 * sc), sf) +
      strokePath(b1, snow, r(2.4 * sc), sf) +
      strokePath(b2, snow, r(2.4 * sc), sf) +
      strokePath(b3, snow, r(1.9 * sc), sf) +
      strokePath(b4, snow, r(1.7 * sc), sf);
    s += ell(r(x - 56 * sc), r(y - 124 * sc), r(9 * sc), r(4.4 * sc), snow, o);
    s += ell(r(x + 56 * sc), r(y - 140 * sc), r(8 * sc), r(4 * sc), snow, o);
    s += ell(r(x + 4 * sc), r(y - 136 * sc), r(11 * sc), r(5 * sc), snow, o);
    return s;
  }

  /* 垂柳：树干 + 团状树冠 + 下垂枝条 */
  function willow(x, y, sc, bark, leaf, strand) {
    var s = strokePath('M' + x + ' ' + y + ' q' + r(12 * sc) + ' ' + r(-70 * sc) + ' ' + r(-6 * sc) + ' ' + r(-132 * sc),
      bark, r(15 * sc), 'stroke-linecap="round"');
    s += ell(r(x - 48 * sc), r(y - 150 * sc), r(72 * sc), r(46 * sc), leaf);
    s += ell(r(x + 54 * sc), r(y - 144 * sc), r(66 * sc), r(44 * sc), leaf);
    s += ell(r(x + 4 * sc), r(y - 190 * sc), r(86 * sc), r(54 * sc), leaf);
    var i, sx, sy, len;
    for (i = 0; i < 10; i++) {
      sx = r(x - 104 * sc + i * 22 * sc);
      sy = r(y - 176 * sc + (i % 2) * 12 * sc);
      len = r((96 + (i % 4) * 44) * sc);
      s += strokePath('M' + sx + ' ' + sy + ' q' + r(-28 * sc) + ' ' + r(len * 0.44) + ' ' + r(-7 * sc) + ' ' + len,
        strand, r(3.4 * sc), 'stroke-linecap="round" opacity="0.82"');
    }
    return s;
  }

  /* 坐着的人：头 + 肩背剪影 */
  function sitter(x, y, sc, fill) {
    var s = circ(x, r(y - 40 * sc), r(17 * sc), fill);
    s += path('M' + r(x - 36 * sc) + ' ' + y + ' q' + r(2 * sc) + ' ' + r(-30 * sc) + ' ' + r(36 * sc) + ' ' + r(-30 * sc) +
      ' q' + r(34 * sc) + ' 0 ' + r(36 * sc) + ' ' + r(30 * sc) + ' Z', fill);
    s += rect(r(x - 28 * sc), y, r(56 * sc), r(10 * sc), '#151821', 'opacity="0.9"');
    return s;
  }

  /* ------------------------------------------------------------------ 注册 */

  BGS.register({

    /* ======================================================== 1. 车站 · 黄昏 */
    station: {
      name: '车站', night: false, vig: 0.56,
      make: function (nm) {
        var sky = nm(), sun = nm(), haze = nm(), roof = nm(), canopy = nm(),
          board = nm(), boardG = nm(), ballast = nm(), train = nm(), win = nm(),
          stripe = nm(), floor = nm(), tactile = nm(), lug = nm();
        var i, x;
        var pil = [], pg, lamps = [], lg;
        var rods = [[372, 30], [640, 26], [908, 22], [1176, 20]], pi;
        var defsS =
          lgGrad(sky, 0, 0, 0, 444, [[0, '#31305e'], [0.32, '#7b5286'], [0.6, '#cf7450'], [0.84, '#f0ad64'], [1, '#fbd9a2']]) +
          rgGrad(sun, 216, 300, 262, [[0, '#fff3cf', 0.92], [0.28, '#ffcf86', 0.42], [1, '#ffbb66', 0]]) +
          lgGrad(haze, 0, 300, 0, 444, [[0, '#ffd9a6', 0], [1, '#ffd9a6', 0.86]]) +
          lgGrad(roof, 0, 40, 0, 102, [[0, '#c98a5a'], [0.5, '#a06a44'], [1, '#7a4e32']]) +
          lgGrad(canopy, 0, 102, 0, 158, [[0, '#5e4029'], [1, '#3a2718']]) +
          lgGrad(board, 0, 194, 0, 286, [[0, '#22303c'], [1, '#0d141c']]) +
          rgGrad(boardG, 790, 240, 210, [[0, '#8fd4ff', 0.26], [1, '#8fd4ff', 0]]) +
          lgGrad(ballast, 0, 382, 0, 470, [[0, '#4a443c'], [1, '#221f1b']]) +
          lgGrad(train, 0, 276, 0, 442, [[0, '#f2f6f9'], [0.4, '#c6d0d9'], [1, '#8b96a2']]) +
          lgGrad(win, 0, 314, 0, 362, [[0, '#fff3ce'], [0.5, '#ffd888'], [1, '#ef9f45']]) +
          lgGrad(stripe, 0, 372, 0, 396, [[0, '#e05a4a'], [1, '#a3211a']]) +
          lgGrad(floor, 0, 470, 0, 720, [[0, '#8f8d87'], [0.4, '#6b6963'], [1, '#34332f']]) +
          lgGrad(tactile, 0, 478, 0, 510, [[0, '#e8c14a'], [1, '#ab8419']]) +
          lgGrad(lug, 0, 590, 0, 716, [[0, '#8a5f42'], [0.5, '#6b4630'], [1, '#3f281c']]);
        for (pi = 0; pi < rods.length; pi++) {
          pg = nm();
          defsS += lgGrad(pg, rods[pi][0], 0, r(rods[pi][0] + rods[pi][1]), 0,
            [[0, '#8c6448'], [0.32, '#a87a56'], [0.7, '#5e4029'], [1, '#3a2718']]);
          pil.push(pg);
        }
        for (i = 0; i < 4; i++) {
          x = 430 + i * 230;
          lg = nm();
          defsS += rgGrad(lg, r(x + 75), 128, 128, [[0, '#ffeec6', 0.75], [0.3, '#ffd982', 0.26], [1, '#ffd982', 0]]);
          lamps.push(lg);
        }
        var s = defs(defsS);

        /* 黄昏天空 */
        s += rect(0, 0, W, 444, 'url(#' + sky + ')');
        s += circ(216, 300, 262, 'url(#' + sun + ')');
        s += circ(216, 300, 33, '#fff5d6', 'opacity="0.95"');
        s += cloud(74, 214, 0.95, '#f4c6a2', 0.5);
        s += cloud(322, 166, 0.66, '#e8b598', 0.42);
        s += cloud(1188, 206, 0.78, '#f0c0a0', 0.36);
        s += cloud(556, 120, 0.52, '#e2ab92', 0.3);

        /* 远处站房与对面站台 */
        s += rect(824, 234, 296, 118, '#6a5470', 'opacity="0.82"');
        s += rect(882, 206, 180, 30, '#7a6278', 'opacity="0.78"');
        for (i = 0; i < 7; i++) {
          s += rect(r(846 + i * 38), 258, 20, 26, '#ffd9a0', 'opacity="0.55"');
          s += rect(r(846 + i * 38), 300, 20, 26, '#ffd9a0', 'opacity="0.38"');
        }
        s += rect(556, 344, 724, 40, '#7d6a72', 'opacity="0.9"');
        s += rect(556, 338, 724, 8, '#a58d92', 'opacity="0.7"');
        s += rect(556, 296, 724, 5, '#6f5f74', 'opacity="0.85"');
        s += rect(556, 318, 724, 4, '#6f5f74', 'opacity="0.85"');
        for (i = 0; i < 11; i++) {
          s += rect(r(576 + i * 66), 296, 5, 48, '#63556a', 'opacity="0.8"');
        }
        s += rect(0, 298, W, 148, 'url(#' + haze + ')');

        /* 道砟与钢轨 */
        s += rect(0, 382, W, 88, 'url(#' + ballast + ')');
        var rnd = prng(775511);
        for (i = 0; i < 26; i++) {
          s += ell(r(rnd() * 1280), r(386 + rnd() * 78), r(3 + rnd() * 5), r(1.6 + rnd() * 2.4), '#6b6157', 'opacity="0.4"');
        }
        s += line(0, 404, 1280, 404, '#cfd8de', 4);
        s += line(0, 408, 1280, 408, '#2a2622', 3, 'opacity="0.6"');
        s += line(706, 452, 1280, 452, '#c2ccd3', 5);
        s += line(706, 458, 1280, 458, '#26221e', 4, 'opacity="0.6"');

        /* 列车（远侧股道，横贯左侧） */
        s += rect(36, 276, 664, 166, 'url(#' + train + ')');
        s += rect(36, 276, 664, 14, '#f6fafc');
        s += rect(36, 288, 664, 5, '#9aa5b0');
        s += rect(36, 372, 664, 24, 'url(#' + stripe + ')');
        s += rect(36, 396, 664, 5, '#7a1712');
        for (i = 0; i < 9; i++) {
          x = 62 + i * 72;
          s += rect(x, 312, 46, 50, 'url(#' + win + ')');
          s += rect(x, 312, 46, 7, '#ffffff', 'opacity="0.35"');
          s += rect(r(x - 6), 306, 58, 8, '#adb8c2');
        }
        s += rect(636, 306, 62, 128, '#b6c1cb');
        s += rect(642, 314, 50, 46, 'url(#' + win + ')');
        s += rect(666, 306, 4, 128, '#8d98a3');
        s += rect(36, 442, 664, 16, '#4a5058');
        s += rect(128, 448, 132, 22, '#3a4046');
        s += rect(424, 448, 132, 22, '#3a4046');
        for (i = 0; i < 4; i++) {
          s += circ(r(158 + i * 34), 452, 10, '#2c3136');
          s += circ(r(454 + i * 34), 452, 10, '#2c3136');
        }
        s += ell(360, 468, 340, 16, '#1a1512', 'opacity="0.5"');

        /* 雨棚：屋面 + 檐口 + 底面 + 灯带 */
        s += rect(360, 40, 940, 46, 'url(#' + roof + ')');
        s += rect(360, 84, 940, 18, '#8a5b3c');
        s += rect(360, 84, 940, 4, '#ce9d6e');
        s += rect(360, 102, 940, 56, 'url(#' + canopy + ')');
        s += rect(360, 158, 940, 10, '#2a1b11', 'opacity="0.6"');
        s += rect(560, 44, 340, 36, '#2f4f6f');
        s += rect(566, 50, 328, 24, '#3a6389');
        s += txt(730, 70, '秦皇岛站', '#eaf4ff', 22, 'text-anchor="middle" letter-spacing="6" font-weight="bold"');
        for (i = 0; i < 4; i++) {
          s += rect(r(430 + i * 230), 112, 150, 12, '#ffeec4');
          s += circ(r(505 + i * 230), 128, 128, 'url(#' + lamps[i] + ')');
        }

        /* 雨棚立柱 */
        for (pi = 0; pi < rods.length; pi++) {
          x = rods[pi][0];
          s += rect(x, 150, rods[pi][1], 320, 'url(#' + pil[pi] + ')');
          s += rect(r(x - 6), 142, r(rods[pi][1] + 12), 14, '#5a3c28');
          s += rect(r(x - 8), 440, r(rods[pi][1] + 16), 30, '#4f3524');
        }

        /* 悬挂式车次显示牌 */
        s += rect(700, 158, 6, 36, '#4a4238');
        s += rect(858, 158, 6, 36, '#4a4238');
        s += circ(790, 240, 210, 'url(#' + boardG + ')');
        s += rect(656, 188, 252, 108, '#232a32');
        s += rect(662, 194, 240, 96, 'url(#' + board + ')');
        s += rect(662, 194, 240, 4, '#4c5c6c');
        s += txt(676, 218, 'G1234', '#8ee8b4', 15, 'letter-spacing="1"');
        s += txt(756, 218, '19:42', '#ffd98a', 15);
        s += txt(824, 218, '检票中', '#8ee8b4', 14);
        s += txt(676, 244, 'D8772', '#8ee8b4', 15, 'letter-spacing="1"');
        s += txt(756, 244, '20:05', '#ffd98a', 15);
        s += txt(824, 244, '正 点', '#c3d2de', 14);
        s += txt(676, 270, 'K336', '#8ee8b4', 15, 'letter-spacing="1"');
        s += txt(756, 270, '20:48', '#ffd98a', 15);
        s += txt(824, 270, '晚点', '#f0a07a', 13);

        /* 站台地面 */
        s += rect(0, 470, W, 250, 'url(#' + floor + ')');
        s += rect(0, 464, W, 7, '#bdb8ac');
        s += rect(0, 471, W, 5, '#4a4740', 'opacity="0.5"');
        s += rect(0, 478, W, 32, 'url(#' + tactile + ')');
        for (i = 0; i < 20; i++) {
          s += rect(r(14 + i * 64), 486, 30, 15, '#a37f18', 'opacity="0.35"');
        }
        s += rect(0, 478, W, 3, '#f2dd93', 'opacity="0.5"');
        for (i = 0; i < 4; i++) {
          s += rect(0, r(548 + i * 56), W, 3, '#5c5a53', 'opacity="0.35"');
        }
        s += strokePath('M300 470 L180 720', '#5c5a53', 3, 'opacity="0.3"');
        s += strokePath('M640 470 L640 720', '#5c5a53', 3, 'opacity="0.3"');
        s += strokePath('M980 470 L1100 720', '#5c5a53', 3, 'opacity="0.3"');
        for (i = 0; i < 4; i++) {
          s += ell(r(505 + i * 230), 524, 200, 42, '#ffdca0', 'opacity="0.07"');
        }

        /* 近景行李 */
        s += rect(96, 592, 104, 122, 'url(#' + lug + ')');
        s += rect(104, 600, 88, 30, '#a5764f', 'opacity="0.5"');
        s += strokePath('M132 592 L132 566 q0 -16 20 -16 q20 0 20 16 L172 592', '#3f444a', 7, 'stroke-linecap="round"');
        s += circ(114, 718, 11, '#2f343a');
        s += circ(182, 718, 11, '#2f343a');
        s += path('M252 700 q0 -66 78 -66 q78 0 78 66 Z', '#5d6f7d');
        s += rect(304, 634, 52, 20, '#7d8f9c');
        s += rect(330, 620, 12, 16, '#8d9aa6');
        s += path('M1092 700 q0 -74 44 -74 q44 0 44 74 Z', '#4f6a7d');
        s += rect(1100, 648, 72, 14, '#5f7a8d');
        s += rect(1134, 622, 10, 30, '#6f8a9d');
        s += rect(1176, 618, 8, 82, '#7a6a56');
        s += circ(1180, 614, 9, '#8d7a63');
        s += ell(130, 730, 320, 92, '#1a1410', 'opacity="0.45"');
        s += ell(1160, 738, 340, 98, '#1a1410', 'opacity="0.4"');
        return s;
      }
    },

    /* ============================================================== 2. 家 */
    home: {
      name: '家', night: false, vig: 0.5,
      make: function (nm) {
        var wall = nm(), ceil = nm(), floor = nm(), win = nm(), beam = nm(),
          sofa = nm(), arm = nm(), wood = nm(), tv = nm(), rug = nm(),
          lampG = nm(), plant = nm(), screenG = nm();
        var i;
        var s = defs(
          lgGrad(wall, 0, 0, 0, 540, [[0, '#f8ecd9'], [0.5, '#eeddc2'], [1, '#dcc4a2']]) +
          lgGrad(ceil, 0, 0, 0, 74, [[0, '#fdf7ea'], [1, '#ecdfc8']]) +
          lgGrad(floor, 0, 536, 0, 720, [[0, '#b98756'], [0.42, '#96683c'], [1, '#543520']]) +
          lgGrad(win, 0, 122, 0, 424, [[0, '#8ec9ef'], [0.55, '#cfe9fa'], [1, '#f4fbff']]) +
          lgGrad(beam, 80, 130, 560, 700, [[0, '#fff8dc', 0.42], [1, '#fff8dc', 0]]) +
          lgGrad(sofa, 0, 366, 0, 560, [[0, '#c9d8ce'], [0.45, '#a9bdb0'], [1, '#7d9488']]) +
          lgGrad(arm, 0, 396, 0, 552, [[0, '#b3c7ba'], [1, '#6f867a']]) +
          lgGrad(wood, 0, 296, 0, 570, [[0, '#c79a68'], [0.5, '#a87a4c'], [1, '#6f4a2a']]) +
          lgGrad(tv, 0, 308, 0, 444, [[0, '#3a4a5c'], [0.55, '#1c2632'], [1, '#0c1218']]) +
          lgGrad(rug, 0, 606, 0, 700, [[0, '#c8ad8e'], [1, '#a58a6c']]) +
          rgGrad(lampG, 1210, 352, 240, [[0, '#ffe0a4', 0.9], [0.3, '#ffcb72', 0.32], [1, '#ffcb72', 0]]) +
          rgGrad(screenG, 1066, 380, 220, [[0, '#9fd0e8', 0.3], [1, '#9fd0e8', 0]]) +
          lgGrad(plant, 0, 520, 0, 610, [[0, '#5f9c50'], [1, '#34682f']])
        );
        /* 墙面 / 天花 / 地面 / 踢脚 */
        s += rect(0, 0, W, 540, 'url(#' + wall + ')');
        s += rect(0, 0, W, 74, 'url(#' + ceil + ')');
        s += rect(0, 70, W, 8, '#cdbb9c');
        s += rect(0, 536, W, 184, 'url(#' + floor + ')');
        for (i = 0; i < 6; i++) {
          s += rect(0, r(556 + i * 30), W, 3, '#7d5632', 'opacity="0.45"');
        }
        for (i = 0; i < 10; i++) {
          s += rect(r(52 + i * 132), 536, 3, 184, '#7d5632', 'opacity="0.26"');
        }
        s += rect(0, 518, W, 20, '#c2ab8c');
        s += rect(0, 512, W, 6, '#d8c6a6');
        /* 左侧窗与窗帘 */
        s += rect(58, 108, 336, 330, '#f2e7d3');
        s += rect(70, 120, 312, 306, 'url(#' + win + ')');
        s += rect(220, 120, 12, 306, '#f6efdf');
        s += rect(70, 264, 312, 12, '#f6efdf');
        s += rect(70, 120, 312, 14, '#ffffff', 'opacity="0.5"');
        s += rect(44, 430, 364, 18, '#e6d7bb');
        s += rect(44, 444, 364, 12, '#c9b797');
        s += poly('80,132 360,132 640,720 200,720', 'url(#' + beam + ')');
        s += path('M74 100 q46 108 26 336 l-42 0 q16 -232 -20 -336 Z', '#e9caa6');
        s += strokePath('M60 116 q40 106 22 320', '#d3b08a', 3, 'opacity="0.7"');
        s += path('M378 100 q-46 108 -26 336 l42 0 q-16 -232 20 -336 Z', '#e9caa6');
        s += strokePath('M392 116 q-40 106 -22 320', '#d3b08a', 3, 'opacity="0.7"');
        s += rect(30, 92, 392, 14, '#9a8365');
        /* 墙上的全家福 */
        s += rect(500, 112, 190, 150, '#c9a26a');
        s += rect(512, 124, 166, 126, '#f7f0e0');
        s += rect(524, 136, 142, 90, '#dfe9f0');
        s += circ(566, 196, 15, '#8a6a52');
        s += path('M546 226 q2 -26 20 -26 q18 0 20 26 Z', '#b8564a');
        s += circ(596, 202, 12, '#9a7a60');
        s += path('M580 226 q2 -22 16 -22 q14 0 16 22 Z', '#4f7fa8');
        s += circ(626, 206, 9, '#8a6a52');
        s += path('M614 226 q1 -18 12 -18 q11 0 12 18 Z', '#7d6a94');
        s += txt(595, 252, '全家福', '#a58a6a', 13, 'text-anchor="middle" letter-spacing="2"');
        /* 地毯 */
        s += ell(600, 646, 420, 82, 'url(#' + rug + ')');
        s += ell(600, 646, 330, 60, '#b8564a', 'opacity="0.85"');
        s += ell(600, 646, 240, 42, '#e0cdb2');
        s += ell(600, 646, 150, 26, '#b8564a', 'opacity="0.7"');
        /* 沙发 */
        s += rect(300, 366, 560, 96, 'url(#' + sofa + ')');
        s += rect(300, 356, 560, 20, '#9db0a6');
        s += rect(288, 448, 584, 62, 'url(#' + sofa + ')');
        s += rect(126, 392, 62, 152, 'url(#' + arm + ')');
        s += rect(972, 392, 62, 152, 'url(#' + arm + ')');
        s += rect(126, 388, 62, 16, '#a9bdb0');
        s += rect(972, 388, 62, 16, '#a9bdb0');
        s += rect(190, 448, 244, 58, '#c7d6cc');
        s += rect(438, 448, 244, 58, '#c7d6cc');
        s += rect(190, 448, 244, 10, '#dbe6de', 'opacity="0.7"');
        s += rect(438, 448, 244, 10, '#dbe6de', 'opacity="0.7"');
        s += rect(332, 386, 236, 64, '#bccdc2', 'opacity="0.9"');
        s += rect(576, 386, 236, 64, '#bccdc2', 'opacity="0.9"');
        s += rect(196, 500, 18, 44, '#6f5a40');
        s += rect(938, 500, 18, 44, '#6f5a40');
        s += rect(352, 500, 16, 42, '#6f5a40');
        s += rect(790, 500, 16, 42, '#6f5a40');
        s += rect(224, 400, 96, 92, '#d9a441', 'opacity="0.95" transform="rotate(-9 272 446)"');
        s += rect(736, 402, 92, 88, '#4f8f8a', 'opacity="0.95" transform="rotate(8 782 446)"');
        s += ell(272, 446, 40, 34, '#e8bc66', 'opacity="0.35"');
        s += ell(782, 446, 38, 32, '#7fb3ae', 'opacity="0.3"');
        /* 茶几（近景） */
        s += rect(486, 594, 320, 18, '#c79a68');
        s += rect(486, 592, 320, 6, '#dcb98a');
        s += rect(512, 612, 14, 92, '#8a5f3a');
        s += rect(766, 612, 14, 92, '#8a5f3a');
        s += rect(546, 566, 42, 28, '#f2ece0');
        s += ell(567, 568, 21, 8, '#e0d6c4');
        s += rect(618, 578, 108, 16, '#8f4f4a');
        s += rect(624, 572, 96, 8, '#c9b7a0');
        s += ell(742, 584, 30, 12, '#8fae62');
        /* 电视柜与电视 */
        s += rect(880, 486, 340, 96, 'url(#' + wood + ')');
        s += rect(880, 478, 340, 14, '#d5b08a');
        s += rect(892, 508, 154, 60, '#a87a4c');
        s += rect(1054, 508, 154, 60, '#a87a4c');
        s += rect(892, 508, 154, 6, '#c69a6a');
        s += rect(1054, 508, 154, 6, '#c69a6a');
        s += circ(968, 540, 8, '#e8dcc4');
        s += circ(1130, 540, 8, '#e8dcc4');
        s += rect(1090, 448, 78, 34, '#3a4048');
        s += rect(1096, 454, 66, 6, '#5c6470');
        s += circ(1160, 468, 4, '#6fe0a0');
        s += circ(1066, 380, 220, 'url(#' + screenG + ')');
        s += rect(906, 314, 300, 154, '#20262e');
        s += rect(916, 324, 280, 134, 'url(#' + tv + ')');
        s += poly('916,458 1196,324 1196,352 940,458', '#ffffff', 'opacity="0.07"');
        s += rect(1030, 468, 52, 10, '#2a3038');
        s += rect(1000, 476, 112, 12, '#333a44');
        s += circ(1216, 330, 4, '#ff5a4a');
        /* 落地灯（右侧暖光） */
        s += rect(1206, 296, 9, 320, '#6d6a62');
        s += ell(1210, 616, 46, 13, '#5c5952');
        s += poly('1160,296 1262,296 1276,346 1146,346', '#f2e2be');
        s += rect(1158, 292, 106, 8, '#c9b48f');
        s += circ(1210, 356, 240, 'url(#' + lampG + ')');
        s += ell(1210, 616, 190, 38, '#ffc978', 'opacity="0.13"');
        /* 角落绿植 */
        s += path('M96 604 q-4 -46 26 -66 q30 -20 34 22 Z', 'url(#' + plant + ')');
        s += path('M110 604 q-38 -30 -22 -68 q34 -6 34 50 Z', '#4f8a44');
        s += path('M110 604 q34 -44 66 -30 q4 34 -56 40 Z', '#3f7a3a');
        s += path('M104 604 q-26 -20 -34 4 q10 16 30 8 Z', '#5f9c50');
        s += path('M74 608 l72 0 l-12 78 l-48 0 Z', '#b8764f');
        s += rect(66, 600, 88, 14, '#cf8a5c');
        s += ell(600, 700, 520, 60, '#3f2a1a', 'opacity="0.35"');
        return s;
      }
    },

    /* ========================================================== 3. 医务室 */
    infirmary: {
      name: '医务室', night: false, vig: 0.5,
      make: function (nm) {
        var wall = nm(), wain = nm(), floor = nm(), win = nm(), shaft = nm(),
          glass = nm(), sheet = nm(), metal = nm(), curtain = nm(), board = nm(),
          counter = nm(), poster = nm();
        var i, j, x, y;
        var s = defs(
          lgGrad(wall, 0, 0, 0, 392, [[0, '#eef7f2'], [0.6, '#dcebe3'], [1, '#c3d9ce']]) +
          lgGrad(wain, 0, 380, 0, 478, [[0, '#cde0d5'], [1, '#aec9ba']]) +
          lgGrad(floor, 0, 470, 0, 720, [[0, '#ccd9d3'], [0.4, '#a8b8b1'], [1, '#6f7d77']]) +
          lgGrad(win, 0, 124, 0, 346, [[0, '#a6d3ee'], [0.55, '#d6ecf8'], [1, '#f4fbff']]) +
          lgGrad(shaft, 120, 140, 640, 720, [[0, '#ffffff', 0.32], [1, '#ffffff', 0]]) +
          lgGrad(glass, 0, 116, 0, 312, [[0, '#e2f1ec', 0.9], [1, '#cfe6de', 0.8]]) +
          lgGrad(sheet, 0, 412, 0, 468, [[0, '#ffffff'], [0.5, '#eaf1ee'], [1, '#adbfb7']]) +
          lgGrad(metal, 0, 372, 0, 660, [[0, '#cfd8d3'], [0.45, '#9aa7a1'], [1, '#5c6864']]) +
          lgGrad(curtain, 0, 180, 0, 620, [[0, '#fbfdfb'], [0.5, '#e0e9e5'], [1, '#aebfb8']]) +
          lgGrad(board, 0, 232, 0, 320, [[0, '#2f4f6f'], [1, '#1d3450']]) +
          lgGrad(counter, 0, 452, 0, 470, [[0, '#f7fbf8'], [1, '#dbe6e0']]) +
          lgGrad(poster, 0, 118, 0, 300, [[0, '#ffffff'], [1, '#e2efe8']])
        );
        /* 墙 / 护墙板 / 地面 */
        s += rect(0, 0, W, 392, 'url(#' + wall + ')');
        s += rect(0, 380, W, 98, 'url(#' + wain + ')');
        s += rect(0, 376, W, 7, '#a8c6b6');
        s += rect(0, 474, W, 7, '#8fa89a');
        s += rect(0, 470, W, 250, 'url(#' + floor + ')');
        for (i = 0; i < 5; i++) {
          s += rect(0, r(500 + i * 46), W, 3, '#7d8d86', 'opacity="0.5"');
        }
        for (i = 0; i < 6; i++) {
          s += rect(r(60 + i * 220), 470, 3, 250, '#7d8d86', 'opacity="0.4"');
        }
        /* 左侧窗（半拉百叶）与光带 */
        s += rect(70, 112, 306, 246, '#eef4f0');
        s += rect(82, 124, 282, 222, 'url(#' + win + ')');
        s += rect(216, 124, 11, 222, '#f6fbf8');
        s += rect(58, 354, 330, 16, '#f4faf6');
        s += rect(58, 366, 330, 10, '#d3e0d9');
        for (i = 0; i < 5; i++) {
          s += rect(84, r(128 + i * 17), 278, 11, '#eef6f1', 'opacity="0.9"');
        }
        s += rect(82, 212, 282, 8, '#cfe0d8');
        s += poly('86,136 360,136 700,720 250,720', 'url(#' + shaft + ')');
        /* 壁挂药品柜 */
        s += rect(430, 100, 274, 228, '#eaf3ee');
        s += rect(438, 108, 258, 212, '#dcebe4');
        s += rect(446, 116, 118, 196, 'url(#' + glass + ')');
        s += rect(572, 116, 118, 196, 'url(#' + glass + ')');
        s += rect(564, 116, 8, 196, '#c3d6cd');
        s += rect(568, 168, 8, 60, '#a8bfb6');
        s += rect(568, 240, 8, 60, '#a8bfb6');
        for (i = 0; i < 3; i++) {
          y = 156 + i * 62;
          s += rect(452, y, 106, 4, '#c9dcd3');
          s += rect(578, y, 106, 4, '#c9dcd3');
          for (j = 0; j < 4; j++) {
            s += rect(r(458 + j * 26), r(y - 34), 18, 32, ['#d97a6a', '#7fa8d9', '#e8d07a', '#8fc9a8'][(i + j) % 4], 'opacity="0.85"');
            s += rect(r(584 + j * 26), r(y - 30), 18, 28, ['#7fa8d9', '#8fc9a8', '#d97a6a', '#c9a8d9'][(i + j) % 4], 'opacity="0.85"');
          }
        }
        s += rect(430, 96, 274, 10, '#d3e4dc');
        /* 墙上海报与挂钟 */
        s += rect(752, 112, 196, 176, '#eaf4ef');
        s += rect(760, 120, 180, 160, 'url(#' + poster + ')');
        s += rect(760, 120, 180, 34, '#3f8f78');
        s += txt(850, 145, '预防流感', '#f0fbf6', 17, 'text-anchor="middle" letter-spacing="2" font-weight="bold"');
        s += txt(774, 178, '· 勤洗手  多通风', '#5f7a70', 13);
        s += txt(774, 202, '· 发热及时就医', '#5f7a70', 13);
        s += txt(774, 226, '· 按时作息  多喝水', '#5f7a70', 13);
        s += circ(864, 252, 20, '#cfe6de');
        s += circ(864, 252, 13, '#eef7f2');
        s += strokePath('M864 252 L864 242', '#7d9a8e', 2.5);
        s += strokePath('M864 252 L872 256', '#7d9a8e', 2.5);
        /* 帘轨（帘布稍后压在床上方） */
        s += rect(628, 82, 640, 10, '#c9d4ce');
        s += rect(628, 90, 640, 4, '#a8b6b0');
        for (i = 0; i < 9; i++) {
          s += circ(r(660 + i * 68), 96, 5, '#8fa8a0');
        }
        /* 检查床（先落影，再压床体） */
        s += ell(790, 434, 330, 62, '#adc3b8', 'opacity="0.45"');
        s += ell(806, 660, 336, 28, '#5f7a70', 'opacity="0.26"');
        s += rect(500, 372, 26, 190, 'url(#' + metal + ')');
        s += rect(1082, 382, 24, 176, 'url(#' + metal + ')');
        s += rect(526, 408, 556, 6, '#aebdb6');
        s += rect(526, 412, 556, 56, 'url(#' + sheet + ')');
        s += rect(526, 412, 556, 10, '#ffffff');
        s += rect(540, 388, 194, 30, '#ffffff');
        s += rect(540, 414, 194, 8, '#d8e2dd');
        s += rect(872, 400, 210, 68, '#cfe0ee');
        s += rect(872, 400, 210, 10, '#e2eef8');
        s += strokePath('M872 434 q106 10 210 0', '#a9c3d8', 3, 'opacity="0.8"');
        s += rect(526, 462, 556, 8, '#93a49d');
        s += rect(526, 468, 556, 10, '#a8b8b1');
        s += rect(516, 476, 14, 176, 'url(#' + metal + ')');
        s += rect(1078, 476, 14, 176, 'url(#' + metal + ')');
        s += rect(516, 536, 578, 10, '#cdd8d3');
        s += circ(526, 656, 13, '#7a8480');
        s += circ(1082, 656, 13, '#7a8480');
        s += circ(526, 656, 5, '#a8b2ae');
        s += circ(1082, 656, 5, '#a8b2ae');
        /* 输液架 */
        s += rect(468, 236, 7, 430, 'url(#' + metal + ')');
        s += strokePath('M471 240 q34 -18 60 -6', '#b9c4bf', 6, 'stroke-linecap="round"');
        s += path('M528 232 q16 -4 30 6 l0 54 q-14 10 -30 4 Z', '#e8e2b0', 'opacity="0.9"');
        s += strokePath('M544 296 q4 120 30 190', '#dfe8e4', 3, 'opacity="0.8"');
        s += circ(468, 668, 12, '#8b9490');
        /* 推车与器械 */
        s += rect(78, 528, 196, 14, '#e2ebe6');
        s += rect(78, 592, 196, 10, '#d3deda');
        s += rect(90, 542, 8, 150, '#b9c4bf');
        s += rect(252, 542, 8, 150, '#b9c4bf');
        s += circ(96, 700, 12, '#8b9490');
        s += circ(258, 700, 12, '#8b9490');
        s += rect(96, 496, 76, 30, '#cfe0d8');
        s += rect(104, 502, 60, 8, '#a8c4b8');
        s += rect(188, 500, 34, 26, '#dfe8e4');
        s += rect(192, 490, 26, 12, '#8fb8d9');
        s += rect(238, 494, 26, 32, '#e8e2d0', 'opacity="0.95"');
        s += rect(244, 486, 14, 10, '#7a9a8e');
        /* 台式监护仪 */
        s += rect(320, 424, 132, 96, '#dfe8e4');
        s += rect(330, 434, 112, 76, '#1e2c34');
        s += strokePath('M338 490 q18 -34 30 -6 q12 26 24 -30 q10 -22 22 8 q8 18 18 -4', '#5fe0a8', 3);
        s += rect(366, 520, 40, 8, '#b9c4bf');
        s += rect(380, 528, 12, 130, '#a8b4af');
        s += ell(386, 664, 44, 12, '#9aa8a2');
        /* 白帘拉在床尾之前 */
        s += path('M1006 100 q-26 60 -18 140 q10 220 -6 480 l206 0 l0 -620 Z', 'url(#' + curtain + ')');
        s += strokePath('M1010 108 q-18 250 -8 608', '#a4b5ae', 3, 'opacity="0.85"');
        s += strokePath('M1046 106 q-16 260 -10 610', '#a4b5ae', 3, 'opacity="0.75"');
        s += strokePath('M1084 104 q-14 268 -8 612', '#a4b5ae', 3, 'opacity="0.7"');
        s += strokePath('M1124 104 q-12 270 -6 612', '#a4b5ae', 3, 'opacity="0.7"');
        s += strokePath('M1164 104 q-10 272 -4 612', '#a4b5ae', 3, 'opacity="0.65"');
        s += strokePath('M1206 104 q-8 274 -2 612', '#a4b5ae', 3, 'opacity="0.6"');
        s += rect(1100, 92, 96, 22, '#e6f0eb', 'opacity="0.95"');
        s += ell(1080, 640, 260, 40, '#8fa8a0', 'opacity="0.25"');
        /* 地面柔光与近景 */
        s += ell(640, 700, 620, 76, '#5f7a70', 'opacity="0.2"');
        s += ell(240, 720, 300, 60, '#4f6a60', 'opacity="0.22"');
        return s;
      }
    },

    /* ============================================================ 4. 超市 */
    supermarket: {
      name: '超市', night: false, vig: 0.5,
      make: function (nm) {
        var ceil = nm(), wall = nm(), floor = nm(), strip = nm(), shelf = nm(),
          chilly = nm(), chillyGlass = nm(), aisleG = nm(), sign = nm(),
          metal = nm(), product = nm();
        var i, j, x, y, sy, px, ph, rnd = prng(20240901);
        var pal = ['#d9534f', '#4f8fd9', '#e8c05a', '#6fbf8a', '#b06fd9', '#e8894f', '#4fb8c9', '#d95f8a'];
        var lights = [], lg;
        var defsS =
          lgGrad(ceil, 0, 0, 0, 132, [[0, '#f6f9fa'], [1, '#d5dfe3']]) +
          lgGrad(wall, 0, 132, 0, 430, [[0, '#eef3f5'], [0.6, '#dfe7ea'], [1, '#c6d1d6']]) +
          lgGrad(floor, 0, 430, 0, 720, [[0, '#e6ecef'], [0.35, '#cfd8dd'], [1, '#98a5ac']]) +
          lgGrad(strip, 0, 54, 0, 74, [[0, '#fffef4'], [1, '#f2ecc9']]) +
          lgGrad(shelf, 0, 150, 0, 420, [[0, '#fbfdfd'], [1, '#d3dcdf']]) +
          lgGrad(chilly, 0, 156, 0, 466, [[0, '#eaf7fd'], [0.5, '#c2e0ee'], [1, '#8fb4c6']]) +
          lgGrad(chillyGlass, 0, 156, 0, 466, [[0, '#ffffff', 0.5], [0.5, '#d8eef9', 0.28], [1, '#a8ccdd', 0.2]]) +
          lgGrad(aisleG, 640, 434, 640, 720, [[0, '#ffffff', 0.2], [1, '#ffffff', 0]]) +
          lgGrad(sign, 0, 62, 0, 106, [[0, '#3a8fd0'], [1, '#1f5f96']]) +
          lgGrad(metal, 0, 470, 0, 620, [[0, '#eef2f4'], [1, '#b9c3c8']]) +
          lgGrad(product, 0, 0, 0, 40, [[0, '#ffffff', 0.3], [1, '#ffffff', 0]]);
        for (i = 0; i < 3; i++) {
          x = 140 + i * 380;
          lg = nm();
          defsS += rgGrad(lg, r(x + 130), 96, 250, [[0, '#fffdf0', 0.72], [0.35, '#fff6cf', 0.24], [1, '#fff6cf', 0]]);
          lights.push(lg);
        }
        var s = defs(defsS);
        /* 天花与灯带 */
        s += rect(0, 0, W, 132, 'url(#' + ceil + ')');
        s += rect(0, 128, W, 8, '#c3ccd0');
        for (i = 0; i < 3; i++) {
          x = 140 + i * 380;
          s += rect(x, 54, 260, 20, 'url(#' + strip + ')');
          s += rect(x, 48, 260, 8, '#c8d2d7');
          s += ell(r(x + 130), 96, 250, 74, 'url(#' + lights[i] + ')');
        }
        /* 后墙与货架商品 */
        s += rect(0, 132, W, 300, 'url(#' + wall + ')');
        s += rect(96, 138, 880, 288, 'url(#' + shelf + ')');
        for (i = 0; i < 4; i++) {
          sy = r(158 + i * 66);
          s += rect(104, sy, 864, 56, '#f4f8f9');
          s += rect(104, r(sy + 56), 864, 8, '#c3ccd0');
          s += rect(104, r(sy + 60), 864, 6, '#f2d873');
          for (j = 0; j < 14; j++) {
            px = r(112 + j * 60);
            ph = r(30 + rnd() * 18);
            s += rect(px, r(sy + 56 - ph), 44, ph, pal[(i * 3 + j) % 8], 'opacity="0.92"');
            s += rect(px, r(sy + 56 - ph), 44, r(ph * 0.26), '#ffffff', 'opacity="0.26"');
            s += rect(px, r(sy + 44), 44, 5, '#8fa0a8', 'opacity="0.35"');
          }
        }
        s += rect(96, 134, 880, 10, '#c3ccd0');
        /* 吊挂分区指示牌 */
        s += rect(474, 96, 8, 34, '#8d9aa2');
        s += rect(794, 96, 8, 34, '#8d9aa2');
        s += rect(430, 62, 400, 44, '#2f5f8f');
        s += rect(436, 68, 388, 32, 'url(#' + sign + ')');
        s += txt(630, 93, '饮料 · 零食 · 日用', '#eaf6ff', 20, 'text-anchor="middle" letter-spacing="3"');
        s += rect(74, 88, 8, 42, '#8d9aa2');
        s += rect(230, 88, 8, 42, '#8d9aa2');
        s += rect(50, 56, 204, 36, '#2f7fbf');
        s += txt(152, 81, '生鲜', '#f0f9ff', 19, 'text-anchor="middle" letter-spacing="4"');
        /* 地面 */
        s += rect(0, 430, W, 290, 'url(#' + floor + ')');
        for (i = 0; i < 5; i++) {
          s += rect(0, r(486 + i * 50), W, 3, '#a8b4ba', 'opacity="0.5"');
        }
        s += strokePath('M300 430 L240 720', '#a8b4ba', 3, 'opacity="0.4"');
        s += strokePath('M640 430 L640 720', '#a8b4ba', 3, 'opacity="0.4"');
        s += strokePath('M980 430 L1140 720', '#a8b4ba', 3, 'opacity="0.4"');
        s += poly('256,434 1024,434 1280,720 0,720', 'url(#' + aisleG + ')');
        for (i = 0; i < 3; i++) {
          s += ell(r(270 + i * 380), 512, 190, 34, '#fff6cf', 'opacity="0.12"');
        }
        /* 左侧近处货架（透视） */
        s += poly('0,448 176,430 176,720 0,720', '#cfd8dd');
        s += poly('0,268 176,256 176,430 0,448', '#e8eef0');
        for (i = 0; i < 3; i++) {
          sy = r(300 + i * 82);
          s += rect(6, sy, 164, 6, '#b9c4c9');
          for (j = 0; j < 4; j++) {
            s += rect(r(14 + j * 40), r(sy - 40), 32, 36, pal[(i + j * 3) % 8], 'opacity="0.9"');
            s += rect(r(14 + j * 40), r(sy - 40), 32, 7, '#ffffff', 'opacity="0.25"');
          }
          s += rect(6, r(sy + 4), 164, 5, '#f2d873');
        }
        s += rect(0, 256, 176, 14, '#c3ccd0');
        /* 右侧饮料冷藏柜 */
        s += rect(1000, 146, 274, 330, 'url(#' + metal + ')');
        s += rect(1010, 156, 254, 310, 'url(#' + chilly + ')');
        for (i = 0; i < 4; i++) {
          y = r(196 + i * 64);
          s += rect(1016, y, 242, 5, '#b9d4e0');
          for (j = 0; j < 6; j++) {
            s += rect(r(1022 + j * 40), r(y - 46), 28, 44, pal[(i * 2 + j) % 8], 'opacity="0.9"');
            s += rect(r(1022 + j * 40), r(y - 46), 28, 8, '#f2f7fa', 'opacity="0.55"');
            s += rect(r(1022 + j * 40), r(y - 54), 28, 8, '#dfe9ee', 'opacity="0.7"');
          }
        }
        s += rect(1010, 156, 254, 310, 'url(#' + chillyGlass + ')');
        s += rect(1132, 156, 6, 310, '#b9ccd6');
        s += rect(1002, 162, 10, 300, '#8fb0bf');
        s += rect(1262, 162, 10, 300, '#8fb0bf');
        s += rect(1000, 142, 274, 12, '#cfd8dd');
        s += poly('1018,160 1046,160 1002,466 986,466', '#ffffff', 'opacity="0.16"');
        /* 收银台（近景右） */
        s += rect(830, 560, 450, 26, 'url(#' + metal + ')');
        s += rect(830, 586, 450, 134, '#c2ccd1');
        s += rect(846, 596, 418, 40, '#5c6a72');
        s += rect(846, 596, 418, 6, '#8d9aa2');
        s += rect(846, 646, 418, 26, '#b3bdc2');
        s += rect(890, 480, 130, 80, '#2a3238');
        s += rect(898, 488, 114, 64, '#3f6f7f');
        s += txt(955, 528, '¥ 12.50', '#dff6e8', 17, 'text-anchor="middle"');
        s += rect(936, 560, 40, 8, '#8d9aa2');
        s += rect(1010, 548, 30, 14, '#e8e2d0');
        s += rect(1150, 556, 96, 10, '#8d9aa2');
        s += rect(1180, 542, 40, 20, '#e05a4a');
        /* 近景购物篮 */
        s += poly('180,652 400,652 372,712 208,712', '#4f8fd9');
        s += poly('192,662 388,662 364,702 216,702', '#6fa8e8', 'opacity="0.75"');
        for (i = 0; i < 4; i++) {
          s += rect(r(214 + i * 46), 662, 5, 40, '#dbe8f7', 'opacity="0.55"');
        }
        s += rect(180, 640, 220, 14, '#3f7fbf');
        s += rect(258, 610, 64, 30, '#e05a4a');
        s += rect(334, 618, 54, 22, '#e8c05a');
        s += rect(20, 636, 24, 8, '#8d9aa2');
        s += strokePath('M20 640 L64 690 L120 690', '#8d9aa2', 8, 'stroke-linecap="round"');
        s += ell(640, 726, 700, 62, '#4a565c', 'opacity="0.4"');
        return s;
      }
    },

    /* ============================================================ 5. 公园 */
    park: {
      name: '公园', night: false, vig: 0.5,
      make: function (nm) {
        var sky = nm(), sun = nm(), hill = nm(), hill2 = nm(), haze = nm(),
          lake = nm(), grass = nm(), stone = nm(), roof = nm(),
          leaf = nm(), strand = nm(), glow = nm(), bark = nm();
        var i, x, y, w2;
        var rnd = prng(61504);
        var s = defs(
          lgGrad(sky, 0, 0, 0, 420, [[0, '#5aa9e2'], [0.5, '#a8dbf5'], [0.82, '#e2f4f0'], [1, '#f4fbe9']]) +
          rgGrad(sun, 1010, 116, 330, [[0, '#fffce6', 0.9], [0.32, '#fff3bc', 0.34], [1, '#fff3bc', 0]]) +
          lgGrad(hill, 0, 306, 0, 396, [[0, '#9dc3b8'], [1, '#7ea99e']]) +
          lgGrad(hill2, 0, 338, 0, 408, [[0, '#88b3a4'], [1, '#6b968a']]) +
          lgGrad(haze, 0, 320, 0, 424, [[0, '#eef8ef', 0], [1, '#eef8ef', 0.9]]) +
          lgGrad(lake, 0, 424, 0, 604, [[0, '#d8eef6'], [0.3, '#a8d2e4'], [0.72, '#6f9fb8'], [1, '#4a7a94']]) +
          lgGrad(grass, 0, 596, 0, 720, [[0, '#8fae62'], [0.45, '#6f8f48'], [1, '#33441f']]) +
          lgGrad(stone, 0, 604, 0, 720, [[0, '#cfc9b6'], [0.45, '#a8a190'], [1, '#5f5b4e']]) +
          lgGrad(roof, 0, 278, 0, 384, [[0, '#6fa4ae'], [1, '#3a6873']]) +
          lgGrad(leaf, 0, 460, 0, 660, [[0, '#6fae52'], [1, '#2f6a2c']]) +
          lgGrad(bark, 0, 470, 0, 700, [[0, '#8a6f52'], [1, '#4a3826']]) +
          lgGrad(strand, 0, 480, 0, 700, [[0, '#9fd47a'], [1, '#4f8f45']]) +
          rgGrad(glow, 112, 396, 190, [[0, '#fff8d8', 0.5], [0.34, '#ffeab0', 0.2], [1, '#ffeab0', 0]])
        );
        /* 天空 */
        s += rect(0, 0, W, 420, 'url(#' + sky + ')');
        s += circ(1010, 116, 330, 'url(#' + sun + ')');
        s += circ(1010, 116, 46, '#fffdf2', 'opacity="0.9"');
        s += cloud(120, 138, 1.0, '#ffffff', 0.82);
        s += cloud(520, 96, 0.72, '#ffffff', 0.7);
        s += cloud(920, 210, 0.86, '#ffffff', 0.62);
        s += cloud(300, 254, 0.6, '#ffffff', 0.5);
        s += strokePath('M420 176 q10 -10 20 0', '#7d94a8', 3, 'opacity="0.6"');
        s += strokePath('M470 158 q9 -9 18 0', '#7d94a8', 2.6, 'opacity="0.5"');
        s += strokePath('M600 200 q9 -9 18 0', '#7d94a8', 2.6, 'opacity="0.45"');
        /* 远山与雾 */
        s += path('M-20 396 q140 -84 288 -50 q120 -52 250 -22 q160 -46 300 -8 q150 -30 262 6 L1300 420 L-20 420 Z', 'url(#' + hill + ')', 'opacity="0.85"');
        s += path('M-20 420 q160 -56 320 -22 q150 -34 310 -4 q170 -26 330 10 q140 24 240 6 L1300 430 L-20 430 Z', 'url(#' + hill2 + ')');
        s += rect(0, 316, W, 116, 'url(#' + haze + ')');
        /* 湖面 */
        s += rect(0, 424, W, 182, 'url(#' + lake + ')');
        s += path('M-20 424 q160 -56 320 -22 q150 -34 310 -4 q170 -26 330 10 q140 24 240 6 L1300 434 L-20 434 Z', '#8fb8c4', 'opacity="0.3"');
        s += strokePath('M0 452 q180 -6 340 0 q180 6 340 0 q180 -6 340 0 q100 4 260 0', '#ffffff', 3, 'opacity="0.34"');
        s += strokePath('M0 480 q200 -5 380 0 q200 5 380 0 q160 -4 300 0', '#ffffff', 2.6, 'opacity="0.26"');
        s += strokePath('M0 516 q220 -4 400 0 q220 4 400 0 q140 -3 300 0', '#ffffff', 2.4, 'opacity="0.2"');
        s += strokePath('M0 556 q240 -4 440 0 q240 4 440 0', '#ffffff', 2.4, 'opacity="0.16"');
        s += strokePath('M0 590 q260 -3 460 0 q260 3 460 0', '#ffffff', 2.4, 'opacity="0.12"');
        /* 湖对岸的凉亭与拱桥 */
        s += rect(160, 414, 232, 12, '#b9b3a2');
        s += rect(178, 372, 22, 48, '#a8402f');
        s += rect(348, 372, 22, 48, '#a8402f');
        s += rect(258, 372, 18, 48, '#8f3225');
        s += rect(162, 362, 228, 12, '#8f3a2b');
        s += path('M118 372 Q238 344 274 280 Q310 344 430 372 Q420 380 408 382 L140 382 Q128 380 118 372 Z', 'url(#' + roof + ')');
        s += strokePath('M140 356 Q274 330 408 356', '#e8eef0', 3, 'opacity="0.26"');
        s += strokePath('M274 286 L274 378', '#2f5a63', 3, 'opacity="0.45"');
        s += strokePath('M196 330 L180 378', '#2f5a63', 3, 'opacity="0.35"');
        s += strokePath('M352 330 L368 378', '#2f5a63', 3, 'opacity="0.35"');
        s += circ(274, 274, 8, '#d9b04a');
        s += path('M118 372 q-24 2 -34 -16 q24 4 34 16 Z', '#3d6d78');
        s += path('M430 372 q24 2 34 -16 q-24 4 -34 16 Z', '#3d6d78');
        s += rect(190, 388, 174, 7, '#8f5a3c');
        s += rect(190, 404, 174, 7, '#8f5a3c');
        for (i = 0; i < 5; i++) {
          s += rect(r(196 + i * 38), 388, 7, 24, '#7d4c32');
        }
        s += path('M118 424 q156 30 312 0 q-42 42 -156 42 q-114 0 -156 -42 Z', '#7fa8b4', 'opacity="0.22"');
        s += path('M900 424 q86 -76 178 0 l0 14 l-178 0 Z', '#b9b3a2');
        s += path('M900 438 q86 -60 178 0 l0 12 l-178 0 Z', '#a8a190');
        for (i = 0; i < 7; i++) {
          s += rect(r(912 + i * 26), 400, 7, 40, '#cfc9b6');
        }
        s += rect(896, 432, 190, 8, '#c9c3b2');
        /* 湖上小船 */
        s += path('M672 546 q64 24 132 0 q-24 26 -66 26 q-42 0 -66 -26 Z', '#6f4a2a');
        s += strokePath('M700 542 L704 504', '#8a6a44', 4);
        s += strokePath('M704 506 q26 8 40 22', '#a8b4bc', 3);
        s += ell(738, 580, 66, 8, '#3f6a80', 'opacity="0.35"');
        /* 近岸草地 */
        s += path('M0 604 q160 -26 320 -10 q200 -22 400 -6 q180 -14 360 4 q120 12 200 6 L1280 720 L0 720 Z', 'url(#' + grass + ')');
        s += path('M0 596 q180 -18 340 -6 q200 -16 400 -2 q200 -10 360 6 q120 8 180 4 L1280 612 L0 612 Z', '#a8c47a', 'opacity="0.6"');
        /* 石板路 */
        s += poly('540,606 744,606 1050,720 236,720', 'url(#' + stone + ')');
        for (i = 0; i < 7; i++) {
          y = r(626 + i * i * 3.6 + i * 16);
          w2 = 16 + i * 12;
          s += rect(r(640 - w2 - i * 26), y, r(w2 * 2), r(5 + i * 1.4), '#efe8d4', 'opacity="0.26"');
        }
        /* 远岸树列 */
        s += tree(500, 424, 0.34, '#6b543a', '#5d8f43', 0.9);
        s += tree(600, 424, 0.3, '#6b543a', '#548640', 0.9);
        s += tree(1000, 426, 0.36, '#6b543a', '#5d8f43', 0.85);
        s += tree(1120, 426, 0.32, '#6b543a', '#61934a', 0.85);
        s += ell(470, 428, 60, 14, '#6f9c50', 'opacity="0.8"');
        s += ell(1060, 430, 70, 15, '#6f9c50', 'opacity="0.75"');
        /* 柳树（近岸两侧） */
        s += willow(140, 700, 1.45, 'url(#' + bark + ')', 'url(#' + leaf + ')', 'url(#' + strand + ')');
        s += willow(1160, 712, 1.6, 'url(#' + bark + ')', 'url(#' + leaf + ')', 'url(#' + strand + ')');
        s += willow(1044, 612, 0.72, '#6b543a', '#5f9c46', '#8fc96a');
        /* 长椅与路灯 */
        s += rect(700, 636, 190, 14, '#a67a55');
        s += rect(700, 620, 190, 12, '#b98c62');
        s += rect(714, 650, 12, 42, '#7d5a3d');
        s += rect(864, 650, 12, 42, '#7d5a3d');
        s += rect(792, 604, 8, 18, '#7d5a3d');
        s += strokePath('M100 470 L100 400 q0 -14 12 -14', '#4f5a52', 7, 'stroke-linecap="round"');
        s += path('M96 384 q16 -22 32 0 Z', '#3f4a44');
        s += path('M104 392 q-4 12 4 18 q-10 -2 -12 -12 Z', '#3f4a44');
        s += circ(112, 396, 190, 'url(#' + glow + ')');
        /* 前景压暗与芦苇 */
        s += ell(0, 736, 340, 90, '#22301a', 'opacity="0.5"');
        s += ell(1280, 740, 360, 96, '#22301a', 'opacity="0.45"');
        for (i = 0; i < 9; i++) {
          x = r(30 + rnd() * 260);
          s += strokePath('M' + x + ' 716 q' + r(-6 + rnd() * 12) + ' -46 ' + r(-2 + rnd() * 10) + ' -78', '#5f7f3f', 3, 'opacity="0.6"');
        }
        return s;
      }
    },

    /* ============================================================ 6. 机房 */
    lab: {
      name: '机房', night: false, vig: 0.58,
      make: function (nm) {
        var ceil = nm(), wall = nm(), floor = nm(), winSky = nm(), tray = nm(),
          rack = nm(), deskTop = nm(), deskFront = nm(), screen = nm(),
          white = nm();
        var i, j, y, row, cx, dw, dy, dx0, n, mw, mh;
        var lamps = [], lg;
        var defsS =
          lgGrad(ceil, 0, 0, 0, 118, [[0, '#0d232b'], [1, '#1a3f4c']]) +
          lgGrad(wall, 0, 118, 0, 440, [[0, '#1a3d4a'], [0.6, '#14323d'], [1, '#0e2530']]) +
          lgGrad(floor, 0, 440, 0, 720, [[0, '#123039'], [0.4, '#0e2730'], [1, '#071217']]) +
          lgGrad(winSky, 0, 152, 0, 318, [[0, '#0c1e3c'], [0.55, '#1b3560'], [1, '#3f5f88']]) +
          lgGrad(tray, 0, 30, 0, 60, [[0, '#2f5f6d'], [1, '#1a3f4c']]) +
          lgGrad(rack, 0, 138, 0, 478, [[0, '#243a44'], [0.5, '#16262e'], [1, '#0b161b']]) +
          lgGrad(deskTop, 0, 392, 0, 588, [[0, '#3f6c7a'], [1, '#1c414d']]) +
          lgGrad(deskFront, 0, 410, 0, 622, [[0, '#1a3d49'], [1, '#0a1a21']]) +
          lgGrad(screen, 0, 330, 0, 548, [[0, '#ddfbf7'], [0.5, '#8fe0e0'], [1, '#2f7f8f']]) +
          lgGrad(white, 0, 168, 0, 322, [[0, '#e2f0f2'], [1, '#9fbcc4']]);
        for (i = 0; i < 3; i++) {
          lg = nm();
          defsS += rgGrad(lg, r(450 + i * 220), 96, 230,
            [[0, '#a8f0ea', 0.3], [0.4, '#7fd8d8', 0.1], [1, '#7fd8d8', 0]]);
          lamps.push(lg);
        }
        /* 每一排机位一条横向屏幕辉光 */
        var rowY = [363, 431, 499];
        for (i = 0; i < 3; i++) {
          lg = nm();
          defsS += rgGrad(lg, 640, rowY[i], 660, [[0, '#5fd8d8', 0.16], [0.5, '#3fa8b8', 0.07], [1, '#3fa8b8', 0]]);
          lamps.push(lg);
        }
        var s = defs(defsS);
        /* 顶棚、线槽与吊灯 */
        s += rect(0, 0, W, 118, 'url(#' + ceil + ')');
        s += rect(0, 26, W, 34, 'url(#' + tray + ')');
        for (i = 0; i < 22; i++) {
          s += rect(r(8 + i * 58), 22, 6, 42, '#2f5f6d');
        }
        s += rect(60, 64, 190, 12, '#c8dce0');
        s += rect(320, 74, 260, 14, '#dff0f2');
        s += rect(760, 74, 260, 14, '#dff0f2');
        for (i = 0; i < 3; i++) {
          s += circ(r(450 + i * 220), 96, 230, 'url(#' + lamps[i] + ')');
        }
        s += strokePath('M320 82 q40 60 120 60 q80 0 120 -60', '#2f5f6d', 4, 'opacity="0.7"');
        /* 后墙 / 窗 / 白板 */
        s += rect(0, 118, W, 322, 'url(#' + wall + ')');
        s += rect(96, 140, 372, 190, '#16333e');
        s += rect(108, 152, 348, 166, 'url(#' + winSky + ')');
        s += rect(280, 152, 10, 166, '#1d3f4c');
        s += rect(108, 240, 348, 10, '#1d3f4c');
        s += rect(108, 152, 348, 10, '#4f7f96', 'opacity="0.5"');
        s += rect(84, 328, 396, 14, '#1d3f4c');
        s += rect(540, 156, 400, 178, '#0f2831');
        s += rect(552, 168, 376, 154, 'url(#' + white + ')');
        s += txt(570, 206, '实验室上机守则', '#2f5f6f', 22, 'letter-spacing="2" font-weight="bold"');
        s += rect(570, 226, 300, 5, '#7fa8b4', 'opacity="0.6"');
        s += rect(570, 246, 320, 5, '#7fa8b4', 'opacity="0.5"');
        s += rect(570, 266, 250, 5, '#7fa8b4', 'opacity="0.5"');
        s += rect(570, 286, 300, 5, '#7fa8b4', 'opacity="0.4"');
        s += rect(940, 336, 120, 60, '#122c36');
        s += circ(1000, 366, 22, '#1d4f5f');
        s += txt(1000, 372, '网', '#7fd8d8', 18, 'text-anchor="middle"');
        /* 地面（先铺地，机柜与机位压在其上） */
        s += rect(0, 440, W, 280, 'url(#' + floor + ')');
        for (i = 0; i < 5; i++) {
          s += rect(0, r(560 + i * 40), W, 3, '#0a181e', 'opacity="0.7"');
        }
        for (i = 0; i < 3; i++) {
          s += ell(640, rowY[i], 660, r(56 + i * 24), 'url(#' + lamps[3 + i] + ')');
        }
        /* 右侧服务器机柜与闪烁指示灯 */
        s += rect(1078, 138, 186, 340, 'url(#' + rack + ')');
        s += rect(1086, 146, 170, 324, '#101f26');
        for (i = 0; i < 6; i++) {
          y = r(152 + i * 54);
          s += rect(1092, y, 158, 44, '#1b323c');
          s += rect(1092, y, 158, 4, '#2f5f6d');
          for (j = 0; j < 8; j++) {
            s += circ(r(1102 + j * 18), r(y + 12), 3.4,
              ['#6fe0a8', '#e8c05a', '#5fc9d9', '#e05f8a'][(i + j) % 4], 'opacity="0.95"');
          }
          for (j = 0; j < 5; j++) {
            s += rect(r(1100 + j * 30), r(y + 26), 22, 10, '#0b161b');
          }
        }
        s += rect(1078, 132, 186, 12, '#2f5f6d');
        s += poly('1092,150 1116,150 1086,470 1070,470', '#7fd8d8', 'opacity="0.08"');
        s += rect(1160, 478, 90, 14, '#1d3f4c');
        s += strokePath('M1110 132 q-60 -40 -200 -40', '#2f5f6d', 5, 'opacity="0.7"');
        s += strokePath('M1180 132 q-20 -46 -160 -46', '#2f5f6d', 4, 'opacity="0.5"');
        /* 三排机位（近大远小） */
        for (row = 0; row < 3; row++) {
          dy = r(392 + row * 78);
          dw = r(940 + row * 120);
          dx0 = r(640 - dw / 2);
          s += rect(dx0, dy, dw, r(18 + row * 6), 'url(#' + deskTop + ')');
          s += rect(dx0, r(dy + 18 + row * 6), dw, r(26 + row * 10), 'url(#' + deskFront + ')');
          n = 4 - row;
          for (j = 0; j < n; j++) {
            cx = r(640 + (j - (n - 1) / 2) * (dw / n));
            mw = r(78 + row * 30);
            mh = r(52 + row * 20);
            s += ell(cx, r(dy - mh / 2 - 3), r(mw * 0.78), r(mh * 0.7), '#a8f0ea', 'opacity="0.09"');
            s += rect(r(cx - mw / 2), r(dy - mh - 6), mw, mh, '#101f26');
            s += rect(r(cx - mw / 2 + 5), r(dy - mh), r(mw - 10), r(mh - 12), 'url(#' + screen + ')');
            s += rect(r(cx - mw / 2 + 5), r(dy - mh), r(mw - 10), 4, '#ffffff', 'opacity="0.45"');
            s += rect(r(cx - 10), r(dy - 8), 20, 10, '#16262e');
            s += rect(r(cx - mw / 3), r(dy + 4), r(mw * 0.66), 6, '#0b161b');
            s += ell(cx, r(dy + 2), r(mw * 0.7), r(12 + row * 5), '#a8f0ea', 'opacity="0.07"');
          }
          if (row > 0) {
            for (j = 0; j < n; j++) {
              cx = r(640 + (j - (n - 1) / 2) * (dw / n) + 60);
              s += rect(cx, r(dy + 34 + row * 6), r(46 + row * 8), r(30 + row * 8), '#0e1f26');
            }
          }
        }
        /* 地面光斑与近景压暗 */
        for (i = 0; i < 4; i++) {
          s += ell(r(280 + i * 260), 660, 150, 26, '#a8f0ea', 'opacity="0.06"');
        }
        s += ell(640, 730, 720, 70, '#03100f', 'opacity="0.55"');
        return s;
      }
    },

    /* ======================================================= 7. 雪中校园 */
    snow_path: {
      name: '雪中校园', night: false, vig: 0.52,
      make: function (nm) {
        var sky = nm(), haze = nm(), snow = nm(), bldg = nm(), road = nm(),
          hill = nm(), lampG = nm(), far = nm();
        var i, j, x, y;
        var rnd = prng(11071);
        var s = defs(
          lgGrad(sky, 0, 0, 0, 424, [[0, '#a9bacb'], [0.5, '#cdd8e3'], [0.82, '#e4ecf4'], [1, '#f0f5fa']]) +
          lgGrad(haze, 0, 296, 0, 430, [[0, '#eef4fa', 0], [1, '#eef4fa', 0.94]]) +
          lgGrad(snow, 0, 412, 0, 720, [[0, '#f4f9fd'], [0.36, '#e2ecf6'], [1, '#bccfe0']]) +
          lgGrad(bldg, 0, 206, 0, 424, [[0, '#c3d0dc'], [1, '#9fb0c0']]) +
          lgGrad(far, 0, 296, 0, 424, [[0, '#c9d6e2'], [1, '#aebdcc']]) +
          lgGrad(road, 0, 424, 0, 720, [[0, '#dbe6f0'], [0.42, '#c6d5e3'], [1, '#98aec4']]) +
          lgGrad(hill, 0, 404, 0, 440, [[0, '#e8f1f8'], [1, '#cfe0ee']]) +
          rgGrad(lampG, 212, 316, 220, [[0, '#ffe6ac', 0.6], [0.34, '#ffd88a', 0.22], [1, '#ffd88a', 0]])
        );
        /* 天空与远景楼 */
        s += rect(0, 0, W, 424, 'url(#' + sky + ')');
        s += rect(760, 214, 340, 210, 'url(#' + bldg + ')');
        s += rect(748, 200, 364, 18, '#d7e2ec');
        s += rect(748, 196, 364, 8, '#f0f6fb');
        s += rect(880, 168, 100, 34, '#cfdae5');
        s += rect(874, 164, 112, 8, '#f2f8fd');
        for (i = 0; i < 6; i++) {
          for (j = 0; j < 3; j++) {
            s += rect(r(784 + i * 52), r(232 + j * 62), 32, 36, '#8ea2b6', 'opacity="0.55"');
            s += rect(r(784 + i * 52), r(232 + j * 62), 32, 8, '#e8f1f9', 'opacity="0.6"');
          }
        }
        s += rect(150, 300, 240, 124, 'url(#' + far + ')', 'opacity="0.85"');
        s += rect(142, 290, 256, 14, '#e2ecf5');
        for (i = 0; i < 5; i++) {
          s += rect(r(166 + i * 46), 316, 26, 30, '#93a8bc', 'opacity="0.5"');
          s += rect(r(166 + i * 46), 362, 26, 30, '#93a8bc', 'opacity="0.4"');
        }
        s += bareTree(470, 420, 0.44, '#7d8fa2', '#ffffff', 0.55);
        s += bareTree(556, 424, 0.34, '#8496a8', '#ffffff', 0.5);
        s += tree(652, 424, 0.3, '#7d8fa2', '#93aec0', 0.5);
        s += rect(0, 292, W, 138, 'url(#' + haze + ')');
        /* 雪地 */
        s += rect(0, 412, W, 308, 'url(#' + snow + ')');
        s += path('M0 404 q170 -18 330 -8 q200 -14 400 0 q180 -12 360 4 q110 8 190 4 L1280 424 L0 424 Z', 'url(#' + hill + ')');
        for (i = 0; i < 16; i++) {
          x = r(rnd() * 1280);
          y = r(444 + rnd() * 250);
          s += ell(x, y, r(60 + rnd() * 130), r(10 + rnd() * 20), '#a8c0d8', 'opacity="0.28"');
        }
        for (i = 0; i < 6; i++) {
          y = r(470 + i * 42);
          s += strokePath('M0 ' + y + ' q160 ' + r(-8 + rnd() * 16) + ' 320 0 q200 ' + r(-10 + rnd() * 20) + ' 400 0 q180 ' + r(-8 + rnd() * 16) + ' 380 0 q100 0 180 0',
            '#9fb8d0', 3, 'opacity="0.3"');
        }
        /* 校园道路 */
        s += poly('470,420 812,420 1186,720 96,720', 'url(#' + road + ')');
        s += strokePath('M540 436 Q480 580 300 716', '#9fb6cc', 5, 'opacity="0.5"');
        s += strokePath('M742 436 Q800 580 990 716', '#9fb6cc', 5, 'opacity="0.5"');
        s += strokePath('M566 440 Q520 578 372 714', '#8fa8c0', 3, 'opacity="0.4"');
        s += strokePath('M716 440 Q762 578 916 714', '#8fa8c0', 3, 'opacity="0.4"');
        for (i = 0; i < 14; i++) {
          x = r(300 + rnd() * 700);
          y = r(444 + i * 20 + rnd() * 10);
          s += ell(x, y, r(7 + rnd() * 6), r(3.4 + rnd() * 3), '#8ea6be', 'opacity="0.35"');
        }
        s += path('M96 468 q180 -14 372 -2 q-20 30 -70 40 q-160 -8 -302 -38 Z', '#f2f8fd', 'opacity="0.8"');
        s += path('M1180 470 q-170 -14 -330 -4 q22 32 76 42 q150 -8 254 -38 Z', '#f2f8fd', 'opacity="0.75"');
        /* 枯树与雪树 */
        s += bareTree(1206, 716, 1.55, '#5f6f80', '#ffffff');
        s += bareTree(86, 706, 1.2, '#66768a', '#ffffff');
        s += bareTree(1052, 500, 0.6, '#6f8093', '#ffffff', 0.9);
        s += bareTree(268, 500, 0.52, '#75869a', '#ffffff', 0.85);
        s += tree(430, 452, 0.4, '#6f8093', '#dceaf4', 0.9);
        s += tree(900, 448, 0.36, '#6f8093', '#dceaf4', 0.85);
        /* 绿篱与垃圾桶（带雪帽） */
        s += rect(0, 496, 190, 148, '#b9cddd');
        s += path('M0 496 q48 -16 96 0 q48 -14 94 2 q-30 22 -94 22 q-64 0 -96 -24 Z', '#f4f9fd');
        s += rect(196, 556, 16, 60, '#4f5f6f');
        s += ell(204, 556, 14, 6, '#f4f9fd');
        s += rect(70, 574, 16, 62, '#4f5f6f');
        s += ell(78, 574, 14, 6, '#f4f9fd');
        /* 路灯（暖光） */
        s += rect(162, 300, 9, 300, '#4a5866');
        s += strokePath('M166 302 q28 -22 56 -6', '#4a5866', 8, 'stroke-linecap="round"');
        s += path('M218 296 q22 -6 30 10 l-44 8 Z', '#3f4c5a');
        s += circ(212, 316, 220, 'url(#' + lampG + ')');
        s += ell(212, 606, 190, 40, '#ffe6ac', 'opacity="0.12"');
        s += ell(212, 600, 26, 8, '#ffd88a', 'opacity="0.2"');
        /* 长椅（积雪） */
        s += rect(860, 604, 220, 16, '#7d8ea0');
        s += rect(860, 600, 220, 12, '#f4f9fd');
        s += rect(874, 620, 12, 44, '#6f8093');
        s += rect(1054, 620, 12, 44, '#6f8093');
        s += rect(1000, 560, 14, 44, '#6f8093');
        s += ell(1007, 558, 16, 7, '#f4f9fd');
        /* 飘雪 */
        s += starField(96, 0, 0, 1280, 700, 5150, '#ffffff', 3.2, 0.92);
        s += starField(34, 0, 0, 1280, 720, 9137, '#ffffff', 6, 0.5);
        for (i = 0; i < 8; i++) {
          s += circ(r(rnd() * 1280), r(rnd() * 620), r(7 + rnd() * 6), '#ffffff', 'opacity="' + r(0.16 + rnd() * 0.16) + '"');
        }
        s += ell(640, 736, 760, 70, '#7d97b4', 'opacity="0.3"');
        return s;
      }
    },

    /* ========================================================== 8. 体育馆 */
    gym: {
      name: '体育馆', night: false, vig: 0.5,
      make: function (nm) {
        var ceil = nm(), wall = nm(), floor = nm(), winSky = nm(), shaft = nm(),
          stand = nm(), hoop = nm(), board = nm(), net = nm(), gloss = nm();
        var i, j, x, yy;
        var s = defs(
          lgGrad(ceil, 0, 0, 0, 126, [[0, '#2c3640'], [1, '#4a5a68']]) +
          lgGrad(wall, 0, 210, 0, 386, [[0, '#e6ecf1'], [0.6, '#c9d4dc'], [1, '#a5b3bd']]) +
          lgGrad(floor, 0, 380, 0, 720, [[0, '#bc8f54'], [0.4, '#9d7138'], [1, '#5f3c1c']]) +
          lgGrad(winSky, 0, 138, 0, 210, [[0, '#ffffff'], [0.5, '#e2f2ff'], [1, '#bcdcfa']]) +
          lgGrad(shaft, 900, 130, 380, 700, [[0, '#eaf6ff', 0.34], [1, '#eaf6ff', 0]]) +
          lgGrad(stand, 0, 240, 0, 470, [[0, '#5f7280'], [1, '#333f4a']]) +
          lgGrad(hoop, 0, 200, 0, 360, [[0, '#f4f8fa'], [1, '#bdcad4']]) +
          lgGrad(board, 0, 226, 0, 330, [[0, '#2a323a'], [1, '#141a20']]) +
          lgGrad(net, 0, 328, 0, 452, [[0, '#ffffff', 0.85], [1, '#ffffff', 0.3]]) +
          lgGrad(gloss, 0, 380, 0, 720, [[0, '#ffffff', 0.12], [0.5, '#ffffff', 0.04], [1, '#ffffff', 0]])
        );
        /* 屋架 */
        s += rect(0, 0, W, 126, 'url(#' + ceil + ')');
        s += line(0, 30, W, 30, '#7d8b96', 4);
        s += line(0, 88, W, 88, '#6a7783', 5);
        for (i = 0; i < 11; i++) {
          x = 20 + i * 118;
          s += line(x, 30, r(x + 59), 88, '#6a7783', 3);
          s += line(r(x + 59), 88, r(x + 118), 30, '#6a7783', 3);
        }
        s += rect(0, 118, W, 12, '#39454f');
        /* 高侧窗与光柱（后墙先铺满整宽，避免两侧留空） */
        s += rect(0, 130, W, 256, 'url(#' + wall + ')');
        s += rect(40, 130, 1200, 88, '#dfe7ed');
        for (i = 0; i < 6; i++) {
          x = 54 + i * 198;
          s += rect(x, 138, 178, 72, 'url(#' + winSky + ')');
          s += rect(x, 138, 178, 8, '#ffffff', 'opacity="0.6"');
          s += rect(r(x + 86), 138, 6, 72, '#eef4f8');
        }
        s += poly('120,150 300,150 620,720 300,720', 'url(#' + shaft + ')');
        s += poly('520,150 700,150 1000,720 720,720', 'url(#' + shaft + ')');
        s += poly('920,150 1100,150 1280,640 1120,720', 'url(#' + shaft + ')');
        /* 悬挂记分牌 */
        s += rect(0, 216, W, 12, '#8fa0ac');
        s += rect(0, 386, W, 10, '#8d9aa4');
        s += rect(620, 214, 8, 20, '#3a4650');
        s += rect(660, 214, 8, 20, '#3a4650');
        s += rect(520, 232, 240, 96, 'url(#' + board + ')');
        s += rect(530, 244, 220, 72, '#0f1a20');
        s += txt(640, 288, '32 : 28', '#7ff0b8', 30, 'text-anchor="middle" letter-spacing="3"');
        s += txt(640, 314, '第三节  06:24', '#e8b05a', 15, 'text-anchor="middle" letter-spacing="2"');
        /* 木地板（先铺地，再压标线、看台与球架） */
        s += rect(0, 380, W, 340, 'url(#' + floor + ')');
        for (i = 0; i < 8; i++) {
          s += rect(0, r(432 + i * 38), W, 2, '#6f4620', 'opacity="0.22"');
          s += rect(0, r(434 + i * 38), W, 2, '#e0b47a', 'opacity="0.1"');
        }
        s += rect(0, 380, W, 340, 'url(#' + gloss + ')');
        s += ell(430, 560, 300, 60, '#eaf6ff', 'opacity="0.06"');
        s += ell(900, 620, 280, 56, '#eaf6ff', 'opacity="0.05"');
        /* 球场标线 */
        s += rect(0, 400, W, 5, '#ffffff', 'opacity="0.4"');
        s += rect(0, 690, W, 6, '#ffffff', 'opacity="0.45"');
        s += rect(16, 400, 5, 290, '#ffffff', 'opacity="0.34"');
        s += rect(1259, 400, 5, 290, '#ffffff', 'opacity="0.34"');
        s += ell(640, 546, 196, 58, 'none', 'stroke="#ffffff" stroke-width="5" opacity="0.4"');
        s += strokePath('M300 404 L488 404 L620 686 L156 686 Z', '#ffffff', 5, 'opacity="0.34"');
        s += ell(394, 404, 94, 28, 'none', 'stroke="#ffffff" stroke-width="5" opacity="0.34"');
        s += strokePath('M132 404 Q190 700 372 714', '#ffffff', 5, 'opacity="0.3"');
        s += ell(1044, 500, 96, 28, 'none', 'stroke="#ffffff" stroke-width="4" opacity="0.26"');
        /* 左侧阶梯看台 */
        for (i = 0; i < 6; i++) {
          yy = 250 + i * 40;
          s += rect(r(i * 8), r(yy + 24), r(300 - i * 10), 18, '#2b3540');
          s += rect(r(i * 8), r(yy), r(300 - i * 10), 24, 'url(#' + stand + ')');
          s += rect(r(i * 8), r(yy - 8), r(300 - i * 10), 8, '#7d909e');
          for (j = 0; j < 7; j++) {
            s += rect(r(12 + i * 8 + j * 42), r(yy - 12), 24, 8, (i + j) % 2 ? '#4f8fd0' : '#e8e2d0', 'opacity="0.7"');
          }
        }
        s += rect(0, 242, 306, 10, '#93a6b2');
        /* 远端篮架（右侧，贴远墙） */
        s += strokePath('M1230 244 L1276 244', '#6f7d88', 8);
        s += rect(1196, 216, 84, 106, 'url(#' + hoop + ')');
        s += rect(1196, 216, 84, 106, 'none', 'stroke="#8d9aa4" stroke-width="3"');
        s += rect(1212, 232, 52, 42, 'none', 'stroke="#d94f4f" stroke-width="4"');
        s += ell(1198, 324, 15, 5, '#b9c6cf');
        s += ell(1198, 322, 15, 5, 'none', 'stroke="#e8792b" stroke-width="5"');
        s += path('M1186 330 Q1190 356 1196 374 L1202 374 Q1208 354 1210 328 Z', 'url(#' + net + ')');
        s += strokePath('M1191 332 L1197 372', '#ffffff', 2, 'opacity="0.45"');
        s += strokePath('M1205 332 L1202 372', '#ffffff', 2, 'opacity="0.45"');
        /* 近端篮架（左侧，吊装，近大远小） */
        s += rect(374, 118, 14, 88, '#5f6d78');
        s += rect(300, 206, 168, 12, '#5f6d78');
        s += rect(302, 214, 186, 132, 'url(#' + hoop + ')');
        s += rect(302, 214, 186, 132, 'none', 'stroke="#8d9aa4" stroke-width="3"');
        s += rect(324, 238, 100, 76, 'none', 'stroke="#d94f4f" stroke-width="6"');
        s += ell(394, 360, 30, 9, '#b9c6cf');
        s += ell(394, 358, 30, 9, 'none', 'stroke="#e8792b" stroke-width="7"');
        s += path('M366 366 Q374 410 384 436 L406 436 Q416 408 422 364 Z', 'url(#' + net + ')');
        s += strokePath('M378 372 L388 434', '#ffffff', 2.2, 'opacity="0.45"');
        s += strokePath('M396 374 L397 434', '#ffffff', 2.2, 'opacity="0.45"');
        s += strokePath('M412 370 L406 432', '#ffffff', 2.2, 'opacity="0.45"');
        /* 场上的球 */
        s += ell(1000, 658, 30, 9, '#4a2f14', 'opacity="0.45"');
        s += circ(1000, 638, 21, '#d9822b');
        s += strokePath('M979 638 q21 -12 42 0', '#8f4d12', 3, 'opacity="0.8"');
        s += strokePath('M1000 617 L1000 659', '#8f4d12', 3, 'opacity="0.8"');
        s += ell(640, 732, 760, 68, '#3f2610', 'opacity="0.5"');
        return s;
      }
    },

    /* ======================================================== 9. 自习室 */
    study_room: {
      name: '自习室', night: true, vig: 0.62,
      make: function (nm) {
        var wall = nm(), ceil = nm(), floor = nm(), winG = nm(), deskTop = nm(),
          deskFront = nm(), shade = nm(), bookG = nm(), moonG = nm(), shell = nm();
        var i, j, x, y, row, cx, dw, dy, cols, dx0;
        var rnd = prng(80821);
        var lampIds = [], lg;
        var lampAt = [
          [188, 402], [452, 402], [716, 402], [980, 402],
          [300, 486], [640, 486], [980, 486],
          [392, 606], [880, 606]
        ];
        var seats = [
          [246, 372, 0.85], [394, 372, 0.85], [774, 372, 0.85], [922, 372, 0.85],
          [242, 456, 1.0], [698, 456, 1.0], [922, 456, 1.0],
          [456, 576, 1.15], [816, 576, 1.15]
        ];
        var defsS =
          lgGrad(wall, 0, 0, 0, 470, [[0, '#222736'], [0.55, '#1a1f2c'], [1, '#10141c']]) +
          lgGrad(ceil, 0, 0, 0, 86, [[0, '#2b3140'], [1, '#1a1f2b']]) +
          lgGrad(floor, 0, 470, 0, 720, [[0, '#2a2e3a'], [0.4, '#20232d'], [1, '#0d0f14']]) +
          lgGrad(winG, 0, 110, 0, 342, [[0, '#0a1024'], [0.55, '#152043'], [1, '#2b3a63']]) +
          lgGrad(deskTop, 0, 392, 0, 660, [[0, '#a8855c'], [1, '#4c3823']]) +
          lgGrad(deskFront, 0, 410, 0, 690, [[0, '#4f3c28'], [1, '#20170f']]) +
          lgGrad(shade, 0, 338, 0, 580, [[0, '#fff2cc'], [1, '#c9963f']]) +
          lgGrad(bookG, 0, 380, 0, 630, [[0, '#f6f1e0'], [1, '#a89c82']]) +
          lgGrad(shell, 0, 176, 0, 440, [[0, '#3a3048'], [1, '#221c2e']]) +
          rgGrad(moonG, 1010, 168, 150, [[0, '#cddaf8', 0.4], [1, '#cddaf8', 0]]);
        for (i = 0; i < lampAt.length; i++) {
          lg = nm();
          defsS += rgGrad(lg, lampAt[i][0], lampAt[i][1], 168,
            [[0, '#ffd88e', 0.85], [0.3, '#ffc367', 0.3], [1, '#ffc367', 0]]);
          lampIds.push(lg);
        }
        var s = defs(defsS);
        /* 顶棚、暗灯管与后墙 */
        s += rect(0, 0, W, 470, 'url(#' + wall + ')');
        s += rect(0, 0, W, 86, 'url(#' + ceil + ')');
        s += rect(0, 82, W, 8, '#2d3242');
        s += rect(300, 40, 300, 14, '#3f4657');
        s += rect(760, 40, 300, 14, '#3f4657');
        for (i = 0; i < 3; i++) {
          x = 128 + i * 356;
          s += rect(x, 100, 300, 252, '#262c3b');
          s += rect(r(x + 10), 110, 280, 232, 'url(#' + winG + ')');
          s += rect(r(x + 144), 110, 10, 232, '#2c3244');
          s += rect(r(x + 10), 224, 280, 10, '#2c3244');
          s += rect(r(x + 10), 110, 280, 8, '#3a4a6e', 'opacity="0.6"');
        }
        s += circ(1010, 168, 150, 'url(#' + moonG + ')');
        s += circ(1010, 168, 30, '#e6eeff', 'opacity="0.9"');
        for (i = 0; i < 26; i++) {
          s += circ(r(120 + rnd() * 1060), r(116 + rnd() * 220), r(1.2 + rnd() * 2.2), '#cfe0ff', 'opacity="' + r(0.25 + rnd() * 0.5) + '"');
        }
        /* 左侧书架与墙上标语 */
        s += rect(0, 176, 116, 264, 'url(#' + shell + ')');
        for (i = 0; i < 3; i++) {
          y = 196 + i * 80;
          s += rect(6, y, 104, 6, '#4a3f5c');
          for (j = 0; j < 7; j++) {
            s += rect(r(10 + j * 14), r(y - 46), 11, 44, ['#8f4f4a', '#4f6f8f', '#8f7f4f', '#5f8f6f'][(i + j) % 4], 'opacity="0.8"');
          }
        }
        s += rect(150, 148, 176, 60, '#232838');
        s += rect(150, 148, 176, 4, '#8a7a4a', 'opacity="0.5"');
        s += txt(238, 190, '保 持 安 静', '#c8b98a', 20, 'text-anchor="middle" letter-spacing="3" opacity="0.85"');
        /* 地面（先铺地，再放桌椅） */
        s += rect(0, 470, W, 250, 'url(#' + floor + ')');
        for (i = 0; i < 4; i++) {
          s += rect(0, r(520 + i * 54), W, 3, '#0a0c11', 'opacity="0.5"');
        }
        s += ell(640, 660, 300, 54, '#ffd88e', 'opacity="0.07"');
        /* 课桌：三排 */
        for (row = 0; row < 3; row++) {
          dy = r(392 + row * 82);
          dw = r(210 + row * 74);
          cols = row === 0 ? 4 : (row === 1 ? 3 : 2);
          for (j = 0; j < cols; j++) {
            cx = r(640 + (j - (cols - 1) / 2) * (dw + 22));
            s += rect(r(cx - dw / 2), dy, dw, r(12 + row * 5), 'url(#' + deskTop + ')');
            s += rect(r(cx - dw / 2), r(dy + 12 + row * 5), dw, r(30 + row * 12), 'url(#' + deskFront + ')');
            s += rect(r(cx - dw / 2 + 8), r(dy + 16 + row * 5), r(dw - 16), r(4 + row), '#8a6a44', 'opacity="0.5"');
          }
        }
        /* 灯光：光晕与光池先铺 */
        for (i = 0; i < lampAt.length; i++) {
          x = lampAt[i][0];
          y = lampAt[i][1];
          s += circ(x, r(y + 12), 168, 'url(#' + lampIds[i] + ')');
          s += ell(x, r(y + 30), 120, 34, '#ffd88e', 'opacity="0.16"');
        }
        /* 伏案的学生剪影（压在灯光之上，保持暗部对比） */
        for (i = 0; i < seats.length; i++) {
          s += sitter(seats[i][0], seats[i][1], seats[i][2], '#0b0d12');
        }
        /* 灯具本体（在人与书之前） */
        for (i = 0; i < lampAt.length; i++) {
          x = lampAt[i][0];
          y = lampAt[i][1];
          s += rect(r(x - 3), r(y - 34), 6, 34, '#5c5f6a');
          s += path('M' + r(x - 30) + ' ' + r(y - 34) + ' q30 -26 60 0 Z', 'url(#' + shade + ')');
          s += rect(r(x - 32), r(y - 36), 64, 5, '#8a7440');
        }
        /* 桌上的书与杂物 */
        for (i = 0; i < lampAt.length; i++) {
          cx = lampAt[i][0] + (i % 2 ? -66 : 62);
          y = lampAt[i][1] + 12;
          s += rect(r(cx - 34), r(y - 8), 68, 12, 'url(#' + bookG + ')');
          s += rect(r(cx - 30), r(y - 14), 60, 7, '#e8e0c8', 'opacity="0.85"');
          s += rect(r(cx - 14), r(y - 20), 26, 7, '#b9ad92', 'opacity="0.8"');
        }
        s += rect(566, 596, 30, 40, '#8f5f4a');
        s += rect(566, 586, 30, 12, '#b87a5c');
        s += rect(962, 592, 44, 26, '#3f4a5c');
        s += rect(968, 586, 32, 8, '#6f8098');
        /* 地面暖光反射与近景压暗 */
        s += ell(300, 690, 260, 48, '#ffd88e', 'opacity="0.05"');
        s += ell(980, 690, 260, 48, '#ffd88e', 'opacity="0.05"');
        s += ell(640, 736, 740, 70, '#050609', 'opacity="0.5"');
        return s;
      }
    }

  });
})();
