/* layout.js: where everything sits, as window.GF.geo. The page is one stage of 1600 x 900 that is
 * scaled to the window as a whole, so these are stage pixels and nothing ever leaves the screen.
 *
 * Left: the diagram of Carlos's sketch (photo of 30 October 2026): y, x, w, yhat and the loss in
 * black boxes, and the purple box of dl/dw above the loss. The forward pass is a red band, a broad
 * arrow from w through yhat to the loss; the backward pass a purple one, from the loss through
 * dl/dw back to w. Right: the red plot of l(w) at the bottom and the blue magnified view above it.
 * The band above the diagram holds the blue formulas, then the purple update formula.
 *
 * The plot has a view per iteration (viewOf): it holds the minimum y / x, the w of the iteration and
 * the next one, so the jump lands inside it; the first one also holds w = 0, so a guess shows where
 * it lies on the real curve. From one iteration to the next the plot zooms (js/red.js).
 */
(function () {
  'use strict';
  var M = window.GFMath;

  var G = {
    W: 1600, H: 900,

    // boxes {x, y, w, h}
    box: {
      y:    { x: 40,  y: 520, w: 110, h: 96 },
      x:    { x: 205, y: 520, w: 110, h: 96 },
      w:    { x: 195, y: 320, w: 150, h: 96 },
      yhat: { x: 395, y: 520, w: 170, h: 96 },
      loss: { x: 645, y: 520, w: 190, h: 96 },
      grad: { x: 645, y: 320, w: 190, h: 96 }
    },

    // the routes of the arrows, tip last
    route: {
      x2yhat: [[315, 568], [395, 568]],
      yhat2l: [[565, 568], [645, 568]],
      w2yhat: [[345, 368], [480, 368], [480, 520]],
      y2l:    [[130, 616], [130, 748], [664, 748], [664, 616]],
      l2grad: [[740, 520], [740, 416]],
      back:   [[740, 320], [740, 228], [318, 228], [318, 320]]
    },

    // labels: [x, y, anchor] (anchor as in GFKit.pos)
    label: {
      y:    [85, 672, 'cc'],
      x:    [260, 672, 'cc'],
      w:    [174, 368, 'cr'],
      yhat: [480, 672, 'cc'],
      loss: [680, 674, 'cl'],
      grad: [868, 368, 'cl'],
      forward:  [380, 284, 'cc'],
      backward: [868, 228, 'cl']
    },

    // The two passes as broad arrows behind the boxes: an outline (clockwise, corners rounded
    // when drawn) and the centre line the reveal follows. Forward: round w, down through yhat, along
    // to the loss, the head past it. Backward: round the loss, up through dl/dw, along the top, the
    // head down onto w.
    pass: {
      forward: {
        outline: [[182, 304], [581, 304], [581, 504], [851, 504], [851, 486], [915, 568], [851, 650],
                  [851, 632], [379, 632], [379, 432], [182, 432]],
        spine: [[182, 368], [480, 368], [480, 568], [915, 568]]
      },
      backward: {
        outline: [[286, 194], [851, 194], [851, 634], [629, 634], [629, 262], [380, 262], [318, 316],
                  [256, 262], [286, 262]],
        spine: [[740, 634], [740, 228], [318, 228], [318, 316]]
      }
    },

    // the red plot: axes cross at (ox, oy), the curve fills x0..x1 and rises to ytop
    plot: { ox: 1040, oy: 850, x0: 1060, x1: 1530, ytop: 476, xend: 1556, yend: 446 },

    // a zoom of the plot from one iteration to the next lasts this long (js/red.js, js/purple.js);
    // at speed 3, where it comes with every jump, less
    ZOOM_MS: 1000, ZOOM_MS_FAST: 650,

    // regions the blue part draws in (see the brief in README.md)
    inset: { x: 1000, y: 30, w: 570, h: 370 },
    band:  { x: 360, y: 60, w: 630, h: 185 },

    // the grasshopper perched on the box of w: its feet, its scale
    perch: { x: 252, y: 320, s: 0.62 },

    // the controls, bottom left
    controls: { x: 40, y: 822 }
  };

  // A box's centre and edges.
  G.mid = function (name) {
    var b = G.box[name];
    return { x: b.x + b.w / 2, y: b.y + b.h / 2, top: b.y, bottom: b.y + b.h, left: b.x, right: b.x + b.w };
  };

  // The view of the plot for an iteration whose w is wk and whose update gives wn: {wlo, whi, lmax}.
  // The first view is the plain plot of l(w) for w from -0.1 to 0.6 (a rate in GB a day), widened
  // to hold the guess and the next w: the same curve for every guess, with the guess where it lies
  // on it. Later views hold the minimum, wk and wn with a margin, more room past the minimum than
  // past wk so the valley shows both walls; from one iteration to the next the plot zooms. A view
  // never gets narrower than DMIN around the minimum: once w has settled the zoom stops.
  var DMIN = 0.001, BASE = [-0.1, 0.6];
  function lossTop(lo, hi) { return 1.06 * Math.max(M.loss(lo), M.loss(hi)); }
  G.viewOf = function (wk, wn, first) {
    var star = M.W_STAR, lo, hi;
    if (first) {
      var pad = 0.06 * (Math.max(BASE[1], wk, wn) - Math.min(BASE[0], wk, wn));
      lo = Math.min(BASE[0], Math.min(wk, wn) - pad);
      hi = Math.max(BASE[1], Math.max(wk, wn) + pad);
      return { wlo: lo, whi: hi, lmax: lossTop(lo, hi) };
    }
    var a = Math.min(star, wk, wn), b = Math.max(star, wk, wn);
    var s = Math.max(b - a, DMIN), d = Math.max(Math.abs(wk - star), DMIN);
    lo = a - 0.3 * s; hi = b + 0.3 * s;
    if (wk >= star) lo = Math.min(lo, star - 0.55 * d);
    else hi = Math.max(hi, star + 0.55 * d);
    return { wlo: lo, whi: hi, lmax: lossTop(lo, hi) };
  };

  // Two views between which a zoom runs: the scale moves geometrically, so a zoom by 10 looks as
  // steady as a zoom by 2.
  G.mixView = function (u, v, t) {
    function geo(p, q) { return p * Math.pow(q / p, t); }
    var cu = (u.wlo + u.whi) / 2, cv = (v.wlo + v.whi) / 2;
    var su = u.whi - u.wlo, sv = v.whi - v.wlo, sw = geo(su, sv);
    // the centre moves so that the fraction of the way the width has shrunk is matched
    var f = Math.abs(sv - su) < 1e-15 ? t : (sw - su) / (sv - su);
    var c = cu + (cv - cu) * f;
    return { wlo: c - sw / 2, whi: c + sw / 2, lmax: geo(u.lmax, v.lmax) };
  };

  G.zoomMs = function (mode) { return mode === 3 ? G.ZOOM_MS_FAST : G.ZOOM_MS; };

  G.sameView = function (u, v) {
    return !!u && !!v && u.wlo === v.wlo && u.whi === v.whi && u.lmax === v.lmax;
  };

  // Frame the plot with view v. Sets plot.wlo, plot.whi, plot.lmax and the maps wx (w to stage x),
  // ly (loss to stage y), xw (stage x to w), which read them at every call.
  G.setView = function (v) {
    var P = G.plot;
    P.wlo = v.wlo; P.whi = v.whi; P.lmax = v.lmax;
  };
  G.wx = function (w) { var P = G.plot; return P.x0 + (w - P.wlo) / (P.whi - P.wlo) * (P.x1 - P.x0); };
  G.ly = function (l) { var P = G.plot; return P.oy - l / P.lmax * (P.oy - P.ytop); };
  G.xw = function (x) { var P = G.plot; return P.wlo + (x - P.x0) / (P.x1 - P.x0) * (P.whi - P.wlo); };

  // Nice ticks between lo and hi, about n of them: [{v, text}], text with as many decimals as the
  // step needs (a minus sign and thin spaces between thousands, as KaTeX would set them).
  var MINUS = String.fromCharCode(0x2212), THIN = String.fromCharCode(0x2009);
  G.ticks = function (lo, hi, n) {
    var raw = (hi - lo) / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / p, step = (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
    var dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    var out = [];
    for (var v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9 * step; v += step) {
      var t = Math.abs(v) < step / 2 ? '0' : Math.abs(v).toFixed(dec);
      var ip = t.split('.')[0], fp = t.split('.')[1];
      if (ip.length > 4) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
      t = ip + (fp ? '.' + fp : '');
      out.push({ v: v, text: (v < 0 && t !== '0' ? MINUS : '') + t });
    }
    return out;
  };

  window.GF = window.GF || {};
  window.GF.geo = G;
  window.GF.parts = window.GF.parts || {};
})();
