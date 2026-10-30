/* Wiring: the menu of targets, the hinge buttons, fit and fit w, the sliders, the hinges dragged in the
 * plot, the render loop, keys and URL parameters. The hinges stay in the order of their positions:
 * fit, add and remove keep them sorted, and a hinge moved past another (by its slider or in the plot)
 * takes its new place when the move ends, with the focus following it.
 * Keys: + add a hinge, - remove one, f fit, w fit w, t theme.
 * URL parameters (for screenshots): ?fn=<target id>&n=<hinges>&fit=1&set=c:1,t2:-0.5,w2:3&fitw=1&hl=w3&theme=dark */
(function () {
  'use strict';
  var H = window.HFN, T = window.Targets, Tex = window.Tex;
  var $ = function (id) { return document.getElementById(id); };
  var st = { fn: null, n: 4, net: null, tv: null, hl: null, pending: false };
  var plot, diagram;

  function fmtMse(e) {
    if (e < 1e-12) return '0';
    if (e >= 1e-3 && e < 999.5) return e.toPrecision(3);
    var m = e.toExponential(1).split('e');
    return m[0] + ' × 10<sup>' + m[1].replace('-', Tex.MINUS).replace('+', '') + '</sup>';
  }

  // the hinge (from 0) that a hover id names: 't3', 'w3' and 'h3' name hinge 3; 'c' and null none
  function hingeOf(id) {
    var m = /^[thw](\d+)$/.exec(id || '');
    return m ? +m[1] - 1 : null;
  }

  function render() {
    st.pending = false;
    var fwd = H.forward(st.net), j = hingeOf(st.hl);
    plot.update(fwd.y, st.net.hinges.map(function (h) { return { x: h.t, idle: Math.abs(h.w) < 0.005 }; }));
    diagram.update(st.net, fwd, plot.range());
    if (j !== null && st.net.hinges[j]) plot.setTerm(H.term(st.net, j));
    else if (st.hl === 'c') plot.setTerm(new Float64Array(H.XS.length).fill(st.net.c));
    else plot.setTerm(null);
    $('mse-val').innerHTML = fmtMse(H.mse(fwd.y, st.tv));
  }
  // one render per frame: the animation frame normally wins, the timer covers a page whose frames are paused
  function run() { if (st.pending) render(); }
  function schedule() {
    if (st.pending) return;
    st.pending = true;
    requestAnimationFrame(run);
    setTimeout(run, 60);
  }

  // the number of hinges changed: lay the diagram, its sliders and the markers out again
  function structure() {
    st.n = st.net.hinges.length;
    diagram.build(st.net);
    plot.setHinges(st.n);
    $('hinge-count').textContent = st.n;
    $('btn-remove').disabled = st.n <= H.MINN;
    $('btn-add').disabled = st.n >= H.MAXN;
    hover(st.hl && hingeOf(st.hl) !== null && hingeOf(st.hl) >= st.n ? null : st.hl);
    schedule();
  }

  function selectFunction(id, how) {
    var fn = st.fn = T.byId[id];
    st.tv = H.sample(fn.f, H.XS);
    st.net = how === 'fit' ? H.fit(fn.f, st.n, fn.id) : H.defaultNet(st.n);
    plot.setTarget(H.XS, st.tv);
    diagram.setScale(H.maxWeight(fn.f, fn.id));
    document.querySelectorAll('.tile').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.fn === fn.id ? 'true' : 'false'); });
    structure();
  }

  function addHinge() {
    var r = H.addHinge(st.net);
    if (r.index < 0) return;
    st.net = r.net;
    structure();
    diagram.flash(r.index + 1);
  }
  function removeHinge() {
    var r = H.removeHinge(st.net);
    if (r.index < 0) return;
    st.net = r.net;
    structure();
  }
  function fit() {
    st.net = H.fit(st.fn.f, st.n, st.fn.id);
    diagram.setValues(st.net);
    schedule();
  }
  function fitW() {
    st.net = H.fitSlopes(st.net, st.tv);
    diagram.setValues(st.net);
    schedule();
  }

  // puts the hinges back in the order of their positions; moved (from 0) is the hinge that was just
  // moved, whose highlight and focus follow it to its new place
  function resort(moved, focus) {
    var s = H.sortHinges(st.net);
    if (s.perm.every(function (p, j) { return p === j; })) return;
    st.net = s.net;
    diagram.setValues(st.net);
    var at = s.perm.indexOf(moved);
    if (focus) diagram.focus('t' + (at + 1));
    if (hingeOf(st.hl) === moved) hover(st.hl.charAt(0) + (at + 1));
    schedule();
  }

  function hover(id) {
    st.hl = id || null;
    diagram.highlight(st.hl);
    plot.highlight(hingeOf(st.hl));
    schedule();
  }

  function buildMenu() {
    var menu = $('menu');
    ['pl', 'smooth'].forEach(function (group, gi) {
      if (gi) menu.appendChild(Object.assign(document.createElement('span'), { className: 'gap' }));
      T.list.filter(function (t) { return t.group === group; }).forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'tile'; b.dataset.fn = t.id; b.title = t.name;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.setAttribute('aria-label', t.name);
        var ys = H.sample(t.f, H.grid(61)), lo = Infinity, hi = -Infinity, pts = [];
        ys.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
        ys.forEach(function (v, i) { pts.push((3 + 54 * i / 60).toFixed(1) + ',' + (3 + 26 * (hi - v) / Math.max(hi - lo, 1e-9)).toFixed(1)); });
        b.innerHTML = '<svg viewBox="0 0 60 32" aria-hidden="true"><polyline class="tile-curve" points="' + pts.join(' ') + '"/></svg>';
        b.addEventListener('click', function () { selectFunction(t.id, 'start'); });
        menu.appendChild(b);
      });
    });
  }

  function init() {
    window.Theme.init();
    Tex.renderStatic(document);
    buildMenu();
    plot = new window.Plot.Plot($('plot'), {
      onDrag: function (j, x) {
        var id = 't' + (j + 1), v = H.round2(x);
        H.setParam(st.net, id, v);
        diagram.setValue(id, v);
        if (st.hl !== 'h' + (j + 1)) hover('h' + (j + 1));
        schedule();
      },
      onDragEnd: function (j) { resort(j, false); hover(null); },
      onHover: function (j) { hover(j === null ? null : 'h' + (j + 1)); }
    });
    diagram = new window.Diagram.Diagram($('net'), {
      onChange: function (id, v) { H.setParam(st.net, id, v); schedule(); },
      onCommit: function (id) {
        var p = H.parseId(id);
        if (p && p.name === 't') resort(p.j - 1, document.activeElement && document.activeElement.getAttribute('aria-label') === id);
      },
      onHover: hover
    });

    $('btn-add').addEventListener('click', addHinge);
    $('btn-remove').addEventListener('click', removeHinge);
    $('btn-fit').addEventListener('click', fit);
    $('btn-fitw').addEventListener('click', fitW);
    $('theme-btn').addEventListener('click', function () { window.Theme.toggle(); });

    window.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var key = e.key;
      if (key === 'f' || key === 'F') fit();
      else if (key === 'w' || key === 'W') fitW();
      else if (key === '+' || key === '=') addHinge();
      else if (key === '-' || key === '_') removeHinge();
    });

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () { plot.resize(); }).observe($('plot'));
      new ResizeObserver(function () {
        var w = $('net').clientWidth;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        if (st.net) { diagram.build(st.net); schedule(); }
      }).observe($('net'));
    } else window.addEventListener('resize', function () { plot.resize(); if (st.net) diagram.build(st.net); schedule(); });
    plot.resize();

    var q = new URLSearchParams(location.search);
    var n = parseInt(q.get('n'), 10);
    st.n = isFinite(n) ? Math.max(H.MINN, Math.min(H.MAXN, n)) : 4;
    selectFunction(T.byId[q.get('fn')] ? q.get('fn') : 'zigzag', q.get('fit') === '1' ? 'fit' : 'start');
    if (q.get('set')) {
      q.get('set').split(',').forEach(function (kv) {
        var p = kv.split(':'), v = parseFloat(p[1]);
        if (p[0] && isFinite(v)) H.setParam(st.net, p[0], v);
      });
      diagram.setValues(st.net);
    }
    if (q.get('fitw') === '1') fitW();
    if (q.get('hl')) hover(q.get('hl'));
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
