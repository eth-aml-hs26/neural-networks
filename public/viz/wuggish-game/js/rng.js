/* rng.js : a small seeded random generator (mulberry32) so that a run can be
 * reproduced from the lectern with ?seed=NNN.  Without a seed the clock
 * seeds it and every play is different.
 */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    let h = 2166136261;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function make(seed) {
    const s = (seed == null || seed === '') ? (Date.now() & 0x7fffffff)
      : (/^\d+$/.test(seed) ? parseInt(seed, 10) : hash(seed));
    const next = mulberry32(s);
    return {
      seed: s,
      next,
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
      pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    };
  }

  window.RNG = { make };
})();
