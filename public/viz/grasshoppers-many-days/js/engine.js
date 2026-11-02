/* engine.js: the click plan, the state, the render loop, the keys, the address, the theme and the
 * run (from step 0, ../grasshopper-finds-w/, with two numbers, two grasshoppers and the run).
 *
 * THE PARTS. Each of the four parts registers itself in window.GF.parts under its colour:
 *
 *   GF.parts.<p> = {
 *     steps(iter, mode) -> the names of its clicks in iteration iter at speed mode (iter 1 tells the
 *                     whole story, iter >= 2 repeats it in fewer clicks)
 *     order(iter)  -> optional: all its names of that iteration across the speeds, in story order
 *                     (default: those of speed 1, then 2, then 3); keeps the place when the speed
 *                     changes in the middle of an iteration
 *     build(layer) -> once at load: make its elements, hidden, in layer.back (SVG under the boxes),
 *                     layer.mid (HTML: boxes, cells, formulas), layer.front (SVG over the boxes) and
 *                     layer.top (HTML over everything); GF.under is an SVG group under everything
 *     render(st)   -> on every move: show exactly what state st shows, from scratch
 *     animate(st, prev) -> after render, on a single forward click only: decorate the change
 *   }
 *
 * THE SPEEDS (mode), step 0's three (2 November 2026). 1 tells everything; 2 is quick: the blue
 * part is one click, the two slopes straight from the derivatives, without the hops; 3 shows only
 * the jumps: one click an iteration, the new w and b running through the columns and the plot.
 * The three Play buttons pick a speed and play it; Next steps through the plan of the speed picked.
 * Play at speed 3 tells iteration 1 click by click, then runs as the run below.
 *
 * The plan of an iteration is the steps of black, red, blue and purple, in that order. The state
 * is (iter, idx, mode): idx clicks of iteration iter have been shown; (1, 0) is the empty start.
 *
 * THE STATE GIVEN TO A PART (st):
 *   iter, idx, mode, plan, cur {part, name}, part, name    where we are
 *   is(part, name), reached(part, name), partReached(part)    as in step 0
 *   w0, b0                the start; w, b of this iteration; wNext, bNext what the update gives
 *   ws, bs                [w_1 .. w_iter], [b_1 .. b_iter], for the trail in the plot
 *   wShown, bShown        what the boxes show: wNext, bNext once purple's update has been shown
 *   f                     the forward pass at (w, b) (GFMath.forward); g the gradient
 *   hw, hb                the hops of grasshoppers w and b (GFMath.hop)
 *   eps, alpha            the hop and the step; K the iteration where the run settles
 *   fresh                 true on a single forward click (animate runs), false otherwise
 *
 * THE ADDRESS: #k=1&s=12 (iteration, clicks shown), plus m=2 or m=3 (the speed), w= and b=
 * (another start), a=ALPHA, e=EPS, theme=dark, still (no animation at all) and replay (show the
 * click before, then play this one), so any moment opens directly; at=purple:update names the click
 * instead of s. The page rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the end of the iteration where the run has settled. p: play or pause, at
 * the speed picked. t: theme. The buttons +1, +10 and +100 jump that many iterations on.
 *
 * THE RUN: Play at speed 3, once iteration 1 is told, goes on iteration by iteration (2 to 10 one
 * by one, slowly enough to follow the hinge, then two at a time, then 15 percent of the iteration
 * reached) to where the run settles, about five seconds. Play at speeds 1 and 2 plays each click
 * once the one before has finished, and stops there too. A key or a button by hand pauses it.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var PARTS = ['black', 'red', 'blue', 'purple'];
  var THEME_KEY = 'aml-grasshoppers-many-days-theme';

  var S = { w0: M.W0, b0: M.B0, iter: 1, idx: 0, mode: 1, alpha: M.ALPHA, eps: M.EPS };
  var still = false, prevSt = null, stage = null, settle = null;
  var PLAY = { on: false, timer: null };
  // the pause between two clicks while playing, by speed (speed 3 runs at its own pace)
  var PAUSE = { 1: 1100, 2: 750, 3: 300 };

  function part(p) { return GF.parts[p] || null; }

  function plan(iter, mode) {
    var m = mode || S.mode, out = [];
    PARTS.forEach(function (p) {
      var x = part(p);
      if (!x || !x.steps) return;
      x.steps(iter, m).forEach(function (name) { out.push({ part: p, name: name }); });
    });
    return out;
  }

  // The place of a click in the story, across the speeds.
  function rank(iter, p, name) {
    var x = part(p), names = [];
    if (x.order) names = x.order(iter);
    else [1, 2, 3].forEach(function (m) {
      x.steps(iter, m).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    });
    return PARTS.indexOf(p) * 1000 + Math.max(0, names.indexOf(name));
  }

  // Only iteration 1 has a state before its first click; never sit beyond a plan's end.
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

  // The iteration where the run from the current start settles (cached per start and step).
  function K_() {
    var key = S.w0 + '|' + S.b0 + '|' + S.alpha;
    if (!settle || settle.key !== key) settle = { key: key, k: M.settleAt(S.w0, S.b0, S.alpha) };
    return settle.k;
  }

  function makeSt() {
    var P = plan(S.iter);
    var idx = Math.max(0, Math.min(S.idx, P.length));
    var shown = P.slice(0, idx);
    var cur = idx > 0 ? P[idx - 1] : null;
    var R = M.run(S.w0, S.b0, S.alpha, S.iter + 1);

    function reached(p, name) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p && shown[i].name === name) return true;
      return false;
    }
    function partReached(p) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p) return true;
      return false;
    }
    var w = R.W[S.iter - 1], b = R.B[S.iter - 1];
    var st = {
      iter: S.iter, idx: idx, mode: S.mode, plan: P, cur: cur,
      part: cur ? cur.part : null, name: cur ? cur.name : null,
      is: function (p, name) { return !!cur && cur.part === p && (name === undefined || cur.name === name); },
      reached: reached, partReached: partReached,
      w0: S.w0, b0: S.b0, w: w, b: b, wNext: R.W[S.iter], bNext: R.B[S.iter],
      ws: R.W.slice(0, S.iter), bs: R.B.slice(0, S.iter),
      f: M.forward(w, b), g: M.grad(w, b),
      hw: M.hop(w, b, 'w', S.eps), hb: M.hop(w, b, 'b', S.eps),
      eps: S.eps, alpha: S.alpha, K: K_(),
      fresh: false
    };
    var upd = reached('purple', 'update');
    st.wShown = upd ? st.wNext : w;
    st.bShown = upd ? st.bNext : b;
    return st;
  }

  // ===== render

  function render(animate) {
    K.cancel();
    K.clearTemps();
    K.clearFlies();
    var st = makeSt();
    st.fresh = !!animate && !still;

    // a jump (Back, a deep link, Play) shows its state at once; a forward click lets the fades run
    if (st.fresh) stage.classList.remove('still');
    else stage.classList.add('still');
    // the grasshoppers by default: on their boxes from the first click on, as at the end of step 1
    ['w', 'b'].forEach(function (n) {
      var h = GF.hopper[n];
      h.setPose(GF.hopper.perchPose(n));
      h.show(st.iter > 1 || st.idx > 0);
    });
    PARTS.forEach(function (p) { var x = part(p); if (x && x.render) x.render(st); });
    if (st.fresh) {
      PARTS.forEach(function (p) { var x = part(p); if (x && x.animate) x.animate(st, prevSt); });
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

  // ===== moves

  function next() {
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

  function toEnd() {
    S.iter = K_();
    S.idx = plan(S.iter).length;
    render(false);
  }

  // n iterations on: the forward pass of iteration iter + n (the first click of that iteration),
  // never past the iteration where the run settles.
  function jump(n) {
    var k = Math.min(K_(), S.iter + n);
    if (k <= S.iter) return false;
    S.iter = k;
    S.idx = 1;
    render(false);
    return true;
  }

  // ===== Play: at speeds 1 and 2 one click after another, each once its animations are over and
  // a pause has passed; at speed 3 the same through the story of iteration 1, then the run:
  // iterations 2 to 10 one by one, slowly enough to follow the hinge line as it swings onto the
  // points, then two at a time, then faster and faster (each jump 15 percent of the iteration
  // reached), until the run settles, about five seconds from iteration 1.

  function atEnd() { return S.iter >= K_() && S.idx >= plan(S.iter).length; }

  // speed 3 once the story of iteration 1 is told
  function running() { return S.mode === 3 && (S.iter > 1 || S.idx >= plan(1).length); }

  function stopPlay() {
    PLAY.on = false;
    clearTimeout(PLAY.timer);
    controls(makeSt());
  }

  function tick() {
    if (!PLAY.on) return;
    if (running()) {
      var k = S.iter, n = k < 10 ? 1 : k < 20 ? 2 : Math.ceil(k * 0.15);
      if (!jump(n) || S.iter >= K_()) { stopPlay(); return; }
      PLAY.timer = setTimeout(tick, k < 10 ? 380 : k < 20 ? 110 : 24);
      return;
    }
    if (K.pending() > 0) { PLAY.timer = setTimeout(tick, 60); return; }
    PLAY.timer = setTimeout(function () {
      if (!PLAY.on) return;
      if (K.pending() > 0) { tick(); return; }
      if (atEnd()) { stopPlay(); return; }
      next();
      tick();
    }, PAUSE[S.mode]);
  }

  // The button of speed m: plays at that speed, or pauses when it is the one playing.
  function playAt(m) {
    if (PLAY.on && m === S.mode) { stopPlay(); return; }
    var was = S.mode;
    setMode(m);
    if (S.mode !== was) render(false);
    if (atEnd()) { stopPlay(); return; }
    PLAY.on = true;
    clearTimeout(PLAY.timer);
    controls(makeSt());
    // the first click comes at once
    if (!running() && K.pending() === 0) next();
    tick();
  }

  function togglePlay() { if (PLAY.on) stopPlay(); else playAt(S.mode); }

  // a move by hand stops Play first
  function byHand(f) { return function () { if (PLAY.on) stopPlay(); f(); }; }

  // ===== the address

  function writeHash() {
    var a = [];
    if (S.w0 !== M.W0) a.push('w=' + S.w0);
    if (S.b0 !== M.B0) a.push('b=' + S.b0);
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
    if (q.w !== undefined) { var v = M.parse(q.w); if (v !== null) S.w0 = v; }
    if (q.b !== undefined) { var u = M.parse(q.b); if (u !== null) S.b0 = u; }
    if (q.a !== undefined) { var al = parseFloat(q.a); if (al > 0 && al < 1) S.alpha = al; }
    if (q.e !== undefined) { var ep = parseFloat(q.e); if (ep > 0 && ep <= 1) S.eps = ep; }
    S.mode = q.m === '2' ? 2 : q.m === '3' ? 3 : 1;
    if (q.k !== undefined) S.iter = Math.max(1, Math.min(M.KMAX - 1, parseInt(q.k, 10) || 1));
    if (q.s !== undefined) S.idx = Math.max(0, parseInt(q.s, 10) || 0);
    if (q.at !== undefined) {
      // a click by name, for checks that should not depend on how many clicks a part has
      var names = plan(S.iter).map(function (p) { return p.part + ':' + p.name; });
      var at = names.indexOf(q.at);
      if (at >= 0) S.idx = at + 1;
    }
    normalize();
    if (q.theme === 'light' || q.theme === 'dark') setTheme(q.theme, false);
    still = q.still !== undefined;
    return q;
  }

  // ===== controls, theme, fit

  function controls(st) {
    var where = document.getElementById('where');
    if (where) where.textContent = st.idx === 0 && st.iter === 1 ? '' : 'iteration ' + st.iter;
    // +1, +10 and +100 from the end of iteration 1 on
    var runs = document.querySelector('#controls .runs');
    if (runs) runs.classList.toggle('on', st.iter > 1 || st.idx >= st.plan.length);
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
    K.stage = stage;
    K.top = document.getElementById('html-top');
    var back = document.getElementById('svg-back'), front = document.getElementById('svg-front');
    var mid = document.getElementById('html-mid');
    GF.hopper.defs(front);
    // under everything: the band of the forward pass
    GF.under = K.svg('g', null, back, 'under');
    GF.layers = {};
    PARTS.forEach(function (p) {
      GF.layers[p] = {
        back: K.svg('g', null, back, 'part k-' + p),
        mid: K.div('part k-' + p, mid),
        front: K.svg('g', null, front, 'part k-' + p),
        top: K.div('part k-' + p, K.top)
      };
    });
    GF.hopper.w = GF.hopper.make(GF.layers.blue.front, 'hop-w');
    GF.hopper.b = GF.hopper.make(GF.layers.blue.front, 'hop-b');
    PARTS.forEach(function (p) { var x = part(p); if (x && x.build) x.build(GF.layers[p]); });

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
      if (PLAY.on) stopPlay();
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
    next: next, prev: prev, home: home, toEnd: toEnd, jump: jump,
    playAt: playAt, stopPlay: stopPlay, togglePlay: togglePlay, setMode: setMode,
    playing: function () { return PLAY.on; },
    render: render, plan: plan, state: makeSt, PARTS: PARTS
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
