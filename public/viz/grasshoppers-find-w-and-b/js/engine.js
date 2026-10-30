/* engine.js: the click plan, the state, the render loop, the keys, the address and the theme.
 * Grown from the engine of the page before this one (../grasshopper-finds-w/js/engine.js): the
 * same contract, with a second number b, the story in front and a closing part at the end.
 *
 * THE PARTS. Each part registers itself in window.GF.parts:
 *
 *   GF.parts.<p> = {
 *     steps(iter, ctx) -> the names of its clicks in iteration iter (iter 1 tells the whole story,
 *                     iter >= 2 repeats it in fewer clicks); ctx.settle is the iteration where the
 *                     run settles (the closing part has its clicks there only)
 *     build(layer) -> once at load: make its elements, hidden, in layer.back (SVG under the boxes),
 *                     layer.mid (HTML: boxes, formulas), layer.front (SVG over the boxes) and
 *                     layer.top (HTML over everything)
 *     render(st)   -> on every move: show exactly what state st shows, from scratch
 *     animate(st, prev) -> after render, on a single forward click only: decorate the change
 *   }
 *
 * The plan of an iteration is the steps of story, black, red, blue, purple and coda, in that order.
 * The part `ground` (the two grounds on the right) has no clicks of its own: it draws what the red
 * and blue clicks ask for. The state is (iter, idx): idx clicks of iteration iter have been shown;
 * (1, 0) is the empty start.
 *
 * THE STATE GIVEN TO A PART (st):
 *   iter, idx, plan, cur {part, name}, part, name    where we are
 *   is(part, name)        the current click is that one (name optional)
 *   reached(part, name)   that click has been shown in this iteration
 *   partReached(part)     some click of that part has been shown in this iteration
 *   w0, b0                the room's start (-1 and 60 until one is typed); typed: one was
 *   w, b                  the pair of this iteration; wNext, bNext what the update gives
 *   wShown, bShown        what the boxes show: the next pair once purple's update has been shown
 *   hop                   null, or {who: 'w' or 'b', fwd}: the boxes show a grasshopper's test hop
 *                         (who's box shows its number plus eps; with fwd, a, yhat and l follow)
 *   eps, alpha            the hop and the step
 *   F, settle             the views of this start (GFMath.frames) and the iteration where it settles
 *   fresh                 true on a single forward click (animate runs), false otherwise
 *   hopFrom               {w, b}: the poses of the two grasshoppers before this render
 *
 * THE ADDRESS: #w=-1&b=60&k=1&s=12 (start, iteration, click), plus a=ALPHA, e=EPS, theme=dark,
 * still (no animation at all) and replay (show the click before, then play this one), so any moment
 * opens directly; at=blue:hopw names the click instead of s. The page rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the update of the iteration where the run settles. t: theme.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var PLAN = ['story', 'black', 'red', 'blue', 'purple', 'coda'];
  var DRAW = ['story', 'black', 'red', 'ground', 'blue', 'purple', 'coda'];
  var THEME_KEY = 'aml-grasshoppers-find-w-and-b-theme';

  var S = { w0: null, b0: null, iter: 1, idx: 0, alpha: M.ALPHA, eps: M.EPS };
  var still = false, prevSt = null, stage = null;
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

  function settleIter() { return frames().n - 1; }

  function plan(iter) {
    var out = [], ctx = { settle: settleIter() };
    PLAN.forEach(function (p) {
      var x = part(p);
      if (!x || !x.steps) return;
      x.steps(iter, ctx).forEach(function (name) { out.push({ part: p, name: name }); });
    });
    return out;
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
      iter: S.iter, idx: idx, plan: P, cur: cur,
      part: cur ? cur.part : null, name: cur ? cur.name : null,
      is: function (p, name) { return !!cur && cur.part === p && (name === undefined || cur.name === name); },
      reached: reached, partReached: partReached,
      w0: s.w, b0: s.b, typed: S.w0 !== null || S.b0 !== null,
      w: ps[S.iter - 1].w, b: ps[S.iter - 1].b, wNext: ps[S.iter].w, bNext: ps[S.iter].b,
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

    // a jump (Back, a deep link) shows its state at once; a forward click lets the CSS fades run
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

  // ===== moves

  function next() {
    var st = makeSt();
    if (st.is('black', 'guess')) {
      var g = part('black').readGuess();
      if (!g.ok) { part('black').shake(g.which); return; }
      S.w0 = g.w;
      S.b0 = g.b;
    }
    if (S.idx < plan(S.iter).length) S.idx++;
    else { S.iter++; S.idx = 1; }
    render(true);
  }

  function prev() {
    if (S.idx > 1 || (S.iter === 1 && S.idx === 1)) S.idx--;
    else if (S.iter > 1) { S.iter--; S.idx = plan(S.iter).length; }
    render(false);
  }

  function home() { S.iter = 1; S.idx = 0; render(false); }

  // The update of the iteration where the run settles; the closing clicks follow it.
  function toEnd() {
    S.iter = settleIter();
    var names = plan(S.iter).map(function (p) { return p.part + ':' + p.name; });
    S.idx = names.indexOf('purple:update') + 1;
    render(false);
  }

  // ===== the address

  function writeHash() {
    var a = [];
    if (S.w0 !== null) a.push('w=' + S.w0);
    if (S.b0 !== null) a.push('b=' + S.b0);
    a.push('k=' + S.iter, 's=' + S.idx);
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
    var w = q.w !== undefined ? M.parse(q.w) : null, b = q.b !== undefined ? M.parse(q.b) : null;
    // a dead start (the heating off: the grasshoppers would never move) is not taken
    if (!M.dead(w === null ? M.W_DEFAULT : w, b === null ? M.B_DEFAULT : b)) { S.w0 = w; S.b0 = b; }
    // alpha up to 1 / (2 (x^2 + 1)) = 1/52: every update then keeps a share 1 - 52 alpha >= 0 of the
    // gap, so no run overshoots and the heating runs all along it
    if (q.a !== undefined) { var al = parseFloat(q.a); if (al > 0 && al <= 0.019) S.alpha = al; }
    if (q.e !== undefined) { var ep = parseFloat(q.e); if (ep > 0 && ep <= 1) S.eps = ep; }
    if (q.k !== undefined) S.iter = Math.max(1, Math.min(parseInt(q.k, 10) || 1, 2000));
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

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key, typing = e.target && e.target.tagName === 'INPUT';
    if (k === 'PageDown') { e.preventDefault(); next(); return; }
    if (k === 'PageUp') { e.preventDefault(); prev(); return; }
    if (typing) {
      if (k === 'Enter') { e.preventDefault(); if (!part('black').enterInField(e.target)) next(); }
      else if (k === 'Tab') { e.preventDefault(); part('black').switchField(e.target, e.shiftKey); }
      else if (k === 'Escape') e.target.blur();
      return;
    }
    var st = makeSt();
    if (st.is('black', 'guess') && /^[0-9.,+-]$/.test(k)) { part('black').focusGuess(); return; }
    if (k === 'ArrowRight' || k === ' ' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); home(); }
    else if (k === 'End') { e.preventDefault(); toEnd(); }
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
    var nb = document.getElementById('next');
    nb.addEventListener('click', function () { next(); nb.blur(); });
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
    state: makeSt, PLAN: PLAN, DRAW: DRAW
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
