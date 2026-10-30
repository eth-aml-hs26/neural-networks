/* The network, in SVG, with its sliders on it. A fan: the input x on top, the n hinges in one row,
 * the output y at the bottom. Arrows of weight 1 fan out from x to the hinges, and the arrows that
 * carry the weights w_j fan back in to y. Every box draws what its neuron outputs as a function of x.
 * Only the free numbers are written: t_j in the box of hinge j, w_j on its arrow into y, and c beside
 * y. Under every hinge sit two sliders, t_j for the box and w_j on the arrow; the slider of c sits
 * beside y.
 * build(net) lays it out, update(net, fwd, yr) fills in the curves and the numbers, setValues(net)
 * moves the sliders, highlight(id) emphasizes a hinge or a number, flash(j) marks a new hinge. */
window.Diagram = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var Tex = window.Tex, HF = window.HFN;
  var LEFT = 40;                        // room for the row heads t_j and w_j
  var Y_X = 24, X_H = 36, IO_W = 64;    // the input box
  var BOX_T = 70, BOX_H = 48;           // the hinge boxes
  var ROW_T = 122, ROW_W = 146;         // the two rows of sliders (tops)
  var STEM_B = 190, Y_Y = 250, Y_H = 42, SVG_H = 276;
  var SUB = 10;                         // the curves in the boxes use every 10th point of the 801
  var STEPS = [4, 6, 8, 12, 16, 24, 32, 48, 64];

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
  function marker(defs, id, cls) {
    var m = el('marker', { id: id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs);
    el('path', { d: 'M1 1.5L9 5L1 8.5z', 'class': cls }, m);
  }

  function makeNode(parent, cls, cx, cy, w, h, top) {
    var g = el('g', { 'class': 'node ' + cls, transform: 'translate(' + cx + ',' + cy + ')' }, parent);
    el('rect', { 'class': 'node-box', x: -w / 2, y: -h / 2, width: w, height: h, rx: 7 }, g);
    var poly = el('polyline', { 'class': 'spark' }, g);
    return { g: g, poly: poly, w: w, h: h, top: top };
  }

  // the curve of one neuron inside its box, on the vertical range yr = [lo, hi]
  function setSpark(node, arr, yr) {
    var n = arr.length, lo = yr[0], hi = yr[1], i, pts = [];
    var x0 = -node.w / 2 + 5, sw = node.w - 10, y0 = -node.h / 2 + node.top, sh = node.h - node.top - 5;
    for (i = 0; i < n; i += SUB) {
      var v = Math.max(lo, Math.min(hi, arr[i]));
      pts.push((x0 + sw * i / (n - 1)).toFixed(1) + ',' + (y0 + (hi - v) / (hi - lo) * sh).toFixed(1));
    }
    node.poly.setAttribute('points', pts.join(' '));
  }

  // handlers: onChange(id, value), onCommit(id), onHover(id or null), with ids 'c', 't3', 'w3' and
  // 'h3' (the box of hinge 3)
  function Diagram(wrap, handlers) {
    this.wrap = wrap; this.h = handlers;
    this.R = null; this.knobs = {}; this.ranges = {}; this.base = 4; this.hl = null;
  }

  // a new target: the w sliders start at a range that covers the largest |w| its fits need; the range
  // of c stays 4, which covers every fit's c (at most 1.5 on the menu)
  Diagram.prototype.setScale = function (m) {
    this.base = niceRange(Math.max(m, 1));
    this.ranges = {};
  };

  Diagram.prototype.build = function (net) {
    var self = this, wrap = this.wrap, n = net.hinges.length, wrapW = wrap.clientWidth || 1000;
    var colW = Math.max(46, Math.min(150, Math.floor((wrapW - LEFT - 16) / n)));
    var rowW = colW * n, mid = LEFT + rowW / 2, boxW = Math.min(132, colW - 8), sw = Math.min(130, colW - 8);
    var cW = 150, width = Math.max(LEFT + rowW + 16, mid + IO_W / 2 + 14 + cW + 10);
    function cx(j) { return LEFT + colW * (j + 0.5); }
    wrap.innerHTML = '';
    var inner = make('div', 'net-inner', wrap);
    inner.style.width = width + 'px'; inner.style.height = SVG_H + 'px';
    // narrow columns get smaller numbers; in the narrowest the box keeps its position t_j and drops its
    // number j, which the marker in the plot still shows
    var tight = colW < 58;
    var svg = el('svg', { width: width, height: SVG_H, viewBox: '0 0 ' + width + ' ' + SVG_H, role: 'img',
      'class': tight ? 'narrow tight' : colW < 64 ? 'narrow' : '', 'aria-label': 'The network: one hidden layer of ' + n + ' hinges' }, inner);
    var defs = el('defs', {}, svg);
    marker(defs, 'ah-z', 'ah-z'); marker(defs, 'ah-f', 'ah-f');

    var R = this.R = { n: n, col: [] };
    el('rect', { 'class': 'band', x: LEFT - 6, y: BOX_T - 8, width: rowW + 12, height: STEM_B - BOX_T + 2, rx: 9 }, svg);
    var edges = el('g', {}, svg), nodes = el('g', {}, svg), labels = el('g', {}, svg);

    R.x = makeNode(nodes, 'x', mid, Y_X, IO_W, X_H, 13);
    el('text', { 'class': 'node-label', x: mid - IO_W / 2 + 5, y: Y_X - X_H / 2 + 11 }, R.x.g.parentNode).textContent = 'x';
    R.y = makeNode(nodes, 'y', mid, Y_Y, IO_W, Y_H, 13);
    el('text', { 'class': 'node-label', x: mid - IO_W / 2 + 5, y: Y_Y - Y_H / 2 + 11 }, R.y.g.parentNode).textContent = 'y';
    R.cLabel = el('text', { 'class': 'free c', x: mid - IO_W / 2 - 8, y: Y_Y + 4 }, labels);

    var xb = Y_X + X_H / 2, yt = Y_Y - Y_H / 2 - 2;
    for (var j = 0; j < n; j++) {
      var x = cx(j), C = {};
      // x fans out to the hinge (weight 1), the hinge's arrow fans back in to y (weight w_j)
      el('path', { 'class': 'edge f', d: 'M' + mid + ' ' + xb + 'C' + mid + ' ' + (xb + 20) + ' ' + x + ' ' + (BOX_T - 26) +
        ' ' + x + ' ' + (BOX_T - 2), 'marker-end': 'url(#ah-f)' }, edges);
      // the arrow into y leaves a gap for the number w_j that it carries
      C.edge = el('path', { 'class': 'edge z', d: 'M' + x + ' ' + (ROW_W - 2) + 'L' + x + ' ' + (STEM_B - 16) + 'M' + x + ' ' + (STEM_B + 2) +
        'C' + x + ' ' + (STEM_B + 24) + ' ' + mid + ' ' + (yt - 26) + ' ' + mid + ' ' + yt, 'marker-end': 'url(#ah-z)' }, edges);
      C.node = makeNode(nodes, 'h', x, BOX_T + BOX_H / 2, boxW, BOX_H, 14);
      el('text', { 'class': 'hidx', x: -boxW / 2 + 4, y: -BOX_H / 2 + 11 }, C.node.g).textContent = j + 1;
      C.tLabel = el('text', { 'class': 'free t' + (tight ? ' mid' : ''), x: tight ? x : x + boxW / 2 - 4, y: BOX_T + 11 }, labels);
      C.wLabel = el('text', { 'class': 'free w', x: x, y: STEM_B - 4 }, labels);
      (function (j, g) {
        g.addEventListener('pointerenter', function () { self.h.onHover('h' + (j + 1)); });
        g.addEventListener('pointerleave', function () { self.h.onHover(null); });
      })(j, C.node.g);
      R.col.push(C);
    }

    // the sliders: t_j and w_j under hinge j, c beside y; the row heads say which row is which
    this.knobs = {};
    [['t', ROW_T], ['w', ROW_W]].forEach(function (r) {
      var head = make('div', 'rowhead', inner);
      head.style.top = r[1] + 'px'; head.style.width = (LEFT - 8) + 'px';
      head.innerHTML = Tex.render(r[0] + '_j');
    });
    for (j = 0; j < n; j++) {
      var col = make('div', 'kcol', inner);
      col.style.left = (cx(j) - sw / 2) + 'px'; col.style.top = ROW_T + 'px'; col.style.width = sw + 'px';
      self.slider(col, 't' + (j + 1), 't');
      self.slider(col, 'w' + (j + 1), 'w');
      R.col[j].knobs = col;
    }
    var kc = make('div', 'knob-c', inner);
    kc.style.left = (mid + IO_W / 2 + 14) + 'px'; kc.style.top = (Y_Y - 11) + 'px'; kc.style.width = cW + 'px';
    make('span', 'sym', kc).innerHTML = Tex.render('c');
    self.slider(kc, 'c', 'c');

    this.setValues(net);
    var keep = this.hl;
    this.hl = null;
    if (keep) this.highlight(keep);
  };

  Diagram.prototype.slider = function (grp, id, name) {
    var self = this, rng = make('input', name, grp);
    rng.type = 'range'; rng.step = '0.01'; rng.setAttribute('aria-label', id);
    var fixed = name === 't';
    if (fixed) { rng.min = HF.A; rng.max = HF.B; }
    this.knobs[id] = { range: rng, grp: grp, fixed: fixed };
    rng.addEventListener('input', function () { self.h.onChange(id, +rng.value); });
    rng.addEventListener('change', function () { self.h.onCommit(id); });
    rng.addEventListener('keydown', function (e) {
      if (!e.shiftKey) return;
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var v = Math.round((+rng.value + dir * 0.1) * 100) / 100;
      v = Math.max(+rng.min, Math.min(+rng.max, v));
      rng.value = v;
      self.h.onChange(id, v);
      self.h.onCommit(id);
    });
    rng.addEventListener('pointerenter', function () { self.h.onHover(id); });
    rng.addEventListener('pointerleave', function () { if (document.activeElement !== rng) self.h.onHover(null); });
    rng.addEventListener('focus', function () { self.h.onHover(id); });
    rng.addEventListener('blur', function () { self.h.onHover(null); });
  };

  // a w or c slider widens its range when a value needs it
  Diagram.prototype.fit = function (id, v) {
    var kn = this.knobs[id];
    if (!kn || kn.fixed) return;
    var R = this.ranges[id] || (id === 'c' ? 4 : this.base);
    if (Math.abs(v) > R) R = niceRange(Math.abs(v));
    this.ranges[id] = R; kn.range.min = -R; kn.range.max = R;
  };

  Diagram.prototype.setValues = function (net) {
    for (var id in this.knobs) {
      var v = HF.getParam(net, id);
      this.fit(id, v);
      this.knobs[id].range.value = v;
    }
  };
  Diagram.prototype.setValue = function (id, v) {
    if (!this.knobs[id]) return;
    this.fit(id, v);
    this.knobs[id].range.value = v;
  };
  Diagram.prototype.focus = function (id) {
    if (this.knobs[id]) this.knobs[id].range.focus();
  };

  // yr: the vertical range of the plot; the output box uses it, widened to cover y. The hinges share
  // one scale, from 0 to b - a, so a hinge further right rises less.
  Diagram.prototype.update = function (net, fwd, yr) {
    var R = this.R, n = net.hinges.length, i;
    if (!R || R.n !== n) return;
    var lo = yr[0], hi = yr[1], hr = [0, HF.B - HF.A];
    for (i = 0; i < fwd.y.length; i += SUB) { if (fwd.y[i] < lo) lo = fwd.y[i]; if (fwd.y[i] > hi) hi = fwd.y[i]; }
    setSpark(R.x, fwd.xs, [HF.A, HF.B]);
    net.hinges.forEach(function (h, j) {
      var C = R.col[j];
      setSpark(C.node, fwd.H[j], hr);
      C.node.g.classList.toggle('dead', h.t >= HF.B);
      C.tLabel.textContent = Tex.num(h.t);
      C.wLabel.textContent = Tex.num(h.w);
      C.edge.classList.toggle('zero', Math.abs(h.w) < 0.005);
    });
    setSpark(R.y, fwd.y, [lo, hi]);
    R.cLabel.textContent = Tex.num(net.c);
  };

  // emphasize a hinge, or one number ('t3', 'w3'), or c (null clears)
  Diagram.prototype.highlight = function (id) {
    var R = this.R;
    this.hl = id || null;
    if (!R) return;
    var m = /^([thw])(\d+)$/.exec(id || ''), j = m ? +m[2] - 1 : -1, what = m ? m[1] : id;
    R.col.forEach(function (C, k) {
      var on = k === j;
      C.node.g.classList.toggle('hl', on);
      C.tLabel.classList.toggle('hl', on && what !== 'w');
      C.wLabel.classList.toggle('hl', on && what !== 't');
      C.edge.classList.toggle('hl', on && what !== 't');
    });
    R.cLabel.classList.toggle('hl', what === 'c');
  };

  // a short flash on the sliders of hinge j (from 1), to show where a new hinge went
  Diagram.prototype.flash = function (j) {
    var C = this.R && this.R.col[j - 1];
    if (!C) return;
    var g = C.knobs;
    g.classList.remove('flash');
    void g.offsetWidth;
    g.classList.add('flash');
    setTimeout(function () { g.classList.remove('flash'); }, 1200);
  };

  return { Diagram: Diagram };
})();
