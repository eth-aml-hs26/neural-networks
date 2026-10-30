/* purple.js: the purple part, the backward pass and the jump, as GF.parts.purple.
 *
 * Iteration 1, one click each (speeds 1 and 2):
 *   clear     the plot, the magnified view and the blue arithmetic go; the blue line that ends in
 *             dl/dw = 187 stays where it is; the grasshopper jumps back onto the box of w
 *   grad      an arrow from the loss up to a new box dl/dw; the 187 moves from the blue line into it
 *   back      the arrow of the backward pass, from dl/dw back to w
 *   backward  the backward pass: a purple band, a broad arrow from the loss through dl/dw to w
 *   formula   the update w <- w - alpha dl/dw, and alpha
 *   update    w, alpha and dl/dw fly into it and the new w comes out; the box of w keeps the old one
 *   decide    the plot comes back; the grasshopper jumps onto its point, the tangent (blue) shows
 *             the slope; it thinks it over (as on the BMAI page), turns down the slope, and an arrow
 *             grows the way it will jump, as long as the step alpha dl/dw
 *   jump      it jumps that way and lands on the curve at the new w, which flies into the box of w
 * Iteration 2 on, three clicks (speeds 1 and 2):
 *   grad      clear, grad, back, backward and formula at once
 *   update    as above
 *   jump      decide and jump at once
 * Speed 3, one click per iteration:
 *   hop       the plot zooms to this iteration, the grasshopper decides and jumps, the new w flies
 *             into its box
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  // where the two rows of the update formula sit, over the purple band: both start at ROW_X, so
  // their "w <-" line up
  var ROW_X = 318, ROW1_Y = 100, ROW2_Y = 160, ALPHA_AT = [640, 100];
  var TAN = 120;            // half the length of the tangent on the plot, in pixels
  var WAY_UP = 80;          // the arrow of the jump runs this far above the grasshopper's feet

  function build(layer) {
    el.band = K.band(GF.under, G.pass.backward, 'gf-pass-backward', 'k-purple');

    var b = G.box.grad;
    el.box = K.div('box vis', layer.mid);
    el.box.style.left = b.x + 'px';
    el.box.style.top = b.y + 'px';
    el.box.style.width = b.w + 'px';
    el.box.style.height = b.h + 'px';
    el.calc = K.div('calc', el.box);
    el.val = K.div('val', el.box);
    el.unit = K.div('unit', el.box);

    el.lab = K.div('lab vis', layer.mid);
    K.tex(el.lab, '\\dfrac{\\partial \\ell}{\\partial w}');
    K.pos(el.lab, G.label.grad[0], G.label.grad[1], G.label.grad[2]);

    el.aUp = K.arrow(layer.back, G.route.l2grad, '');
    el.aBack = K.arrow(layer.back, G.route.back, 'back', { r: 22, size: 17 });

    el.word = K.div('word vis', layer.mid);
    el.word.textContent = 'backward pass';
    K.pos(el.word, G.label.backward[0], G.label.backward[1], G.label.backward[2]);

    el.row1 = K.div('lab update-row vis', layer.mid);
    K.tex(el.row1, 'w \\;\\leftarrow\\; w - \\alpha\\,\\dfrac{\\partial \\ell}{\\partial w}');
    K.pos(el.row1, ROW_X, ROW1_Y, 'cl');

    el.alpha = K.div('lab alpha-lab vis', layer.mid);
    K.pos(el.alpha, ALPHA_AT[0], ALPHA_AT[1], 'cl');

    el.row2 = K.div('lab update-row numbers vis', layer.mid);
    K.pos(el.row2, ROW_X, ROW2_Y, 'cl');

    // on the plot: the tangent (in blue: the slope the grasshopper measured), the arrow of the
    // way it picks, and its thoughts
    el.onPlot = K.svg('g', { 'clip-path': 'url(#gf-plot-clip)' }, layer.back);
    el.tan = K.svg('path', null, el.onPlot, 'tangent k-blue vis');
    el.way = K.arrow(layer.back, [[0, 0], [1, 0]], 'way', { size: 22 });
    el.thoughts = [3.5, 5, 7].map(function (r) { return K.svg('circle', { r: r }, layer.front, 'thought vis'); });
  }

  // ===== what shows when

  function later(st) { return st.iter > 1; }
  function R(st, name) { return st.reached('purple', name); }

  function render(st) {
    var m3 = st.mode === 3, L = later(st), on = st.partReached('purple') && !m3;
    var grad = on && (L || R(st, 'grad'));
    var back = on && (L || R(st, 'back'));
    var band = on && (L || R(st, 'backward'));
    var formula = on && (L || R(st, 'formula'));
    var upd = on && R(st, 'update');
    var g = M.dloss(st.w);

    K.show(el.band.g, band); K.show(el.word, band);
    K.show(el.box, grad); K.show(el.lab, grad); K.show(el.aUp.g, grad);
    K.tex(el.val, M.fmt(g));
    K.fit(el.val, G.box.grad.w - 16);
    K.show(el.aBack.g, back);
    K.show(el.row1, formula); K.show(el.alpha, formula);
    K.tex(el.alpha, '\\alpha = ' + M.fmt(st.alpha, 6));

    K.show(el.row2, upd);
    K.row(el.row2, [
      { key: 'lhs', tex: 'w \\;\\leftarrow\\;' },
      { key: 'w', tex: M.wrap(st.w) },
      { key: 'm', tex: '-' },
      { key: 'a', tex: M.fmt(st.alpha, 6) },
      { key: 't', tex: '\\times' },
      { key: 'g', tex: M.wrap(g) },
      { key: 'eq', tex: '=' },
      { key: 'r', tex: M.fmt(st.wNext) }
    ]);

    // the decision and the jump on the plot, from the decision until the next iteration
    var decided = R(st, 'decide') || st.jumped;
    var geo = wayGeo(st);
    K.show(el.tan, decided);
    K.show(el.way.g, decided && geo.long);
    el.tan.setAttribute('d', geo.tan);
    K.setArrow(el.way, geo.way);
    el.thoughts.forEach(function (c, i) {
      K.show(c, false);
      c.setAttribute('cx', (geo.P.x + [12, 22, 36][i]).toFixed(1));
      c.setAttribute('cy', (geo.P.y - [38, 54, 76][i]).toFixed(1));
    });
  }

  // The point the grasshopper decides at (w), where it lands (wNext), the tangent through the
  // point and the arrow of the way, above it, as long as the step.
  function wayGeo(st) {
    var w = st.w, P = { x: G.wx(w), y: G.ly(M.loss(w)) }, Q = { x: G.wx(st.wNext), y: G.ly(M.loss(st.wNext)) };
    var p = G.plot;
    var k = -M.dloss(w) * ((p.oy - p.ytop) / p.lmax) / ((p.x1 - p.x0) / (p.whi - p.wlo));   // pixels down per pixel across
    var c = TAN / Math.sqrt(1 + k * k);
    var tan = 'M ' + (P.x - c).toFixed(1) + ' ' + (P.y - k * c).toFixed(1) + ' L ' + (P.x + c).toFixed(1) + ' ' + (P.y + k * c).toFixed(1);
    var y = P.y - WAY_UP, dir = Q.x < P.x ? -1 : 1;
    return {
      P: P, Q: Q, dir: dir, tan: tan,
      way: [[P.x + dir * 8, y], [Q.x, y]],
      long: Math.abs(Q.x - P.x) >= 22
    };
  }

  // ===== animation

  // The grasshopper jumps from wherever it was back onto the box of w.
  function jumpHome(st, delay) {
    var h = GF.hopper.main, home = GF.hopper.perchPose(), from = st.hopFrom;
    if (!from || (Math.abs(from.x - home.x) < 1 && Math.abs(from.y - home.y) < 1)) return;
    h.setPose(from);
    K.wait(delay || 0, function () { GF.hopper.jump(h, home, 1000, 140); });
  }

  // The arrow from the loss grows, the box opens, and the value the blue part found moves down
  // into it from the blue line (whose rest fades as blue's render hides it).
  function showGrad(st, delay) {
    K.drawArrow(el.aUp, 500, delay);
    K.later(el.box, delay + 250);
    K.later(el.lab, delay + 400);
    K.temp(el.val, 'opacity', '0');
    var blue = GF.parts.blue && GF.parts.blue.el, src = blue && blue.derivVal;
    function land() { el.val.style.opacity = ''; K.flash(el.val); }
    if (!src || !src.getBoundingClientRect().width) { K.wait(delay + 700, land); return; }
    var from = K.rect(src);
    K.temp(src, 'visibility', 'hidden');
    K.wait(delay, function () {
      K.flyTex(M.fmt(M.dloss(st.w)), from, K.rect(el.val), 1100, 'k-blue', land, 30);
    });
  }

  function showBack(delay) {
    K.drawArrow(el.aBack, 1100, delay);
  }

  function showBand(delay) {
    K.revealBand(el.band, 1300, delay);
    K.later(el.word, delay + 1100);
  }

  // w, alpha and dl/dw fly into the numbers row; the new w comes out. The box of w keeps the old w
  // until the jump.
  function update(st, delay) {
    var bl = GF.parts.black.el, sp = el.row2.__spans || {};
    ['lhs', 'w', 'm', 'a', 't', 'g', 'eq', 'r'].forEach(function (k) { if (sp[k]) K.temp(sp[k], 'opacity', '0'); });
    K.wait(delay, function () {
      ['lhs', 'm', 't'].forEach(function (k) { sp[k].style.opacity = ''; });
      var flights = [
        { src: M.wrap(st.w), from: bl.w.val, key: 'w' },
        { src: M.fmt(st.alpha, 6), from: el.alpha, key: 'a' },
        { src: M.wrap(M.dloss(st.w)), from: el.val, key: 'g' }
      ];
      var left = flights.length;
      flights.forEach(function (f, i) {
        K.wait(i * 220, function () {
          K.flyTex(f.src, K.rect(f.from), K.rect(sp[f.key]), 800, 'k-purple', function () {
            sp[f.key].style.opacity = '';
            if (--left > 0) return;
            K.wait(300, function () {
              sp.eq.style.opacity = '';
              sp.r.style.opacity = '';
              K.flash(sp.r);
            });
          }, 24);
        });
      });
    });
  }

  // The decision, as on the BMAI page: the grasshopper (on its point) looks at the tangent, a
  // thought rises, it looks back and ahead, the tangent pulses, it turns down the slope and the
  // arrow grows. fast: the short version of later iterations. At speed 3 it only draws the tangent,
  // turns and points the way. Returns when it ends.
  function decide(st, delay, fast) {
    var h = GF.hopper.main, g = wayGeo(st), s = GF.hopper.PLOT_SCALE, k = fast ? 0.55 : 1;
    var pose = function (f) { return { x: g.P.x, y: g.P.y, a: 0, s: s, f: f }; };
    K.temp(el.tan, 'opacity', '0');
    K.temp(el.way.g, 'opacity', '0');
    if (st.mode === 3) {
      K.wait(delay, function () { el.tan.style.opacity = ''; K.drawOn(el.tan, 280, 0); });
      K.wait(delay + 300, function () { h.setPose(pose(g.dir)); });
      if (g.long) {
        K.wait(delay + 300, function () { el.way.g.style.opacity = ''; });
        K.drawArrow(el.way, 320, delay + 300);
      }
      return delay + 680;
    }
    K.wait(delay, function () { el.tan.style.opacity = ''; K.drawOn(el.tan, 600 * k, 0); });
    var t = delay + 700 * k;
    el.thoughts.forEach(function (c, i) {
      K.wait(t + i * 170 * k, function () { K.tempClass(c, 'on'); });
      K.wait(t + 1500 * k, function () { c.classList.remove('on'); });
    });
    K.wait(t + 550 * k, function () { h.setPose(pose(-1)); });
    K.wait(t + 900 * k, function () { h.setPose(pose(1)); K.pulse(el.tan); });
    K.wait(t + 1350 * k, function () { h.setPose(pose(g.dir)); });
    var t2 = t + 1600 * k;
    if (g.long) {
      K.wait(t2, function () { el.way.g.style.opacity = ''; });
      K.drawArrow(el.way, 550 * k, t2);
    }
    return t2 + 600 * k;
  }

  // The jump down the way it picked, onto the curve at the new w. The red point and its numbers
  // wait for the landing; then the new w flies into the box of w (from the update's result, or at
  // speed 3 from the red number under the plot) and the backward arrow pulses.
  function jump(st, delay) {
    var h = GF.hopper.main, g = wayGeo(st), bl = GF.parts.black.el, red = GF.parts.red.el;
    var to = GF.engine.plotPose(st.wNext);
    to.f = g.dir;
    var lift = 50 + 0.3 * Math.abs(g.Q.x - g.P.x);
    // gone at once (no fade, which would show the new numbers before the jump), back as it lands
    var marks = [red.point, red.guideV, red.guideH, red.tickW, red.tickL];
    marks.forEach(function (e) { K.temp(e, 'transition', 'none'); K.temp(e, 'opacity', '0'); });
    K.tex(bl.w.val, M.fmt(st.w));
    var quick = st.mode === 3;
    K.wait(delay, function () {
      if (g.long) K.pulse(el.way.line);
      GF.hopper.jump(h, to, quick ? 750 : 950, lift, function () {
        marks.forEach(function (e) { e.style.transition = ''; e.style.opacity = ''; });
        K.pulse(red.point);
        var sp = el.row2.__spans || {};
        var src = st.mode === 3 || !sp.r ? red.tickW : sp.r;
        if (st.mode !== 3) K.pulse(el.aBack.line);
        K.flyTex(M.fmt(st.wNext), K.rect(src), K.rect(bl.w.val), quick ? 600 : 900, 'k-purple', function () {
          K.tex(bl.w.val, M.fmt(st.wNext));
          K.flash(bl.w.val);
        }, 30);
      });
    });
  }

  // The grasshopper reaches its point on the plot: from the box of w (it sat there while the
  // backward pass was worked out), or, the first time at speed 3, dropping in from above.
  function toPlot(st, delay) {
    var h = GF.hopper.main, P = GF.engine.plotPose(st.w), from = st.hopFrom;
    if (!from || !GF.hopper.main.g.classList.contains('on')) return 0;
    // at speed 3 it stays on the plot from one hop to the next (the zoom carries it)
    if (st.mode === 3 && st.iter > 1) return delay;
    if (st.mode === 3 && st.iter === 1) {
      h.place(P.x, P.y - 140, 0, P.s, 1);
      K.temp(h.g, 'opacity', '0');
      K.wait(delay, function () {
        h.g.style.opacity = '';
        K.tween(600, function (t) { h.place(P.x, P.y - 140 * (1 - t), 0, P.s, 1); }, K.ease.out);
      });
      return delay + 650;
    }
    if (Math.abs(from.x - P.x) < 1 && Math.abs(from.y - P.y) < 1) return delay;
    h.setPose(from);
    K.wait(delay, function () { GF.hopper.jump(h, P, 950, 150); });
    return delay + 1000;
  }

  // The positions of the decision and the jump are those of this iteration's view, even while
  // red's zoom (which ran before) still shows the view of the click before.
  function animate(st) {
    var shown = { wlo: G.plot.wlo, whi: G.plot.whi, lmax: G.plot.lmax };
    G.setView(st.view);
    schedule(st);
    G.setView(shown);
  }

  function schedule(st) {
    var L = later(st);
    if (st.is('purple', 'clear')) {
      jumpHome(st, 0);
    } else if (st.is('purple', 'grad') && !L) {
      showGrad(st, 0);
    } else if (st.is('purple', 'grad') && L) {
      jumpHome(st, 0);
      showGrad(st, 0);
      showBack(1200);
      showBand(1900);
      K.later(el.row1, 3100);
      K.later(el.alpha, 3300);
    } else if (st.is('purple', 'back')) {
      showBack(0);
    } else if (st.is('purple', 'backward')) {
      showBand(0);
    } else if (st.is('purple', 'formula')) {
      K.later(el.alpha, 500);
    } else if (st.is('purple', 'update')) {
      update(st, 100);
    } else if (st.is('purple', 'decide')) {
      decide(st, toPlot(st, 300) + 200, false);
    } else if (st.is('purple', 'jump') && !L) {
      jump(st, 100);
    } else if (st.is('purple', 'jump') && L) {
      jump(st, decide(st, toPlot(st, 300) + 150, true) + 100);
    } else if (st.is('purple', 'hop')) {
      var t0 = st.zoomFrom ? G.zoomMs(st.mode) + 80 : 80;
      jump(st, decide(st, toPlot(st, t0), true) + 50);
    }
  }

  GF.parts.purple = {
    steps: function (iter, mode) {
      if (mode === 3) return ['hop'];
      return iter === 1 ? ['clear', 'grad', 'back', 'backward', 'formula', 'update', 'decide', 'jump'] : ['grad', 'update', 'jump'];
    },
    order: function (iter) {
      return iter === 1 ? ['clear', 'grad', 'back', 'backward', 'formula', 'update', 'decide', 'jump', 'hop'] : ['grad', 'update', 'jump', 'hop'];
    },
    build: build, render: render, animate: animate,
    el: el
  };
})();
