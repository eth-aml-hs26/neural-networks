/* math.js: the arithmetic of the page, and no DOM. It loads in the page as window.GFMath and in
 * node through require(), so scripts/check-math.js asserts the very numbers the page shows.
 *
 * The data are those of "Will it last?" (../will-it-last/): on day x = 17 of the plan the phone
 * shows y = 3 GB used. The model guesses yhat = w x, the loss is l = (y - yhat)^2, and the
 * grasshopper measures the slope of l at w with a hop of eps:
 *
 *   Delta_eps = l(w + eps) - l(w),   slope = Delta_eps / eps.
 *
 * As eps goes to 0 the slope tends to the derivative dl/dw = -2 x (y - w x); here exactly
 * Delta_eps / eps = dl/dw + x^2 eps. The update is w <- w - alpha dl/dw.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFMath = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var X = 17;            // days
  var Y = 3;             // GB used by then
  var EPS = 0.01;        // the grasshopper's hop
  var ALPHA = 0.001;     // the step of the update
  var W_DEFAULT = 0.5;   // the guess taken when the room gives none
  var W_MAX = 1000;      // a typed guess must lie in [-W_MAX, W_MAX]

  function yhat(w) { return w * X; }
  function loss(w) { var r = Y - w * X; return r * r; }
  function dloss(w) { return -2 * X * (Y - w * X); }

  // One measurement: the grasshopper at w hops to w + eps and compares the two losses.
  function hop(w, eps) {
    var wp = w + eps;
    var l = loss(w), lp = loss(wp);
    var delta = lp - l;
    return {
      w: w, eps: eps, wp: wp,
      yhat: yhat(w), yhatp: yhat(wp),
      l: l, lp: lp,
      delta: delta, slope: delta / eps,
      deriv: dloss(w)
    };
  }

  function step(w, alpha) { return w - alpha * dloss(w); }

  // [w_1, ..., w_n] with w_1 = w0 and w_{k+1} = step(w_k).
  function run(w0, alpha, n) {
    var ws = [w0];
    while (ws.length < n) ws.push(step(ws[ws.length - 1], alpha));
    return ws;
  }

  // The first iteration k whose w_k is within tol of y / x (at most kmax).
  function settleAt(w0, alpha, tol, kmax) {
    var w = w0, k = 1, star = Y / X;
    while (k < kmax && Math.abs(w - star) >= tol) { w = step(w, alpha); k++; }
    return k;
  }

  // What the room types: "0.5", "0,5", ".5", "-1". Anything else gives null.
  function parse(s) {
    var t = String(s === undefined || s === null ? '' : s).trim().replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var v = parseFloat(t);
    return isFinite(v) && Math.abs(v) <= W_MAX ? v : null;
  }

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

  // A number as TeX with n significant digits (zeros dropped), for the small numbers of a hop.
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

  // A number inside a formula: in parentheses when it is negative, as in (3 - (-1.7))^2.
  function wrap(v, dec) {
    var s = fmt(v, dec);
    return s.charAt(0) === '-' ? '(' + s + ')' : s;
  }

  return {
    X: X, Y: Y, EPS: EPS, ALPHA: ALPHA, W_DEFAULT: W_DEFAULT, W_MAX: W_MAX, W_STAR: Y / X,
    yhat: yhat, loss: loss, dloss: dloss, hop: hop, step: step, run: run, settleAt: settleAt,
    parse: parse, fmt: fmt, fmtSig: fmtSig, sci: sci, wrap: wrap
  };
}));
