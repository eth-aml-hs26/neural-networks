/* coda.js: the closing part, as GF.parts.coda. A PROPOSAL (see README.md): its two clicks come only
 * at the end of the iteration where the run settles, after the update.
 *
 *   fit     the energy against the temperature: the day as a point, x = 5 and y = 40, and the
 *           hinge yhat = ReLU(w x + b) of the pair the grasshoppers found, through the point
 *   other   a second hinge, the end of a run from another start (-1, 10): it fits the day just as
 *           exactly, and says that warmer days need more heat. One day cannot fix two numbers,
 *           which is why the next page takes every day.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function tx(T) { var C = G.coda; return C.x0 + (T - C.tlo) / (C.thi - C.tlo) * (C.x1 - C.x0); }
  function ey(E) { var C = G.coda; return C.oy - E / C.ehi * (C.oy - C.ytop); }

  function lab(layer, cls) { return K.div('lab vis ' + (cls || ''), layer); }

  function build(layer) {
    var C = G.coda;
    var defs = K.svg('defs', null, layer.back);
    var cp = K.svg('clipPath', { id: 'coda-clip' }, defs);
    K.svg('rect', { x: C.x0, y: C.yend + 8, width: C.x1 - C.x0 + 20, height: C.oy - C.yend - 8 }, cp);

    el.g = K.svg('g', null, layer.back, 'coda vis');
    el.axX = K.arrow(el.g, [[C.ox - 12, C.oy], [C.xend, C.oy]], 'axis on', { size: 13 });
    el.axY = K.arrow(el.g, [[C.ox, C.oy + 12], [C.ox, C.yend]], 'axis on', { size: 13 });
    var clipped = K.svg('g', { 'clip-path': 'url(#coda-clip)' }, el.g);
    el.guideV = K.svg('path', null, clipped, 'guide');
    el.guideH = K.svg('path', null, clipped, 'guide');
    el.mine = K.svg('path', null, clipped, 'hinge vis');
    el.other = K.svg('path', null, clipped, 'hinge other vis');
    el.point = K.svg('circle', { r: 9 }, el.g, 'point');

    // the letters and numbers of the axes, in one box that shows and hides them together
    el.box = K.div('coda-box vis', layer.mid);
    el.labX = K.div('lab axis-lab', el.box);
    K.tex(el.labX, 'x');
    K.pos(el.labX, C.xend + 10, C.oy, 'cl');
    el.labY = K.div('lab axis-lab', el.box);
    K.tex(el.labY, 'y');
    K.pos(el.labY, C.ox, C.yend - 6, 'bc');
    el.tickX = K.div('lab tick', el.box);
    K.tex(el.tickX, String(M.X));
    K.pos(el.tickX, tx(M.X), C.oy + 12, 'tc');
    el.tickY = K.div('lab tick', el.box);
    K.tex(el.tickY, String(M.Y));
    K.pos(el.tickY, C.ox - 12, ey(M.Y), 'cr');
    el.labMine = lab(layer.mid, 'pair-lab');
    el.labOther = lab(layer.mid, 'pair-lab other');
  }

  function hinge(w, b) {
    var C = G.coda, d = '', n = 120;
    for (var i = 0; i <= n; i++) {
      var T = C.tlo + (C.thi - C.tlo) * i / n;
      d += (i ? ' L ' : 'M ') + tx(T).toFixed(1) + ' ' + Math.max(-2000, ey(M.relu(w * T + b))).toFixed(1);
    }
    return d;
  }

  function pairTex(p) {
    return '\\begin{aligned} w &= ' + M.fmt(p.w) + ' \\\\ b &= ' + M.fmt(p.b) + ' \\end{aligned}';
  }

  // A hinge's two numbers go just right of its line, clear of it down to their lower row: a
  // falling line at 30 percent of the height, a rising one at 75 percent, a nearly flat one at
  // 12 degrees C.
  function placeLabel(div, p) {
    var C = G.coda, T, E, rows = 0.13 * C.ehi;
    if (p.w < -0.3) { E = 0.3 * C.ehi; T = (E - rows - p.b) / p.w; }
    else if (p.w > 0.3) { E = 0.75 * C.ehi; T = (E - p.b) / p.w; }
    else { T = 12; E = Math.min(M.relu(p.w * T + p.b) + 8 + rows, C.ehi * 0.9); }
    T = Math.max(C.tlo, Math.min(C.thi - 8, T));
    K.pos(div, tx(T) + 18, ey(E), 'tl');
  }

  function render(st) {
    var on = st.partReached('coda');
    var other = st.reached('coda', 'other');
    var mine = { w: st.wNext, b: st.bNext };
    var o = M.otherPair(mine.w, mine.b).end;
    K.show(el.g, on);
    K.show(el.box, on);
    K.show(el.mine, on);
    K.show(el.labMine, on);
    K.show(el.other, other);
    K.show(el.labOther, other);
    el.mine.setAttribute('d', hinge(mine.w, mine.b));
    el.other.setAttribute('d', hinge(o.w, o.b));
    K.tex(el.labMine, pairTex(mine));
    K.tex(el.labOther, pairTex(o));
    placeLabel(el.labMine, mine);
    placeLabel(el.labOther, o);
    var px = tx(M.X), py = ey(M.Y), C = G.coda;
    el.point.setAttribute('cx', px.toFixed(1));
    el.point.setAttribute('cy', py.toFixed(1));
    el.guideV.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' L ' + px.toFixed(1) + ' ' + C.oy);
    el.guideH.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' L ' + C.ox + ' ' + py.toFixed(1));
  }

  function animate(st) {
    var bl = GF.parts.black.el;
    if (st.is('coda', 'fit')) {
      K.drawArrow(el.axX, 500, 0);
      K.drawArrow(el.axY, 500, 0);
      [el.point, el.guideV, el.guideH, el.tickX, el.tickY, el.mine, el.labMine].forEach(function (e) { K.temp(e, 'opacity', '0'); });
      K.wait(450, function () {
        K.flyTex(String(M.X), K.rect(bl.x.val), K.rect(el.tickX), 900, 'k-black', null, 23);
        K.flyTex(String(M.Y), K.rect(bl.y.val), K.rect(el.tickY), 900, 'k-black', null, 23);
      });
      K.wait(1350, function () {
        [el.tickX, el.tickY, el.guideV, el.guideH].forEach(function (e) { e.style.opacity = ''; });
        el.point.style.opacity = '';
        K.pulse(el.point);
      });
      K.wait(1900, function () { el.mine.style.opacity = ''; K.drawOn(el.mine, 1500, 0); });
      K.wait(3300, function () { el.labMine.style.opacity = ''; });
    } else if (st.is('coda', 'other')) {
      K.drawOn(el.other, 1600, 100);
      K.later(el.labOther, 1600);
      K.wait(1800, function () { K.pulse(el.point); });
    }
  }

  GF.parts.coda = {
    steps: function (iter, ctx) { return ctx && iter === ctx.settle ? ['fit', 'other'] : []; },
    build: build, render: render, animate: animate,
    el: el
  };
})();
