/* game.js : the engine.  Title, four lessons of word cards and items with
 * one retry per wrong item, the closer, then the reveal screens.
 *
 * URL:  #title | #lesson/N | #lesson/N/card/K | #lesson/N/item/K | #reveal/N
 *       ?seed=NNN   fixes every shuffle, for a reproducible run
 *       ?pick=wrong | ?pick=right   auto-answers every item (screenshots)
 *       ?pick=extra | ?pick=missing one wrong pick of that colour, yellow or
 *                   vermilion, and then nothing (screenshots of a wrong pick)
 *       ?auto=1     presses every Continue after 200 ms, up to the reveal, so
 *                   the page plays itself under a virtual clock (smoke test)
 *       ?dev=1      shows the fast-forward button (topbar, and the f key),
 *                   which jumps to the reveal with the game counted solved.
 *                   Off without it (AML, 2026-10-30): students open the page
 *                   from a zip on Moodle, with no query string at all
 * Keys: 1 to 4 answer, Enter or Space continue, left arrow looks back,
 *       right arrow steps forward again, t toggles the theme.
 *
 * A wrong pick never shows the answer.  The picture is struck out so it
 * cannot be picked twice, its comment says what is wrong with it, and the
 * player picks again until the picture is right.  Only an item's first pick
 * scores.
 *
 * State lives in S.  The browser's own history is not used: the hash is
 * replaced, never pushed, so Back leaves the page.  The game's own back
 * button walks S.hist, a stack of the HTML of every screen already left,
 * and shows it read-only while the live screen waits, hidden, in the DOM.
 */
(function () {
  'use strict';
  const L = window.LEXICON, D = window.ITEMS, A = window.ART, R = window.REVEAL;
  const params = new URLSearchParams(location.search);
  const rng = window.RNG.make(params.get('seed'));
  const autopick = params.get('pick');
  const auto = params.get('auto') === '1';   // press every Continue after 200 ms, up to the reveal
  const dev = params.get('dev') === '1';     // the fast-forward button and the f key, off unless ?dev=1
  const stage = document.getElementById('stage');
  stage.innerHTML = '<div id="live"></div><div id="review" hidden></div>';
  const live = document.getElementById('live');       // the screen being played
  const reviewEl = document.getElementById('review'); // a past screen, read-only
  const backbtn = document.getElementById('backbtn');
  const ffbtn = document.getElementById('ffbtn');
  const bar = document.getElementById('bar');
  const count = document.getElementById('count');
  document.getElementById('themebtn').addEventListener('click', () => window.THEME.toggle());

  const TOTAL = D.lessons.reduce((n, l) => n + l.items.length, 0);
  const SCORED = TOTAL - 1;  // the closer is played, and never scored
  const WORDS = Object.assign({}, L.nouns, L.adjectives);

  const HIST_MAX = 80;   // a ten-minute game never gets near this
  const S = {
    li: 0, queue: [], qi: 0,
    answered: 0, correct: 0,
    startedAt: null, speak: false,
    continueFn: null, pickFn: null,
    hist: [],                  // HTML of every screen already left, oldest first
    ri: null,                  // index into hist while looking back, else null
    savedContinue: null, savedPick: null,
    pendingAdvance: null,      // an auto-advance that came due while looking back
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function wordify(text) {
    return esc(text).replace(/\b([a-z]+)\b/g, m => WORDS[m] ? `<span class="w">${m}</span>` : m);
  }
  // the plain noun of a thing: cat -> kat (pussinbootz draws a cat too, in boots)
  function nounOf(object) {
    for (const n in L.nouns) if (L.nouns[n].object === object && !L.nouns[n].flags.length) return n;
    return object;
  }
  function flagsSpec(object, flags) {
    const sc = {}; sc[object] = {};
    (flags || []).forEach(f => { sc[object][f] = true; });
    return sc;
  }
  function setProgress() {
    bar.style.width = (100 * S.answered / TOTAL) + '%';
    count.textContent = S.answered + '/' + TOTAL;
  }
  function setHash(h) { history.replaceState(null, '', '#' + h); }
  function speak(words) {
    if (!S.speak || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(words.join(', '));
    u.lang = 'en-GB'; u.rate = 0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  // Renders a screen.  A [data-continue] button, if present, runs onContinue,
  // and so does Enter.
  function show(html, onContinue) {
    if (live.innerHTML) {
      S.hist.push(live.innerHTML);
      if (S.hist.length > HIST_MAX) S.hist.shift();
    }
    live.innerHTML = `<div class="screen">${html}</div>`;
    S.continueFn = onContinue || null;
    S.pickFn = null;
    const b = live.querySelector('[data-continue]');
    if (b && onContinue) b.addEventListener('click', onContinue);
    updateNav();
    window.scrollTo(0, 0);
    if (auto && onContinue && !/^reveal/.test(location.hash.slice(1))) setTimeout(onContinue, 200);
  }

  /* looking back.  Nothing in here touches the score: a past screen is a
   * copy of its saved HTML, inert, and the live screen is only hidden, so
   * its listeners and its half-answered state survive untouched. */
  function updateNav() {
    backbtn.hidden = S.ri === null && S.hist.length === 0;
    backbtn.disabled = S.ri === 0;
  }

  function enterReview(i) {
    if (i >= S.hist.length) return leaveReview();
    if (i < 0) return;
    if (S.ri === null) { S.savedContinue = S.continueFn; S.savedPick = S.pickFn; }
    S.ri = i;
    S.continueFn = null;
    S.pickFn = null;
    reviewEl.innerHTML =
      `<div class="reviewbar">
         <span class="small">Looking back &middot; screen ${i + 1} of ${S.hist.length + 1}</span>
         <span class="row">
           <button class="iconbtn" id="rprev">&larr; earlier</button>
           <button class="iconbtn" id="rnext">later &rarr;</button>
           <button class="btn quiet" id="rreturn">Back to the question</button>
         </span>
       </div>
       <div class="screen reviewed" inert>${S.hist[i]}</div>`;
    reviewEl.querySelector('#rprev').disabled = i === 0;
    reviewEl.querySelector('#rprev').addEventListener('click', () => enterReview(i - 1));
    reviewEl.querySelector('#rnext').addEventListener('click', () => enterReview(i + 1));
    reviewEl.querySelector('#rreturn').addEventListener('click', leaveReview);
    live.hidden = true;
    reviewEl.hidden = false;
    updateNav();
    window.scrollTo(0, 0);
  }

  function leaveReview() {
    if (S.ri === null) return;
    S.ri = null;
    reviewEl.hidden = true;
    reviewEl.innerHTML = '';
    live.hidden = false;
    S.continueFn = S.savedContinue;
    S.pickFn = S.savedPick;
    S.savedContinue = S.savedPick = null;
    updateNav();
    const go = S.pendingAdvance;
    if (go) { S.pendingAdvance = null; go(); }
  }

  function back() {
    if (S.ri === null) { if (S.hist.length) enterReview(S.hist.length - 1); }
    else if (S.ri > 0) enterReview(S.ri - 1);
  }
  function forward() { if (S.ri !== null) enterReview(S.ri + 1); }
  backbtn.addEventListener('click', back);

  /* fast forward: straight to the reveal, with the game counted as solved.
   * The button is in the topbar and f does the same, for rehearsing the
   * reveal without playing 12 items first.  Both exist only with ?dev=1:
   * BMAI and CSCS had them on by default and sent ?dev=0 to participants,
   * but the AML copy goes out as a zip whose index.html opens with no query,
   * and a student finding the button skips the whole point of the game. */
  function fastForward() {
    leaveReview();
    S.startedAt = S.startedAt || Date.now();
    S.answered = TOTAL; S.correct = SCORED;
    setProgress();
    reveal(1);
  }
  ffbtn.hidden = !dev;
  ffbtn.addEventListener('click', fastForward);

  /* title.  The counts are read off the data, so the line cannot go stale
   * again: it said "five short lessons" for weeks after the cut to four. */
  const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve'];
  const num = n => NUMBER[n] || String(n);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function title() {
    setHash('title');
    show(`<div class="center"><h1>Wuggish in ten minutes</h1><p class="sub">a language lesson</p>
      <p class="lead" style="margin:0 auto 6px">${cap(num(Object.keys(WORDS).length))} words, ${num(D.lessons.length)} short lessons, a language you have never seen. Pictures only. About ten minutes.</p>
      <p><button class="btn" data-continue>Start</button></p>
      <p class="small">Tap a picture to answer, or press <kbd>1</kbd> to <kbd>4</kbd>. <kbd>Enter</kbd> continues, <kbd>&larr;</kbd> looks back. <kbd>t</kbd> switches the theme.</p>
      <p class="small"><label><input type="checkbox" id="speak"> read the words aloud</label></p></div>`,
      () => startLesson(0));
    live.querySelector('#speak').addEventListener('change', e => { S.speak = e.target.checked; });
  }

  /* lessons */
  function lesson() { return D.lessons[S.li]; }

  function startLesson(li) {
    S.li = li;
    if (!S.startedAt) S.startedAt = Date.now();
    setHash('lesson/' + lesson().id);
    intro();
  }

  function intro() {
    const l = lesson();
    show(`<p class="muted">Lesson ${l.id} of ${D.lessons.length}</p><h2>${esc(l.name)}</h2>
      <p class="lead">${wordify(l.intro)}</p><button class="btn" data-continue>Continue</button>`,
      () => cards(0));
  }

  /* Three kinds of card (data/items.js):
   *   {word, object}                  a plain thing: kat, dukk, feesh
   *   {word, flag, objects}           a look, on every thing it fits, each plain
   *                                   and then with the look: bootet on kat and dukk
   *   {word, object, flags, same}     a thing with a look, beside the phrase that
   *                                   draws the same picture: pussinbootz and bootet kat */
  function cards(ci) {
    const l = lesson();
    if (ci >= l.cards.length) return beginItems(0);
    const c = l.cards[ci];
    let html;
    if (c.flag) {
      const pairs = c.objects.map(o => `<div class="pair">
        <div>${A.scene(flagsSpec(o), 230, { fit: true })}<div class="cap muted">${esc(nounOf(o))}</div></div>
        <div>${A.scene(flagsSpec(o, [c.flag]), 230, { fit: true })}<div class="cap">${esc(c.word)} ${esc(nounOf(o))}</div></div></div>`);
      html = `<div class="wordcard"><p class="word">${esc(c.word)}</p><div class="pairs">${pairs.join('')}</div></div>`;
    } else if (c.same) {
      html = `<div class="wordcard same"><p class="word">${esc(c.word)}</p>
        ${A.scene(flagsSpec(c.object, c.flags), 300, { fit: true })}
        <p class="names"><span class="w">${esc(c.same)}</span><span class="eq">=</span><span class="w">${esc(c.word)}</span></p>
        <p class="small">one picture, two ways to say it</p></div>`;
    } else {
      html = `<div class="wordcard"><p class="word">${esc(c.word)}</p>${A.scene(flagsSpec(c.object), 300, { fit: true })}</div>`;
    }
    show(html + `<p class="center"><button class="btn" data-continue>Continue</button></p>
      <p class="center small">new word ${ci + 1} of ${l.cards.length}</p>`, () => cards(ci + 1));
    speak([c.word]);
  }

  function beginItems(startAt) {
    S.queue = lesson().items.map(it => ({ item: it, retry: false }));
    S.qi = startAt || 0;
    nextItem();
  }

  function nextItem() {
    if (S.qi >= S.queue.length) return lessonDone();
    renderItem(S.queue[S.qi]);
  }

  function renderItem(entry) {
    const it = entry.item;
    // a fresh order every time, with every adjective before its noun (it.before)
    const words = it.scramble ? rng.order(it.bag, it.before) : it.bag.slice();
    const opts = rng.shuffle(it.options);
    const chips = words.map(x => `<span class="chip" data-w="${esc(x)}">${esc(x)}</span>`).join('');
    const cards = opts.map((o, k) =>
      `<button class="opt" data-k="${k}"><span class="key">${k + 1}</span>${A.scene(o.scene, 300, { fit: true })}</button>`).join('');
    show(`<div class="item"><div class="bag">${chips}</div>
      <p class="prompt">${entry.retry ? 'Once more. ' : ''}Which picture?</p>
      <div class="options">${cards}</div>
      <div class="feedback" id="fb"></div>
      <div class="actions"><button class="btn" id="cont" hidden>Continue</button></div></div>`);
    speak(words);
    const buttons = Array.prototype.slice.call(live.querySelectorAll('.opt'));
    buttons.forEach(b => b.addEventListener('click', () => answer(entry, opts, buttons, parseInt(b.dataset.k, 10))));
    arm(entry, opts, buttons);
  }

  // (Re)arm the number keys and the screenshot auto-picker over the options
  // still in play.  Called again after every wrong pick, because a wrong pick
  // no longer ends the item.
  function arm(entry, opts, buttons) {
    S.pickFn = k => { if (buttons[k] && !buttons[k].disabled) answer(entry, opts, buttons, k); };
    if (!autopick) return;
    // ?pick=wrong answers wrong once and right after that, so the run ends.
    // ?pick=extra and ?pick=missing make one wrong pick of that colour (yellow,
    // or vermilion) and then stop, for screenshots of a wrong answer.
    let want;
    if (autopick === 'right') want = o => o.correct;
    else if (autopick === 'wrong') want = entry.tried ? (o => o.correct) : (o => !o.correct);
    else if (autopick === 'extra' && !entry.tried) want = o => o.diff === 'extra';
    else if (autopick === 'missing' && !entry.tried) want = o => !o.correct && o.diff !== 'extra';
    else return;
    setTimeout(() => {
      if (!S.pickFn) return;
      const k = opts.findIndex((o, i) => !buttons[i].disabled && want(o));
      if (k >= 0) S.pickFn(k);
    }, 60);
  }

  // Held back while the player is looking at an earlier screen.
  function advance() {
    const go = () => { S.qi++; nextItem(); };
    if (S.ri !== null) { S.pendingAdvance = go; return; }
    go();
  }

  function answer(entry, opts, buttons, k) {
    const it = entry.item, o = opts[k];
    const closer = it.kind === 'closer';
    const fb = live.querySelector('#fb'), cont = live.querySelector('#cont');
    S.pickFn = null;
    if (!entry.retry && !entry.scored) {   // only an item's first pick scores
      entry.scored = true;
      S.answered++;
      if (o.correct && !closer) S.correct++;
      setProgress();
    }

    if (!o.correct) {
      // Rule that picture out, say what is wrong with it, and pick again.
      // The answer is never shown: the player has to find it.
      entry.tried = true;
      // 'extra': the picture leaves nothing out, it only adds something the
      // sentence never said.  That reads yellow; a missing word reads vermilion.
      const added = o.diff === 'extra';
      buttons[k].disabled = true;
      buttons[k].classList.add('wrong');
      if (added) buttons[k].classList.add('added');
      fb.className = 'feedback bad' + (added ? ' added' : '');
      fb.innerHTML = wordify(o.feedback);
      // underline the words of the sentence that this picture gets wrong: the
      // option's `blame`, or else every word its comment names
      const named = {};
      (o.blame || o.feedback.match(/\b[a-z]+\b/g) || []).forEach(x => { if (WORDS[x]) named[x] = true; });
      live.querySelectorAll('.chip').forEach(c => c.classList.toggle('miss', !!named[c.dataset.w]));
      live.querySelector('.prompt').textContent = 'Not that one. Which picture?';
      if (!entry.retry && !entry.missed && !closer) S.queue.push({ item: it, retry: true });
      entry.missed = true;
      arm(entry, opts, buttons);
      return;
    }

    entry.tried = true;
    buttons.forEach(b => { b.disabled = true; });
    buttons[k].classList.add('correct');
    live.querySelectorAll('.chip').forEach(c => c.classList.remove('miss'));
    live.querySelector('.prompt').textContent = 'Which picture?';
    fb.className = 'feedback ok';
    if (closer) {
      opts.forEach((x, i) => { if (x.correct) buttons[i].classList.add('correct'); });
      fb.textContent = 'Both are right.';
      cont.hidden = false;
      S.continueFn = afterCloser;
      cont.addEventListener('click', S.continueFn);
      if (auto) setTimeout(S.continueFn, 200);
    } else {
      fb.textContent = entry.missed ? 'That is the one.' : 'Correct.';
      S.continueFn = null;
      setTimeout(advance, 900);
    }
  }

  function lessonDone() {
    const l = lesson();
    if (S.li + 1 >= D.lessons.length) return afterCloser();
    show(`<p class="muted">Lesson ${l.id} done</p><h2>${wordify(l.done)}</h2>
      <button class="btn" data-continue>Next lesson</button>`, () => startLesson(S.li + 1));
  }

  function afterCloser() {
    const closer = R.findKind('closer');
    show(`<p class="muted">The last one</p><h2>Both were right.</h2>
      <p class="lead">${wordify(closer.note)}</p><button class="btn" data-continue>Continue</button>`,
      () => reveal(1));
  }

  /* reveal */
  function reveal(n) {
    setHash('reveal/' + n);
    const stats = {
      correct: S.correct, total: S.answered ? SCORED : 0,
      minutes: S.startedAt ? Math.max(1, Math.round((Date.now() - S.startedAt) / 60000)) : null,
    };
    const html = R.render(n, stats);
    if (n < R.count) {
      show(html + `<p><button class="btn" data-continue>Continue</button></p>`, () => reveal(n + 1));
    } else {
      show(html + `<p><button class="btn quiet" data-continue>Play again</button></p>`,
        () => { history.replaceState(null, '', location.pathname + location.search); location.reload(); });
    }
  }

  /* keys */
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (dev && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); return fastForward(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); return back(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); return forward(); }
    if (e.key >= '1' && e.key <= '4' && S.pickFn) { S.pickFn(parseInt(e.key, 10) - 1); e.preventDefault(); }
    else if ((e.key === 'Enter' || e.key === ' ') && S.continueFn) { e.preventDefault(); S.continueFn(); }
  });

  /* routing */
  function route() {
    S.pendingAdvance = null;   // a hash change wins over a held auto-advance
    leaveReview();
    const h = location.hash.replace(/^#/, '');
    let m;
    if ((m = /^lesson\/(\d+)(?:\/(item|card)\/(\d+))?$/.exec(h))) {
      const li = D.lessons.findIndex(l => l.id === parseInt(m[1], 10));
      if (li < 0) return title();
      S.li = li;
      S.startedAt = S.startedAt || Date.now();
      S.answered = D.lessons.slice(0, li).reduce((n, l) => n + l.items.length, 0);
      setProgress();
      if (m[2] === 'item') beginItems(parseInt(m[3], 10) - 1);
      else if (m[2] === 'card') cards(parseInt(m[3], 10) - 1);
      else intro();
      return;
    }
    if ((m = /^reveal\/(\d+)$/.exec(h))) return reveal(Math.min(Math.max(parseInt(m[1], 10), 1), R.count));
    setProgress();
    title();
  }
  window.addEventListener('hashchange', route);
  route();
})();
