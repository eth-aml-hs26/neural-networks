/* steps.js: the 12 steps of BMAI's page "Decomposing an image into tiles"
 * (convolution-walkthrough/js/tiles.js, git_bmai 2026hs/w3-lecture-material at 07f276d), as
 * TT.steps, with the same example, the same order and the same pointing.
 *
 *   1      the image, 7 by 7
 *   2      the four tiles J, L, O and I, each 4 by 4
 *   3      the empty feature map, 4 by 4, because 7 - 4 + 1 = 4
 *   4 to 7 one tile each: its 4 by 4 window on the image (on that step only); its island outlined,
 *          a ring on the window's corner in the image and in the map, its tile framed in its
 *          colour with a ring on its corner, and a curve from the tile to its ring in the map
 *   8      an empty sea, 7 by 7: "Put back at the marked corners"
 *   9 to 12 the tiles put back one per step at the corners the map marks, until the image is
 *          whole again; step 12 says so
 *
 * Pointing at a cell of the feature map (from step 3) shows, on the image, the 4 by 4 window whose
 * top left corner that cell stands for, and marks the cell in the same dashed ink.
 *
 * The page draws everything once (build); render shows the groups of the current step from
 * scratch; animate decorates a single forward click: the tiles rise one after another (step 2),
 * a tile's curve draws itself and its rings pop (steps 4 to 7), a copy of the tile flies from the
 * column to its corner on the sea and its land lands (steps 9 to 12).
 *
 * Every number comes from window.EXAMPLES.tiles (data/examples.js).
 */
(function () {
  'use strict';
  var TT = window.TT, K = TT.kit, G = TT.geo;
  var E = window.EXAMPLES.tiles;
  var N = G.N, T = G.T, M = G.M, IMG = G.IMG, FM = G.FM, TILE = G.TILE, REB = G.REB;
  var STROKE = { magenta: 's-magenta', violet: 's-violet', orange: 's-orange', cyan: 's-cyan' };
  var el = { groups: [], htmls: [], curves: [], rings: [], tiles: [], stamps: [], flies: null };

  function zeros(n) {
    var g = [];
    for (var r = 0; r < n; r++) { g.push([]); for (var c = 0; c < n; c++) g[r].push(0); }
    return g;
  }

  // the curve from a tile's corner to its ring in the map (BMAI's). A ring in the map's last
  // column is reached from the right, one in its first row from above, any other from below, so
  // that no curve crosses another ring.
  function curve(i, r, c) {
    var sx = TILE.x, sy = TILE.tops[i] + TILE.p / 2;
    var cc = K.cellCentre(FM.x, FM.y, FM.p, r, c), rr = G.RING * FM.p;
    if (c === M - 1) {
      return 'M' + sx + ' ' + sy + 'C' + (sx - 210) + ' ' + sy + ' ' + (cc[0] + rr + 105) + ' ' + cc[1] +
             ' ' + (cc[0] + rr) + ' ' + cc[1];
    }
    if (r === 0) {
      return 'M' + sx + ' ' + sy + 'C' + (sx - 260) + ' ' + (FM.y - 70) + ' ' + cc[0] + ' ' + (FM.y - 70) +
             ' ' + cc[0] + ' ' + (cc[1] - rr);
    }
    return 'M' + sx + ' ' + sy + 'C' + (sx - 360) + ' ' + sy + ' ' + cc[0] + ' ' + (FM.y + M * FM.p + 180) +
           ' ' + cc[0] + ' ' + (cc[1] + rr);
  }

  function group(parent, from, to, card) {
    var g = K.at(parent, from, to, card);
    el.groups.push(g);
    return g;
  }

  function build(svg, mid) {
    // ======== step 1: the image (also on the last card of the story, without its sizes)
    var s1 = group(svg, 1, undefined, 5);
    K.grid(s1, IMG.x, IMG.y, IMG.p, E.image);
    var s1n = group(svg, 1);
    K.text(s1n, IMG.x + N * IMG.p / 2, IMG.y - 24, String(N), 'dim');
    K.text(s1n, IMG.x - 26, IMG.y + N * IMG.p / 2, String(N), 'dim');

    // ======== step 2: the tiles
    var s2 = group(svg, 2);
    E.tiles.forEach(function (t, i) {
      var y = TILE.tops[i], g = K.el('g', null, s2);
      K.grid(g, TILE.x, y, TILE.p, t.grid);
      K.text(g, TILE.x + T * TILE.p + 24, y + T * TILE.p / 2, String(T), 'dim');
      el.tiles.push(g);
    });

    // ======== step 3: the empty feature map
    var s3 = group(svg, 3);
    K.empty(s3, FM.x, FM.y, FM.p, M, M);
    K.text(s3, FM.x - 26, FM.y + M * FM.p / 2, String(M), 'dim');
    K.text(s3, FM.x + M * FM.p / 2, FM.y + M * FM.p + 24, String(M), 'dim');
    K.text(s3, FM.x, FM.y + M * FM.p + 64, 'Feature map', 'label');
    // why 4: a 4 by 4 tile fits in 7 - 4 + 1 places along a side, set in KaTeX under the label.
    // Kept short, as BMAI found: a longer line would cross the curve that reaches the map from
    // below.
    var f = K.div('formula vis', mid);
    f.setAttribute('data-from', 3);
    f.setAttribute('data-to', 99);
    f.style.left = FM.x + 'px';
    f.style.top = (FM.y + M * FM.p + 88) + 'px';
    K.tex(f, N + '-' + T + '+1=' + M);
    el.htmls.push(f);

    // ======== steps 4 to 7: one tile each
    E.tiles.forEach(function (t, i) {
      var n = 4 + i, cls = STROKE[t.colour], r = t.at[0], c = t.at[1];
      var only = group(svg, n, n);
      K.win(only, IMG.x, IMG.y, IMG.p, r, c, T, 0.06, cls + ' w3 dash');
      var g = group(svg, n);
      K.outline(g, IMG.x, IMG.y, IMG.p, t.island_outline, cls + ' w3 round');
      var rings = [
        K.cellRing(g, IMG.x, IMG.y, IMG.p, r, c, G.RING, cls + ' w2 ring'),
        K.cellRing(g, FM.x, FM.y, FM.p, r, c, G.RING, cls + ' w2 ring')
      ];
      K.el('rect', { x: TILE.x, y: TILE.tops[i], width: T * TILE.p, height: T * TILE.p, 'class': cls + ' w3' }, g);
      rings.push(K.cellRing(g, TILE.x, TILE.tops[i], TILE.p, 0, 0, 0.42, cls + ' w2 ring'));
      el.curves.push(K.path(g, curve(i, r, c), cls + ' w2'));
      el.rings.push(rings);
    });

    // ======== steps 8 to 12: the image rebuilt from the map and the tiles
    var s8 = group(svg, 8);
    K.text(s8, REB.x, REB.y - 30, 'Put back at the marked corners', 'label');
    K.grid(s8, REB.x, REB.y, REB.p, zeros(N));
    E.tiles.forEach(function (t, i) {
      var n = 9 + i, cls = STROKE[t.colour], r = t.at[0], c = t.at[1];
      var only = group(svg, n, n);
      K.win(only, REB.x, REB.y, REB.p, r, c, T, 0.06, cls + ' w2 dash');
      var g = group(svg, n);
      t.image_cells.forEach(function (rc) {
        K.el('rect', { x: REB.x + rc[1] * REB.p, y: REB.y + rc[0] * REB.p, width: REB.p, height: REB.p,
                       'class': 'land' }, g);
      });
      K.outline(g, REB.x, REB.y, REB.p, t.island_outline, cls + ' w2 round');
      K.cellRing(g, REB.x, REB.y, REB.p, r, c, G.RING, cls + ' w1');
      el.stamps.push(g);
    });
    // the cell lines and the frame again, on top of the land put back
    var s8b = group(svg, 8);
    var hair = '';
    for (var k = 1; k < N; k++) {
      hair += 'M' + (REB.x + k * REB.p) + ' ' + REB.y + 'V' + (REB.y + N * REB.p);
      hair += 'M' + REB.x + ' ' + (REB.y + k * REB.p) + 'H' + (REB.x + N * REB.p);
    }
    K.path(s8b, hair, 'hair');
    K.el('rect', { x: REB.x, y: REB.y, width: N * REB.p, height: N * REB.p, 'class': 'frame' }, s8b);
    var s12 = group(svg, 12);
    K.text(s12, REB.x + N * REB.p + 36, REB.y + N * REB.p / 2 - 16, 'The four tiles, superimposed,', 'note');
    K.text(s12, REB.x + N * REB.p + 36, REB.y + N * REB.p / 2 + 16, 'give the image back.', 'note');

    // the copies of the tiles that fly back, steps 9 to 12
    el.flies = K.el('g', null, svg);

    // ======== pointing at a cell of the map: its window on the image, and the cell itself marked
    // the same way, so that a reload of the address shows which cell was pointed at
    el.probe = K.el('rect', { 'class': 'probe off' }, svg);
    el.probeCell = K.el('rect', { 'class': 'probe off' }, svg);
    var hits = group(svg, 3);
    for (var r = 0; r < M; r++) {
      for (var c = 0; c < M; c++) {
        (function (r, c) {
          var h = K.el('rect', { x: FM.x + c * FM.p, y: FM.y + r * FM.p, width: FM.p, height: FM.p,
                                 'class': 'hit', 'data-probe': r + ',' + c }, hits);
          h.addEventListener('mouseenter', function () { point(r, c); });
          h.addEventListener('mouseleave', function () { point(null); });
        })(r, c);
      }
    }
  }

  // the window of map cell (r, c) on the image, or none
  function point(r, c) {
    var p = el.probe, q = el.probeCell;
    if (r === null || r === undefined) {
      p.classList.add('off'); q.classList.add('off'); el.pointed = null; return;
    }
    p.setAttribute('x', IMG.x + (c + 0.03) * IMG.p);
    p.setAttribute('y', IMG.y + (r + 0.03) * IMG.p);
    p.setAttribute('width', (T - 0.06) * IMG.p);
    p.setAttribute('height', (T - 0.06) * IMG.p);
    q.setAttribute('x', FM.x + (c + 0.1) * FM.p);
    q.setAttribute('y', FM.y + (r + 0.1) * FM.p);
    q.setAttribute('width', 0.8 * FM.p);
    q.setAttribute('height', 0.8 * FM.p);
    p.classList.remove('off'); q.classList.remove('off');
    el.pointed = [r, c];
  }

  function shownAt(node, st) {
    var from = +node.getAttribute('data-from'), to = +node.getAttribute('data-to');
    var card = node.getAttribute('data-card');
    if (st.kind === 'step') return st.step >= from && st.step <= to;
    return card !== null && +card === st.card;
  }

  function render(st) {
    el.flies.textContent = '';
    el.stamps.forEach(function (g) { g.classList.remove('waiting'); });
    el.groups.concat(el.htmls).forEach(function (node) { node.classList.toggle('on', shownAt(node, st)); });
    // the window of a cell shows only while the map does
    if (st.kind !== 'step' || st.step < 3) point(null);
  }

  // a single forward click: decorate the change
  function animate(st) {
    if (st.kind !== 'step') return;
    var n = st.step;
    if (n === 2) {
      el.tiles.forEach(function (g, i) {
        K.track(g.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
          { duration: 520, delay: 140 * i, easing: 'ease-out', fill: 'backwards' }));
      });
    } else if (n >= 4 && n <= 7) {
      var i = n - 4, path = el.curves[i], L = path.getTotalLength();
      path.style.strokeDasharray = L + ' ' + L;
      K.track(path.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
        { duration: 1000, delay: 250, easing: 'ease-in-out', fill: 'backwards' }), function () {
        path.style.strokeDasharray = '';
      });
      el.rings[i].forEach(function (ring, k) {
        K.track(ring.animate([
          { transform: 'scale(0.2)', opacity: 0 },
          { transform: 'scale(1.25)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1)', opacity: 1 }
        ], { duration: 520, delay: k === 1 ? 1150 : 120 * k, easing: 'ease-out', fill: 'backwards' }));
      });
    } else if (n >= 9 && n <= 12) {
      fly(n - 9);
    }
  }

  // A copy of tile i flies from the column to its corner on the sea, shrinking to the sea's
  // pitch; when it lands, its land shows.
  function fly(i) {
    var t = E.tiles[i], stamp = el.stamps[i], cls = STROKE[t.colour];
    var g = K.el('g', { 'class': 'fly-tile' }, el.flies);
    K.grid(g, 0, 0, TILE.p, t.grid);
    K.el('rect', { x: 0, y: 0, width: T * TILE.p, height: T * TILE.p, 'class': cls + ' w3' }, g);
    var s = REB.p / TILE.p;
    var x0 = TILE.x, y0 = TILE.tops[i];
    var x1 = REB.x + t.at[1] * REB.p, y1 = REB.y + t.at[0] * REB.p;
    g.style.transformOrigin = '0 0';
    stamp.classList.add('waiting');
    var a = g.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(' + s + ')', opacity: 1, offset: 0.9 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(' + s + ')', opacity: 0 }
    ], { duration: 1200, easing: 'ease-in-out', fill: 'both' });
    K.track(a, function () {
      if (g.parentNode) g.parentNode.removeChild(g);
      stamp.classList.remove('waiting');
    });
    // the land shows as the copy settles on it
    K.later(1000, function () { stamp.classList.remove('waiting'); });
  }

  TT.steps = {
    COUNT: 12, build: build, render: render, animate: animate, point: point,
    pointed: function () { return el.pointed || null; }, el: el
  };
})();
