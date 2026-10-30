/* Will it last? The show itself. Wires the seven pages together, in this
 * order:
 *
 *   0 title card     story: four cards     1 round 1: the rate
 *   2 round 2: the verdict    3 live coding    4 the code    5 the run
 *
 * The story has no digit of its own, so 0 to 5 keep naming the pages they
 * always did. Nothing is locked: the strip, the keys and the buttons go
 * anywhere.
 *   PageDown / PageUp (and presenter clickers)  always next / previous
 *   Right / Left arrows   next / previous, when no box or editor is being
 *                         typed in (an empty guess box counts as not typing)
 *   0 to 5                jump to that page, when not typing
 *   t   night or daylight studio        f   full screen
 *   Escape                leave a box or the editor
 *   Story: next and previous turn the cards first, then leave the story;
 *          space turns a card too
 *   Round 1: Enter checks a guess, Ctrl+Z (or Cmd+Z) takes the last one back
 *   Round 2: a and b lock the room's answer, space plays the month or
 *            pauses it, r goes back to day 17, e jumps to day 30
 *   Page 4: Enter runs.  Page 3: Ctrl+Enter runs.
 *   Page 5: space play or pause, s one step, r restart, e to the end
 *
 * Dev flags ride on the hash (see README.md), for example
 *   #page=1&guesses=0.1,0.3,0.2,0.15,0.18,0.175,0.177,0.1765
 *   #page=2&answer=b&done      #page=5&step=7&hover=4      #theme=light
 *   #page=story&card=3
 */
(function () {
  'use strict';

  var S = window.WillItLast;
  var UI = window.UI;
  var Views = window.Views;

  // The order the arrows walk. The ids are the pages' data-page.
  var ORDER = ['0', 'story', '1', '2', '3', '4', '5'];
  var KEY_THEME = 'willitlast.theme.v1';
  var root = document.documentElement;

  // ===== flags =====

  function parseHash() {
    var out = {};
    var h = (window.location.hash || '').replace(/^#/, '');
    h.split('&').forEach(function (kv) {
      if (!kv) { return; }
      var i = kv.indexOf('=');
      try {
        if (i < 0) { out[decodeURIComponent(kv)] = true; } else { out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); }
      } catch (e) { /* a malformed flag is ignored */ }
    });
    return out;
  }
  var flags = parseHash();
  if (flags.still) {
    UI.still = true;
    root.classList.add('still');
  }

  // ===== icons into their slots =====

  UI.$$('[data-icon]').forEach(function (slot) {
    var name = slot.getAttribute('data-icon');
    var cls = slot.classList.contains('rc-icon-slot') ? 'rc-icon' : '';
    if (UI.icon[name]) { slot.innerHTML = UI.icon[name](cls); }
  });
  UI.$$('.rc-check-slot').forEach(function (slot) { slot.innerHTML = UI.icon.check('rc-check'); });
  UI.$$('.tab-check-slot').forEach(function (slot) { slot.innerHTML = UI.icon.check('tab-check'); });
  UI.$('.brand-logo').innerHTML = UI.icon.logo();

  // ===== theme =====

  var themeBtn = UI.$('#theme-btn');
  function setTheme(t, save) {
    root.setAttribute('data-theme', t);
    themeBtn.innerHTML = t === 'dark' ? UI.icon.sun() : UI.icon.moon();
    if (save) { UI.store.set(KEY_THEME, t); }
  }
  function toggleTheme() {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  }
  var startTheme = flags.theme === 'light' || flags.theme === 'dark' ? flags.theme : (UI.store.get(KEY_THEME) || 'dark');
  setTheme(startTheme === 'light' ? 'light' : 'dark', false);
  themeBtn.addEventListener('click', toggleTheme);

  function toggleFull() {
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); } else { root.requestFullscreen(); }
    } catch (e) { /* not allowed here: fine */ }
  }
  UI.$('#full-btn').innerHTML = UI.icon.full();
  UI.$('#full-btn').addEventListener('click', toggleFull);

  // ===== round 2: the verdict (made first: round 1 hands it its rate) =====

  var verdictPage = new window.VerdictPage(UI.$('#verdict'));

  // ===== round 1: the rate =====

  var EXACT1 = 'w = ' + S.fmt(S.SEEN.used / S.SEEN.days, 7) + '...';
  var ASK1 = 'w = ?';
  var r1view = new Views.StackView(UI.$('#round1 .r1-view'), { id: 'r1', reveal: ASK1, sym: true });
  var round1 = new window.GuessRound({
    root: UI.$('#round1'),
    judge: function (w) { return S.judgeRate(w, S.ROUND1); },
    refuse: function (w) { return w < 0 ? 'Zero or more GB a day' : (w > 1000 ? 'At most 1000 GB a day' : null); },
    estDec: function (d) { return Math.min(d, 6); },
    lossDec: function (d) { return Math.min(d, 6); },
    view: r1view,
    viewInfo: function (row, t) { return { lossText: t.loss }; },
    showSolved: function (rowWins, won) {
      r1view.setSolved(rowWins);
      r1view.setReveal(won ? EXACT1 : ASK1, won);
    },
    onSolved: function (on) {
      markSolved(1, on);
      var row = on ? round1.rows[round1.won] : null;
      verdictPage.fromRound1(row ? row.w : null, row ? row.dec : 0);
    }
  });

  function markSolved(n, on) {
    UI.$$('.tab[data-go="' + n + '"], #card-' + n).forEach(function (el) { el.classList.toggle('solved', !!on); });
  }

  // ===== the final =====

  var runPage = new window.RunPage(UI.$('#run'));

  var editor = new window.LiveEditor(UI.$('#editor'), {
    onRun: function () { runFromCode(); }
  });

  (function fillCode() {
    var lines = S.CANONICAL_CODE.split('\n');
    UI.$('#code-card').innerHTML = lines.map(function (line, i) {
      return '<span class="ln" style="animation-delay:' + (0.08 + i * 0.07).toFixed(2) + 's">' +
        (line === '' ? ' ' : window.PyHighlight.highlight(line)) + '</span>';
    }).join('');
  }());

  function runFromCode() {
    go(5);
    runPage.start();
  }
  UI.$('.page-code [data-act="run"]').addEventListener('click', runFromCode);

  // ===== the story =====

  var story = new window.StoryPage(UI.$('#story'), { step: function (d) { step(d); } });

  // ===== pages =====

  var pages = UI.$$('.page');
  var pageById = {};
  pages.forEach(function (p) { pageById[p.getAttribute('data-page')] = p; });
  var cur = null;
  // The first time round 1 comes up, its numbers tick up like a scoreboard.
  var bigTicked = false;
  var round1Enter = round1.enter;
  round1.enter = function () {
    round1Enter.call(round1);
    if (bigTicked) { return; }
    bigTicked = true;
    var gb = UI.$('#r1-gb');
    var days = UI.$('#r1-days');
    UI.tween(0, 1, 1100, function (k) {
      gb.textContent = S.fmt(S.SEEN.used * k, 1, { keepZeros: k < 1 });
      days.textContent = S.fmt(Math.round(S.SEEN.days * k), 0);
    }, function () {
      gb.textContent = S.fmt(S.SEEN.used, 0);
      days.textContent = S.fmt(S.SEEN.days, 0);
    });
  };

  var ctl = {
    '0': {},
    story: story,
    '1': round1,
    '2': verdictPage,
    '3': { enter: function () { editor.focus(); }, leave: function () { editor.leave(); } },
    '4': {},
    '5': runPage
  };

  // how: 'next' or 'prev' when the arrows brought us here, 'jump' otherwise.
  // The story uses it to start at its first card or its last.
  function go(id, how) {
    id = String(id);
    if (!pageById[id] || id === cur) { return; }
    if (cur !== null && ctl[cur].leave) { ctl[cur].leave(); }
    var active = document.activeElement;
    if (active && active !== document.body && active.blur && !pageById[id].contains(active)) { active.blur(); }
    pages.forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-page') === id); });
    cur = id;
    UI.$$('[data-go]', UI.$('#strip')).forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-go') === id);
    });
    if (ctl[id].enter) { ctl[id].enter(how || 'jump'); }
    try { window.history.replaceState(null, '', '#page=' + id); } catch (e) { /* file:// quirks: fine */ }
  }

  // One page on (d = 1) or back (d = -1). A page may keep the step for
  // itself: the story turns its cards before it lets the show move on.
  function step(d) {
    var c = ctl[cur] || {};
    if (d > 0 && c.next && c.next()) { return; }
    if (d < 0 && c.prev && c.prev()) { return; }
    var i = ORDER.indexOf(cur) + d;
    if (i >= 0 && i < ORDER.length) { go(ORDER[i], d > 0 ? 'next' : 'prev'); }
  }

  UI.$$('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
  });

  // ===== keys =====

  function isTyping(el) {
    if (!el || el === document.body) { return false; }
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true;
  }

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = isTyping(t);
    var k = e.key;

    if (k === 'PageDown' || k === 'PageUp') {
      e.preventDefault();
      step(k === 'PageDown' ? 1 : -1);
      return;
    }
    if (e.defaultPrevented) { return; }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (k === 'z' || k === 'Z') && !typing && cur === '1') {
      e.preventDefault();
      round1.undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }

    if (typing) {
      var emptyGuess = t.classList && t.classList.contains('guess-input') && t.value === '';
      if (emptyGuess && (k === 'ArrowRight' || k === 'ArrowLeft')) {
        e.preventDefault();
        step(k === 'ArrowRight' ? 1 : -1);
      }
      return;
    }

    if (k === 'ArrowRight') { e.preventDefault(); step(1); return; }
    if (k === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
    if (/^[0-5]$/.test(k)) { e.preventDefault(); go(k); return; }
    if (k === 'Home') { e.preventDefault(); go(ORDER[0]); return; }
    if (k === 'End') { e.preventDefault(); go(ORDER[ORDER.length - 1]); return; }
    if (k === 't' || k === 'T') { e.preventDefault(); toggleTheme(); return; }
    if (k === 'f' || k === 'F') { e.preventDefault(); toggleFull(); return; }
    if (k === 'Escape') { if (t && t.blur) { t.blur(); } return; }

    if (cur === 'story' && (k === ' ' || k === 'Spacebar') && t.tagName !== 'BUTTON') {
      e.preventDefault();
      step(1);
      return;
    }
    if (cur === '2') {
      if (k === 'a' || k === 'A') { e.preventDefault(); verdictPage.lock('lasts'); return; }
      if (k === 'b' || k === 'B') { e.preventDefault(); verdictPage.lock('out'); return; }
      if ((k === ' ' || k === 'Spacebar') && t.tagName !== 'BUTTON') { e.preventDefault(); verdictPage.toggle(); return; }
      if (k === 'r' || k === 'R') { e.preventDefault(); verdictPage.rewind(); return; }
      if (k === 'e' || k === 'E') { e.preventDefault(); verdictPage.toEnd(); return; }
    }
    if (cur === '4' && k === 'Enter' && t.tagName !== 'BUTTON') {
      e.preventDefault();
      runFromCode();
      return;
    }
    if (cur === '5') {
      if (k === ' ' || k === 'Spacebar') { e.preventDefault(); runPage.toggle(); return; }
      if (k === 's' || k === 'S') { e.preventDefault(); runPage.pause(); runPage.step(true); return; }
      if (k === 'r' || k === 'R') { e.preventDefault(); runPage.restart(); return; }
      if (k === 'e' || k === 'E') { e.preventDefault(); runPage.toEnd(); return; }
    }
  });

  window.addEventListener('hashchange', function () {
    var f = parseHash();
    if (f.page !== undefined) { go(f.page); }
  });

  // ===== the cursor hides when the mouse rests, for projection =====

  var idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () { document.body.classList.add('idle'); }, 2600);
  }
  document.addEventListener('mousemove', wake);
  document.addEventListener('mousedown', wake);

  // ===== boot, with the dev flags =====

  function seed(round, list) {
    String(list).split(/[,;|]/).forEach(function (g) {
      if (g.trim() !== '') { round.submit(g, { instant: true }); }
    });
  }

  var startPage = flags.page !== undefined ? String(flags.page) : '0';
  if (!pageById[startPage]) { startPage = '0'; }

  if (flags.g1) { seed(round1, flags.g1); }
  if (flags.guesses) { seed(round1, flags.guesses); }

  if (flags.rate !== undefined) {
    var rv = S.parseGuess(flags.rate);
    if (rv && rv.value > 0) { verdictPage.edited = true; verdictPage.setRate(rv.value, rv.decimals, 'host'); }
  }
  if (flags.answer === 'a' || flags.answer === 'lasts') { verdictPage.lock('lasts'); }
  if (flags.answer === 'b' || flags.answer === 'out') { verdictPage.lock('out'); }

  var p5 = false;
  ['used', 'days', 'w', 'alpha'].forEach(function (name) {
    if (flags[name] !== undefined) {
      var v = S.parseGuess(flags[name]);
      if (v) { runPage.params[name] = v.value; p5 = true; }
    }
  });
  if (p5) { runPage.buildCall(); runPage.compute(); runPage.restart(); }
  if (flags.speed) { runPage.setSpeed(Number(flags.speed)); }
  if (flags.code) { editor.setText(S.CANONICAL_CODE, false); }
  if (flags.size !== undefined) { editor.setSizeIndex(Number(flags.size)); }

  if (startPage === 'story' && flags.card !== undefined) { story.k = Math.max(0, Math.min(story.last, Number(flags.card) - 1 || 0)); }
  go(startPage);

  if (startPage === '2') {
    if (flags.done) {
      verdictPage.toEnd();
    } else if (flags.day !== undefined) {
      var target = Math.max(S.SEEN.days, Math.min(S.PLAN.days, Number(flags.day)));
      while (verdictPage.day < target) { verdictPage.step(false); }
    }
    if (flags.play) { verdictPage.play(); }
  }
  if (startPage === '5') {
    if (flags.done) {
      runPage.toEnd();
    } else if (flags.step !== undefined) {
      runPage.jumpTo(Number(flags.step));
    }
    if (flags.hover !== undefined) { runPage.setHover(Number(flags.hover)); }
    if (flags.play) { runPage.play(); }
  }
  if (startPage === '1') {
    if (flags.hover !== undefined) { round1.showRow(Number(flags.hover), true, 0); }
    if (flags['try'] !== undefined) {
      round1.input.value = flags['try'];
      round1.submit(flags['try'], { instant: true });
      round1.input.value = flags['try'];
    }
    if (flags.typed !== undefined) { round1.input.value = flags.typed; }
  }

  window.WillItLastShow = { go: go, step: step, story: story, round1: round1, verdict: verdictPage, runPage: runPage, editor: editor };
}());
