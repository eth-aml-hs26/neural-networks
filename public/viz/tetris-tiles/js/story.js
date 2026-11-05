/* story.js: the story before the steps, five cards, as TT.story. In the style of the stories of
 * "Will it last?" and of the grasshopper pages (../grasshoppers-find-w-and-b/js/story.js): a
 * picture and a sentence or two a card, and dots.
 *
 *   sea      a satellite above the sea takes square pictures, one after another
 *   count    the three pictures, with the number of islands under each: 3, 2 and 4
 *   find     to count the islands we first need a technology that finds them
 *   tetris   the idea: Tetris pieces; J, L, O and I in their colours, each beside an island of its
 *            shape
 *   picture  the third picture, 7 by 7, four islands, drawn exactly where step 1 draws the image
 *            (by js/steps.js): how do we decompose it into tiles?
 *
 * Carlos's words (5 November 2026): "I'm taking satellite images in the sea and I want to count
 * the number of islands in each picture. So to achieve that, I need to come up with a technology
 * that allows me to identify islands. My idea is to use Tetris pieces to identify islands, and that
 * motivates then the animation, which is how can I decompose an image into tiles".
 *
 * The islands are drawn as the steps draw them: whole cells of land on a grid of sea. The pictures
 * and their counts come from window.EXAMPLES.story (data/examples.js), whose generator counts the
 * islands. The satellite has colours of its own (css/story.css); everything else takes the tokens.
 */
(function () {
  'use strict';
  var TT = window.TT, K = TT.kit, G = TT.geo;
  var S = window.EXAMPLES.story;
  var STROKE = { magenta: 's-magenta', violet: 's-violet', orange: 's-orange', cyan: 's-cyan' };
  var FILL = { magenta: 'f-magenta', violet: 'f-violet', orange: 'f-orange', cyan: 'f-cyan' };
  var el = { cards: {}, dots: [] };

  var CARDS = ['sea', 'count', 'find', 'tetris', 'picture'];
  var WORDS = {
    sea: { title: 'Pictures of the sea',
      text: 'A satellite takes square pictures of the sea, one after another.' },
    count: { title: 'How many islands?',
      text: 'For each picture, we want the number of islands in it.' },
    find: { title: 'Finding the islands',
      text: 'To count the islands, we first need a technology that finds them.' },
    tetris: { title: 'Tetris pieces',
      text: 'Our idea: find the islands with Tetris pieces. Each piece finds the islands of its shape.' },
    picture: { title: 'One picture',
      text: 'The third picture: 7 by 7 cells, four islands. How do we decompose it into Tetris tiles?' }
  };

  var W = G.story.pic.w, H = G.story.pic.h;

  // ===== the pictures, drawn in the card's own pixels (W x H)

  // a strip of the three pictures side by side under a satellite
  function picSea(svg) {
    var p = 40, x0 = 40, y0 = 372, n = 7;
    var strip = [];
    for (var r = 0; r < n; r++) strip.push([].concat(S.pictures[0].grid[r], S.pictures[1].grid[r], S.pictures[2].grid[r]));
    // the satellite's view of the third picture, under everything; the satellite at 0.8 of its
    // drawn size, over the middle of that picture, and the view from the tip of its lens
    var left = x0 + 2 * n * p, right = x0 + 3 * n * p;
    var sat = 0.8, sx = (left + right) / 2, satY = 132, sy = satY + 58 * sat;
    K.el('path', { d: 'M' + sx + ' ' + sy + 'L' + right + ' ' + y0 + 'L' + left + ' ' + y0 + 'Z', 'class': 'view' }, svg);
    K.grid(svg, x0, y0, p, strip);
    for (var k = 0; k < 3; k++) {
      K.el('rect', { x: x0 + k * n * p, y: y0, width: n * p, height: n * p, 'class': 'photo' + (k === 2 ? ' now' : '') }, svg);
    }
    K.path(svg, 'M' + sx + ' ' + sy + 'L' + left + ' ' + y0 + 'M' + sx + ' ' + sy + 'L' + right + ' ' + y0, 'view-line');
    satellite(svg, sx, satY, sat);
  }

  // a satellite seen from the side: a body with a lens under it, two solar wings, a dish on top
  function satellite(svg, cx, cy, scale) {
    var g = K.el('g', { transform: 'translate(' + cx + ' ' + cy + ') scale(' + scale + ')' }, svg);
    K.el('rect', { x: -170, y: -4, width: 340, height: 8, 'class': 'sat-strut' }, g);
    [-1, 1].forEach(function (side) {
      var x = side < 0 ? -168 : 48;
      K.el('rect', { x: x, y: -26, width: 120, height: 52, rx: 3, 'class': 'sat-wing' }, g);
      var d = '';
      for (var i = 1; i < 4; i++) d += 'M' + (x + i * 30) + ' -26V26';
      d += 'M' + x + ' 0H' + (x + 120);
      K.path(g, d, 'sat-cell');
    });
    K.el('rect', { x: -40, y: -36, width: 80, height: 72, rx: 8, 'class': 'sat-body' }, g);
    K.el('rect', { x: -40, y: -36, width: 80, height: 16, rx: 6, 'class': 'sat-band' }, g);
    K.path(g, 'M0 -36V-52', 'sat-mast');
    K.el('path', { d: 'M-18 -52 A18 9 0 0 0 18 -52 Z', 'class': 'sat-dish' }, g);
    K.el('rect', { x: -14, y: 36, width: 28, height: 12, rx: 3, 'class': 'sat-lens-box' }, g);
    K.el('circle', { cx: 0, cy: 52, r: 6, 'class': 'sat-lens' }, g);
  }

  // the three pictures apart, each with its count under it
  function picCount(svg) {
    var p = 34, n = 7, gap = 56, size = n * p, y0 = 150;
    var x0 = (W - (3 * size + 2 * gap)) / 2;
    S.pictures.forEach(function (pic, k) {
      var x = x0 + k * (size + gap);
      K.el('rect', { x: x + 5, y: y0 + 6, width: size, height: size, 'class': 'shade' }, svg);
      K.grid(svg, x, y0, p, pic.grid);
      K.text(svg, x + size / 2, y0 + size + 86, String(pic.count), 'count');
      K.text(svg, x + size / 2, y0 + size + 146, pic.count === 1 ? 'island' : 'islands', 'count-word');
    });
  }

  // a picture, a finder that nobody has yet, and the same picture with its islands found
  function picFind(svg) {
    var pic = S.pictures[0], p = 30, n = 7, size = n * p, y0 = 220;
    var xa = 46, xb = W - 46 - size;
    K.el('rect', { x: xa + 5, y: y0 + 6, width: size, height: size, 'class': 'shade' }, svg);
    K.grid(svg, xa, y0, p, pic.grid);
    K.el('rect', { x: xb + 5, y: y0 + 6, width: size, height: size, 'class': 'shade' }, svg);
    K.grid(svg, xb, y0, p, pic.grid);
    pic.islands.forEach(function (isl) { K.outline(svg, xb, y0, p, isl.outline, 'found round'); });
    // the box in the middle with its question mark
    var bw = 196, bx = (W - bw) / 2, by = y0 + size / 2 - bw / 2;
    K.el('rect', { x: bx + 5, y: by + 6, width: bw, height: bw, rx: 22, 'class': 'shade' }, svg);
    K.el('rect', { x: bx, y: by, width: bw, height: bw, rx: 22, 'class': 'finder' }, svg);
    K.text(svg, bx + bw / 2, by + bw / 2 + 4, '?', 'ask');
    arrow(svg, xa + size + 22, bx - 22, y0 + size / 2);
    arrow(svg, bx + bw + 22, xb - 22, y0 + size / 2);
    K.text(svg, xb + size / 2, y0 + size + 86, String(pic.count), 'count');
    K.text(svg, xb + size / 2, y0 + size + 146, 'islands', 'count-word');
  }

  function arrow(svg, x1, x2, y) {
    K.path(svg, 'M' + x1 + ' ' + y + 'H' + (x2 - 14), 'arrow-line');
    K.el('path', { d: 'M' + x2 + ' ' + y + 'L' + (x2 - 18) + ' ' + (y - 10) + 'L' + (x2 - 18) + ' ' + (y + 10) + 'Z', 'class': 'arrow-head' }, svg);
  }

  // the four pieces in their colours, each above an island of its shape
  function picTetris(svg) {
    var colW = W / 4, q = 40, base = 262, pp = 28, py = 392;
    S.side.forEach(function (s, k) {
      var cx = colW * (k + 0.5);
      // the piece as Tetris draws it: solid blocks of its colour
      var x0 = cx - s.w * q / 2, y0 = base - s.h * q;
      s.cells.forEach(function (rc) {
        K.el('rect', { x: x0 + rc[1] * q + 2, y: y0 + rc[0] * q + 2, width: q - 4, height: q - 4, rx: 4,
                       'class': FILL[s.colour] }, svg);
      });
      K.text(svg, cx, base + 40, s.piece, 'piece-name');
      // an island of its shape on a patch of sea, outlined in the piece's colour
      var px = cx - S.patch * pp / 2;
      K.path(svg, 'M' + cx + ' ' + (base + 68) + 'V' + (py - 22), 'arrow-line');
      K.el('path', { d: 'M' + cx + ' ' + (py - 8) + 'L' + (cx - 9) + ' ' + (py - 24) + 'L' + (cx + 9) + ' ' + (py - 24) + 'Z', 'class': 'arrow-head' }, svg);
      K.el('rect', { x: px + 5, y: py + 6, width: S.patch * pp, height: S.patch * pp, 'class': 'shade' }, svg);
      K.grid(svg, px, py, pp, s.patch);
      K.outline(svg, px, py, pp, s.outline, STROKE[s.colour] + ' w3 round');
    });
  }

  // ===== build

  function build(layer) {
    var P = G.story.pic, T = G.story.text;
    el.box = K.div('story', layer);
    CARDS.forEach(function (name) {
      var c = { name: name };
      if (name !== 'picture') {
        // the last card has no frame: its picture is the image of step 1, drawn by js/steps.js
        c.pic = K.div('story-pic', el.box);
        c.pic.style.left = P.x + 'px';
        c.pic.style.top = P.y + 'px';
        c.pic.style.width = P.w + 'px';
        c.pic.style.height = P.h + 'px';
        var svg = K.el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: P.w, height: P.h, role: 'img', 'class': 'story-svg' }, c.pic);
        ({ sea: picSea, count: picCount, find: picFind, tetris: picTetris })[name](svg);
      }
      c.words = K.div('story-words', el.box);
      c.words.style.left = T.x + 'px';
      c.words.style.top = T.y + 'px';
      c.words.style.width = T.w + 'px';
      var h2 = K.div(null, c.words, 'h2'), p = K.div(null, c.words, 'p');
      h2.textContent = WORDS[name].title;
      p.textContent = WORDS[name].text;
      el.cards[name] = c;
    });
    el.dotRow = K.div('story-dots', el.box);
    el.dotRow.style.left = T.x + 'px';
    el.dotRow.style.top = (P.y + P.h - 24) + 'px';
    CARDS.forEach(function () { el.dots.push(K.div('dot', el.dotRow, 'span')); });
  }

  function render(st) {
    var on = st.kind === 'card';
    el.box.classList.toggle('on', on);
    CARDS.forEach(function (name, i) {
      var c = el.cards[name], cur = on && st.card === i + 1;
      if (c.pic) c.pic.classList.toggle('cur', cur);
      c.words.classList.toggle('cur', cur);
      el.dots[i].classList.toggle('cur', cur);
    });
  }

  function animate(st) {
    if (st.kind !== 'card') return;
    var c = el.cards[CARDS[st.card - 1]];
    if (c.pic) K.track(c.pic.animate([{ transform: 'translateX(-26px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 600, easing: 'ease-out' }));
    K.track(c.words.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 700, easing: 'ease-out' }));
  }

  TT.story = { CARDS: CARDS, WORDS: WORDS, build: build, render: render, animate: animate, el: el };
})();
