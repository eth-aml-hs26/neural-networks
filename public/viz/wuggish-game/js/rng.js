/* rng.js : a small seeded random generator (mulberry32) so that a run can be
 * reproduced from the lectern with ?seed=NNN.  Without a seed the clock
 * seeds it and every play is different.
 *
 * order(words, before) is the shuffle of a sentence's words (2026-10-30):
 * a uniform draw among the orders that keep every pair [a, b] of `before`
 * with a before b.  An item of data/items.js carries those pairs, one per
 * adjective and noun it may describe, so that every adjective stands before
 * its noun, as Carlos asked; beyond that the order is free.  The game draws
 * with it, and scripts/check-vectors.js runs it over hundreds of seeds and
 * hands the orders to precompute/world.py to check.
 */
(function (root) {
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

  // every order of xs, in a fixed sequence
  function permutations(xs) {
    if (xs.length < 2) return [xs.slice()];
    const out = [];
    xs.forEach((x, i) => {
      permutations(xs.slice(0, i).concat(xs.slice(i + 1))).forEach(p => out.push([x].concat(p)));
    });
    return out;
  }
  function keeps(order, before) {
    return (before || []).every(p => order.indexOf(p[0]) < order.indexOf(p[1]));
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
      order(words, before) {
        const ok = permutations(words).filter(p => keeps(p, before));
        return ok.length ? ok[Math.floor(next() * ok.length)] : words.slice();
      },
    };
  }

  root.RNG = { make, permutations, keeps };
})(window);
