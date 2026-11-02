/* layout.js: where everything sits, as window.GF.geo. The page is one stage of 1600 x 900 that is
 * scaled to the window as a whole, so these are stage pixels and nothing ever leaves the screen.
 *
 * The diagram of Carlos's sketch (IMG_9251, middle, 30 October 2026), left to right: the tall
 * columns y, x, a, yhat and l, one cell per day, and the small square lbar at the right end; the
 * small squares w above x and b above a; behind them the red band of the forward pass; over the
 * top, the bracket of the gradient from lbar into w and b. Right: the plot of y against x. The band above the bracket holds the formulas of the
 * click: a worked cell (black), the two slopes (blue), the two updates (purple).
 *
 * The columns grow from one day (day 3, the day of step 1) to eight: frame(name, t) is the frame of
 * a column at t = 0 (one cell) and t = 1 (eight cells); the arrows and the names follow it.
 */
(function () {
  'use strict';
  var M = window.GFMath;

  var G = {
    W: 1600, H: 900,
    N: M.N,
    CH: 36,          // the height of one cell
    BORDER: 3,       // the frame's line
    UNIT: 18,        // the row of the unit under the cells
    colTop: 376,     // the top of every column's frame at t = 1

    // the columns: left edge and width. Every left edge is that of the box of step 1
    // (../grasshoppers-find-w-and-b/js/layout.js), and so are the widths of y, x, a and yhat, so
    // the boxes of step 1's last picture grow into these columns; l keeps 100 for lbar's room.
    col: {
      y:    { x: 40,  w: 100 },
      x:    { x: 180, w: 100 },
      a:    { x: 330, w: 156 },
      yhat: { x: 616, w: 120 },
      l:    { x: 790, w: 100 }
    },

    // the single numbers {x, y, w, h}, w and b where step 1 has them across; lbar is set below,
    // at the middle of the columns
    box: {
      w: { x: 160, y: 262, w: 140, h: 76 },
      b: { x: 338, y: 262, w: 140, h: 76 }
    },

    JX: 316,         // where w's line turns down, between the boxes w and b (as in step 1)
    JY: 357,         // where it runs right to join b's arrow into a
    LOW1: 572,       // the line from y to l under one day's boxes (t = 0)
    LOW: 776,        // and under the columns (t = 1)

    // the purple pair of the gradient, two cells above lbar (as above the loss in step 1), and the
    // bracket of the backward pass from it over the top into w and into b
    grad: { x: 916, y: 236, cw: 110, h: 76 },
    bracket: { top: 176, wx: 270, bx: 455, rx: 1026 },

    // the band above the bracket: the worked cell (black), the rows of the two slopes (blue), and
    // the two updates side by side, w left and b in the middle, each a rule over its numbers, as in
    // step 1 (purple)
    band: { x: 60, yw: 86, yb: 138, strip: 110 },
    upd: { row1: 86, row2: 140, w: 60, b: 640 },

    // labels: [x, y, anchor] (anchor as in GFKit.pos)
    label: {
      forward:  [646, 318, 'cc'],
      backward: [926, 196, 'cr'],
      nabla:    [906, 274, 'cr'],
      gw:       [971, 232, 'bc'],
      gb:       [1081, 232, 'bc']
    },

    // the small plot of the ReLU on its arrow, as on step 1's card: a from -A to A over 2 half
    // pixels, the same scale upwards, so the rising part climbs at 45 degrees; ox, oy is its origin
    // inside the card, and the card stands gap pixels above the arrow
    relu: { x: 505, w: 92, h: 84, ox: 46, oy: 64, half: 36, A: 80, gap: 33 },

    // The forward pass as a broad arrow behind the boxes, as in step 0 (../grasshopper-finds-w/,
    // pass.forward in its js/layout.js): an outline, clockwise, its corners rounded when drawn, and
    // the centre line its reveal follows, with the width of the stroke that reveals it. Its tail
    // holds w and b with their names, its body the columns a, yhat and l with their names, its
    // neck lbar, and its head points past lbar; y and x stay outside, as in the sketch.
    pass: {
      forward: {
        outline: [[114, 246], [522, 246], [522, 360], [980, 360], [980, 432], [1102, 432], [1102, 408],
                  [1156, 523], [1102, 638], [1102, 614], [980, 614], [980, 742], [304, 742], [304, 354],
                  [114, 354]],
        spine: [[114, 300], [400, 300], [400, 580], [1156, 580]],
        reach: 500
      }
    },

    // the plot of y against x: the axes cross at (x0, oy); x from xmin to xmax fills x0..x1, y
    // from 0 to ymax rises from oy to top
    plot: { x0: 1176, x1: 1540, oy: 688, top: 300, xmin: -3, xmax: 21, ymax: 72 },

    // the two grasshoppers perched on their boxes: feet, scale, and the length of the hop drawn
    perch: {
      w: { x: 206, y: 262, s: 0.62, hop: 28 },
      b: { x: 384, y: 262, s: 0.62, hop: 28 }
    }
  };

  G.cellTop = function (i) { return G.colTop + G.BORDER + i * G.CH; };
  G.mid = G.cellTop(0) + G.N * G.CH / 2;

  var LB = 120, LH = 76;
  G.box.lbar = { x: 966, y: G.mid - LH / 2, w: LB, h: LH };

  function lerp(p, q, t) { return p + (q - p) * t; }

  // The frame of a column at growth t (0: day 3 alone, 1: all eight days).
  G.frame = function (name, t) {
    var c = G.col[name];
    var top1 = G.cellTop(M.DAY) - G.BORDER, h1 = G.CH + G.UNIT + 2 * G.BORDER;
    var topN = G.colTop, hN = 2 * G.BORDER + G.N * G.CH + G.UNIT;
    var y = lerp(top1, topN, t), h = lerp(h1, hN, t);
    return { x: c.x, y: y, w: c.w, h: h, left: c.x, right: c.x + c.w, cx: c.x + c.w / 2, top: y, bottom: y + h };
  };

  // The height of the arrows between the columns: the middle of the cells shown.
  G.ay = function (t) { return lerp(G.cellTop(M.DAY) + G.CH / 2, G.mid, t); };

  // The centre of cell i of a column.
  G.cell = function (name, i) {
    var c = G.col[name];
    return { x: c.x, y: G.cellTop(i), w: c.w, h: G.CH, cx: c.x + c.w / 2, cy: G.cellTop(i) + G.CH / 2 };
  };

  // A box's centre and edges.
  G.edges = function (name) {
    var b = G.box[name];
    return { x: b.x, y: b.y, w: b.w, h: b.h, cx: b.x + b.w / 2, cy: b.y + b.h / 2,
             left: b.x, right: b.x + b.w, top: b.y, bottom: b.y + b.h };
  };

  // The black arrows at growth t, tip last.
  G.routes = function (t) {
    var y = G.frame('y', t), a = G.frame('a', t), x = G.frame('x', t);
    var yh = G.frame('yhat', t), l = G.frame('l', t);
    var w = G.edges('w'), b = G.edges('b'), lb = G.edges('lbar');
    var ay = G.ay(t), low = lerp(G.LOW1, G.LOW, t), wy = w.bottom - 16;
    return {
      x2a:    [[x.right, ay], [a.left, ay]],
      w2a:    [[w.right, wy], [G.JX, wy], [G.JX, G.JY], [a.cx, G.JY]],
      b2a:    [[b.cx, b.bottom], [b.cx, a.top]],
      a2yhat: [[a.right, ay], [yh.left, ay]],
      yhat2l: [[yh.right, ay], [l.left, ay]],
      l2lbar: [[l.right, G.mid], [lb.left, G.mid]],
      y2l:    [[y.right - 16, y.bottom], [y.right - 16, low], [l.left + 14, low], [l.left + 14, l.bottom]]
    };
  };

  // Where the names sit under the columns at growth t: centred, except the name of l, which sits
  // right of the line from y that comes up into l (as in step 0). And where the operations sit on
  // the arrows.
  G.nameY = function (t) { return G.frame('y', t).bottom + 24; };
  G.nameAt = function (name, t) {
    var f = G.frame(name, t), y = G.nameY(t);
    if (name === 'l') return [f.left + 28, y, 'cl'];
    if (name === 'y') return [f.left + 34, y, 'cc'];
    return [f.cx, y, 'cc'];
  };
  G.reluAt = function (t) { return [(G.col.a.x + G.col.a.w + G.col.yhat.x) / 2, G.ay(t) - 6]; };
  G.reluCardY = function (t) { return G.ay(t) - G.relu.gap - G.relu.h; };
  G.meanAt = function () { return [(G.col.l.x + G.col.l.w + G.box.lbar.x) / 2, G.mid - 24]; };

  // The purple arrows: up from lbar into the pair of the gradient, and the bracket from the pair
  // over the top into w, with a branch down into b.
  G.bracketRoutes = function () {
    var B = G.bracket, w = G.edges('w'), b = G.edges('b'), lb = G.edges('lbar'), P = G.grad;
    return {
      up: [[B.rx, lb.top], [B.rx, P.y + P.h]],
      main: [[B.rx, P.y], [B.rx, B.top], [B.wx, B.top], [B.wx, w.top]],
      branch: [[B.bx, B.top], [B.bx, b.top]]
    };
  };

  // The plot's maps: degrees C to stage x, kWh to stage y.
  var P = G.plot;
  G.px = function (x) { return P.x0 + (x - P.xmin) / (P.xmax - P.xmin) * (P.x1 - P.x0); };
  G.py = function (y) { return P.oy - y / P.ymax * (P.oy - P.top); };

  window.GF = window.GF || {};
  window.GF.geo = G;
  window.GF.parts = window.GF.parts || {};
})();
