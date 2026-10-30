/* plot.js: the plot of the aphids against the days, as GF.plot. The parts drive it through one call,
 * render(o), and it holds no state of its own.
 *
 *   build(layer)  the axes, the ticks, the question (a dashed line at 100 aphids with the box, and a
 *                 dashed line at day 10 with a question mark), the eight points, the old single
 *                 bend, the four bends, their sum, its marks and gaps, the stretch a grasshopper
 *                 hears, and the reading at day 10
 *   render(o)     o = { axes, points, question, old: {w, b}, bends: P, curve: P, marks: yhat,
 *                       gaps: bool, focus: j (the bend of the hopping neuron), heard: [x0, x1],
 *                       lit: [bool per day] (the days a hop reaches), reading: P or {v} with big,
 *                       later: bool (the counts of days 9 and 10), truth: bool, ymax }
 *   el            the elements, for the animations of the parts
 *
 * The sum is drawn solid over the counted days and dashed past day 8, where it carries on as a
 * guess: that part answers the question.
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS, N = T.x.length, MM = T.m, LAST = T.x[N - 1], Q = T.question;
  var el = { pts: [], marks: [], gaps: [], bends: [], discs: [], later: [], labs: [], ticks: [] };

  // the icon of the box of ladybird larvae, centred at 0 0, about 22 by 18
  function boxIcon(parent, cls) {
    var g = K.svg('g', null, parent, 'box-icon ' + (cls || ''));
    K.svg('rect', { x: -10, y: -4, width: 20, height: 12, rx: 1.5 }, g, 'ic-box');
    K.svg('rect', { x: -11.5, y: -8, width: 23, height: 5, rx: 1.5 }, g, 'ic-lid');
    K.svg('ellipse', { cx: 0, cy: -9.2, rx: 4.2, ry: 3.4 }, g, 'ic-bug');
    K.svg('circle', { cx: -1.6, cy: -9.6, r: 0.9 }, g, 'ic-spot');
    K.svg('circle', { cx: 1.7, cy: -8.6, r: 0.9 }, g, 'ic-spot');
    return g;
  }

  function lab(layer, tex, x, y, anchor, cls) {
    var d = K.div('lab vis ' + (cls || 'tick'), layer);
    if (tex !== null) K.tex(d, tex);
    K.pos(d, x, y, anchor);
    return d;
  }

  function build(layer) {
    var P = G.plot;
    el.g = K.svg('g', null, layer.back, 'plot vis');
    var defs = K.svg('defs', null, el.g);
    var clip = K.svg('clipPath', { id: 'plot-clip' }, defs);
    el.clipRect = K.svg('rect', { x: P.x0 - 2, y: P.top - 10, width: P.x1 - P.x0 + 4, height: P.oy - P.top + 10 }, clip);

    el.heard = K.svg('rect', { y: P.top - 10, height: P.oy - P.top + 10 }, el.g, 'heard vis');
    el.grid = K.svg('g', null, el.g);
    el.axX = K.arrow(el.g, [[P.x0 - 10, P.oy], [P.x1 + 22, P.oy]], 'axis on', { size: 13 });
    el.axY = K.arrow(el.g, [[P.x0, P.oy + 10], [P.x0, P.top - 30]], 'axis on', { size: 13 });
    [2, 4, 6, 8, 10].forEach(function (v) {
      var x = G.px(v);
      K.svg('path', { d: 'M ' + x + ' ' + P.oy + ' L ' + x + ' ' + (P.oy + 7) }, el.grid, 'tick-mark');
      el.labs.push(lab(layer.mid, String(v), x, P.oy + 10, 'tc'));
    });
    el.yTicks = [];
    [25, 50, 75, 100].forEach(function (v) {
      var m = K.svg('path', null, el.grid, 'tick-mark'), gl = K.svg('path', null, el.grid, 'grid-line');
      var t = lab(layer.mid, String(v), P.x0 - 12, 0, 'cr');
      el.yTicks.push({ v: v, m: m, gl: gl, t: t });
    });
    el.labs.push(lab(layer.mid, 'x', P.x1 + 30, P.oy, 'cl', 'axis-lab'));
    el.labs.push(lab(layer.mid, 'y', P.x0, P.top - 40, 'bc', 'axis-lab'));
    el.unitX = K.div('lab vis plot-unit', layer.mid);
    el.unitX.textContent = 'days';
    K.pos(el.unitX, P.x1 + 31, P.oy + 26, 'cl');
    el.unitY = K.div('lab vis plot-unit', layer.mid);
    el.unitY.textContent = 'aphids';
    K.pos(el.unitY, P.x0 + 14, P.top - 52, 'cl');
    el.labs.push(el.unitX, el.unitY);

    // the question: 100 aphids, one box; day 10, the day the box comes
    el.q = K.svg('g', null, el.g, 'vis');
    el.q100 = K.svg('path', null, el.q, 'question');
    el.q10 = K.svg('path', null, el.q, 'question');
    el.qBox = boxIcon(el.q, '');
    el.qMark = lab(layer.mid, '?', G.px(Q.x), P.top - 14, 'bc', 'q-mark');

    var c = K.svg('g', { 'clip-path': 'url(#plot-clip)' }, el.g);
    el.trueCurve = K.svg('path', null, c, 'true-curve vis');
    el.old = K.svg('path', null, c, 'curve vis');
    el.bendG = K.svg('g', null, c);
    for (var j = 0; j < MM; j++) {
      var bg = K.svg('g', null, el.bendG, 'bend vis n' + (j + 1));
      el.bends.push({ g: bg, line: K.svg('path', null, bg, 'line') });
    }
    el.curve = K.svg('path', null, c, 'curve vis');
    el.ahead = K.svg('path', null, c, 'curve ahead vis');
    el.gapsG = K.svg('g', null, el.g, 'k-red');
    for (var i = 0; i < N; i++) el.gaps.push(K.svg('path', null, el.gapsG, 'gap vis'));
    for (i = 0; i < N; i++) el.pts.push(K.svg('circle', { r: 6.5, cx: G.px(T.x[i]) }, el.g, 'pt vis'));
    for (i = 0; i < N; i++) el.marks.push(K.svg('circle', { r: 5.5 }, el.g, 'mark vis'));
    M.LATER.x.forEach(function (x) { el.later.push(K.svg('circle', { r: 7, cx: G.px(x) }, el.g, 'later-pt vis')); });
    for (j = 0; j < MM; j++) {
      var d = K.div('disc vis n' + (j + 1), layer.mid);
      d.textContent = String(j + 1);
      el.discs.push(d);
    }

    // the reading at day 10: a ring on the curve, its value, and one box or two
    el.read = K.svg('circle', { r: 7.5 }, el.g, 'reading vis');
    el.readLab = lab(layer.mid, null, 0, 0, 'br', 'reading-lab');
    el.readBoxes = K.svg('g', null, el.g, 'vis');
    el.readBox1 = boxIcon(el.readBoxes, '');
    el.readBox2 = boxIcon(el.readBoxes, '');
  }

  // ===== paths

  function relu(v) { return v > 0 ? v : 0; }
  function seg(xs, f) {
    return xs.map(function (x, i) { return (i ? 'L ' : 'M ') + G.px(x).toFixed(1) + ' ' + G.py(f(x)).toFixed(1); }).join(' ');
  }
  // the x where a piece of the curve can bend: the ends and every knot inside [a, b]
  function stops(P, a, b) {
    var xs = [a, b];
    for (var j = 0; j < P.w.length; j++) {
      var k = M.knot(P, j);
      if (k !== null && k > a && k < b) xs.push(k);
    }
    return xs.sort(function (u, v) { return u - v; });
  }
  function bendPath(P, j) {
    var P1 = M.params([P.w[j]], [P.b[j]]);
    return seg(stops(P1, G.plot.xmin, G.plot.xmax), function (x) { return M.neuron(P, j, x); });
  }
  function curvePath(P, a, b) {
    return seg(stops(P, a, b), function (x) { return M.curve(P, x); });
  }
  G.bendPath = bendPath;

  // where bend j meets the right edge, or the top if it leaves there first
  function bendEnd(P, j) {
    var Pl = G.plot, v = M.neuron(P, j, Pl.xmax);
    if (v <= Pl.ymax) return { x: Pl.x1 + 16, y: G.py(v), side: true };
    var xe = (Pl.ymax - P.b[j]) / P.w[j];
    return { x: G.px(xe), y: Pl.top - 12, side: false };
  }

  // ===== render

  var YMAX = G.plot.ymax;
  function render(o) {
    var Pl = G.plot, want = o.ymax || YMAX;
    if (want !== Pl.ymax) G.setRange(want);
    K.show(el.g, !!o.axes);
    el.labs.forEach(function (d) { K.show(d, !!o.axes); });
    el.yTicks.forEach(function (t) {
      var y = G.py(t.v), inside = t.v <= Pl.ymax;
      t.m.setAttribute('d', 'M ' + (Pl.x0 - 7) + ' ' + y.toFixed(1) + ' L ' + Pl.x0 + ' ' + y.toFixed(1));
      t.gl.setAttribute('d', t.v === Q.y ? '' : 'M ' + Pl.x0 + ' ' + y.toFixed(1) + ' L ' + Pl.x1 + ' ' + y.toFixed(1));
      K.pos(t.t, Pl.x0 - 12, y, 'cr');
      K.show(t.t, !!o.axes && inside);
    });

    // the question
    K.show(el.q, !!o.question);
    el.q100.setAttribute('d', 'M ' + Pl.x0 + ' ' + G.py(Q.y).toFixed(1) + ' L ' + Pl.x1 + ' ' + G.py(Q.y).toFixed(1));
    el.q10.setAttribute('d', 'M ' + G.px(Q.x) + ' ' + Pl.oy + ' L ' + G.px(Q.x) + ' ' + (Pl.top - 8));
    el.qBox.setAttribute('transform', 'translate(' + (Pl.x0 + 22) + ',' + (G.py(Q.y) - 12).toFixed(1) + ')');
    K.show(el.qMark, !!o.question && !o.reading);

    // the points, lit or dimmed by a hop
    el.pts.forEach(function (c, i) {
      c.setAttribute('cy', G.py(T.y[i]).toFixed(1));
      K.show(c, !!o.points);
      c.classList.toggle('lit', !!(o.lit && o.lit[i]));
      c.classList.toggle('dim', !!(o.lit && !o.lit[i]));
    });

    // the old single bend of step 2
    K.show(el.old, !!o.old);
    if (o.old) el.old.setAttribute('d', bendPath(M.params([o.old.w], [o.old.b]), 0));

    // the four bends, each ReLU(w_j x + b_j), and their numbers
    var ends = [];
    el.bends.forEach(function (b, j) {
      var on = !!o.bends;
      K.show(b.g, on);
      if (on) b.line.setAttribute('d', bendPath(o.bends, j));
      b.g.classList.toggle('bold', o.focus === j);
      b.g.classList.toggle('dim', o.focus !== undefined && o.focus !== null && o.focus !== j);
      K.show(el.discs[j], on);
      if (on) ends.push({ j: j, e: bendEnd(o.bends, j) });
    });
    // the numbers at the right edge, pushed apart so they never overlap
    var side = ends.filter(function (q) { return q.e.side; }).sort(function (u, v) { return v.e.y - u.e.y; });
    for (var k = 1; k < side.length; k++) side[k].e.y = Math.min(side[k].e.y, side[k - 1].e.y - 22);
    ends.forEach(function (q) {
      K.pos(el.discs[q.j], q.e.x, q.e.y, q.e.side ? 'cl' : 'bc');
      el.discs[q.j].classList.toggle('dim', o.focus !== undefined && o.focus !== null && o.focus !== q.j);
    });

    // their sum: solid over the counted days, dashed past the last one
    K.show(el.curve, !!o.curve);
    K.show(el.ahead, !!o.curve);
    if (o.curve) {
      el.curve.setAttribute('d', curvePath(o.curve, Pl.xmin, LAST));
      el.ahead.setAttribute('d', curvePath(o.curve, LAST, Pl.xmax));
    }

    // the marks (the guesses yhat_i on the curve) and the gaps to the points
    for (var i = 0; i < N; i++) {
      var x = G.px(T.x[i]), y = G.py(T.y[i]);
      var yh = o.marks ? G.py(Math.min(o.marks[i], Pl.ymax + 2)) : y;
      el.marks[i].setAttribute('cx', x.toFixed(1));
      el.marks[i].setAttribute('cy', yh.toFixed(1));
      K.show(el.marks[i], !!o.marks);
      el.marks[i].classList.toggle('dim', !!(o.lit && !o.lit[i]));
      el.gaps[i].setAttribute('d', 'M ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + yh.toFixed(1));
      K.show(el.gaps[i], !!o.gaps && !!o.marks && Math.abs(yh - y) > 0.5);
      el.gaps[i].classList.toggle('dim', !!(o.lit && !o.lit[i]));
    }

    // the stretch of days a grasshopper hears: right of its bend
    K.show(el.heard, !!o.heard);
    if (o.heard) {
      var h0 = Math.max(Pl.x0, G.px(o.heard[0])), h1 = Math.min(Pl.x1, G.px(o.heard[1]));
      el.heard.setAttribute('x', h0.toFixed(1));
      el.heard.setAttribute('width', Math.max(0, h1 - h0).toFixed(1));
    }

    // the reading at day 10
    var rv = o.reading ? (o.reading.v !== undefined ? o.reading.v : M.curve(o.reading, Q.x)) : null;
    K.show(el.read, rv !== null);
    K.show(el.readLab, rv !== null);
    if (rv !== null) {
      var rx = G.px(Q.x), ry = G.py(Math.min(rv, Pl.ymax + 4));
      el.read.setAttribute('cx', rx.toFixed(1));
      el.read.setAttribute('cy', ry.toFixed(1));
      K.tex(el.readLab, M.fmt(rv, 2));
      el.readLab.classList.toggle('big', !!(o.reading && o.reading.big));
      var big = !!(o.reading && o.reading.big);
      // the value right of the ring; the big one of the answer left of it, where the curve is lower
      K.pos(el.readLab, big ? rx - 16 : rx + 13, ry, big ? 'cr' : 'cl');
      var two = rv > Q.y;
      el.readBox1.setAttribute('transform', 'translate(' + (rx + 24) + ',' + (ry + 4).toFixed(1) + ')');
      el.readBox2.setAttribute('transform', 'translate(' + (rx + 49) + ',' + (ry + 4).toFixed(1) + ')');
      el.readBox2.style.display = two ? '' : 'none';
    }
    K.show(el.readBoxes, rv !== null && !!(o.reading && o.reading.big));

    // the rest of the story: the counts of days 9 and 10, and the curve they come from
    el.later.forEach(function (c, q) {
      c.setAttribute('cy', G.py(M.LATER.y[q]).toFixed(1));
      K.show(c, !!o.later);
    });
    K.show(el.trueCurve, !!o.truth);
    if (o.truth) {
      var d = '';
      for (var s = 0; s <= 110; s++) {
        var xx = Pl.xmin + (Pl.xmax - Pl.xmin) * s / 110;
        d += (s ? ' L ' : 'M ') + G.px(xx).toFixed(1) + ' ' + G.py(M.trueCurve(xx)).toFixed(1);
      }
      el.trueCurve.setAttribute('d', d);
    }
  }

  GF.plot = { build: build, render: render, el: el, bendPath: bendPath, curvePath: curvePath, boxIcon: boxIcon };
})();
