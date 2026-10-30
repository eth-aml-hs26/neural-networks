/* blue.js: the blue part, the two grasshoppers measure their slopes, as GF.parts.blue.
 *
 * Each grasshopper in turn hops on its own number while the other stands still: w in full, then b
 * in fewer clicks, since the room has just seen how it goes.
 *
 * Iteration 1, one click each:
 *   onw     grasshopper w jumps from its box onto its ground, and the ground is magnified around
 *           its feet until it is a straight ramp
 *   hopw    it hops eps along the w axis: its box shows w + eps = -0.99, in blue
 *   fwdw    the forward pass of the hop: a, yhat and the loss of (w + eps, b) fly through the boxes,
 *           in blue (the loss 226.5025); the grasshopper rises to the ground, Delta_eps = 1.5025
 *   slopew  the slope Delta_eps / eps = 1.5025 / 0.01 = 150.25
 *   limw    eps goes to 0: the slope tends to the derivative, dl/dw = 150; the hop was a test, so
 *           the grasshopper goes back to its point and the boxes show the pair again
 *   hopb    grasshopper b does all of that at once: onto its ground, the zoom, the hop to
 *           b + eps = 60.01, the forward pass (225.3001), the rise Delta_eps = 0.3001
 *   slopeb  its slope 30.01, then the limit, dl/db = 30
 * Iteration 2 on, one click:
 *   measure both grasshoppers measure at once
 *
 * What these clicks show is drawn by js/ground.js (the grounds, the hops, the slopes) and by
 * js/black.js (the boxes during a hop, from st.hop); this part only names the clicks.
 */
(function () {
  'use strict';
  var GF = window.GF;

  GF.parts.blue = {
    steps: function (iter) {
      return iter === 1 ? ['onw', 'hopw', 'fwdw', 'slopew', 'limw', 'hopb', 'slopeb'] : ['measure'];
    }
  };
})();
