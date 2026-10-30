/* engine.js: the click plan, the state, the render loop, Play, the keys, the address and the theme.
 *
 * THE PARTS. Each of the four parts registers itself in window.GF.parts under its colour:
 *
 *   GF.parts.<p> = {
 *     steps(iter, mode) -> the names of its clicks in iteration iter at speed mode (iter 1 tells the
 *                     whole story, iter >= 2 repeats it in fewer clicks)
 *     order(iter)   -> optional: all its names of that iteration across the speeds, in story order
 *                     (default: those of speed 1, then 2, then 3); keeps the place when the speed
 *                     changes in the middle of an iteration
 *     build(layer)  -> once at load: make its elements, hidden, in layer.back (SVG under the boxes),
 *                     layer.mid (HTML: boxes, formulas), layer.front (SVG over the boxes) and
 *                     layer.top (HTML over everything); GF.under is an SVG group under everything
 *     render(st)    -> on every move: show exactly what state st shows, from scratch
 *     animate(st, prev) -> after render, on a single forward click only: decorate the change
 *   }
 *
 * THE SPEEDS (mode). 1 tells everything; 2 is quick: the grasshopper finds the slope from the
 * tangent, without the hop of eps; 3 shows only the jumps on the red plot, one click an iteration.
 * The three Play buttons pick a speed and play it; Next steps through the plan of the speed picked.
 *
 * The plan of an iteration is the steps of black, red, blue and purple, in that order. The state
 * is (iter, idx, mode): idx clicks of iteration iter have been shown; (1, 0) is the empty start.
 *
 * THE STATE GIVEN TO A PART (st):
 *   iter, idx, mode, plan, cur {part, name}, part, name    where we are
 *   is(part, name)        the current click is that one (name optional)
 *   reached(part, name)   that click has been shown in this iteration
 *   partReached(part)     some click of that part has been shown in this iteration
 *   w0                    the room's guess (the default 0.5 until one is typed); typed: one was
 *   w                     w of this iteration; wNext the w the update gives; ws [w_1 .. w_iter]
 *   jumped                the grasshopper has jumped to wNext (purple's jump, or hop at speed 3)
 *   wShown                what the box of w shows: wNext once it has jumped
 *   plotW, trail          where the point of the plot stands (wNext once it has jumped) and the
 *                         earlier points, left as dots
 *   rest                  where the grasshopper rests: null (not yet there), 'perch' (on the box
 *                         of w) or 'plot' (on the plot at plotW); the engine puts it there
 *   view, zoomFrom        the plot's view {wlo, whi, lmax} (GF.geo.viewOf), and the view a zoom on
 *                         this click starts from (null: no zoom)
 *   eps, alpha            the hop and the step
 *   fresh                 true on a single forward click (animate runs), false otherwise
 *   hopFrom               the pose of the grasshopper before this render
 *
 * THE ADDRESS: #w=0.5&k=1&s=12 (guess, iteration, click), plus m=2 or m=3 (the speed), a=ALPHA,
 * e=EPS, theme=dark, still (no animation at all) and replay (show the click before, then play this
 * one), so any moment opens directly; at=purple:update names the click instead of s. The page
 * rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the end of the iteration where w has settled. p: play or pause. t: theme.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var PARTS = ['black', 'red', 'blue', 'purple'];
  var THEME_KEY = 'aml-grasshopper-finds-w-theme';

  var S = { w0: null, iter: 1, idx: 0, mode: 1, alpha: M.ALPHA, eps: M.EPS };
  var still = false, prevSt = null, stage = null;
  var PLAY = { on: false, timer: null };
  // the pause between two clicks while playing, by speed
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

  // (k, 0) for k >= 2 shows the same as the end of iteration k - 1; never sit beyond a plan's end.
  function normalize() {
    while (S.iter > 1 && S.idx < 1) { S.iter--; S.idx = plan(S.iter).length; }
    var n = plan(S.iter).length;
    if (S.idx > n) S.idx = n;
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

  function makeSt() {
    var P = plan(S.iter);
    var idx = Math.max(0, Math.min(S.idx, P.length));
    var shown = P.slice(0, idx);
    var cur = idx > 0 ? P[idx - 1] : null;
    var w0 = S.w0 === null ? M.W_DEFAULT : S.w0;
    var ws = M.run(w0, S.alpha, S.iter + 1);

    function reached(p, name) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p && shown[i].name === name) return true;
      return false;
    }
    function partReached(p) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p) return true;
      return false;
    }
    var k = -1;
    if (cur) k = part(cur.part).steps(S.iter).indexOf(cur.name);

    var st = {
      iter: S.iter, idx: idx, mode: S.mode, plan: P, cur: cur,
      part: cur ? cur.part : null, name: cur ? cur.name : null, k: k,
      is: function (p, name) { return !!cur && cur.part === p && (name === undefined || cur.name === name); },
      reached: reached, partReached: partReached,
      w0: w0, typed: S.w0 !== null,
      w: ws[S.iter - 1], wNext: ws[S.iter], ws: ws.slice(0, S.iter),
      eps: S.eps, alpha: S.alpha,
      fresh: false, hopFrom: null, zoomFrom: null
    };
    st.jumped = reached('purple', 'jump') || reached('purple', 'hop');
    st.wShown = st.jumped ? st.wNext : st.w;
    st.plotW = st.jumped ? st.wNext : st.w;
    st.trail = st.jumped ? ws.slice(0, S.iter) : ws.slice(0, S.iter - 1);
    st.rest = restOf(st);
    // the plot zooms to the view of this iteration at its red click (speed 3: at the hop); before
    // that it keeps the view of the iteration before
    var vk = S.iter;
    if (S.iter > 1 && !(st.partReached('red') || st.partReached('blue') || st.partReached('purple'))) vk = S.iter - 1;
    var all = M.run(w0, S.alpha, vk + 1);
    st.view = G.viewOf(all[vk - 1], all[vk], vk === 1);
    return st;
  }

  // Where the grasshopper rests in st: null (not there yet), 'perch' (on the box of w) or 'plot'
  // (on the plot at st.plotW). It lands on the plot at each jump and stays there into the next
  // iteration; while the backward pass is worked out it sits on its box.
  function restOf(st) {
    if (st.mode === 3) return st.jumped || st.iter > 1 ? 'plot' : null;
    if (st.reached('purple', 'decide') || st.jumped) return 'plot';
    if (st.partReached('purple')) return 'perch';
    if (st.iter > 1 || st.reached('blue', 'onplot')) return 'plot';
    if (st.reached('blue', 'hopper')) return 'perch';
    return null;
  }

  // The grasshopper's pose on the plot at w, as blue first put it there; f -1 faces left.
  function plotPose(w, f) {
    return { x: G.wx(w), y: G.ly(M.loss(w)), a: 0, s: GF.hopper.PLOT_SCALE, f: f || 1 };
  }

  // Once it has picked its way (purple's decision) it faces down the slope until the next iteration.
  function restFace(st) {
    if (!(st.jumped || st.reached('purple', 'decide'))) return 1;
    return st.wNext < st.w ? -1 : 1;
  }

  // ===== render

  function render(animate) {
    K.cancel();
    K.clearTemps();
    K.clearFlies();
    var st = makeSt();
    st.fresh = !!animate && !still;
    var h = GF.hopper.main;
    st.hopFrom = { x: h.pose.x, y: h.pose.y, a: h.pose.a, s: h.pose.s, f: h.pose.f };
    if (st.fresh && prevSt && !G.sameView(prevSt.view, st.view)) st.zoomFrom = prevSt.view;
    G.setView(st.view);

    // a jump (Back, a deep link) shows its state at once; a forward click lets the CSS fades run
    if (st.fresh) stage.classList.remove('still');
    else stage.classList.add('still');
    // the grasshopper where it rests; the parts' animations bring it there
    h.setPose(st.rest === 'plot' ? plotPose(st.plotW, restFace(st)) : GF.hopper.perchPose());
    h.show(!!st.rest);
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

  // One click forward; false when it could not move (a guess that does not parse).
  function next() {
    var st = makeSt();
    if (st.is('black', 'guess')) {
      var g = part('black').readGuess();
      if (!g.ok) { part('black').shake(); return false; }
      S.w0 = g.value;
    }
    if (S.idx < plan(S.iter).length) S.idx++;
    else { S.iter++; S.idx = 1; }
    render(true);
    return true;
  }

  function prev() {
    if (S.idx > 1 || (S.iter === 1 && S.idx === 1)) S.idx--;
    else if (S.iter > 1) { S.iter--; S.idx = plan(S.iter).length; }
    normalize();
    render(false);
  }

  function home() { S.iter = 1; S.idx = 0; render(false); }

  // the iteration from which w stays within 5e-5 of y / x
  function settleIter() {
    return M.settleAt(S.w0 === null ? M.W_DEFAULT : S.w0, S.alpha, 5e-5, 400);
  }

  function toEnd() {
    S.iter = settleIter();
    S.idx = plan(S.iter).length;
    render(false);
  }

  // ===== Play: one click after another, each once its animations are over and a pause has passed

  function atEnd() { return S.iter >= settleIter() && S.idx >= plan(S.iter).length; }

  function stopPlay() {
    PLAY.on = false;
    clearTimeout(PLAY.timer);
    controls(makeSt());
  }

  function tick() {
    if (!PLAY.on) return;
    if (K.pending() > 0) { PLAY.timer = setTimeout(tick, 60); return; }
    PLAY.timer = setTimeout(function () {
      if (!PLAY.on) return;
      if (K.pending() > 0) { tick(); return; }
      if (atEnd() || !next()) { stopPlay(); return; }
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
    controls(makeSt());
    clearTimeout(PLAY.timer);
    // the first click comes at once
    if (K.pending() === 0) { if (!next()) { stopPlay(); return; } }
    tick();
  }

  function togglePlay() { if (PLAY.on) stopPlay(); else playAt(S.mode); }

  // ===== the address

  function writeHash() {
    var a = [];
    if (S.w0 !== null) a.push('w=' + S.w0);
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
    if (q.a !== undefined) { var al = parseFloat(q.a); if (al > 0 && al < 1) S.alpha = al; }
    if (q.e !== undefined) { var ep = parseFloat(q.e); if (ep > 0 && ep <= 1) S.eps = ep; }
    S.mode = q.m === '2' ? 2 : q.m === '3' ? 3 : 1;
    if (q.k !== undefined) S.iter = Math.max(1, parseInt(q.k, 10) || 1);
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
  function byHand(f) { return function () { if (PLAY.on) stopPlay(); f(); }; }
  var NEXT = byHand(next), PREV = byHand(prev), HOME = byHand(home), END = byHand(toEnd);

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key, typing = e.target && e.target.tagName === 'INPUT';
    if (k === 'PageDown') { e.preventDefault(); NEXT(); return; }
    if (k === 'PageUp') { e.preventDefault(); PREV(); return; }
    if (typing) {
      if (k === 'Enter') { e.preventDefault(); NEXT(); }
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
    // under everything: the bands of the two passes
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
    GF.hopper.main = GF.hopper.make(GF.layers.blue.front, 'main');
    G.setView(G.viewOf(M.W_DEFAULT, M.step(M.W_DEFAULT, M.ALPHA), true));
    PARTS.forEach(function (p) { var x = part(p); if (x && x.build) x.build(GF.layers[p]); });

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    var nb = document.getElementById('next');
    nb.addEventListener('click', function () { NEXT(); nb.blur(); });
    [1, 2, 3].forEach(function (m) {
      var b = document.getElementById('play' + m);
      if (b) b.addEventListener('click', function () { playAt(m); b.blur(); });
    });
    var tb = document.getElementById('theme');
    if (tb) tb.addEventListener('click', function () { toggleTheme(); tb.blur(); });

    function enter() {
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
    next: next, prev: prev, home: home, toEnd: toEnd, render: render, plan: plan,
    state: makeSt, PARTS: PARTS, playAt: playAt, stopPlay: stopPlay, setMode: setMode,
    playing: function () { return PLAY.on; }, plotPose: plotPose
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
