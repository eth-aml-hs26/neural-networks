/* red.js: the red part, the forward pass, as GF.parts.red.
 *
 * Iteration 1, one click:
 *   loop    the red loop round w, b, A, Z, yhat, l and lbar: one set of eight numbers gives one
 *           number lbar, whatever the number of days and neurons
 * Iteration 2 on, no click of its own: the loop glows while the new numbers flow (black recompute).
 */
(function () {
  'use strict';
  var K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function build(layer) {
    el.loop = K.svg('path', { d: K.closedSpline(G.loopPts(), 1) }, layer.back, 'loop vis');
    el.word = K.div('word vis', layer.mid);
    el.word.textContent = 'forward pass';
    K.pos(el.word, G.label.forward[0], G.label.forward[1], G.label.forward[2]);
  }

  function render(st) {
    var on = st.part !== 'story' && (st.iter > 1 || st.reached('red', 'loop'));
    K.show(el.loop, on);
    K.show(el.word, on);
  }

  function animate(st) {
    if (st.is('red', 'loop')) {
      K.drawOn(el.loop, 1400, 0);
      K.later(el.word, 1200);
    } else if (st.is('black', 'recompute')) {
      K.pulse(el.loop, 0);
    }
  }

  GF.parts.red = {
    steps: function (iter) { return iter === 1 ? ['loop'] : []; },
    build: build, render: render, animate: animate,
    el: el
  };
})();
