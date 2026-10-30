/* coda.js: the closing part, as GF.parts.coda. Its clicks follow the forward pass and the hops of
 * the iteration where the run settles (End and Play go there):
 *
 *   answer   the curve read at day 10: yhat(10) = 112.19, past 100: two boxes (the start said 59.5,
 *            one box; the swarm changed its mind in iteration 4)
 *   truth    (optional, STORY.md open question 3) the box comes on day 10 and Lina counts 156 (102
 *            on day 9), on the curve the counts come from: the swarm made the right call with too
 *            small a number, since past its last bend a sum of ReLUs goes on as a straight line
 *   hump     (optional, the brief of step 3c) why a plain sum fits a curve like this one: every
 *            bend bends upward, so their sum bends upward; a curve with a hump needs the weighted
 *            sum of step 4
 * The flag lean drops the two optional clicks.
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS, Q = T.question;
  var el = {};

  function build(layer) {
    el.row = K.div('lab band-row vis', layer.mid);
    K.pos(el.row, G.band.x, (G.band.y1 + G.band.y2) / 2, 'cl');

    // the pictogram of the hump: four bends added up bend upward; a hump is out of reach
    var g = K.svg('g', null, layer.back, 'vis');
    el.hump = g;
    var x0 = G.band.x, y0 = G.band.y1 - 34, w = 58, h = 52, gap = 34;
    function glyph(x, d, cls) {
      var gg = K.svg('g', { transform: 'translate(' + x + ',' + y0 + ')' }, g, cls);
      K.svg('path', { d: 'M 0 ' + h + ' H ' + w }, gg, 'pict-axis');
      K.svg('path', { d: d }, gg, 'pict-line');
      return gg;
    }
    var x = x0;
    for (var j = 0; j < T.m; j++) {
      var k = 6 + j * 8;
      glyph(x, 'M 0 ' + (h - 2) + ' L ' + k + ' ' + (h - 2) + ' L ' + w + ' ' + (h - 2 - (w - k) * 0.8), 'bend n' + (j + 1));
      x += w;
      if (j < T.m - 1) { K.svg('text', { x: x + gap / 2, y: y0 + h / 2 + 8 }, g, 'pict-op').textContent = '+'; x += gap; }
    }
    K.svg('text', { x: x + gap / 2, y: y0 + h / 2 + 10 }, g, 'pict-op').textContent = '=';
    x += gap;
    glyph(x, 'M 0 ' + (h - 3) + ' C 24 ' + (h - 3) + ' 40 ' + (h - 10) + ' ' + w + ' 2', 'pict-sum');
    x += w + 70;
    var hump = glyph(x, 'M 0 ' + (h - 3) + ' C 16 2 42 2 ' + w + ' ' + (h - 3), 'pict-hump');
    K.svg('path', { d: 'M 6 6 L ' + (w - 6) + ' ' + (h - 6) + ' M ' + (w - 6) + ' 6 L 6 ' + (h - 6) }, hump, 'pict-cross');
  }

  function render(st) {
    var a = st.is('coda', 'answer'), tr = st.reached('coda', 'truth'), hu = st.is('coda', 'hump');
    K.show(el.row, a || st.is('coda', 'truth'));
    if (a) K.tex(el.row, '\\hat y(' + Q.x + ') = ' + M.fmt(M.curve(st.P, Q.x), 2) + ' > ' + Q.y);
    else if (tr) K.tex(el.row, '\\hat y(' + Q.x + ') = ' + M.fmt(M.curve(st.P, Q.x), 2) + '\\qquad y(' + Q.x + ') = ' + M.LATER.y[1]);
    K.show(el.hump, hu);
  }

  function plot(st, o) {
    if (!st.partReached('coda')) return;
    o.reading = { v: M.curve(st.P, Q.x), big: true };
    if (st.reached('coda', 'truth')) {
      o.later = true;
      o.truth = true;
      o.ymax = 170;
    }
  }

  function animate(st, prev) {
    var Pl = GF.plot.el;
    if (st.is('coda', 'answer')) {
      K.later(el.row, 300);
      K.pulse(Pl.read, 200);
      K.later(Pl.readBox2, 700);
    } else if (st.is('coda', 'truth')) {
      // the plot makes room up to 170 aphids, then the two later counts and their curve appear
      K.tween(900, function (e) {
        var o = { axes: true, points: true, question: true, bends: st.P, curve: st.P, marks: st.F.yhat, gaps: true,
                  reading: { v: M.curve(st.P, Q.x), big: true }, ymax: 125 + (170 - 125) * e };
        GF.plot.render(o);
      }, K.ease.inOut, function () {
        GF.plot.render({ axes: true, points: true, question: true, bends: st.P, curve: st.P, marks: st.F.yhat, gaps: true,
                         reading: { v: M.curve(st.P, Q.x), big: true }, later: true, truth: true, ymax: 170 });
        Pl.later.forEach(function (c, q) { K.temp(c, 'opacity', '0'); K.wait(200 + q * 500, function () { c.style.opacity = ''; K.pulse(c); }); });
        K.drawOn(Pl.trueCurve, 1200, 1100);
      });
    } else if (st.is('coda', 'hump')) {
      K.later(el.hump, 0);
    }
  }

  GF.parts.coda = {
    steps: function (iter, ctx) {
      if (iter !== ctx.K) return [];
      return ctx.lean ? ['answer'] : ['answer', 'truth', 'hump'];
    },
    build: build, render: render, plot: plot, animate: animate,
    el: el
  };
})();
