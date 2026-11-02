/* layout.js: where everything sits, as window.GF.geo. The page is one stage of 1600 x 900 that is
 * scaled to the window as a whole, so these are stage pixels and nothing ever leaves the screen.
 *
 * The diagram of Carlos's sketch (IMG_9252, 30 October 2026), left to right along the bottom: the
 * tall columns y and x (one cell per day), the tables A and Z (one row per day, one column per
 * neuron), the tall columns yhat and l, and the small square lbar at the right end. Above: the
 * columns w and b (one cell per neuron), w above x and b above A, and right of the middle, above
 * yhat and l, the two columns of the gradient at the same height, so that row j reads straight
 * across all four. Over the top, the bracket of the gradient from lbar into w and b. The band
 * between the title and the bracket holds the formulas of the click. Right: the plot of the
 * aphids against the days, tall, as the counts grow.
 */
(function () {
  'use strict';
  var M = window.SwarmMath;

  var G = {
    W: 1600, H: 900,
    N: M.DEFAULTS.x.length,
    M: M.DEFAULTS.m,
    CH: 34,          // the height of one cell
    BORDER: 3,       // the frame's line
    UNIT: 16,        // the row of the unit under the cells
    colTop: 418,     // the top of the frames of the bottom row
    mTop: 188,       // the top of the frames of w, b and the gradient

    // the columns of the bottom row (one cell per day): left edge and width
    col: {
      y:    { x: 50,  w: 70 },
      x:    { x: 150, w: 56 },
      yhat: { x: 852, w: 82 },
      l:    { x: 966, w: 92 }
    },
    // the tables (one cell per day and neuron): left edge of the frame and width of a cell
    tab: {
      A: { x: 252, cw: 60 },
      Z: { x: 560, cw: 60 }
    },
    // the columns of one cell per neuron
    mcol: {
      w:  { x: 139, w: 100 },
      b:  { x: 325, w: 100 },
      gw: { x: 856, w: 92 },
      gb: { x: 970, w: 92 }
    },
    lbar: { x: 1112, w: 102, h: 72 },

    // the bracket of the gradient: its top bar
    top: 152,
    // the band of formulas: two rows, from x on
    band: { x: 262, y1: 88, y2: 132, right: 1236 },

    // the plot: x (days) from xmin to xmax fills x0..x1, y (aphids) from 0 to ymax rises from oy
    // to top
    plot: { x0: 1294, x1: 1532, oy: 706, top: 122, xmin: 0, xmax: 11, ymax: 125 },

    // the story cards: the picture and the words beside it (as on step 1)
    story: { pic: { x: 40, y: 92, w: 920, h: 690 }, text: { x: 1010, y: 150, w: 550 } }
  };

  // ===== the bottom row

  G.cellTop = function (i) { return G.colTop + G.BORDER + i * G.CH; };
  G.rowsBottom = G.cellTop(G.N);
  G.mid = G.colTop + G.BORDER + G.N * G.CH / 2;          // the middle of the rows
  G.frameH = 2 * G.BORDER + G.N * G.CH + G.UNIT;
  G.bottom = G.colTop + G.frameH;                          // the foot of the frames
  G.nameY = G.bottom + 24;                                 // the names under them
  G.low = G.bottom + 66;                                   // the line from y under everything into l

  // A column of the bottom row: its frame and the centre of cell i.
  G.frame = function (name) {
    var c = G.col[name];
    return { x: c.x, y: G.colTop, w: c.w, h: G.frameH, left: c.x, right: c.x + c.w, cx: c.x + c.w / 2,
             top: G.colTop, bottom: G.bottom };
  };
  G.cell = function (name, i) {
    var c = G.col[name], y = G.cellTop(i);
    return { x: c.x, y: y, w: c.w, h: G.CH, cx: c.x + c.w / 2, cy: y + G.CH / 2 };
  };

  // A table with k of its m columns shown (k = m in the end; k = 1 is a column of its own).
  G.tframe = function (name, k) {
    var T = G.tab[name], w = 2 * G.BORDER + (k === undefined ? G.M : k) * T.cw;
    return { x: T.x, y: G.colTop, w: w, h: G.frameH, left: T.x, right: T.x + w, cx: T.x + w / 2,
             top: G.colTop, bottom: G.bottom };
  };
  G.tcell = function (name, i, j) {
    var T = G.tab[name], x = T.x + G.BORDER + j * T.cw, y = G.cellTop(i);
    return { x: x, y: y, w: T.cw, h: G.CH, cx: x + T.cw / 2, cy: y + G.CH / 2 };
  };
  // the centre of column j of a table, at the height of its index disc
  G.thead = function (name, j) {
    var T = G.tab[name];
    return { x: T.x + G.BORDER + (j + 0.5) * T.cw, y: G.colTop - 14 };
  };

  // ===== the columns of one cell per neuron (w, b and the gradient)

  // The frame at growth t: one cell (t = 0, the single number of step 2) to m cells (t = 1). The
  // gradient columns have no unit row.
  G.mframe = function (name, t) {
    var c = G.mcol[name], unit = name === 'w' || name === 'b' ? G.UNIT : 0;
    var rows = 1 + (G.M - 1) * (t === undefined ? 1 : t);
    var h = 2 * G.BORDER + rows * G.CH + unit;
    return { x: c.x, y: G.mTop, w: c.w, h: h, left: c.x, right: c.x + c.w, cx: c.x + c.w / 2,
             top: G.mTop, bottom: G.mTop + h };
  };
  G.mcell = function (name, j) {
    var c = G.mcol[name], y = G.mTop + G.BORDER + j * G.CH;
    return { x: c.x, y: y, w: c.w, h: G.CH, cx: c.x + c.w / 2, cy: y + G.CH / 2 };
  };
  // the index discs of the neurons, between the columns w and b
  G.mdisc = function (j) { return { x: G.mcol.w.x + G.mcol.w.w + 18, y: G.mcell('w', j).cy }; };

  // ===== the small square lbar

  G.lbarBox = function () {
    var L = G.lbar, y = G.mid - L.h / 2;
    return { x: L.x, y: y, w: L.w, h: L.h, left: L.x, right: L.x + L.w, cx: L.x + L.w / 2, cy: G.mid,
             top: y, bottom: y + L.h };
  };

  // ===== the arrows of the forward pass, tip last

  G.routes = function () {
    var y = G.frame('y'), x = G.frame('x'), A = G.tframe('A'), Z = G.tframe('Z');
    var yh = G.frame('yhat'), l = G.frame('l'), lb = G.lbarBox();
    var w = G.mframe('w', 1), b = G.mframe('b', 1), m = G.mid, wy = w.bottom - 8;
    return {
      x2A:    [[x.right, m], [A.left, m]],
      w2A:    [[w.right, wy], [w.right + 34, wy], [w.right + 34, G.colTop - 30], [b.cx, G.colTop - 30]],
      b2A:    [[b.cx, b.bottom], [b.cx, A.top]],
      A2Z:    [[A.right, m], [Z.left, m]],
      Z2yhat: [[Z.right, m], [yh.left, m]],
      yhat2l: [[yh.right, m], [l.left, m]],
      l2lbar: [[l.right, m], [lb.left, m]],
      y2l:    [[y.right - 16, y.bottom], [y.right - 16, G.low], [l.left + 14, G.low], [l.left + 14, l.bottom]]
    };
  };

  // The old diagram of step 2 (one w, one b, one column a), drawn where the new boxes will stand:
  // w and b are the first cells of their columns, a the first column of A, and yhat, l and lbar
  // their own boxes.
  G.oldRoutes = function () {
    var a = G.tframe('A', 1), yh = G.frame('yhat'), m = G.mid;
    var w = G.mframe('w', 0), b = G.mframe('b', 0), wy = w.bottom - 8;
    return {
      w2a:    [[w.right, wy], [a.cx, wy], [a.cx, a.top]],
      b2a:    [[b.cx, b.bottom], [b.cx, G.colTop - 30], [a.cx, G.colTop - 30]],
      a2yhat: [[a.right, m], [yh.left, m]]
    };
  };

  // ===== the bracket of the gradient: from lbar up, left over the top, and down into w and b;
  // the gradient columns hang from its top bar

  G.bracketRoutes = function () {
    var w = G.mframe('w', 1), b = G.mframe('b', 1), lb = G.lbarBox();
    var gw = G.mframe('gw', 1), gb = G.mframe('gb', 1);
    return {
      main:   [[lb.cx, lb.top], [lb.cx, G.top], [w.cx, G.top], [w.cx, w.top]],
      branch: [[b.cx, G.top], [b.cx, b.top]],
      hangW:  [[gw.cx, G.top], [gw.cx, gw.top]],
      hangB:  [[gb.cx, G.top], [gb.cx, gb.top]]
    };
  };

  // ===== the forward pass as a band (2 November 2026, step 0's red band in place of the hand-drawn
  // loop): a broad arrow behind the boxes, an outline (clockwise; corners rounded when drawn) and the
  // spine its reveal follows. It holds w and b with their grasshoppers and names in its top block,
  // comes down into A, and runs right through A, Z, yhat, l (the names under the tables inside) to
  // its head, which points past lbar and stops short of the numbers of the plot's axis. Its top edge
  // runs under the columns of the gradient and their names, which belong to the backward pass, and
  // the column beside l stays inside it, clear of the outline, for the blue numbers of the gradient
  // part (the change of each l during a hop, the terms of the shortcut). y and x stay outside.

  G.passForward = function () {
    var w = G.mframe('w', 1), b = G.mframe('b', 1), A = G.tframe('A'), l = G.frame('l'), lb = G.lbarBox();
    var top = G.mTop - 18, join = G.colTop - 32, left = w.left - 67, right = b.right + 75;
    var bl = A.left - 16, br = l.right + 92, bot = G.nameY + 26;
    var tip = [lb.right + 56, G.mid], sx = b.cx - 10, sy = (top + join) / 2;
    // right of Z's discs the top edge steps down, under the names of the gradient's columns
    var step = G.tframe('Z').right + 12, low = join + 18;
    return {
      outline: [[left, top], [right, top], [right, join], [step, join], [step + 22, low], [br, low], tip,
                [br, bot], [bl, bot], [bl, join], [left, join]],
      spine: [[left - 20, sy], [sx, sy], [sx, G.mid], [tip[0] + 10, G.mid]],
      reach: 600
    };
  };

  // ===== the names and the marks on the arrows

  G.label = {
    forward:  [672, G.colTop - 56, 'cc'],
    backward: [1100, G.top - 18, 'cc'],
    nabla:    [1018, G.top - 18, 'cr']
  };

  // ===== the grasshoppers: one beside every cell of w (on its left, facing it) and of b (on its
  // right, facing it). Feet on the cell's floor; hop: a little further out, standing taller.

  G.HOP_S = 0.34;
  G.perch = function (which, j) {
    var c = G.mcell(which, j), left = which === 'w';
    return { x: left ? c.x - 25 : c.x + c.w + 25, y: c.y + c.h - 5, a: 0, s: G.HOP_S, f: left ? 1 : -1, q: 1 };
  };
  G.hopPose = function (which, j) {
    var p = G.perch(which, j), left = which === 'w';
    return { x: p.x + (left ? -12 : 12), y: p.y - 3, a: 0, s: G.HOP_S * 1.18, f: p.f, q: 1 };
  };
  G.crouch = function (which, j) {
    var p = G.perch(which, j);
    p.q = 0.8;
    return p;
  };

  // ===== the plot's maps: days to stage x, aphids to stage y

  var P = G.plot;
  G.setRange = function (ymax) {
    P.ymax = ymax;
    G.py = function (y) { return P.oy - y / P.ymax * (P.oy - P.top); };
  };
  G.px = function (x) { return P.x0 + (x - P.xmin) / (P.xmax - P.xmin) * (P.x1 - P.x0); };
  G.setRange(P.ymax);

  window.GF = window.GF || {};
  window.GF.geo = G;
  window.GF.parts = window.GF.parts || {};
})();
