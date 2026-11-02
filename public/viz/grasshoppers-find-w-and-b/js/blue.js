/* blue.js: the blue part, the two grasshoppers measure their slopes, as GF.parts.blue.
 *
 * Each grasshopper in turn hops on its own number while the other stands still: w in full, then b
 * in fewer clicks, since the room has just seen how it goes.
 *
 * Iteration 1, one click each:
 *   onw     grasshopper w jumps from its box onto its ground, and the ground is magnified around
 *           its feet until it is a straight ramp
 *   hopw    it hops eps along the w axis: its box shows w + eps = -0.99, in blue
 *   fwdw    the forward pass of the hop: the columns a, yhat and l turn to the numbers of
 *           (w + eps, b), in blue where they change, and lbar to 805.7825; the grasshopper rises to
 *           the ground, Delta_eps = 6.2825
 *   slopew  the slope Delta_eps / eps = 6.2825 / 0.01 = 628.25
 *   limw    eps goes to 0: the slope tends to the derivative, dlbar/dw = 627; the hop was a test,
 *           so the grasshopper goes back to its point and the columns show the pair again
 *   hopb    grasshopper b does all of that at once: onto its ground, the zoom, the hop to
 *           b + eps = 60.01, the forward pass (lbar = 799.9501), the rise Delta_eps = 0.4501
 *   slopeb  its slope 45.01, then the limit, dlbar/db = 45
 * Iteration 2 on, one click:
 *   measure both grasshoppers measure at once
 * At speed 2 (quick, Play with two triangles), one click in every iteration:
 *   direct  both grasshoppers jump onto their grounds, each ground gets its tangent at the point,
 *           and the derivative is written over it straight away, without a hop (2 November 2026)
 * At speed 3 (the jumps only) there is no blue part.
 *
 * What these clicks show is drawn by js/ground.js (the grounds, the hops, the slopes) and by
 * js/black.js (the columns during a hop, from st.hop); this part only names the clicks.
 */
(function () {
  'use strict';
  var GF = window.GF;

  GF.parts.blue = {
    steps: function (iter, ctx) {
      var mode = ctx && ctx.mode || 1;
      if (mode === 3) return [];
      if (mode === 2) return ['direct'];
      return iter === 1 ? ['onw', 'hopw', 'fwdw', 'slopew', 'limw', 'hopb', 'slopeb'] : ['measure'];
    }
  };
})();
