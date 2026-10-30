/* swarm-math.js: the arithmetic of the swarm page (step 3 of the grasshopper series), and no DOM.
 * It loads in the page as window.SwarmMath and in node through require(), so
 * scripts/check-math.js asserts the very numbers the page shows. The functions take the data and
 * the numbers to learn as arguments, so they work for any story; the story's own numbers and the
 * defaults of GRADIENTS.md sit in DEFAULTS at the end of the file.
 *
 * THE MODEL. n observations (x_i, y_i) and m neurons, each with its own w_j and b_j:
 *
 *   A       n rows, m columns: a_ij = w_j x_i + b_j     (column j is step 2's column a, for neuron j)
 *   Z       = ReLU(A), cell by cell: z_ij = max(0, a_ij)
 *   yhat_i  = z_i1 + ... + z_im                        (the plain sum of row i, the circled plus)
 *   l_i     = (y_i - yhat_i)^2,   lbar = (l_1 + ... + l_n) / n
 *
 * Neuron j is ON for observation i when a_ij > 0 and OFF otherwise; its bend (knot) sits at
 * x = -b_j / w_j.
 *
 * THE SWARM. One grasshopper per number to learn, 2m in all, on w_1 .. w_m and b_1 .. b_m. A hop of
 * one number by eps, the others held still, measures the slope Delta / eps, with
 * Delta = lbar(after) - lbar(before). A hop of w_j or b_j moves only column j of A and Z, and only
 * the rows where neuron j is on: those are the observations its grasshoppers HEAR. Away from a
 * kink, Delta / eps tends to the derivative as eps goes to 0:
 *
 *   d lbar / d w_j = (1/n) sum over the rows where neuron j is on of  -2 (y_i - yhat_i) x_i
 *   d lbar / d b_j = (1/n) sum over the rows where neuron j is on of  -2 (y_i - yhat_i)
 *
 * that is step 0's slope -2 x (y - yhat), row by row, averaged, with the rows the neuron does not
 * hear counted as 0. The gradient is the two columns of these 2m numbers. One update per
 * grasshopper, all at once: w_j <- w_j - alpha d lbar / d w_j and b_j <- b_j - alpha d lbar / d b_j.
 *
 * INDICES. Code counts from 0 (w[0] is w_1 on the page); rows are the observations in the order
 * given, columns the neurons.
 *
 * THE NAMES. data, params, copy, forward, lbarOf, grad, terms, hop, slopes, update, step, run,
 * settleAt, playCount, playTime, neuron, curve, knot, hears, hearing, dead, twins, hessian,
 * eigSym, curvature, bestLine, bestOneBend, spreadStart, review, findStart, profile, kinks, and
 * the number formats fmt, fmtSig, sci, wrap (copied from step 0, ../grasshopper-finds-w/js/math.js,
 * so every page of the series prints numbers alike).
 *
 * Added by the page agent (marked so further down): fmtCell, fmtGrad, num, hopShown (the band's row
 * of a hop, divided as shown, as step 2 does), oneBendPass (the old tool's forward pass), trueCurve,
 * parse and LATER (the counts of days 9 and 10, for the page's optional last clicks).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SwarmMath = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ===== the data and the numbers to learn

  // data(xs, ys): the observations, copied, as { x, y, n }.
  function data(xs, ys) {
    if (!xs || !ys || xs.length !== ys.length || xs.length < 1) {
      throw new Error('data: x and y need the same length, at least 1');
    }
    var x = [], y = [];
    for (var i = 0; i < xs.length; i++) {
      var u = +xs[i], v = +ys[i];
      if (!isFinite(u) || !isFinite(v)) throw new Error('data: observation ' + (i + 1) + ' is not a number');
      x.push(u);
      y.push(v);
    }
    return { x: x, y: y, n: x.length };
  }

  // params(w, b): the 2m numbers to learn, copied, as { w: [w_1 .. w_m], b: [b_1 .. b_m], m }.
  function params(w, b) {
    if (!w || !b || w.length !== b.length || w.length < 1) {
      throw new Error('params: w and b need the same length, at least 1');
    }
    var ww = [], bb = [];
    for (var j = 0; j < w.length; j++) {
      ww.push(+w[j]);
      bb.push(+b[j]);
    }
    return { w: ww, b: bb, m: ww.length };
  }

  function copy(P) { return params(P.w, P.b); }

  // ===== the forward pass

  // forward(D, P): every box of the diagram.
  //   A, Z, on   n rows of m cells: a_ij, z_ij and whether neuron j is on for observation i
  //   yhat, r, l n cells: yhat_i, the gap r_i = y_i - yhat_i, the loss l_i = r_i^2
  //   lbar       the average loss
  // yhat_i adds z_i1, z_i2, ..., z_im in that order, so a cell of Z that does not change leaves
  // yhat_i exactly as it was.
  function forward(D, P) {
    var n = D.n, m = P.w.length;
    var A = [], Z = [], on = [], yhat = [], r = [], l = [], sum = 0;
    for (var i = 0; i < n; i++) {
      var ai = [], zi = [], oi = [], s = 0;
      for (var j = 0; j < m; j++) {
        var a = P.w[j] * D.x[i] + P.b[j];
        var z = a > 0 ? a : 0;
        ai.push(a);
        zi.push(z);
        oi.push(a > 0);
        s += z;
      }
      var e = D.y[i] - s;
      A.push(ai);
      Z.push(zi);
      on.push(oi);
      yhat.push(s);
      r.push(e);
      l.push(e * e);
      sum += e * e;
    }
    return { n: n, m: m, A: A, Z: Z, on: on, yhat: yhat, r: r, l: l, lbar: sum / n };
  }

  // lbarOf(D, P): the average loss alone, for runs and plots.
  function lbarOf(D, P) {
    var n = D.n, m = P.w.length, sum = 0;
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var j = 0; j < m; j++) {
        var a = P.w[j] * D.x[i] + P.b[j];
        if (a > 0) s += a;
      }
      var e = D.y[i] - s;
      sum += e * e;
    }
    return sum / n;
  }

  // ===== the slopes

  // grad(D, P [, F]): the exact slopes of the 2m grasshoppers, { w: [..m], b: [..m], g: [..n] }.
  // g_i = -2 (y_i - yhat_i) / n is the slope of lbar against yhat_i, one column shared by every
  // grasshopper; grasshopper w_j adds g_i x_i over the rows where neuron j is on, grasshopper b_j
  // adds g_i over the same rows. At a kink (a_ij exactly 0) the row counts as off.
  function grad(D, P, F) {
    F = F || forward(D, P);
    var n = D.n, m = F.m, g = [], gw = [], gb = [];
    for (var i = 0; i < n; i++) g.push(-2 * F.r[i] / n);
    for (var j = 0; j < m; j++) {
      var sw = 0, sb = 0;
      for (var k = 0; k < n; k++) {
        if (F.on[k][j]) {
          sw += g[k] * D.x[k];
          sb += g[k];
        }
      }
      gw.push(sw);
      gb.push(sb);
    }
    return { w: gw, b: gb, g: g };
  }

  // terms(D, P, which, j [, F]): what each row adds to the slope of grasshopper which_j ('w' or
  // 'b'): -2 (y_i - yhat_i) x_i / n for w (without x_i for b) where neuron j is on, 0 where it is
  // off. { t: [..n], heard: [..n booleans], sum } with sum equal to grad(D, P)[which][j].
  function terms(D, P, which, j, F) {
    F = F || forward(D, P);
    var t = [], heard = [], sum = 0;
    for (var i = 0; i < D.n; i++) {
      var h = F.on[i][j];
      var v = h ? -2 * F.r[i] / D.n * (which === 'w' ? D.x[i] : 1) : 0;
      t.push(v);
      heard.push(h);
      sum += v;
    }
    return { t: t, heard: heard, sum: sum };
  }

  // hop(D, P, which, j, eps): grasshopper which_j hops from its number v to v + eps while the
  // other 2m - 1 hold still.
  //   from, to          v and v + eps
  //   P2                the numbers during the hop
  //   before, after     forward(D, P) and forward(D, P2)
  //   dA, dZ            the change of every cell of column j of A and of Z (no other column moves)
  //   dyhat, dl         the change of every row of yhat and of l
  //   hears             the rows where neuron j is on before the hop: the observations it hears
  //   rows              the rows whose yhat changed
  //   crossed           the rows where neuron j switched on or off during the hop (a kink)
  //   delta, slope      Delta = lbar(after) - lbar(before) and Delta / eps
  //   deriv             the exact slope, grad(D, P)[which][j]: the limit of Delta / eps
  function hop(D, P, which, j, eps) {
    if (which !== 'w' && which !== 'b') throw new Error("hop: which is 'w' or 'b'");
    var before = forward(D, P);
    var P2 = copy(P);
    P2[which][j] = P[which][j] + eps;
    var after = forward(D, P2);
    var dA = [], dZ = [], dyhat = [], dl = [], hears = [], rows = [], crossed = [];
    for (var i = 0; i < D.n; i++) {
      dA.push(after.A[i][j] - before.A[i][j]);
      dZ.push(after.Z[i][j] - before.Z[i][j]);
      dyhat.push(after.yhat[i] - before.yhat[i]);
      dl.push(after.l[i] - before.l[i]);
      if (before.on[i][j]) hears.push(i);
      if (after.yhat[i] !== before.yhat[i]) rows.push(i);
      if (before.on[i][j] !== after.on[i][j]) crossed.push(i);
    }
    var delta = after.lbar - before.lbar;
    return {
      which: which, j: j, eps: eps,
      from: P[which][j], to: P2[which][j], P2: P2,
      before: before, after: after,
      dA: dA, dZ: dZ, dyhat: dyhat, dl: dl,
      hears: hears, rows: rows, crossed: crossed,
      delta: delta, slope: delta / eps,
      deriv: grad(D, P, before)[which][j]
    };
  }

  // slopes(D, P, which, j, epsList): Delta / eps for every eps of the list, as step 0 shows the
  // slopes 215.9, 189.89, 187.289, ... closing in on the derivative.
  function slopes(D, P, which, j, epsList) {
    return epsList.map(function (e) { return hop(D, P, which, j, e).slope; });
  }

  // ===== the update and the run

  // update(P, G, alpha): one update per grasshopper, all at once, each with its own slope.
  function update(P, G, alpha) {
    var w = [], b = [];
    for (var j = 0; j < P.w.length; j++) {
      w.push(P.w[j] - alpha * G.w[j]);
      b.push(P.b[j] - alpha * G.b[j]);
    }
    return params(w, b);
  }

  function step(D, P, alpha) { return update(P, grad(D, P), alpha); }

  // run(D, P0, alpha [, opts]): the iterations as the page counts them. ps[k - 1] holds the numbers
  // of iteration k (ps[0] is the start), lbars[k - 1] their average loss and grads[k - 1] their
  // slopes, which give ps[k]. The run stops after opts.kmax iterations (default 20000), or when it
  // diverges: lbar not finite, or beyond opts.blowup (default 1e6) times the start's lbar (at
  // least 1).
  function run(D, P0, alpha, opts) {
    opts = opts || {};
    var kmax = opts.kmax || 20000;
    var P = copy(P0), F = forward(D, P);
    var ps = [P], lbars = [F.lbar], grads = [];
    var limit = (opts.blowup || 1e6) * Math.max(F.lbar, 1);
    var diverged = false;
    while (ps.length < kmax) {
      var G = grad(D, P, F);
      grads.push(G);
      P = update(P, G, alpha);
      F = forward(D, P);
      ps.push(P);
      lbars.push(F.lbar);
      if (!isFinite(F.lbar) || F.lbar > limit) { diverged = true; break; }
    }
    if (!diverged) grads.push(grad(D, P, F));
    return { alpha: alpha, ps: ps, lbars: lbars, grads: grads, diverged: diverged };
  }

  // settleAt(D, R [, opts]): the first iteration k of the run R where the curve stops moving
  // visibly on the points: from iteration k to iteration k + opts.win (default 100) every yhat_i
  // changes by less than opts.tol (default a thousandth of the range of y, a fraction of a pixel
  // on the plot). 0 when the run diverged or never got there. The valley is long and narrow
  // (GRADIENTS.md, "Defaults"), so the numbers keep creeping after k while the curve stays put.
  function settleAt(D, R, opts) {
    opts = opts || {};
    if (R.diverged) return 0;
    var win = opts.win || 100, tol = opts.tol;
    if (tol === undefined) {
      var lo = Math.min.apply(null, D.y), hi = Math.max.apply(null, D.y);
      tol = 0.001 * Math.max(hi - lo, 1e-9);
    }
    var Y = R.ps.map(function (P) { return forward(D, P).yhat; });
    for (var k = 0; k + win < Y.length; k++) {
      var mx = 0;
      for (var i = 0; i < D.n; i++) {
        var d = Math.abs(Y[k + win][i] - Y[k][i]);
        if (d > mx) mx = d;
      }
      if (mx < tol) return k + 1;
    }
    return 0;
  }

  // ===== Play's pace

  // Play starts at opts.rate iterations a second (default 2) and doubles its pace every
  // opts.double seconds (default 2.5), so the first iterations can be followed and a long run
  // still ends soon. playCount(t): the iterations shown after t seconds. playTime(k): the second
  // at which iteration k is shown (iteration 1, the start, at 0).
  function playCount(t, opts) {
    opts = opts || {};
    var r0 = opts.rate || 2, T = opts.double || 2.5, L = Math.LN2;
    return 1 + Math.floor(r0 * T / L * (Math.pow(2, t / T) - 1) + 1e-9);
  }

  function playTime(k, opts) {
    opts = opts || {};
    var r0 = opts.rate || 2, T = opts.double || 2.5, L = Math.LN2;
    return T / L * Math.log(1 + (k - 1) * L / (r0 * T));
  }

  // ===== the plot

  // neuron(P, j, x): neuron j's own bend, ReLU(w_j x + b_j). curve(P, x): their sum, yhat at x.
  function neuron(P, j, x) {
    var a = P.w[j] * x + P.b[j];
    return a > 0 ? a : 0;
  }

  function curve(P, x) {
    var s = 0;
    for (var j = 0; j < P.w.length; j++) s += neuron(P, j, x);
    return s;
  }

  // knot(P, j): where neuron j bends, x = -b_j / w_j; null when w_j = 0 (a flat neuron).
  function knot(P, j) { return P.w[j] !== 0 ? -P.b[j] / P.w[j] : null; }

  // ===== who hears what, and what can go wrong

  // hears(D, P, j): the rows where neuron j is on. hearing(D, P): that list for every neuron.
  function hears(D, P, j) {
    var out = [];
    for (var i = 0; i < D.n; i++) if (P.w[j] * D.x[i] + P.b[j] > 0) out.push(i);
    return out;
  }

  function hearing(D, P) {
    var out = [];
    for (var j = 0; j < P.w.length; j++) out.push(hears(D, P, j));
    return out;
  }

  // dead(D, P): the neurons that are off for every observation. Their column of Z is all 0, their
  // two grasshoppers hear nothing, their slopes are exactly 0 and they never move.
  function dead(D, P) {
    var out = [];
    for (var j = 0; j < P.w.length; j++) if (hears(D, P, j).length === 0) out.push(j);
    return out;
  }

  // twins(P [, tol]): the pairs [j, k] of neurons with the same w and the same b (within tol,
  // default 0). Twins get the same slopes, make the same updates, and stay twins.
  function twins(P, tol) {
    tol = tol || 0;
    var out = [];
    for (var j = 0; j < P.w.length; j++) {
      for (var k = j + 1; k < P.w.length; k++) {
        if (Math.abs(P.w[j] - P.w[k]) <= tol && Math.abs(P.b[j] - P.b[k]) <= tol) out.push([j, k]);
      }
    }
    return out;
  }

  // ===== the step alpha: how curved the valley is

  // hessian(D, P [, F]): while no neuron switches on or off, lbar is a quadratic in the 2m numbers
  // (w_1 .. w_m, then b_1 .. b_m) with this matrix of second derivatives, (2/n) J^T J, where row i
  // of J holds [a_ij > 0] x_i for the w's and [a_ij > 0] for the b's.
  function hessian(D, P, F) {
    F = F || forward(D, P);
    var n = D.n, m = F.m, k = 2 * m, H = [], p, q;
    for (p = 0; p < k; p++) {
      var hr = [];
      for (q = 0; q < k; q++) hr.push(0);
      H.push(hr);
    }
    for (var i = 0; i < n; i++) {
      var J = [];
      for (var j = 0; j < m; j++) J.push(F.on[i][j] ? D.x[i] : 0);
      for (var j2 = 0; j2 < m; j2++) J.push(F.on[i][j2] ? 1 : 0);
      for (p = 0; p < k; p++) {
        if (J[p] === 0) continue;
        for (q = 0; q < k; q++) H[p][q] += 2 * J[p] * J[q] / n;
      }
    }
    return H;
  }

  // eigSym(M): the eigenvalues of a small symmetric matrix, smallest first (Jacobi rotations).
  function eigSym(M) {
    var k = M.length, a = M.map(function (r) { return r.slice(); }), sweep, p, q, i;
    for (sweep = 0; sweep < 100; sweep++) {
      var off = 0, norm = 0;
      for (p = 0; p < k; p++) {
        for (q = 0; q < k; q++) {
          norm += a[p][q] * a[p][q];
          if (p !== q) off += a[p][q] * a[p][q];
        }
      }
      if (off <= 1e-30 * Math.max(norm, 1e-300)) break;
      for (p = 0; p < k - 1; p++) {
        for (q = p + 1; q < k; q++) {
          if (Math.abs(a[p][q]) < 1e-300) continue;
          var theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          var t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          var c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (i = 0; i < k; i++) {
            var aip = a[i][p], aiq = a[i][q];
            a[i][p] = c * aip - s * aiq;
            a[i][q] = s * aip + c * aiq;
          }
          for (i = 0; i < k; i++) {
            var api = a[p][i], aqi = a[q][i];
            a[p][i] = c * api - s * aqi;
            a[q][i] = s * api + c * aqi;
          }
        }
      }
    }
    var ev = [];
    for (p = 0; p < k; p++) ev.push(a[p][p]);
    return ev.sort(function (u, v) { return u - v; });
  }

  // curvature(D, P): the curvature of the valley where the numbers P stand.
  //   max, min    the largest and smallest eigenvalue of hessian(D, P)
  //   alphaMax    2 / max: a larger step overshoots along the steepest direction and the run
  //               swings ever wider (while no neuron switches)
  //   values      every eigenvalue, smallest first
  function curvature(D, P) {
    var ev = eigSym(hessian(D, P));
    var mx = ev[ev.length - 1];
    return { min: ev[0], max: mx, alphaMax: mx > 0 ? 2 / mx : Infinity, values: ev };
  }

  // ===== the old tools, for comparison

  // Least squares of a line on the rows rs: { w, b, ok }; ok is false when the x of the rows
  // do not spread (one distinct x).
  function lineOn(D, rs) {
    var k = rs.length, sx = 0, sy = 0, i;
    for (i = 0; i < k; i++) { sx += D.x[rs[i]]; sy += D.y[rs[i]]; }
    var mx = sx / k, my = sy / k, sxx = 0, sxy = 0;
    for (i = 0; i < k; i++) {
      var u = D.x[rs[i]] - mx;
      sxx += u * u;
      sxy += u * (D.y[rs[i]] - my);
    }
    if (!(sxx > 1e-12 * Math.max(1, mx * mx))) return { w: 0, b: my, ok: false };
    var w = sxy / sxx;
    return { w: w, b: my - w * mx, ok: true };
  }

  // bestLine(D): the least-squares straight line yhat = w x + b, { w, b, lbar }.
  function bestLine(D) {
    var rs = [];
    for (var i = 0; i < D.n; i++) rs.push(i);
    var L = lineOn(D, rs);
    var sum = 0;
    for (var k = 0; k < D.n; k++) {
      var e = D.y[k] - (L.w * D.x[k] + L.b);
      sum += e * e;
    }
    return { w: L.w, b: L.b, lbar: sum / D.n };
  }

  // bestOneBend(D): the best single bend, yhat = ReLU(w x + b) (steps 1 and 2's model), exactly:
  // { w, b, lbar, knot }. On a stretch between two neighbouring x the neurons that are on do not
  // change, so the best bend there is the least-squares line of the rows it covers (if its knot
  // stays on the stretch) or a bend whose knot sits on an observation; the flat answer
  // yhat = max(0, b) is a candidate too.
  function bestOneBend(D) {
    var xs = D.x.slice().sort(function (u, v) { return u - v; });
    var cuts = [];
    for (var i = 0; i < xs.length; i++) if (i === 0 || xs[i] !== xs[i - 1]) cuts.push(xs[i]);
    var best = null;
    function consider(w, b) {
      var P = params([w], [b]), l = lbarOf(D, P);
      if (best === null || l < best.lbar - 1e-12) best = { w: w, b: b, lbar: l, knot: w !== 0 ? -b / w : null };
    }
    var mean = 0;
    for (var q = 0; q < D.n; q++) mean += D.y[q];
    mean /= D.n;
    consider(0, Math.max(0, mean));
    // the rows on the rising side of a knot t (w > 0) or on the falling side (w < 0)
    for (var s = 0; s <= cuts.length; s++) {
      var lo = s === 0 ? -Infinity : cuts[s - 1], hi = s === cuts.length ? Infinity : cuts[s];
      [1, -1].forEach(function (dir) {
        var rs = [];
        for (var k = 0; k < D.n; k++) {
          // a knot strictly between lo and hi: rising bends hear x >= hi, falling ones x <= lo
          if (dir > 0 ? D.x[k] >= hi : D.x[k] <= lo) rs.push(k);
        }
        if (rs.length === 0) return;
        var L = lineOn(D, rs);
        if (L.ok && L.w * dir > 0) {
          var t = -L.b / L.w;
          if (t > lo && t < hi) consider(L.w, L.b);
        }
      });
    }
    // a knot on an observation: yhat = c max(0, x - t) or c max(0, t - x), c from least squares
    cuts.forEach(function (t) {
      [1, -1].forEach(function (dir) {
        var shh = 0, shy = 0;
        for (var k = 0; k < D.n; k++) {
          var h = Math.max(0, dir * (D.x[k] - t));
          shh += h * h;
          shy += h * D.y[k];
        }
        if (shh > 0 && shy > 0) {
          var c = shy / shh;
          consider(dir * c, -dir * c * t);
        }
      });
    });
    return best;
  }

  // ===== a start

  // spreadStart(D, m [, opts]): a start of the kind GRADIENTS.md recommends, for any data with at
  // least m + 1 distinct x. m rising bends, each in the middle of a gap between two neighbouring
  // observations, the gaps picked nearest to an even spread over the range of x, so neuron j hears
  // the observations right of its bend and every neuron hears some, a different number each. The
  // slopes double from neuron to neuron, s, 2s, 4s, ..., with s the largest of 1, 2 and 5 times a
  // power of ten that keeps the start curve at or under every observation (opts.s sets it), so the
  // first slopes all point the same way. Returns params, with the knots in P.knots.
  function spreadStart(D, m, opts) {
    opts = opts || {};
    var xs = D.x.slice().sort(function (u, v) { return u - v; }), d = [], i, j;
    for (i = 0; i < xs.length; i++) if (i === 0 || xs[i] !== xs[i - 1]) d.push(xs[i]);
    if (d.length < m + 1) throw new Error('spreadStart: need at least m + 1 distinct x');
    var lo = d[0], hi = d[d.length - 1], ts = [], used = {};
    for (j = 0; j < m; j++) {
      var want = lo + (j + 0.5) * (hi - lo) / m, best = -1;
      for (i = 0; i + 1 < d.length; i++) {
        if (used[i]) continue;
        if (best < 0 || Math.abs((d[i] + d[i + 1]) / 2 - want) < Math.abs((d[best] + d[best + 1]) / 2 - want)) best = i;
      }
      used[best] = true;
      ts.push((d[best] + d[best + 1]) / 2);
    }
    ts.sort(function (u, v) { return u - v; });
    function make(s) {
      var w = [], b = [];
      for (var k = 0; k < m; k++) {
        w.push(s * Math.pow(2, k));
        b.push(-s * Math.pow(2, k) * ts[k] + 0);
      }
      var P = params(w, b);
      P.knots = ts.slice();
      return P;
    }
    if (opts.s !== undefined) return make(opts.s);
    var s = 1;
    for (var e = 3; e >= -4; e--) {
      var steps = [5, 2, 1], found = false;
      for (var q = 0; q < steps.length; q++) {
        var c = steps[q] * Math.pow(10, e), P = make(c), under = true;
        for (i = 0; i < D.n; i++) if (curve(P, D.x[i]) > D.y[i]) { under = false; break; }
        if (under) { s = c; found = true; break; }
      }
      if (found) break;
    }
    return make(s);
  }

  // ===== choosing the defaults (a tool for node, see GRADIENTS.md, "Defaults")

  // review(D, P, alpha [, opts]): how the start P and the step alpha behave, against the rules of
  // GRADIENTS.md, "Defaults". { ok, why: [the rules broken], and the measures }. opts.eps (0.01)
  // is the hop, opts.kmax (20000) the length of the run, opts.seconds (22) Play's budget.
  function review(D, P, alpha, opts) {
    opts = opts || {};
    var eps = opts.eps || 0.01, kmax = opts.kmax || 20000, why = [], i, j, k;
    var m = P.w.length, n = D.n, F0 = forward(D, P), G0 = grad(D, P, F0);
    var rep = { alpha: alpha, eps: eps, m: m, lbar0: F0.lbar };
    for (i = 1; i < n; i++) if (!(D.x[i] > D.x[i - 1])) { why.push('the observations are not sorted by x'); break; }
    var xs = D.x.slice().sort(function (u, v) { return u - v; }), gap = (xs[n - 1] - xs[0]) / Math.max(1, n - 1);
    var counts = hearing(D, P).map(function (h) { return h.length; });
    rep.counts = counts;
    for (i = 0; i < n; i++) for (j = 0; j < m; j++) if (F0.A[i][j] === 0) why.push('a bend sits on an observation');
    for (j = 0; j < m; j++) {
      if (!(P.w[j] > 0)) why.push('neuron ' + (j + 1) + ' does not rise');
      if (j > 0 && !(knot(P, j) > knot(P, j - 1))) why.push('the bends are not numbered from left to right');
      if (counts[j] === 0) why.push('neuron ' + (j + 1) + ' hears nothing at the start');
      if (j > 0 && !(counts[j] < counts[j - 1])) why.push('neuron ' + (j + 1) + ' hears as many as the one before');
    }
    if (!(counts[0] < n)) why.push('neuron 1 hears every observation, so the first hop shows no gate');
    if (twins(P).length) why.push('twins at the start');
    for (i = 0; i < n; i++) if (F0.yhat[i] > D.y[i]) { why.push('the start curve passes over a point'); break; }
    for (j = 0; j < m; j++) if (!(G0.w[j] < 0 && G0.b[j] < 0)) { why.push('a first slope says go down'); break; }
    var one = bestOneBend(D);
    rep.oneBend = one.lbar;
    if (F0.lbar < 3 * one.lbar) why.push('the start is not clearly worse than the best single bend');
    var hopErr = 0;
    ['w', 'b'].forEach(function (which) {
      for (var q = 0; q < m; q++) {
        var H = hop(D, P, which, q, eps);
        if (H.crossed.length) why.push('the hop of ' + which + '_' + (q + 1) + ' crosses a kink');
        hopErr = Math.max(hopErr, Math.abs(H.slope - H.deriv) / Math.max(1e-300, Math.abs(H.deriv)));
      }
    });
    rep.hopErr = hopErr;
    if (hopErr > 0.005) why.push('a hop reads its slope more than half a percent off');
    // the run
    var R = run(D, P, alpha, { kmax: kmax });
    rep.diverged = R.diverged;
    if (R.diverged) { why.push('the run blows up'); rep.ok = false; rep.why = why; return rep; }
    var cache = {}, worst = 0, died = 0, rose = 0;
    for (k = 0; k < R.ps.length; k++) {
      var Fk = forward(D, R.ps[k]), key = Fk.on.map(function (row) { return row.map(Number).join(''); }).join('|');
      if (!died) for (j = 0; j < m; j++) if (!Fk.on.some(function (row) { return row[j]; })) { died = k + 1; break; }
      if (cache[key] === undefined) cache[key] = eigSym(hessian(D, R.ps[k], Fk)).pop();
      worst = Math.max(worst, alpha * cache[key] / 2);
      if (k > 0 && R.lbars[k] > R.lbars[k - 1]) rose++;
    }
    rep.worst = worst;
    rep.died = died;
    if (died) why.push('a neuron dies at iteration ' + died);
    if (rose) why.push('lbar rises at ' + rose + ' iterations');
    if (worst >= 0.8) why.push('alpha reaches ' + worst.toFixed(2) + ' of the largest safe step');
    rep.lbar1 = R.lbars[1];
    rep.ratio1 = R.lbars[1] / R.lbars[0];
    if (rep.ratio1 < 0.1 || rep.ratio1 > 0.8) why.push('the first update leaves lbar at ' + rep.ratio1.toFixed(2) + ' of the start');
    var move = 0;
    for (j = 0; j < m; j++) move = Math.max(move, Math.abs(knot(R.ps[1], j) - knot(P, j)) / gap);
    rep.knotMove = move;
    if (move > 1) why.push('the first update moves a bend by more than a gap between observations');
    var s = settleAt(D, R);
    rep.settle = s;
    if (!s) { why.push('the run does not settle'); rep.ok = false; rep.why = why; return rep; }
    rep.seconds = playTime(s);
    if (rep.seconds > (opts.seconds || 22)) why.push('Play needs ' + rep.seconds.toFixed(1) + ' s to get there');
    var Ps = R.ps[s - 1], Hs = hearing(D, Ps), keys = {};
    for (i = 0; i < n; i++) if (!Hs.some(function (h) { return h.indexOf(i) >= 0; })) { why.push('where it settles, observation ' + (i + 1) + ' is unheard'); break; }
    Hs.forEach(function (h) { keys[h.join(',')] = true; });
    if (Object.keys(keys).length < m) why.push('where it settles, two neurons hear the same observations');
    rep.lbarSettle = R.lbars[s - 1];
    rep.lbarEnd = R.lbars[R.lbars.length - 1];
    if (rep.lbarSettle > one.lbar / 10) why.push('the fit is less than ten times better than the single bend');
    // after settling the numbers creep on; the curve on the points must stay within 3 percent of
    // the range of y of where the run ends
    var ys = forward(D, Ps).yhat, ye = forward(D, R.ps[R.ps.length - 1]).yhat, creep = 0;
    for (i = 0; i < n; i++) creep = Math.max(creep, Math.abs(ys[i] - ye[i]));
    var ylo = Math.min.apply(null, D.y), yhi = Math.max.apply(null, D.y);
    rep.creep = creep / Math.max(yhi - ylo, 1e-300);
    if (rep.creep > 0.03) why.push('after settling the curve still moves by ' + (100 * rep.creep).toFixed(1) + ' percent of the range of y');
    rep.ok = why.length === 0;
    rep.why = why;
    return rep;
  }

  // findStart(D, m [, opts]): the starts of the recommended kind that pass review(), best first
  // (earliest settle, then lowest lbar there). Bends at the middles of gaps between observations,
  // the first in the first gap, neighbours at least a 2m-th of the range apart; slopes s, 2s, 4s,
  // ... with s and alpha round numbers (1, 2, 2.5, 3, 4, 5, 6 or 8 times a power of ten), alpha
  // between 0.15 and 0.75 of the largest safe step at the start. Slow (seconds to a minute):
  // run it in node, as `node scripts/check-math.js --find`.
  function findStart(D, m, opts) {
    opts = opts || {};
    var xs = D.x.slice().sort(function (u, v) { return u - v; }), gaps = [], i;
    for (i = 0; i + 1 < xs.length; i++) if (xs[i + 1] > xs[i]) gaps.push((xs[i] + xs[i + 1]) / 2);
    var range = xs[xs.length - 1] - xs[0], nice = [], e, c;
    var cs = [1, 2, 2.5, 3, 4, 5, 6, 8];
    for (e = -5; e <= 2; e++) for (c = 0; c < cs.length; c++) nice.push(+(cs[c] * Math.pow(10, e)).toPrecision(3));
    var sets = [];
    (function rec(pre, from) {
      if (pre.length === m) { sets.push(pre.slice()); return; }
      for (var q = from; q < gaps.length; q++) {
        if (pre.length === 0 && q > 0) return;
        if (pre.length && gaps[q] - pre[pre.length - 1] < range / (2 * m)) continue;
        pre.push(gaps[q]);
        rec(pre, q + 1);
        pre.pop();
      }
    })([], 0);
    var one = bestOneBend(D), out = [];
    sets.forEach(function (ts) {
      nice.forEach(function (base) {
        if (base < 0.01 || base > 50) return;
        var w = [], b = [];
        for (var j = 0; j < m; j++) {
          w.push(+(base * Math.pow(2, j)).toPrecision(6));
          b.push(+(-w[j] * ts[j]).toPrecision(10) + 0);
        }
        var P = params(w, b), F = forward(D, P);
        for (var q = 0; q < D.n; q++) if (F.yhat[q] > D.y[q]) return;
        if (F.lbar < 3 * one.lbar) return;
        if (curve(P, xs[xs.length - 1]) < 0.3 * Math.max.apply(null, D.y)) return;
        var am = curvature(D, P).alphaMax;
        nice.forEach(function (alpha) {
          if (alpha < 0.15 * am || alpha > 0.75 * am) return;
          var rep = review(D, P, alpha, { eps: opts.eps, kmax: opts.kmax || 6000 });
          if (rep.ok) out.push({ w: w, b: b, knots: ts.slice(), alpha: alpha, review: rep });
        });
      });
    });
    out.sort(function (u, v) {
      return (u.review.settle / 1000 + 20 * u.review.lbarSettle / one.lbar) - (v.review.settle / 1000 + 20 * v.review.lbarSettle / one.lbar);
    });
    return out;
  }

  // ===== the ground under one grasshopper

  // profile(D, P, which, j, vs): lbar for every value v of the list vs given to which_j, the other
  // numbers held still: the ground under that grasshopper's feet, as step 0 plots l(w).
  function profile(D, P, which, j, vs) {
    var Q = copy(P);
    return vs.map(function (v) { Q[which][j] = v; return lbarOf(D, Q); });
  }

  // kinks(D, P, which, j): the values of which_j where a row of neuron j switches on or off, sorted.
  // Between two of them the ground is a parabola; at each it bends.
  function kinks(D, P, which, j) {
    var out = [];
    for (var i = 0; i < D.n; i++) {
      if (which === 'w') { if (D.x[i] !== 0) out.push(-P.b[j] / D.x[i]); }
      else out.push(-P.w[j] * D.x[i]);
    }
    return out.sort(function (u, v) { return u - v; });
  }

  // ===== numbers as TeX (copied from step 0, ../grasshopper-finds-w/js/math.js)

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

  // ===== the page's own helpers (added by the page agent, 30 October 2026; see README.md)

  // fmtCell(v): a cell of A, Z, yhat or l, two decimals (GRADIENTS.md, "Decimals"), and 0 once it
  // rounds to 0 there. fmtGrad(v): a cell of the gradient, the same.
  function fmtCell(v) {
    var s = fmt(v, 2);
    return s.indexOf('times') >= 0 ? '0' : s;
  }
  function fmtGrad(v) { return fmtCell(v); }

  // num(s): a number written by fmt, read back (thin spaces dropped). decimals(s): its decimals.
  function num(s) { return parseFloat(String(s).replace(/\\,/g, '')); }
  function decimals(s) {
    var p = String(s).split('.');
    return p.length > 1 ? p[1].length : 0;
  }

  // hopShown(H): the numbers of a hop as the band writes them, in step 2's convention (its
  // hopShown): the two lbar values to four decimals (more when the hop moves lbar by less than
  // 0.01), and their difference over eps worked out from the digits shown, so the room can redo
  // the division by hand. { l1, l0, eps, slope, deriv }.
  function hopShown(H) {
    var d = Math.abs(H.delta);
    var dec = d >= 0.01 || d === 0 ? 4 : Math.min(12, Math.ceil(-Math.log10(d)) + 2);
    var s1 = fmt(H.after.lbar, dec), s0 = fmt(H.before.lbar, dec);
    var q = (num(s1) - num(s0)) / H.eps;
    var qdec = Math.max(2, Math.max(decimals(s1), decimals(s0)) - Math.round(-Math.log10(H.eps)));
    return { l1: s1, l0: s0, eps: fmt(H.eps, 6), slope: q === 0 ? '0' : fmt(q, qdec), deriv: fmtGrad(H.deriv) };
  }

  // oneBendPass(D): the best single bend of steps 1 and 2 (bestOneBend) with its forward pass, as
  // the page's old diagram shows it: { w, b, knot, a, yhat, l, lbar }.
  function oneBendPass(D) {
    var B = bestOneBend(D), F = forward(D, params([B.w], [B.b]));
    return {
      w: B.w, b: B.b, knot: B.knot, lbar: F.lbar, yhat: F.yhat, l: F.l,
      a: F.A.map(function (row) { return row[0]; })
    };
  }

  // trueCurve(x): the curve the story's counts come from (STORY.md, section 4): 5 aphids on day 1,
  // doubling every 1.8 days.
  function trueCurve(x) { return 5 * Math.pow(2, (x - 1) / 1.8); }

  // parse(s): a number the address may carry ("-1.5", "0,003"), or null.
  function parse(s) {
    var t = String(s === undefined || s === null ? '' : s).trim().replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    var v = parseFloat(t);
    return isFinite(v) ? v : null;
  }

  // The rest of the story, for the page's optional last clicks (STORY.md, sections 4 and 5, and
  // its open question 3): the same counting noise continued gives 102 aphids on day 9 and 156 on
  // day 10, when the box comes.
  var LATER = { x: [9, 10], y: [102, 156] };

  // ===== the story's numbers and the defaults of GRADIENTS.md

  // The story of STORY.md, Lina's rose: the aphids she counts on a rose bud on the evenings of days
  // 1 to 8, and her question, whether the curve passes 100 aphids (one box of ladybird larvae) by
  // day 10. The start, the step and the hop are the defaults of GRADIENTS.md, "Defaults":
  // four rising bends, one every two days at 1.5, 3.5, 5.5 and 7.5, with slopes doubling from 1, so
  // b_j = -w_j times the bend. The three presets show what can go wrong (GRADIENTS.md).
  var DEFAULTS = {
    x: [1, 2, 3, 4, 5, 6, 7, 8],             // days
    y: [5, 7, 11, 17, 25, 34, 51, 73],       // aphids
    units: { x: 'days', y: 'aphids' },
    question: { x: 10, y: 100 },             // will yhat(10) pass 100 aphids?
    m: 4,
    w: [1, 2, 4, 8],
    b: [-1.5, -7, -22, -60],
    alpha: 0.003,
    eps: 0.01,
    dead: { w: [1, 2, 4, 8], b: [-1.5, -7, -22, -68] },   // neuron 4 bends at 8.5, past the last day
    twins: { w: [1, 2, 2, 8], b: [-1.5, -7, -7, -60] },   // neurons 2 and 3 alike
    bigAlpha: 0.02                                        // a step too large: the swarm dies
  };

  return {
    data: data, params: params, copy: copy,
    forward: forward, lbarOf: lbarOf,
    grad: grad, terms: terms, hop: hop, slopes: slopes,
    update: update, step: step, run: run, settleAt: settleAt,
    playCount: playCount, playTime: playTime,
    neuron: neuron, curve: curve, knot: knot,
    hears: hears, hearing: hearing, dead: dead, twins: twins,
    hessian: hessian, eigSym: eigSym, curvature: curvature,
    bestLine: bestLine, bestOneBend: bestOneBend, spreadStart: spreadStart,
    review: review, findStart: findStart,
    profile: profile, kinks: kinks,
    fmt: fmt, fmtSig: fmtSig, sci: sci, wrap: wrap,
    DEFAULTS: DEFAULTS,
    // the page agent's additions
    fmtCell: fmtCell, fmtGrad: fmtGrad, num: num, hopShown: hopShown, oneBendPass: oneBendPass,
    trueCurve: trueCurve, parse: parse, LATER: LATER
  };
}));
