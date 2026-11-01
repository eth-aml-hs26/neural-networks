/* reveal.js : the eight screens after the closer, rebuilt on 2026-10-30 for
 * the new Wuggish of SPEC.md, and on 2026-10-31 for its cat, duck and fish.
 * Each is a function that returns HTML; game.js wraps it in the page and the
 * Continue button.
 *
 *   1  You have been computing attention. the score; query, key and value named
 *   2  The map you were drawing.          the lit grid of the running sentence,
 *                                         and the picture sums
 *   3  A word is a row of features.       the table, 11 words by 9 features in
 *                                         three groups, and how many words
 *                                         share each column
 *   4  Queries and keys.                  W^Q and W^K, and every word's query
 *                                         and key in slots 1 and 2
 *   5  Attention is one multiplication.   Q K^T = S for the running sentence,
 *                                         two inner products, the grammar
 *   6  Each thing adds what it read.      kat + bootet = the row of pussinbootz,
 *                                         feesh + flyin = the row of flyfeesh,
 *                                         E + S V, the formula, the softmax
 *   7  The one you could not read.        the closer: Puss in Boots and a duck
 *                                         in boots
 *   8  Wuggish in one slide.              the glosses
 *
 * Nothing here is drawn by hand.  The lit grid of screen 2 comes from the
 * answer the player tapped (the item's correct picture); every row, vector,
 * product and new row comes from js/vectors.js, which computes them from the
 * lexicon; every picture of a row comes from VECTORS.picture.  So if the
 * language changes, every screen follows, and scripts/check-vectors.js checks
 * the numbers against precompute/world.py and the item bank.
 *
 * Three kinds of label, kept apart on purpose (a CSCS participant found
 * tokens and features blurred): a Wuggish WORD is set in the game's serif
 * (class "w"), a FEATURE in small capitals (class "ft"), and a SLOT of a
 * query or a key by its number (class "sl").  No column is named after a
 * word it stands for, and no English gloss of a word appears before screen 8.
 */
(function () {
  'use strict';
  const L = window.LEXICON, A = window.ART, V = window.VECTORS;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function w(word) { return `<span class="w">${esc(word)}</span>`; }
  function ft(name) { return `<span class="ft">${esc(name)}</span>`; }
  function sl(n) { return `<span class="sl">${esc(n)}</span>`; }
  // ['a', 'b', 'c'] -> 'a, b and c'
  function and(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const GROUP_NAME = { has: 'what a thing has', goes: 'where a look goes', brings: 'what a look brings' };
  const fix = x => x.toFixed(2);

  /* ==== the items the reveal tells about ================================= */

  function allItems() {
    const out = [];
    for (const les of window.ITEMS.lessons) for (const it of les.items) out.push(it);
    return out;
  }
  function findItem(id) { return allItems().filter(it => it.id === id)[0] || null; }
  function findKind(kind) { return allItems().filter(it => it.kind === kind)[0] || null; }
  // the running sentence, the one the reveal and the attention deck compute
  function findRunning() { return allItems().filter(it => it.running)[0] || null; }

  function answerOf(item) { return item.options.filter(o => o.correct)[0].scene; }
  function nounsIn(bag) { return bag.filter(V.isNoun); }
  function adjsIn(bag) { return bag.filter(V.isAdj); }
  // the plain noun of a thing: kat for the cat
  function baseOf(object) { return V.BASES.filter(b => L.nouns[b].object === object)[0]; }

  /* ==== pictures ========================================================== */

  // the picture of any row: the thing its `has` features make, wearing the
  // looks its `brings` features say yes to
  function thumbRow(v, px) {
    const p = V.picture(v);
    if (!p) return '';
    const sc = {}; sc[p.object] = p.flags;
    return A.scene(sc, px, { fit: true });
  }
  function thumbWord(x, px) { return V.isNoun(x) ? thumbRow(V.row(x), px) : ''; }

  /* ==== the tables ======================================================
   * table(rows, o): one table with a column per entry of o.cols ({label, group,
   * q}), one row per entry { v, label, op, thumb, note, cls, plain }.  Its
   * columns: an operator (+, =) when a row has one, a thumbnail when a row has
   * one, the label, one boxed cell per column, and a note when a row has one.
   * Where the group of the columns changes, a narrow gap; with o.groups, a row
   * above names each group.  o.questions prints each column's question under
   * its name.  The visual box of a cell is an inner <i>, because a <td>
   * stretches to its row (CLAUDE.md).  A row with `plain` prints its numbers
   * without boxes (the counts of screen 3); a row with class `total` gets the
   * line of a written sum above it.
   */
  function table(rows, o) {
    const cols = o.cols;
    const starts = new Set();
    const groups = [];
    cols.forEach((c, j) => {
      if (!groups.length || groups[groups.length - 1].g !== c.group) {
        if (groups.length) starts.add(j);
        groups.push({ g: c.group, n: 0 });
      }
      groups[groups.length - 1].n++;
    });
    const hasOp = rows.some(r => r.op), hasThumb = rows.some(r => r.thumb), hasNote = rows.some(r => r.note);
    const before = (hasOp ? 1 : 0) + (hasThumb ? 1 : 0) + 1;
    const gap = (j, tag) => (starts.has(j) ? `<${tag} class="gap"></${tag}>` : '');
    let h = `<div class="tablewrap"><table class="vtab ftab${o.cls ? ' ' + o.cls : ''}">`;
    if (o.groups && groups.length > 1) {
      h += `<tr class="grp"><th colspan="${before}"></th>` +
        groups.map((g, i) => (i ? '<th class="gap"></th>' : '') +
          `<th colspan="${g.n}" class="g-${g.g}"><span>${GROUP_NAME[g.g]}</span></th>`).join('') +
        (hasNote ? '<th></th>' : '') + '</tr>';
    }
    h += `<tr class="heads"><th colspan="${before}">${o.corner || ''}</th>` +
      cols.map((c, j) => gap(j, 'th') + `<th class="fh">${c.label}` +
        (o.questions && c.q ? `<span class="qn">${esc(c.q)}</span>` : '') + '</th>').join('') +
      (hasNote ? '<th></th>' : '') + '</tr>';
    for (const r of rows) {
      if (/\btotal\b/.test(r.cls || '')) {
        h += `<tr class="rule"><td colspan="${before}"></td><td class="ruled" colspan="${cols.length + starts.size}"></td>` +
          (hasNote ? '<td></td>' : '') + '</tr>';
      }
      h += `<tr class="${r.cls || ''}">` +
        (hasOp ? `<td class="opc">${r.op || ''}</td>` : '') +
        (hasThumb ? `<td class="thumb">${r.thumb || ''}</td>` : '') +
        `<th class="wlab">${r.label}</th>` +
        r.v.map((x, j) => gap(j, 'td') + (r.plain ? `<td class="n cnt">${x}</td>`
          : `<td class="n"><i class="${x ? 'one' : 'zero'}">${x}</i></td>`)).join('') +
        (hasNote ? `<td class="vnote">${r.note || ''}</td>` : '') + '</tr>';
    }
    return h + '</table></div>';
  }
  // a table on the nine features (or some of them), grouped
  function ftable(rows, o) {
    o = o || {};
    const feats = o.features || V.FEATURES;
    return table(rows, Object.assign({}, o, {
      cols: feats.map(f => ({ label: ft(f), group: V.GROUP[f], q: V.QUESTION[f] })),
      groups: o.groups !== false,
    }));
  }
  // a table on the slots of a query or a key
  function stable(rows, o) {
    return table(rows, Object.assign({}, o || {}, {
      cols: V.SLOTS.map(s => ({ label: sl(s), group: 'slot' })),
      corner: '<span class="slothead">slot</span>',
      cls: 'slots' + (o && o.cls ? ' ' + o.cls : ''),
    }));
  }

  // a vector inline in prose, as a strip of cells
  function vec(v) {
    return '<span class="vec">' + v.map(x => `<i class="${x ? 'one' : 'zero'}">${x}</i>`).join('') + '</span>';
  }

  // One matrix.  o.rowKind and o.colKind say whether the labels are words
  // ('w', the default), features ('ft') or slots ('sl'); a word or a feature
  // above a column is set on its side, so that it sits above one 30 px cell
  // and Q x K^T = S fits one line.  o.lit(i, j) marks a cell; o.fadedRow(i)
  // and o.fadedCol(j) push an all-zero row or column back, so the zeros are on
  // screen for honesty without competing with the numbers that carry the point.
  function mx(cells, rowLabels, colLabels, o) {
    o = o || {};
    const lab = (kind, x) => (kind === 'ft' ? ft(x) : kind === 'sl' ? sl(x) : w(x));
    const cold = j => (o.fadedCol && o.fadedCol(j) ? ' faded' : '');
    const vert = o.colKind === 'sl' ? '' : ' vert';
    let h = `<table class="mx${o.cls ? ' ' + o.cls : ''}">`;
    h += '<tr><th class="corner"></th>' + colLabels.map((c, j) =>
      `<th class="col${vert}${cold(j)}">${lab(o.colKind, c)}</th>`).join('') + '</tr>';
    cells.forEach((row, i) => {
      h += `<tr class="${o.fadedRow && o.fadedRow(i) ? 'faded' : ''}">` +
        `<th class="rowlab">${lab(o.rowKind, rowLabels[i])}</th>` +
        row.map((x, j) => `<td class="${o.lit && o.lit(i, j) ? 'hot' : ''}${o.diag && i === j ? ' diag' : ''}${cold(j)}">${x}</td>`).join('') + '</tr>';
    });
    return h + '</table>';
  }
  function mxbox(name, tableHtml, cls) {
    return `<div class="mxbox${cls ? ' ' + cls : ''}"><div class="mxname">${name}</div>${tableHtml}</div>`;
  }

  // "kat . bootet = (1 0) . (1 0) = 1x1 + 0x0 = 1, they meet in slot 1"
  function worked(a, b, where) {
    const q = V.query(a), k = V.key(b), terms = q.map((x, i) => `${x}&times;${k[i]}`).join(' + ');
    const both = V.SLOTS.filter((s, i) => q[i] * k[i]);
    const why = both.length ? `they meet in slot ${and(both.map(sl))}` : 'they meet in no slot';
    return `<p class="worked">${w(a)} <span class="op">&middot;</span> ${w(b)}
      <span class="op">=</span> ${vec(q)} <span class="op">&middot;</span> ${vec(k)}
      <span class="op">=</span> ${terms} <span class="op">=</span> <b>${V.dot(q, k)}</b>
      <span class="why">${why}${where ? ', ' + where : ''}</span></p>`;
  }

  /* ==== screen 2: the map, from the answer the player tapped ============== */

  // does word a of the bag (a noun) take the look of word b (an adjective)?
  // Read off the answer picture: b's look is on a's thing, and a's own noun
  // does not already bring it.
  function took(item, a, b) {
    if (!V.isNoun(a) || !V.isAdj(b)) return false;
    const ans = answerOf(item), obj = L.nouns[a].object, flag = L.adjectives[b].flag;
    return !!(ans[obj] && ans[obj][flag]) && L.nouns[a].flags.indexOf(flag) < 0;
  }

  function map(item) {
    const bag = item.bag;
    let h = '<div class="map"><table><tr><th class="axis"></th>' + bag.map(x => `<th class="top">${w(x)}</th>`).join('') + '<th></th></tr>';
    bag.forEach(a => {
      const asks = V.isNoun(a);
      h += `<tr class="${asks ? '' : 'faded'}"><th class="q">${w(a)}</th>` +
        bag.map(b => `<td class="${took(item, a, b) ? 'lit' : 'dim'}"></td>`).join('') +
        `<td class="side">${asks ? '' : 'asks nothing'}</td></tr>`;
    });
    return h + '</table><div class="axis" style="margin-top:8px">down the side, the words that ask; along the top, the words they ask</div></div>';
  }

  // one line per thing of the answer: plain thing + the words it took = the picture
  function sums(item, px) {
    px = px || 120;
    const ans = answerOf(item);
    let h = '';
    for (const noun of nounsIn(item.bag)) {            // in the order of the sentence
      const obj = L.nouns[noun].object;
      const took_ = adjsIn(item.bag).filter(b => took(item, noun, b));
      const plain = {}; plain[obj] = {};
      L.nouns[noun].flags.forEach(f => { plain[obj][f] = true; });
      const full = {}; full[obj] = ans[obj];
      h += `<div class="sum">${A.scene(plain, px, { fit: true })}` +
        (took_.length ? took_.map(b => `<span class="op">+</span><span class="layer">${w(b)}</span>`).join('')
          : '<span class="op">+</span><span class="layer muted">nothing</span>') +
        `<span class="op">=</span>${A.scene(full, px, { fit: true })}</div>`;
    }
    return h;
  }

  /* ==== the screens ===================================================== */

  function screen1(stats) {
    const played = stats && stats.total ? `You read ${stats.correct} of ${stats.total} sentences right at first sight` +
      (stats.minutes != null ? `, in about ${stats.minutes} minute${stats.minutes === 1 ? '' : 's'}.` : '.') : '';
    const item = findRunning();
    const noun = nounsIn(item.bag)[0];
    const adj = adjsIn(item.bag).filter(b => took(item, noun, b))[0];
    return `<div class="reveal"><h2>You have been computing attention.</h2>
      <p class="lead">${played}</p>
      <p class="lead">Every time you took a thing like ${w(noun)} and asked which of the other words belonged to it, you did what a transformer does with every word of every sentence it reads. The word that asks is the <b>query</b>. The words it asks are the <b>keys</b>. And what a word hands over once it is found, like the look of ${w(adj)}, is its <b>value</b>.</p></div>`;
  }

  function screen2() {
    const item = findRunning();
    return `<div class="reveal"><h2>The map you were drawing.</h2>
      <p class="lead">A sentence you solved a minute ago: ${item.bag.map(w).join(' ')}. Each word asks every word of the sentence, &ldquo;do you belong to me?&rdquo; A dot where the answer is yes.</p>
      ${map(item)}
      <p class="lead" style="margin-top:22px">Then each thing becomes its plain self plus the look of the word it found. That sum is the picture you tapped. The looks it takes are the <b>values</b>.</p>
      ${sums(item)}</div>`;
  }

  // 3: the embedding table, the words as rows and the features as columns
  function screenTable() {
    const rows = V.WORDS.map(x => ({ v: V.row(x), label: w(x), thumb: thumbWord(x, 50) }));
    const counts = V.FEATURES.map((f, j) => V.WORDS.filter(x => V.row(x)[j]).length);
    rows.push({ v: counts, label: '<span class="cntlab">words with a 1</span>', plain: true, cls: 'count' });
    const most = V.FEATURES[counts.indexOf(Math.max.apply(null, counts))];
    const owners = f => V.WORDS.filter(x => V.row(x)[V.FEATURES.indexOf(f)]);
    const fewest = Math.min.apply(null, counts);
    return `<div class="reveal"><h2>A word is a row of features.</h2>
      <p class="lead">A transformer never sees the pictures. To it, every word is a row of numbers, its <b>embedding</b>. Here each row answers ${NUM[V.FEATURES.length]} yes-or-no questions, the <b>features</b>: 1 for yes, 0 for no.</p>
      ${ftable(rows, { questions: true, cls: 'big' })}
      <p class="lead" style="margin-top:20px">${NUM[V.WORDS.length].replace(/^./, c => c.toUpperCase())} words, ${NUM[V.FEATURES.length]} features. A word, a <b>token</b>, is a row. A feature is a column, and every column holds ${NUM[fewest]} 1s or more: ${ft(most)} is in ${and(owners(most).map(w))}. A feature is a question that several words answer with yes.</p>
      <p class="lead">The features come in three groups: ${and(V.GROUPS.map(g => GROUP_NAME[g] + ' (' + and(V.IN[g].map(ft)) + ')'))}.</p>
      <p class="small">A real model learns its rows from text, with hundreds of columns, and its features have no names. These rows are written by hand so that we can read them.</p></div>`;
  }

  // 4: W^Q and W^K, and every word's query and key in slots 1 and 2.  Every
  // word carries both; the all-zero rows are FADED, never dropped (BMAI,
  // 2026-09-16: queries are no noun thing and keys no adjective thing).
  function screenVectors() {
    const nz = v => v.some(x => x);
    const wq = V.FEATURES.map((f, i) => ({ v: V.W_Q[i], label: ft(f), cls: nz(V.W_Q[i]) ? '' : 'faded' }));
    const wk = V.FEATURES.map((f, i) => ({ v: V.W_K[i], label: ft(f), cls: nz(V.W_K[i]) ? '' : 'faded' }));
    // why a word asks or answers where it does: the features of its row that
    // have a row of the weights, each with the slot it sends a 1 to, e.g.
    // "legs -> 1, wings -> 2"
    const via = (x, W) => V.FEATURES.filter((f, i) => V.row(x)[i] && nz(W[i]))
      .map(f => `${ft(f)}&nbsp;&rarr;&nbsp;${V.SLOTS.filter((s, j) => W[V.FEATURES.indexOf(f)][j]).map(sl).join(' ')}`);
    const qrows = V.WORDS.map(x => ({
      v: V.query(x), label: w(x),
      note: nz(V.query(x)) ? via(x, V.W_Q).join(', ') : 'asks nothing', cls: nz(V.query(x)) ? '' : 'faded',
    }));
    const krows = V.WORDS.map(x => ({
      v: V.key(x), label: w(x),
      note: nz(V.key(x)) ? via(x, V.W_K).join(', ') : 'answers nothing', cls: nz(V.key(x)) ? '' : 'faded',
    }));
    // the slot each kind of thing asks in, and which looks answer there
    const asks = s => V.FEATURES.filter((f, i) => V.W_Q[i][s - 1]);
    const answers = s => V.FEATURES.filter((f, i) => V.W_K[i][s - 1]);
    const or = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' or ' + xs[xs.length - 1]);
    // a feature of where a look goes, said with its question: "feet, one that goes on the feet"
    const goes = f => `${ft(f)}, one that ${esc(V.QUESTION[f].replace(/\?$/, ''))}`;
    const lines = V.SLOTS.map(s => `in slot ${sl(s)} a thing with ${or(asks(s).map(ft))} asks, and a look with ${or(answers(s).map(goes))}, answers`);
    return `<div class="reveal"><h2>Queries and keys.</h2>
      <p class="lead">You drew that map by knowing what the words mean. A transformer gets it from the rows. Every word turns its row into two short vectors of k = ${V.K} numbers, in <b>slot 1</b> and <b>slot 2</b>: a <b>query</b>, what it asks for, and a <b>key</b>, what it answers with. Two blocks of weights do it: the query is the row times W<sup>Q</sup>, the key the row times W<sup>K</sup>.</p>
      <div class="vecpanels">
        <div class="vpanel"><h3>Queries, what a word asks for</h3>
          <div class="wpair">
            <div class="wblock"><div class="mxname">W<sup>Q</sup>, ${V.FEATURES.length} by ${V.K}</div>${stable(wq, { cls: 'wtab' })}</div>
            <div class="wblock"><div class="mxname">the query of every word</div>${stable(qrows)}</div>
          </div>
          <p class="axis">The things ask: ${ft(asks(1)[0])} asks in slot ${sl(1)}, ${and(asks(2).map(ft))} ask in slot ${sl(2)}. A thing's look adds nothing to its query, and an adjective has none of these features, so its query is all zeros.</p>
        </div>
        <div class="vpanel"><h3>Keys, what a word answers with</h3>
          <div class="wpair">
            <div class="wblock"><div class="mxname">W<sup>K</sup>, ${V.FEATURES.length} by ${V.K}</div>${stable(wk, { cls: 'wtab' })}</div>
            <div class="wblock"><div class="mxname">the key of every word</div>${stable(krows)}</div>
          </div>
          <p class="axis">The adjectives answer: ${ft(answers(1)[0])} answers in slot ${sl(1)}, ${ft(answers(2)[0])} in slot ${sl(2)}. A noun has neither feature, so its key is all zeros, also for a noun that brings a look.</p>
        </div>
      </div>
      <p class="lead" style="margin-top:22px">So ${lines.join('; ')}. The slots are numbered, because they belong to the queries and keys, apart from the ${NUM[V.FEATURES.length]} features.</p>
      <p class="small">In a real model the weights are learned, queries and keys have many more slots, and every word asks and answers a little. Here the weights are written by hand, so that every query and every key can be read.</p></div>`;
  }

  // 5: Q times K transposed for the running sentence
  function screenMatmul() {
    const item = findRunning();
    const bag = item.bag, lay = V.layer(bag), n = bag.length;
    const Kt = V.transpose(lay.K);
    const isNoun = i => V.isNoun(bag[i]);
    const noun = nounsIn(bag)[0], i0 = bag.indexOf(noun);
    const yes = bag.filter((x, j) => lay.S[i0][j] > 0)[0];                  // the word kat reads, bootet
    const no = adjsIn(bag).filter(x => V.score(noun, x) === 0)[0];        // an adjective it skips
    const rel = x => (bag.indexOf(x) < i0 ? 'the word above it' : bag.indexOf(x) === i0 + 1 ? 'the word after it' : 'a word after it');
    const below = lay.S.every((row, i) => row.every((s, j) => !s || j < i));
    const pairs = [];
    lay.S.forEach((row, i) => row.forEach((s, j) => { if (s) pairs.push(`${w(bag[i])} reads ${w(bag[j])}`); }));
    const reading = V.ADJS.map(a => {
      const hi = V.NOUNS.filter(x => V.score(x, a) > 0);
      const lo = V.NOUNS.filter(x => V.score(x, a) === 0);
      return `<tr><th>${w(a)}</th><td class="hi">1 with ${and(hi.map(w))}</td><td class="lo">0 with ${and(lo.map(w))}</td></tr>`;
    }).join('');
    return `<div class="reveal"><h2>Attention is one multiplication.</h2>
      <p class="lead">Stack the queries of the sentence into a block <b>Q</b> and its keys into <b>K</b>, one row per word. Q times K transposed gives a <b>score</b> for every pair of words at once: one query and one key, multiplied slot by slot and added up, their inner product.</p>
      <div class="matmul">
        ${mxbox(`Q, ${n} by ${V.K}`, mx(lay.Q, bag, V.SLOTS, { cls: 'compact', colKind: 'sl', lit: (i, j) => lay.Q[i][j] > 0, fadedRow: i => !isNoun(i) }))}
        <span class="op">&times;</span>
        ${mxbox(`K<sup>T</sup>, ${V.K} by ${n}`, mx(Kt, V.SLOTS, bag, { cls: 'compact', rowKind: 'sl', lit: (i, j) => Kt[i][j] > 0, fadedCol: isNoun }), 'mid')}
        <span class="op">=</span>
        ${mxbox(`S, ${n} by ${n}`, mx(lay.S, bag, bag, { cls: 'compact', diag: true, lit: (i, j) => lay.S[i][j] > 0, fadedRow: i => !isNoun(i), fadedCol: isNoun }))}
      </div>
      <p class="small" style="margin-top:-10px">Faded is all zeros: the adjectives ask nothing, so their rows of Q are empty, and the nouns answer nothing, so their columns of K<sup>T</sup> are empty. Every word is still in the blocks.</p>
      ${worked(noun, yes, rel(yes))}
      ${worked(noun, no, rel(no))}
      <p class="lead" style="margin-top:18px">S is the map you drew: ${and(pairs)}. ${below ? `Every 1 of S lies below the diagonal, the dashed cells, because every adjective stands before its noun: each noun reads words above it. A language model lets a row read only the rows above it, and here that mask would change nothing.` : ''}</p>
      <p class="lead">Run the same arithmetic over all ${NUM[V.WORDS.length]} words and the whole grammar of Wuggish falls out of it:</p>
      <table class="reading">${reading}</table></div>`;
  }

  // the sum of one noun of the running sentence: its own row, plus 1 x the
  // value of each word it scored 1 with, plus a faded 0 x for the rest, equals
  // its new row; and under it, the row of the dictionary it lands on, with
  // the same picture
  function sameRow(bag, noun, px) {
    const lay = V.layer(bag), i = bag.indexOf(noun);
    const read = bag.filter((x, j) => lay.S[i][j] > 0);
    const rest = bag.filter((x, j) => lay.S[i][j] === 0);           // itself included
    const H = lay.H[i], target = V.wordWithRow(H);
    const rows = [{ v: V.row(noun), label: w(noun), thumb: thumbRow(V.row(noun), px), note: 'its own row' }]
      .concat(read.map(x => ({ op: '+', v: V.value(x), label: `<span class="mul">1 &times;</span> ${w(x)}`, note: `the value of ${w(x)}` })))
      .concat(rest.length ? [{ op: '+', v: V.zeros(V.FEATURES.length), label: `<span class="mul">0 &times;</span> ${and(rest.map(w))}`, note: 'scored 0, adds nothing', cls: 'faded' }] : [])
      .concat([{ op: '=', v: H, label: `new ${w(noun)}`, thumb: thumbRow(H, px), note: and(V.on(H).map(ft)), cls: 'total same' }]);
    if (target && target !== noun) {
      rows.push({ op: '=', v: V.row(target), label: w(target), thumb: thumbRow(V.row(target), px), note: 'its row in the dictionary', cls: 'same dict' });
    }
    return { rows, read, target };
  }

  // 6: the new row of a thing is its own row plus the values of the words it
  // scored 1 with, E + S V, on the running sentence.  The arithmetic keeps the
  // RAW scores, so every number stays 0 or 1; the small print says what the
  // softmax does instead.
  function screenValues() {
    const item = findRunning();
    const bag = item.bag, lay = V.layer(bag);
    const nouns = nounsIn(bag);
    const first = sameRow(bag, nouns[0], 58), second = sameRow(bag, nouns[1], 44);
    const all = bag.map((x, i) => {
      const lands = V.wordWithRow(lay.H[i]);
      return {
        v: lay.H[i], label: V.isNoun(x) ? `new ${w(x)}` : w(x), thumb: V.isNoun(x) ? thumbRow(lay.H[i], 40) : '',
        note: lands === x ? 'unchanged' : lands ? `the row of ${w(lands)}` : 'a row of no word',
        cls: lands === x ? 'faded' : 'same',
      };
    });
    const i0 = bag.indexOf(nouns[0]);
    const s1 = V.softmax(lay.S[i0], 1), s9 = V.softmax(lay.S[i0], 9);
    const j0 = bag.indexOf(first.read[0]);
    const others = s1.filter((x, j) => j !== j0);
    const flat = others.every(x => fix(x) === fix(others[0]));
    return `<div class="reveal"><h2>Each thing adds what it read.</h2>
      <p class="lead">Besides a query and a key, every word carries a third vector, its <b>value</b>: the row times W<sup>V</sup>, which keeps ${and(V.FEATURES.filter((f, i) => V.W_V[i][i]).map(ft))}. So the value of ${w(first.read[0])} is ${and(V.on(V.value(first.read[0])).map(ft))}. The new row of a word is its own row plus the value of every word it scored 1 with.</p>
      ${ftable(first.rows, { cls: 'sumtab' })}
      <p class="lead punch">The new row of ${w(nouns[0])} is the row of ${w(first.target)}, the same ${NUM[V.FEATURES.length]} numbers and the same picture. A phrase and a word land on one row.</p>
      <p class="lead" style="margin-top:18px">${w(nouns[1])} does the same with ${and(second.read.map(w))}, and lands on the row of ${w(second.target)}:</p>
      ${ftable(second.rows, { cls: 'sumtab small-sum', groups: false })}
      <p class="lead" style="margin-top:18px">Every word of the sentence does it at once. In blocks: the new rows are E + S V, where E holds the rows the words came in with, and S V adds to each row the values that its row of S picks.</p>
      ${ftable(all, { cls: 'sumtab all', groups: false })}
      <p class="formula">new rows <span class="op">=</span> E <span class="op">+</span> softmax<span class="paren">(</span><span class="frac"><span>Q K<sup>T</sup></span><span class="den">&radic;k</span></span><span class="paren">)</span> V</p>
      <p class="small">Adding E back, the own row at the top of each sum, is the <b>residual connection</b> of a transformer. A real transformer also turns each row of scores into weights that add up to 1, with the <b>softmax</b>, after dividing each score by &radic;k, with k = ${V.K} the length of a query and a key. For ${w(nouns[0])} the weights come out ${fix(s1[j0])} for ${w(first.read[0])} and ${flat ? fix(others[0]) + ' for each other word' : and(others.map(fix))}; with W<sup>Q</sup> and W<sup>K</sup> three times larger a match scores 9, and ${w(first.read[0])} takes ${fix(s9[j0])} of the weight. The game keeps the raw scores, so that every number stays 0 or 1.</p></div>`;
  }

  // 7: the closer, retold with the vectors: the tie is a number, the same
  // number twice, which is what makes it unbreakable without position
  function screenCloser() {
    const item = findKind('closer');
    const bag = item.bag;
    const here = nounsIn(bag);
    const tie = adjsIn(bag).filter(a => here.filter(n => V.score(n, a) > 0).length > 1)[0];
    const both = here.filter(n => V.score(n, tie) > 0);
    const lay = V.layer(bag);
    const rows = both.map(n => {
      const h = lay.H[bag.indexOf(n)], lands = V.wordWithRow(h);
      return { v: h, label: `new ${w(n)}`, thumb: thumbRow(h, 60), note: lands ? `the row of ${w(lands)}` : 'a row of no word', cls: lands ? 'same' : '' };
    });
    const look = V.look(tie);
    // the noun whose new row is a word of the dictionary: kat lands on pussinbootz
    const landed = both.map(n => ({ noun: n, word: V.wordWithRow(lay.H[bag.indexOf(n)]) })).filter(x => x.word)[0];
    const ans = {};
    both.forEach(n => { const p = V.picture(lay.H[bag.indexOf(n)]); ans[p.object] = p.flags; });
    // the two pictures the game accepted, and the one attention draws, which
    // the game marked wrong
    const readings = item.options.filter(o => o.correct).map(o => o.scene);
    const trio = readings.map((sc, k) => `<figure class="pic">${A.scene(sc, 200, { fit: true })}<figcaption>${k ? 'or this one' : 'you could tap this one'}</figcaption></figure>`).join('') +
      `<span class="op"><span class="ar-r">&rarr;</span><span class="ar-d">&darr;</span></span><figure class="pic att">${A.scene(ans, 260, { fit: true })}<figcaption>attention draws this one</figcaption></figure>`;
    return `<div class="reveal"><h2>The one you could not read.</h2>
      <p class="lead">${bag.map(w).join(' ')}. Run the same arithmetic on it.</p>
      ${both.map(n => worked(n, tie)).join('')}
      <p class="lead" style="margin-top:18px">${w(tie)} scores <b>1</b> with ${and(both.map(w))}: the same number, twice. So both take its value, and both come out with ${ft(look)}:</p>
      ${ftable(rows, { cls: 'sumtab', groups: false })}
      <div class="closerpic">${trio}</div>
      <p class="lead" style="margin-top:14px">One ${w(tie)}, and ${NUM[both.length]} things with ${ft(look)}${landed ? ` (the new ${w(landed.noun)} is a ${w(landed.word)})` : ''}: a picture that neither reading means, the very picture the game marked wrong. Nothing in these rows can break the tie. ${w(tie)} stands before both nouns, and attention reads the words as a bag.</p>
      <p class="lead">A transformer adds each word's <b>position</b> to its row, before the queries and keys are made. Then the same word in two places gets two different rows, and a model can learn to use the order, for instance that an adjective goes with the noun right after it. This is called <b>positional encoding</b>.</p></div>`;
  }

  // 8: the glosses, and for each word with a look the phrase that lands on its row
  function screenGloss() {
    const phraseOf = n => {
      const flags = L.nouns[n].flags;
      if (!flags.length) return '';
      const adj = V.ADJS.filter(a => flags.indexOf(L.adjectives[a].flag) >= 0)[0];
      return `${w(adj)} ${w(baseOf(L.nouns[n].object))}`;
    };
    let rows = '';
    for (const n of V.NOUNS) {
      const ph = phraseOf(n);
      rows += `<tr><td class="gthumb">${thumbWord(n, 46)}</td><td class="gw">${w(n)}</td><td class="gl">${esc(L.nouns[n].gloss)}</td><td class="gp">${ph ? '= ' + ph : ''}</td></tr>`;
    }
    for (const a of V.ADJS) rows += `<tr><td class="gthumb"></td><td class="gw">${w(a)}</td><td class="gl">${esc(L.adjectives[a].gloss)}</td><td class="gp"></td></tr>`;
    return `<div class="reveal"><h2>Wuggish in one slide.</h2>
      <p class="lead">Every word with its English gloss, at last.</p>
      <table class="gloss">${rows}</table>
      <p class="lead" style="margin-top:22px">Attention is what let you find which word goes with which thing. It is how a language model reads every sentence it is given.</p>
      <p class="lead">The lecture continues.</p></div>`;
  }

  const SCREENS = [screen1, screen2, screenTable, screenVectors, screenMatmul, screenValues, screenCloser, screenGloss];

  window.REVEAL = {
    count: SCREENS.length,
    render(n, stats) {
      return SCREENS[n - 1](stats);
    },
    findItem, findKind, findRunning,
  };
})();
