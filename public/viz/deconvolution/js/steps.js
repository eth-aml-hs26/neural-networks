/* steps.js: the 14 steps, as DC.steps. Their words are js/words.js, their numbers js/math.js.
 *
 *   1  start    the input 2 by 2, the kernel 2 by 2, an empty output 4 by 4
 *   2  copy     the cell with 2 stamps 2 times the kernel at the top left of the output
 *   3  stride   the cell with 1 stamps its copy 2 cells to the right
 *   4  double   the cells with 3 and 4 stamp the two blocks below: the map doubles; a green arrow
 *               "up-conv 2x2" from the input to the output, as in the U-Net
 *   5  bigger   the kernel 4 by 4 of the slide, an output 6 by 6, the first copy
 *   6  overlap  the second copy: where the copies overlap they add (cell 1, 2 written out)
 *   7  four     all four copies: the output 6 by 6 (cell 2, 2 written out)
 *   8  size     braces (n-1)s and k over the output, and (n-1)s+k = 6
 *   9  spread   the slide's view: the input spreads out with one zero between its cells
 *  10  pad      three zeros on every side: the 9 by 9 grid of the slide
 *  11  window   the kernel slid onto the top left of the grid: one product, the output cell 0, 0
 *  12  middle   the window over the middle meets all four input cells: the sum of step 7
 *  13  every    the window sweeps its 36 places and gives the whole output
 *  14  slide    slide 13 itself: its five coloured windows and the output cells they make, and
 *               its four labels
 *
 * In the second view the output shows the numbers of the copies in grey until a window computes
 * them, so that the windows visibly give the same output.
 *
 * Immediate mode: render(st) draws a step from scratch; animate(st) decorates a forward click
 * (flying copies, the spreading input, the sliding window) and leaves the drawing exactly as
 * render drew it, so a reload of the address shows the same picture (dev/drive.mjs checks this).
 */
(function () {
  'use strict';
  var DC = window.DC, K = DC.kit, G = DC.geo, M = DC.math, WD = DC.words;
  var P = G.P, X = M.X, S = M.S, n = X.length;
  var STEPS = WD.steps, COUNT = STEPS.length;
  var ORDER = M.order(n);
  var K4 = M.K4, k4 = K4.length;
  var WIN = M.byWindows(X, K4, S);
  var GM = WIN.grid.length, PADW = k4 - 1, OM = WIN.out.length;

  // the first view: the copies stamped by the end of a step, and the first one new in it
  var UPTO = { start: 0, copy: 1, stride: 2, double: 4, bigger: 1, overlap: 2, four: 4, size: 4 };
  var FROM = { copy: 0, stride: 1, double: 2, bigger: 0, overlap: 1, four: 2 };
  // the second view: the output cells the windows have computed by the end of a step
  var DONE = { spread: [], pad: [], window: [[0, 0]], middle: [[0, 0], M.CELL_MID] };
  // the labels of slide 13, in its words
  var LAB = {
    stride: 'Stride = ' + S,
    pad: 'Padding = ' + PADW,
    kernel: 'Kernel size = ' + k4 + ' * ' + k4,
    input: 'Input feature map of size ' + n + ' * ' + n
  };
  // where each input cell sits in the padded grid
  var INPUT_AT = {};
  ORDER.forEach(function (ij) { var p = M.placeOf(ij[0], ij[1], S, k4); INPUT_AT[p[0] + ',' + p[1]] = ij; });

  var el = { root: null, fly: null, html: null, words: null, h2: null, p: null, sc: null };

  function scene(step) {
    var sp = STEPS[step - 1], sc = { step: step, id: sp.id, sp: sp };
    if (UPTO[sp.id] !== undefined) {
      sc.world = 'copies';
      sc.ker = step <= 4 ? M.K2 : K4;
      sc.k = sc.ker.length;
      sc.m = M.outSize(n, S, sc.k);
      sc.upto = UPTO[sp.id];
      sc.inTL = [G.CG.x - n * P / 2, G.CG.y - n * P / 2];
      sc.kTL = [G.CK.x - sc.k * P / 2, G.CK.y - sc.k * P / 2];
      sc.oTL = [G.CO.x - sc.m * P / 2, G.CO.y - sc.m * P / 2];
    } else {
      sc.world = 'windows';
      sc.ker = K4; sc.k = k4; sc.m = OM;
      sc.kTL = [G.KER.x, G.KER.y];
      sc.oTL = [G.OUT.x, G.OUT.y];
    }
    return sc;
  }

  // ===== drawing helpers

  function clear() {
    [el.root, el.fly].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
    el.html.textContent = '';
    el.formula = el.up = el.braces = el.mark = el.win = el.kerLabel = el.inLabel = null;
    el.braceTex = []; el.rings = []; el.notes = []; el.slideWins = [];
  }

  function label(g, x, y, s, cls) { return K.text(g, x, y, s, cls || 'label'); }

  // a matrix of numbered cells from (x, y); every cell a group of its own, so it can move
  function cells(g, x, y, vals, fill, num) {
    var out = [];
    for (var r = 0; r < vals.length; r++) {
      out.push([]);
      for (var c = 0; c < vals[r].length; c++) {
        var cg = K.el('g', null, g);
        K.rect(cg, x + c * P, y + r * P, P, P, fill + ' cell');
        K.text(cg, x + (c + 0.5) * P, y + (r + 0.5) * P, String(vals[r][c]), 'n ' + num);
        out[r].push(cg);
      }
    }
    K.rect(g, x, y, vals[0].length * P, vals.length * P, 'frame');
    return out;
  }

  function paper(g, x, y, m) {
    for (var r = 0; r < m; r++) for (var c = 0; c < m; c++) K.rect(g, x + c * P, y + r * P, P, P, 'c-paper cell');
  }

  // the numbers of the output: val(r, c) is a number or null (an empty cell)
  function outNums(g, x, y, m, val, extra) {
    var t = [];
    for (var r = 0; r < m; r++) {
      t.push([]);
      for (var c = 0; c < m; c++) {
        var v = val(r, c);
        t[r].push(v === null ? null : K.text(g, x + (c + 0.5) * P, y + (r + 0.5) * P, String(v), 'n n-out' + (extra ? extra(r, c) : '')));
      }
    }
    return t;
  }

  function markCell(g, x, y, rc) { return K.rect(g, x + rc[1] * P + 3, y + rc[0] * P + 3, P - 6, P - 6, 'mark'); }

  // what the output of the first view shows after the first `upto` copies: a number where a copy
  // lies, nothing elsewhere
  function valuesAfter(sc, upto) {
    var res = M.copies(X, sc.ker, S, upto), cv = M.cover(n, S, sc.k, upto), v = [];
    for (var r = 0; r < sc.m; r++) {
      v.push([]);
      for (var c = 0; c < sc.m; c++) v[r].push(cv[r][c] ? res.out[r][c] : null);
    }
    return v;
  }

  // ===== the first view: copies of the kernel

  function drawCopies(sc) {
    var g = el.root, k = sc.k, m = sc.m, ox = sc.oTL[0], oy = sc.oTL[1];
    el.input = cells(g, sc.inTL[0], sc.inTL[1], X, 'c-input', 'n-input');
    label(g, sc.inTL[0] + n * P / 2, sc.inTL[1] - 26, 'input');
    cells(g, sc.kTL[0], sc.kTL[1], sc.ker, 'c-kernel', 'n-kernel');
    label(g, sc.kTL[0] + k * P / 2, sc.kTL[1] - 26, 'kernel');
    paper(g, ox, oy, m);
    el.copies = [];
    for (var q = 0; q < sc.upto; q++) {
      var i = ORDER[q][0], j = ORDER[q][1];
      var cp = { q: q, i: i, j: j, x: ox + S * j * P, y: oy + S * i * P };
      cp.tint = K.rect(g, cp.x, cp.y, k * P, k * P, 'copy');
      el.copies.push(cp);
    }
    K.rect(g, ox, oy, m * P, m * P, 'frame');
    el.copies.forEach(function (cp) { cp.edge = K.rect(g, cp.x, cp.y, k * P, k * P, 'copy-edge'); });
    var shown = valuesAfter(sc, sc.upto);
    el.nums = outNums(g, ox, oy, m, function (r, c) { return shown[r][c]; });
    // each copy's factor at its own outer corner of the output
    el.copies.forEach(function (cp) {
      var left = cp.j === 0, top = cp.i === 0;
      cp.tag = K.text(g, left ? ox - 14 : ox + m * P + 14, top ? oy + 24 : oy + m * P - 24,
        '×' + X[cp.i][cp.j], 'tag' + (left ? ' l' : ''));
    });
    if (sc.id !== 'size') label(g, ox + m * P / 2, oy - 26, 'output');
    // a ring round each input cell that stamps in this step
    el.rings = [];
    if (FROM[sc.id] !== undefined) {
      for (var q2 = FROM[sc.id]; q2 < sc.upto; q2++) {
        var ii = ORDER[q2][0], jj = ORDER[q2][1];
        el.rings.push(K.el('rect', { x: sc.inTL[0] + jj * P, y: sc.inTL[1] + ii * P,
          width: P, height: P, rx: 3, 'class': 'ring' }, g));
      }
    }
    el.mark = sc.sp.cell ? markCell(g, ox, oy, sc.sp.cell) : null;
    if (sc.id === 'double') upArrow(g, sc);
    if (sc.id === 'size') sizeBraces(g, sc);
  }

  // the green arrow of the U-Net, from the input under the kernel to the output
  function upArrow(g, sc) {
    var x0 = sc.inTL[0] + n * P / 2, y0 = sc.inTL[1] + n * P + 14;
    var x1 = sc.oTL[0] + sc.m * P / 2, y1 = sc.oTL[1] + sc.m * P + 26;
    var low = Math.max(y0, y1) + 70;
    el.up = K.el('g', null, g);
    K.path(el.up, 'M' + x0 + ' ' + y0 + 'C' + x0 + ' ' + low + ' ' + x1 + ' ' + low + ' ' + x1 + ' ' + y1, 'up');
    K.path(el.up, 'M' + x1 + ' ' + (y1 - 16) + 'L' + (x1 - 11) + ' ' + (y1 + 3) + 'L' + (x1 + 11) + ' ' + (y1 + 3) + 'Z', 'up-head');
    K.text(el.up, (x0 + x1) / 2, low + 26, 'up-conv 2x2', 'up-label c');
  }

  // the two parts of the output's side: (n-1)s, where the last copy starts, and k, its width
  function sizeBraces(g, sc) {
    var ox = sc.oTL[0], oy = sc.oTL[1], a = (n - 1) * S, k = sc.k;
    el.braces = K.el('g', null, g);
    K.brace(el.braces, ox + 3, ox + a * P - 3, oy - 10, 'up');
    K.brace(el.braces, ox + a * P + 3, ox + (a + k) * P - 3, oy - 10, 'up');
    el.braceTex = [
      K.texAt(el.html, ox + a * P / 2, oy - 60, '(n-1)s=' + a, 'brace-tex'),
      K.texAt(el.html, ox + (a + k / 2) * P, oy - 60, 'k=' + k, 'brace-tex')
    ];
  }

  // ===== the second view: windows on the spread-out, padded input

  function drawWindows(sc) {
    var g = el.root, id = sc.id, gx = G.GRID.x, gy = G.GRID.y, ox = sc.oTL[0], oy = sc.oTL[1];
    var lo = id === 'spread' ? PADW : 0, hi = id === 'spread' ? GM - PADW : GM;
    el.cells = {};
    for (var r = lo; r < hi; r++) {
      for (var c = lo; c < hi; c++) {
        var inp = INPUT_AT[r + ',' + c], cg = K.el('g', null, g);
        K.rect(cg, gx + c * P, gy + r * P, P, P, (inp ? 'c-input' : 'c-zero') + ' cell');
        K.text(cg, gx + (c + 0.5) * P, gy + (r + 0.5) * P, String(WIN.grid[r][c]), 'n ' + (inp ? 'n-input' : 'n-zero'));
        el.cells[r + ',' + c] = cg;
      }
    }
    el.gridFrame = K.rect(g, gx + lo * P, gy + lo * P, (hi - lo) * P, (hi - lo) * P, 'frame');
    // the stride between the first two input cells, and the padding on the right
    var by = id === 'spread' ? gy + PADW * P - 10 : gy - 10, c0 = PADW, c1 = PADW + S;
    el.strideG = K.el('g', null, g);
    K.brace(el.strideG, gx + (c0 + 0.5) * P, gx + (c1 + 0.5) * P, by, 'up');
    K.text(el.strideG, gx + (c0 + c1 + 1) / 2 * P, by - 30, LAB.stride, 'slide-label');
    el.padG = null;
    if (id !== 'spread') {
      el.padG = K.el('g', null, g);
      K.brace(el.padG, gx + (GM - PADW) * P + 3, gx + GM * P - 3, by, 'up');
      K.text(el.padG, gx + (GM - PADW / 2) * P, by - 30, LAB.pad, 'slide-label');
    }
    // the kernel
    cells(g, sc.kTL[0], sc.kTL[1], K4, 'c-kernel', 'n-kernel');
    label(g, G.CK.x, sc.kTL[1] - 26, 'kernel');
    el.kerLabel = (id === 'spread' || id === 'pad') ? null :
      K.text(g, G.CK.x, G.KLAB_Y, LAB.kernel, 'slide-label');
    // the output: the copies' numbers, grey until a window has computed them
    var done = {};
    if (DONE[id]) DONE[id].forEach(function (rc) { done[rc[0] + ',' + rc[1]] = 1; });
    else for (var q = 0; q < OM * OM; q++) done[Math.floor(q / OM) + ',' + (q % OM)] = 1;
    paper(g, ox, oy, OM);
    K.rect(g, ox, oy, OM * P, OM * P, 'frame');
    el.nums = outNums(g, ox, oy, OM, function (rr, cc) { return WIN.out[rr][cc]; },
      function (rr, cc) { return done[rr + ',' + cc] ? '' : ' n-ghost'; });
    label(g, G.CO.x, oy - 26, 'output');
    el.win = null;
    el.mark = null;
    if (id === 'window' || id === 'middle') {
      el.win = windowGroup(g, sc.sp.cell);
      el.mark = markCell(g, ox, oy, sc.sp.cell);
    }
    el.notes = [];
    if (sc.sp.note) {
      // one sentence a line, in the band that layout.js keeps clear above the formula
      var noteLines = sc.sp.note.replace('. ', '.\n').split('\n');
      if (noteLines.length > G.NOTE_LINES) console.error('a note has more lines than layout.js leaves room for');
      noteLines.forEach(function (line, i) {
        el.notes.push(K.text(g, G.CK.x, G.NOTE_Y + G.NOTE_DY * i, line, 'note'));
      });
    }
    el.slideWins = [];
    el.inLabel = null;
    if (id === 'slide') {
      M.SLIDE_WINDOWS.forEach(function (w, i) {
        var ins = 3 + 4 * (i % 3), x = gx + w.at[1] * P, y = gy + w.at[0] * P, s = k4 * P;
        var sg = K.el('g', null, g);
        K.rect(sg, x + ins, y + ins, s - 2 * ins, s - 2 * ins, 'slide-win w-' + w.name);
        K.rect(sg, ox + w.at[1] * P + 3, oy + w.at[0] * P + 3, P - 6, P - 6, 'slide-cell w-' + w.name);
        el.slideWins.push(sg);
      });
      el.inLabel = K.text(g, gx + GM * P / 2, gy + GM * P + 26, LAB.input, 'slide-label');
    }
  }

  // the kernel laid on the grid with its top left on cell (r, c): a window, and the kernel's entry
  // written small in the corner of every cell it covers
  function windowGroup(g, rc) {
    var r = rc[0], c = rc[1], x = G.GRID.x + c * P, y = G.GRID.y + r * P;
    var wg = K.el('g', null, g);
    K.rect(wg, x, y, k4 * P, k4 * P, 'win');
    for (var a = 0; a < k4; a++) {
      for (var b = 0; b < k4; b++) {
        K.text(wg, x + b * P + 5, y + a * P + 4, String(WIN.turned[a][b]),
          'n-small' + (INPUT_AT[(r + a) + ',' + (c + b)] ? ' on-input' : ''));
      }
    }
    return wg;
  }

  // ===== render

  function render(st) {
    clear();
    el.sc = null;
    if (st.kind !== 'step') { el.words.classList.add('off'); return; }
    var sc = scene(st.step);
    el.sc = sc;
    el.words.classList.remove('off');
    K.words(el.h2, sc.sp.heading);
    K.words(el.p, sc.sp.text);
    if (sc.world === 'copies') drawCopies(sc); else drawWindows(sc);
    if (sc.sp.tex) el.formula = K.texAt(el.html, G.CO.x, G.FORMULA_Y, sc.sp.tex);
  }

  // ===== animations of a forward click

  function fadeIn(node, delay, dur) {
    if (!node) return null;
    return K.track(node.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: dur || 450, delay: delay || 0, easing: 'ease-out', fill: 'backwards' }));
  }
  function pop(node, delay) {
    if (!node) return null;
    return K.track(node.animate([
      { transform: 'scale(0.3)', opacity: 0 },
      { transform: 'scale(1.18)', opacity: 1, offset: 0.6 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: 420, delay: delay || 0, easing: 'ease-out', fill: 'backwards' }));
  }
  function moveFrom(node, dx, dy, delay, dur) {
    return K.track(node.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
      { duration: dur || 900, delay: delay || 0, easing: 'ease-in-out', fill: 'backwards' }));
  }

  // the new copies of a step fly from the kernel to their places, one after another; each output
  // number changes when the copy that changes it lands
  function flies(sc, delay0) {
    var from = FROM[sc.id], m = sc.m, ox = sc.oTL[0], oy = sc.oTL[1];
    var fin = valuesAfter(sc, sc.upto), shown = valuesAfter(sc, from), temps = {};
    function temp(r, c, v) {
      return K.text(el.fly, ox + (c + 0.5) * P, oy + (r + 0.5) * P, String(v), 'n n-out');
    }
    for (var r = 0; r < m; r++) {
      for (var c = 0; c < m; c++) {
        if (shown[r][c] === fin[r][c]) continue;
        el.nums[r][c].classList.add('waiting');
        if (shown[r][c] !== null) temps[r + ',' + c] = temp(r, c, shown[r][c]);
      }
    }
    var last = delay0;
    for (var q = from; q < sc.upto; q++) {
      (function (q, t) {
        var cp = el.copies[q], delay = delay0 + t * 520;
        last = delay + 1200;
        [cp.tint, cp.edge, cp.tag].forEach(function (e) { e.classList.add('waiting'); });
        pop(el.rings[t], delay);
        var fg = K.el('g', { 'class': 'fly' }, el.fly);
        cells(fg, 0, 0, sc.ker, 'c-kernel', 'n-kernel');
        var a = sc.kTL, b = [cp.x, cp.y];
        K.track(fg.animate([
          { transform: 'translate(' + a[0] + 'px,' + a[1] + 'px)', opacity: 0 },
          { transform: 'translate(' + a[0] + 'px,' + a[1] + 'px)', opacity: 0.92, offset: 0.15 },
          { transform: 'translate(' + b[0] + 'px,' + b[1] + 'px)', opacity: 0.92, offset: 0.78 },
          { transform: 'translate(' + b[0] + 'px,' + b[1] + 'px)', opacity: 0 }
        ], { duration: 1200, delay: delay, easing: 'ease-in-out', fill: 'both' }), function () {
          if (fg.parentNode) fg.parentNode.removeChild(fg);
        });
        K.later(delay + 940, function () {
          [cp.tint, cp.edge, cp.tag].forEach(function (e) { e.classList.remove('waiting'); });
          fadeIn(cp.tint, 0, 300);
          pop(cp.tag, 0);
          var before = valuesAfter(sc, q), after = valuesAfter(sc, q + 1);
          for (var r2 = 0; r2 < m; r2++) {
            for (var c2 = 0; c2 < m; c2++) {
              if (before[r2][c2] === after[r2][c2]) continue;
              var key = r2 + ',' + c2;
              if (temps[key]) { temps[key].parentNode.removeChild(temps[key]); delete temps[key]; }
              if (after[r2][c2] === fin[r2][c2]) {
                el.nums[r2][c2].classList.remove('waiting');
                pop(el.nums[r2][c2], 0);
              } else {
                temps[key] = temp(r2, c2, after[r2][c2]);
                pop(temps[key], 0);
              }
            }
          }
        });
      })(q, q - from);
    }
    return last;
  }

  function spreadOut() {
    var inTL = [G.CG.x - n * P / 2, G.CG.y - n * P / 2];
    Object.keys(el.cells).forEach(function (key) {
      var ij = INPUT_AT[key], cg = el.cells[key];
      if (!ij) { fadeIn(cg, 1000, 400); return; }
      var pl = M.placeOf(ij[0], ij[1], S, k4);
      moveFrom(cg, inTL[0] + ij[1] * P - (G.GRID.x + pl[1] * P), inTL[1] + ij[0] * P - (G.GRID.y + pl[0] * P), 200, 900);
    });
    fadeIn(el.gridFrame, 1000, 400);
    fadeIn(el.strideG, 1300, 400);
  }

  function padIn() {
    var hiIn = GM - 1 - PADW;
    Object.keys(el.cells).forEach(function (key) {
      var rc = key.split(',').map(Number);
      var ring = Math.max(PADW - rc[0], rc[0] - hiIn, PADW - rc[1], rc[1] - hiIn);
      if (ring > 0) fadeIn(el.cells[key], 200 + (ring - 1) * 300, 350);
    });
    fadeIn(el.gridFrame, 200 + (PADW - 1) * 300, 350);
    moveFrom(el.strideG, 0, PADW * P, 200, 800);
    fadeIn(el.padG, 1200, 400);
  }

  function windowIn(sc, from) {
    var cell = sc.sp.cell, t = el.nums[cell[0]][cell[1]];
    t.classList.add('n-ghost');
    if (from) moveFrom(el.win, (from[1] - cell[1]) * P, (from[0] - cell[0]) * P, 200, 900);
    else fadeIn(el.win, 200, 450);
    if (!from) {
      fadeIn(el.kerLabel, 200, 400);
      el.notes.forEach(function (nt) { fadeIn(nt, 400, 400); });
    }
    K.later(1150, function () { t.classList.remove('n-ghost'); pop(t, 0); });
    pop(el.mark, 1150);
    fadeIn(el.formula, 1300, 450);
  }

  function sweep() {
    var gx = G.GRID.x, gy = G.GRID.y, before = {};
    DONE.middle.forEach(function (rc) { before[rc[0] + ',' + rc[1]] = 1; });
    var tw = K.el('g', { transform: 'translate(' + gx + ',' + gy + ')' }, el.fly);
    K.rect(tw, 0, 0, k4 * P, k4 * P, 'win');
    for (var q = 0; q < OM * OM; q++) {
      (function (r, c) {
        if (!before[r + ',' + c]) el.nums[r][c].classList.add('n-ghost');
        K.later(250 + (r * OM + c) * 70, function () {
          tw.setAttribute('transform', 'translate(' + (gx + c * P) + ',' + (gy + r * P) + ')');
          var t = el.nums[r][c];
          if (t.classList.contains('n-ghost')) { t.classList.remove('n-ghost'); pop(t, 0); }
        });
      })(Math.floor(q / OM), q % OM);
    }
    K.later(250 + OM * OM * 70 + 300, function () { if (tw.parentNode) tw.parentNode.removeChild(tw); });
  }

  function slideIn() {
    el.slideWins.forEach(function (sg, i) { fadeIn(sg, 250 + i * 320, 420); });
    fadeIn(el.inLabel, 250, 400);
    fadeIn(el.formula, 250 + el.slideWins.length * 320, 450);
  }

  function animate(st) {
    if (st.kind !== 'step' || !el.sc) return;
    var sc = el.sc, id = sc.id;
    fadeIn(el.words, 0, 400);
    if (id === 'start') {
      fadeIn(el.root, 0, 500);
    } else if (FROM[id] !== undefined) {
      var start = 250;
      if (id === 'bigger') { fadeIn(el.root, 0, 450); start = 650; }
      var landed = flies(sc, start);
      pop(el.mark, landed - 100);
      fadeIn(el.formula, landed, 450);
      if (el.up) fadeIn(el.up, landed, 500);
    } else if (id === 'size') {
      fadeIn(el.braces, 150, 450);
      el.braceTex.forEach(function (b) { fadeIn(b, 150, 450); });
      fadeIn(el.formula, 700, 450);
    } else if (id === 'spread') spreadOut();
    else if (id === 'pad') padIn();
    else if (id === 'window') windowIn(sc, null);
    else if (id === 'middle') windowIn(sc, DONE.window[0]);
    else if (id === 'every') sweep();
    else if (id === 'slide') slideIn();
  }

  function build(svg, html) {
    el.root = K.el('g', { 'class': 'steps' }, svg);
    el.fly = K.el('g', { 'class': 'flying' }, svg);
    el.html = html;
    el.words = document.getElementById('words');
    el.h2 = el.words.querySelector('h2');
    el.p = el.words.querySelector('p');
  }

  DC.steps = { COUNT: COUNT, build: build, render: render, animate: animate, el: el, scene: scene, LAB: LAB };
})();
