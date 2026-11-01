/* red.js: the red part, the forward pass and the grounds, as GF.parts.red.
 *
 * Iteration 1, one click each:
 *   loop    the red loop round w, b, a, the ReLU, yhat, l and lbar: one pair gives one number lbar
 *   gw      the ground of grasshopper w: lbar against w, b held where it stands; w and lbar fly
 *           from their boxes to its axes, the point, then the whole curve
 *   gb      the same for grasshopper b, w held where it stands
 * Iteration 2 on, one click:
 *   plot    the loop glows, the two grounds come back with the new pair; b's ground has moved,
 *           since w has moved
 * The grounds themselves are drawn by js/ground.js; while they show, the plot of y against x gives
 * way, and it comes back when the purple part starts. The loop stays.
 */
(function () {
  'use strict';
  var K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function build(layer) {
    el.loop = K.svg('path', { d: K.closedSpline(G.loop, 1) }, layer.back, 'loop vis');
    el.fwd = K.div('word vis', layer.mid);
    el.fwd.textContent = 'forward pass';
    K.pos(el.fwd, G.label.forward[0], G.label.forward[1], G.label.forward[2]);
  }

  function render(st) {
    var on = st.part !== 'story' && (st.iter > 1 || st.reached('red', 'loop'));
    K.show(el.loop, on);
    K.show(el.fwd, on);
  }

  function animate(st) {
    if (st.is('red', 'loop')) {
      K.drawOn(el.loop, 1300, 0);
      K.later(el.fwd, 1100);
    } else if (st.is('red', 'plot')) {
      K.pulse(el.loop, 0);
    }
  }

  GF.parts.red = {
    steps: function (iter) { return iter === 1 ? ['loop', 'gw', 'gb'] : ['plot']; },
    build: build, render: render, animate: animate,
    el: el
  };
})();
