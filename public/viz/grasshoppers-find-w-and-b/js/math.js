/* math.js: the arithmetic of the page, and no DOM. It loads in the page as window.GFMath and in
 * node through require(), so scripts/check-math.js asserts the very numbers the page shows.
 *
 * One day of Lina's heating: x = 5 degrees C outside, y = 40 kWh of heat. The model is one ReLU of
 * a line, yhat = ReLU(w x + b): a = w x + b, yhat = max(0, a), and the loss l = (y - yhat)^2.
 * The day is day 3 of the eight days of the next page (../grasshoppers-many-days/), DAYS below.
 *
 * Each grasshopper measures the slope of l along its own number with a hop of eps, the other
 * number held still:
 *
 *   Delta_w = l(w + eps, b) - l(w, b),   slope_w = Delta_w / eps = dl/dw + x^2 eps
 *   Delta_b = l(w, b + eps) - l(w, b),   slope_b = Delta_b / eps = dl/db + eps
 *
 * (exactly, while the heating runs, a > 0), with dl/dw = -2 (y - yhat) x and dl/db = -2 (y - yhat).
 * Where a <= 0 the heating is off, yhat = 0 and both slopes are 0: a dead start, refused.
 * The update moves both at once: w <- w - alpha dl/dw, b <- b - alpha dl/db. Then the gap
 * r = y - yhat shrinks by the factor 1 - 2 alpha (x^2 + 1) = 0.48 at every iteration, and the pair
 * moves along (x, 1) = (5, 1) to the point of the line x w + b = y nearest to the start.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFMath = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var X = 5;             // degrees C, the day's mean temperature outside
  var Y = 40;            // kWh of heat that day
  var EPS = 0.01;        // the grasshoppers' hop
  var ALPHA = 0.01;      // the step of the update
  var W_DEFAULT = -1;    // the start taken when the room gives none
  var B_DEFAULT = 60;
  var MAX = 1000;        // a typed number must lie in [-MAX, MAX]
  var TOL = 5e-5;        // a run has settled once yhat is within TOL of y

  // The eight days of the next page; this page's day is DAYS.x[2], DAYS.y[2]. The story's first
  // card shows them on Lina's phone in the order they came, DAYS.seq (indices into x and y).
  var DAYS = { x: [-1, 2, 5, 7, 9, 12, 16, 19], y: [63, 54, 40, 31, 25, 11, 0, 0], mine: 2,
               seq: [3, 2, 1, 0, 4, 5, 6, 7] };

  // The second start of the closing click: it ends on another pair that also fits the day.
  var OTHER = { w: -1, b: 10 };

  function lin(w, b) { return w * X + b; }
  function relu(a) { return a > 0 ? a : 0; }
  function yhat(w, b) { return relu(lin(w, b)); }
  function loss(w, b) { var r = Y - yhat(w, b); return r * r; }
  function dead(w, b) { return !(lin(w, b) > 0); }

  // The two components of the gradient. Where the heating is off nothing moves.
  function grad(w, b) {
    if (dead(w, b)) return { w: 0, b: 0 };
    var r = Y - lin(w, b);
    return { w: -2 * r * X, b: -2 * r };
  }

  // One measurement: the grasshopper of `who` ('w' or 'b') hops by eps, the other number held.
  function hop(who, w, b, e) {
    var wp = who === 'w' ? w + e : w, bp = who === 'b' ? b + e : b;
    var l = loss(w, b), lp = loss(wp, bp);
    var g = grad(w, b);
    return {
      who: who, eps: e, w: w, b: b, wp: wp, bp: bp,
      v: who === 'w' ? w : b, vp: who === 'w' ? wp : bp,
      a: lin(w, b), ap: lin(wp, bp), yhat: yhat(w, b), yhatp: yhat(wp, bp),
      l: l, lp: lp, delta: lp - l, slope: (lp - l) / e,
      deriv: who === 'w' ? g.w : g.b
    };
  }

  function step(w, b, alpha) {
    var g = grad(w, b);
    return { w: w - alpha * g.w, b: b - alpha * g.b };
  }

  // [p_1, ..., p_n] with p_1 = (w0, b0) and p_{k+1} = step(p_k).
  function run(w0, b0, alpha, n) {
    var ps = [{ w: w0, b: b0 }];
    while (ps.length < n) { var p = ps[ps.length - 1]; ps.push(step(p.w, p.b, alpha)); }
    return ps;
  }

  // The first iteration k whose pair has yhat within tol of y (at most kmax).
  function settleAt(w0, b0, alpha, tol, kmax) {
    var p = { w: w0, b: b0 }, k = 1;
    tol = tol === undefined ? TOL : tol;
    kmax = kmax || 2000;
    while (k < kmax && Math.abs(yhat(p.w, p.b) - Y) >= tol) { p = step(p.w, p.b, alpha); k++; }
    return k;
  }

  // Where a run from (w0, b0) ends: the point of the line x w + b = y nearest to the start.
  function limit(w0, b0) {
    var r = Y - lin(w0, b0), s = r / (X * X + 1);
    return { w: w0 + s * X, b: b0 + s };
  }

  // Every update keeps this share of the gap y - yhat.
  function contraction(alpha) { return 1 - 2 * alpha * (X * X + 1); }

  // The second pair of the closing click: from OTHER, or from the default start when the room's
  // run ended near the end of OTHER's.
  function otherPair(wEnd, bEnd) {
    var o = limit(OTHER.w, OTHER.b);
    if (Math.abs(o.w - wEnd) < 0.5 && Math.abs(o.b - bEnd) < 2.5) {
      var d = limit(W_DEFAULT, B_DEFAULT);
      return { start: { w: W_DEFAULT, b: B_DEFAULT }, end: d };
    }
    return { start: { w: OTHER.w, b: OTHER.b }, end: o };
  }

  // The views of the plots, once per start, so nothing rescales while the pair moves.
  //   W: the ground of grasshopper w, l against w with b held; centred on the lowest point of
  //      the first ground and wide enough for every w and every lowest point of the run.
  //   B: the same for grasshopper b.
  //   relu: the little plot of the ReLU, a from -A to A.
  //   zoom: the magnified grounds of the hops: eps is EPS_PX stage pixels wide, and one unit of
  //      loss is `sy` pixels tall, the same in both grounds, so the steeper slope looks steeper.
  function frames(w0, b0, alpha, e, kmax) {
    var n = settleAt(w0, b0, alpha, TOL, kmax || 2000) + 1;
    var ps = run(w0, b0, alpha, n);
    var cw = (Y - b0) / X, cb = Y - X * w0;
    var dw = Math.abs(w0 - cw), db = Math.abs(b0 - cb), A = Math.abs(lin(w0, b0));
    ps.forEach(function (p) {
      dw = Math.max(dw, Math.abs(p.w - cw), Math.abs((Y - p.b) / X - cw));
      db = Math.max(db, Math.abs(p.b - cb), Math.abs(Y - X * p.w - cb));
      A = Math.max(A, Math.abs(lin(p.w, p.b)));
    });
    dw = Math.max(dw, 0.4);
    db = Math.max(db, 2);
    var W = { lo: cw - 1.3 * dw, hi: cw + 1.3 * dw };
    W.lmax = Math.max(loss(W.lo, b0), loss(W.hi, b0), loss(w0, b0)) || 1;
    var B = { lo: cb - 1.3 * db, hi: cb + 1.3 * db };
    B.lmax = Math.max(loss(w0, B.lo), loss(w0, B.hi), loss(w0, b0)) || 1;
    var hw = hop('w', w0, b0, e), hb = hop('b', w0, b0, e);
    var big = Math.max(Math.abs(hw.delta), Math.abs(hb.delta)) || 1;
    return { n: n, W: W, B: B, relu: { A: Math.max(1.25 * A, 10) }, zoom: { big: big } };
  }

  // What the room types: "-1", "60", "0,5", ".5". Anything else gives null.
  function parse(s) {
    var t = String(s === undefined || s === null ? '' : s).trim().replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var v = parseFloat(t);
    return isFinite(v) && Math.abs(v) <= MAX ? v : null;
  }

  // ===== numbers as TeX (the same rules as the page before this one)

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

  // A number inside a formula: in parentheses when it is negative, as in (40 - (-3))^2.
  function wrap(v, dec) {
    var s = fmt(v, dec);
    return s.charAt(0) === '-' ? '(' + s + ')' : s;
  }

  // The hops of the limit, eps = 0.01, 0.001, 0.0001, 0.00001: the slope tends to the derivative.
  var LIMIT_EPS = [0.01, 0.001, 0.0001, 0.00001];
  function limitRow(who, w, b) {
    return LIMIT_EPS.map(function (e) { return { eps: e, slope: hop(who, w, b, e).slope }; });
  }

  return {
    X: X, Y: Y, EPS: EPS, ALPHA: ALPHA, W_DEFAULT: W_DEFAULT, B_DEFAULT: B_DEFAULT, MAX: MAX,
    TOL: TOL, DAYS: DAYS, OTHER: OTHER, LIMIT_EPS: LIMIT_EPS,
    lin: lin, relu: relu, yhat: yhat, loss: loss, dead: dead, grad: grad, hop: hop, step: step,
    run: run, settleAt: settleAt, limit: limit, contraction: contraction, otherPair: otherPair,
    frames: frames, limitRow: limitRow,
    parse: parse, fmt: fmt, fmtSig: fmtSig, sci: sci, wrap: wrap
  };
}));
