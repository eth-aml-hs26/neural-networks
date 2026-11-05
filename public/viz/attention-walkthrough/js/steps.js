/* steps.js: what the diagram shows after each click and how a forward click animates it, as
 * window.AW.steps. The clicks and their formulas are in js/work.js.
 *
 * render(st) draws the state of st from scratch; animate(st) decorates a single forward click
 * (cells that fly, numbers that arrive). st.r(id) is true once click id has been shown, st.c(id)
 * while it is the last one shown, st.cur names it.
 */
(function () {
  'use strict';
  var AW = window.AW, K = window.AWKit, G = AW.geo, M = AW.M;
  var W = M.sentence, n = M.n, d = M.d, k = M.k;
  var A = AW.roles.A, B = AW.roles.B, ADJ = AW.roles.ADJ, OTHERS = AW.roles.OTHERS;
  var U = AW.workUtil;

  var S = {};   // every element of the diagram

  // ===== the scene, built once

  function build(layers) {
    var mid = layers.mid, top = layers.top, back = layers.back;
    var Bk = G.blocks;

    // the rows of the band, faint, from the words to the new rows
    S.stripes = [];
    for (var i = 0; i < n; i++) {
      var s = K.div('stripe vis' + (i % 2 ? ' odd' : ''), mid);
      s.style.left = '36px';
      s.style.top = (G.BAND_Y + i * G.CH) + 'px';
      s.style.width = (Bk.SV.x + Bk.SV.w + 14 - 36) + 'px';
      s.style.height = G.CH + 'px';
      S.stripes.push(s);
    }

    // the sentence under the title, and the same words as the rows of the band
    S.sentence = document.getElementById('sentence');
    S.sentenceWords = W.map(function (w, j) {
      var sp = K.div('w', S.sentence, 'span');
      sp.textContent = w;
      if (j < n - 1) S.sentence.appendChild(document.createTextNode(' '));
      return sp;
    });
    S.rowLabels = W.map(function (w, j) { return AW.label(mid, 'word', G.WORDS_R, G.rowY(j), 'cr', w); });

    // the blocks; E, the values V = E and the new rows S V are green, as in the deck's frame 25
    S.blocks = {
      E: AW.makeBlock(mid, 'E', 'feat'),
      WQ: AW.makeBlock(mid, 'WQ', 'q', true),
      Q: AW.makeBlock(mid, 'Q', 'q'),
      WK: AW.makeBlock(mid, 'WK', 'k', true),
      K: AW.makeBlock(mid, 'K', 'k'),
      KT: AW.makeBlock(mid, 'KT', 'k'),
      S: AW.makeBlock(mid, 'S', 's'),
      V: AW.makeBlock(mid, 'V', 'feat'),
      SV: AW.makeBlock(mid, 'SV', 'feat')
    };

    // names and sizes: under the band, above the weights, above K^T, beside V
    var size = function (r, c) { return r + ' \\times ' + c; };
    var NAMES = {
      E: ['E', size(n, d)], Q: ['Q', size(n, k)], K: ['K', size(n, k)],
      S: ['S = Q\\,K^{\\top}', size(n, n)], SV: ['S\\,V', size(n, d)],
      WQ: ['W_{Q}', size(d, k)], WK: ['W_{K}', size(d, k)],
      KT: ['K^{\\top}', size(k, n)], V: ['V = E', size(n, d)]
    };
    S.names = {};
    Object.keys(NAMES).forEach(function (id) {
      var p = G.names[id] || { x: Bk[id].cx, y: G.NAME_Y, sy: G.SIZE_Y };
      S.names[id] = [AW.texLabel(mid, NAMES[id][0], p.x, p.y, 'cc', 'name'),
        AW.texLabel(mid, NAMES[id][1], p.x, p.sy, 'cc', 'size')];
    });

    // column heads: the features over E and over V (and so over S V), and the braces of their
    // groups, has and brings
    S.heads = {};
    S.braces = {};
    ['E', 'V'].forEach(function (id) {
      var g = Bk[id], foot = g.y - G.HEAD_GAP;
      S.heads[id] = M.features.map(function (f, j) {
        return AW.turned(mid, f, g.x + (j + 0.5) * g.cw, foot, 'feature');
      });
      var y = foot - G.HEAD_LEN - G.BRACE_RISE;
      S.braces[id] = M.groups.map(function (gr) {
        return AW.brace(back, g.x + gr.from * g.cw + 3, g.x + (gr.to + 1) * g.cw - 3, y, gr.name, mid);
      });
    });

    // the features as the rows of W_Q and W_K, which share them, on the left of W_Q
    var gq = Bk.WQ;
    S.featRows = M.features.map(function (f, r) {
      return AW.label(mid, 'feature small', gq.x - 8, gq.y + (r + 0.5) * gq.ch, 'cr', f);
    });

    // the slots over W_Q, W_K, Q and K and beside the rows of K^T, and the place of each slot
    // (earth, water) in a brace over the weights
    S.slots = {};
    ['WQ', 'WK', 'Q', 'K'].forEach(function (id) {
      var g = Bk[id];
      S.slots[id] = [];
      for (var t = 0; t < k; t++) S.slots[id].push(AW.label(mid, 'slot', g.x + (t + 0.5) * g.cw, G.slotY(id), 'cc', String(t + 1)));
    });
    S.slots.KT = [];
    for (var t = 0; t < k; t++) {
      S.slots.KT.push(AW.label(mid, 'slot', Bk.KT.x - 10, Bk.KT.y + (t + 0.5) * Bk.KT.ch, 'cc', String(t + 1)));
    }
    S.places = {};
    ['WQ', 'WK'].forEach(function (id) {
      var g = Bk[id];
      S.places[id] = M.places.map(function (p) {
        return AW.brace(back, g.x + p.from * g.cw + 3, g.x + (p.to + 1) * g.cw - 3, G.placeBraceY(id), p.name, mid);
      });
    });

    // the words over the columns of K^T (and so of S), and beside the rows of V
    S.ktWords = W.map(function (w, j) {
      return AW.turned(mid, w, Bk.KT.x + (j + 0.5) * Bk.KT.cw, Bk.KT.y - 6, 'word small');
    });
    S.vWords = W.map(function (w, r) {
      return AW.label(mid, 'word small', Bk.V.x + Bk.V.w + 8, Bk.V.y + (r + 0.5) * Bk.V.ch, 'cl', w);
    });

    // the score column beside V, while a row of S V is worked out, and its signs
    var sc = G.scoreCol, gv = Bk.V;
    S.scoreCol = K.div('blk vis t-s scorecol', mid);
    S.scoreCol.style.left = sc.x + 'px';
    S.scoreCol.style.top = gv.y + 'px';
    S.scoreCol.style.width = sc.w + 'px';
    S.scoreCol.style.height = gv.h + 'px';
    S.scoreCells = [];
    for (var r = 0; r < n; r++) {
      var c = K.div('cell', S.scoreCol);
      c.style.left = '0px';
      c.style.top = (r * gv.ch) + 'px';
      c.style.width = sc.w + 'px';
      c.style.height = gv.ch + 'px';
      S.scoreCells.push({ cell: c, v: K.div('v', c, 'span') });
    }
    K.div('frame', S.scoreCol);
    S.times = W.map(function (w, r) {
      return AW.texLabel(mid, '\\times', sc.x + sc.w + sc.gap / 2 + 1, gv.y + (r + 0.5) * gv.ch, 'cc', 'op');
    });

    // the work under the band: the formula of the click
    S.work = K.div('work vis', top);

    // every new row read as a word of the dictionary: a noun's in bold with its picture (the
    // pictures that scripts/sync.js copied from the game's snapshot), an adjective's in grey
    S.reads = W.map(function (w0, row) {
      var w = M.reads[row], changed = !!w && w !== w0;
      var box = K.div('read vis', mid);
      K.pos(box, G.read.x, G.rowY(row), 'cl');
      var lab = K.div('read-word ' + (changed ? 'changed' : 'same'), box, 'span');
      lab.textContent = w ? '= ' + w : '';
      if (changed && window.AW_PICTURES && window.AW_PICTURES.indexOf(w) >= 0) {
        var img = K.div('plate', box, 'img');
        // the bundle of scripts/bundle.js carries its pictures inside it (AW_PICTURE_SRC)
        img.src = (window.AW_PICTURE_SRC && window.AW_PICTURE_SRC[w]) || 'img/' + w + '.svg';
        img.alt = w;
      }
      return { row: row, word: w, changed: changed, box: box, lab: lab };
    });

    // the formula of the last click
    S.formula = K.div('formula vis', mid);
    K.pos(S.formula, G.formula.x, G.formula.y, 'tl');
    K.tex(K.div('fline', S.formula), 'S\\,V \\;=\\; Q\\,K^{\\top}\\,V');
    K.tex(K.div('fline small', S.formula), 'Q = E\\,W_{Q},\\quad K = E\\,W_{K},\\quad V = E');

    S.focus = AW.focus(top);
  }

  // ===== what is shown

  function fillAll(id, Mx) {
    var b = S.blocks[id];
    for (var i = 0; i < Mx.length; i++) for (var j = 0; j < Mx[0].length; j++) b.set(i, j, Mx[i][j]);
  }

  // a score is shown once its click is: the row of the first noun one inner product at a time,
  // every other row at once
  function sShown(st, i, j) {
    if (i === A) return st.r('score-' + W[A] + '-' + W[j]);
    return st.r('scores-' + W[i]);
  }
  function svShown(st, i) {
    if (i === A) return st.r('sv-' + W[A]);
    if (i === B) return st.r('sv-' + W[B]);
    return st.r('sv-adjectives');
  }
  function showAll(list, on) { list.forEach(function (el) { K.show(el, on); }); }
  function showName(id, on) { showAll(S.names[id], on); }

  function render(st) {
    var on = function (id) { return st.r(id); };
    var i, j;

    showAll(S.stripes, on('words'));
    showAll(S.rowLabels, on('words'));

    // E and its heads
    S.blocks.E.show(on('E'));
    fillAll('E', M.E);
    showAll(S.heads.E, on('E'));
    S.braces.E.forEach(function (b) { b.show(on('E')); });
    showName('E', on('E'));

    // the weights of the queries and keys, and their products
    [['WQ', M.WQ, 'Q', M.Q], ['WK', M.WK, 'K', M.K]].forEach(function (p) {
      S.blocks[p[0]].show(on(p[0]));
      fillAll(p[0], p[1]);
      showName(p[0], on(p[0]));
      S.places[p[0]].forEach(function (b) { b.show(on(p[0])); });
      S.blocks[p[2]].show(on(p[2]));
      fillAll(p[2], p[3]);
      showName(p[2], on(p[2]));
    });
    showAll(S.featRows, on('WQ'));
    ['WQ', 'WK', 'Q', 'K'].forEach(function (id) { showAll(S.slots[id], on(id)); });

    // the values, V = E
    S.blocks.V.show(on('V'));
    fillAll('V', M.V);
    showName('V', on('V'));
    showAll(S.heads.V, on('V'));
    S.braces.V.forEach(function (b) { b.show(on('V')); });
    showAll(S.vWords, on('V'));

    // K turned on its side
    S.blocks.KT.show(on('KT'));
    fillAll('KT', M.KT);
    showName('KT', on('KT'));
    showAll(S.slots.KT, on('KT'));
    showAll(S.ktWords, on('KT'));

    // the scores, cell by cell
    S.blocks.S.show(on('S'));
    showName('S', on('S'));
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) S.blocks.S.set(i, j, sShown(st, i, j) ? M.S[i][j] : null);

    // S V, row by row
    S.blocks.SV.show(on('SV'));
    showName('SV', on('SV'));
    for (i = 0; i < n; i++) for (j = 0; j < d; j++) S.blocks.SV.set(i, j, svShown(st, i) ? M.SV[i][j] : null);

    // the score column beside V
    var scRow = st.c('sv-' + W[A]) ? A : st.c('sv-' + W[B]) ? B : -1;
    K.show(S.scoreCol, scRow >= 0);
    showAll(S.times, scRow >= 0);
    S.scoreCells.forEach(function (c, r) {
      var v = scRow >= 0 ? M.S[scRow][r] : null;
      c.cell.className = 'cell' + (r < n - 1 ? ' bb' : '') + (v === null ? ' empty' : v ? ' one' : ' zero');
      c.v.textContent = v === null ? '' : String(v);
    });

    S.reads.forEach(function (r) { K.show(r.box, on('read')); });
    fitReads();
    K.show(S.formula, on('formula'));

    S.focus.set(focusRects(st));
    renderWork(st);
  }

  // a long word beside the new rows shrinks until it fits the stage
  function fitReads() {
    var avail = G.W - 12 - G.read.x;
    S.reads.forEach(function (r) {
      r.lab.style.fontSize = '';
      var w = r.box.scrollWidth;
      if (w <= avail) return;
      var lw = r.lab.scrollWidth, px = parseFloat(getComputedStyle(r.lab).fontSize);
      r.lab.style.fontSize = Math.max(12, px * (avail - (w - lw)) / lw * 0.97).toFixed(1) + 'px';
    });
  }

  // ===== the boxes round what the current click is about

  function span(id, cols) {
    return G.span(id, 0, cols[0], G.blocks[id].rows - 1, cols[cols.length - 1]);
  }
  function scoreRect(r) {
    var gv = G.blocks.V;
    return { x: G.scoreCol.x, y: gv.y + r * gv.ch, w: G.scoreCol.w, h: gv.ch };
  }
  // a row that counts: from its score through its value
  function countRect(r) {
    var a = scoreRect(r), b = G.row('V', r);
    return { x: a.x, y: a.y, w: b.x + b.w - a.x, h: a.h };
  }

  function focusRects(st) {
    var c = st.cur, out = [], j, t;
    if (!c) return out;
    if (c === 'E' || c === 'WQ' || c === 'WK' || c === 'S' || c === 'SV') return [G.all(c)];
    if (c === 'Q') return [span('E', U.used(M.WQ)), G.all('WQ'), G.all('Q')];
    if (c === 'K') return [span('E', U.used(M.WK)), G.all('WK'), G.all('K')];
    if (c === 'V') return [G.all('E'), G.all('V')];
    if (c === 'KT') return [G.all('K'), G.all('KT')];
    for (j = 0; j < n; j++) {
      if (c === 'score-' + W[A] + '-' + W[j]) return [G.row('Q', A), G.col('KT', j), G.cell('S', A, j)];
    }
    for (t = 0; t < OTHERS.length; t++) {
      var o = OTHERS[t];
      if (c === 'scores-' + W[o]) return [G.row('Q', o), G.all('KT'), G.row('S', o)];
    }
    var row = c === 'sv-' + W[A] ? A : c === 'sv-' + W[B] ? B : -1;
    if (row >= 0) {
      out.push(G.row('S', row));
      // neighbouring rows that count share one box
      for (j = 0; j < n; j++) {
        if (!M.S[row][j]) continue;
        var j1 = j;
        while (j1 + 1 < n && M.S[row][j1 + 1]) j1++;
        var a = countRect(j), z = countRect(j1);
        out.push({ x: a.x, y: a.y, w: a.w, h: z.y + z.h - a.y });
        j = j1;
      }
      out.push(G.row('SV', row));
      return out;
    }
    if (c === 'sv-adjectives') {
      ADJ.forEach(function (i) {
        out.push(G.row('S', i));
        for (var jj = 0; jj < n; jj++) if (M.S[i][jj]) out.push(G.row('V', jj));
        out.push(G.row('SV', i));
      });
      return out;
    }
    if (c === 'read') return S.reads.filter(function (r) { return r.changed; }).map(function (r) { return G.row('SV', r.row); });
    return out;
  }

  // ===== the work under the band

  function renderWork(st) {
    var w = st.cur ? AW.work(st.cur) : null;
    if (!w) { K.show(S.work, false); S.workSpans = {}; return; }
    if (S.work.__sig !== st.cur) {
      S.work.__sig = st.cur;
      while (S.work.firstChild) S.work.removeChild(S.work.firstChild);
      S.work.className = 'work vis' + (w.grid ? ' grid' : '') + (w.rules ? ' rules' : '');
      S.work.__spans = {};
      w.lines.forEach(function (pieces, li) {
        var spans = K.row(K.div('wline' + (w.rules && li === 0 ? ' head' : ''), S.work), pieces);
        Object.keys(spans).forEach(function (key) { S.work.__spans[key] = spans[key]; });
      });
    }
    S.workSpans = S.work.__spans;
    K.pos(S.work, w.x, G.WORK_Y, 'tc');
    K.show(S.work, true);
  }

  // ===== animations of a forward click

  function chipCls(v, tint) { return (v ? 'one' : 'zero') + ' t-' + tint; }
  function cellEl(id, i, j) { return S.blocks[id].cells[i][j]; }
  function rect(el) { return K.rect(el); }

  // reveal a held element, and flash el if given
  function landed(reveal, el) {
    return function () { reveal(); if (el) K.flash(el); };
  }

  // the columns of E that a block of weights picks fly into its product, one column of the product
  // after another; a column that picks nothing shows its zeros at once
  function flowColumns(wId, pId, Wm, P) {
    var total = 0, s;
    for (s = 0; s < Wm[0].length; s++) total += U.sources(Wm, s).length;
    var step = Math.min(420, Math.floor(2600 / Math.max(1, total - 1)));
    var delay = 150;
    for (s = 0; s < Wm[0].length; s++) {
      var fs = U.sources(Wm, s);
      if (!fs.length) {
        for (var i0 = 0; i0 < n; i0++) K.later(cellEl(pId, i0, s), 120);
        continue;
      }
      var reveals = [];
      for (var i = 0; i < n; i++) reveals.push(K.hold(cellEl(pId, i, s)));
      fs.forEach(function (f, q) {
        K.flash(cellEl(wId, f, s), delay);
        for (var r = 0; r < n; r++) {
          var v = M.E[r][f], last = q === fs.length - 1;
          K.flyChip(String(v), chipCls(v, 'feat'), G.cell('E', r, f), G.cell(pId, r, s), 650,
            delay + r * 70, last ? landed(reveals[r], P[r][s] ? cellEl(pId, r, s) : null) : null);
        }
        delay += step;
      });
    }
  }

  var ANIM = {};

  ANIM.words = function () {
    W.forEach(function (w, i) {
      var reveal = K.hold(S.rowLabels[i]);
      K.flyWord(w, rect(S.sentenceWords[i]), rect(S.rowLabels[i]), 850, 100 + i * 150, reveal, 30, 22);
    });
  };

  ANIM.E = function () {
    for (var i = 0; i < n; i++) for (var j = 0; j < d; j++) K.later(cellEl('E', i, j), 250 + i * 170 + j * 22);
  };

  ANIM.Q = function () { flowColumns('WQ', 'Q', M.WQ, M.Q); };
  ANIM.K = function () { flowColumns('WK', 'K', M.WK, M.K); };

  // V = E: every cell of E flies up to its place in V
  ANIM.V = function () {
    for (var i = 0; i < n; i++) for (var f = 0; f < d; f++) {
      var v = M.E[i][f];
      K.flyChip(String(v), chipCls(v, 'feat'), G.cell('E', i, f), G.cell('V', i, f), 1000,
        120 + i * 200 + f * 25, K.hold(cellEl('V', i, f)), 150);
    }
  };

  // K turns on its side: cell (i, s) of K flies to cell (s, i) of K^T
  ANIM.KT = function () {
    for (var i = 0; i < n; i++) for (var s = 0; s < k; s++) {
      var v = M.K[i][s];
      K.flyChip(String(v), chipCls(v, 'k'), G.cell('K', i, s), G.cell('KT', s, i), 800,
        120 + i * 140 + s * 50, K.hold(cellEl('KT', s, i)), 30);
    }
  };

  // one inner product: the query's entries and the key's entries fly into the formula, slot by
  // slot, then the result flies into S
  function animScore(i, j) {
    var sp = S.workSpans, t = 100;
    for (var s = 0; s < k; s++) {
      var q = M.Q[i][s], kv = M.KT[s][j];
      K.flyChip(String(q), chipCls(q, 'q'), G.cell('Q', i, s), rect(sp['q' + (s + 1)]), 600, t,
        K.hold(sp['q' + (s + 1)]), 60);
      K.flyChip(String(kv), chipCls(kv, 'k'), G.cell('KT', s, j), rect(sp['k' + (s + 1)]), 600, t + 160,
        K.hold(sp['k' + (s + 1)]), 60);
      t += 320;
    }
    var res = K.hold(sp.res);
    K.wait(t + 500, function () { res(); K.flash(sp.res); });
    var r = M.S[i][j];
    K.flyChip(String(r), chipCls(r, 's'), rect(sp.res), G.cell('S', i, j), 600, t + 900,
      landed(K.hold(cellEl('S', i, j)), cellEl('S', i, j)), 50);
  }
  W.forEach(function (w, j) {
    ANIM['score-' + W[A] + '-' + w] = function () { animScore(A, j); };
  });

  // a whole row of scores: its formulas appear one after another, and each result flies into S
  function animRow(i) {
    var sp = S.workSpans;
    Array.prototype.slice.call(S.work.querySelectorAll('.wline')).forEach(function (l, j) { K.later(l, 120 + j * 260); });
    W.forEach(function (w, j) {
      var r = M.S[i][j];
      K.flyChip(String(r), chipCls(r, 's'), rect(sp['res' + j]), G.cell('S', i, j), 600, 120 + n * 260 + 300 + j * 160,
        landed(K.hold(cellEl('S', i, j)), cellEl('S', i, j)), 40);
    });
  }
  OTHERS.forEach(function (i) {
    ANIM['scores-' + W[i]] = function () { animRow(i); };
  });

  // a row of S V: the scores fly from S beside the rows of V and into the formula, then the rows
  // of V that count fly down into the row of S V
  function animSV(i) {
    var sp = S.workSpans, j, f;
    for (j = 0; j < n; j++) {
      var v = M.S[i][j], key = U.svKey(i, j, false);
      K.flyChip(String(v), chipCls(v, 's'), G.cell('S', i, j), scoreRect(j), 650, 100 + j * 110,
        K.hold(S.scoreCells[j].cell), 50);
      K.flyChip(String(v), chipCls(v, 's'), G.cell('S', i, j), rect(sp[key]), 750, 300 + j * 110,
        K.hold(sp[key]), 70);
    }
    var holds = [];
    for (f = 0; f < d; f++) holds.push(K.hold(cellEl('SV', i, f)));
    var counting = [];
    for (j = 0; j < n; j++) if (M.S[i][j]) counting.push(j);
    if (!counting.length) { holds.forEach(function (h) { K.wait(1500, h); }); return; }
    counting.forEach(function (r, q) {
      for (var ff = 0; ff < d; ff++) {
        var val = M.V[r][ff], last = q === counting.length - 1;
        K.flyChip(String(val), chipCls(val, 'feat'), G.cell('V', r, ff), G.cell('SV', i, ff), 700,
          1500 + q * 500 + ff * 35, last ? landed(holds[ff], M.SV[i][ff] ? cellEl('SV', i, ff) : null) : null, 26);
      }
    });
  }
  ANIM['sv-' + W[A]] = function () { animSV(A); };
  ANIM['sv-' + W[B]] = function () { animSV(B); };

  // the adjectives: their scores fly into their formulas, and the rows of V they count (their own)
  // fly into their rows of S V
  ANIM['sv-adjectives'] = function () {
    var sp = S.workSpans;
    ADJ.forEach(function (i, t) {
      var j, f, t0 = t * 500;
      for (j = 0; j < n; j++) {
        var v = M.S[i][j], key = U.svKey(i, j, true);
        K.flyChip(String(v), chipCls(v, 's'), G.cell('S', i, j), rect(sp[key]), 700, 100 + t0 + j * 90,
          K.hold(sp[key]), 60);
      }
      var holds = [];
      for (f = 0; f < d; f++) holds.push(K.hold(cellEl('SV', i, f)));
      var counting = [];
      for (j = 0; j < n; j++) if (M.S[i][j]) counting.push(j);
      if (!counting.length) { holds.forEach(function (h) { K.wait(1300 + t0, h); }); return; }
      counting.forEach(function (r, q) {
        for (var ff = 0; ff < d; ff++) {
          var val = M.V[r][ff], last = q === counting.length - 1;
          K.flyChip(String(val), chipCls(val, 'feat'), G.cell('V', r, ff), G.cell('SV', i, ff), 700,
            1300 + t0 + q * 400 + ff * 35, last ? landed(holds[ff], M.SV[i][ff] ? cellEl('SV', i, ff) : null) : null, 26);
        }
      });
    });
  };

  ANIM.read = function () {
    S.reads.forEach(function (r, t) { K.later(r.box, 150 + t * 350); });
  };

  function animate(st) {
    var f = ANIM[st.cur];
    if (f) f(st);
  }

  AW.steps = { build: build, render: render, animate: animate, scene: S };
})();
