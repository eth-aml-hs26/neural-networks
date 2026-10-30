/* plot.js: the plot of y against x, as GF.plot. The black part drives it (its clicks plot, line
 * and loss); it holds no state of its own.
 *
 *   build(layer)   the axes, the ticks, the eight points, the hinge line, its marks and the gaps
 *   render(o)      o = {axes, points, line, marks, gaps, w, b, trail: [[w, b], ...]}: what shows
 *   el             the elements, for the animations of the black part
 *
 * The points are the days (x_i, y_i). The hinge line is yhat(x) = ReLU(w x + b) over the whole
 * range, its marks are the eight predictions (x_i, yhat_i), and the gaps are the red segments from
 * each point to its mark, whose squares are the losses. Earlier lines stay as a faint trail.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = { pts: [], marks: [], gaps: [], trail: [] };
  var TRAIL = 8;

  function build(layer) {
    var P = G.plot;
    el.g = K.svg('g', null, layer.back, 'plot vis');
    el.axX = K.arrow(el.g, [[P.x0 - 10, P.oy], [P.x1 + 22, P.oy]], 'axis on', { size: 13 });
    el.axY = K.arrow(el.g, [[P.x0, P.oy + 10], [P.x0, P.top - 26]], 'axis on', { size: 13 });
    el.ticks = K.svg('g', null, el.g, 'ticks');
    [0, 5, 10, 15, 20].forEach(function (v) {
      var x = G.px(v);
      K.svg('path', { d: 'M ' + x + ' ' + P.oy + ' L ' + x + ' ' + (P.oy + 7) }, el.ticks, 'tick-mark');
    });
    [20, 40, 60].forEach(function (v) {
      var y = G.py(v);
      K.svg('path', { d: 'M ' + (P.x0 - 7) + ' ' + y + ' L ' + P.x0 + ' ' + y }, el.ticks, 'tick-mark');
      K.svg('path', { d: 'M ' + P.x0 + ' ' + y + ' L ' + P.x1 + ' ' + y }, el.ticks, 'grid-line');
    });

    // the plot area, for clipping the line where it leaves the top
    var defs = K.svg('defs', null, el.g);
    var clip = K.svg('clipPath', { id: 'plot-clip' }, defs);
    K.svg('rect', { x: P.x0, y: P.top - 24, width: P.x1 - P.x0 + 16, height: P.oy - P.top + 24 }, clip);

    el.trailG = K.svg('g', { 'clip-path': 'url(#plot-clip)' }, el.g, 'trail');
    for (var t = 0; t < TRAIL; t++) el.trail.push(K.svg('path', null, el.trailG, 'trail-line'));
    el.line = K.svg('path', { 'clip-path': 'url(#plot-clip)' }, el.g, 'hinge vis');
    el.gapsG = K.svg('g', null, el.g, 'k-red');
    for (var i = 0; i < M.N; i++) {
      el.gaps.push(K.svg('path', null, el.gapsG, 'gap vis'));
    }
    for (i = 0; i < M.N; i++) {
      el.pts.push(K.svg('circle', { r: 6.5, cx: G.px(M.X[i]), cy: G.py(M.Y[i]) }, el.g, 'pt vis'));
    }
    for (i = 0; i < M.N; i++) {
      el.marks.push(K.svg('circle', { r: 5.5 }, el.g, 'mark vis'));
    }

    // tick labels and axis names (HTML, for KaTeX)
    el.labs = [];
    function lab(tex, x, y, anchor, cls) {
      var d = K.div('lab vis ' + (cls || 'tick'), layer.mid);
      K.tex(d, tex);
      K.pos(d, x, y, anchor);
      el.labs.push(d);
      return d;
    }
    [0, 5, 10, 15, 20].forEach(function (v) { lab(String(v), G.px(v), P.oy + 10, 'tc'); });
    [20, 40, 60].forEach(function (v) { lab(String(v), P.x0 - 12, G.py(v), 'cr'); });
    lab('x', P.x1 + 30, P.oy, 'cl', 'axis-lab');
    lab('y', P.x0, P.top - 34, 'bc', 'axis-lab');
    el.unitX = K.div('lab vis plot-unit', layer.mid);
    el.unitX.textContent = '\u00b0C';
    K.pos(el.unitX, P.x1 + 31, P.oy + 26, 'cl');
    el.labs.push(el.unitX);
    el.unitY = K.div('lab vis plot-unit', layer.mid);
    el.unitY.textContent = 'kWh';
    K.pos(el.unitY, P.x0 + 16, P.top - 46, 'cl');
    el.labs.push(el.unitY);
  }

  // The hinge line of (w, b) over the plot's range, with its knot where it lies inside.
  function hingePath(w, b) {
    var P = G.plot, xs = [P.xmin, P.xmax];
    if (w !== 0) {
      var k = -b / w;
      if (k > P.xmin && k < P.xmax) xs = [P.xmin, k, P.xmax];
    }
    return xs.map(function (x, i) {
      return (i ? 'L ' : 'M ') + G.px(x).toFixed(1) + ' ' + G.py(M.relu(w * x + b)).toFixed(1);
    }).join(' ');
  }

  function render(o) {
    K.show(el.g, !!o.axes);
    el.labs.forEach(function (d) { K.show(d, !!o.axes); });
    el.pts.forEach(function (c) { K.show(c, !!o.points); });
    K.show(el.line, !!o.line);
    var f = M.forward(o.w, o.b);
    if (o.line) el.line.setAttribute('d', hingePath(o.w, o.b));
    for (var i = 0; i < M.N; i++) {
      var x = G.px(M.X[i]), yh = G.py(Math.min(f.yhat[i], G.plot.ymax + 4)), y = G.py(M.Y[i]);
      el.marks[i].setAttribute('cx', x.toFixed(1));
      el.marks[i].setAttribute('cy', yh.toFixed(1));
      K.show(el.marks[i], !!o.marks);
      el.gaps[i].setAttribute('d', 'M ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' L ' + x.toFixed(1) + ' ' + yh.toFixed(1));
      K.show(el.gaps[i], !!o.gaps && Math.abs(yh - y) > 0.5);
    }
    // the trail: the lines of the earlier iterations, the most recent darkest
    var tr = o.trail || [];
    el.trail.forEach(function (p, j) {
      var src = tr[tr.length - 1 - j];
      if (!src || !o.line) { p.setAttribute('d', ''); return; }
      p.setAttribute('d', hingePath(src[0], src[1]));
      p.style.opacity = String(0.34 - j * 0.035);
    });
  }

  GF.plot = { build: build, render: render, el: el, hingePath: hingePath, TRAIL: TRAIL };
})();
