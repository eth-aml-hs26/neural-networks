/* The math of the page: hinge-chain networks as the note docs/notes/narrow-relu-networks/ builds them,
 * with only the numbers that its construction sets.
 *
 * Layer l = 1..k has a hinge neuron h_l and a running-sum neuron g_l, both ReLU; the output y is
 * linear. With h_0 = x - a and g_0 = C + f(a),
 *
 *   h_l = ReLU(h_{l-1} - d_l),   g_l = ReLU(g_{l-1} + Delta_{l-1} h_{l-1}),   y = Delta_k h_k + g_k - C.
 *
 * The knobs are the gaps d_1..d_k (the intercept of each hinge, d_l >= 0) and the slope changes
 * Delta_0..Delta_k (the weight on the arrow out of each hinge). Every other weight is 1 or 0. f(a) is
 * the value of the target at the left end a, and C is the least lift that keeps every running sum
 * nonnegative, so that no running-sum ReLU clips. Then
 *
 *   y = f(a) + sum_{l=0..k} Delta_l ReLU(x - t_l),   t_0 = a,   t_l = t_{l-1} + d_l,
 *
 * the hinge form of the note.
 *
 * Loaded by the page (window.HCN) and by scripts/check-math.js (module.exports). */
(function (root) {
  'use strict';

  var A = -2, B = 2;          // the domain of every target
  var NG = 801;               // points of the plots and of the mean squared error (spacing 0.005)
  var ND = 401;               // points the construction picks its kinks from (spacing 0.01)
  var MINK = 1, MAXK = 10;    // layers

  function grid(n) {
    var xs = new Float64Array(n);
    for (var i = 0; i < n; i++) xs[i] = A + (B - A) * i / (n - 1);
    return xs;
  }
  var XS = grid(NG);

  function sample(fn, xs) {
    var out = new Float64Array(xs.length);
    for (var i = 0; i < xs.length; i++) out[i] = fn(xs[i]);
    return out;
  }
  function relu(v) { return v > 0 ? v : 0; }
  function round2(v) { return Math.round(v * 100) / 100 + 0; }

  // net = { fa, d: [d_1 .. d_k], D: [Delta_0 .. Delta_k] }; fa = f(a) comes from the target
  function cloneNet(net) { return { fa: net.fa, d: net.d.slice(), D: net.D.slice() }; }

  // the kinks t_1 .. t_k: each hinge bends one gap after the one before it
  function kinks(net) {
    var t = A, out = [];
    for (var l = 0; l < net.d.length; l++) { t += net.d[l]; out.push(t); }
    return out;
  }

  // The least lift C. Without it, g_l would carry u_l = f(a) + sum_{i<l} Delta_i ReLU(x - t_i),
  // l = 1..k, which is piecewise linear, so its least value on [a, b] sits at a, at b or at a kink.
  function lift(net) {
    var k = net.d.length, ts = [A].concat(kinks(net)), pts = [A, B], lo = Infinity, i, j, l;
    for (i = 1; i < ts.length; i++) if (ts[i] > A && ts[i] < B) pts.push(ts[i]);
    for (j = 0; j < pts.length; j++) {
      var v = net.fa;
      for (l = 1; l <= k; l++) {
        v += net.D[l - 1] * relu(pts[j] - ts[l - 1]);     // now v = u_l at this point
        if (v < lo) lo = v;
      }
    }
    return Math.max(0, -lo);
  }

  // Every neuron on the points xs, by the rules of the note. C defaults to the least lift; the check
  // passes a smaller one to see a running sum clip. ZG holds the inputs of the running-sum ReLUs.
  function forward(net, xs, C) {
    xs = xs || XS;
    if (C === undefined) C = lift(net);
    var n = xs.length, k = net.d.length, H = [], G = [], ZG = [], i, l;
    var h0 = new Float64Array(n), g0 = new Float64Array(n);
    for (i = 0; i < n; i++) { h0[i] = xs[i] - A; g0[i] = C + net.fa; }
    H.push(h0); G.push(g0);
    for (l = 1; l <= k; l++) {
      var hp = H[l - 1], gp = G[l - 1], dl = net.d[l - 1], w = net.D[l - 1];
      var h = new Float64Array(n), g = new Float64Array(n), z = new Float64Array(n);
      for (i = 0; i < n; i++) {
        h[i] = relu(hp[i] - dl);
        z[i] = gp[i] + w * hp[i];
        g[i] = relu(z[i]);
      }
      H.push(h); G.push(g); ZG.push(z);
    }
    var y = new Float64Array(n), wk = net.D[k], hk = H[k], gk = G[k];
    for (i = 0; i < n; i++) y[i] = wk * hk[i] + gk[i] - C;
    return { xs: xs, C: C, H: H, G: G, ZG: ZG, y: y };
  }

  // the hinge form, for the check
  function closedForm(net, x) {
    var ts = [A].concat(kinks(net)), v = net.fa;
    for (var l = 0; l < ts.length; l++) v += net.D[l] * relu(x - ts[l]);
    return v;
  }

  function mse(y, f) {
    var s = 0;
    for (var i = 0; i < y.length; i++) { var d = y[i] - f[i]; s += d * d; }
    return s / y.length;
  }

  // Where a target starts: every slope change 0, so y = f(a), and the kinks spread evenly.
  function flatNet(fa, k) {
    var d = [], prev = A;
    for (var l = 1; l <= k; l++) {
      var t = round2(A + (B - A) * l / (k + 1));
      d.push(round2(t - prev)); prev = t;
    }
    var D = [];
    for (l = 0; l <= k; l++) D.push(0);
    return { fa: fa, d: d, D: D };
  }

  // The construction: the network whose output is the piecewise-linear interpolant of fn through the
  // points a, ts..., b, where ts are the k interior kinks, increasing. Delta_0 is the first slope,
  // Delta_l the change of slope at t_l, and d_l the gap from t_{l-1} to t_l.
  function netFromKnots(ts, fn) {
    var k = ts.length, kn = [A].concat(ts, [B]), y = kn.map(fn), s = [], i;
    for (i = 0; i <= k; i++) s.push((y[i + 1] - y[i]) / (kn[i + 1] - kn[i]));
    var D = [s[0]], d = [];
    for (i = 1; i <= k; i++) D.push(s[i] - s[i - 1]);
    for (i = 0; i < k; i++) d.push(kn[i + 1] - kn[i]);
    return { fa: y[0], d: d, D: D };
  }

  // Dynamic programming over the grid: the k interior kinks that minimize the squared error of the
  // piecewise-linear interpolant of fn. Ties go to evenly spread kinks (a tiny penalty on long pieces).
  var dpCache = {};
  function optimalKnots(fn, k, cacheKey) {
    var n = ND, xs = grid(n), ent = cacheKey ? dpCache[cacheKey] : null, i, j, m;
    if (!ent) {
      var fs = sample(fn, xs), C = new Float64Array(n * n);
      for (i = 0; i < n - 1; i++) {
        for (j = i + 1; j < n; j++) {
          var slope = (fs[j] - fs[i]) / (xs[j] - xs[i]), sum = 0;
          for (var p = i + 1; p < j; p++) {
            var r = fs[p] - (fs[i] + slope * (xs[p] - xs[i]));
            sum += r * r;
          }
          C[i * n + j] = sum + 1e-10 * (xs[j] - xs[i]) * (xs[j] - xs[i]);
        }
      }
      ent = { C: C };
      if (cacheKey) dpCache[cacheKey] = ent;
    }
    var Cm = ent.C, S = k + 1, Dp = [], P = [];
    for (m = 0; m <= S; m++) { Dp.push(new Float64Array(n).fill(Infinity)); P.push(new Int32Array(n).fill(-1)); }
    for (j = 1; j < n; j++) Dp[1][j] = Cm[j];
    for (m = 2; m <= S; m++) {
      for (j = m; j < n; j++) {
        var best = Infinity, arg = -1;
        for (i = m - 1; i < j; i++) {
          var v = Dp[m - 1][i] + Cm[i * n + j];
          if (v < best) { best = v; arg = i; }
        }
        Dp[m][j] = best; P[m][j] = arg;
      }
    }
    var idx = [];
    j = n - 1;
    for (m = S; m >= 2; m--) { j = P[m][j]; idx.push(j); }
    idx.reverse();
    return idx.map(function (q) { return xs[q]; });
  }

  // "fit": k kinks where they fit fn best, every knob set by the construction
  function fit(fn, k, cacheKey) { return netFromKnots(optimalKnots(fn, k, cacheKey), fn); }

  // The largest slope change any fit of fn needs, from 1 to MAXK layers: the slope sliders reach it,
  // so every fit can also be set by hand.
  var spanCache = {};
  function maxSlopeChange(fn, cacheKey) {
    if (cacheKey && spanCache[cacheKey] !== undefined) return spanCache[cacheKey];
    var m = 0;
    for (var k = MINK; k <= MAXK; k++) fit(fn, k, cacheKey).D.forEach(function (v) { m = Math.max(m, Math.abs(v)); });
    if (cacheKey) spanCache[cacheKey] = m;
    return m;
  }

  // A new layer goes after the last one, so its kink comes after the last kink: in the middle of the
  // rest of the domain. Its slope change starts at 0, so the curve stays as it was.
  function addLayer(net) {
    var k = net.d.length;
    if (k >= MAXK) return net;
    var nn = cloneNet(net), ts = kinks(net), last = k ? ts[k - 1] : A;
    var from = Math.max(A, Math.min(B, last));
    nn.d.push(Math.max(0, round2(0.5 * (from + B)) - last));
    nn.D.push(0);
    return nn;
  }
  // The last layer goes, and with it the last kink and its slope change.
  function removeLayer(net) {
    if (net.d.length <= MINK) return net;
    var nn = cloneNet(net);
    nn.d.pop(); nn.D.pop();
    return nn;
  }

  // Knobs by name: 'd2' is the gap of hinge 2, 'delta0' the first slope, 'delta2' the slope change
  // at kink 2. A gap stays between 0 and b - a.
  function parseId(id) {
    var m = /^(d|delta)(\d+)$/.exec(id || '');
    if (!m) return null;
    var i = +m[2];
    return m[1] === 'd' ? (i >= 1 ? { name: 'd', i: i } : null) : { name: 'delta', i: i };
  }
  function getParam(net, id) {
    var p = parseId(id);
    if (!p) return undefined;
    return p.name === 'd' ? net.d[p.i - 1] : net.D[p.i];
  }
  function setParam(net, id, v) {
    var p = parseId(id);
    if (!p || !isFinite(v)) return;
    if (p.name === 'd') { if (p.i <= net.d.length) net.d[p.i - 1] = Math.max(0, Math.min(B - A, v)); }
    else if (p.i < net.D.length) net.D[p.i] = v;
  }

  var api = {
    A: A, B: B, NG: NG, ND: ND, MINK: MINK, MAXK: MAXK, XS: XS,
    grid: grid, sample: sample, relu: relu, round2: round2, cloneNet: cloneNet, kinks: kinks,
    lift: lift, forward: forward, closedForm: closedForm, mse: mse, flatNet: flatNet,
    netFromKnots: netFromKnots, optimalKnots: optimalKnots, fit: fit, maxSlopeChange: maxSlopeChange,
    addLayer: addLayer, removeLayer: removeLayer, parseId: parseId, getParam: getParam, setParam: setParam
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HCN = api;
})(typeof window !== 'undefined' ? window : this);
