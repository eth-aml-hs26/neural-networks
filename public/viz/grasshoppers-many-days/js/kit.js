/* kit.js: small helpers shared by the four parts, as window.GFKit (copied from step 0,
 * ../grasshopper-finds-w/, with an arrow without a head and a flying dot added; the band of a pass
 * and the count of pending animations copied again from step 0 on 2 November 2026).
 *
 *   svg(tag, attrs, parent, cls), div(cls, parent, tag)   make elements
 *   pos(el, x, y, anchor)        place an HTML element on the stage ('tl', 'cc', 'br', ...)
 *   tex(el, src, display)        KaTeX into el (skipped when el already shows src)
 *   row(el, pieces)              a formula as separate KaTeX pieces, so numbers can fly into one
 *   show(el, on)                 the class "on": .vis elements fade in and out (css/style.css)
 *   route(pts, r), arrow(...)    polylines with rounded corners and an arrowhead (or none)
 *   roundPoly(pts, r)            a closed polygon with rounded corners
 *   band(...), revealBand(...)   a pass drawn as a broad arrow, and its reveal from tail to head
 *   rect(el)                     an element's box in stage coordinates (the stage is scaled)
 *   tween, wait, drawOn, flyTex, flyDot, flash, pulse   decoration for a forward click
 *   pending()                    waits and tweens still to run (Play waits for 0)
 *   temp(el, prop, value), tempClass(el, cls) changes that the next render undoes
 *
 * State is the truth and animation is decoration: every render first calls cancel() (running
 * tweens stop), clearTemps() and clearFlies(), then draws the state from scratch. No colour is
 * written here: an element takes the colour of its part from a class (k-black, k-red, k-blue,
 * k-purple) and SVG strokes and fills use currentColor.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var K = { scale: 1, stage: null, top: null };

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

  K.tex = function (el, src, display) {
    src = String(src);
    if (el.__tex === src) return el;
    el.__tex = src;
    katex.render(src, el, { throwOnError: false, displayMode: !!display });
    return el;
  };

  // A formula made of pieces [{key, tex}], each its own KaTeX span, so an animation can fly a
  // number into one piece. Returns {key: span}; re-rendering with the same pieces costs nothing.
  K.row = function (el, pieces) {
    var sig = pieces.map(function (p) { return p.key + '=' + p.tex; }).join('|');
    if (el.__row === sig) return el.__spans;
    el.__row = sig;
    while (el.firstChild) el.removeChild(el.firstChild);
    var spans = {};
    pieces.forEach(function (p) {
      var s = K.div('piece', el, 'span');
      katex.render(p.tex, s, { throwOnError: false });
      if (p.key) spans[p.key] = s;
    });
    el.__spans = spans;
    return spans;
  };

  K.show = function (el, on) {
    if (el) el.classList.toggle('on', !!on);
    return el;
  };

  // Shrink el's font until its content is at most maxW wide (stage pixels); its CSS size is the
  // largest it gets. Layout widths ignore the stage's scaling, so this works at any window size.
  K.fit = function (el, maxW) {
    el.style.fontSize = '';
    var w = el.scrollWidth;
    if (w > maxW) {
      var px = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (px * maxW / w * 0.97).toFixed(1) + 'px';
    }
    return el;
  };

  // ===== paths and arrows

  // A polyline through pts with its corners rounded by radius r.
  K.route = function (pts, r) {
    r = r === undefined ? 14 : r;
    var d = 'M ' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i - 1], q = pts[i], n = pts[i + 1];
      var l1 = Math.hypot(q[0] - p[0], q[1] - p[1]), l2 = Math.hypot(n[0] - q[0], n[1] - q[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var a = [q[0] - (q[0] - p[0]) / l1 * rr, q[1] - (q[1] - p[1]) / l1 * rr];
      var b = [q[0] + (n[0] - q[0]) / l2 * rr, q[1] + (n[1] - q[1]) / l2 * rr];
      d += ' L ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q ' + q[0] + ' ' + q[1] + ' ' +
        b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    var z = pts[pts.length - 1];
    return d + ' L ' + z[0] + ' ' + z[1];
  };

  // The head of an arrow whose last segment runs from p to q, tip at q.
  K.head = function (p, q, size) {
    size = size || 14;
    var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    var ux = dx / l, uy = dy / l, w = size * 0.55;
    var bx = q[0] - ux * size, by = q[1] - uy * size;
    return 'M ' + q[0] + ' ' + q[1] + ' L ' + (bx - uy * w).toFixed(1) + ' ' + (by + ux * w).toFixed(1) +
      ' L ' + (bx + uy * w).toFixed(1) + ' ' + (by - ux * w).toFixed(1) + ' Z';
  };

  // An arrow along pts: a group with the line (stopped short of the tip) and the head. With
  // opts.noHead the line runs to the last point and has no head (a line that joins another arrow).
  K.arrow = function (parent, pts, cls, opts) {
    opts = opts || {};
    var g = K.svg('g', null, parent, 'arrow vis ' + (cls || ''));
    var line = K.svg('path', null, g, 'line');
    var head = K.svg('path', null, g, 'head');
    var a = { g: g, line: line, head: head, size: opts.size || 15, r: opts.r, noHead: !!opts.noHead };
    K.setArrow(a, pts);
    return a;
  };

  K.setArrow = function (a, pts) {
    var n = pts.length, p = pts[n - 2], q = pts[n - 1];
    a.pts = pts;
    if (a.noHead) {
      a.line.setAttribute('d', K.route(pts, a.r));
      a.head.setAttribute('d', '');
      return a;
    }
    var l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    var back = Math.min(a.size * 0.8, l * 0.5);
    var cut = pts.slice(0, n - 1).concat([[q[0] - (q[0] - p[0]) / l * back, q[1] - (q[1] - p[1]) / l * back]]);
    a.line.setAttribute('d', K.route(cut, a.r));
    a.head.setAttribute('d', K.head(p, q, a.size));
    return a;
  };

  // A closed polygon through pts with its corners rounded by radius r (smaller at short sides).
  K.roundPoly = function (pts, r) {
    var n = pts.length, d = '';
    for (var i = 0; i < n; i++) {
      var p = pts[(i - 1 + n) % n], q = pts[i], m = pts[(i + 1) % n];
      var l1 = Math.hypot(q[0] - p[0], q[1] - p[1]), l2 = Math.hypot(m[0] - q[0], m[1] - q[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var a = [q[0] - (q[0] - p[0]) / l1 * rr, q[1] - (q[1] - p[1]) / l1 * rr];
      var b = [q[0] + (m[0] - q[0]) / l2 * rr, q[1] + (m[1] - q[1]) / l2 * rr];
      d += (i ? ' L ' : 'M ') + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q ' + q[0] + ' ' + q[1] + ' ' +
        b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    return d + ' Z';
  };

  // A pass as a broad arrow (spec from GF.geo.pass): a light fill and a firm outline, behind a mask
  // that a reveal draws along the spine, so the band flows in from its tail to its head. spec.reach
  // is the width of that stroke: wide enough to cover the band on either side of the spine.
  K.band = function (parent, spec, id, cls) {
    var g = K.svg('g', null, parent, 'pass vis ' + (cls || ''));
    var mask = K.svg('mask', { id: id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1600, height: 900 }, g);
    var mp = K.svg('path', { d: K.route(spec.spine, 40), 'stroke-width': spec.reach || 300 }, mask, 'pass-mask');
    var body = K.svg('g', { mask: 'url(#' + id + ')' }, g);
    var d = K.roundPoly(spec.outline, 20);
    K.svg('path', { d: d }, body, 'pass-fill');
    K.svg('path', { d: d }, body, 'pass-line');
    return { g: g, mask: mp };
  };
  K.revealBand = function (b, ms, delay, done) { K.drawOn(b.mask, ms, delay, done); };

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
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    back: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };

  // How many waits and tweens of the current render are still to run: Play (js/engine.js) moves on
  // once this is 0, so every animation must go through K.wait and K.tween (never a bare
  // setTimeout). They are counted per render, so those a new render cancelled never hold Play up.
  var PENDING = {};
  function hold(g) { PENDING[g] = (PENDING[g] || 0) + 1; }
  function free(g) { if (--PENDING[g] <= 0) delete PENDING[g]; }
  K.pending = function () { return PENDING[GEN] || 0; };

  // Calls fn(e) with e from 0 to 1 over ms, then done(). Stops silently once a new render ran.
  K.tween = function (ms, fn, ease, done) {
    var g = GEN, t0 = null, ez = ease || K.ease.inOut;
    if (ms <= 0) { fn(1); if (done) done(); return; }
    hold(g);
    function frame(now) {
      if (g !== GEN) { free(g); return; }
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / ms);
      fn(ez(t));
      if (t < 1) { requestAnimationFrame(frame); return; }
      free(g);
      if (done) done();
    }
    requestAnimationFrame(frame);
  };

  K.wait = function (ms, fn) {
    var g = GEN;
    hold(g);
    setTimeout(function () { free(g); if (g === GEN) fn(); }, ms);
  };

  // Draw a path from its start: the stroke grows over ms.
  K.drawOn = function (path, ms, delay, done) {
    var len = path.getTotalLength();
    K.temp(path, 'strokeDasharray', len + ' ' + len);
    K.temp(path, 'strokeDashoffset', String(len));
    K.wait(delay || 0, function () {
      K.tween(ms, function (e) { path.style.strokeDashoffset = String(len * (1 - e)); }, K.ease.inOut, function () {
        path.style.strokeDasharray = '';
        path.style.strokeDashoffset = '';
        if (done) done();
      });
    });
  };

  // An arrow grows along its line, then its head appears.
  K.drawArrow = function (a, ms, delay, done) {
    K.temp(a.head, 'opacity', '0');
    K.drawOn(a.line, ms, delay, function () {
      a.head.style.opacity = '';
      if (done) done();
    });
  };

  // Hide el now and let it fade in (its CSS transition) after delay ms.
  K.later = function (el, delay) {
    K.temp(el, 'opacity', '0');
    K.wait(delay, function () { el.style.opacity = ''; });
  };

  // A copy of the KaTeX formula src flies from rectangle a to rectangle b (stage coordinates,
  // centre to centre, on a small arc), then disappears. cls gives the copy its colour (k-blue...).
  K.flyTex = function (src, a, b, ms, cls, done, fontPx) {
    var f = K.div('fly ' + (cls || ''), K.top);
    if (fontPx) f.style.fontSize = fontPx + 'px';
    katex.render(String(src), f, { throwOnError: false });
    K.pos(f, a.cx, a.cy, 'cc');
    K.tween(ms, function (e) {
      f.style.left = (a.cx + (b.cx - a.cx) * e) + 'px';
      f.style.top = (a.cy + (b.cy - a.cy) * e - Math.sin(Math.PI * e) * 40) + 'px';
    }, K.ease.inOut, function () {
      if (f.parentNode) f.parentNode.removeChild(f);
      if (done) done();
    });
    return f;
  };

  // A dot flies from point a to point b (stage coordinates {cx, cy}), then disappears.
  K.flyDot = function (a, b, ms, cls, done) {
    var f = K.div('fly fly-dot ' + (cls || ''), K.top);
    K.pos(f, a.cx, a.cy, 'cc');
    K.tween(ms, function (e) {
      f.style.left = (a.cx + (b.cx - a.cx) * e) + 'px';
      f.style.top = (a.cy + (b.cy - a.cy) * e - Math.sin(Math.PI * e) * 30) + 'px';
    }, K.ease.inOut, function () {
      if (f.parentNode) f.parentNode.removeChild(f);
      if (done) done();
    });
    return f;
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

  // A short glow along a drawn path (keyframes in css/style.css).
  K.pulse = function (el, delay) {
    K.wait(delay || 0, function () {
      el.classList.remove('pulse');
      void el.getBoundingClientRect();
      K.tempClass(el, 'pulse');
    });
  };

  window.GFKit = K;
})();
