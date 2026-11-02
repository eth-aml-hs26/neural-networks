/* engine.js: the click plan, the state, the render loop, the keys, the address, the theme and the
 * run. Grown from the engine of the page before this one (../grasshopper-finds-w/js/engine.js): the
 * same contract, with a second number b, the story in front, a closing part at the end, and the
 * buttons +1, +10 and +100 of the next page (../grasshoppers-many-days/js/engine.js), and the three
 * speeds of the page before (2 November 2026).
 *
 * THE PARTS. Each part registers itself in window.GF.parts:
 *
 *   GF.parts.<p> = {
 *     steps(iter, ctx) -> the names of its clicks in iteration iter (iter 1 tells the whole story,
 *                     iter >= 2 repeats it in fewer clicks); ctx.settle is the iteration where the
 *                     run settles (the closing part has its clicks there only), ctx.mode the speed
 *     build(layer) -> once at load: make its elements, hidden, in layer.back (SVG under the boxes),
 *                     layer.mid (HTML: boxes, cells, formulas), layer.front (SVG over the boxes) and
 *                     layer.top (HTML over everything); GF.under is an SVG group under everything
 *     render(st)   -> on every move: show exactly what state st shows, from scratch
 *     animate(st, prev) -> after render, on a single forward click only: decorate the change
 *   }
 *
 * The plan of an iteration is the steps of story, black, red, blue, purple and coda, in that order.
 * The part `ground` (the two grounds on the right) has no clicks of its own: it draws what the red
 * and blue clicks ask for; the black part draws the plot of y against x whenever the grounds do
 * not show. The state is (iter, idx, mode): idx clicks of iteration iter have been shown; (1, 0) is
 * the empty start.
 *
 * THE SPEEDS (mode), as on the page before. 1 tells everything. 2 is quick: the blue part is one
 * click, direct, in every iteration: each grasshopper stands on its point and the derivative is
 * written straight away, with the tangent, without a hop. 3 shows only the jumps: after the model
 * and the forward pass of iteration 1, one click per iteration, its forward pass (black:recompute).
 * The three Play buttons pick a speed and play it; Next steps through the plan of the speed picked,
 * and a change of speed keeps the place (the new plan up to where the old one stood). Play at
 * speeds 1 and 2 plays click after click, each once the animations of the one before are over; at
 * speed 3 it plays the clicks of iteration 1 so, then runs on as the run of the next page did:
 * iterations one by one to the tenth, then faster and faster to where the run settles.
 * THE STATE GIVEN TO A PART (st):
 *   iter, idx, plan, cur {part, name}, part, name    where we are
 *   is(part, name)        the current click is that one (name optional)
 *   reached(part, name)   that click has been shown in this iteration
 *   partReached(part)     some click of that part has been shown in this iteration
 *   w0, b0                the room's start (-1 and 60 until one is typed); typed: one was
 *   w, b                  the pair of this iteration; wNext, bNext what the update gives
 *   ps                    the pairs of iterations 1 to iter + 1 ({w, b}), for the plot's trail
 *   wShown, bShown        what the boxes show: the next pair once purple's update has been shown
 *   hop                   null, or {who: 'w' or 'b', fwd}: the boxes show a grasshopper's test hop
 *                         (who's box shows its number plus eps; with fwd, the columns a, yhat and l
 *                         and lbar follow)
 *   eps, alpha            the hop and the step
 *   F, settle             the views of this start (GFMath.frames) and the iteration where it settles
 *   fresh                 true on a single forward click (animate runs), false otherwise
 *   hopFrom               {w, b}: the poses of the two grasshoppers before this render
 *
 * THE ADDRESS: #w=-1&b=60&k=1&s=12 (start, iteration, click), plus m=2 or m=3 (the speed), a=ALPHA, e=EPS, theme=dark,
 * still (no animation at all) and replay (show the click before, then play this one), so any moment
 * opens directly; at=blue:hopw names the click instead of s. The page rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the update of the iteration where the run settles (at speed 3 its forward
 * pass). p: play or pause, at the speed picked. t: theme. The buttons +1, +10 and +100 jump that
 * many iterations on. A move by hand stops Play.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var PLAN = ['story', 'black', 'red', 'blue', 'purple', 'coda'];
  var DRAW = ['story', 'black', 'red', 'ground', 'blue', 'purple', 'coda'];
  var THEME_KEY = 'aml-grasshoppers-find-w-and-b-theme';

  var S = { w0: null, b0: null, iter: 1, idx: 0, mode: 1, alpha: M.ALPHA, eps: M.EPS };
  var still = false, prevSt = null, stage = null;
  var PLAY = { on: false, timer: null };
  // the pause between two clicks while playing, by speed (speed 3 past iteration 1 runs on its own)
  var PAUSE = { 1: 1100, 2: 750, 3: 300 };
  var frameCache = { key: null, F: null };

  function part(p) { return GF.parts[p] || null; }

  function start() {
    return { w: S.w0 === null ? M.W_DEFAULT : S.w0, b: S.b0 === null ? M.B_DEFAULT : S.b0 };
  }

  function frames() {
    var s = start(), key = [s.w, s.b, S.alpha, S.eps].join('|');
    if (frameCache.key !== key) { frameCache.key = key; frameCache.F = M.frames(s.w, s.b, S.alpha, S.eps); }
    return frameCache.F;
  }

  function settleIter() { return frames().K; }

  function plan(iter, mode) {
    var out = [], ctx = { settle: settleIter(), mode: mode || S.mode };
    PLAN.forEach(function (p) {
      var x = part(p);
      if (!x || !x.steps) return;
      x.steps(iter, ctx).forEach(function (name) { out.push({ part: p, name: name }); });
    });
    return out;
  }

  // The place of a click in the story, across the speeds: its part, then its place among the names
  // of that part at speed 1, then 2, then 3.
  function rank(iter, p, name) {
    var x = part(p), names = [];
    [1, 2, 3].forEach(function (m) {
      x.steps(iter, { settle: settleIter(), mode: m }).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    });
    return PLAN.indexOf(p) * 1000 + Math.max(0, names.indexOf(name));
  }

  // never sit beyond a plan's end; from iteration 2 on, at least on its first click
  function normalize() {
    var n = plan(S.iter).length;
    if (S.idx > n) S.idx = n;
    if (S.iter > 1 && S.idx < 1) S.idx = 1;
  }

  // A new speed keeps the place: the clicks of the new plan up to where the old one stood.
  function setMode(m) {
    if (m === S.mode || [1, 2, 3].indexOf(m) < 0) return;
    var P = plan(S.iter, S.mode), cur = S.idx > 0 ? P[S.idx - 1] : null;
    var r = cur ? rank(S.iter, cur.part, cur.name) : -1;
    S.mode = m;
    var n = 0;
    plan(S.iter, m).forEach(function (q) { if (rank(S.iter, q.part, q.name) <= r) n++; });
    S.idx = n;
    normalize();
  }

  // Which test hop the boxes show (see st.hop above).
  function hopOf(st) {
    if (st.iter > 1 || !st.partReached('blue') || st.partReached('purple')) return null;
    if (st.is('blue', 'hopw')) return { who: 'w', fwd: false };
    if (st.is('blue', 'fwdw') || st.is('blue', 'slopew')) return { who: 'w', fwd: true };
    if (st.is('blue', 'hopb')) return { who: 'b', fwd: true };
    return null;
  }

  function makeSt() {
    var P = plan(S.iter);
    var idx = Math.max(0, Math.min(S.idx, P.length));
    var shown = P.slice(0, idx);
    var cur = idx > 0 ? P[idx - 1] : null;
    var s = start();
    var ps = M.run(s.w, s.b, S.alpha, S.iter + 1);

    function reached(p, name) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p && shown[i].name === name) return true;
      return false;
    }
    function partReached(p) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p) return true;
      return false;
    }

    var st = {
      iter: S.iter, idx: idx, mode: S.mode, plan: P, cur: cur,
      part: cur ? cur.part : null, name: cur ? cur.name : null,
      is: function (p, name) { return !!cur && cur.part === p && (name === undefined || cur.name === name); },
      reached: reached, partReached: partReached,
      w0: s.w, b0: s.b, typed: S.w0 !== null || S.b0 !== null,
      w: ps[S.iter - 1].w, b: ps[S.iter - 1].b, wNext: ps[S.iter].w, bNext: ps[S.iter].b, ps: ps,
      eps: S.eps, alpha: S.alpha, F: frames(), settle: settleIter(),
      fresh: false, hopFrom: null
    };
    var upd = reached('purple', 'update');
    st.wShown = upd ? st.wNext : st.w;
    st.bShown = upd ? st.bNext : st.b;
    st.hop = hopOf(st);
    return st;
  }

  // ===== render

  function render(animate) {
    K.cancel();
    K.clearTemps();
    K.clearFlies();
    var st = makeSt();
    st.fresh = !!animate && !still;
    st.hopFrom = { w: GF.hopper.pose(GF.hopper.w), b: GF.hopper.pose(GF.hopper.b) };
    G.setRun(st.F);

    // a jump (Back, a deep link, Play) shows its state at once; a forward click lets the fades run
    if (st.fresh) stage.classList.remove('still');
    else stage.classList.add('still');
    // the grasshoppers by default: perched on the boxes of their numbers, from those boxes on
    var story = st.part === 'story';
    ['w', 'b'].forEach(function (who) {
      var h = GF.hopper[who];
      h.setPose(GF.hopper.perchPose(who));
      h.show(!story && (st.iter > 1 || st.reached('black', who)));
    });
    DRAW.forEach(function (p) { var x = part(p); if (x && x.render) x.render(st); });
    if (st.fresh) {
      DRAW.forEach(function (p) { var x = part(p); if (x && x.animate) x.animate(st, prevSt); });
    } else {
      void stage.offsetWidth;
      requestAnimationFrame(function () { if (!still) stage.classList.remove('still'); });
    }
    prevSt = st;
    writeHash();
    controls(st);
    stage.setAttribute('data-step', st.cur ? st.cur.part + ':' + st.cur.name : 'start');
    stage.setAttribute('data-iter', String(st.iter));
  }

  // ===== moves (the keys and buttons stop Play first, see byHand)

  // One click forward; false when it could not move (a start that is refused).
  function next() {
    var st = makeSt();
    if (st.is('black', 'guess')) {
      var g = part('black').readGuess();
      if (!g.ok) { part('black').shake(g.which); return false; }
      S.w0 = g.w;
      S.b0 = g.b;
    }
    if (S.idx < plan(S.iter).length) S.idx++;
    else { S.iter++; S.idx = 1; }
    render(true);
    return true;
  }

  function prev() {
    if (S.idx > 1 || (S.iter === 1 && S.idx === 1)) S.idx--;
    else if (S.iter > 1) { S.iter--; S.idx = plan(S.iter).length; }
    render(false);
  }

  function home() { S.iter = 1; S.idx = 0; render(false); }

  // The update of the iteration where the run settles (at speed 3, which has none, its forward
  // pass); the closing clicks follow it.
  function toEnd() {
    S.iter = settleIter();
    var names = plan(S.iter).map(function (p) { return p.part + ':' + p.name; });
    var i = names.indexOf('purple:update');
    S.idx = i >= 0 ? i + 1 : 1;
    render(false);
  }

  // n iterations on: the forward pass of iteration iter + n (the first click of that iteration),
  // never past the iteration where the run settles.
  function jump(n) {
    var k = Math.min(settleIter(), S.iter + n);
    if (k <= S.iter) return false;
    S.iter = k;
    S.idx = 1;
    render(false);
    return true;
  }

  // ===== Play, at the three speeds

  function atEnd() { return S.iter >= settleIter() && S.idx >= plan(S.iter).length; }

  // At speed 3, once iteration 1 has shown its forward pass, Play runs on by itself.
  function running() { return S.mode === 3 && (S.iter > 1 || S.idx >= plan(S.iter).length); }

  // The run of speed 3: iterations one by one to the tenth, slowly enough to follow the hinge as it
  // swings onto the six days, then two at a time, then faster and faster (each jump 15 percent of
  // the iteration reached), until the run settles: about five seconds in all.
  function runStep() {
    var k = S.iter, n = k < 10 ? 1 : k < 20 ? 2 : Math.ceil(k * 0.15);
    if (!jump(n) || S.iter >= settleIter()) { stop(); return; }
    PLAY.timer = setTimeout(tick, k < 10 ? 420 : k < 20 ? 120 : 30);
  }

  // The next move of Play, once the animations of the click before are over and a pause has passed.
  function tick() {
    if (!PLAY.on) return;
    if (K.active > 0) { PLAY.timer = setTimeout(tick, 60); return; }
    if (running()) { runStep(); return; }
    PLAY.timer = setTimeout(function () {
      if (!PLAY.on) return;
      if (K.active > 0) { tick(); return; }
      if (atEnd() || !next()) { stop(); return; }
      tick();
    }, PAUSE[S.mode]);
  }

  function stop() {
    clearTimeout(PLAY.timer);
    if (!PLAY.on) return;
    PLAY.on = false;
    controls(makeSt());
  }

  // The button of speed m: plays at that speed, or pauses when it is the one playing.
  function playAt(m) {
    if (PLAY.on && m === S.mode) { stop(); return; }
    var was = S.mode;
    setMode(m);
    if (S.mode !== was) render(false);
    if (running() ? S.iter >= settleIter() : atEnd()) { stop(); controls(makeSt()); return; }
    PLAY.on = true;
    clearTimeout(PLAY.timer);
    controls(makeSt());
    // the first move comes at once
    if (K.active === 0) {
      if (running()) { runStep(); return; }
      if (!next()) { stop(); return; }
    }
    tick();
  }

  function togglePlay() { if (PLAY.on) stop(); else playAt(S.mode); }

  // ===== the address

  function writeHash() {
    var a = [];
    if (S.w0 !== null) a.push('w=' + S.w0);
    if (S.b0 !== null) a.push('b=' + S.b0);
    a.push('k=' + S.iter, 's=' + S.idx);
    if (S.mode !== 1) a.push('m=' + S.mode);
    if (S.alpha !== M.ALPHA) a.push('a=' + S.alpha);
    if (S.eps !== M.EPS) a.push('e=' + S.eps);
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
    // alpha up to 0.02: the runs of the starts the page takes stay on the six days and settle
    if (q.a !== undefined) { var al = parseFloat(q.a); if (al > 0 && al <= 0.02) S.alpha = al; }
    if (q.e !== undefined) { var ep = parseFloat(q.e); if (ep > 0 && ep <= 1) S.eps = ep; }
    var w = q.w !== undefined ? M.parse(q.w) : null, b = q.b !== undefined ? M.parse(q.b) : null;
    // a start whose run cannot reach the best fit (the heating off on every day, or a run that
    // stops on another hinge) is not taken
    if (M.takes(w === null ? M.W_DEFAULT : w, b === null ? M.B_DEFAULT : b, S.alpha)) { S.w0 = w; S.b0 = b; }
    S.mode = q.m === '2' ? 2 : q.m === '3' ? 3 : 1;
    if (q.k !== undefined) S.iter = Math.max(1, Math.min(parseInt(q.k, 10) || 1, M.KMAX - 1));
    if (q.s !== undefined) S.idx = Math.max(0, parseInt(q.s, 10) || 0);
    if (q.at !== undefined) {
      // a click by name, for checks that should not depend on how many clicks a part has
      var names = plan(S.iter).map(function (p) { return p.part + ':' + p.name; });
      var at = names.indexOf(q.at);
      if (at >= 0) S.idx = at + 1;
    }
    var n = plan(S.iter).length;
    if (S.idx > n) S.idx = n;
    if (S.iter > 1 && S.idx < 1) S.idx = 1;
    if (q.theme === 'light' || q.theme === 'dark') setTheme(q.theme, false);
    still = q.still !== undefined;
    return q;
  }

  // ===== controls, theme, fit

  function controls(st) {
    var where = document.getElementById('where');
    if (where) where.textContent = st.idx === 0 && st.iter === 1 || st.part === 'story' ? '' : 'iteration ' + st.iter;
    var runs = document.querySelector('#controls .runs');
    if (runs) runs.classList.toggle('on', st.iter > 1 || st.reached('purple', 'update') || running());
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
    K.scale = s;
  }

  // a move by hand stops Play first
  function byHand(f) { return function () { stop(); f(); }; }
  var NEXT = byHand(next), PREV = byHand(prev), HOME = byHand(home), END = byHand(toEnd);

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key, typing = e.target && e.target.tagName === 'INPUT';
    if (k === 'PageDown') { e.preventDefault(); NEXT(); return; }
    if (k === 'PageUp') { e.preventDefault(); PREV(); return; }
    if (typing) {
      if (k === 'Enter') { e.preventDefault(); if (!part('black').enterInField(e.target)) NEXT(); }
      else if (k === 'Tab') { e.preventDefault(); part('black').switchField(e.target, e.shiftKey); }
      else if (k === 'Escape') e.target.blur();
      return;
    }
    var st = makeSt();
    if (st.is('black', 'guess') && /^[0-9.,+-]$/.test(k)) { part('black').focusGuess(); return; }
    if (k === 'ArrowRight' || k === ' ' || k === 'Enter') { e.preventDefault(); NEXT(); }
    else if (k === 'ArrowLeft' || k === 'Backspace') { e.preventDefault(); PREV(); }
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
    K.stage = stage;
    K.top = document.getElementById('html-top');
    var back = document.getElementById('svg-back'), front = document.getElementById('svg-front');
    var mid = document.getElementById('html-mid');
    GF.hopper.defs(front);
    // under everything: the band of the forward pass
    GF.under = K.svg('g', null, back, 'under');
    GF.layers = {};
    var colour = { story: 'black', ground: 'red', coda: 'black' };
    DRAW.forEach(function (p) {
      var c = colour[p] || p;
      GF.layers[p] = {
        back: K.svg('g', null, back, 'part k-' + c),
        mid: K.div('part k-' + c, mid),
        front: K.svg('g', null, front, 'part k-' + c),
        top: K.div('part k-' + c, K.top)
      };
    });
    GF.hopper.w = GF.hopper.make(GF.layers.blue.front, 'hop-w');
    GF.hopper.b = GF.hopper.make(GF.layers.blue.front, 'hop-b');
    G.setRun(frames());
    DRAW.forEach(function (p) { var x = part(p); if (x && x.build) x.build(GF.layers[p]); });

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    function button(id, fn) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () { fn(); b.blur(); });
    }
    button('next', NEXT);
    button('plus1', byHand(function () { jump(1); }));
    button('plus10', byHand(function () { jump(10); }));
    button('plus100', byHand(function () { jump(100); }));
    [1, 2, 3].forEach(function (m) { button('play' + m, function () { playAt(m); }); });
    button('theme', toggleTheme);

    function enter() {
      stop();
      var q = readHash();
      if (q.replay !== undefined && !(S.iter === 1 && S.idx === 0)) {
        prev();
        setTimeout(next, 600);
      } else {
        render(false);
      }
    }
    // a typed address (the page itself rewrites it with replaceState, which fires no event)
    window.addEventListener('hashchange', enter);
    enter();
    // KaTeX fonts change the size of every formula: draw again once they are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(false); });
  }

  GF.engine = {
    next: next, prev: prev, home: home, toEnd: toEnd, jump: jump, playAt: playAt, stop: stop,
    togglePlay: togglePlay, setMode: setMode, playing: function () { return PLAY.on; },
    mode: function () { return S.mode; },
    render: render, plan: plan, state: makeSt, PLAN: PLAN, DRAW: DRAW
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
