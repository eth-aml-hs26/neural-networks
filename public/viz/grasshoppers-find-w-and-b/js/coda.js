/* coda.js: the closing part, as GF.parts.coda. A PROPOSAL (see README.md): its two clicks come only
 * at the end of the iteration where the run settles, after the update. Both draw on the plot of y
 * against x (js/plot.js), which shows the six days and the hinge of the settled pair.
 *
 *   fit     the pair the grasshoppers found, beside its hinge, and the hinge's knot, the balance
 *           point -b / w = 15.18 degrees C: below it Lina's flat needs heat
 *   other   a second run, from another start (-1, 10): its hinge, dashed, starts low and swings
 *           onto the six days, onto the same hinge. Six days fix the two numbers; one day did not,
 *           and from this start it ended on a hinge that rises with the temperature.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function lab(layer, cls) { return K.div('lab vis ' + (cls || ''), layer); }

  function build(layer) {
    var defs = K.svg('defs', null, layer.back);
    var P = G.plot;
    var cp = K.svg('clipPath', { id: 'coda-clip' }, defs);
    K.svg('rect', { x: P.x0, y: P.top - 24, width: P.x1 - P.x0 + 16, height: P.oy - P.top + 24 }, cp);
    el.g = K.svg('g', null, layer.back, 'coda');
    var clipped = K.svg('g', { 'clip-path': 'url(#coda-clip)' }, el.g);
    el.start = K.svg('path', null, clipped, 'hinge other start vis');
    el.other = K.svg('path', null, clipped, 'hinge other vis');
    el.knot = K.svg('circle', { r: 6 }, el.g, 'knot-dot pt vis');
    el.knotLab = lab(layer.mid, 'knot-lab');
    el.labMine = lab(layer.mid, 'pair-lab');
    el.labOther = lab(layer.mid, 'pair-lab other');
  }

  function pairTex(p) {
    return '\\begin{aligned} w &= ' + M.fmt(p.w) + ' \\\\ b &= ' + M.fmt(p.b) + ' \\end{aligned}';
  }

  // The settled pair: the pair of the iteration where the run settles.
  function mine(st) { return { w: st.w, b: st.b }; }

  // The run of the second start, sampled for the swing: every iteration up to 12, then jumps of
  // 15 percent, as Play does, to where it settles.
  function otherRun(st) {
    var o = M.otherStart(st.w0, st.b0), K2 = M.settleAt(o.w, o.b, st.alpha);
    var ps = M.run(o.w, o.b, st.alpha, K2), out = [], k = 1;
    while (k < K2) { out.push(ps[k - 1]); k += k < 12 ? 1 : Math.ceil(k * 0.15); }
    out.push(ps[K2 - 1]);
    return { start: o, frames: out, end: ps[K2 - 1] };
  }

  // The pair's numbers sit in the empty top right of the plot, the only solid hinge their own.
  function placeMine() {
    K.pos(el.labMine, G.px(11), G.py(0.88 * G.plot.ymax), 'tl');
  }

  // The second start's numbers sit over the left end of its hinge, left of the found one.
  function placeOther(p) {
    var T = G.plot.xmin + 0.5;
    K.pos(el.labOther, G.px(T), G.py(M.relu(p.w * T + p.b)) - 12, 'bl');
  }

  function render(st) {
    var on = st.partReached('coda'), other = st.reached('coda', 'other');
    var p = mine(st), knot = -p.b / p.w;
    var kx = G.px(knot), oy = G.plot.oy;
    el.knot.setAttribute('cx', kx.toFixed(1));
    el.knot.setAttribute('cy', String(oy));
    K.tex(el.knotLab, '-b/w = ' + M.fmt(knot, 2) + '\\,{}^\\circ\\mathrm{C}');
    K.pos(el.knotLab, kx, oy + 36, 'tc');
    K.tex(el.labMine, pairTex(p));
    placeMine();
    [el.knot, el.knotLab, el.labMine].forEach(function (e) { K.show(e, on); });

    K.show(el.start, other);
    K.show(el.other, other);
    K.show(el.labOther, other);
    if (other) {
      var R = otherRun(st);
      el.start.setAttribute('d', GF.plot.hingePath(R.start.w, R.start.b));
      el.other.setAttribute('d', GF.plot.hingePath(R.end.w, R.end.b));
      K.tex(el.labOther, 'w = ' + M.fmt(R.start.w) + ',\\; b = ' + M.fmt(R.start.b));
      placeOther(R.start);
    }
  }

  function animate(st) {
    var P = GF.plot.el;
    if (st.is('coda', 'fit')) {
      K.pulse(P.line, 100);
      [el.knot, el.knotLab].forEach(function (e) { K.later(e, 900); });
      K.wait(950, function () { K.pulse(el.knot); });
      K.later(el.labMine, 400);
    } else if (st.is('coda', 'other')) {
      var R = otherRun(st), fr = R.frames;
      el.other.setAttribute('d', GF.plot.hingePath(R.start.w, R.start.b));
      K.temp(el.other, 'opacity', '0');
      K.drawOn(el.start, 900, 100);
      K.later(el.labOther, 700);
      K.wait(1300, function () {
        el.other.style.opacity = '';
        K.tween(2600, function (e) {
          var p = fr[Math.min(fr.length - 1, Math.floor(e * (fr.length - 1)))];
          el.other.setAttribute('d', GF.plot.hingePath(p.w, p.b));
        }, K.ease.inOut, function () {
          el.other.setAttribute('d', GF.plot.hingePath(R.end.w, R.end.b));
          K.pulse(P.line);
        });
      });
    }
  }

  GF.parts.coda = {
    steps: function (iter, ctx) { return ctx && iter === ctx.settle ? ['fit', 'other'] : []; },
    build: build, render: render, animate: animate,
    el: el
  };
})();
