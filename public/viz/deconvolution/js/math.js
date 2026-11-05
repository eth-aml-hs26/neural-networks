/* math.js: every number of the page, as window.DC.math in the browser and module.exports in node
 * (scripts/check-math.js loads this file and asserts what the page shows).
 *
 * THE EXAMPLE
 *   X   the input, 2 by 2: [[2, 1], [3, 4]], four distinct values, so that each term of a sum
 *       names the copy it comes from
 *   K2  the kernel of the up-conv 2x2, 2 by 2: [[1, 2], [2, 1]]
 *   K4  the kernel of the slide, 4 by 4: ones with a 2 by 2 block of twos in the middle. A half turn
 *       leaves it unchanged, so the slide's view slides it as it is (any other kernel is turned by
 *       half a turn first; scripts/check-math.js checks the general rule on other kernels too)
 *   S   the stride, 2
 *
 * THE TWO VIEWS OF A DECONVOLUTIONAL FILTER (a transposed convolution)
 *   copies   each input cell (i, j) adds its value times the kernel into the output, with its top
 *            left corner at (s i, s j); where copies overlap, they add
 *   windows  spread the input out with s - 1 zeros between neighbouring cells, pad it with k - 1
 *            zeros on every side, and slide the kernel turned by half a turn over it with step 1,
 *            as in an ordinary convolution: each window gives one output cell
 *   Both give an output of (n - 1) s + k cells a side.
 */
(function (root) {
  'use strict';

  var X = [[2, 1], [3, 4]];
  var K2 = [[1, 2], [2, 1]];
  var K4 = [[1, 1, 1, 1], [1, 2, 2, 1], [1, 2, 2, 1], [1, 1, 1, 1]];
  var S = 2;

  function zeros(r, c) {
    var m = [];
    for (var i = 0; i < r; i++) { m.push([]); for (var j = 0; j < c; j++) m[i].push(0); }
    return m;
  }

  // the side of the output: the last copy starts (n - 1) s cells after the first, and is k wide
  function outSize(n, s, k) { return (n - 1) * s + k; }

  // the input cells in the order the copies are stamped: reading order
  function order(n) {
    var o = [];
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) o.push([i, j]);
    return o;
  }

  // the output after the first `upto` copies (all of them when upto is undefined), and for every
  // output cell the list of its terms { i, j, x, a, b, k, p }: input cell (i, j) with value x times
  // kernel entry (a, b) with value k gives p
  function copies(x, ker, s, upto) {
    var n = x.length, k = ker.length, m = outSize(n, s, k);
    var out = zeros(m, m), terms = [];
    for (var r = 0; r < m; r++) { terms.push([]); for (var c = 0; c < m; c++) terms[r].push([]); }
    var list = order(n);
    if (upto === undefined) upto = list.length;
    for (var q = 0; q < upto; q++) {
      var i = list[q][0], j = list[q][1];
      for (var a = 0; a < k; a++) {
        for (var b = 0; b < k; b++) {
          var r2 = s * i + a, c2 = s * j + b, p = x[i][j] * ker[a][b];
          out[r2][c2] += p;
          terms[r2][c2].push({ i: i, j: j, x: x[i][j], a: a, b: b, k: ker[a][b], p: p });
        }
      }
    }
    return { out: out, terms: terms, size: m };
  }

  // how many copies cover each output cell after the first `upto` copies
  function cover(n, s, k, upto) {
    var m = outSize(n, s, k), cv = zeros(m, m), list = order(n);
    if (upto === undefined) upto = list.length;
    for (var q = 0; q < upto; q++) {
      for (var a = 0; a < k; a++) for (var b = 0; b < k; b++) cv[s * list[q][0] + a][s * list[q][1] + b]++;
    }
    return cv;
  }

  // the input spread out: s - 1 zeros between neighbouring cells
  function spread(x, s) {
    var n = x.length, m = (n - 1) * s + 1, z = zeros(m, m);
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) z[s * i][s * j] = x[i][j];
    return z;
  }

  // a border of p zeros on every side
  function pad(z, p) {
    var m = z.length, w = zeros(m + 2 * p, m + 2 * p);
    for (var i = 0; i < m; i++) for (var j = 0; j < m; j++) w[i + p][j + p] = z[i][j];
    return w;
  }

  // a half turn: entry (a, b) goes to (k - 1 - a, k - 1 - b)
  function turn(ker) {
    var k = ker.length, t = zeros(k, k);
    for (var a = 0; a < k; a++) for (var b = 0; b < k; b++) t[a][b] = ker[k - 1 - a][k - 1 - b];
    return t;
  }

  function same(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].length !== b[i].length) return false;
      for (var j = 0; j < a[i].length; j++) if (a[i][j] !== b[i][j]) return false;
    }
    return true;
  }

  // where input cell (i, j) sits in the padded grid
  function placeOf(i, j, s, k) { return [k - 1 + s * i, k - 1 + s * j]; }

  // the window whose top left cell is (r, c) on the padded grid g, with kernel w (already turned):
  // its sum, and its nonzero terms { gr, gc, z, a, b, k, p } (grid cell, its value, kernel entry)
  function windowAt(g, w, r, c) {
    var k = w.length, sum = 0, terms = [];
    for (var a = 0; a < k; a++) {
      for (var b = 0; b < k; b++) {
        var z = g[r + a][c + b], p = z * w[a][b];
        sum += p;
        if (z !== 0) terms.push({ gr: r + a, gc: c + b, z: z, a: a, b: b, k: w[a][b], p: p });
      }
    }
    return { sum: sum, terms: terms };
  }

  // the ordinary convolution of the deep learning decks (slides 5 to 12): every window, step 1
  function slide(g, w) {
    var k = w.length, m = g.length - k + 1, out = zeros(m, m);
    for (var r = 0; r < m; r++) for (var c = 0; c < m; c++) out[r][c] = windowAt(g, w, r, c).sum;
    return out;
  }

  // the slide's view in one go
  function byWindows(x, ker, s) {
    var g = pad(spread(x, s), ker.length - 1);
    return { grid: g, turned: turn(ker), out: slide(g, turn(ker)) };
  }

  // card 1: an ordinary convolution, a 4 by 4 map, a 2 by 2 kernel, stride 2
  function convSize(n, k, s, p) { return Math.floor((n + 2 * (p || 0) - k) / s) + 1; }

  // the five windows of slide 13 (BMAI w3_3_unet.pptx, read off the PDF), top left cells on the
  // 9 by 9 grid; each window makes the output cell of the same place. The names are the slide's
  // colours, in its order.
  var SLIDE_WINDOWS = [
    { name: 'green', at: [0, 0] },
    { name: 'tan', at: [0, 2] },
    { name: 'yellow', at: [1, 1] },
    { name: 'magenta', at: [2, 5] },
    { name: 'red', at: [5, 4] }
  ];

  // the cells the steps write out as sums: an overlap of two copies (step 6) and the middle
  // (steps 7 and 12)
  var CELL_TWO = [1, 2];
  var CELL_MID = [2, 2];

  // the U-Net of Ronneberger, Fischer and Brox (2015), Fig. 1: the side of the map that each
  // up-conv 2x2 receives, and what it returns
  var UNET_UP = [[28, 56], [52, 104], [100, 200], [196, 392]];

  var api = {
    X: X, K2: K2, K4: K4, S: S, SLIDE_WINDOWS: SLIDE_WINDOWS, CELL_TWO: CELL_TWO, CELL_MID: CELL_MID,
    UNET_UP: UNET_UP,
    zeros: zeros, outSize: outSize, order: order, copies: copies, cover: cover, spread: spread,
    pad: pad, turn: turn, same: same, placeOf: placeOf, windowAt: windowAt, slide: slide,
    byWindows: byWindows, convSize: convSize
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.DC = root.DC || {}; root.DC.math = api; }
})(typeof window !== 'undefined' ? window : this);
