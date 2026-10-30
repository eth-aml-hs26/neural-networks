/* engine.js: the click plan, the state, the render loop, the keys, the address, the theme and the
 * run (grown from the engines of steps 0 to 2: ../grasshopper-finds-w/, ../grasshoppers-find-w-and-b/
 * and ../grasshoppers-many-days/, with eight grasshoppers, the story in front, a closing part and
 * Play stopping where the curve stops moving).
 *
 * THE PARTS. Each part registers itself in window.GF.parts:
 *
 *   GF.parts.<p> = {
 *     steps(iter, ctx) -> the names of its clicks in iteration iter (iteration 1 tells the whole
 *                     story, later ones repeat it in fewer clicks); ctx.K is the iteration where
 *                     the run settles, ctx.lean drops the optional clicks
 *     build(layer) -> once at load: make its elements, hidden, in layer.back (SVG under the boxes),
 *                     layer.mid (HTML: boxes, cells, formulas), layer.front (SVG over the boxes)
 *                     and layer.top (HTML over everything)
 *     render(st)   -> on every move: show exactly what state st shows, from scratch
 *     plot(st, o)  -> add what it shows in the plot to the options o of GF.plot.render
 *     animate(st, prev) -> after render, on a single forward click only: decorate the change
 *   }
 *
 * The plan of an iteration is the steps of story, black, red, blue, purple and coda, in that order.
 * The state is (iter, idx): idx clicks of iteration iter have been shown; (1, 0) is the empty start.
 *
 * THE STATE GIVEN TO A PART (st):
 *   iter, idx, plan, cur {part, name}, part, name    where we are
 *   is(part, name), reached(part, name), partReached(part)    as in step 0
 *   D, T                  the data (SwarmMath.data) and SwarmMath.DEFAULTS
 *   P, Pn                 the numbers of this iteration and the ones its update gives
 *   F, G                  the forward pass and the slopes at P
 *   Pshown                what the columns w and b show: Pn once the update has been shown
 *   hop(which, j)         the hop of grasshopper which_j at P (SwarmMath.hop, kept)
 *   one                   the best single bend of step 2 and its forward pass (SwarmMath.oneBendPass)
 *   K, R                  the iteration where the run settles, and the run itself
 *   eps, alpha, lean      the hop, the step, and whether the optional clicks are dropped
 *   playing               Play is running (no animation, no flight)
 *   fresh                 true on a single forward click (animate runs), false otherwise
 *
 * THE ADDRESS: #k=1&s=12 (iteration, clicks shown), plus at=blue:hop (a click by name instead of s),
 * start=dead or start=twins (the presets of GRADIENTS.md), a=ALPHA, e=EPS, lean (no optional
 * click), theme=dark, still (no animation at all) and replay (show the click before, then play
 * this one), so any moment opens directly. The page rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the iteration where the run settles. p: play or pause. t: theme.
 * The buttons +1, +10 and +100 jump that many iterations on; Play runs to where the curve stops
 * moving, at the pace of SwarmMath.playTime (two iterations a second, doubling every 2.5 s).
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS;
  var PARTS = ['story', 'black', 'red', 'blue', 'purple', 'coda'];
  var THEME_KEY = 'aml-grasshopper-swarm-theme';
  var D = M.data(T.x, T.y);

  var S = { start: null, iter: 1, idx: 0, alpha: T.alpha, eps: T.eps, lean: false };
  var still = false, prevSt = null, stage = null, playing = null;
  var cache = { key: null };

  function part(p) { return GF.parts[p] || null; }

  // The start of the run: the defaults, or a preset of GRADIENTS.md.
  function start() {
    var src = S.start === 'dead' ? T.dead : S.start === 'twins' ? T.twins : T;
    return M.params(src.w, src.b);
  }

  // The run from the start (to 20 000 iterations, as GRADIENTS.md measures it) and where it settles:
  // the first iteration from which the curve stops moving (SwarmMath.settleAt). A run that blows up
  // ends at its last finite iteration.
  function run() {
    var key = [S.start, S.alpha].join('|');
    if (cache.key !== key) {
      var R = M.run(D, start(), S.alpha, { kmax: 20000 });
      var k = R.diverged ? R.ps.length - 1 : (M.settleAt(D, R) || R.ps.length - 1);
      cache = { key: key, R: R, K: Math.max(2, Math.min(k, R.ps.length - 1)), one: cache.one || M.oneBendPass(D) };
    }
    return cache;
  }

  function plan(iter) {
    var out = [], ctx = { K: run().K, lean: S.lean };
    PARTS.forEach(function (p) {
      var x = part(p);
      if (!x || !x.steps) return;
      x.steps(iter, ctx).forEach(function (name) { out.push({ part: p, name: name }); });
    });
    return out;
  }

  // the click that shows a whole later iteration at rest: its numbers, its forward pass, its slopes
  function restIdx(iter) {
    var P = plan(iter);
    for (var i = 0; i < P.length; i++) if (P[i].part === 'blue' && P[i].name === 'hops') return i + 1;
    return 1;
  }

  function makeSt() {
    var C = run(), P = plan(S.iter);
    var idx = Math.max(0, Math.min(S.idx, P.length));
    var shown = P.slice(0, idx);
    var cur = idx > 0 ? P[idx - 1] : null;
    var ps = C.R.ps, k = S.iter;

    function reached(p, name) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p && shown[i].name === name) return true;
      return false;
    }
    function partReached(p) {
      for (var i = 0; i < shown.length; i++) if (shown[i].part === p) return true;
      return false;
    }
    var Pk = ps[k - 1], Pn = ps[Math.min(k, ps.length - 1)];
    var hops = {};
    var st = {
      iter: k, idx: idx, plan: P, cur: cur,
      part: cur ? cur.part : null, name: cur ? cur.name : null,
      is: function (p, name) { return !!cur && cur.part === p && (name === undefined || cur.name === name); },
      reached: reached, partReached: partReached,
      D: D, T: T, P: Pk, Pn: Pn, F: M.forward(D, Pk), G: M.grad(D, Pk),
      hop: function (which, j) {
        var key = which + j;
        if (!hops[key]) hops[key] = M.hop(D, Pk, which, j, S.eps);
        return hops[key];
      },
      one: C.one, K: C.K, R: C.R,
      eps: S.eps, alpha: S.alpha, lean: S.lean, playing: !!playing,
      fresh: false
    };
    var upd = reached('purple', 'all') || reached('purple', 'update');
    st.Pshown = upd ? Pn : Pk;
    return st;
  }

  // ===== render

  function render(animate) {
    K.cancel();
    K.clearTemps();
    K.clearFlies();
    var st = makeSt();
    st.fresh = !!animate && !still && !playing;

    // a jump (Back, a deep link, Play) shows its state at once; a forward click lets the fades run
    if (st.fresh) stage.classList.remove('still');
    else stage.classList.add('still');
    GF.hoppers.render(st);
    PARTS.forEach(function (p) { var x = part(p); if (x && x.render) x.render(st); });
    var o = {};
    PARTS.forEach(function (p) { var x = part(p); if (x && x.plot) x.plot(st, o); });
    GF.plot.render(o);
    if (st.fresh) {
      PARTS.forEach(function (p) { var x = part(p); if (x && x.animate) x.animate(st, prevSt); });
    } else if (!playing) {
      void stage.offsetWidth;
      requestAnimationFrame(function () { if (!still && !playing) stage.classList.remove('still'); });
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
    else if (S.iter < run().K) { S.iter++; S.idx = 1; }
    else return;
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
    S.iter = run().K;
    S.idx = restIdx(S.iter);
    render(false);
  }

  // n iterations on, shown at rest (the numbers, the forward pass and the slopes of that
  // iteration), never past the iteration where the run settles.
  function jump(n) {
    var k = Math.min(run().K, S.iter + n);
    if (k <= S.iter) return false;
    S.iter = k;
    S.idx = restIdx(k);
    render(false);
    return true;
  }

  // Play: iteration k shows playTime(k) seconds after iteration 1 would have, so Play picks up the
  // pace where the run stands; it stops where the curve stops moving (or the run blows up).
  function play() {
    if (playing) { stop(); return; }
    var Kk = run().K;
    if (S.iter >= Kk) return;
    var me = { t0: performance.now() - 1000 * M.playTime(S.iter) };
    playing = me;
    controls(makeSt());
    function frame(now) {
      if (playing !== me) return;
      var k = Math.min(Kk, M.playCount((now - me.t0) / 1000));
      if (k > S.iter) {
        S.iter = k;
        S.idx = restIdx(k);
        render(false);
      }
      if (S.iter >= Kk) { stop(); render(false); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function stop() {
    if (!playing) return;
    playing = null;
    controls(makeSt());
  }

  // ===== the address

  function writeHash() {
    var a = [];
    if (S.start) a.push('start=' + S.start);
    a.push('k=' + S.iter, 's=' + S.idx);
    if (S.alpha !== T.alpha) a.push('a=' + S.alpha);
    if (S.eps !== T.eps) a.push('e=' + S.eps);
    if (S.lean) a.push('lean');
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
    S.start = q.start === 'dead' || q.start === 'twins' ? q.start : null;
    S.alpha = T.alpha;
    S.eps = T.eps;
    if (q.a !== undefined) { var al = M.parse(q.a); if (al !== null && al > 0 && al < 1) S.alpha = al; }
    if (q.e !== undefined) { var ep = M.parse(q.e); if (ep !== null && ep > 0 && ep <= 1) S.eps = ep; }
    S.lean = q.lean !== undefined;
    var Kk = run().K;
    S.iter = 1;
    S.idx = 0;
    if (q.k !== undefined) S.iter = Math.max(1, Math.min(Kk, parseInt(q.k, 10) || 1));
    if (q.s !== undefined) S.idx = Math.max(0, parseInt(q.s, 10) || 0);
    if (q.at !== undefined) {
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
    if (runs) runs.classList.toggle('on', (st.iter > 1 || st.reached('purple', 'all')) && st.iter < st.K);
    var pb = document.getElementById('play');
    if (pb) {
      pb.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
      pb.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }
    var nb = document.getElementById('next');
    if (nb) {
      var last = st.iter === 1 && st.is('story', 'board');
      nb.firstChild.nodeValue = last ? 'Fit ' : 'Next ';
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

  // ===== the swarm: one grasshopper beside every cell of w and b

  GF.hoppers = {
    each: function (fn) {
      ['w', 'b'].forEach(function (which) {
        GF.hopper.swarm[which].forEach(function (h, j) { fn(h, which, j); });
      });
    },
    // by default: perched beside its cell, from black:land of iteration 1 on, outside the story;
    // asleep while its neuron hears no day
    render: function (st) {
      var on = st.part !== 'story' && (st.iter > 1 || st.reached('black', 'land'));
      var dead = M.dead(D, st.Pshown);
      GF.hoppers.each(function (h, which, j) {
        h.setPose(GF.hopper.perchPose(which, j));
        h.show(on);
        h.dim(false);
        h.asleep(dead.indexOf(j) >= 0);
      });
    }
  };

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
      var colour = { story: 'black', coda: 'black' }[p] || p;
      GF.layers[p] = {
        back: K.svg('g', null, back, 'part k-' + colour),
        mid: K.div('part k-' + colour, mid),
        front: K.svg('g', null, front, 'part k-' + colour),
        top: K.div('part k-' + colour, K.top)
      };
    });
    GF.hopper.swarm = { w: [], b: [] };
    for (var j = 0; j < T.m; j++) {
      GF.hopper.swarm.w.push(GF.hopper.make(GF.layers.blue.front, 'hop-w' + (j + 1)));
      GF.hopper.swarm.b.push(GF.hopper.make(GF.layers.blue.front, 'hop-b' + (j + 1)));
    }
    GF.plot.build(GF.layers.black);
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
    render: render, plan: plan, state: makeSt, PARTS: PARTS, run: run
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
