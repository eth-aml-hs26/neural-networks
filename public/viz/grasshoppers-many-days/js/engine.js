/* engine.js: the click plan, the state, the render loop, the keys, the address, the theme and the
 * run (from step 0, ../grasshopper-finds-w/, with two numbers, two grasshoppers and Play).
 *
 * THE PARTS. Each of the four parts registers itself in window.GF.parts under its colour:
 *
 *   GF.parts.<p> = {
 *     steps(iter)  -> the names of its clicks in iteration iter (iter 1 tells the whole story,
 *                     iter >= 2 repeats it in fewer clicks)
 *     build(layer) -> once at load: make its elements, hidden, in layer.back (SVG under the boxes),
 *                     layer.mid (HTML: boxes, cells, formulas), layer.front (SVG over the boxes) and
 *                     layer.top (HTML over everything)
 *     render(st)   -> on every move: show exactly what state st shows, from scratch
 *     animate(st, prev) -> after render, on a single forward click only: decorate the change
 *   }
 *
 * The plan of an iteration is the steps of black, red, blue and purple, in that order. The state
 * is (iter, idx): idx clicks of iteration iter have been shown; (1, 0) is the empty start.
 *
 * THE STATE GIVEN TO A PART (st):
 *   iter, idx, plan, cur {part, name}, part, name    where we are
 *   is(part, name), reached(part, name), partReached(part)    as in step 0
 *   w0, b0                the start; w, b of this iteration; wNext, bNext what the update gives
 *   ws, bs                [w_1 .. w_iter], [b_1 .. b_iter], for the trail in the plot
 *   wShown, bShown        what the boxes show: wNext, bNext once purple's update has been shown
 *   f                     the forward pass at (w, b) (GFMath.forward); g the gradient
 *   hw, hb                the hops of grasshoppers w and b (GFMath.hop)
 *   eps, alpha            the hop and the step; K the iteration where the run settles
 *   fresh                 true on a single forward click (animate runs), false otherwise
 *
 * THE ADDRESS: #k=1&s=12 (iteration, clicks shown), plus w= and b= (another start), a=ALPHA,
 * e=EPS, theme=dark, still (no animation at all) and replay (show the click before, then play
 * this one), so any moment opens directly; at=purple:update names the click instead of s. The page
 * rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the end of the iteration where the run has settled. p: play or pause.
 * t: theme. The buttons +1, +10 and +100 jump that many iterations on; Play runs to the end.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var PARTS = ['black', 'red', 'blue', 'purple'];
  var THEME_KEY = 'aml-grasshoppers-many-days-theme';

  var S = { w0: M.W0, b0: M.B0, iter: 1, idx: 0, alpha: M.ALPHA, eps: M.EPS };
  var still = false, prevSt = null, stage = null, settle = null, playing = null;

  function part(p) { return GF.parts[p] || null; }

  function plan(iter) {
    var out = [];
    PARTS.forEach(function (p) {
      var x = part(p);
      if (!x || !x.steps) return;
      x.steps(iter).forEach(function (name) { out.push({ part: p, name: name }); });
    });
    return out;
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
      iter: S.iter, idx: idx, plan: P, cur: cur,
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
    stop();
    if (S.idx < plan(S.iter).length) S.idx++;
    else { S.iter++; S.idx = 1; }
    render(true);
  }

  function prev() {
    stop();
    if (S.idx > 1 || (S.iter === 1 && S.idx === 1)) S.idx--;
    else if (S.iter > 1) { S.iter--; S.idx = plan(S.iter).length; }
    render(false);
  }

  function home() { stop(); S.iter = 1; S.idx = 0; render(false); }

  function toEnd() {
    stop();
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

  // Play: iterations 2 to 10 one by one, slowly enough to follow the hinge line as it swings onto
  // the points, then two at a time, then faster and faster (each jump 15 percent of the iteration
  // reached), until the run settles: about five seconds from iteration 1. Any other move stops it.
  function play() {
    if (playing) { stop(); return; }
    if (S.iter >= K_()) return;
    playing = { gen: 0 };
    var me = playing;
    function tick() {
      if (playing !== me) return;
      var k = S.iter, n = k < 10 ? 1 : k < 20 ? 2 : Math.ceil(k * 0.15);
      if (!jump(n) || S.iter >= K_()) { stop(); return; }
      setTimeout(tick, k < 10 ? 380 : k < 20 ? 110 : 24);
    }
    controls(makeSt());
    tick();
  }

  function stop() {
    if (!playing) return;
    playing = null;
    controls(makeSt());
  }

  // ===== the address

  function writeHash() {
    var a = [];
    if (S.w0 !== M.W0) a.push('w=' + S.w0);
    if (S.b0 !== M.B0) a.push('b=' + S.b0);
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
    if (q.w !== undefined) { var v = M.parse(q.w); if (v !== null) S.w0 = v; }
    if (q.b !== undefined) { var u = M.parse(q.b); if (u !== null) S.b0 = u; }
    if (q.a !== undefined) { var al = parseFloat(q.a); if (al > 0 && al < 1) S.alpha = al; }
    if (q.e !== undefined) { var ep = parseFloat(q.e); if (ep > 0 && ep <= 1) S.eps = ep; }
    if (q.k !== undefined) S.iter = Math.max(1, Math.min(M.KMAX - 1, parseInt(q.k, 10) || 1));
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
    if (where) where.textContent = st.idx === 0 && st.iter === 1 ? '' : 'iteration ' + st.iter;
    var runs = document.querySelector('#controls .runs');
    if (runs) runs.classList.toggle('on', st.iter > 1 || st.reached('purple', 'update'));
    var pb = document.getElementById('play');
    if (pb) {
      pb.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
      pb.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
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
    var k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'Enter' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'Backspace' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); home(); }
    else if (k === 'End') { e.preventDefault(); toEnd(); }
    else if (k === 'p' || k === 'P') play();
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
    button('next', next);
    button('plus1', function () { stop(); jump(1); });
    button('plus10', function () { stop(); jump(10); });
    button('plus100', function () { stop(); jump(100); });
    button('play', play);
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
    next: next, prev: prev, home: home, toEnd: toEnd, jump: jump, play: play, stop: stop,
    render: render, plan: plan, state: makeSt, PARTS: PARTS
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
