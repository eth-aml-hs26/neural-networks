/* kit.js: the drawing helpers, as window.TT.kit.
 *
 * The SVG helpers are BMAI's (convolution-walkthrough/js/svg.js): a grid is addressed by its top
 * left corner (x, y), its pitch, and a row and a column counted from 0, the convention of
 * precompute/build_examples.py. Colours come from CSS classes only. Any group can carry a step
 * range: kit.at(parent, from, to), shown for the steps from..to.
 *
 * Also: HTML elements, KaTeX, and the count of animations still running (kit.active), which Play
 * waits for.
 */
(function () {
  'use strict';
  var TT = window.TT = window.TT || {};
  var NS = 'http://www.w3.org/2000/svg';
  var MINUS = String.fromCharCode(0x2212);

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  function text(parent, x, y, str, cls) {
    var t = el('text', { x: x, y: y, 'class': cls }, parent);
    t.textContent = str;
    return t;
  }

  // a group shown for the steps from..to (inclusive); to defaults to the last step. card: also
  // shown on that card of the story (the last card shows the image where step 1 draws it)
  function at(parent, from, to, card) {
    return el('g', { 'class': 'vis', 'data-from': from, 'data-to': to === undefined ? 99 : to,
                     'data-card': card === undefined ? null : card }, parent);
  }

  function hairs(parent, x, y, pitch, rows, cols) {
    var d = '';
    for (var c = 1; c < cols; c++) d += 'M' + (x + c * pitch) + ' ' + y + 'V' + (y + rows * pitch);
    for (var r = 1; r < rows; r++) d += 'M' + x + ' ' + (y + r * pitch) + 'H' + (x + cols * pitch);
    if (d) el('path', { d: d, 'class': 'hair' }, parent);
  }

  // a 0/1 grid: the sea, the land cells, the cell lines, the frame
  function grid(parent, x, y, pitch, g) {
    var rows = g.length, cols = g[0].length;
    var G = el('g', null, parent);
    el('rect', { x: x, y: y, width: cols * pitch, height: rows * pitch, 'class': 'sea' }, G);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (g[r][c]) el('rect', { x: x + c * pitch, y: y + r * pitch, width: pitch, height: pitch, 'class': 'land' }, G);
      }
    }
    hairs(G, x, y, pitch, rows, cols);
    el('rect', { x: x, y: y, width: cols * pitch, height: rows * pitch, 'class': 'frame' }, G);
    return G;
  }

  // an empty map: paper, cell lines, a frame
  function empty(parent, x, y, pitch, rows, cols) {
    var G = el('g', null, parent);
    el('rect', { x: x, y: y, width: cols * pitch, height: rows * pitch, 'class': 'paperfill' }, G);
    hairs(G, x, y, pitch, rows, cols);
    el('rect', { x: x, y: y, width: cols * pitch, height: rows * pitch, 'class': 'frame' }, G);
    return G;
  }

  function cellCentre(x, y, pitch, row, col) {
    return [x + (col + 0.5) * pitch, y + (row + 0.5) * pitch];
  }

  function cellRing(parent, x, y, pitch, row, col, frac, cls) {
    var p = cellCentre(x, y, pitch, row, col);
    return el('circle', { cx: p[0], cy: p[1], r: frac * pitch, 'class': cls }, parent);
  }

  // a size by size window whose top left cell is (row, col), inset in cells
  function win(parent, x, y, pitch, row, col, size, inset, cls) {
    return el('rect', { x: x + (col + inset) * pitch, y: y + (row + inset) * pitch,
                        width: (size - 2 * inset) * pitch, height: (size - 2 * inset) * pitch,
                        'class': cls }, parent);
  }

  // an island's outline from the generator: loops of [x, y] in cell units
  function outline(parent, x, y, pitch, loops, cls) {
    var d = '';
    loops.forEach(function (loop) {
      loop.forEach(function (p, i) { d += (i ? 'L' : 'M') + (x + p[0] * pitch) + ' ' + (y + p[1] * pitch); });
      d += 'Z';
    });
    return el('path', { d: d, 'class': cls }, parent);
  }

  function path(parent, d, cls) { return el('path', { d: d, 'class': cls }, parent); }

  // ===== HTML

  function div(cls, parent, tag) {
    var e = document.createElement(tag || 'div');
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  function tex(host, src, display) {
    if (window.katex) window.katex.render(src, host, { throwOnError: false, displayMode: !!display });
    else host.textContent = src;
    return host;
  }

  // ===== animations still running: Play waits until none is

  var kit = {
    el: el, text: text, at: at, grid: grid, empty: empty, cellCentre: cellCentre, cellRing: cellRing,
    win: win, outline: outline, path: path, div: div, tex: tex, MINUS: MINUS,
    active: 0,
    // a Web Animation counted while it runs; done() runs when it ends or is cancelled
    track: function (anim, done) {
      kit.active++;
      var over = false;
      function end() {
        if (over) return;
        over = true;
        kit.active = Math.max(0, kit.active - 1);
        if (done) done();
      }
      anim.addEventListener('finish', end);
      anim.addEventListener('cancel', end);
      kit.running.push(anim);
      return anim;
    },
    // a timer counted while it waits
    later: function (ms, fn) {
      kit.active++;
      var id = setTimeout(function () {
        kit.timers.splice(kit.timers.indexOf(id), 1);
        kit.active = Math.max(0, kit.active - 1);
        fn();
      }, ms);
      kit.timers.push(id);
      return id;
    },
    running: [],
    timers: [],
    // every animation of the click before ends at once (a new click renders from scratch)
    cancel: function () {
      var list = kit.running.slice();
      kit.running = [];
      list.forEach(function (a) { try { a.cancel(); } catch (e) { /* gone */ } });
      kit.timers.forEach(function (id) { clearTimeout(id); });
      kit.timers = [];
      kit.active = 0;
    }
  };
  TT.kit = kit;
})();
