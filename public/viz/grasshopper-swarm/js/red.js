/* red.js: the red part, the forward pass, as GF.parts.red.
 *
 * Iteration 1, one click (every speed):
 *   forward  the forward pass: a red band, a broad arrow round w and b, down into A and along
 *            through Z, yhat and l to its head past lbar, flows in from its tail to its head: one
 *            set of eight numbers gives one number lbar, whatever the number of days and neurons
 * Iteration 2 on, no click of its own: the band flows in again while the new numbers flow (black
 * recompute; at speed 3, black jump).
 *
 * The band is step 0's (../grasshopper-finds-w/, `pass` in its js/layout.js, `K.band` in its
 * js/kit.js), asked for by Carlos on 2 November 2026 in place of the hand-drawn loop: "a solid red
 * arrow, because right now it's like some sketchy red encircling". Its shape is GF.geo.passForward.
 * It stays from its click on, as the loop did, and goes only in the story.
 */
(function () {
  'use strict';
  var K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function build(layer) {
    el.band = K.band(GF.under, G.passForward(), 'swarm-pass-forward', 'k-red');
    el.word = K.div('word vis', layer.mid);
    el.word.textContent = 'forward pass';
    K.pos(el.word, G.label.forward[0], G.label.forward[1], G.label.forward[2]);
  }

  function on(st) { return st.part !== 'story' && (st.iter > 1 || st.reached('red', 'forward')); }

  function render(st) {
    K.show(el.band.g, on(st));
    K.show(el.word, on(st));
  }

  function animate(st) {
    if (st.is('red', 'forward')) {
      K.revealBand(el.band, 1400, 0);
      K.later(el.word, 1200);
    } else if (st.is('black', 'recompute') || st.is('black', 'jump')) {
      // the new numbers run left to right (black.js, 4 waves of 320 ms): the band runs with them
      K.revealBand(el.band, st.is('black', 'jump') ? 700 : 1300, 0);
    }
  }

  GF.parts.red = {
    steps: function (iter) { return iter === 1 ? ['forward'] : []; },
    build: build, render: render, animate: animate,
    el: el
  };
})();
