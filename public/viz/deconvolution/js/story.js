/* story.js: the two cards before the steps, as DC.story. In the manner of the cards of the tiles
 * page (../tetris-tiles/js/story.js): a picture, a heading that states the point, a sentence or
 * two, and dots.
 *
 *   conv   a convolution makes a map smaller: a 4 by 4 map, a 2 by 2 kernel, stride 2, a 2 by 2
 *          output; the window on the top left block and the output cell it makes
 *   unet   a U-Net makes maps bigger again: the U of Ronneberger, Fischer and Brox (2015) as boxes,
 *          grey arrows down its left half and across, its green arrows "up-conv 2x2" up its right
 *          half, each with the side of the map before and after
 *
 * The words are js/words.js; the sides of the U-Net's maps are js/math.js (UNET_UP).
 */
(function () {
  'use strict';
  var DC = window.DC, K = DC.kit, G = DC.geo, M = DC.math, WD = DC.words;
  var CARDS = WD.cards.map(function (c) { return c.id; });
  var W = G.story.pic.w, H = G.story.pic.h;
  var el = { cards: {}, dots: [] };

  function arrow(svg, d, tip, dir, cls) {
    K.path(svg, d, cls === 'up' ? 'up' : 'arrow');
    var x = tip[0], y = tip[1], s = cls === 'up' ? 11 : 8, l = cls === 'up' ? 18 : 14;
    var ux = dir[0], uy = dir[1], len = Math.hypot(ux, uy);
    ux /= len; uy /= len;
    var bx = x - ux * l, by = y - uy * l;
    K.path(svg, 'M' + x + ' ' + y + 'L' + (bx - uy * s) + ' ' + (by + ux * s) + 'L' + (bx + uy * s) + ' ' + (by - ux * s) + 'Z',
      cls === 'up' ? 'up-head' : 'arrow-head');
  }

  // a 4 by 4 map, a 2 by 2 kernel and the 2 by 2 output; the window on the top left block and the
  // output cell it makes, joined by an arrow over the kernel
  function picConv(svg) {
    var p = 72, mx = 80, my = 215, kx = 440, ky = 287, ox = 680, oy = 287;
    var none = function () { return null; };
    K.grid(svg, mx, my, p, 4, 4, function () { return 'c-input'; }, none);
    K.grid(svg, kx, ky, p, 2, 2, function () { return 'c-kernel'; }, none);
    K.grid(svg, ox, oy, p, 2, 2, function () { return 'c-paper'; }, none);
    K.rect(svg, mx, my, 2 * p, 2 * p, 'win');
    K.rect(svg, ox + 3, oy + 3, p - 6, p - 6, 'mark');
    var x0 = mx + p, y0 = my - 10, x1 = ox + p / 2, y1 = oy - 12;
    arrow(svg, 'M' + x0 + ' ' + y0 + 'C' + x0 + ' ' + (y0 - 110) + ' ' + x1 + ' ' + (y1 - 120) + ' ' + x1 + ' ' + (y1 - 14),
      [x1, y1], [0, 1], 'arrow');
    K.text(svg, mx + 2 * p, my + 4 * p + 34, 'map, 4 by 4', 'label');
    K.text(svg, kx + p, ky + 2 * p + 34, 'kernel, 2 by 2', 'label');
    K.text(svg, ox + p, oy + 2 * p + 34, 'output, 2 by 2', 'label');
  }

  // the U-Net as boxes: five levels, the bottleneck in the middle
  function picUnet(svg) {
    var L = 5, bw = 30, yc = function (l) { return 100 + 122 * l; };
    var h = function (l) { return 70 - 10 * l; };
    var xl = function (l) { return 60 + 80 * l; };          // the left half, l = 0 to 4
    var xr = function (l) { return 700 - 80 * l; };         // the right half, l = 0 to 3
    for (var l = 0; l < L; l++) {
      K.rect(svg, xl(l), yc(l) - h(l) / 2, bw, h(l), 'c-box');
      if (l < L - 1) K.rect(svg, xr(l), yc(l) - h(l) / 2, bw, h(l), 'c-box');
    }
    for (var d = 0; d < L - 1; d++) {
      // down the left half
      var a0 = [xl(d) + bw / 2 + 6, yc(d) + h(d) / 2 + 8], a1 = [xl(d + 1) + bw / 2 - 2, yc(d + 1) - h(d + 1) / 2 - 8];
      arrow(svg, 'M' + a0[0] + ' ' + a0[1] + 'L' + (a1[0] - 4) + ' ' + (a1[1] - 9), a1, [a1[0] - a0[0], a1[1] - a0[1]], 'arrow');
      // across, from each map of the left half to the map of the right half on its level
      var c0 = xl(d) + bw + 10, c1 = xr(d) - 10;
      arrow(svg, 'M' + c0 + ' ' + yc(d) + 'L' + (c1 - 12) + ' ' + yc(d), [c1, yc(d)], [1, 0], 'arrow');
      // up the right half: the up-conv 2x2, with the side of the map before and after
      var fromX = d === L - 2 ? xl(L - 1) : xr(d + 1);
      var u0 = [fromX + bw / 2 + 2, yc(d + 1) - h(d + 1) / 2 - 8], u1 = [xr(d) + bw / 2 - 6, yc(d) + h(d) / 2 + 10];
      var dx = u1[0] - u0[0], dy = u1[1] - u0[1], len = Math.hypot(dx, dy);
      arrow(svg, 'M' + u0[0] + ' ' + u0[1] + 'L' + (u1[0] - dx / len * 14) + ' ' + (u1[1] - dy / len * 14), u1, [dx, dy], 'up');
      var sz = M.UNET_UP[L - 2 - d];
      K.text(svg, (u0[0] + u1[0]) / 2 + 22, (u0[1] + u1[1]) / 2 + 12, sz[0] + ' → ' + sz[1], 'up-label');
    }
    // the name of the green arrows
    arrow(svg, 'M560 652L612 652', [628, 652], [1, 0], 'up');
    K.text(svg, 646, 652, 'up-conv 2x2', 'legend-up');
  }

  function build(layer) {
    var Pp = G.story.pic, T = G.story.text;
    el.box = K.div('story', layer);
    WD.cards.forEach(function (card) {
      var c = { name: card.id };
      c.pic = K.div('story-pic', el.box);
      c.pic.style.left = Pp.x + 'px';
      c.pic.style.top = Pp.y + 'px';
      c.pic.style.width = Pp.w + 'px';
      c.pic.style.height = Pp.h + 'px';
      var svg = K.el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: Pp.w, height: Pp.h, role: 'img', 'class': 'story-svg' }, c.pic);
      ({ conv: picConv, unet: picUnet })[card.id](svg);
      c.words = K.div('story-words', el.box);
      c.words.style.left = T.x + 'px';
      c.words.style.top = T.y + 'px';
      c.words.style.width = T.w + 'px';
      K.words(K.div(null, c.words, 'h2'), card.heading);
      K.words(K.div(null, c.words, 'p'), card.text);
      el.cards[card.id] = c;
    });
    el.dotRow = K.div('story-dots', el.box);
    el.dotRow.style.left = T.x + 'px';
    el.dotRow.style.top = (Pp.y + Pp.h - 24) + 'px';
    CARDS.forEach(function () { el.dots.push(K.div('dot', el.dotRow, 'span')); });
  }

  function render(st) {
    var on = st.kind === 'card';
    el.box.classList.toggle('on', on);
    CARDS.forEach(function (name, i) {
      var c = el.cards[name], cur = on && st.card === i + 1;
      c.pic.classList.toggle('cur', cur);
      c.words.classList.toggle('cur', cur);
      el.dots[i].classList.toggle('cur', cur);
    });
  }

  function animate(st) {
    if (st.kind !== 'card') return;
    var c = el.cards[CARDS[st.card - 1]];
    K.track(c.pic.animate([{ transform: 'translateX(-26px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 600, easing: 'ease-out' }));
    K.track(c.words.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 700, easing: 'ease-out' }));
  }

  DC.story = { CARDS: CARDS, build: build, render: render, animate: animate, el: el };
})();
