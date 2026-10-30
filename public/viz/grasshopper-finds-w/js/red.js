/* red.js: the red part, the forward pass and the curve of the loss, as GF.parts.red.
 *
 * Iteration 1, one click each (every speed):
 *   forward  the forward pass: a red band, a broad arrow from w through yhat to the loss, flows in
 *   point    the plot's axes, with their numbers, and the point (w, l(w)); w and l fly from their
 *            boxes to its axes
 *   curve    every w has its loss: the parabola l(w) = (3 - 17 w)^2, and a question mark under its
 *            lowest point
 * Iteration 2 on, one click (speeds 1 and 2; speed 3 has none):
 *   plot     the band flows in again and the plot zooms to the view of this iteration
 *
 * The band goes once the blue part starts: forward, then backward. The plot is a real one: numbered
 * axes, the view of GF.geo.viewOf (the first one is the plain curve from w = -0.1 to 0.6, widened
 * for the guess), and a zoom from one iteration's view to the next (on a click whose st.zoomFrom
 * is set). It leaves while the backward pass is worked out and comes back for the jump.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = { wt: [], lt: [] };

  function lab(layer, cls) {
    return K.div('lab vis ' + (cls || ''), layer);
  }

  function build(layer) {
    el.band = K.band(GF.under, G.pass.forward, 'gf-pass-forward', 'k-red');
    el.fwd = K.div('word vis', layer.mid);
    el.fwd.textContent = 'forward pass';
    K.pos(el.fwd, G.label.forward[0], G.label.forward[1], G.label.forward[2]);

    var P = G.plot;
    el.plot = K.svg('g', null, layer.back, 'plot vis');
    var cp = K.svg('clipPath', { id: 'gf-plot-clip' }, el.plot);
    K.svg('rect', { x: P.ox, y: P.yend - 40, width: P.xend - P.ox, height: P.oy - P.yend + 40 }, cp);
    el.grid = K.svg('g', null, el.plot, 'grid');
    el.marks = K.svg('g', null, el.plot, 'marks');
    el.axX = K.arrow(el.plot, [[P.ox - 12, P.oy], [P.xend, P.oy]], 'axis on', { size: 13 });
    el.axY = K.arrow(el.plot, [[P.ox, P.oy + 12], [P.ox, P.yend]], 'axis on', { size: 13 });
    var inner = K.svg('g', { 'clip-path': 'url(#gf-plot-clip)' }, el.plot);
    el.curve = K.svg('path', null, inner, 'curve vis');
    el.trail = K.svg('g', null, inner, 'trail');
    el.guideV = K.svg('path', null, el.plot, 'guide vis');
    el.guideH = K.svg('path', null, el.plot, 'guide vis');
    el.point = K.svg('circle', { r: 9 }, el.plot, 'point vis');

    el.nums = K.div('ticks vis', layer.mid);
    el.labW = lab(layer.mid, 'axis-lab');
    K.tex(el.labW, 'w');
    K.pos(el.labW, P.xend + 10, P.oy, 'cl');
    el.labL = lab(layer.mid, 'axis-lab');
    K.tex(el.labL, '\\ell');
    K.pos(el.labL, P.ox, P.yend - 8, 'bc');
    el.tickW = lab(layer.mid, 'tick');
    el.tickL = lab(layer.mid, 'tick');
    el.q = lab(layer.mid, 'question');
    K.tex(el.q, '?');
    el.formula = lab(layer.mid, 'plot-formula');
    K.tex(el.formula, '\\ell(w) = (3 - 17\\,w)^2');
    K.pos(el.formula, (P.x0 + P.x1) / 2, P.ytop + 6, 'tc');
  }

  // ===== what shows when

  function bandOn(st) {
    var mine = st.iter === 1 ? st.reached('red', 'forward') : st.reached('red', 'plot');
    return mine && !st.partReached('blue') && !st.partReached('purple');
  }

  // The plot shows from its first point on; it leaves while the backward pass is worked out (purple
  // has started, its decision and jump not yet), and comes back for the jump.
  function plotOn(st) {
    if (!st) return false;
    var base = st.iter > 1 || st.reached('red', 'point');
    var away = st.partReached('purple') && !st.reached('purple', 'decide') && !st.jumped;
    return base && !away;
  }

  function curveOn(st) { return plotOn(st) && (st.iter > 1 || st.reached('red', 'curve')); }

  // ===== drawing the plot in the current view (GF.geo.plot)

  function curvePath() {
    var P = G.plot, d = '', n = 200;
    for (var i = 0; i <= n; i++) {
      var w = P.wlo + (P.whi - P.wlo) * i / n;
      d += (i ? ' L ' : 'M ') + G.wx(w).toFixed(1) + ' ' + G.ly(M.loss(w)).toFixed(1);
    }
    return d;
  }

  // a pool of tick numbers in el.nums, reused from one frame of a zoom to the next
  function num(pool, i, cls) {
    if (!pool[i]) pool[i] = K.div('tick-num ' + cls, el.nums);
    return pool[i];
  }

  // the numbered ticks of both axes, the faint grid, clear of the red numbers of the point and of
  // the question mark
  function drawTicks(px, py, qx, qOn) {
    var P = G.plot, gd = '', md = '', i = 0, j = 0;
    G.ticks(P.wlo, P.whi, 6).forEach(function (t) {
      var x = G.wx(t.v);
      if (x < P.ox + 6 || x > P.x1 + 14) return;
      gd += 'M ' + x.toFixed(1) + ' ' + P.oy + ' L ' + x.toFixed(1) + ' ' + (P.ytop - 20) + ' ';
      md += 'M ' + x.toFixed(1) + ' ' + P.oy + ' L ' + x.toFixed(1) + ' ' + (P.oy + 7) + ' ';
      var n = num(el.wt, i++, 'w');
      n.textContent = t.text;
      n.style.left = x.toFixed(1) + 'px';
      n.style.top = (P.oy + 10) + 'px';
      n.style.visibility = Math.abs(x - px) < 52 || (qOn && Math.abs(x - qx) < 30) ? 'hidden' : '';
    });
    G.ticks(0, P.lmax, 5).forEach(function (t) {
      var y = G.ly(t.v);
      if (y < P.ytop - 16 || t.v === 0) return;
      gd += 'M ' + P.ox + ' ' + y.toFixed(1) + ' L ' + P.x1 + ' ' + y.toFixed(1) + ' ';
      md += 'M ' + (P.ox - 7) + ' ' + y.toFixed(1) + ' L ' + P.ox + ' ' + y.toFixed(1) + ' ';
      var n = num(el.lt, j++, 'l');
      n.textContent = t.text;
      n.style.left = (P.ox - 11) + 'px';
      n.style.top = y.toFixed(1) + 'px';
      n.style.visibility = Math.abs(y - py) < 24 ? 'hidden' : '';
    });
    for (; i < el.wt.length; i++) el.wt[i].style.visibility = 'hidden';
    for (; j < el.lt.length; j++) el.lt[j].style.visibility = 'hidden';
    if (!el.gridPath) el.gridPath = K.svg('path', null, el.grid, 'grid-line');
    if (!el.markPath) el.markPath = K.svg('path', null, el.marks, 'tick-mark');
    el.gridPath.setAttribute('d', gd);
    el.markPath.setAttribute('d', md);
  }

  // Everything of the plot that depends on the view: the curve, the ticks, the point at w and its
  // red numbers, the guides, the earlier points, the question mark.
  function drawPlot(st) {
    var P = G.plot, w = st.plotW, l = M.loss(w), px = G.wx(w), py = G.ly(l);
    el.curve.setAttribute('d', curvePath());
    el.point.setAttribute('cx', px.toFixed(1));
    el.point.setAttribute('cy', py.toFixed(1));
    el.guideV.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' L ' + px.toFixed(1) + ' ' + P.oy);
    el.guideH.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' L ' + P.ox + ' ' + py.toFixed(1));
    K.tex(el.tickW, M.fmt(w));
    K.pos(el.tickW, px, P.oy + 12, 'tc');
    K.tex(el.tickL, M.fmt(l));
    K.pos(el.tickL, P.ox - 12, py, 'cr');

    // the question mark under the lowest point, unless the number of w sits there
    var qx = G.wx(M.W_STAR), qOn = curveOn(st) && Math.abs(qx - px) > 70;
    K.show(el.q, qOn);
    K.pos(el.q, qx, P.oy + 10, 'tc');
    drawTicks(px, py, qx, qOn);

    while (el.trail.firstChild) el.trail.removeChild(el.trail.firstChild);
    st.trail.forEach(function (v) {
      K.svg('circle', { cx: G.wx(v).toFixed(1), cy: G.ly(M.loss(v)).toFixed(1), r: 5 }, el.trail, 'trail-dot');
    });
  }

  function render(st) {
    var on = plotOn(st), cOn = curveOn(st);
    K.show(el.band.g, bandOn(st));
    K.show(el.fwd, bandOn(st));
    K.show(el.plot, on);
    K.show(el.nums, on);
    [el.labW, el.labL, el.tickW, el.tickL, el.point, el.guideV, el.guideH].forEach(function (e) { K.show(e, on); });
    K.show(el.curve, cOn);
    K.show(el.formula, cOn);
    drawPlot(st);
  }

  // ===== animation

  // From the view of the click before to the view of this one; the grasshopper rides on the point
  // where it stood before the click (at speed 3 it jumps only once the zoom is over).
  function zoom(st, prev) {
    var from = st.zoomFrom, to = st.view, h = GF.hopper.main;
    var ride = prev.rest === 'plot' && !!st.rest, w = prev.plotW, f = st.hopFrom ? st.hopFrom.f : 1;
    function frame(v) {
      G.setView(v);
      drawPlot(st);
      if (ride) h.setPose(GF.engine.plotPose(w, f));
    }
    frame(from);
    K.tween(G.zoomMs(st.mode), function (e) { frame(G.mixView(from, to, e)); }, K.ease.inOut, function () {
      frame(to);
      if (ride && w === st.plotW) h.setPose(GF.engine.plotPose(st.plotW));
    });
  }

  function animate(st, prev) {
    var bl = GF.parts.black.el;
    if (st.zoomFrom && plotOn(st) && plotOn(prev)) zoom(st, prev);
    if (st.is('red', 'forward')) {
      K.revealBand(el.band, 1300, 0);
      K.later(el.fwd, 1100);
    } else if (st.is('red', 'point')) {
      K.drawArrow(el.axX, 500, 0);
      K.drawArrow(el.axY, 500, 0);
      K.later(el.nums, 500);
      [el.point, el.guideV, el.guideH, el.tickW, el.tickL].forEach(function (e) { K.temp(e, 'opacity', '0'); });
      K.wait(600, function () {
        K.flyTex(M.fmt(st.w), K.rect(bl.w.val), K.rect(el.tickW), 800, 'k-red', null, 23);
        K.flyTex(M.fmt(M.loss(st.w)), K.rect(bl.loss.val), K.rect(el.tickL), 800, 'k-red', null, 23);
      });
      K.wait(1400, function () {
        el.tickW.style.opacity = '';
        el.tickL.style.opacity = '';
        el.guideV.style.opacity = '';
        el.guideH.style.opacity = '';
      });
      K.wait(1750, function () { el.point.style.opacity = ''; K.pulse(el.point); });
    } else if (st.is('red', 'curve')) {
      K.drawOn(el.curve, 1600, 0);
      K.later(el.formula, 1300);
      K.later(el.q, 1700);
    } else if (st.is('red', 'plot')) {
      K.revealBand(el.band, 900, 0);
      K.later(el.fwd, 700);
      K.wait(st.zoomFrom ? G.zoomMs(st.mode) : 0, function () { K.pulse(el.point); });
    }
  }

  GF.parts.red = {
    steps: function (iter, mode) {
      if (iter === 1) return ['forward', 'point', 'curve'];
      return mode === 3 ? [] : ['plot'];
    },
    build: build, render: render, animate: animate,
    plotOn: plotOn,
    el: el
  };
})();
