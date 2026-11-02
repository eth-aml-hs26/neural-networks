/* red.js: the red part, the forward pass, as GF.parts.red.
 *
 * Iteration 1, one click:
 *   loop    the forward pass: a red band, a broad arrow from w and b through the columns a, yhat
 *           and l to lbar, its head past lbar, flows in from its tail to its head: one pair (w, b)
 *           gives one number lbar, whatever the number of days
 * Iteration 2 on, no click of its own: the band flows in again while the new numbers flow (black
 * recompute).
 *
 * The band is step 0's (../grasshopper-finds-w/, its red.js and K.band), asked for by Carlos on
 * 2 November 2026 in place of the hand-drawn loop of this page. As in step 0, it goes once the blue
 * part starts: forward, then backward.
 */
(function () {
  'use strict';
  var K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = {};

  function build(layer) {
    el.band = K.band(GF.under || layer.back, G.pass.forward, 'gf-pass-forward', 'k-red');
    el.word = K.div('word vis', layer.mid);
    el.word.textContent = 'forward pass';
    K.pos(el.word, G.label.forward[0], G.label.forward[1], G.label.forward[2]);
  }

  // The band shows from its click on (in later iterations from the first click), until the blue
  // part starts.
  function bandOn(st) {
    var mine = st.iter > 1 ? st.idx > 0 : st.reached('red', 'loop');
    return mine && !st.partReached('blue') && !st.partReached('purple');
  }

  function render(st) {
    var on = bandOn(st);
    K.show(el.band.g, on);
    K.show(el.word, on);
  }

  function animate(st) {
    if (st.is('red', 'loop')) {
      K.revealBand(el.band, 1400, 0);
      K.later(el.word, 1200);
    } else if (st.is('black', 'recompute')) {
      K.revealBand(el.band, 900, 0);
      K.later(el.word, 700);
    }
  }

  GF.parts.red = {
    steps: function (iter) { return iter === 1 ? ['loop'] : []; },
    build: build, render: render, animate: animate,
    bandOn: bandOn,
    el: el
  };
})();
