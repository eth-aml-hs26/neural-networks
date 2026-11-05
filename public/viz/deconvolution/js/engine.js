/* engine.js: the plan of clicks, the state, the render loop, the keys, the address, the theme and
 * Play. The engine of the tiles page (../tetris-tiles/js/engine.js), itself the grasshopper pages'.
 *
 * THE PLAN: the two cards of the story (js/story.js), then the 14 steps (js/steps.js); 16 clicks.
 * The state is the place in the plan, pos 0 to 15. A part renders any place from scratch
 * (render(st)) and decorates a single forward click (animate(st)); Back, a reload and the address
 * show the end of a click at once.
 *
 * THE SPEEDS of the three Play buttons, as on the grasshopper pages: 1 plays everything, the cards
 * and the steps, each click once the animations of the one before are over and a pause has
 * passed; 2 plays the 14 steps only (from the story it goes to step 1 first), with a shorter
 * pause; 3 plays the steps without their animations, a third of a second apart. Next and Back
 * always walk every click.
 *
 * THE ADDRESS: #card=K (K = 1 or 2) or #step=N (N = 1 to 14), plus m=2 or m=3 (the speed picked),
 * theme=dark or theme=light, still (no animation at all) and replay (show the click before, then
 * play this one). The page rewrites it at every move, so a reload shows the same picture.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back. Home:
 * the first card. End: the last step. p: play or pause, at the speed picked. t: theme. A move by
 * hand stops Play.
 */
(function () {
  'use strict';
  var DC = window.DC, K = DC.kit, G = DC.geo;
  var THEME_KEY = 'aml-deconvolution-theme';
  var PAUSE = { 1: 1100, 2: 750, 3: 330 };

  var PLAN = [];
  DC.story.CARDS.forEach(function (name, i) { PLAN.push({ kind: 'card', card: i + 1, name: name }); });
  for (var n = 1; n <= DC.steps.COUNT; n++) PLAN.push({ kind: 'step', step: n, name: 'step ' + n });
  var FIRST_STEP = DC.story.CARDS.length;

  var S = { pos: 0, mode: 1 };
  var still = false, stage = null;
  var PLAY = { on: false, timer: null };

  function makeSt(fresh) {
    var p = PLAN[S.pos];
    return { pos: S.pos, kind: p.kind, card: p.card || 0, step: p.step || 0, name: p.name, fresh: !!fresh };
  }

  // ===== render

  function render(animate) {
    K.cancel();
    var st = makeSt(animate && !still);
    // a jump (Back, a deep link, speed 3) shows its state at once; a forward click lets the fades run
    if (st.fresh) stage.classList.remove('still');
    else stage.classList.add('still');
    stage.classList.toggle('in-story', st.kind === 'card');
    DC.story.render(st);
    DC.steps.render(st);
    if (st.fresh) {
      DC.story.animate(st);
      DC.steps.animate(st);
    } else {
      void stage.offsetWidth;
      requestAnimationFrame(function () { if (!still) stage.classList.remove('still'); });
    }
    writeHash();
    controls(st);
    stage.setAttribute('data-at', st.kind === 'card' ? 'card:' + st.card : 'step:' + st.step);
  }

  // ===== moves

  function next() {
    if (S.pos >= PLAN.length - 1) return false;
    S.pos++;
    render(true);
    return true;
  }
  function prev() {
    if (S.pos <= 0) return false;
    S.pos--;
    render(false);
    return true;
  }
  function go(pos, animate) {
    S.pos = Math.max(0, Math.min(PLAN.length - 1, pos));
    render(!!animate);
  }
  function home() { go(0); }
  function toEnd() { go(PLAN.length - 1); }

  // ===== Play, at the three speeds

  function atEnd() { return S.pos >= PLAN.length - 1; }

  // the next move of Play at the speed picked; false at the end
  function move() {
    if (atEnd()) return false;
    if (S.mode === 1) return next();
    if (S.pos < FIRST_STEP) { go(FIRST_STEP, S.mode === 2); return true; }
    if (S.mode === 2) return next();
    go(S.pos + 1, false);
    return true;
  }

  function tick() {
    if (!PLAY.on) return;
    if (K.active > 0) { PLAY.timer = setTimeout(tick, 60); return; }
    PLAY.timer = setTimeout(function () {
      if (!PLAY.on) return;
      if (K.active > 0) { tick(); return; }
      if (!move()) { stop(); return; }
      tick();
    }, PAUSE[S.mode]);
  }

  function stop() {
    clearTimeout(PLAY.timer);
    if (!PLAY.on) return;
    PLAY.on = false;
    controls(makeSt());
  }

  // the button of speed m: plays at that speed, or pauses when it is the one playing
  function playAt(m) {
    if (PLAY.on && m === S.mode) { stop(); return; }
    S.mode = m;
    if (atEnd()) { stop(); controls(makeSt()); writeHash(); return; }
    PLAY.on = true;
    clearTimeout(PLAY.timer);
    if (!move()) { stop(); return; }
    controls(makeSt());
    tick();
  }

  function togglePlay() { if (PLAY.on) stop(); else playAt(S.mode); }

  // ===== the address

  function writeHash() {
    var p = PLAN[S.pos], a = [p.kind === 'card' ? 'card=' + p.card : 'step=' + p.step];
    if (S.mode !== 1) a.push('m=' + S.mode);
    if (still) a.push('still');
    try { history.replaceState(null, '', '#' + a.join('&')); } catch (e) { /* file:// in some browsers */ }
  }

  function readHash() {
    var q = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      q[i < 0 ? kv : kv.slice(0, i)] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1));
    });
    var pos = 0;
    if (q.step !== undefined) {
      var s = parseInt(q.step, 10);
      if (s >= 1 && s <= DC.steps.COUNT) pos = FIRST_STEP + s - 1;
    } else if (q.card !== undefined) {
      var c = parseInt(q.card, 10);
      if (c >= 1 && c <= FIRST_STEP) pos = c - 1;
    }
    S.pos = pos;
    S.mode = q.m === '2' ? 2 : q.m === '3' ? 3 : 1;
    if (q.theme === 'light' || q.theme === 'dark') setTheme(q.theme, false);
    still = q.still !== undefined;
    return q;
  }

  // ===== controls, theme, fit

  function controls(st) {
    var where = document.getElementById('where');
    if (where) where.textContent = st.kind === 'step' ? 'step ' + st.step + ' of ' + DC.steps.COUNT : '';
    var back = document.getElementById('back'), nx = document.getElementById('next');
    if (back) back.disabled = st.pos <= 0;
    if (nx) nx.disabled = st.pos >= PLAN.length - 1;
    [1, 2, 3].forEach(function (m) {
      var b = document.getElementById('play' + m);
      if (!b) return;
      b.classList.toggle('picked', S.mode === m);
      b.classList.toggle('playing', PLAY.on && S.mode === m);
      b.setAttribute('aria-pressed', PLAY.on && S.mode === m ? 'true' : 'false');
    });
  }

  function setTheme(t, remember) {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    if (remember !== false) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* blocked */ } }
  }
  function toggleTheme() {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  function fit() {
    var s = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
    stage.style.transform = 'scale(' + s + ')';
  }

  function byHand(f) { return function () { stop(); f(); }; }
  var NEXT = byHand(next), PREV = byHand(prev), HOME = byHand(home), END = byHand(toEnd);

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'Enter' || k === 'PageDown') { e.preventDefault(); NEXT(); }
    else if (k === 'ArrowLeft' || k === 'Backspace' || k === 'PageUp') { e.preventDefault(); PREV(); }
    else if (k === 'Home') { e.preventDefault(); HOME(); }
    else if (k === 'End') { e.preventDefault(); END(); }
    else if (k === 'p' || k === 'P') togglePlay();
    else if (k === 't' || k === 'T') toggleTheme();
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* blocked */ }
    setTheme(saved === 'dark' ? 'dark' : 'light', false);

    stage = document.getElementById('stage');
    DC.steps.build(document.getElementById('drawing'), document.getElementById('html-mid'));
    DC.story.build(document.getElementById('html-top'));

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    function button(id, fn) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () { fn(); b.blur(); });
    }
    button('next', NEXT);
    button('back', PREV);
    [1, 2, 3].forEach(function (m) { button('play' + m, function () { playAt(m); }); });
    button('theme', toggleTheme);

    function enter() {
      stop();
      var q = readHash();
      if (q.replay !== undefined && S.pos > 0) {
        S.pos--;
        render(false);
        setTimeout(function () { S.pos++; render(true); }, 600);
      } else {
        render(false);
      }
    }
    window.addEventListener('hashchange', enter);
    enter();
    // KaTeX's fonts change the size of the formula: draw again once they are in
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        document.documentElement.setAttribute('data-ready', '1');
      });
    } else {
      document.documentElement.setAttribute('data-ready', '1');
    }
  }

  DC.engine = {
    next: next, prev: prev, go: go, home: home, toEnd: toEnd, playAt: playAt, stop: stop,
    togglePlay: togglePlay, playing: function () { return PLAY.on; },
    mode: function () { return S.mode; }, render: render, state: makeSt, PLAN: PLAN
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
