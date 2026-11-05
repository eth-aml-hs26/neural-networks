/* math.js: every number of the page, computed from the Wuggish on the seven features of the
 * attention deck (data/lexicon.js, written by scripts/sync.js from the game's world.py and the
 * deck's at-data.tex) for its running sentence, bootet kat divin feesh (data/sentence.js).
 *
 * The simplified attention of the deck of 4 November 2026: no softmax, no division, the raw scores.
 *   E   n x d   one row per word: its seven features
 *   Q = E W_Q   n x k      K = E W_K   n x k      V = E   n x d (the deck: "V = E for now")
 *   S = Q K^T   n x n      every query against every key: a 1 on the diagonal, since a word finds
 *                          its own key, and a 1 where a noun finds an adjective that fits it
 *   S V         n x d      the new rows: each word adds the values it scored, times the score
 * Here n = 4, d = 7, k = 4, and every number is 0 or 1.
 *
 * Loaded by the page (window.AWMath, and window.AW.M built from window.LEXICON and the sentence
 * window.AW_SENTENCE of data/sentence.js) and by scripts/sync.js and scripts/check-math.js
 * (module.exports); the check compares every block with the deck and with world.py.
 */
(function () {
  'use strict';

  // the running sentence of SPEC.md and of the deck, when data/sentence.js says nothing
  var SENTENCE = ['bootet', 'kat', 'divin', 'feesh'];

  function zeros(r, c) {
    var out = [];
    for (var i = 0; i < r; i++) { var row = []; for (var j = 0; j < c; j++) row.push(0); out.push(row); }
    return out;
  }

  function matmul(A, B) {
    var r = A.length, m = B.length, c = B[0].length, out = zeros(r, c);
    for (var i = 0; i < r; i++) {
      if (A[i].length !== m) throw new Error('matmul: shapes do not fit');
      for (var j = 0; j < c; j++) {
        var s = 0;
        for (var t = 0; t < m; t++) s += A[i][t] * B[t][j];
        out[i][j] = s;
      }
    }
    return out;
  }

  function transpose(A) {
    var out = zeros(A[0].length, A.length);
    for (var i = 0; i < A.length; i++) for (var j = 0; j < A[0].length; j++) out[j][i] = A[i][j];
    return out;
  }

  function same(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function featureNames(L) { return L.features.map(function (f) { return f.name; }); }

  function entry(L, w) { return L.nouns[w] || L.adjectives[w] || null; }

  // the row of a word in the dictionary: a 1 for each of its features
  function rowOf(L, w) {
    var e = entry(L, w);
    if (!e) throw new Error('no word ' + w);
    return featureNames(L).map(function (f) { return e.features.indexOf(f) >= 0 ? 1 : 0; });
  }

  function words(L) { return Object.keys(L.nouns).concat(Object.keys(L.adjectives)); }

  // the word of the dictionary whose row is this row, or null
  function wordWithRow(L, row) {
    var ws = words(L);
    for (var i = 0; i < ws.length; i++) if (same(rowOf(L, ws[i]), row)) return ws[i];
    return null;
  }

  // W_Q and W_K: d x k, a feature's row says the slots it asks or answers in
  function weights(L) {
    var k = L.slots.length;
    function rows(map) {
      return featureNames(L).map(function (f) { return map[f] ? map[f].slice() : zeros(1, k)[0]; });
    }
    return { WQ: rows(L.WQ), WK: rows(L.WK) };
  }

  // runs of neighbours that share a name, in order: [{name, from, to}] (to inclusive)
  function runs(names) {
    var out = [];
    names.forEach(function (nm, i) {
      var last = out[out.length - 1];
      if (last && last.name === nm) last.to = i;
      else out.push({ name: nm, from: i, to: i });
    });
    return out;
  }
  // the groups of the features (has, brings), and the places of the slots (earth, water)
  function groups(L) { return runs(L.features.map(function (f) { return f.group; })); }
  function places(L) { return runs(L.slots.map(function (s) { return s.place; })); }

  function build(L, sentence) {
    sentence = sentence || SENTENCE;
    var F = featureNames(L), W = weights(L);
    var E = sentence.map(function (w) { return rowOf(L, w); });
    var Q = matmul(E, W.WQ), K = matmul(E, W.WK), V = E.map(function (r) { return r.slice(); });
    var KT = transpose(K), S = matmul(Q, KT), SV = matmul(S, V);
    var nouns = [], adjectives = [];
    sentence.forEach(function (w, i) { (L.nouns[w] ? nouns : adjectives).push(i); });
    return {
      sentence: sentence.slice(), features: F, groups: groups(L), places: places(L), slots: L.slots,
      n: sentence.length, d: F.length, k: L.slots.length,
      E: E, WQ: W.WQ, WK: W.WK, Q: Q, K: K, KT: KT, S: S, V: V, SV: SV,
      nouns: nouns, adjectives: adjectives,
      // what each new row is in the dictionary (null: no word has it)
      reads: SV.map(function (r) { return wordWithRow(L, r); })
    };
  }

  var api = {
    SENTENCE: SENTENCE, build: build, matmul: matmul, transpose: transpose,
    rowOf: rowOf, wordWithRow: wordWithRow, weights: weights, groups: groups, places: places, words: words
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    window.AWMath = api;
    window.AW = window.AW || {};
    if (window.LEXICON) window.AW.M = build(window.LEXICON, window.AW_SENTENCE || SENTENCE);
  }
})();
