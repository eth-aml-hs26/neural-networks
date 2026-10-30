/* vectors.js : the arithmetic of the reveal, and nothing else.
 *
 * Pure functions of the lexicon (data/lexicon.js), with no DOM, so that the
 * page (js/reveal.js) and the check (scripts/check-vectors.js) compute the
 * same numbers from the same code.  Rebuilt on 2026-10-30 for the new
 * Wuggish of SPEC.md; precompute/world.py computes the same numbers in
 * Python, and the check compares the two.
 *
 * A word's ROW, its embedding, answers the nine questions of
 * LEXICON.features with 1 (yes) or 0 (no), in three groups: what a thing
 * HAS (fur, hooves, scales), where a look GOES (coat, body) and what a look
 * BRINGS (stripes, spots, wings, horn).  The query, the key and the value
 * are the row times three blocks of weights, as in a transformer:
 *
 *   W_Q (d by k) sends fur to slot 1 and hooves and scales to slot 2: a
 *       thing with fur asks for a coat look, a thing with hooves or scales
 *       for a body look, and an adjective, which has none of the three,
 *       asks nothing;
 *   W_K (d by k) sends coat to slot 1 and body to slot 2: an adjective
 *       answers in the slot of where its look goes, and a noun answers
 *       nothing;
 *   W_V (d by d) keeps the four brings features: what a word adds.
 *
 * Here d = 9 and k = 2.  The slots are numbered: they live in the space of
 * queries and keys, apart from the features, and are never named after a
 * feature or a word.  The score of a pair is query . key.  The new row of a
 * word is its own row plus every value times its raw score, E + S V, with no
 * normalization; every number stays 0 or 1 in every sentence of the game.
 */
(function (root) {
  'use strict';

  function make(L) {
    const FEATURES = L.features.map(f => f.name);                    // the 9 columns
    const GROUP = {}, QUESTION = {};
    L.features.forEach(f => { GROUP[f.name] = f.group; QUESTION[f.name] = f.question; });
    const GROUPS = ['has', 'goes', 'brings'];
    const IN = {};                                                   // group -> its features, in order
    GROUPS.forEach(g => { IN[g] = FEATURES.filter(f => GROUP[f] === g); });
    const K = L.slots;                                               // k, the length of a query and a key
    const SLOTS = Array.from({ length: K }, (_, i) => i + 1);        // 1, 2

    const isNoun = w => Object.prototype.hasOwnProperty.call(L.nouns, w);
    const isAdj = w => Object.prototype.hasOwnProperty.call(L.adjectives, w);
    const entry = w => {
      if (isNoun(w)) return L.nouns[w];
      if (isAdj(w)) return L.adjectives[w];
      throw new Error('not a word of ' + L.name + ': ' + w);
    };

    function zeros(n) { return new Array(n).fill(0); }
    function onehot(names, universe) { return universe.map(f => (names.indexOf(f) >= 0 ? 1 : 0)); }
    function dot(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }
    function add(a, b) { return a.map((x, i) => x + b[i]); }
    function scale(c, v) { return v.map(x => c * x); }
    function times(v, W) { return W[0].map((_, j) => v.reduce((s, x, i) => s + x * W[i][j], 0)); }
    function matmul(A, B) { return A.map(r => times(r, B)); }
    function transpose(A) { return A[0].map((_, j) => A.map(r => r[j])); }
    function same(a, b) { return a.length === b.length && a.every((x, i) => x === b[i]); }
    // the names of the features a vector says yes to, e.g. ['fur', 'spots']
    function on(v, universe) { return (universe || FEATURES).filter((f, i) => v[i]); }
    // the part of a row that falls in one group, e.g. part(row, 'brings')
    function part(v, group) { return FEATURES.map((f, i) => [f, v[i]]).filter(p => GROUP[p[0]] === group).map(p => p[1]); }

    // the embedding
    function row(w) { return onehot(entry(w).features, FEATURES); }

    // the three blocks of weights, from the lexicon's WQ, WK and WV
    const W_Q = FEATURES.map(f => (L.WQ[f] || zeros(K)).slice());
    const W_K = FEATURES.map(f => (L.WK[f] || zeros(K)).slice());
    const W_V = FEATURES.map((f, i) => FEATURES.map((g, j) => (i === j && L.WV.indexOf(f) >= 0 ? 1 : 0)));

    function query(w) { return times(row(w), W_Q); }
    function key(w) { return times(row(w), W_K); }
    function value(w) { return times(row(w), W_V); }
    function score(a, b) { return dot(query(a), key(b)); }

    // A sentence through one layer, by position: E the rows, Q, K and V,
    // the scores S = Q K^T, S V, and the new rows H = E + S V.
    function layer(words) {
      const E = words.map(row), Q = words.map(query), Kx = words.map(key), Vs = words.map(value);
      const S = matmul(Q, transpose(Kx));
      const SV = S.map(srow => srow.reduce((acc, s, j) => add(acc, scale(s, Vs[j])), zeros(FEATURES.length)));
      const H = E.map((e, i) => add(e, SV[i]));
      return { words, E, Q, K: Kx, V: Vs, S, SV, H };
    }

    // A row of scores turned into weights that add up to 1 by dividing by
    // its total (a row of zeros stays 0), and the softmax of the scores, each
    // first multiplied by `times` and divided by the square root of k.
    function weights(scores) {
      const tot = scores.reduce((a, b) => a + b, 0);
      return scores.map(x => (tot ? x / tot : 0));
    }
    function softmax(scores, times_) {
      const z = scores.map(s => Math.exp((times_ || 1) * s / Math.sqrt(K)));
      const t = z.reduce((a, b) => a + b, 0);
      return z.map(x => x / t);
    }

    // the words in the order of the lexicon: the plain things, the things
    // with a look, then the adjectives (SPEC.md, "The eleven words")
    const WORDS = Object.keys(L.nouns).concat(Object.keys(L.adjectives));
    const NOUNS = WORDS.filter(isNoun);
    const ADJS = WORDS.filter(isAdj);
    const BASES = NOUNS.filter(n => L.nouns[n].flags.length === 0);    // kat, poony, lizzard

    // the word of the dictionary whose row is v, or null
    function wordWithRow(v) { return WORDS.filter(w => same(row(w), v))[0] || null; }

    // what a row looks like: the thing its has features make, and the art
    // flags of its brings features (spots -> spotted), so that any row, a
    // new one included, can be drawn
    const FLAG_OF = {};                                              // brings feature -> art flag
    ADJS.forEach(a => { L.adjectives[a].features.forEach(f => { if (GROUP[f] === 'brings') FLAG_OF[f] = L.adjectives[a].flag; }); });
    function looksOf(v) { return on(v).filter(f => GROUP[f] === 'brings'); }
    function picture(v) {
      const base = BASES.filter(b => same(part(row(b), 'has'), part(v, 'has')))[0];
      if (!base) return null;
      const flags = {};
      looksOf(v).forEach(f => { flags[FLAG_OF[f]] = true; });
      return { object: L.nouns[base].object, flags };
    }
    // the look an adjective brings, e.g. 'spots' for spottet
    function look(a) { return L.adjectives[a].features.filter(f => GROUP[f] === 'brings')[0]; }

    return {
      FEATURES, GROUP, GROUPS, IN, QUESTION, K, SLOTS, WORDS, NOUNS, ADJS, BASES, W_Q, W_K, W_V, FLAG_OF,
      isNoun, isAdj, zeros, onehot, dot, add, scale, times, matmul, transpose, same, on, part,
      row, query, key, value, score, layer, weights, softmax, wordWithRow, looksOf, picture, look,
    };
  }

  root.VECTORS = make(root.LEXICON);
  root.VECTORS.make = make;
})(window);
