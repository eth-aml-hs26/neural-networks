/* The network, in SVG, with its knobs on it. Two rows, as in the note: the hinges h_l on top and the
 * running sums g_l below. Column 0 holds the start, h_0 = x + 2 and g_0 = C + f(a); columns 1 to k
 * the layers; the last column the output y. Every box draws what its neuron outputs on [-2, 2].
 * A fixed weight (1) is a thin grey arrow with no number. A knob sits where the construction has a
 * free number, and nowhere else: the gap d_l over the hinge h_l, whose intercept it is, and the slope
 * change Delta_l on the arrow that carries h_l into the next running sum (Delta_k into y).
 * build(net) lays it out, update(net, fwd, yr) fills in the curves and the numbers, setValues(net)
 * moves the sliders, highlight(id) emphasizes one knob, flash(l) the two knobs of layer l. */
window.Diagram = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var Tex = window.Tex, M = window.HCN;
  var NODE_H = 46, KH = 42, Y_H = 75, Y_G = 213, SVG_H = 260;
  var SUB = 10;                     // the curves in the boxes use every 10th point of the 801
  var STEPS = [3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function make(tag, cls, parent) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceRange(a) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i] >= a * 1.05) return STEPS[i];
    return Math.ceil(a * 1.05);
  }
  function marker(defs, id) {
    var m = el('marker', { id: id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs);
    el('path', { d: 'M1 1.5L9 5L1 8.5z', 'class': id }, m);
  }

  function makeNode(parent, cls, cx, cy, w, h, letter, n) {
    var g = el('g', { 'class': 'node ' + cls, transform: 'translate(' + cx + ',' + cy + ')' }, parent);
    el('rect', { 'class': 'node-box', x: -w / 2, y: -h / 2, width: w, height: h, rx: 7 }, g);
    var zero = el('line', { 'class': 'zero-line' }, g);
    var poly = el('polyline', { 'class': 'spark' }, g);
    var t = el('text', { 'class': 'node-label', x: -w / 2 + 5, y: -h / 2 + 12 }, g);
    t.appendChild(document.createTextNode(letter));
    if (n !== undefined) el('tspan', { 'class': 'sub', dy: 3 }, t).textContent = n;
    return { g: g, poly: poly, zero: zero, w: w, h: h, top: 16 };
  }

  // the curve of one neuron inside its box, on the scale yr = [lo, hi]; with zero, a hairline marks
  // the value 0; with canDie, a box whose neuron is 0 everywhere turns dashed
  function setSpark(node, arr, yr, zero, canDie) {
    var n = arr.length, lo = yr[0], hi = yr[1], min = Infinity, max = -Infinity, i;
    for (i = 0; i < n; i += SUB) { if (arr[i] < min) min = arr[i]; if (arr[i] > max) max = arr[i]; }
    node.g.classList.toggle('dead', !!canDie && max < 1e-9 && min > -1e-9);
    var x0 = -node.w / 2 + 6, sw = node.w - 12, y0 = -node.h / 2 + node.top, sh = node.h - node.top - 5, pts = [];
    function Y(v) { return y0 + (hi - Math.max(lo, Math.min(hi, v))) / (hi - lo) * sh; }
    for (i = 0; i < n; i += SUB) pts.push((x0 + sw * i / (n - 1)).toFixed(1) + ',' + Y(arr[i]).toFixed(1));
    node.poly.setAttribute('points', pts.join(' '));
    var show = zero && lo <= 0 && hi >= 0;
    node.zero.style.display = show ? '' : 'none';
    if (show) {
      var yz = Y(0).toFixed(1);
      node.zero.setAttribute('x1', x0); node.zero.setAttribute('x2', x0 + sw);
      node.zero.setAttribute('y1', yz); node.zero.setAttribute('y2', yz);
    }
  }

  // handlers: onChange(id, value), onHover(id or null)
  function Diagram(wrap, handlers) {
    this.wrap = wrap; this.h = handlers;
    this.R = null; this.knobs = {}; this.ranges = {}; this.base = 4; this.hl = null;
  }

  // a new target: every slope slider starts at a range that covers the largest slope change m
  // that its fits need
  Diagram.prototype.setScale = function (m) {
    this.base = niceRange(Math.max(m, 1));
    this.ranges = {};
  };

  Diagram.prototype.build = function (net) {
    var wrap = this.wrap, k = net.d.length, cols = k + 2, wrapW = wrap.clientWidth || 1000;
    var W = Math.max(96, Math.min(220, Math.floor(wrapW / cols))), nw = Math.max(58, Math.min(150, W - 56));
    var inW = Math.min(64, nw), width = W * cols, gap = 3, cw = Math.min(W - 18, 132), l;
    function cx(c) { return W * (c + 0.5); }
    function right(c) { return cx(c) + (c === 0 ? inW : nw) / 2; }
    function left(c) { return cx(c) - (c === k + 1 ? inW : nw) / 2 - gap; }
    wrap.innerHTML = '';
    var inner = make('div', 'net-inner', wrap);
    inner.style.width = width + 'px'; inner.style.height = SVG_H + 'px';
    var svg = el('svg', { width: width, height: SVG_H, viewBox: '0 0 ' + width + ' ' + SVG_H, role: 'img',
      'aria-label': 'The network: ' + k + ' layers of two neurons, a hinge and a running sum' }, inner);
    var defs = el('defs', {}, svg);
    marker(defs, 'ah-fixed'); marker(defs, 'ah-free');

    var R = this.R = { k: k, h: [], g: [], edge: {}, txt: {} };
    el('rect', { 'class': 'band h', x: W + 6, y: Y_H - NODE_H / 2 - 6, width: W * k - 12, height: NODE_H + 12, rx: 9 }, svg);
    el('rect', { 'class': 'band g', x: W + 6, y: Y_G - NODE_H / 2 - 6, width: W * k - 12, height: NODE_H + 12, rx: 9 }, svg);

    var edges = el('g', {}, svg), nodes = el('g', {}, svg), texts = el('g', {}, svg);
    function edge(cls, x1, y1, x2, y2, id) {
      var line = el('line', { 'class': 'edge ' + cls, x1: x1, y1: y1, x2: x2, y2: y2, 'marker-end': 'url(#ah-' + cls + ')' }, edges);
      if (id) R.edge[id] = line;
    }
    function text(id, x, y, s) {
      var t = el('text', { 'class': 'given', x: x, y: y }, texts);
      t.textContent = s || '';
      R.txt[id] = t;
    }

    R.h.push(makeNode(nodes, 'x', cx(0), Y_H, inW, NODE_H, 'x+2'));
    R.g.push(makeNode(nodes, 'start', cx(0), Y_G, inW, NODE_H, 'C+f(a)'));
    for (l = 1; l <= k; l++) {
      R.h.push(makeNode(nodes, 'h', cx(l), Y_H, nw, NODE_H, 'h', l));
      R.g.push(makeNode(nodes, 'g', cx(l), Y_G, nw, NODE_H, 'g', l));
    }
    R.y = makeNode(nodes, 'y', cx(k + 1), Y_G, inW, NODE_H, 'y');
    text('C', cx(0), Y_G + NODE_H / 2 + 16);
    text('minusC', cx(k + 1), Y_G + NODE_H / 2 + 16, Tex.MINUS + 'C');

    // the fixed weights: each hinge reads the hinge before it, each running sum the one before it
    for (l = 1; l <= k; l++) edge('fixed', right(l - 1), Y_H, left(l), Y_H);
    for (l = 1; l <= k + 1; l++) edge('fixed', right(l - 1), Y_G, left(l), Y_G);
    // the free weights: the slope change Delta_l carries h_l into the next running sum, or into y
    var mid = [];
    for (l = 0; l <= k; l++) {
      var x1 = right(l), y1 = Y_H + 14, x2 = left(l + 1), y2 = Y_G - 14;
      edge('free', x1, y1, x2, y2, 'delta' + l);
      mid.push([0.5 * (x1 + x2), 0.5 * (y1 + y2)]);
    }

    // the knobs, each where its number sits in the network
    this.knobs = {};
    for (l = 1; l <= k; l++) this.chip(inner, 'd' + l, 'd_{' + l + '}', cx(l), 4 + KH / 2, cw, true);
    for (l = 0; l <= k; l++) this.chip(inner, 'delta' + l, '\\Delta_{' + l + '}', mid[l][0], mid[l][1], cw, false);
    this.setValues(net);
    var keep = this.hl;
    this.hl = null;
    if (keep) this.highlight(keep);
  };

  Diagram.prototype.chip = function (inner, id, tex, x, y, w, isGap) {
    var self = this, c = make('div', 'chip' + (isGap ? ' gap' : ''), inner);
    c.style.left = Math.round(x - w / 2) + 'px'; c.style.top = Math.round(y - KH / 2) + 'px'; c.style.width = w + 'px';
    var sym = make('span', 'sym', c), val = make('output', 'val', c), rng = make('input', '', c);
    sym.innerHTML = Tex.render(tex);
    rng.type = 'range'; rng.step = '0.01'; rng.setAttribute('aria-label', id);
    if (isGap) { rng.min = 0; rng.max = M.B - M.A; }
    this.knobs[id] = { chip: c, range: rng, val: val, fixed: isGap };
    rng.addEventListener('input', function () { self.h.onChange(id, +rng.value); });
    rng.addEventListener('keydown', function (e) {
      if (!e.shiftKey) return;
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var v = Math.round((+rng.value + dir * 0.1) * 100) / 100;
      v = Math.max(+rng.min, Math.min(+rng.max, v));
      rng.value = v;
      self.h.onChange(id, v);
    });
    c.addEventListener('pointerenter', function () { self.h.onHover(id); });
    c.addEventListener('pointerleave', function () { self.h.onHover(null); });
    rng.addEventListener('focus', function () { self.h.onHover(id); });
    rng.addEventListener('blur', function () { self.h.onHover(null); });
  };

  // a slope slider widens its range when a value needs it; a gap stays between 0 and b - a
  Diagram.prototype.fit = function (id, v) {
    var kn = this.knobs[id];
    if (!kn || kn.fixed) return;
    var R = this.ranges[id] || this.base;
    if (Math.abs(v) > R) R = niceRange(Math.abs(v));
    this.ranges[id] = R; kn.range.min = -R; kn.range.max = R;
  };

  Diagram.prototype.setValues = function (net) {
    for (var id in this.knobs) this.setValue(id, M.getParam(net, id));
  };
  Diagram.prototype.setValue = function (id, v) {
    var kn = this.knobs[id];
    if (!kn) return;
    this.fit(id, v);
    kn.range.value = v;
    kn.val.textContent = Tex.num(v);
  };

  // yr: the vertical range of the plot. The hinges share the scale [0, b - a]; the running sums and y
  // share one that covers the plot, every running sum and 0, so the lift shows
  Diagram.prototype.update = function (net, fwd, yr) {
    var R = this.R, k = net.d.length, l, i, id;
    if (!R || R.k !== k) return;
    var lo = Math.min(0, yr[0]), hi = yr[1];
    fwd.G.concat([fwd.y]).forEach(function (a) {
      for (i = 0; i < a.length; i += SUB) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }
    });
    var hs = [0, M.B - M.A], gs = [lo, hi];
    for (l = 0; l <= k; l++) {
      setSpark(R.h[l], fwd.H[l], hs, false, l > 0);
      setSpark(R.g[l], fwd.G[l], gs, true, false);
      R.edge['delta' + l].classList.toggle('zero', Math.abs(net.D[l]) < 0.005);
    }
    setSpark(R.y, fwd.y, gs, true, false);
    R.txt.C.textContent = 'C = ' + Tex.num(fwd.C);
    for (id in this.knobs) this.knobs[id].val.textContent = Tex.num(M.getParam(net, id));
  };

  // emphasize one knob, with the arrow or the hinge it sets (null clears it)
  Diagram.prototype.highlight = function (id) {
    var R = this.R, self = this;
    if (!R) return;
    function apply(key, on) {
      if (!key) return;
      if (self.knobs[key]) self.knobs[key].chip.classList.toggle('hl', on);
      if (R.edge[key]) R.edge[key].classList.toggle('hl', on);
      var p = M.parseId(key);
      if (p && p.name === 'd' && R.h[p.i]) R.h[p.i].g.classList.toggle('hl', on);
    }
    apply(this.hl, false);
    this.hl = id || null;
    apply(this.hl, true);
  };

  // a short flash on the two knobs of layer l, to show where a new layer went
  Diagram.prototype.flash = function (l) {
    ['d' + l, 'delta' + l].forEach(function (id) {
      var kn = this.knobs[id];
      if (!kn) return;
      var c = kn.chip;
      c.classList.remove('flash');
      void c.offsetWidth;
      c.classList.add('flash');
      setTimeout(function () { c.classList.remove('flash'); }, 1200);
    }, this);
  };

  return { Diagram: Diagram };
})();
