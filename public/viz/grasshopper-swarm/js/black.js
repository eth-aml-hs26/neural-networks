/* black.js: the black part, the model and its forward pass, as GF.parts.black.
 *
 * Iteration 1, one new thing a click:
 *   data     the eight evenings as the tall columns y (aphids) and x (days), y first; the plot
 *            with its eight points and the question (100 aphids, day 10)
 *   old      step 2's diagram on these days: one w, one b, the column a, the ReLU, yhat, l, lbar,
 *            at the best single bend (SwarmMath.oneBendPass); in the plot its one bend, which
 *            cannot curve, lbar = 30.3524
 *   widen    the old pass goes; w and b grow into columns of four cells: four w's, four b's
 *   land     one grasshopper lands beside every cell of w and of b
 *   A        the table A, one column per neuron: a_ij = w_j x_i + b_j, the first cell worked out,
 *            then column 1, then the others
 *   Z        Z = ReLU(A), cell by cell: the cells where a neuron is off turn 0
 *   bends    in the plot, column j of Z is neuron j's own bend, ReLU(w_j x + b_j)
 *   sum      each row of Z added up gives yhat (the circled plus): day 8 worked out, then the rest
 *   curve    in the plot, the bends added up: one curve that bends four times, and its reading at
 *            day 10 (59.5 at the start: one box)
 *   loss     the column l = (y - yhat)^2 and the gaps in the plot
 *   mean     l folds into one number, its average lbar
 * Iteration 2 on, one click:
 *   recompute   the new numbers flow through A, Z, yhat, l and lbar; the gaps come back
 *   jump        (speed 3, in place of recompute: the jumps only) the swarm jumps to its new
 *               numbers, the curve and the bends glide there, and the new numbers flow through A, Z,
 *               yhat, l and lbar, with the slopes of this iteration (the picture +1 shows)
 *
 * While a grasshopper hops (the blue part says which, and how far its change has flowed:
 * GF.parts.blue.hopView), the cells show the hopped pass in blue wherever a value changed, and
 * whatever the hop does not reach is dimmed.
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS, N = T.x.length, MM = T.m, LAST = N - 1;
  var COLS = ['y', 'x', 'yhat', 'l'];
  var UNITS = { y: 'aphids', x: 'days', yhat: 'aphids', l: '', A: 'aphids', Z: 'aphids', w: 'aphids a day', b: 'aphids' };
  var NAMES = {
    y: 'y', x: 'x',
    yhat: '\\hat y_i = \\textstyle\\sum_j z_{ij}', l: '\\ell_i = (y_i - \\hat y_i)^2',
    A: 'A\\colon\\ a_{ij} = w_j\\,x_i + b_j', Z: 'Z\\colon\\ z_{ij} = \\mathrm{ReLU}(a_{ij})'
  };
  var OLDNAMES = { a: 'a = w\\,x + b', yhat: '\\hat y = \\mathrm{ReLU}(a)', l: '\\ell = (y - \\hat y)^2' };
  var STEPS1 = ['data', 'old', 'widen', 'land', 'A', 'Z', 'bends', 'sum', 'curve', 'loss', 'mean'];
  var el = { frame: {}, unit: {}, name: {}, cells: {}, tab: {}, m: {}, a: {}, idx: [], dl: [], old: {} };

  // ===== numbers in cells: plain text in KaTeX's face, fast enough for Play

  var MINUS = '\u2212', THIN = '\u2009';
  function setNum(e, tex) {
    tex = String(tex);
    if (e.__n === tex) return;
    e.__n = tex;
    if (tex.indexOf('times') >= 0) { katex.render(tex, e, { throwOnError: false }); return; }
    e.textContent = tex.replace(/\\,/g, THIN).replace(/^-/, MINUS);
  }

  // ===== build

  function cellDiv(layer, c, cls) {
    var d = K.div('cell vis ' + (cls || ''), layer);
    d.style.left = c.x + 'px';
    d.style.top = c.y + 'px';
    d.style.width = c.w + 'px';
    d.style.height = c.h + 'px';
    var v = K.div('v vis', d, 'span');
    return { d: d, v: v };
  }
  function frameDiv(layer, f, cls) {
    var d = K.div((cls || 'col') + ' vis', layer);
    setFrame(d, f);
    return d;
  }
  function setFrame(d, f) {
    d.style.left = f.x + 'px';
    d.style.top = f.y + 'px';
    d.style.width = f.w + 'px';
    d.style.height = f.h + 'px';
  }
  function unitDiv(layer, text, x, w, y) {
    var u = K.div('col-unit vis', layer);
    u.textContent = text;
    u.style.left = x + 'px';
    u.style.width = w + 'px';
    u.style.top = y + 'px';
    return u;
  }
  function lab(layer, tex, x, y, anchor, cls) {
    var d = K.div('lab vis ' + (cls || ''), layer);
    K.tex(d, tex);
    K.pos(d, x, y, anchor);
    return d;
  }
  function disc(layer, j, x, y) {
    var d = K.div('disc vis n' + (j + 1), layer);
    d.textContent = String(j + 1);
    K.pos(d, x, y, 'cc');
    return d;
  }

  function build(layer) {
    var mid = layer.mid, uy = G.rowsBottom + 1;
    // the columns of the bottom row
    COLS.forEach(function (name) {
      var f = G.frame(name);
      el.frame[name] = frameDiv(mid, f);
      el.cells[name] = [];
      for (var i = 0; i < N; i++) el.cells[name].push(cellDiv(mid, G.cell(name, i), i ? 'sep' : ''));
      el.unit[name] = unitDiv(mid, UNITS[name], f.x, f.w, uy);
      el.name[name] = lab(mid, NAMES[name], f.cx, G.nameY, 'cc', 'col-name');
    });
    K.pos(el.name.y, G.frame('y').left + 34, G.nameY, 'cc');
    K.pos(el.name.l, G.frame('l').left + 28, G.nameY, 'cl');
    for (var i = 0; i < N; i++) {
      var d = K.div('day-index vis', mid);
      d.textContent = String(i + 1);
      K.pos(d, G.col.y.x - 8, G.cell('y', i).cy, 'cr');
      el.idx.push(d);
      var q = K.div('dl vis', mid);
      K.pos(q, G.frame('l').right + 6, G.cell('l', i).cy, 'cl');
      el.dl.push(q);
    }
    // the tables
    ['A', 'Z'].forEach(function (name) {
      var t = { cells: [], discs: [] };
      t.frame = frameDiv(mid, G.tframe(name));
      for (var i = 0; i < N; i++) {
        var row = [];
        for (var j = 0; j < MM; j++) row.push(cellDiv(mid, G.tcell(name, i, j), 'small' + (i ? ' sep' : '') + (j ? ' vsep' : '')));
        t.cells.push(row);
      }
      var f = G.tframe(name);
      t.unit = unitDiv(mid, UNITS[name], f.x, f.w, uy);
      t.name = lab(mid, NAMES[name], f.cx, G.nameY, 'cc', 'col-name');
      for (var j2 = 0; j2 < MM; j2++) { var h = G.thead(name, j2); t.discs.push(disc(mid, j2, h.x, h.y)); }
      el.tab[name] = t;
    });
    // w and b, one cell per neuron; their names above their top left corner
    ['w', 'b'].forEach(function (name) {
      var o = { cells: [] };
      o.frame = frameDiv(mid, G.mframe(name, 1));
      for (var j = 0; j < MM; j++) o.cells.push(cellDiv(mid, G.mcell(name, j), j ? 'sep' : ''));
      var f = G.mframe(name, 1);
      o.unit = unitDiv(mid, UNITS[name], f.x, f.w, f.bottom - G.BORDER - G.UNIT + 1);
      // the name under the column, clear of the arrows that leave it
      o.name = lab(mid, name, name === 'w' ? f.cx : f.cx - 28, f.bottom + 16, 'cc', 'name');
      el.m[name] = o;
    });
    el.mdiscs = [];
    for (var j = 0; j < MM; j++) { var p = G.mdisc(j); el.mdiscs.push(disc(mid, j, p.x, p.y)); }

    // lbar
    var lb = G.lbarBox();
    el.lbar = K.div('box vis', mid);
    setFrame(el.lbar, lb);
    el.lbarVal = K.div('val', el.lbar);
    el.lbarName = lab(mid, '\\bar\\ell', lb.cx, lb.bottom + 24, 'cc', 'name');

    // the arrows and the operations on them
    var R = G.routes();
    el.a.x2A = K.arrow(layer.back, R.x2A, 'k-black');
    el.a.w2A = K.arrow(layer.back, R.w2A, 'k-black', { noHead: true });
    el.a.b2A = K.arrow(layer.back, R.b2A, 'k-black');
    el.a.A2Z = K.arrow(layer.back, R.A2Z, 'k-black');
    el.a.Z2yhat = K.arrow(layer.back, R.Z2yhat, 'k-black');
    el.a.yhat2l = K.arrow(layer.back, R.yhat2l, 'k-black');
    el.a.l2lbar = K.arrow(layer.back, R.l2lbar, 'k-black');
    el.a.y2l = K.arrow(layer.back, R.y2l, 'k-black');
    var A = G.tframe('A'), Z = G.tframe('Z'), yh = G.frame('yhat'), l = G.frame('l');
    el.relu = lab(mid, '\\mathrm{ReLU}', (A.right + Z.left) / 2, G.mid - 8, 'bc', 'op small');
    el.plus = lab(mid, '\\oplus', (Z.right + yh.left) / 2, G.mid - 8, 'bc', 'op');
    el.mean = lab(mid, '\\tfrac{1}{8}\\textstyle\\sum', (l.right + lb.left) / 2 + 4, lb.top - 4, 'bc', 'op');

    // the old diagram of step 2: the column a where A's first column stands, and its arrows
    var a = G.tframe('A', 1), O = G.oldRoutes();
    el.old.frame = frameDiv(mid, a);
    el.old.cells = [];
    for (var i2 = 0; i2 < N; i2++) el.old.cells.push(cellDiv(mid, G.tcell('A', i2, 0), 'small' + (i2 ? ' sep' : '')));
    el.old.unit = unitDiv(mid, UNITS.A, a.x, a.w, uy);
    el.old.name = lab(mid, OLDNAMES.a, a.cx + 30, G.nameY, 'cc', 'col-name');
    el.old.nameY = lab(mid, OLDNAMES.yhat, yh.cx, G.nameY, 'cc', 'col-name');
    el.old.nameL = lab(mid, OLDNAMES.l, l.left + 28, G.nameY, 'cl', 'col-name');
    el.old.x2a = K.arrow(layer.back, [[G.frame('x').right, G.mid], [a.left, G.mid]], 'k-black');
    el.old.w2a = K.arrow(layer.back, O.w2a, 'k-black');
    el.old.b2a = K.arrow(layer.back, O.b2a, 'k-black', { noHead: true });
    el.old.a2yhat = K.arrow(layer.back, O.a2yhat, 'k-black');
    el.old.relu = lab(mid, '\\mathrm{ReLU}', (a.right + yh.left) / 2, G.mid - 8, 'bc', 'op');

    // the worked cell of a click, in the band
    el.strip = K.div('lab strip vis', mid);
  }

  // ===== what a state shows

  function shows(st) {
    var later = st.iter > 1;
    function R(n) { return later || st.reached('black', n); }
    var o = {};
    STEPS1.forEach(function (n) { o[n] = R(n); });
    o.oldOn = st.iter === 1 && st.reached('black', 'old') && !st.reached('black', 'widen');
    o.on = st.part !== 'story' && o.data;
    return o;
  }

  // The forward pass the cells show, and how a hop shows in them (see GF.parts.blue.hopView):
  // lv 1 the hopped number only, 2 column j of A, 3 column j of Z, 4 the rows of yhat and l,
  // 5 lbar.
  function view(st) {
    var hv = GF.parts.blue.hopView(st);
    return hv ? { F: st.F, H: hv.H, j: hv.j, lv: hv.lv, which: hv.which } : { F: st.F, H: null, lv: 0 };
  }

  function cellClass(c, on, value, opts) {
    K.show(c.d, on);
    K.show(c.v, value !== null && value !== undefined);
    if (value !== null && value !== undefined) setNum(c.v, value);
    c.d.classList.toggle('off', !!opts.off);
    c.d.classList.toggle('hopped', !!opts.hopped);
    c.d.classList.toggle('dim', !!opts.dim);
    c.d.classList.remove('worked');
    c.d.classList.remove('lit');
  }

  // ===== render

  function render(st) {
    var s = shows(st), V = view(st), F = st.F, H = V.H;
    var on = s.on, now = st.iter > 1;

    // y and x
    ['y', 'x'].forEach(function (name) {
      K.show(el.frame[name], on); K.show(el.unit[name], on); K.show(el.name[name], on);
      el.cells[name].forEach(function (c, i) { cellClass(c, on, String(T[name][i]), {}); });
    });
    el.idx.forEach(function (d) { K.show(d, on); });

    // w and b: one cell (the old tool) or four
    var old = s.oldOn, grown = s.widen, Pw = st.Pshown;
    ['w', 'b'].forEach(function (name) {
      var o = el.m[name], vis = on && (old || grown);
      var f = G.mframe(name, grown ? 1 : 0);
      setFrame(o.frame, f);
      o.unit.style.top = (f.bottom - G.BORDER - G.UNIT + 1) + 'px';
      K.pos(o.name, name === 'w' ? f.cx : f.cx - 28, f.bottom + 16, 'cc');
      K.show(o.frame, vis); K.show(o.unit, vis); K.show(o.name, vis);
      o.cells.forEach(function (c, j) {
        var show = vis && (grown || j === 0);
        var v = old ? st.one[name] : Pw[name][j];
        var hopped = !!H && V.which === name && V.j === j;
        if (hopped) v = H.to;
        cellClass(c, show, M.fmt(v), { hopped: hopped });
        if (show && !st.playing) K.fit(c.v, G.mcol[name].w - 10);
      });
    });
    el.mdiscs.forEach(function (d) { K.show(d, on && grown); });

    // the old diagram
    K.show(el.old.frame, old); K.show(el.old.unit, old); K.show(el.old.name, old);
    K.show(el.old.nameY, old); K.show(el.old.nameL, old);
    el.old.cells.forEach(function (c, i) { cellClass(c, old, M.fmtCell(st.one.a[i]), { off: st.one.a[i] <= 0 }); });
    ['x2a', 'w2a', 'b2a', 'a2yhat'].forEach(function (k) { K.show(el.old[k].g, old); });
    K.show(el.old.relu, old);

    // the tables A and Z
    var showA = on && s.A, showZ = on && s.Z;
    ['A', 'Z'].forEach(function (name) {
      var t = el.tab[name], vis = name === 'A' ? showA : showZ;
      setFrame(t.frame, G.tframe(name));
      K.show(t.frame, vis); K.show(t.unit, vis); K.show(t.name, vis);
      t.discs.forEach(function (d, j) {
        K.show(d, vis);
        d.classList.toggle('dim', V.lv >= (name === 'A' ? 2 : 3) && j !== V.j);
      });
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < MM; j++) {
          var c = t.cells[i][j], v = F[name][i][j], hopped = false, dim = false;
          var reach = name === 'A' ? 2 : 3;
          if (H && V.lv >= reach) {
            if (j === V.j) {
              if (H.after[name][i][j] !== F[name][i][j]) { v = H.after[name][i][j]; hopped = true; }
              else dim = true;
            } else dim = true;
          }
          cellClass(c, vis, M.fmtCell(v), { off: F.A[i][j] <= 0, hopped: hopped, dim: dim });
        }
      }
    });

    // yhat, l and lbar: the old tool's, or the swarm's
    var showY = on && (old || s.sum), showL = on && (old || s.loss), showB = on && (old || s.mean);
    ['yhat', 'l'].forEach(function (name) {
      var vis = name === 'yhat' ? showY : showL;
      K.show(el.frame[name], vis); K.show(el.unit[name], vis);
      K.show(el.name[name], vis && !old);
      el.cells[name].forEach(function (c, i) {
        var v = old ? st.one[name][i] : F[name][i], hopped = false, dim = false;
        if (H && V.lv >= 4 && !old) {
          if (H.after[name][i] !== F[name][i]) { v = H.after[name][i]; hopped = true; }
          else dim = true;
        }
        cellClass(c, vis, M.fmtCell(v), { hopped: hopped, dim: dim });
      });
    });
    el.dl.forEach(function (d, i) {
      var vis = !!H && V.lv >= 4 && V.lv <= 5 && H.after.l[i] !== F.l[i];
      K.show(d, vis);
      if (vis) setNum(d, M.fmt(H.dl[i], 2));
    });
    K.show(el.lbar, showB); K.show(el.lbarName, showB);
    var lbar = old ? st.one.lbar : (H && V.lv >= 5 ? H.after.lbar : F.lbar);
    setNum(el.lbarVal, M.fmt(lbar));
    el.lbarVal.classList.toggle('hopped', !!H && V.lv >= 5);
    if (!st.playing) K.fit(el.lbarVal, G.lbar.w - 14);

    // the arrows
    K.show(el.a.x2A.g, showA); K.show(el.a.w2A.g, showA); K.show(el.a.b2A.g, showA);
    K.show(el.a.A2Z.g, showZ); K.show(el.relu, showZ);
    K.show(el.a.Z2yhat.g, on && s.sum); K.show(el.plus, on && s.sum);
    K.show(el.a.yhat2l.g, showL); K.show(el.a.y2l.g, showL);
    K.show(el.a.l2lbar.g, showB);
    K.show(el.mean, showB && !(H && V.lv >= 4) && !GF.parts.blue.termsOn(st));

    // the worked cell of the click
    var S = stripFor(st);
    K.show(el.strip, !!S);
    if (S) {
      K.row(el.strip, S.pieces);
      K.pos(el.strip, Math.max(G.band.x, Math.min(S.cx, G.band.right - 10)), G.band.y2 - 6, S.anchor || 'cc');
      K.fit(el.strip, G.band.right - G.band.x);
      S.worked.forEach(function (c) { c.d.classList.add('worked'); });
    }
  }

  // ===== the plot: what the black clicks show in it

  function plot(st, o) {
    var s = shows(st), now = st.iter > 1;
    o.axes = s.on;
    o.points = s.on;
    o.question = s.on;
    if (s.oldOn) {
      o.old = st.one;
      o.marks = st.one.yhat;
      o.gaps = true;
      o.reading = { v: M.curve(M.params([st.one.w], [st.one.b]), T.question.x) };
      return;
    }
    if (s.bends) o.bends = st.P;
    if (s.curve) {
      o.curve = st.P;
      o.marks = st.F.yhat;
      o.reading = st.P;
    }
    if (s.loss) o.gaps = true;
  }

  // ===== the worked cell of a click (iteration 1), as pieces of a formula; `from` says where a
  // number that flies in comes from

  function stripFor(st) {
    if (st.iter !== 1 || st.part !== 'black') return null;
    var F = st.F, P = st.P, C = el.cells, Tb = el.tab, W = el.m;
    if (st.name === 'A') {
      return { cx: G.tframe('A').cx + 120, target: Tb.A.cells[0][0].v, pieces: [
        { key: 'lhs', tex: 'a_{11} = w_1\\,x_1 + b_1 ={}' },
        { key: 'w', tex: M.wrap(P.w[0]), from: W.w.cells[0].v },
        { key: 't', tex: '{}\\times{}' },
        { key: 'x', tex: M.wrap(T.x[0]), from: C.x[0].v },
        { key: 'p', tex: '{}+{}' },
        { key: 'b', tex: M.wrap(P.b[0]), from: W.b.cells[0].v },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(F.A[0][0]) }
      ], worked: [C.x[0], Tb.A.cells[0][0]] };
    }
    if (st.name === 'Z') {
      return { cx: G.tframe('Z').cx, target: Tb.Z.cells[0][0].v, pieces: [
        { key: 'lhs', tex: 'z_{11} = \\mathrm{ReLU}(a_{11}) = \\max(0,\\,' },
        { key: 'a', tex: M.fmtCell(F.A[0][0]), from: Tb.A.cells[0][0].v },
        { key: 'c', tex: ')' },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(F.Z[0][0]) }
      ], worked: [Tb.A.cells[0][0], Tb.Z.cells[0][0]] };
    }
    if (st.name === 'sum') {
      var pieces = [{ key: 'lhs', tex: '\\hat y_8 = z_{81} + z_{82} + z_{83} + z_{84} ={}' }];
      for (var j = 0; j < MM; j++) {
        if (j) pieces.push({ key: 'p' + j, tex: '{}+{}' });
        pieces.push({ key: 'z' + j, tex: M.fmtCell(F.Z[LAST][j]), from: Tb.Z.cells[LAST][j].v });
      }
      pieces.push({ key: 'eq', tex: '{}={}' }, { key: 'r', tex: M.fmtCell(F.yhat[LAST]) });
      return { cx: G.frame('yhat').cx - 90, target: C.yhat[LAST].v, pieces: pieces,
               worked: Tb.Z.cells[LAST].concat([C.yhat[LAST]]) };
    }
    if (st.name === 'loss') {
      return { cx: G.frame('l').cx - 70, target: C.l[LAST].v, pieces: [
        { key: 'lhs', tex: '\\ell_8 = (y_8 - \\hat y_8)^2 = (' },
        { key: 'y', tex: String(T.y[LAST]), from: C.y[LAST].v },
        { key: 'm', tex: '{}-{}' },
        { key: 'yh', tex: M.wrap(F.yhat[LAST], 2), from: C.yhat[LAST].v },
        { key: 'c', tex: ')^2' },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(F.l[LAST]) }
      ], worked: [C.y[LAST], C.yhat[LAST], C.l[LAST]] };
    }
    if (st.name === 'mean') {
      var ps = [{ key: 'lhs', tex: '\\bar\\ell = \\tfrac{1}{8}\\,(' }];
      for (var i = 0; i < N; i++) {
        if (i) ps.push({ key: 'p' + i, tex: '{}+{}' });
        ps.push({ key: 'l' + i, tex: M.fmtCell(F.l[i]), from: C.l[i].v });
      }
      ps.push({ key: 'c', tex: ')' }, { key: 'eq', tex: '{}={}' }, { key: 'r', tex: M.fmt(F.lbar) });
      return { cx: (G.band.x + G.band.right) / 2, target: el.lbarVal, pieces: ps, worked: [] };
    }
    return null;
  }

  // ===== animations

  // A worked cell: the numbers fly into the strip, the result appears and flies into its cell.
  function work(S, delay, then) {
    var sp = el.strip.__spans || {};
    var flights = S.pieces.filter(function (p) { return p.from; });
    flights.forEach(function (p) { K.temp(sp[p.key], 'opacity', '0'); });
    K.temp(sp.eq, 'opacity', '0');
    K.temp(sp.r, 'opacity', '0');
    K.temp(S.target, 'opacity', '0');
    var left = flights.length;
    flights.forEach(function (p, j) {
      K.wait(delay + j * 170, function () {
        K.flyTex(p.tex, K.rect(p.from), K.rect(sp[p.key]), 720, 'k-black', function () {
          sp[p.key].style.opacity = '';
          if (--left > 0) return;
          K.wait(260, function () {
            sp.eq.style.opacity = '';
            sp.r.style.opacity = '';
            K.flash(sp.r);
            K.wait(450, function () {
              K.flyTex(S.pieces[S.pieces.length - 1].tex, K.rect(sp.r), K.rect(S.target), 700, 'k-black', function () {
                S.target.style.opacity = '';
                K.flash(S.target);
                if (then) then();
              }, 21);
            });
          });
        }, 23);
      });
    });
  }

  // cells appear one after another
  function reveal(list, delay, step) {
    list.forEach(function (v, j) {
      K.temp(v, 'opacity', '0');
      K.wait(delay + j * (step || 60), function () { v.style.opacity = ''; K.flash(v); });
    });
  }

  function tableCells(name, filter) {
    var out = [];
    for (var j = 0; j < MM; j++) {
      for (var i = 0; i < N; i++) if (!filter || filter(i, j)) out.push(el.tab[name].cells[i][j].v);
    }
    return out;
  }

  function animate(st, prev) {
    var C = el.cells, Tb = el.tab, P = st.P, F = st.F;
    if (st.is('black', 'data')) {
      [el.frame.y, el.frame.x, el.unit.y, el.unit.x, el.name.y, el.name.x].forEach(function (e) { K.later(e, 0); });
      reveal(C.y.map(function (c) { return c.v; }), 250, 70);
      reveal(C.x.map(function (c) { return c.v; }), 250, 70);
      var Pl = GF.plot.el;
      K.drawArrow(Pl.axX, 500, 300);
      K.drawArrow(Pl.axY, 500, 300);
      Pl.pts.forEach(function (c, i) {
        K.temp(c, 'opacity', '0');
        K.wait(900 + i * 120, function () {
          var a = K.rect(C.y[i].d), b = K.rect(C.x[i].d);
          K.flyDot({ cx: (a.cx + b.cx) / 2, cy: a.cy }, { cx: G.px(T.x[i]), cy: G.py(T.y[i]) }, 700, 'k-black', function () {
            c.style.opacity = ''; K.pulse(c);
          });
        });
      });
      K.later(Pl.q, 2100);
      K.later(Pl.qMark, 2300);
    } else if (st.is('black', 'old')) {
      // the old diagram comes in as one picture: it is step 2's, on new days
      var parts = [el.m.w.frame, el.m.b.frame, el.m.w.unit, el.m.b.unit, el.m.w.name, el.m.b.name,
        el.old.frame, el.old.unit, el.old.name, el.frame.yhat, el.unit.yhat, el.old.nameY,
        el.frame.l, el.unit.l, el.old.nameL, el.lbar, el.lbarName, el.old.relu];
      parts.forEach(function (e, k) { K.later(e, 80 + k * 30); });
      ['x2a', 'w2a', 'b2a', 'a2yhat'].forEach(function (k, q) { K.drawArrow(el.old[k], 450, 300 + q * 120); });
      K.drawArrow(el.a.yhat2l, 300, 700);
      K.drawArrow(el.a.y2l, 600, 700);
      K.drawArrow(el.a.l2lbar, 300, 800);
      K.drawOn(GF.plot.el.old, 1100, 900);
      GF.plot.el.marks.forEach(function (m) { K.later(m, 1700); });
      GF.plot.el.gaps.forEach(function (g) { K.later(g, 1900); });
      K.later(GF.plot.el.read, 2100);
      K.later(GF.plot.el.readLab, 2100);
      K.later(GF.plot.el.readBoxes, 2100);
    } else if (st.is('black', 'widen')) {
      // the single squares w and b grow into columns of four cells
      ['w', 'b'].forEach(function (name) {
        var o = el.m[name];
        K.tween(900, function (e) {
          var f = G.mframe(name, e);
          setFrame(o.frame, f);
          o.unit.style.top = (f.bottom - G.BORDER - G.UNIT + 1) + 'px';
          K.pos(o.name, name === 'w' ? f.cx : f.cx - 28, f.bottom + 16, 'cc');
        }, K.ease.inOut);
        reveal(o.cells.map(function (c) { return c.v; }), 950, 140);
      });
      el.mdiscs.forEach(function (d, j) { K.later(d, 1000 + j * 140); });
    } else if (st.is('black', 'land')) {
      // the grasshoppers drop in, one beside every cell, w's then b's
      var k = 0;
      GF.hoppers.each(function (h, which, j) {
        var to = GF.hopper.perchPose(which, j), from = { x: to.x + (which === 'w' ? -60 : 60), y: to.y - 120, a: 0, s: to.s, f: to.f, q: 1 };
        h.setPose(from);
        K.temp(h.g, 'opacity', '0');
        (function (h, to, d) {
          K.wait(d, function () { h.g.style.opacity = ''; GF.hopper.jump(h, to, 650, 30); });
        })(h, to, 120 + (which === 'w' ? j : MM + j) * 150);
        k++;
      });
    } else if (st.is('black', 'A')) {
      // the table grows from one column, as the column a of step 2 grew into it; the first cell
      // is worked out, column 1 fills, then the other columns, each from its own row of w and b
      var t = Tb.A;
      K.tween(700, function (e) { setFrame(t.frame, G.tframe('A', 1 + (MM - 1) * e)); }, K.ease.inOut);
      t.cells.forEach(function (row) { row.forEach(function (c, j) { if (j) K.later(c.d, 650); }); });
      [t.unit, t.name].forEach(function (e) { K.later(e, 600); });
      t.discs.forEach(function (d, j) { K.later(d, 650 + j * 120); });
      K.drawArrow(el.a.x2A, 400, 300);
      K.drawArrow(el.a.w2A, 400, 300);
      K.drawArrow(el.a.b2A, 300, 450);
      var rest1 = tableCells('A', function (i, j) { return j === 0 && i > 0; });
      var rest = tableCells('A', function (i, j) { return j > 0; });
      rest1.concat(rest).forEach(function (v) { K.temp(v, 'opacity', '0'); });
      work(stripFor(st), 1100, function () {
        reveal(rest1, 200, 70);
        for (var j = 1; j < MM; j++) {
          (function (j) {
            var col = tableCells('A', function (i, q) { return q === j; });
            K.wait(900 + (j - 1) * 650, function () {
              K.flash(el.m.w.cells[j].v); K.flash(el.m.b.cells[j].v);
              reveal(col, 150, 40);
            });
          })(j);
        }
      });
    } else if (st.is('black', 'Z')) {
      var tz = Tb.Z;
      K.tween(700, function (e) { setFrame(tz.frame, G.tframe('Z', 1 + (MM - 1) * e)); }, K.ease.inOut);
      tz.cells.forEach(function (row) { row.forEach(function (c, j) { if (j) K.later(c.d, 650); }); });
      [tz.unit, tz.name].forEach(function (e) { K.later(e, 600); });
      tz.discs.forEach(function (d, j) { K.later(d, 650 + j * 120); });
      K.drawArrow(el.a.A2Z, 400, 200);
      K.later(el.relu, 400);
      var zr = tableCells('Z', function (i, j) { return i > 0 || j > 0; });
      zr.forEach(function (v) { K.temp(v, 'opacity', '0'); });
      work(stripFor(st), 1000, function () { reveal(zr, 150, 35); });
    } else if (st.is('black', 'bends')) {
      // column j of Z, drawn: each cell flies to its height on bend j
      GF.plot.el.bends.forEach(function (b, j) {
        K.drawOn(b.line, 900, 200 + j * 450);
        K.later(GF.plot.el.discs[j], 900 + j * 450);
        for (var i = 0; i < N; i++) {
          if (F.Z[i][j] <= 0) continue;
          (function (i, j) {
            K.wait(300 + j * 450 + i * 40, function () {
              K.flyDot(K.rect(Tb.Z.cells[i][j].v), { cx: G.px(T.x[i]), cy: G.py(F.Z[i][j]) }, 650, 'n' + (j + 1));
            });
          })(i, j);
        }
      });
    } else if (st.is('black', 'sum')) {
      K.drawArrow(el.a.Z2yhat, 350, 100);
      K.later(el.plus, 250);
      [el.frame.yhat, el.unit.yhat, el.name.yhat].forEach(function (e) { K.later(e, 200); });
      var ry = C.yhat.map(function (c) { return c.v; }).filter(function (v, i) { return i !== LAST; });
      ry.forEach(function (v) { K.temp(v, 'opacity', '0'); });
      work(stripFor(st), 600, function () {
        // the other rows: each row of Z flows into its cell of yhat
        ry.forEach(function (v, q) {
          K.wait(150 + q * 110, function () {
            K.flyTex(M.fmtCell(F.yhat[q]), K.rect(Tb.Z.cells[q][0].v), K.rect(v), 520, 'k-black', function () {
              v.style.opacity = ''; K.flash(v);
            }, 19);
          });
        });
      });
    } else if (st.is('black', 'curve')) {
      var Pl2 = GF.plot.el;
      K.drawOn(Pl2.curve, 1100, 0);
      K.drawOn(Pl2.ahead, 500, 1100);
      Pl2.marks.forEach(function (m, i) {
        K.temp(m, 'opacity', '0');
        K.wait(1000 + i * 110, function () {
          K.flyTex(M.fmtCell(F.yhat[i]), K.rect(C.yhat[i].v), { cx: G.px(T.x[i]), cy: G.py(F.yhat[i]) }, 650, 'k-black', function () {
            m.style.opacity = ''; K.pulse(m);
          }, 18);
        });
      });
      [Pl2.read, Pl2.readLab, Pl2.readBoxes].forEach(function (e) { K.later(e, 2100); });
      K.wait(2150, function () { K.pulse(Pl2.read); });
    } else if (st.is('black', 'loss')) {
      K.drawArrow(el.a.yhat2l, 300, 0);
      K.drawArrow(el.a.y2l, 700, 0);
      [el.frame.l, el.unit.l, el.name.l].forEach(function (e) { K.later(e, 250); });
      var gaps = GF.plot.el.gaps;
      gaps.forEach(function (g) { K.temp(g, 'opacity', '0'); });
      var rl = C.l.map(function (c) { return c.v; }).filter(function (v, i) { return i !== LAST; });
      rl.forEach(function (v) { K.temp(v, 'opacity', '0'); });
      K.wait(600, function () { gaps[LAST].style.opacity = ''; K.drawOn(gaps[LAST], 400, 0); });
      work(stripFor(st), 700, function () {
        rl.forEach(function (v, q) {
          K.wait(200 + q * 90, function () {
            v.style.opacity = ''; K.flash(v);
            gaps[q].style.opacity = ''; K.drawOn(gaps[q], 350, 0);
          });
        });
      });
    } else if (st.is('black', 'mean')) {
      K.drawArrow(el.a.l2lbar, 400, 0);
      K.later(el.mean, 300);
      K.later(el.lbar, 200);
      K.later(el.lbarName, 400);
      var S4 = stripFor(st), sp = el.strip.__spans || {};
      S4.pieces.forEach(function (p) { if (p.key !== 'lhs' && p.key !== 'c') K.temp(sp[p.key], 'opacity', '0'); });
      K.temp(sp.c, 'opacity', '0');
      K.temp(el.lbarVal, 'opacity', '0');
      for (var j = 0; j < N; j++) {
        (function (j) {
          K.wait(500 + j * 220, function () {
            K.flyTex(M.fmtCell(F.l[j]), K.rect(C.l[j].v), K.rect(sp['l' + j]), 650, 'k-black', function () {
              sp['l' + j].style.opacity = '';
              if (j) sp['p' + j].style.opacity = '';
              if (j === N - 1) {
                sp.c.style.opacity = '';
                K.wait(300, function () {
                  sp.eq.style.opacity = ''; sp.r.style.opacity = ''; K.flash(sp.r);
                  K.wait(500, function () {
                    K.flyTex(M.fmt(F.lbar), K.rect(sp.r), K.rect(el.lbarVal), 750, 'k-black', function () {
                      el.lbarVal.style.opacity = ''; K.flash(el.lbarVal);
                    }, 26);
                  });
                });
              }
            }, 20);
          });
        })(j);
      }
    } else if (st.is('black', 'recompute')) {
      flow(320);
    } else if (st.is('black', 'jump')) {
      // speed 3: every grasshopper jumps onto its new number, the plot glides from the numbers of
      // the iteration before, and the new numbers flow on, faster than at recompute
      var before = st.R.ps[st.iter - 2];
      for (var j = 0; j < MM; j++) {
        ['w', 'b'].forEach(function (which) {
          var h = GF.hopper.swarm[which][j];
          K.flash(el.m[which].cells[j].v, 0);
          GF.hopper.jump(h, GF.hopper.perchPose(which, j), 380, 20);
        });
      }
      if (before) GF.parts.purple.glide(st, before, st.P, 0, 650);
      flow(170);
    }
  }

  // the new numbers run through the tables and columns, left to right, a wave every ms
  function flow(ms) {
    var C = el.cells;
    var waves = [tableCells('A'), tableCells('Z'), C.yhat.map(function (c) { return c.v; }), C.l.map(function (c) { return c.v; })];
    waves.forEach(function (list, w) {
      list.forEach(function (v, q) {
        K.temp(v, 'opacity', '0.25');
        K.wait(w * ms + (q % N) * ms / 13, function () { v.style.opacity = ''; });
      });
    });
    K.temp(el.lbarVal, 'opacity', '0.25');
    K.wait(4 * ms + 80, function () { el.lbarVal.style.opacity = ''; K.flash(el.lbarVal); });
    GF.plot.el.gaps.forEach(function (g) { K.later(g, 4 * ms); });
    GF.plot.el.marks.forEach(function (m) { K.later(m, 3 * ms); });
  }

  GF.parts.black = {
    steps: function (iter, ctx) {
      if (iter === 1) return STEPS1.slice();
      return ctx && ctx.mode === 3 ? ['jump'] : ['recompute'];
    },
    build: build, render: render, plot: plot, animate: animate,
    el: el, shows: shows, setNum: setNum, tableCells: tableCells
  };
})();
