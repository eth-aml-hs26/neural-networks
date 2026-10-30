/* reveal.js : the eight screens after the closer.  Each is a function that
 * returns HTML; game.js wraps it in the page and the Continue button.
 *
 *   1  You have been running attention.      the score, and query / keys named
 *   2  The map you were drawing.             the lit grid, and the picture sums
 *   3  A word is a row of features.          the table, 8 words x 9 features
 *   4  Where that map comes from.            a query and a key for every word,
 *                                            on the four kind features
 *   5  Attention is one multiplication.      Q Kt = scores, two inner products,
 *                                            the reading
 *   6  Each thing adds what it attended to.  own row + values = new row, as
 *                                            numbers and as pictures; the formula
 *   7  The one you could not read.           the closer's tie, and position
 *   8  Wuggish in one slide.                 the glosses, the first English
 *
 * Nothing here is drawn by hand.  The lit grid of screen 2 comes from the
 * lexicon's `nouns` lists; every row, vector, product and new row comes from
 * js/vectors.js, which computes them from the lexicon's features.  So if the
 * vocabulary or the features change, every screen follows, and
 * scripts/check-vectors.js checks the numbers against the item bank.
 *
 * Two kinds of label, kept apart on purpose (AML, 2026-10-30, after a CSCS
 * participant found tokens and features blurred): a Wuggish WORD is set in
 * the game's serif (class "w"), a FEATURE in small capitals (class "ft").
 * Every column of every table is a feature or a word of a sentence; no
 * column is named after a word that it stands for.
 */
(function () {
  'use strict';
  const L = window.LEXICON, A = window.ART, V = window.VECTORS;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function w(word) { return `<span class="w">${esc(word)}</span>`; }
  function ft(name) { return `<span class="ft">${esc(name)}</span>`; }
  // ['a', 'b', 'c'] -> 'a, b and c'
  function and(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  function findItem(id) {
    for (const les of window.ITEMS.lessons) for (const it of les.items) if (it.id === id) return it;
    return null;
  }
  function findKind(kind) {
    for (const les of window.ITEMS.lessons) for (const it of les.items) if (it.kind === kind) return it;
    return null;
  }
  // the last unambiguous multi-object item the player solved before the
  // double and the closer, found by kind so that editing the bags cannot
  // break the reveal: the sentence of screens 2 and 6
  function lastFlip() {
    let last = null;
    for (const les of window.ITEMS.lessons) for (const it of les.items) if (it.kind === 'flip') last = it;
    return last;
  }

  // adjectives list the NOUN WORDS they may attach to, e.g. ['snaak', 'kat']
  function fits(noun, adj) {
    return L.adjectives[adj].nouns.indexOf(noun) >= 0;
  }
  function nounsIn(bag) {
    // in layout order: cat, chair, snake become kat, chaar, snaak
    const order = A.OBJECTS;
    return bag.filter(x => L.nouns[x]).sort((a, b) => order.indexOf(L.nouns[a].object) - order.indexOf(L.nouns[b].object));
  }
  function adjsIn(bag) { return bag.filter(x => L.adjectives[x]); }

  // a thing drawn small, with the looks that are switched on
  function thumb(noun, flags, px) {
    const sc = {}; sc[L.nouns[noun].object] = flags || {};
    return A.scene(sc, px, { fit: true });
  }
  // the art flags of the looks a row says yes to: stripes -> striped
  function flagsOf(v) {
    const f = {};
    for (const a in L.adjectives) if (v[V.FEATURES.indexOf(L.adjectives[a].feature)]) f[L.adjectives[a].flag] = true;
    return f;
  }

  /* ==== screen 2, unchanged since BMAI ================================== */

  function map(bag) {
    const nouns = nounsIn(bag), adjs = adjsIn(bag);
    let h = '<div class="map"><table><tr><th class="axis"></th>' +
      adjs.map(a => `<th>${esc(a)}</th>`).join('') + '</tr>';
    for (const n of nouns) {
      h += `<tr><th class="q">${esc(n)}</th>` +
        adjs.map(a => `<td class="${fits(n, a) ? 'lit' : 'dim'}"></td>`).join('') + '</tr>';
    }
    h += '</table><div class="axis" style="margin-top:8px">down the side, the words that ask; along the top, the words they ask</div></div>';
    return h;
  }

  // one line per thing of the answer: plain thing + its layers = the picture
  function sums(item, px) {
    px = px || 130;
    const answer = item.options.filter(o => o.correct)[0].scene;
    let h = '';
    for (const obj of A.OBJECTS) {
      if (!answer[obj]) continue;
      const noun = Object.keys(L.nouns).filter(n => L.nouns[n].object === obj)[0];
      const layers = Object.keys(L.adjectives).filter(a => answer[obj][L.adjectives[a].flag]);
      const plain = {}; plain[obj] = {};
      const full = {}; full[obj] = answer[obj];
      h += `<div class="sum">${A.scene(plain, px, { fit: true })}` +
        (layers.length ? layers.map(a => `<span class="op">+</span><span class="layer">${esc(a)}</span>`).join('') : '<span class="op">+</span><span class="layer muted">nothing</span>') +
        `<span class="op">=</span>${A.scene(full, px, { fit: true })}<span class="muted">${esc(noun)}</span></div>`;
    }
    return h;
  }

  /* ==== the tables ======================================================
   * ftable: one table on a list of features (all nine, or the four kinds),
   * one row per entry { v, label, op, thumb, note, cls }.  Its columns: an
   * operator (+, =) when a row has one, a thumbnail when a row has one, the
   * label, one boxed cell per feature, and a note when a row has one.  With
   * both groups present, a gap separates the kind features from the look
   * features and a row above names the two groups.  o.questions prints each
   * feature's question under its name.  The visual box of a cell is an inner
   * <i>, because a <td> stretches to its row (see CLAUDE.md).
   */
  function ftable(rows, o) {
    o = o || {};
    const feats = o.features || V.FEATURES;
    const nk = feats.filter(f => V.KINDS.indexOf(f) >= 0).length;
    const nl = feats.length - nk;
    const split = nk > 0 && nl > 0;
    const hasOp = rows.some(r => r.op), hasThumb = rows.some(r => r.thumb), hasNote = rows.some(r => r.note);
    const before = (hasOp ? 1 : 0) + (hasThumb ? 1 : 0) + 1;
    const gap = (j, tag) => (split && j === nk ? `<${tag} class="gap"></${tag}>` : '');
    let h = `<div class="tablewrap"><table class="vtab ftab${o.cls ? ' ' + o.cls : ''}">`;
    if (split) {
      h += `<tr class="grp"><th colspan="${before}"></th><th colspan="${nk}"><span>what kind of thing</span></th>` +
        `<th class="gap"></th><th colspan="${nl}"><span>how it looks</span></th>${hasNote ? '<th></th>' : ''}</tr>`;
    }
    h += `<tr class="heads"><th colspan="${before}"></th>` +
      feats.map((f, j) => gap(j, 'th') + `<th class="fh">${ft(f)}` +
        (o.questions ? `<span class="qn">${esc(V.QUESTION[f])}</span>` : '') + '</th>').join('') +
      (hasNote ? '<th></th>' : '') + '</tr>';
    for (const r of rows) {
      // the line of a written sum, unbroken across the cells, above the total
      if (/\btotal\b/.test(r.cls || '')) {
        h += `<tr class="rule"><td colspan="${before}"></td><td class="ruled" colspan="${feats.length + (split ? 1 : 0)}"></td>` +
          (hasNote ? '<td></td>' : '') + '</tr>';
      }
      h += `<tr class="${r.cls || ''}">` +
        (hasOp ? `<td class="opc">${r.op || ''}</td>` : '') +
        (hasThumb ? `<td class="thumb">${r.thumb || ''}</td>` : '') +
        `<th class="wlab">${r.label}</th>` +
        r.v.map((x, j) => gap(j, 'td') + `<td class="n"><i class="${x ? 'one' : 'zero'}">${x}</i></td>`).join('') +
        (hasNote ? `<td class="vnote">${r.note || ''}</td>` : '') + '</tr>';
    }
    return h + '</table></div>';
  }

  // a vector inline in prose, as a strip of cells
  function vec(v) {
    return '<span class="vec">' + v.map(x => `<i class="${x ? 'one' : 'zero'}">${x}</i>`).join('') + '</span>';
  }

  // One matrix.  o.rowKind and o.colKind say whether the labels are words
  // ('w', the default) or features ('ft'); every column label is set on its
  // side, so that a label of either kind sits above one 30 px cell and
  // Q x Kt = scores fits one line.  o.lit(i, j) marks a cell; o.fadedRow(i)
  // and o.fadedCol(j) push a whole all-zero row or column back, so the zeros
  // are on screen for honesty without competing with the numbers that carry
  // the point.
  function mx(cells, rowLabels, colLabels, o) {
    o = o || {};
    const lab = (kind, x) => (kind === 'ft' ? ft(x) : w(x));
    const cold = j => (o.fadedCol && o.fadedCol(j) ? ' faded' : '');
    let h = `<table class="mx${o.cls ? ' ' + o.cls : ''}">`;
    h += '<tr><th class="corner"></th>' + colLabels.map((c, j) =>
      `<th class="col vert${cold(j)}">${lab(o.colKind, c)}</th>`).join('') + '</tr>';
    cells.forEach((row, i) => {
      h += `<tr class="${o.fadedRow && o.fadedRow(i) ? 'faded' : ''}">` +
        `<th class="rowlab">${lab(o.rowKind, rowLabels[i])}</th>` +
        row.map((x, j) => `<td class="${o.lit && o.lit(i, j) ? 'hot' : ''}${cold(j)}">${x}</td>`).join('') + '</tr>';
    });
    return h + '</table>';
  }
  function mxbox(name, table, cls) {
    return `<div class="mxbox${cls ? ' ' + cls : ''}"><div class="mxname">${name}</div>${table}</div>`;
  }

  // "kat . streept = (1 1 0 0) . (1 0 0 0) = 1x1 + 1x0 + 0x0 + 0x0 = 1"
  function worked(a, b) {
    const q = V.query(a), k = V.key(b), terms = q.map((x, i) => `${x}&times;${k[i]}`).join(' + ');
    const both = V.on(q.map((x, i) => x * k[i]), V.KINDS);
    return `<p class="worked">${w(a)} <span class="op">&middot;</span> ${w(b)}
      <span class="op">=</span> ${vec(q)} <span class="op">&middot;</span> ${vec(k)}
      <span class="op">=</span> ${terms} <span class="op">=</span> <b>${V.dot(q, k)}</b>
      <span class="why">${both.length ? 'they share ' + and(both.map(ft)) : 'they share no feature'}</span></p>`;
  }

  /* ==== the screens ===================================================== */

  function screen1(stats) {
    const played = stats && stats.total ? `You read ${stats.correct} of ${stats.total} sentences right at first sight` +
      (stats.minutes != null ? `, in about ${stats.minutes} minute${stats.minutes === 1 ? '' : 's'}.` : '.') : '';
    return `<div class="reveal"><h2>You have been running attention.</h2>
      <p class="lead">${played}</p>
      <p class="lead">Every time you took a word like ${w('wudden')} and asked which thing it belonged to, you did what a transformer does with every word of every sentence it reads. The word that asks is called the <b>query</b>. The words it asks are the <b>keys</b>.</p></div>`;
  }

  function screen2() {
    const item = lastFlip();
    return `<div class="reveal"><h2>The map you were drawing.</h2>
      <p class="lead">A sentence you solved a minute ago: ${item.bag.map(w).join(' ')}. Each thing asks every other word "are you mine?". A dot where the answer is yes.</p>
      ${map(item.bag)}
      <p class="lead" style="margin-top:22px">Then each thing becomes its plain self plus whatever it attended to. That sum is the picture you tapped. The layers are the <b>values</b>.</p>
      ${sums(item)}</div>`;
  }

  // 3: the embedding table, the words as rows and the features as columns
  function screenTable() {
    const rows = V.WORDS.map(x => ({ v: V.row(x), label: w(x), thumb: V.isNoun(x) ? thumb(x, {}, 60) : '' }));
    const n0 = V.NOUNS[0];
    return `<div class="reveal"><h2>A word is a row of features.</h2>
      <p class="lead">A transformer never sees the pictures. To it, every word is a row of numbers, its <b>embedding</b>. Here each row answers nine yes-or-no questions about a thing, the <b>features</b>: 1 for yes, 0 for no.</p>
      ${ftable(rows, { questions: true, cls: 'big' })}
      <p class="lead" style="margin-top:20px">The columns are the features, questions you can ask about any thing. The rows are the words: ${w(n0)} is the row that says yes to ${and(V.on(V.row(n0)).map(ft))}. Four features say what kind of thing it is, five say how it looks, and each changing word says yes to one look.</p>
      <p class="small">A real model learns its rows from text, with hundreds of columns, and its features have no names. These rows are written by hand so that we can read them.</p></div>`;
  }

  // 4: a query and a key for every word, on the four kind features.  Every
  // word carries both; the all-zero rows are FADED, never dropped (BMAI,
  // 2026-09-16: queries are no noun thing and keys no adjective thing).
  function screenVectors() {
    const qrows = V.WORDS.map(x => ({
      v: V.query(x), label: w(x), thumb: V.isNoun(x) ? thumb(x, {}, 46) : '',
      note: V.isAdj(x) ? 'asks nothing' : '', cls: V.isAdj(x) ? 'faded' : '',
    }));
    const owners = kind => V.NOUNS.filter(n => L.nouns[n].kinds.indexOf(kind) >= 0);
    const krows = V.WORDS.map(x => {
      let note = 'offers nothing';
      if (V.isAdj(x)) {
        const kind = L.adjectives[x].fits;
        note = owners(kind).length > 1 ? `fits any ${ft(kind)}` : '';
      }
      return { v: V.key(x), label: w(x), note, cls: V.isNoun(x) ? 'faded' : '' };
    });
    const grammar = and(V.ADJS.map(a => `<span class="lookkind">${ft(L.adjectives[a].feature)} &rarr; ${ft(L.adjectives[a].fits)}</span>`));
    const shared = V.ADJS.filter(a => owners(L.adjectives[a].fits).length > 1)[0];
    const sk = shared && L.adjectives[shared].fits;
    const n0 = V.NOUNS[0];
    return `<div class="reveal"><h2>Where that map comes from.</h2>
      <p class="lead">You drew that grid by knowing what the words mean. A transformer gets it from the rows. Every word turns its row into two short vectors on the four kind features: a <b>query</b>, what it asks for, and a <b>key</b>, what it offers.</p>
      <div class="vecpanels">
        <div class="vpanel"><h3>Queries, what a word asks for</h3>
          ${ftable(qrows, { features: V.KINDS })}
          <p class="axis">A thing asks with what kind of thing it is: ${w(n0)} asks for ${and(L.nouns[n0].kinds.map(ft))}. A changing word is no thing, so its query is all zeros.</p>
        </div>
        <div class="vpanel"><h3>Keys, what a word offers</h3>
          ${ftable(krows, { features: V.KINDS })}
          <p class="axis">A changing word offers the kind of thing its look goes with: ${grammar}. A thing offers nothing, so its key is all zeros.</p>
        </div>
      </div>
      ${shared ? `<p class="lead" style="margin-top:22px">${w(shared)} offers ${ft(sk)}, and ${and(owners(sk).map(w))} both ask for ${ft(sk)}. Hold on to that: it is the whole reason one sentence in this game could not be read.</p>` : ''}
      <p class="small">In a real model the query and the key are the row times two matrices of learned weights, they have many more entries, and no word's query or key is all zeros. The zeros here are this game's world stripped to its bones. The idea is this one.</p></div>`;
  }

  // 5: Q times K transposed, every word a row of Q and a column of K
  function screenMatmul() {
    const WORDS = V.WORDS;
    const Q = WORDS.map(V.query);                  // 8 x 4
    const Kt = V.transpose(WORDS.map(V.key));      // 4 x 8, K transposed
    const S = V.matmul(Q, Kt);                     // 8 x 8
    const isNoun = i => V.isNoun(WORDS[i]);

    const reading = V.ADJS.map(a => {
      const hi = V.NOUNS.filter(n => V.score(n, a) > 0);
      const lo = V.NOUNS.filter(n => V.score(n, a) === 0);
      return `<tr class="${hi.length > 1 ? 'shared' : ''}"><th>${w(a)}</th>
        <td class="hi">1 with ${and(hi.map(w))}</td>
        <td class="lo">0 with ${lo.length ? and(lo.map(w)) : 'nothing'}</td>
        <td class="mark">${hi.length > 1 ? 'two things at once' : ''}</td></tr>`;
    }).join('');
    const n0 = V.NOUNS[0];
    const yes = V.ADJS.filter(a => V.score(n0, a) > 0 && V.NOUNS.filter(n => V.score(n, a) > 0).length > 1)[0] ||
      V.ADJS.filter(a => V.score(n0, a) > 0)[0];
    const no = V.ADJS.filter(a => V.score(n0, a) === 0)[0];

    return `<div class="reveal"><h2>Attention is one multiplication.</h2>
      <p class="lead">Stack every word's query into a matrix <b>Q</b> and every word's key into <b>K</b>. Multiply Q by K transposed and you get a score for every pair of words at once. Each score is one query and one key multiplied feature by feature and added up: their inner product.</p>
      <div class="matmul">
        ${mxbox('Q &nbsp;<span class="dim">queries</span>',
          mx(Q, WORDS, V.KINDS, { cls: 'compact', colKind: 'ft', lit: (i, j) => Q[i][j] > 0, fadedRow: i => !isNoun(i) }))}
        <span class="op">&times;</span>
        ${mxbox('K<sup>T</sup> &nbsp;<span class="dim">keys</span>',
          mx(Kt, V.KINDS, WORDS, { cls: 'compact', rowKind: 'ft', lit: (i, j) => Kt[i][j] > 0, fadedCol: isNoun }), 'mid')}
        <span class="op">=</span>
        ${mxbox('scores',
          mx(S, WORDS, WORDS, { cls: 'compact', lit: (i, j) => S[i][j] > 0, fadedRow: i => !isNoun(i), fadedCol: isNoun }))}
      </div>
      <p class="small" style="margin-top:-10px">Faded is all zeros: the changing words ask nothing, so their rows of Q are empty, and the things offer nothing, so their columns of K<sup>T</sup> are empty. Every word is still in the matrix.</p>
      ${worked(n0, yes)}
      ${worked(n0, no)}
      <p class="lead" style="margin-top:22px">A score is 1 when a query and a key share a feature, and 0 when they share none. Read the scores column by column and the whole grammar of Wuggish falls out of the arithmetic:</p>
      <table class="reading">${reading}</table></div>`;
  }

  // 6: the new row of a thing is its own row plus the values of the words it
  // scored 1 with, E + S V, on the sentence of screen 2.  The arithmetic keeps
  // the RAW scores, so every number stays 0 or 1; the paragraph under the
  // formula says what the softmax does instead (AML, 2026-10-30, replacing
  // BMAI's normalize(), which divided each row by its total).
  function screenValues() {
    const item = lastFlip();
    const bag = item.bag;                          // as the player saw it
    const lay = V.layer(bag);
    const nouns = nounsIn(bag);
    // the thing that actually attended to something
    const focal = nouns[Math.max(0, nouns.findIndex(n => bag.some(x => V.score(n, x) > 0)))];
    const i = bag.indexOf(focal);
    const picked = V.WORDS.filter(x => bag.indexOf(x) >= 0 && V.score(focal, x) > 0);   // in table order
    const rest = bag.filter(x => V.score(focal, x) === 0);                              // itself included

    const rows = [{ v: V.row(focal), label: w(focal), note: 'its own row' }]
      .concat(picked.map(x => ({ op: '+', v: V.value(x), label: `<span class="mul">1 &times;</span> ${w(x)}`, note: `the value of ${w(x)}` })))
      .concat(rest.length ? [{ op: '+', v: V.zeros(V.FEATURES.length), label: `<span class="mul">0 &times;</span> ${and(rest.map(w))}`, note: 'scored 0, adds nothing', cls: 'faded' }] : [])
      .concat([{ op: '=', v: lay.H[i], label: `new ${w(focal)}`, note: and(V.on(lay.H[i]).map(ft)), cls: 'total' }]);

    const share = { 2: 'half', 3: 'a third', 4: 'a quarter' }[picked.length];
    const shareText = share
      ? `With scores that stand out clearly, ${w(focal)} then takes ${share} of each of its words: ${and(picked.map(x => share + ' the ' + ft(L.adjectives[x].feature)))}, the same features at ${share} strength.`
      : 'With scores that stand out clearly, a thing with two words then takes half of each: the same features at half strength.';

    return `<div class="reveal"><h2>Each thing adds what it attended to.</h2>
      <p class="lead">Besides a query and a key, every word carries a third vector, its <b>value</b>: what it adds to a thing. A changing word's value is its look; a thing's value is all zeros. The new row of a thing is its own row plus the value of every word it scored 1 with.</p>
      ${ftable(rows, { cls: 'sumtab' })}
      <p class="small">${w(focal)} scored 1 with ${and(picked.map(w))} and 0 with every other word, itself included. Its own row comes back in at the top: a transformer adds a word's own row to whatever it attended to.</p>
      <p class="lead" style="margin-top:18px">Every thing of the sentence does the same at once. In pictures, these are the sums you saw before:</p>
      <div class="sums">${sums(item, 96)}</div>
      <p class="lead" style="margin-top:18px">Scores times values, for every word at once: that is the whole of attention.</p>
      <p class="formula">attention(Q, K, V) <span class="op">=</span> softmax<span class="paren">(</span><span class="frac"><span>Q K<sup>T</sup></span><span class="den">&radic;k</span></span><span class="paren">)</span> V</p>
      <p class="small">Q K<sup>T</sup> is the multiplication of the screen before, and V holds the values of this one. A real transformer also turns each row of scores into weights that add up to 1, with the <b>softmax</b>. ${shareText} The game keeps the raw scores, so that every number stays 0 or 1. The &radic;k, with k = ${V.KINDS.length} the length of a query and a key, keeps the scores from growing with the number of features.</p></div>`;
  }

  // 7: the closer, retold with the vectors: the tie is a number, the same
  // number twice, which is what makes it unbreakable without position
  function screenCloser() {
    const item = findKind('closer');
    const bag = item.bag;
    const here = V.NOUNS.filter(n => bag.indexOf(n) >= 0);
    const tie = adjsIn(bag).filter(a => here.filter(n => V.score(n, a) > 0).length > 1)[0];
    const both = here.filter(n => V.score(n, tie) > 0);
    const lay = V.layer(bag);
    const rows = both.map(n => {
      const h = lay.H[bag.indexOf(n)];
      return { v: h, label: `new ${w(n)}`, thumb: thumb(n, flagsOf(h), 64), note: and(V.on(h).map(ft)) };
    });
    return `<div class="reveal"><h2>The one you could not read.</h2>
      <p class="lead">${bag.map(w).join(' ')}. Run the same arithmetic on it.</p>
      ${both.map(n => worked(n, tie)).join('')}
      <p class="lead" style="margin-top:18px">${w(tie)} scores <b>1</b> against ${and(both.map(w))}: the same number, twice. So both take its value, and both come out with ${ft(L.adjectives[tie].feature)}:</p>
      ${ftable(rows)}
      <p class="lead" style="margin-top:18px">One ${w(tie)}, ${NUM[both.length]} ${esc(L.adjectives[tie].gloss)} things. Nothing in these rows can break the tie, because a bag of words has thrown the order away.</p>
      <p class="lead">A transformer breaks it by adding each word's <b>position</b> to its row, before the queries and keys are made. The same word in two places then gets two different rows, and the scores come out different. Word order comes back, as a feature the model can choose to use. This is called positional encoding.</p></div>`;
  }

  function screenGloss() {
    let rows = '';
    for (const n in L.nouns) rows += `<tr><td>${esc(n)}</td><td>${esc(L.nouns[n].gloss)}</td></tr>`;
    for (const a in L.adjectives) rows += `<tr><td>${esc(a)}</td><td>${esc(L.adjectives[a].gloss)}</td></tr>`;
    return `<div class="reveal"><h2>Wuggish in one slide.</h2>
      <p class="lead">Every word with its English gloss, at last.</p>
      <table class="gloss">${rows}</table>
      <p class="lead" style="margin-top:22px">Attention is what let you read scrambled Wuggish. It is what lets a language model read scrambled anything.</p>
      <p class="lead">The lecture continues.</p></div>`;
  }

  const SCREENS = [screen1, screen2, screenTable, screenVectors, screenMatmul, screenValues, screenCloser, screenGloss];

  window.REVEAL = {
    count: SCREENS.length,
    render(n, stats) {
      return SCREENS[n - 1](stats);
    },
    findItem, findKind,
  };
})();
