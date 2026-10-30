/* math.js: the arithmetic of the page, and no DOM. It loads in the page as window.GFMath and in
 * node through require(), so scripts/check-math.js asserts the very numbers the page shows.
 *
 * The heating bill on eight days (step 2 of the grasshopper series). Day i has its mean outdoor
 * temperature x_i in degrees C and the heat y_i in kWh the heating used that day. The model guesses
 * every day with the same two numbers:
 *
 *   a = w x + b,   yhat = ReLU(a) = max(0, a),   l = (y - yhat)^2,   lbar = (l_1 + ... + l_8) / 8,
 *
 * cell by cell: x, y, a, yhat and l are columns with one cell per day, w, b and lbar single numbers.
 * Each grasshopper measures the slope of lbar on its own number with a hop of eps,
 *
 *   Delta = lbar(w + eps, b) - lbar(w, b),   slope = Delta / eps,
 *
 * which tends to the derivative as eps goes to 0:
 *
 *   dlbar/dw = (1/8) sum_i -2 (y_i - yhat_i) x_i [a_i > 0],   dlbar/db = (1/8) sum_i -2 (y_i - yhat_i) [a_i > 0].
 *
 * A day with a_i <= 0 adds nothing to either sum: on the flat side of the ReLU a small hop leaves
 * its yhat at 0. The update moves both numbers at once: w <- w - alpha dlbar/dw, b <- b - alpha dlbar/db.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFMath = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var X = [-1, 2, 5, 7, 9, 12, 16, 19];   // degrees C, the day's mean outdoor temperature
  var Y = [63, 54, 40, 31, 25, 11, 0, 0];  // kWh of heat that day
  var N = X.length;
  var DAY = 2;            // the index of day 3 (x = 5, y = 40), the one day of step 1
  var EPS = 0.01;         // the grasshoppers' hop
  var ALPHA = 0.01;       // the step of the update, as in step 1
  var W0 = -1, B0 = 60;   // the start, as in step 1
  var KMAX = 20000;       // the longest run the page computes

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

  // The exact gradient, with the ReLU's slope 1 where a > 0 and 0 elsewhere.
  function grad(w, b) {
    var gw = 0, gb = 0;
    for (var i = 0; i < N; i++) {
      var a = w * X[i] + b;
      if (a > 0) { var r = Y[i] - a; gw += -2 * r * X[i]; gb += -2 * r; }
    }
    return { w: gw / N, b: gb / N };
  }

  // The days on the flat side (a <= 0): their yhat is 0 and they add nothing to the gradient.
  function flat(w, b) {
    var out = [];
    for (var i = 0; i < N; i++) out.push(w * X[i] + b <= 0);
    return out;
  }

  // One grasshopper's measurement: which is 'w' or 'b'. The columns before and after the hop, the
  // change of lbar, the slope, the derivative, and for each day whether its yhat moved.
  function hop(w, b, which, eps) {
    var f0 = forward(w, b);
    var f1 = which === 'w' ? forward(w + eps, b) : forward(w, b + eps);
    var g = grad(w, b);
    var moved = [];
    for (var i = 0; i < N; i++) moved.push(f1.yhat[i] !== f0.yhat[i]);
    var delta = f1.lbar - f0.lbar;
    return {
      which: which, eps: eps, from: f0, to: f1, moved: moved,
      delta: delta, slope: delta / eps, deriv: which === 'w' ? g.w : g.b
    };
  }

  function step(w, b, alpha) {
    var g = grad(w, b);
    return [w - alpha * g.w, b - alpha * g.b];
  }

  // A run from (w0, b0): W[k - 1], B[k - 1] are w and b of iteration k (W[0] = w0), for k up to n.
  // Kept in a small cache, since the page asks for the same run at every render.
  var CACHE = {};
  function run(w0, b0, alpha, n) {
    var key = w0 + '|' + b0 + '|' + alpha;
    var c = CACHE[key];
    if (!c) { c = CACHE[key] = { W: [w0], B: [b0] }; }
    while (c.W.length < n) {
      var k = c.W.length - 1, s = step(c.W[k], c.B[k], alpha);
      c.W.push(s[0]); c.B.push(s[1]);
    }
    return { W: c.W.slice(0, n), B: c.B.slice(0, n) };
  }

  // Where a run ends: iterate until a step moves w and b by less than 1e-13 (at most KMAX steps).
  function limit(w0, b0, alpha) {
    var w = w0, b = b0;
    for (var k = 1; k < KMAX; k++) {
      var s = step(w, b, alpha);
      if (!isFinite(s[0]) || !isFinite(s[1])) return null;
      var d = Math.max(Math.abs(s[0] - w), Math.abs(s[1] - b));
      w = s[0]; b = s[1];
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
      w = s[0]; b = s[1];
    }
    return Math.min(KMAX, last + 1);
  }

  // The best fit. Where the gradient is zero, the heating runs on the cold days 1..m and the line
  // w x + b is the least squares line through those days, so the best fit is the best of these
  // eight lines (m = 2..8), each scored with the full model.
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

  // ===== numbers as TeX (from step 0)

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

  // A number inside a formula: in parentheses when it is negative, as in (63 - (-1.7))^2, or
  // written as m x 10^e, as in 0.01 x (3.04 x 10^-6).
  function wrap(v, dec) {
    var s = fmt(v, dec);
    return s.charAt(0) === '-' || s.indexOf('times') >= 0 ? '(' + s + ')' : s;
  }

  // A number written by fmt, read back (thin spaces dropped).
  function num(s) { return parseFloat(String(s).replace(/\\,/g, '')); }
  function decimals(s) { var i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }

  // A hop as the page writes it: lbar before and after with four decimals (more when the change is
  // below 0.01, so it keeps two or three significant digits), and the slope as the difference of
  // the two written numbers divided by eps, so the division on the screen is exact.
  function hopShown(H) {
    var d = Math.abs(H.delta);
    var dec = d >= 0.01 || d === 0 ? 4 : Math.min(12, Math.ceil(-Math.log10(d)) + 2);
    var s1 = fmt(H.to.lbar, dec), s0 = fmt(H.from.lbar, dec);
    var slope = (num(s1) - num(s0)) / H.eps;
    var sdec = Math.max(0, Math.max(decimals(s1), decimals(s0)) - Math.round(-Math.log10(H.eps)));
    return { l1: s1, l0: s0, eps: fmt(H.eps, 6), slope: slope === 0 ? '0' : fmt(slope, Math.max(sdec, 2)),
             slopeValue: slope, deriv: fmtGrad(H.deriv) };
  }

  // What the address may carry for a start: "-1", "60", "0.5", "-0,5". Anything else gives null.
  function parse(s) {
    var t = String(s === undefined || s === null ? '' : s).trim().replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var v = parseFloat(t);
    return isFinite(v) && Math.abs(v) <= 1000 ? v : null;
  }

  return {
    X: X, Y: Y, N: N, DAY: DAY, EPS: EPS, ALPHA: ALPHA, W0: W0, B0: B0, KMAX: KMAX,
    relu: relu, forward: forward, lbar: lbar, grad: grad, flat: flat, hop: hop, step: step,
    run: run, limit: limit, settleAt: settleAt, bestFit: bestFit,
    fmt: fmt, fmtCell: fmtCell, fmtGrad: fmtGrad, sci: sci, wrap: wrap, num: num, hopShown: hopShown,
    parse: parse
  };
}));
