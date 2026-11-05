/* engine.js: the state, the render loop, the keys, the address, the theme and the scaling of the
 * stage (from the engine of the grasshopper pages, ../grasshoppers-many-days/js/engine.js, with one
 * pass of clicks and no iterations).
 *
 * THE STATE is idx, the number of clicks shown (0 is the empty stage, AW.plan.length the end).
 * A part of the page asks st.r(id) (click id has been shown), st.c(id) (it is the last one shown)
 * or st.cur (the id of the last one shown, null at the start).
 *
 * THE ADDRESS: #s=12 (clicks shown) or #at=score-kat-divin (the click by name), plus theme=dark,
 * still (no animation at all) and replay (show the click before, then play this one), so any
 * moment opens directly. The page rewrites it at every move.
 *
 * KEYS: right arrow, space, Enter, page down: next. Left arrow, Backspace, page up: back.
 * Home: the start. End: the last click. t: theme. On a touch screen a tap goes on, and a tap on the
 * left third of the stage goes back.
 */
(function () {
  'use strict';
  var AW = window.AW, K = window.AWKit, G = AW.geo, PLAN = AW.plan;
  var THEME_KEY = 'aml-attention-walkthrough-theme';
  var idx = 0, still = false, stage = null;

  function makeSt() {
    var cur = idx > 0 ? PLAN[idx - 1] : null;
    return {
      idx: idx, cur: cur, plan: PLAN,
      r: function (id) { var p = PLAN.indexOf(id); return p >= 0 && p < idx; },
      c: function (id) { return cur === id; },
      fresh: false
    };
  }

  function render(animate) {
    K.cancel();
    K.clearTemps();
    K.clearFlies();
    var st = makeSt();
    st.fresh = !!animate && !still;
    // a jump (Back, a deep link) shows its state at once; a forward click lets the fades run
    if (st.fresh) stage.classList.remove('still');
    else stage.classList.add('still');
    AW.steps.render(st);
    if (st.fresh) AW.steps.animate(st);
    else {
      void stage.offsetWidth;
      requestAnimationFrame(function () { if (!still) stage.classList.remove('still'); });
    }
    writeHash();
    controls();
    stage.setAttribute('data-step', st.cur || 'start');
  }

  function next() { if (idx < PLAN.length) { idx++; render(true); } }
  function prev() { if (idx > 0) { idx--; render(false); } }
  function home() { idx = 0; render(false); }
  function toEnd() { idx = PLAN.length; render(false); }
  function go(i) { idx = Math.max(0, Math.min(PLAN.length, i)); render(false); }

  // ===== the address

  function writeHash() {
    var a = ['s=' + idx];
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
    if (q.s !== undefined) idx = Math.max(0, Math.min(PLAN.length, parseInt(q.s, 10) || 0));
    if (q.at !== undefined) {
      var at = PLAN.indexOf(q.at);
      if (at >= 0) idx = at + 1;
    }
    if (q.theme === 'light' || q.theme === 'dark') setTheme(q.theme, false);
    still = q.still !== undefined;
    return q;
  }

  // ===== controls, theme, fit

  function controls() {
    var where = document.getElementById('where');
    if (where) where.textContent = idx + ' / ' + PLAN.length;
    var nb = document.getElementById('next'), bb = document.getElementById('back');
    if (nb) nb.disabled = idx >= PLAN.length;
    if (bb) bb.disabled = idx <= 0;
  }

  function setTheme(t, remember) {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    if (remember !== false) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* blocked */ } }
  }
  // the theme shown: the one set on the page, else the system's (a page without data-theme follows
  // prefers-color-scheme in css/style.css)
  function shownTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function toggleTheme() { setTheme(shownTheme() === 'dark' ? 'light' : 'dark'); }

  // the stage fills the viewport inside its padding (the safe area of a phone)
  function fit() {
    var vp = document.getElementById('viewport'), cs = getComputedStyle(vp);
    var w = vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = vp.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var s = Math.min(w / G.W, h / G.H);
    stage.style.transform = 'scale(' + s + ')';
    K.scale = s;
  }

  // on a touch screen a tap goes on, and a tap on the left third of the stage goes back; a mouse
  // click on the stage does nothing, so a stray click in the lecture moves nothing
  function onTap(e) {
    if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;
    if (e.target.closest && e.target.closest('button')) return;
    var r = stage.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width < 1 / 3) prev();
    else next();
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'Enter' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'Backspace' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); home(); }
    else if (k === 'End') { e.preventDefault(); toEnd(); }
    else if (k === 't' || k === 'T') toggleTheme();
  }

  function init() {
    // a theme chosen with t before wins; else the page keeps what is set on it (index.html: light,
    // the lecture default), and a page with nothing set follows the system
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* blocked */ }
    if (saved === 'dark' || saved === 'light') setTheme(saved, false);

    stage = document.getElementById('stage');
    K.stage = stage;
    K.top = document.getElementById('html-top');
    AW.steps.build({
      back: document.getElementById('svg-back'),
      mid: document.getElementById('html-mid'),
      top: K.top
    });

    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('keydown', onKey);
    stage.addEventListener('click', onTap);
    function button(id, fn) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () { fn(); b.blur(); });
    }
    button('next', next);
    button('back', prev);
    button('theme', toggleTheme);

    function enter() {
      var q = readHash();
      if (q.replay !== undefined && idx > 0) {
        idx--;
        render(false);
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

  AW.engine = { next: next, prev: prev, home: home, toEnd: toEnd, go: go, render: render, state: makeSt };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
