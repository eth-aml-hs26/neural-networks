/* math.js: the arithmetic of the page, and no DOM. It loads in the page as window.GFMath and in
 * node through require(), so scripts/check-math.js asserts the very numbers the page shows.
 *
 * Six days of Lina's heating. Day i has its mean outdoor temperature x_i in degrees C and the heat
 * y_i in kWh the heating used that day. Carlos asked on 1 November 2026 for six days in place of one:
 * one day cannot fix two numbers, so a run fitted a different hinge from every start. The model
 * guesses every day with the same two numbers:
 *
 *   a = w x + b,   yhat = ReLU(a) = max(0, a),   l = (y - yhat)^2,   lbar = (l_1 + ... + l_6) / 6,
 *
 * cell by cell: x, y, a, yhat and l are columns with one cell per day, w, b and lbar single numbers.
 * Each grasshopper measures the slope of lbar along its own number with a hop of eps, the other
 * number held still:
 *
 *   Delta = lbar(w + eps, b) - lbar(w, b)   (or b + eps),   slope = Delta / eps,
 *
 * which tends to the derivative as eps goes to 0:
 *
 *   dlbar/dw = (1/6) sum_i -2 (y_i - yhat_i) x_i [a_i > 0],   dlbar/db = (1/6) sum_i -2 (y_i - yhat_i) [a_i > 0].
 *
 * A day with a_i <= 0 adds nothing to either sum: on the flat side of the ReLU a small hop leaves
 * its yhat at 0. The update moves both numbers at once: w <- w - alpha dlbar/dw, b <- b - alpha dlbar/db.
 * The six days are six of the eight of the next page (../grasshoppers-many-days/).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFMath = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var X = [-1, 2, 7, 9, 16, 19];       // degrees C, the day's mean outdoor temperature, coldest first
  var Y = [63, 54, 31, 25, 0, 0];      // kWh of heat that day
  var N = X.length;
  var SEQ = [2, 1, 0, 3, 4, 5];        // the order the days came, for the bars of the story's phone
  var EPS = 0.01;        // the grasshoppers' hop
  var ALPHA = 0.01;      // the step of the update
  var W_DEFAULT = -1;    // the start taken when the room gives none
  var B_DEFAULT = 60;
  var MAX = 1000;        // a typed number must lie in [-MAX, MAX]
  var KMAX = 20000;      // the longest run the page computes

  // The second start of the closing click: its run ends on the same hinge.
  var OTHER = { w: -1, b: 10 };

  function relu(a) { return a > 0 ? a : 0; }

  // The forward pass for one pair (w, b): every column, the sum of the losses and their average.
  function forward(w, b) {
    var a = [], yh = [], l = [], s = 0;
    for (var i = 0; i < N; i++) {
      a.push(w * X[i] + b);
      yh.push(relu(a[i]));
      var r = Y[i] - yh[i];
      l.push(r * r);
      s += r * r;
    }
    return { w: w, b: b, a: a, yhat: yh, l: l, sum: s, lbar: s / N };
  }

  function lbar(w, b) { return forward(w, b).lbar; }

  // The days on the flat side (a <= 0): their yhat is 0 and they add nothing to the gradient.
  function flat(w, b) {
    var out = [];
    for (var i = 0; i < N; i++) out.push(!(w * X[i] + b > 0));
    return out;
  }

  // The heating is off on every day: both slopes are 0 and the grasshoppers would never move.
  function dead(w, b) {
    for (var i = 0; i < N; i++) if (w * X[i] + b > 0) return false;
    return true;
  }

  // The exact gradient, with the ReLU's slope 1 where a > 0 and 0 elsewhere.
  function grad(w, b) {
    var gw = 0, gb = 0;
    for (var i = 0; i < N; i++) {
      var a = w * X[i] + b;
      if (a > 0) { var r = Y[i] - a; gw += -2 * r * X[i]; gb += -2 * r; }
    }
    return { w: gw / N, b: gb / N };
  }

  // One measurement: the grasshopper of `who` ('w' or 'b') hops by e, the other number held. The
  // columns before and after the hop, lbar before (l) and after (lp), its change, the slope, the
  // derivative, and for each day whether its yhat moved.
  function hop(who, w, b, e) {
    var wp = who === 'w' ? w + e : w, bp = who === 'b' ? b + e : b;
    var f0 = forward(w, b), f1 = forward(wp, bp), g = grad(w, b);
    var moved = [];
    for (var i = 0; i < N; i++) moved.push(f1.yhat[i] !== f0.yhat[i]);
    return {
      who: who, eps: e, w: w, b: b, wp: wp, bp: bp,
      v: who === 'w' ? w : b, vp: who === 'w' ? wp : bp,
      from: f0, to: f1, moved: moved,
      l: f0.lbar, lp: f1.lbar, delta: f1.lbar - f0.lbar, slope: (f1.lbar - f0.lbar) / e,
      deriv: who === 'w' ? g.w : g.b
    };
  }

  function step(w, b, alpha) {
    var g = grad(w, b);
    return { w: w - alpha * g.w, b: b - alpha * g.b };
  }

  // [p_1, ..., p_n] with p_1 = (w0, b0) and p_{k+1} = step(p_k): the pair of iteration k is p_k.
  // Kept in a small cache, since the page asks for the same run at every render.
  var CACHE = {};
  function run(w0, b0, alpha, n) {
    var key = w0 + '|' + b0 + '|' + alpha;
    var c = CACHE[key];
    if (!c) c = CACHE[key] = [{ w: w0, b: b0 }];
    while (c.length < n) { var p = c[c.length - 1]; c.push(step(p.w, p.b, alpha)); }
    return c.slice(0, n);
  }

  // Where a run ends: iterate until a step moves w and b by less than 1e-13 (at most KMAX steps).
  function limit(w0, b0, alpha) {
    var w = w0, b = b0;
    for (var k = 1; k < KMAX; k++) {
      var s = step(w, b, alpha);
      if (!isFinite(s.w) || !isFinite(s.b)) return null;
      var d = Math.max(Math.abs(s.w - w), Math.abs(s.b - b));
      w = s.w; b = s.b;
      if (d < 1e-13) return { w: w, b: b, k: k };
    }
    return { w: w, b: b, k: KMAX };
  }

  // The iteration where a run settles: from there on, w and b as the page writes them (four
  // decimals) read as where the run ends, so the boxes stop changing (at most KMAX).
  function settleAt(w0, b0, alpha) {
    var L = limit(w0, b0, alpha);
    if (!L) return KMAX;
    var fw = fmt(L.w), fb = fmt(L.b), w = w0, b = b0, last = 0;
    for (var k = 1; k <= L.k; k++) {
      if (fmt(w) !== fw || fmt(b) !== fb) last = k;
      var s = step(w, b, alpha);
      w = s.w; b = s.b;
    }
    return Math.min(KMAX, last + 1);
  }

  // The best fit. Where the gradient is zero, the heating runs on the cold days 1..m and the line
  // w x + b is the least squares line through those days, so the best fit is the best of these
  // lines (m = 2..6), each scored with the full model.
  function bestFit() {
    var best = null;
    for (var m = 2; m <= N; m++) {
      var sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (var i = 0; i < m; i++) { sx += X[i]; sy += Y[i]; sxx += X[i] * X[i]; sxy += X[i] * Y[i]; }
      var w = (m * sxy - sx * sy) / (m * sxx - sx * sx), b = (sy - w * sx) / m;
      var L = lbar(w, b);
      if (!best || L < best.lbar) best = { m: m, w: w, b: b, lbar: L, knot: -b / w };
    }
    return best;
  }

  // A start the room may give: the heating runs on some day, and the run from it ends on the best
  // fit. A few starts (most with b near 0 or below) end elsewhere: a hinge that drops to 0 right
  // after the coldest day, or one that rises, keeps its warm days on the flat side and stops there.
  function takes(w0, b0, alpha) {
    if (dead(w0, b0)) return false;
    var L = limit(w0, b0, alpha === undefined ? ALPHA : alpha), B = bestFit();
    return !!L && Math.abs(L.w - B.w) < 1e-3 && Math.abs(L.b - B.b) < 1e-3;
  }

  // The lowest point of a ground: lbar against one number, the other held. Between two of the
  // values where a day switches on or off, the same days run and lbar is a parabola; the best of
  // the lowest points of these pieces is the lowest point of the ground.
  function lowest(who, held) {
    var cuts = [];
    for (var i = 0; i < N; i++) {
      if (who === 'w' && X[i] !== 0) cuts.push(-held / X[i]);
      if (who === 'b') cuts.push(-held * X[i]);
    }
    cuts.sort(function (p, q) { return p - q; });
    var edges = [-1e6].concat(cuts, [1e6]), best = null;
    for (var k = 0; k + 1 < edges.length; k++) {
      var lo = edges[k], hi = edges[k + 1], mid = (lo + hi) / 2;
      var num = 0, den = 0;
      for (var j = 0; j < N; j++) {
        var on = who === 'w' ? mid * X[j] + held > 0 : held * X[j] + mid > 0;
        if (!on) continue;
        if (who === 'w') { num += X[j] * (Y[j] - held); den += X[j] * X[j]; }
        else { num += Y[j] - held * X[j]; den += 1; }
      }
      var v = den > 0 ? Math.max(lo, Math.min(hi, num / den)) : mid;
      var L = who === 'w' ? lbar(v, held) : lbar(held, v);
      if (!best || L < best.l - 1e-12) best = { v: v, l: L };
    }
    return best.v;
  }

  // The second start of the closing click: OTHER, or the default start when the room typed OTHER.
  function otherStart(w0, b0) {
    if (w0 === OTHER.w && b0 === OTHER.b) return { w: W_DEFAULT, b: B_DEFAULT };
    return { w: OTHER.w, b: OTHER.b };
  }

  // The views of the plots, once per start, so nothing rescales while the pair moves.
  //   n: the iterations to compute (the run settles at n - 1)
  //   W: the ground of grasshopper w, lbar against w with b held; centred on the lowest point of
  //      the first ground and wide enough for every w and every lowest point of the run.
  //   B: the same for grasshopper b.
  //   zoom: the magnified grounds of the hops: one unit of lbar is the same height in both, fitted
  //      to the larger rise of iteration 1, so the steeper slope looks steeper.
  function frames(w0, b0, alpha, e) {
    var K = settleAt(w0, b0, alpha);
    var ps = run(w0, b0, alpha, K + 1);
    var cw = lowest('w', b0), cb = lowest('b', w0);
    var dw = Math.abs(w0 - cw), db = Math.abs(b0 - cb);
    ps.forEach(function (p) {
      dw = Math.max(dw, Math.abs(p.w - cw), Math.abs(lowest('w', p.b) - cw));
      db = Math.max(db, Math.abs(p.b - cb), Math.abs(lowest('b', p.w) - cb));
    });
    dw = Math.max(dw, 0.4);
    db = Math.max(db, 2);
    var W = { lo: cw - 1.3 * dw, hi: cw + 1.3 * dw };
    W.lmax = Math.max(lbar(W.lo, b0), lbar(W.hi, b0), lbar(w0, b0)) || 1;
    var B = { lo: cb - 1.3 * db, hi: cb + 1.3 * db };
    B.lmax = Math.max(lbar(w0, B.lo), lbar(w0, B.hi), lbar(w0, b0)) || 1;
    var hw = hop('w', w0, b0, e), hb = hop('b', w0, b0, e);
    var big = Math.max(Math.abs(hw.delta), Math.abs(hb.delta)) || 1;
    return { n: K + 1, K: K, W: W, B: B, zoom: { big: big } };
  }

  // What the room types: "-1", "60", "0,5", ".5". Anything else gives null.
  function parse(s) {
    var t = String(s === undefined || s === null ? '' : s).trim().replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var v = parseFloat(t);
    return isFinite(v) && Math.abs(v) <= MAX ? v : null;
  }

  // ===== numbers as TeX (the same rules as the pages before this one)

  function trim(s) {
    return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  }

  function group(intPart) {
    return intPart.length > 4 ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,') : intPart;
  }

  // m \times 10^{e} with sig significant digits.
  function sci(v, sig) {
    var a = Math.abs(v);
    var e = Math.floor(Math.log10(a));
    var m = trim((a / Math.pow(10, e)).toFixed(sig - 1));
    if (m === '10') { e += 1; m = '1'; }
    return (v < 0 ? '-' : '') + m + '\\times 10^{' + e + '}';
  }

  // A number as TeX: at most dec decimals (4 by default), trailing zeros dropped, thousands grouped
  // by thin spaces, at most 2 decimals from a thousand and none from 100 000, and m x 10^e for a
  // number too small for dec decimals or from ten million.
  function fmt(v, dec) {
    if (dec === undefined) dec = 4;
    if (!isFinite(v)) return '\\infty';
    var a = Math.abs(v);
    if (a !== 0 && a < 0.5 * Math.pow(10, -dec)) return sci(v, 3);
    if (a >= 1e7) return sci(v, 4);
    var d = a >= 1e5 ? 0 : a >= 1e3 ? Math.min(dec, 2) : dec;
    var s = trim(a.toFixed(d));
    if (s === '0') return '0';
    var p = s.split('.');
    p[0] = group(p[0]);
    return (v < 0 ? '-' : '') + p.join('.');
  }

  // A number in a cell of a column: at most two decimals, and 0 for anything that rounds to 0.
  function fmtCell(v) {
    var s = fmt(v, 2);
    return s.indexOf('times') >= 0 ? '0' : s;
  }

  // A component of the gradient: four decimals, and 0 once it rounds to 0 there (a settled run).
  function fmtGrad(v) {
    var s = fmt(v);
    return s.indexOf('times') >= 0 ? '0' : s;
  }

  // A number as TeX with n significant digits (zeros dropped).
  function fmtSig(v, n) {
    if (!isFinite(v)) return '\\infty';
    if (v === 0) return '0';
    var a = Math.abs(v);
    var e = Math.floor(Math.log10(a));
    if (e < -6 || e >= 7) return sci(v, n);
    var d = Math.max(0, n - 1 - e);
    var s = trim(a.toFixed(d));
    var p = s.split('.');
    p[0] = group(p[0]);
    return (v < 0 ? '-' : '') + p.join('.');
  }

  // A number inside a formula: in parentheses when it is negative or written as m x 10^e, as in
  // (63 - (-1.7))^2 or 0.01 x (3.04 x 10^-6).
  function wrap(v, dec) {
    var s = fmt(v, dec);
    return s.charAt(0) === '-' || s.indexOf('times') >= 0 ? '(' + s + ')' : s;
  }

  // A number written by fmt, read back (thin spaces dropped).
  function num(s) { return parseFloat(String(s).replace(/\\,/g, '')); }
  function decimals(s) { var i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }

  // A hop as the page writes it: lbar before (l0) and after (l1) with four decimals (more when the
  // change is below 0.01, so it keeps two or three significant digits), their difference as
  // written (delta), and the slope as that difference divided by eps, so every subtraction and
  // the division on the screen are exact.
  function hopShown(H) {
    var d = Math.abs(H.delta);
    var dec = d >= 0.01 || d === 0 ? 4 : Math.min(12, Math.ceil(-Math.log10(d)) + 2);
    var l1 = fmt(H.lp, dec), l0 = fmt(H.l, dec);
    var dv = num(l1) - num(l0);
    var ddec = Math.max(decimals(l1), decimals(l0));
    var sv = dv / H.eps;
    var sdec = Math.max(0, ddec - Math.round(-Math.log10(H.eps)));
    var delta = Math.abs(dv) < 0.5 * Math.pow(10, -ddec) ? '0' : fmt(dv, ddec);
    var slope = Math.abs(sv) < 0.5 * Math.pow(10, -Math.max(sdec, 2)) ? '0' : fmt(sv, Math.max(sdec, 2));
    return { l1: l1, l0: l0, delta: delta, deltaValue: dv, eps: fmt(H.eps, 6), slope: slope,
             slopeValue: sv, deriv: fmtGrad(H.deriv) };
  }

  // The hops of the limit, eps = 0.01, 0.001, 0.0001, 0.00001: the slope tends to the derivative.
  var LIMIT_EPS = [0.01, 0.001, 0.0001, 0.00001];
  function limitRow(who, w, b) {
    return LIMIT_EPS.map(function (e) { return { eps: e, slope: hop(who, w, b, e).slope }; });
  }

  return {
    X: X, Y: Y, N: N, SEQ: SEQ, EPS: EPS, ALPHA: ALPHA, W_DEFAULT: W_DEFAULT, B_DEFAULT: B_DEFAULT,
    MAX: MAX, KMAX: KMAX, OTHER: OTHER, LIMIT_EPS: LIMIT_EPS,
    relu: relu, forward: forward, lbar: lbar, flat: flat, dead: dead, grad: grad, hop: hop, step: step,
    run: run, limit: limit, settleAt: settleAt, bestFit: bestFit, takes: takes, lowest: lowest,
    otherStart: otherStart, frames: frames, limitRow: limitRow,
    parse: parse, fmt: fmt, fmtCell: fmtCell, fmtGrad: fmtGrad, fmtSig: fmtSig, sci: sci, wrap: wrap,
    num: num, hopShown: hopShown
  };
}));
