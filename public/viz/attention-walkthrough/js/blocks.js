/* blocks.js: the pieces the diagram is drawn with, as functions on window.AW:
 *
 *   makeBlock(layer, id, tint, learned)   a block of cells at its place in layout.js; set(i, j, v,
 *                                         extra) writes a 0, a 1 or nothing (null) into a cell
 *   label(layer, cls, x, y, anchor)       an HTML label placed on the stage
 *   texLabel(layer, tex, x, y, anchor, cls)   the same, typeset by KaTeX
 *   turned(layer, text, cx, foot, cls)    a column head turned to read upwards, its foot at foot
 *   brace(svg, x0, x1, y)                 a curly brace over a run of columns, opening down
 *   focus(layer)                          the boxes round what the current click is about
 *
 * A 1 is bold on a tint of its block's colour, a 0 is grey: the ones carry the story (the deck's
 * convention). A block of weights, learned in training, has a dashed frame.
 */
(function () {
  'use strict';
  var AW = window.AW, K = window.AWKit, G = AW.geo;

  AW.makeBlock = function (layer, id, tint, learned) {
    var g = G.blocks[id];
    var el = K.div('blk vis t-' + tint + (learned ? ' learned' : ''), layer);
    el.style.left = g.x + 'px';
    el.style.top = g.y + 'px';
    el.style.width = g.w + 'px';
    el.style.height = g.h + 'px';
    el.setAttribute('data-block', id);
    var cells = [], vals = [];
    for (var i = 0; i < g.rows; i++) {
      cells.push([]);
      vals.push([]);
      for (var j = 0; j < g.cols; j++) {
        var c = K.div('cell', el);
        c.style.left = (j * g.cw) + 'px';
        c.style.top = (i * g.ch) + 'px';
        c.style.width = g.cw + 'px';
        c.style.height = g.ch + 'px';
        cells[i].push(c);
        vals[i].push(K.div('v', c, 'span'));
      }
    }
    K.div('frame', el);
    var b = { id: id, g: g, el: el, cells: cells, vals: vals };
    b.set = function (i, j, v, extra) {
      var cls = 'cell' + (j < g.cols - 1 ? ' rb' : '') + (i < g.rows - 1 ? ' bb' : '');
      if (v === null || v === undefined) cls += ' empty';
      else cls += v ? ' one' : ' zero';
      if (extra) cls += ' ' + extra;
      if (cells[i][j].className !== cls) cells[i][j].className = cls;
      var t = v === null || v === undefined ? '' : String(v);
      if (vals[i][j].textContent !== t) vals[i][j].textContent = t;
    };
    b.show = function (on) { K.show(el, on); };
    return b;
  };

  AW.label = function (layer, cls, x, y, anchor, text) {
    var el = K.div('lab vis ' + (cls || ''), layer);
    if (text !== undefined) el.textContent = text;
    K.pos(el, x, y, anchor || 'cc');
    return el;
  };

  AW.texLabel = function (layer, tex, x, y, anchor, cls) {
    var el = AW.label(layer, 'tex ' + (cls || ''), x, y, anchor);
    K.tex(el, tex);
    return el;
  };

  // A column head that reads upwards: its foot (where the text starts) at (cx, foot).
  AW.turned = function (layer, text, cx, foot, cls) {
    var el = K.div('lab vis turned ' + (cls || ''), layer);
    el.textContent = text;
    el.style.left = cx + 'px';
    el.style.top = foot + 'px';
    return el;
  };

  // A curly brace from x0 to x1 at height y, its tip up, and its name above the tip.
  AW.brace = function (svg, x0, x1, y, name, layer) {
    var m = (x0 + x1) / 2, r = 6;
    var d = 'M ' + x0 + ' ' + (y + r) + ' Q ' + x0 + ' ' + y + ' ' + (x0 + r) + ' ' + y +
      ' L ' + (m - r) + ' ' + y + ' Q ' + m + ' ' + y + ' ' + m + ' ' + (y - r) +
      ' Q ' + m + ' ' + y + ' ' + (m + r) + ' ' + y +
      ' L ' + (x1 - r) + ' ' + y + ' Q ' + x1 + ' ' + y + ' ' + x1 + ' ' + (y + r);
    var g = K.svg('g', null, svg, 'vis brace');
    K.svg('path', { d: d }, g, 'brace-line');
    var lab = AW.label(layer, 'group', m, y - r - 4, 'bc', name);
    return { g: g, lab: lab, show: function (on) { K.show(g, on); K.show(lab, on); } };
  };

  // The boxes round what the current click is about: set([{x, y, w, h}, ...]) draws one per
  // rectangle, a little outside it.
  AW.focus = function (layer) {
    var pool = [];
    return {
      set: function (rects) {
        rects = rects || [];
        while (pool.length < rects.length) pool.push(K.div('focus', layer));
        pool.forEach(function (el, i) {
          var r = rects[i];
          if (!r) { el.style.display = 'none'; return; }
          var p = r.pad === undefined ? 4 : r.pad;
          el.style.display = '';
          el.style.left = (r.x - p) + 'px';
          el.style.top = (r.y - p) + 'px';
          el.style.width = (r.w + 2 * p) + 'px';
          el.style.height = (r.h + 2 * p) + 'px';
        });
      }
    };
  };
})();
