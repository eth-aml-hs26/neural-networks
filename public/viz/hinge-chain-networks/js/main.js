/* Wiring: the menu of targets, the layer buttons, fit, the knobs, the kinks dragged in the plot, the
 * render loop, keys and URL parameters.
 * Keys: + add a layer, - remove one, f fit, t theme.
 * URL parameters (for screenshots): ?fn=<target id>&k=<layers>&fit=1&set=delta0:2,d1:1&theme=dark&hl=d2 */
(function () {
  'use strict';
  var H = window.HCN, T = window.Targets, Tex = window.Tex;
  var $ = function (id) { return document.getElementById(id); };
  var st = { fn: null, k: 3, net: null, tv: null, pending: false };
  var plot, diagram;

  function fmtMse(e) {
    if (e < 1e-12) return '0';
    if (e >= 1e-3 && e < 999.5) return e.toPrecision(3);
    var m = e.toExponential(1).split('e');
    return m[0] + ' × 10<sup>' + m[1].replace('-', Tex.MINUS).replace('+', '') + '</sup>';
  }

  function render() {
    st.pending = false;
    var fwd = H.forward(st.net);
    plot.update(fwd.y, H.kinks(st.net).map(function (t, i) { return { x: t, idle: Math.abs(st.net.D[i + 1]) < 0.005 }; }));
    diagram.update(st.net, fwd, plot.range());
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

  // the number of layers changed: lay the network, its knobs and the kinks out again
  function structure() {
    st.k = st.net.d.length;
    diagram.build(st.net);
    plot.setLayers(st.k);
    $('layer-count').textContent = st.k;
    $('btn-remove').disabled = st.k <= H.MINK;
    $('btn-add').disabled = st.k >= H.MAXK;
    schedule();
  }

  // a new target starts flat at its own height f(a); fit sets every knob by the construction
  function selectFunction(id, how) {
    var fn = st.fn = T.byId[id];
    st.tv = H.sample(fn.f, H.XS);
    st.net = how === 'fit' ? H.fit(fn.f, st.k, fn.id) : H.flatNet(fn.f(H.A), st.k);
    diagram.setScale(H.maxSlopeChange(fn.f, fn.id));
    plot.setTarget(H.XS, st.tv);
    document.querySelectorAll('.tile').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.fn === fn.id ? 'true' : 'false'); });
    structure();
  }

  function addLayer() {
    if (st.k >= H.MAXK) return;
    st.net = H.addLayer(st.net);
    structure();
    diagram.flash(st.k);
  }
  function removeLayer() {
    if (st.k <= H.MINK) return;
    st.net = H.removeLayer(st.net);
    structure();
  }
  function fit() {
    st.net = H.fit(st.fn.f, st.k, st.fn.id);
    diagram.setValues(st.net);
    schedule();
  }

  // a knob of layer l >= 1 belongs to kink l: the gap places it, the slope change bends there
  function hover(id) {
    diagram.highlight(id);
    var p = id ? H.parseId(id) : null;
    plot.highlight(p && p.i >= 1 ? p.i - 1 : null);
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
      // dragging kink l sets its gap from the kink before it; the later kinks move along
      onDrag: function (l, x) {
        var id = 'd' + (l + 1), prev = l ? H.kinks(st.net)[l - 1] : H.A;
        H.setParam(st.net, id, H.round2(x - prev));
        diagram.setValue(id, H.getParam(st.net, id));
        schedule();
      },
      onHover: function (l) { hover(l === null ? null : 'd' + (l + 1)); }
    });
    diagram = new window.Diagram.Diagram($('net'), {
      onChange: function (id, v) { H.setParam(st.net, id, v); schedule(); },
      onHover: hover
    });

    $('btn-add').addEventListener('click', addLayer);
    $('btn-remove').addEventListener('click', removeLayer);
    $('btn-fit').addEventListener('click', fit);
    $('theme-btn').addEventListener('click', function () { window.Theme.toggle(); });

    window.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var key = e.key;
      if (key === 'f' || key === 'F') fit();
      else if (key === '+' || key === '=') addLayer();
      else if (key === '-' || key === '_') removeLayer();
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
    var k = parseInt(q.get('k'), 10);
    st.k = isFinite(k) ? Math.max(H.MINK, Math.min(H.MAXK, k)) : 3;
    selectFunction(T.byId[q.get('fn')] ? q.get('fn') : 'zigzag', q.get('fit') === '1' ? 'fit' : 'start');
    if (q.get('set')) {
      q.get('set').split(',').forEach(function (kv) {
        var p = kv.split(':'), v = parseFloat(p[1]);
        if (p[0] && isFinite(v)) H.setParam(st.net, p[0], v);
      });
      diagram.setValues(st.net);
    }
    if (q.get('hl')) hover(q.get('hl'));
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
