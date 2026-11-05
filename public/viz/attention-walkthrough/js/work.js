/* work.js: the clicks of the walkthrough and the formula each one writes under the band, as
 * window.AW.plan and window.AW.work(click). No DOM here: scripts/check-math.js loads this file too
 * and checks every number of every formula against the blocks of js/math.js.
 *
 * THE CLICKS follow Carlos's request of 31 October 2026 ("after one click we show the queries,
 * and after one click the keys appear, then the values ... the calculation in detail of the inner
 * products") and the attention deck of 4 November 2026: its frame 27 checks the four keys of kat
 * one a click, then the other three words one a click each, and its frame 25 adds up the row of
 * kat, then the row of feesh, then the adjectives, which keep their rows. With the running
 * sentence bootet kat divin feesh (A = kat and B = feesh the nouns, bootet and divin the
 * adjectives):
 *
 *   words  E                         the sentence becomes rows; E, one row per word
 *   WQ Q  WK K  V                    each block of weights, then its product with E; V = E
 *   KT  S                            K turned on its side above S; the empty scores
 *   score-A-<word> (n clicks)        the row of A, one inner product per click
 *   scores-<word> (the other words)  each other row, its inner products at once
 *   SV  sv-A  sv-B  sv-adjectives    S V, one row of words at a time
 *   read  formula                    the new rows read as words of the dictionary; the formula
 *
 * The nouns and the adjectives are found from the lexicon, so the ids follow the words of the
 * sentence: score-kat-bootet, scores-divin, sv-feesh, ...
 */
(function () {
  'use strict';
  var AW = window.AW, G = AW.geo, M = AW.M;
  var W = M.sentence, n = M.n, d = M.d, k = M.k;
  var A = M.nouns[0], B = M.nouns[1], ADJ = M.adjectives;
  var OTHERS = [];
  W.forEach(function (w, i) { if (i !== A) OTHERS.push(i); });

  var PLAN = ['words', 'E', 'WQ', 'Q', 'WK', 'K', 'V', 'KT', 'S'];
  W.forEach(function (w) { PLAN.push('score-' + W[A] + '-' + w); });
  OTHERS.forEach(function (i) { PLAN.push('scores-' + W[i]); });
  PLAN = PLAN.concat(['SV', 'sv-' + W[A], 'sv-' + W[B], 'sv-adjectives', 'read', 'formula']);

  // ===== KaTeX pieces

  function word(w) { return '\\textit{' + w + '}'; }
  function feat(f) { return '\\htmlClass{ft}{\\text{' + f + '}}'; }
  function col(cls, v) { return '\\htmlClass{' + cls + '}{' + v + '}'; }
  var EQ = '\\;=\\;', PLUS = '\\;+\\;', DOT = '\\,\\cdot\\,';

  // the features whose row of a block of weights holds a 1 in column s
  function sources(Wm, s) {
    var out = [];
    for (var f = 0; f < d; f++) if (Wm[f][s]) out.push(f);
    return out;
  }
  // the features a block of weights uses at all
  function used(Wm) {
    var out = [];
    for (var f = 0; f < d; f++) if (Wm[f].some(function (x) { return x; })) out.push(f);
    return out;
  }

  // the inner product of query i and key j, as pieces that numbers fly into: q1, k1, ..., res
  function scorePieces(i, j) {
    var q = M.Q[i], kt = [];
    for (var s = 0; s < k; s++) kt.push(M.KT[s][j]);
    var out = [{ tex: 'S_{' + word(W[i]) + ',\\,' + word(W[j]) + '}' + EQ }];
    for (s = 0; s < k; s++) {
      if (s > 0) out.push({ tex: PLUS });
      out.push({ key: 'q' + (s + 1), tex: col('cq', q[s]) }, { tex: DOT }, { key: 'k' + (s + 1), tex: col('ck', kt[s]) });
    }
    out.push({ tex: EQ }, { key: 'res', tex: String(M.S[i][j]) });
    return out;
  }

  // row i of S V: each value times its score, as pieces; c<j> holds the score of word j, and
  // r<i>c<j> when several rows are written at once
  function svKey(i, j, several) { return (several ? 'r' + i : '') + 'c' + j; }
  function svPieces(i, several) {
    var out = [{ tex: '(S\\,V)_{' + word(W[i]) + '}' + EQ }];
    W.forEach(function (w, j) {
      if (j > 0) out.push({ tex: PLUS });
      out.push({ key: svKey(i, j, several), tex: String(M.S[i][j]) }, { tex: '\\,V_{' + word(w) + '}' });
    });
    return out;
  }

  // the slots of a block of weights and the features that fill each, one rule per slot; the page
  // sets them in two columns, a place to a row (earth: slots 1 and 2, water: slots 3 and 4)
  function slotRules(Wm) {
    var out = [];
    for (var s = 0; s < k; s++) {
      var fs = sources(Wm, s).map(function (f) { return feat(M.features[f]); });
      out.push([{ tex: '\\text{slot } ' + (s + 1) + EQ + (fs.length ? fs.join(PLUS) : '0') }]);
    }
    return out;
  }

  function one(tex) { return [{ tex: tex }]; }

  // the four inner products of row i at once; their results are res0, res1, ...
  function rowOfScores(i) {
    return W.map(function (w, jj) {
      return scorePieces(i, jj).map(function (p) {
        return p.key === 'res' ? { key: 'res' + jj, tex: p.tex } : { tex: p.tex };
      });
    });
  }

  // {x, grid, rules, lines: [[pieces]]} for a click, or null when it writes nothing: grid sets the
  // lines in two columns, rules sets the first line over two columns of the others
  function work(c) {
    var X = G.workX;
    if (c === 'Q') return { x: X.Q, rules: true, lines: [one('Q = E\\,W_{Q}')].concat(slotRules(M.WQ)) };
    if (c === 'K') return { x: X.K, rules: true, lines: [one('K = E\\,W_{K}')].concat(slotRules(M.WK)) };
    if (c === 'V') return { x: X.V, lines: [one('V = E')] };
    if (c === 'KT') return { x: X.KT, lines: [one('(K^{\\top})_{s,\\,j} = K_{j,\\,s}')] };
    if (c === 'S') {
      var terms = [];
      for (var s = 1; s <= k; s++) terms.push(col('cq', 'q_{i' + s + '}') + '\\,' + col('ck', 'k_{j' + s + '}'));
      return { x: X.S, lines: [one('S = Q\\,K^{\\top}'), one('S_{ij} = ' + terms.join(PLUS))] };
    }
    for (var j = 0; j < n; j++) {
      if (c === 'score-' + W[A] + '-' + W[j]) return { x: X.S, lines: [scorePieces(A, j)] };
    }
    for (var t = 0; t < OTHERS.length; t++) {
      if (c === 'scores-' + W[OTHERS[t]]) return { x: X.S, grid: true, lines: rowOfScores(OTHERS[t]) };
    }
    if (c === 'SV') return { x: X.SV, lines: [one('(S\\,V)_{i} = \\textstyle\\sum_{j} S_{ij}\\,V_{j}')] };
    if (c === 'sv-' + W[A]) return { x: X.SV, lines: [svPieces(A)] };
    if (c === 'sv-' + W[B]) return { x: X.SV, lines: [svPieces(B)] };
    if (c === 'sv-adjectives') return { x: X.SV, lines: ADJ.map(function (i) { return svPieces(i, true); }) };
    return null;
  }

  AW.plan = PLAN;
  AW.roles = { A: A, B: B, ADJ: ADJ, OTHERS: OTHERS };
  AW.work = work;
  AW.workUtil = { sources: sources, used: used, scorePieces: scorePieces, svPieces: svPieces, svKey: svKey };
})();
