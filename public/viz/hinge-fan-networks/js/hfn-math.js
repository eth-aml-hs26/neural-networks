/* The math of the page: hinge-fan networks, the fit that sets their knobs, and the operations behind
 * the buttons (fit, fit w, add a hinge, remove a hinge).
 *
 * A hinge-fan network has one hidden layer of n hinges and one linear output:
 *
 *   h_j = relu(x - t_j)                    (input weight 1, bias -t_j: the kink sits at x = t_j)
 *   y   = c + sum_j w_j h_j
 *
 * so the free numbers are the positions t_j (one per hinge), the weights w_j on the arrows from the
 * hinges into y, and the bias c. Every hinge opens to the right, so left of every hinge y = c; a hinge
 * at the left end a is the line x - a and sets the first slope.
 *
 * With the positions fixed, y is linear in (c, w), so the best c and w are a least-squares problem:
 * the normal equations. "fit" tries two placements of n hinges, a hinge at a plus the n - 1 kinks of
 * the dynamic program of the hinge-chain page, or its n kinks and none at a (a flat start), solves
 * for c and w on each, and keeps the smaller error. "fit w" keeps the positions and solves for c and w.
 *
 * Loaded by the page (window.HFN) and by scripts/check-math.js (module.exports). */
(function (root) {
  'use strict';

  var A = -2, B = 2;          // the domain of every target
  var NG = 801;               // points of the plots and of the mean squared error (spacing 0.005)
  var ND = 401;               // points the fit picks its kinks from (spacing 0.01)
  var MINN = 1, MAXN = 24;    // hinges
  var DROP = 1e-10;           // a least-squares column that the earlier ones span to this accuracy gets weight 0

  function relu(v) { return v > 0 ? v : 0; }
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
  function round2(v) { return Math.round(v * 100) / 100 + 0; }

  // net = { c, hinges: [{ t, w }, ...] }
  function cloneNet(net) {
    return { c: net.c, hinges: net.hinges.map(function (h) { return { t: h.t, w: h.w }; }) };
  }

  // The start of every target: n hinges spread evenly from the left end (for n = 4 at -2, -1, 0, 1),
  // every weight 0 and c = 0, so y = 0.
  function defaultNet(n) {
    var hinges = [];
    for (var j = 0; j < n; j++) hinges.push({ t: round2(A + (B - A) * j / n), w: 0 });
    return { c: 0, hinges: hinges };
  }

  // Every neuron on the points xs: H[j] = relu(x - t_j), and the output y.
  function forward(net, xs) {
    xs = xs || XS;
    var n = xs.length, H = [], y = new Float64Array(n), i;
    for (i = 0; i < n; i++) y[i] = net.c;
    net.hinges.forEach(function (h) {
      var a = new Float64Array(n);
      for (i = 0; i < n; i++) { a[i] = relu(xs[i] - h.t); y[i] += h.w * a[i]; }
      H.push(a);
    });
    return { xs: xs, H: H, y: y };
  }

  // The same output in one line, for the check.
  function closedForm(net, x) {
    var v = net.c;
    net.hinges.forEach(function (h) { v += h.w * relu(x - h.t); });
    return v;
  }

  // The term of hinge j (from 0), w_j relu(x - t_j), on the points xs.
  function term(net, j, xs) {
    xs = xs || XS;
    var h = net.hinges[j], out = new Float64Array(xs.length);
    for (var i = 0; i < xs.length; i++) out[i] = h.w * relu(xs[i] - h.t);
    return out;
  }

  function positions(net) { return net.hinges.map(function (h) { return h.t; }); }

  function mse(y, f) {
    var s = 0;
    for (var i = 0; i < y.length; i++) { var d = y[i] - f[i]; s += d * d; }
    return s / y.length;
  }
  function maxAbs(y, f) {
    var m = 0;
    for (var i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i] - f[i]));
    return m;
  }

  // Least squares: the bias c and the weights w for the positions ts, on the points xs against the
  // values fs, by the normal equations. The columns (1, relu(x - t_1), ...) are scaled to unit length
  // first; the Cholesky factorization then gives weight 0 to a column the earlier ones already span
  // (two hinges at one place, or a hinge at the right end, whose column is 0).
  function lsq(ts, fs, xs) {
    xs = xs || XS;
    var N = xs.length, p = ts.length + 1, i, j, k, m;
    var cols = [], scale = new Float64Array(p);
    for (j = 0; j < p; j++) {
      var col = new Float64Array(N), s = 0;
      for (i = 0; i < N; i++) { col[i] = j === 0 ? 1 : relu(xs[i] - ts[j - 1]); s += col[i] * col[i]; }
      scale[j] = Math.sqrt(s);
      cols.push(col);
    }
    var G = [], r = new Float64Array(p);
    for (j = 0; j < p; j++) {
      G.push(new Float64Array(p));
      if (scale[j] === 0) continue;
      var dj = 0;
      for (i = 0; i < N; i++) dj += cols[j][i] * fs[i];
      r[j] = dj / scale[j];
    }
    for (j = 0; j < p; j++) {
      for (k = 0; k <= j; k++) {
        if (scale[j] === 0 || scale[k] === 0) continue;
        var g = 0;
        for (i = 0; i < N; i++) g += cols[j][i] * cols[k][i];
        G[j][k] = G[k][j] = g / (scale[j] * scale[k]);
      }
    }
    // Cholesky G = L L^T, dropping a column whose pivot is (numerically) 0
    var L = [], drop = [];
    for (j = 0; j < p; j++) L.push(new Float64Array(p));
    for (k = 0; k < p; k++) {
      var d = scale[k] === 0 ? 0 : G[k][k];
      for (m = 0; m < k; m++) d -= L[k][m] * L[k][m];
      drop[k] = !(d > DROP);
      if (drop[k]) continue;
      L[k][k] = Math.sqrt(d);
      for (i = k + 1; i < p; i++) {
        var v = G[i][k];
        for (m = 0; m < k; m++) v -= L[i][m] * L[k][m];
        L[i][k] = v / L[k][k];
      }
    }
    var z = new Float64Array(p), th = new Float64Array(p);
    for (k = 0; k < p; k++) {
      if (drop[k]) continue;
      var u = r[k];
      for (m = 0; m < k; m++) u -= L[k][m] * z[m];
      z[k] = u / L[k][k];
    }
    for (k = p - 1; k >= 0; k--) {
      if (drop[k]) continue;
      var q = z[k];
      for (m = k + 1; m < p; m++) q -= L[m][k] * th[m];
      th[k] = q / L[k][k];
    }
    var out = [];
    for (j = 0; j < p; j++) out.push(drop[j] ? 0 : th[j] / scale[j]);
    return { c: out[0], w: out.slice(1) };
  }

  // Dynamic programming over the grid of ND points, as on the hinge-chain and hinge-ladder pages: the
  // k interior kinks that minimize the squared error of the piecewise-linear interpolant of fn (ties go
  // to evenly spread kinks, by a tiny penalty on long pieces). One table per target, kept for every k
  // up to MAXN, since fit asks for n - 1 and n kinks.
  var dpCache = {};
  function dpTable(fn, cacheKey) {
    if (cacheKey && dpCache[cacheKey]) return dpCache[cacheKey];
    var n = ND, xs = grid(n), fs = sample(fn, xs), C = new Float64Array(n * n), i, j, m;
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
    var S = MAXN + 1, D = [], P = [];
    for (m = 0; m <= S; m++) { D.push(new Float64Array(n).fill(Infinity)); P.push(new Int32Array(n).fill(-1)); }
    for (j = 1; j < n; j++) D[1][j] = C[j];
    for (m = 2; m <= S; m++) {
      for (j = m; j < n; j++) {
        var best = Infinity, arg = -1;
        for (i = m - 1; i < j; i++) {
          var v = D[m - 1][i] + C[i * n + j];
          if (v < best) { best = v; arg = i; }
        }
        D[m][j] = best; P[m][j] = arg;
      }
    }
    var ent = { xs: xs, P: P };
    if (cacheKey) dpCache[cacheKey] = ent;
    return ent;
  }
  function optimalKnots(fn, k, cacheKey) {
    var ent = dpTable(fn, cacheKey), idx = [], j = ND - 1;
    for (var m = k + 1; m >= 2; m--) { j = ent.P[m][j]; idx.push(j); }
    idx.reverse();
    return idx.map(function (q) { return round2(ent.xs[q]); });
  }
  function netFrom(ts, sol) {
    return { c: sol.c, hinges: ts.map(function (t, j) { return { t: t, w: sol.w[j] }; }) };
  }

  // "fit" with n hinges: (left) a hinge at A plus the n - 1 kinks of the dynamic program, or (flat) its
  // n kinks and none at A; c and w by least squares on each; the smaller error wins, and on a tie the
  // placement with the hinge at A. On a symmetric target the program has two equally good answers, a
  // set of kinks and its mirror image, and rounding picks one. With a hinge at A both fit equally well;
  // with a flat start they differ, so the flat placement also tries the mirror image.
  function fit(fn, n, cacheKey) {
    var fs = sample(fn, XS), best = null, cands = [[A].concat(optimalKnots(fn, n - 1, cacheKey))];
    var flat = optimalKnots(fn, n, cacheKey), mirror = flat.map(function (t) { return round2(-t); }).reverse();
    cands.push(flat);
    if (mirror.join() !== flat.join()) cands.push(mirror);
    cands.forEach(function (ts, i) {
      var net = netFrom(ts, lsq(ts, fs)), e = mse(forward(net).y, fs);
      if (!best || e < best.e * (1 - 1e-9) - 1e-24) best = { net: net, e: e, placement: ['left', 'flat', 'mirror'][i] };
    });
    best.net.placement = best.placement;
    return best.net;
  }

  // The largest |w| any fit of fn needs, from 1 to MAXN hinges: the w sliders reach it, so every fit
  // can also be set by hand (the zigzag needs w = -5), as on the hinge-ladder page.
  var spanCache = {};
  function maxWeight(fn, cacheKey) {
    if (cacheKey && spanCache[cacheKey] !== undefined) return spanCache[cacheKey];
    var m = 0;
    for (var n = MINN; n <= MAXN; n++) fit(fn, n, cacheKey).hinges.forEach(function (h) { m = Math.max(m, Math.abs(h.w)); });
    if (cacheKey) spanCache[cacheKey] = m;
    return m;
  }

  // "fit w": the positions stay, c and every w by least squares against the values fs on XS.
  function fitSlopes(net, fs) {
    var ts = positions(net);
    return netFrom(ts, lsq(ts, fs));
  }

  // The hinges by position, left to right (a stable sort). perm[new index] = old index.
  function sortHinges(net) {
    var order = net.hinges.map(function (h, j) { return j; });
    order.sort(function (i, j) { return net.hinges[i].t - net.hinges[j].t || i - j; });
    var nn = cloneNet(net);
    nn.hinges = order.map(function (j) { return { t: net.hinges[j].t, w: net.hinges[j].w }; });
    return { net: nn, perm: order };
  }

  // The position of a new hinge: the middle of the widest gap between the hinges inside the domain and
  // its two ends.
  function newPosition(net) {
    var pts = [A, B];
    positions(net).forEach(function (t) { if (t > A && t < B) pts.push(t); });
    pts.sort(function (u, v) { return u - v; });
    var bi = 0, bw = -1;
    for (var i = 0; i + 1 < pts.length; i++) if (pts[i + 1] - pts[i] > bw + 1e-12) { bw = pts[i + 1] - pts[i]; bi = i; }
    return round2(0.5 * (pts[bi] + pts[bi + 1]));
  }

  // Adds a hinge with weight 0, so the curve stays, and sorts. Returns { net, index } (index from 0).
  function addHinge(net) {
    if (net.hinges.length >= MAXN) return { net: net, index: -1 };
    var nn = cloneNet(net), t = newPosition(net);
    nn.hinges.push({ t: t, w: 0 });
    var s = sortHinges(nn);
    return { net: s.net, index: s.perm.indexOf(nn.hinges.length - 1) };
  }

  // The mean square of every term w_j relu(x - t_j) on XS.
  function termSizes(net) {
    return net.hinges.map(function (h, j) {
      var a = term(net, j), s = 0;
      for (var i = 0; i < a.length; i++) s += a[i] * a[i];
      return s / a.length;
    });
  }

  // Removes the hinge whose term is smallest in mean square, so the curve changes least (on a tie, the
  // last one). Returns { net, index } with the index it had.
  function removeHinge(net) {
    if (net.hinges.length <= MINN) return { net: net, index: -1 };
    var sz = termSizes(net), bj = 0;
    for (var j = 1; j < sz.length; j++) if (sz[j] <= sz[bj]) bj = j;
    var nn = cloneNet(net);
    nn.hinges.splice(bj, 1);
    return { net: nn, index: bj };
  }

  // Knobs by name: 'c', and 't3', 'w3' for hinge 3 (numbered from 1, as on the page).
  function parseId(id) {
    if (id === 'c') return { name: 'c', j: 0 };
    var m = /^([tw])(\d+)$/.exec(id || '');
    return m && +m[2] >= 1 ? { name: m[1], j: +m[2] } : null;
  }
  function getParam(net, id) {
    var p = parseId(id);
    if (!p) return undefined;
    if (p.name === 'c') return net.c;
    var h = net.hinges[p.j - 1];
    return h ? h[p.name] : undefined;
  }
  function setParam(net, id, v) {
    var p = parseId(id);
    if (!p) return false;
    if (p.name === 'c') { net.c = v; return true; }
    var h = net.hinges[p.j - 1];
    if (!h) return false;
    h[p.name] = p.name === 't' ? Math.max(A, Math.min(B, v)) : v;
    return true;
  }

  var api = {
    A: A, B: B, NG: NG, ND: ND, MINN: MINN, MAXN: MAXN, XS: XS,
    relu: relu, grid: grid, sample: sample, round2: round2, cloneNet: cloneNet, defaultNet: defaultNet,
    forward: forward, closedForm: closedForm, term: term, positions: positions, mse: mse, maxAbs: maxAbs,
    lsq: lsq, optimalKnots: optimalKnots, fit: fit, maxWeight: maxWeight, fitSlopes: fitSlopes, sortHinges: sortHinges,
    newPosition: newPosition, addHinge: addHinge, termSizes: termSizes, removeHinge: removeHinge,
    parseId: parseId, getParam: getParam, setParam: setParam
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HFN = api;
})(typeof window !== 'undefined' ? window : this);
