/* The plot, in SVG: the target (a thick pale line), the output of the network (a blue line), the
 * error between them (shaded) and the position of every hinge (a dashed line with a numbered knob).
 * A hinge can be dragged sideways, which sets its t_j. While a hinge is hovered, its term
 * w_j relu(x - t_j) is drawn faintly, one of the hockey sticks that add up to y. Colours come from
 * CSS classes, so the theme switch needs no redraw. */
window.Plot = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var A = window.HFN.A, B = window.HFN.B;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // handlers: onDrag(hinge index from 0, x), onDragEnd(index), onHover(index or null)
  function Plot(container, handlers) {
    this.box = container; this.cb = handlers || {};
    var svg = this.svg = el('svg', { role: 'img', 'aria-label': 'The target and the output of the network' }, container);
    var defs = el('defs', {}, svg);
    this.clipRect = el('rect', {}, el('clipPath', { id: 'plot-clip' }, defs));
    this.gGrid = el('g', {}, svg);
    this.gCurves = el('g', { 'clip-path': 'url(#plot-clip)' }, svg);
    this.pErr = el('path', { 'class': 'p-err' }, this.gCurves);
    this.pTarget = el('path', { 'class': 'p-target' }, this.gCurves);
    this.pTerm = el('path', { 'class': 'p-term' }, this.gCurves);
    this.pNet = el('path', { 'class': 'p-net' }, this.gCurves);
    this.gKinks = el('g', {}, svg);
    this.pad = { l: 40, r: 14, t: 30, b: 24 };
    this.w = 300; this.h = 200;
    this.xs = null; this.ty = null; this.y = null; this.marks = []; this.termY = null;
    this.yr = [-1, 1];
    this.kinkEls = [];
    this.dragging = -1;
  }

  Plot.prototype.X = function (x) { var p = this.pad; return p.l + (x - A) / (B - A) * (this.w - p.l - p.r); };
  Plot.prototype.Xinv = function (px) { var p = this.pad; return A + (px - p.l) / (this.w - p.l - p.r) * (B - A); };
  Plot.prototype.Y = function (v) {
    var p = this.pad;
    return this.h - p.b - (v - this.yr[0]) / (this.yr[1] - this.yr[0]) * (this.h - p.t - p.b);
  };

  Plot.prototype.pathOf = function (ys) {
    var d = '';
    for (var i = 0; i < ys.length; i++) d += (i ? 'L' : 'M') + this.X(this.xs[i]).toFixed(1) + ' ' + this.Y(ys[i]).toFixed(1);
    return d;
  };

  Plot.prototype.resize = function () {
    var r = this.box.getBoundingClientRect(), p = this.pad;
    this.w = Math.max(240, r.width); this.h = Math.max(140, r.height);
    this.svg.setAttribute('viewBox', '0 0 ' + this.w + ' ' + this.h);
    this.clipRect.setAttribute('x', p.l); this.clipRect.setAttribute('y', p.t);
    this.clipRect.setAttribute('width', this.w - p.l - p.r); this.clipRect.setAttribute('height', this.h - p.t - p.b);
    this.drawGrid();
    if (this.ty) this.pTarget.setAttribute('d', this.pathOf(this.ty));
    if (this.y) this.update(this.y, this.marks);
    this.setTerm(this.termY);
  };

  // the vertical range comes from the target, with room for the network to overshoot
  Plot.prototype.setTarget = function (xs, ty) {
    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < ty.length; i++) { lo = Math.min(lo, ty[i]); hi = Math.max(hi, ty[i]); }
    var span = Math.max(hi - lo, 0.5), pad = 0.4 * span;
    this.xs = xs; this.ty = ty; this.yr = [lo - pad, hi + pad];
    this.drawGrid();
    this.pTarget.setAttribute('d', this.pathOf(ty));
    if (this.y) this.update(this.y, this.marks);
  };
  Plot.prototype.range = function () { return this.yr.slice(); };

  Plot.prototype.drawGrid = function () {
    var g = this.gGrid, p = this.pad, v;
    while (g.firstChild) g.removeChild(g.firstChild);
    function lab(text, x, y, anchor) {
      el('text', { 'class': 'p-tick', x: x, y: y, 'text-anchor': anchor }, g).textContent = text;
    }
    function label(v) { var s = String(+v.toFixed(2)); return s.charAt(0) === '-' ? '−' + s.slice(1) : s; }
    for (v = A; v <= B + 1e-9; v += 1) {
      var x = this.X(v);
      el('line', { 'class': 'p-grid', x1: x, x2: x, y1: p.t, y2: this.h - p.b }, g);
      lab(label(v), x, this.h - p.b + 16, 'middle');
    }
    var span = this.yr[1] - this.yr[0], steps = [0.25, 0.5, 1, 2, 5, 10], step = 10;
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= 7) { step = steps[i]; break; }
    for (v = Math.ceil(this.yr[0] / step) * step; v <= this.yr[1] + 1e-9; v += step) {
      var y = this.Y(v);
      el('line', { 'class': 'p-grid', x1: p.l, x2: this.w - p.r, y1: y, y2: y }, g);
      lab(label(v), p.l - 6, y + 4, 'end');
    }
    if (this.yr[0] < 0 && this.yr[1] > 0) el('line', { 'class': 'p-axis', x1: p.l, x2: this.w - p.r, y1: this.Y(0), y2: this.Y(0) }, g);
    el('line', { 'class': 'p-axis', x1: this.X(0), x2: this.X(0), y1: p.t, y2: this.h - p.b }, g);
  };

  // one marker per hinge, kept across renders so that a drag survives them
  Plot.prototype.setHinges = function (n) {
    var self = this, g = this.gKinks;
    while (g.firstChild) g.removeChild(g.firstChild);
    this.kinkEls = [];
    for (var j = 0; j < n; j++) (function (j) {
      var grp = el('g', { 'class': 'kink' }, g);
      var hit = el('line', { 'class': 'kink-hit' }, grp), line = el('line', { 'class': 'kink-line' }, grp);
      var knob = el('circle', { 'class': 'kink-knob', r: 9 }, grp), num = el('text', { 'class': 'kink-num' }, grp);
      num.textContent = j + 1;
      // the drag follows the pointer on the whole window, so it survives leaving the thin line
      function move(e) { if (self.dragging === j) self.drag(e); }
      function end() {
        if (self.dragging !== j) return;
        self.dragging = -1;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        if (self.cb.onDragEnd) self.cb.onDragEnd(j);
      }
      grp.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        self.dragging = j;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        self.drag(e);
      });
      grp.addEventListener('pointerenter', function () { if (self.cb.onHover && self.dragging < 0) self.cb.onHover(j); });
      grp.addEventListener('pointerleave', function () { if (self.cb.onHover && self.dragging < 0) self.cb.onHover(null); });
      self.kinkEls.push({ g: grp, hit: hit, line: line, knob: knob, num: num });
    })(j);
  };

  Plot.prototype.drag = function (e) {
    var r = this.svg.getBoundingClientRect();
    var px = (e.clientX - r.left) * this.w / Math.max(1, r.width);
    var x = Math.max(A, Math.min(B, this.Xinv(px)));
    if (this.cb.onDrag) this.cb.onDrag(this.dragging, x);
  };

  // y: the output of the network on the points of the target; marks: [{x, idle}] one per hinge
  Plot.prototype.update = function (y, marks) {
    this.y = y; this.marks = marks;
    this.pNet.setAttribute('d', this.pathOf(y));
    var d = '', i, n = y.length;
    for (i = 0; i < n; i++) d += (i ? 'L' : 'M') + this.X(this.xs[i]).toFixed(1) + ' ' + this.Y(this.ty[i]).toFixed(1);
    for (i = n - 1; i >= 0; i--) d += 'L' + this.X(this.xs[i]).toFixed(1) + ' ' + this.Y(y[i]).toFixed(1);
    this.pErr.setAttribute('d', d + 'Z');

    var p = this.pad, top = 14, bottom = this.h - p.b;
    marks.forEach(function (m, j) {
      var k = this.kinkEls[j];
      if (!k) return;
      var x = this.X(m.x).toFixed(1);
      [k.hit, k.line].forEach(function (ln) { ln.setAttribute('x1', x); ln.setAttribute('x2', x); ln.setAttribute('y1', top); ln.setAttribute('y2', bottom); });
      k.knob.setAttribute('cx', x); k.knob.setAttribute('cy', top);
      k.num.setAttribute('x', x); k.num.setAttribute('y', top + 4);
      k.g.classList.toggle('idle', !!m.idle);
    }, this);
  };

  // the term of one hinge (or the constant c), drawn faintly; null clears it
  Plot.prototype.setTerm = function (ys) {
    this.termY = ys;
    this.pTerm.setAttribute('d', ys && this.xs ? this.pathOf(ys) : '');
  };

  // emphasize the marker of one hinge (null clears)
  Plot.prototype.highlight = function (j) {
    this.kinkEls.forEach(function (k, i) { k.g.classList.toggle('hl', i === j); });
  };

  return { Plot: Plot };
})();
