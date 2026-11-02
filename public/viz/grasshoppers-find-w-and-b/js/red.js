/* red.js: the red part, the forward pass and the grounds, as GF.parts.red.
 *
 * Iteration 1, one click each:
 *   forward the forward pass: a red band, a broad arrow from w and b down through a, the ReLU, yhat
 *           and l to its head past lbar, flows in from its tail to its head: one pair gives one
 *           number lbar (the band of the page before, asked for on 2 November 2026 in place of a
 *           hand-drawn loop)
 *   gw      the ground of grasshopper w: lbar against w, b held where it stands; w and lbar fly
 *           from their boxes to its axes, the point, then the whole curve
 *   gb      the same for grasshopper b, w held where it stands
 * Iteration 2 on, one click:
 *   plot    the band glows, the two grounds come back with the new pair; b's ground has moved,
 *           since w has moved
 * At speed 3 (the jumps only) iteration 1 has the click forward alone and later iterations none.
 * The grounds themselves are drawn by js/ground.js; while they show, the plot of y against x gives
 * way, and it comes back when the purple part starts. The band stays.
 */
(function () {
  'use strict';
  var K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function build(layer) {
    // under everything (GF.under), so every box, arrow and number sits on it
    el.band = K.band(GF.under, G.pass.forward, 'gfwb-pass-forward', 'k-red');
    el.fwd = K.div('word vis', layer.mid);
    el.fwd.textContent = 'forward pass';
    K.pos(el.fwd, G.label.forward[0], G.label.forward[1], G.label.forward[2]);
  }

  function bandOn(st) {
    return st.part !== 'story' && (st.iter > 1 || st.reached('red', 'forward'));
  }

  function render(st) {
    var on = bandOn(st);
    K.show(el.band.g, on);
    K.show(el.fwd, on);
  }

  function animate(st) {
    if (st.is('red', 'forward')) {
      K.revealBand(el.band, 1300, 0);
      K.later(el.fwd, 1100);
    } else if (st.is('red', 'plot')) {
      K.pulse(el.band.g, 0);
    }
  }

  GF.parts.red = {
    steps: function (iter, ctx) {
      var mode = ctx && ctx.mode || 1;
      if (iter === 1) return mode === 3 ? ['forward'] : ['forward', 'gw', 'gb'];
      return mode === 3 ? [] : ['plot'];
    },
    build: build, render: render, animate: animate, bandOn: bandOn,
    el: el
  };
})();
