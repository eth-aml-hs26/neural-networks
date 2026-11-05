/* kit.js: the drawing helpers, as window.DC.kit.
 *
 * SVG and HTML elements, grids of numbers addressed by their top left corner (x, y), their pitch
 * and a row and a column counted from 0, KaTeX, and the count of animations still running
 * (kit.active), which Play waits for. Colours come from CSS classes only. The tracking of
 * animations is the tiles page's (../tetris-tiles/js/kit.js).
 */
(function () {
  'use strict';
  var DC = window.DC = window.DC || {};
  var NS = 'http://www.w3.org/2000/svg';

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

  function lines(parent, x, y, pitch, rows, cols) {
    var d = '';
    for (var c = 1; c < cols; c++) d += 'M' + (x + c * pitch) + ' ' + y + 'V' + (y + rows * pitch);
    for (var r = 1; r < rows; r++) d += 'M' + x + ' ' + (y + r * pitch) + 'H' + (x + cols * pitch);
    if (d) el('path', { d: d, 'class': 'cellline' }, parent);
  }

  // a grid of cells: fill(r, c) gives the class of a cell's fill, label(r, c) its text or null and
  // numCls(r, c) the class of that text. Returns the group, with the text of every cell in .cells
  function grid(parent, x, y, pitch, rows, cols, fill, label, numCls) {
    var G = el('g', null, parent), cells = [];
    for (var r = 0; r < rows; r++) {
      cells.push([]);
      for (var c = 0; c < cols; c++) {
        el('rect', { x: x + c * pitch, y: y + r * pitch, width: pitch, height: pitch, 'class': fill(r, c) }, G);
        cells[r].push(null);
      }
    }
    lines(G, x, y, pitch, rows, cols);
    el('rect', { x: x, y: y, width: cols * pitch, height: rows * pitch, 'class': 'frame' }, G);
    for (var r2 = 0; r2 < rows; r2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        var s = label ? label(r2, c2) : null;
        if (s !== null && s !== undefined) {
          cells[r2][c2] = text(G, x + (c2 + 0.5) * pitch, y + (r2 + 0.5) * pitch, String(s), 'n ' + numCls(r2, c2));
        }
      }
    }
    G.cells = cells;
    return G;
  }

  function rect(parent, x, y, w, h, cls) { return el('rect', { x: x, y: y, width: w, height: h, 'class': cls }, parent); }
  function path(parent, d, cls) { return el('path', { d: d, 'class': cls }, parent); }

  // a brace along a span, tip towards the label: side 'up' (label above) or 'down' (label below)
  function brace(parent, x0, x1, y, side) {
    var s = side === 'up' ? -1 : 1, h = 9, m = (x0 + x1) / 2;
    var d = 'M' + x0 + ' ' + (y - s * 2) + 'Q' + x0 + ' ' + (y + s * h * 0.6) + ' ' + (x0 + 10) + ' ' + (y + s * h * 0.6) +
            'H' + (m - 8) + 'Q' + m + ' ' + (y + s * h * 0.6) + ' ' + m + ' ' + (y + s * h * 1.5) +
            'Q' + m + ' ' + (y + s * h * 0.6) + ' ' + (m + 8) + ' ' + (y + s * h * 0.6) +
            'H' + (x1 - 10) + 'Q' + x1 + ' ' + (y + s * h * 0.6) + ' ' + x1 + ' ' + (y - s * 2);
    return el('path', { d: d, 'class': 'brace' }, parent);
  }

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

  // a line of words with $...$ set in KaTeX
  function words(host, str) {
    host.textContent = '';
    str.split('$').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) tex(div(null, host, 'span'), part);
      else host.appendChild(document.createTextNode(part));
    });
    return host;
  }

  // a KaTeX formula centred on x, its top at y
  function texAt(parent, x, y, src, cls) {
    var f = div(cls || 'formula', parent);
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    return tex(f, src);
  }

  // ===== animations still running: Play waits until none is

  var kit = {
    el: el, text: text, grid: grid, rect: rect, path: path, brace: brace, div: div, tex: tex,
    words: words, texAt: texAt,
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
  DC.kit = kit;
})();
