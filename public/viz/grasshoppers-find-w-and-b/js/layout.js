/* layout.js: where everything sits, as window.GF.geo. The page is one stage of 1600 x 900 that is
 * scaled to the window as a whole, so these are stage pixels and nothing ever leaves the screen.
 *
 * Left: the diagram of Carlos's sketch (IMG_9251, middle, 30 October 2026), left to right: the tall
 * columns y, x, a, yhat and l, one cell per day, and the small square lbar at the right end; the
 * small squares w above x and b above a, w's arrow running down into a and b's line joining it; the
 * arrow a -> yhat carrying the ReLU on a small card. The purple pair of the gradient sits above
 * lbar, and the bracket of the backward pass runs from it over the top into w and into b. The band
 * above the bracket holds the formulas of a click: a worked cell (black), the two updates (purple).
 *
 * Right: the two grounds, lbar against w with b held (top) and against b with w held (bottom),
 * while the red and blue clicks draw them; the rest of the time the plot of y against x, the six
 * days with the hinge of the current pair.
 *
 * setRun(F) takes the views of GFMath.frames once per start.
 */
(function () {
  'use strict';
  var M = window.GFMath;

  var G = {
    W: 1600, H: 900,
    N: M.N,
    CH: 40,          // the height of one cell
    BORDER: 3,       // the frame's line
    UNIT: 18,        // the row of the unit under the cells
    colTop: 416,     // the top of every column's frame

    // the columns: left edge and width
    col: {
      y:    { x: 44,  w: 92 },
      x:    { x: 168, w: 92 },
      a:    { x: 304, w: 140 },
      yhat: { x: 570, w: 112 },
      l:    { x: 724, w: 96 }
    },

    // the single numbers {x, y, w, h}: w above x, b above a (centred on it, where w's arrow enters
    // a), the pair of the gradient (two cells: dlbar/dw and dlbar/db) centred above lbar; lbar is
    // set below, at the middle of the columns
    box: {
      w:    { x: 150, y: 300, w: 128, h: 76 },
      b:    { x: 310, y: 300, w: 128, h: 76 },
      grad: { x: 828, y: 302, w: 200, h: 72 }
    },

    JX: 294,         // where w's arrow turns down, between the boxes w and b
    JY: 396,         // where it runs right to a's centre, and b's line joins it
    LOW: 762,        // the line from y under the columns up into l

    // the bracket of the backward pass: its top, where it comes down into w and into b
    bracket: { top: 226, wx: 258, bx: 418 },

    // the band above the bracket: the worked cell of a black click, and the two updates side by
    // side, w left and b in the middle, each a rule over its numbers, alpha at the right
    band: { strip: 150 },
    upd: { row1: 110, row2: 172, w: 60, b: 640, alpha: 1180 },

    // labels: [x, y, anchor] (anchor as in GFKit.pos)
    label: {
      forward:  [600, 370, 'cc'],
      backward: [600, 206, 'cc'],
      gw:       [878, 298, 'bc'],
      gb:       [978, 298, 'bc']
    },

    // the small plot of the ReLU on its arrow: a from -A to A over 2 half pixels, the same scale
    // upwards, so the rising part climbs at 45 degrees; ox, oy is its origin inside the card, and
    // the card stands gap pixels above the arrow
    relu: { x: 461, w: 92, h: 84, ox: 46, oy: 64, half: 36, A: 80, gap: 33 },

    // The forward pass as a broad arrow behind the boxes, as on the page before (2 November 2026):
    // an outline (clockwise, corners rounded when drawn) and the centre line the reveal follows.
    // It runs along w and b (their names too), turns down into a, runs right through a, the ReLU,
    // yhat and l (the whole columns, 16 pixels clear of their frames; their names sit below it),
    // narrows round lbar and its name, and ends in a head past lbar, left of the plot. x and y stay
    // outside. width: the mask's stroke, so the whole spine covers the whole band.
    pass: {
      forward: {
        outline: [[102, 284], [476, 284], [476, 400], [836, 400], [836, 452], [1002, 452], [1002, 434],
                  [1068, 539], [1002, 644], [1002, 626], [836, 626], [836, 696], [276, 696], [276, 392],
                  [102, 392]],
        spine: [[96, 338], [340, 338], [340, 547], [1084, 547]],
        width: 460
      }
    },

    // the two grounds: axes cross at (ox, oy), the curve fills x0..x1 and rises to ytop; row is
    // where the formula of the ground (or the slope of a hop) sits over it
    ground: {
      w: { ox: 1130, oy: 382, x0: 1155, x1: 1530, ytop: 128, xend: 1562, yend: 96, row: [1158, 54] },
      b: { ox: 1130, oy: 800, x0: 1155, x1: 1530, ytop: 546, xend: 1562, yend: 514, row: [1158, 472] }
    },
    // the magnified ground of a hop: eps is EPS_PX wide, the hop starts at HOP_AT of the width
    EPS_PX: 118, HOP_AT: 0.3, ZOOM_FILL: 0.5,

    // the plot of y against x: the axes cross at (x0, oy); x from xmin to xmax fills x0..x1, y
    // from 0 to ymax rises from oy to top
    plot: { x0: 1160, x1: 1540, oy: 720, top: 300, xmin: -3, xmax: 21, ymax: 72 },

    // the story cards: the picture and the words beside it
    story: { pic: { x: 40, y: 92, w: 920, h: 690 }, text: { x: 1010, y: 150, w: 550 } },

    // the grasshoppers perched on the boxes of w and b: their feet, their scale
    perch: { w: { x: 196, y: 300, s: 0.62 }, b: { x: 356, y: 300, s: 0.62 } },

    // the controls, bottom left
    controls: { x: 40, y: 822 }
  };

  G.cellTop = function (i) { return G.colTop + G.BORDER + i * G.CH; };
  G.mid = G.cellTop(0) + G.N * G.CH / 2;
  G.box.lbar = { x: 870, y: G.mid - 38, w: 116, h: 76 };

  // The frame of a column.
  G.frame = function (name) {
    var c = G.col[name], h = 2 * G.BORDER + G.N * G.CH + G.UNIT;
    return { x: c.x, y: G.colTop, w: c.w, h: h, left: c.x, right: c.x + c.w, cx: c.x + c.w / 2,
             top: G.colTop, bottom: G.colTop + h };
  };

  // Cell i of a column.
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

  // The black arrows, tip last.
  G.routes = function () {
    var y = G.frame('y'), a = G.frame('a'), x = G.frame('x');
    var yh = G.frame('yhat'), l = G.frame('l');
    var w = G.edges('w'), b = G.edges('b'), lb = G.edges('lbar');
    var wy = w.bottom - 16;
    return {
      x2a:    [[x.right, G.mid], [a.left, G.mid]],
      w2a:    [[w.right, wy], [G.JX, wy], [G.JX, G.JY], [a.cx, G.JY], [a.cx, a.top]],
      b2j:    [[b.cx, b.bottom], [b.cx, G.JY]],
      a2yhat: [[a.right, G.mid], [yh.left, G.mid]],
      yhat2l: [[yh.right, G.mid], [l.left, G.mid]],
      l2lbar: [[l.right, G.mid], [lb.left, G.mid]],
      y2l:    [[y.right - 16, y.bottom], [y.right - 16, G.LOW], [l.left + 14, G.LOW], [l.left + 14, l.bottom]]
    };
  };
  G.join = [G.col.a.x + G.col.a.w / 2, G.JY];

  // Where the names sit under the columns: centred, except the name of l, which sits right of the
  // line from y that comes up into l (as on the pages before). And where the operations sit on the
  // arrows.
  // (42 pixels under the frames, so the band of the forward pass passes between them)
  G.nameY = function () { return G.frame('y').bottom + 42; };
  G.nameAt = function (name) {
    var f = G.frame(name), y = G.nameY();
    if (name === 'l') return [f.left + 28, y, 'cl'];
    return [f.cx, y, 'cc'];
  };
  G.reluAt = function () { return [(G.col.a.x + G.col.a.w + G.col.yhat.x) / 2, G.mid - 6]; };
  G.reluCardY = function () { return G.mid - G.relu.gap - G.relu.h; };
  G.meanAt = function () { return [(G.col.l.x + G.col.l.w + G.box.lbar.x) / 2, G.mid - 24]; };

  // The purple arrows: up from lbar into the pair of the gradient, and the bracket from the pair
  // over the top into w, with a branch down into b.
  G.bracketRoutes = function () {
    var B = G.bracket, w = G.edges('w'), b = G.edges('b'), lb = G.edges('lbar'), P = G.edges('grad');
    return {
      up: [[P.cx, lb.top], [P.cx, P.bottom]],
      main: [[P.cx, P.top], [P.cx, B.top], [B.wx, B.top], [B.wx, w.top]],
      branch: [[B.bx, B.top], [B.bx, b.top]]
    };
  };

  // The plot's maps: degrees C to stage x, kWh to stage y.
  var P = G.plot;
  G.px = function (x) { return P.x0 + (x - P.xmin) / (P.xmax - P.xmin) * (P.x1 - P.x0); };
  G.py = function (y) { return P.oy - y / P.ymax * (P.oy - P.top); };

  // The views of one start (GFMath.frames).
  G.setRun = function (F) { G.F = F; };

  window.GF = window.GF || {};
  window.GF.geo = G;
  window.GF.parts = window.GF.parts || {};
})();
