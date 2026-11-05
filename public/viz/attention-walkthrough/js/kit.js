/* kit.js: small helpers for the page, as window.AWKit (from the kit of the grasshopper pages,
 * ../grasshoppers-many-days/js/kit.js, with KaTeX trusted for \htmlClass and flying cells added).
 *
 *   svg(tag, attrs, parent, cls), div(cls, parent, tag)   make elements
 *   pos(el, x, y, anchor)        place an HTML element on the stage ('tl', 'cc', 'br', ...)
 *   tex(el, src, display)        KaTeX into el (skipped when el already shows src)
 *   row(el, pieces)              a formula as separate KaTeX pieces, so numbers can fly into one
 *   show(el, on)                 the class "on": .vis elements fade in and out (css/style.css)
 *   tween, wait, later, flash    decoration for a forward click
 *   flyChip(...)                 a copy of a cell flies from one place to another
 *   temp(el, prop, value), tempClass(el, cls)   changes that the next render undoes
 *
 * State is the truth and animation is decoration: every render first calls cancel() (running
 * tweens stop), clearTemps() and clearFlies(), then draws the state from scratch. No colour is
 * written here: an element takes its colour from a class (css/style.css).
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var K = { scale: 1, stage: null, top: null };
  var KATEX = { throwOnError: false, trust: true, strict: false };

  // ===== elements

  K.svg = function (tag, attrs, parent, cls) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (cls) e.setAttribute('class', cls);
    if (parent) parent.appendChild(e);
    return e;
  };

  K.div = function (cls, parent, tag) {
    var e = document.createElement(tag || 'div');
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  };

  var AX = { l: '0', c: '-50%', r: '-100%' };
  var AY = { t: '0', c: '-50%', b: '-100%' };
  // Put an absolutely positioned element at (x, y) of the stage; anchor says which point of the
  // element sits there: first letter t, c or b (top, centre, bottom), second l, c or r.
  K.pos = function (el, x, y, anchor) {
    var a = anchor || 'tl';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.transform = 'translate(' + AX[a.charAt(1)] + ',' + AY[a.charAt(0)] + ')';
    return el;
  };

  K.opts = function (display) {
    return { throwOnError: false, trust: true, strict: false, displayMode: !!display };
  };

  K.tex = function (el, src, display) {
    src = String(src);
    if (el.__tex === src) return el;
    el.__tex = src;
    katex.render(src, el, K.opts(display));
    return el;
  };

  // A formula made of pieces [{key, tex}], each its own KaTeX span, so an animation can fly a
  // number into one piece. Returns {key: span}; re-rendering with the same pieces costs nothing.
  K.row = function (el, pieces) {
    var sig = pieces.map(function (p) { return (p.key || '') + '=' + p.tex; }).join('|');
    if (el.__row === sig) return el.__spans;
    el.__row = sig;
    while (el.firstChild) el.removeChild(el.firstChild);
    var spans = {};
    pieces.forEach(function (p) {
      var s = K.div('piece', el, 'span');
      katex.render(p.tex, s, KATEX);
      if (p.key) spans[p.key] = s;
    });
    el.__spans = spans;
    return spans;
  };

  K.show = function (el, on) {
    if (el) el.classList.toggle('on', !!on);
    return el;
  };

  // ===== geometry on the stage

  K.rect = function (el) {
    var r = el.getBoundingClientRect(), s = K.stage.getBoundingClientRect(), k = K.scale || 1;
    var x = (r.left - s.left) / k, y = (r.top - s.top) / k, w = r.width / k, h = r.height / k;
    return { x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2 };
  };

  // ===== temporary changes, undone by the next render

  var TEMPS = [];
  K.temp = function (el, prop, value) {
    TEMPS.push([el, prop]);
    el.style[prop] = value;
  };
  K.tempClass = function (el, cls) {
    TEMPS.push([el, null, cls]);
    el.classList.add(cls);
  };
  K.clearTemps = function () {
    TEMPS.forEach(function (t) {
      if (t[1]) t[0].style[t[1]] = '';
      else t[0].classList.remove(t[2]);
    });
    TEMPS = [];
  };

  // ===== tweens

  var GEN = 0;
  K.cancel = function () { GEN++; };
  K.alive = function (g) { return g === GEN; };
  K.gen = function () { return GEN; };

  K.ease = {
    lin: function (t) { return t; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };

  // Calls fn(e) with e from 0 to 1 over ms, then done(). Stops silently once a new render ran.
  K.tween = function (ms, fn, ease, done) {
    var g = GEN, t0 = null, ez = ease || K.ease.inOut;
    if (ms <= 0) { fn(1); if (done) done(); return; }
    function frame(now) {
      if (g !== GEN) return;
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / ms);
      fn(ez(t));
      if (t < 1) requestAnimationFrame(frame);
      else if (done) done();
    }
    requestAnimationFrame(frame);
  };

  K.wait = function (ms, fn) {
    var g = GEN;
    setTimeout(function () { if (g === GEN) fn(); }, ms);
  };

  // Hide el now and show it again after delay ms (its CSS transition, if any, fades it in).
  K.later = function (el, delay) {
    K.temp(el, 'opacity', '0');
    K.wait(delay, function () { el.style.opacity = ''; });
  };

  // Hide el until reveal() is called (a number that arrives with a flight).
  K.hold = function (el) {
    K.temp(el, 'opacity', '0');
    return function () { el.style.opacity = ''; };
  };

  // A copy of a cell flies from rectangle a to rectangle b (stage coordinates, centre to centre,
  // on a small arc), then disappears and calls done(). cls gives the copy its look ('chip one t-q').
  K.flyChip = function (text, cls, a, b, ms, delay, done, lift) {
    K.wait(delay || 0, function () {
      var f = K.div('fly chip ' + (cls || ''), K.top);
      f.style.width = a.w + 'px';
      f.style.height = a.h + 'px';
      f.textContent = text;
      var dw = b.w - a.w, dh = b.h - a.h, up = lift === undefined ? 46 : lift;
      K.pos(f, a.cx, a.cy, 'cc');
      K.tween(ms, function (e) {
        f.style.left = (a.cx + (b.cx - a.cx) * e) + 'px';
        f.style.top = (a.cy + (b.cy - a.cy) * e - Math.sin(Math.PI * e) * up) + 'px';
        f.style.width = (a.w + dw * e) + 'px';
        f.style.height = (a.h + dh * e) + 'px';
      }, K.ease.inOut, function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        if (done) done();
      });
    });
  };

  // A copy of a KaTeX formula flies from rectangle a to rectangle b, then disappears.
  K.flyTex = function (src, a, b, ms, cls, delay, done, fontPx) {
    K.wait(delay || 0, function () {
      var f = K.div('fly ' + (cls || ''), K.top);
      if (fontPx) f.style.fontSize = fontPx + 'px';
      katex.render(String(src), f, KATEX);
      K.pos(f, a.cx, a.cy, 'cc');
      K.tween(ms, function (e) {
        f.style.left = (a.cx + (b.cx - a.cx) * e) + 'px';
        f.style.top = (a.cy + (b.cy - a.cy) * e - Math.sin(Math.PI * e) * 40) + 'px';
      }, K.ease.inOut, function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        if (done) done();
      });
    });
  };

  // A word in the serif italic of the page flies from rectangle a to rectangle b.
  K.flyWord = function (text, a, b, ms, delay, done, fromPx, toPx) {
    K.wait(delay || 0, function () {
      var f = K.div('fly fly-word', K.top);
      f.textContent = text;
      f.style.fontSize = fromPx + 'px';
      K.pos(f, a.cx, a.cy, 'cc');
      K.tween(ms, function (e) {
        f.style.left = (a.cx + (b.cx - a.cx) * e) + 'px';
        f.style.top = (a.cy + (b.cy - a.cy) * e - Math.sin(Math.PI * e) * 30) + 'px';
        f.style.fontSize = (fromPx + (toPx - fromPx) * e) + 'px';
      }, K.ease.inOut, function () {
        if (f.parentNode) f.parentNode.removeChild(f);
        if (done) done();
      });
    });
  };

  K.clearFlies = function () {
    if (!K.top) return;
    Array.prototype.slice.call(K.top.querySelectorAll('.fly')).forEach(function (f) {
      f.parentNode.removeChild(f);
    });
  };

  // A short highlight behind a number that was just found (keyframes in css/style.css).
  K.flash = function (el, delay) {
    K.wait(delay || 0, function () {
      el.classList.remove('flash');
      void el.offsetWidth;
      K.tempClass(el, 'flash');
    });
  };

  window.AWKit = K;
})();
