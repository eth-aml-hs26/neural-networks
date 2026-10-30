/* vectors.js : the arithmetic of the reveal, and nothing else.
 *
 * Pure functions of the lexicon (data/lexicon.js), with no DOM, so that the
 * page (js/reveal.js) and the check (scripts/check-vectors.js) compute the
 * same numbers from the same code.  Added in AML on 2026-10-30.
 *
 * A word's ROW, its embedding, answers the nine questions of
 * LEXICON.features with 1 (yes) or 0 (no): a noun says yes to its `kinds`,
 * an adjective to its look, its `feature`.  The query, the key and the value
 * are the row times three small matrices of weights, as in a transformer:
 *
 *   W_Q (9 x 4) copies the four kind features, so a noun asks with what it
 *       is and an adjective, which carries no kind, asks with zeros;
 *   W_K (9 x 4) moves each look onto the kind it `fits` (stripes to animal,
 *       boots to paws, ...), so an adjective answers with the kind of thing
 *       it describes and a noun, which carries no look, answers with zeros;
 *   W_V (9 x 9) keeps the five look features: what a word adds to a thing.
 *
 * The score of a pair is query . key, the inner product.  The new row of a
 * word is its own row plus every value times its raw score, E + S V, with no
 * normalization, so every number stays 0 or 1 in a sentence without a
 * repeated word.  The attention deck (docs/slides/attention/figures.py)
 * builds the same three matrices.
 */
(function (root) {
  'use strict';

  function make(L) {
    const FEATURES = L.features.map(f => f.name);                                 // the 9 columns
    const KINDS = L.features.filter(f => f.group === 'kind').map(f => f.name);    // animal paws reptile object
    const LOOKS = L.features.filter(f => f.group === 'look').map(f => f.name);    // stripes boots venom wood broken
    const QUESTION = {};
    L.features.forEach(f => { QUESTION[f.name] = f.question; });

    const isNoun = w => Object.prototype.hasOwnProperty.call(L.nouns, w);
    const isAdj = w => Object.prototype.hasOwnProperty.call(L.adjectives, w);

    function zeros(n) { return new Array(n).fill(0); }
    function onehot(names, universe) { return universe.map(f => (names.indexOf(f) >= 0 ? 1 : 0)); }
    function dot(a, b) { return a.reduce((s, x, i) => s + x * b[i], 0); }
    function add(a, b) { return a.map((x, i) => x + b[i]); }
    function scale(c, v) { return v.map(x => c * x); }
    function times(v, W) { return W[0].map((_, j) => v.reduce((s, x, i) => s + x * W[i][j], 0)); }
    function matmul(A, B) { return A.map(r => times(r, B)); }
    function transpose(A) { return A[0].map((_, j) => A.map(r => r[j])); }
    // the names of the features a vector says yes to, e.g. ['animal', 'paws']
    function on(v, universe) { return (universe || FEATURES).filter((f, i) => v[i]); }

    // the embedding
    function row(w) {
      if (isNoun(w)) return onehot(L.nouns[w].kinds, FEATURES);
      if (isAdj(w)) return onehot([L.adjectives[w].feature], FEATURES);
      throw new Error('not a word of ' + L.name + ': ' + w);
    }

    // the three blocks of weights
    const LOOK_FITS = {};    // look -> the kind it goes with: the grammar
    Object.keys(L.adjectives).forEach(a => { LOOK_FITS[L.adjectives[a].feature] = L.adjectives[a].fits; });
    const W_Q = FEATURES.map(f => KINDS.map(k => (f === k ? 1 : 0)));
    const W_K = FEATURES.map(f => KINDS.map(k => (LOOK_FITS[f] === k ? 1 : 0)));
    const W_V = FEATURES.map((f, i) => FEATURES.map((g, j) => (i === j && LOOKS.indexOf(f) >= 0 ? 1 : 0)));

    function query(w) { return times(row(w), W_Q); }
    function key(w) { return times(row(w), W_K); }
    function value(w) { return times(row(w), W_V); }
    function score(a, b) { return dot(query(a), key(b)); }

    // A sentence through one layer: E the rows, Q K V, the scores S = Q K^T,
    // and the new rows H = E + S V.  Works by position, so a word that occurs
    // twice (the double of lesson 4) is two rows.
    function layer(words) {
      const E = words.map(row), Q = words.map(query), K = words.map(key), Vs = words.map(value);
      const S = matmul(Q, transpose(K));
      const H = words.map((w, i) => S[i].reduce((acc, s, j) => add(acc, scale(s, Vs[j])), E[i]));
      return { words, E, Q, K, V: Vs, S, H };
    }

    // A row of scores turned into weights that add up to 1, the way the
    // softmax ends: each score over the row's total (a row of zeros stays 0).
    function weights(scores) {
      const tot = scores.reduce((a, b) => a + b, 0);
      return scores.map(x => (tot ? x / tot : 0));
    }

    // Every word, ordered by its row read as a binary number, largest first:
    // kat, snaak, chaar, then streept, bootet, vennomus, wudden, brooken, so
    // the 1s of the table run down it like a staircase.
    function byRow(a, b) {
      const ra = row(a), rb = row(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i];
      return 0;
    }
    const WORDS = Object.keys(L.nouns).concat(Object.keys(L.adjectives)).sort(byRow);
    const NOUNS = WORDS.filter(isNoun);
    const ADJS = WORDS.filter(isAdj);

    return {
      FEATURES, KINDS, LOOKS, QUESTION, WORDS, NOUNS, ADJS, W_Q, W_K, W_V,
      isNoun, isAdj, zeros, onehot, dot, add, scale, times, matmul, transpose, on,
      row, query, key, value, score, layer, weights,
    };
  }

  root.VECTORS = make(root.LEXICON);
  root.VECTORS.make = make;
})(window);
