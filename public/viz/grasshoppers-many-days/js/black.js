/* black.js: the black part, the data and the model on every day, as GF.parts.black.
 *
 * Iteration 1, one click each:
 *   day     the one-day picture of step 1 (day 3): y = 40, x = 5, w = -1, b = 60, a = 55,
 *           yhat = 55, l = 225, every box a single number
 *   days    every box of one number per day grows into a column of eight cells, day 3 in the third
 *           row; y and x fill with the eight days; w and b stay single numbers
 *   plot    each row becomes a point of the plot of y against x
 *   a       the column a = w x + b: day 1 worked out in full, day 2 faster, the rest at once
 *   relu    the column yhat = ReLU(a), the same way
 *   line    the hinge line of (w, b) in the plot; each cell of yhat flies to its height on the line
 *   loss    the column l = (y - yhat)^2, the same way, and the gaps in the plot
 *   mean    the column l folds into one number, its average lbar
 * Iteration 2 on, one click:
 *   recompute   the new w and b flow through every column, lbar and the plot
 *
 * While a grasshopper stands hopped (the blue part says which), the columns a, yhat and l and the
 * box of lbar show the forward pass at the hopped numbers, in blue wherever a cell changed.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var COLS = ['y', 'x', 'a', 'yhat', 'l'];
  var UNITS = { y: 'kWh', x: '\u00b0C', a: 'kWh', yhat: 'kWh', l: '' };
  var NAMES = { y: 'y', x: 'x', a: 'a = w\\,x + b', yhat: '\\hat y = \\mathrm{ReLU}(a)', l: '\\ell = (y - \\hat y)^2' };
  var el = { frame: {}, unit: {}, name: {}, cells: {}, a: {}, idx: [] };
  var growth = 1;

  // ===== build

  function makeBox(layer, name, unit) {
    var b = G.box[name];
    var box = K.div('box vis', layer);
    box.style.left = b.x + 'px';
    box.style.top = b.y + 'px';
    box.style.width = b.w + 'px';
    box.style.height = b.h + 'px';
    var o = { box: box };
    o.val = K.div('val', box);
    o.unit = K.div('unit', box);
    o.unit.textContent = unit || '';
    return o;
  }

  function lab(layer, tex, x, y, anchor, cls) {
    var d = K.div('lab vis ' + (cls || ''), layer);
    K.tex(d, tex);
    K.pos(d, x, y, anchor);
    return d;
  }

  function build(layer) {
    COLS.forEach(function (name) {
      el.frame[name] = K.div('col vis', layer.mid);
      el.cells[name] = [];
      for (var i = 0; i < M.N; i++) {
        var c = G.cell(name, i);
        var d = K.div('cell vis', layer.mid);
        d.style.left = c.x + 'px';
        d.style.top = c.y + 'px';
        d.style.width = c.w + 'px';
        d.style.height = c.h + 'px';
        var v = K.div('v vis', d, 'span');
        el.cells[name].push({ d: d, v: v });
      }
      el.unit[name] = K.div('col-unit vis', layer.mid);
      el.unit[name].textContent = UNITS[name];
      el.unit[name].style.width = G.col[name].w + 'px';
      el.name[name] = K.div('lab col-name vis', layer.mid);
      K.tex(el.name[name], NAMES[name]);
    });
    for (var i = 0; i < M.N; i++) {
      var d = K.div('day-index vis', layer.mid);
      d.textContent = String(i + 1);
      K.pos(d, G.col.y.x - 8, G.cell('y', i).cy, 'cr');
      el.idx.push(d);
    }

    el.w = makeBox(layer.mid, 'w', 'kWh per \u00b0C');
    el.b = makeBox(layer.mid, 'b', 'kWh');
    el.lbar = makeBox(layer.mid, 'lbar', '');
    el.lab = {
      w: lab(layer.mid, 'w', G.box.w.x - 12, G.box.w.y + G.box.w.h / 2, 'cr', 'name'),
      b: lab(layer.mid, 'b', G.box.b.x + G.box.b.w + 12, G.box.b.y + G.box.b.h / 2, 'cl', 'name'),
      lbar: lab(layer.mid, '\\bar\\ell', G.box.lbar.x + G.box.lbar.w / 2, G.box.lbar.y + G.box.lbar.h + 26, 'cc', 'name')
    };
    el.relu = lab(layer.mid, '\\mathrm{ReLU}', 0, 0, 'bc', 'op');

    // the small plot of the ReLU on its arrow: flat, then rising, and a dot for each day whose
    // yhat is known, at (a, ReLU(a))
    var R = G.relu;
    el.card = K.svg('g', null, layer.back, 'relu vis');
    K.svg('rect', { x: 0, y: 0, width: R.w, height: R.h, rx: 8 }, el.card, 'relu-bg');
    K.arrow(el.card, [[6, R.oy], [R.w - 4, R.oy]], 'axis on', { size: 9 });
    K.arrow(el.card, [[R.ox, R.oy + 5], [R.ox, 6]], 'axis on', { size: 9 });
    K.svg('path', { d: 'M 8 ' + R.oy + ' L ' + R.ox + ' ' + R.oy + ' L ' + (R.ox + R.half) + ' ' + (R.oy - R.half) },
      el.card, 'relu-curve');
    el.dots = [];
    for (var j = 0; j < M.N; j++) el.dots.push(K.svg('circle', { r: 4.2 }, el.card, 'relu-dot vis'));
    el.mean = lab(layer.mid, '\\tfrac{1}{8}\\textstyle\\sum', G.meanAt()[0], G.meanAt()[1], 'bc', 'op');

    var R = G.routes(1);
    el.a.x2a = K.arrow(layer.back, R.x2a, 'k-black');
    el.a.w2a = K.arrow(layer.back, R.w2a, 'k-black', { noHead: true });
    el.a.b2a = K.arrow(layer.back, R.b2a, 'k-black');
    el.a.a2yhat = K.arrow(layer.back, R.a2yhat, 'k-black');
    el.a.yhat2l = K.arrow(layer.back, R.yhat2l, 'k-black');
    el.a.l2lbar = K.arrow(layer.back, R.l2lbar, 'k-black');
    el.a.y2l = K.arrow(layer.back, R.y2l, 'k-black');

    // the worked cell of a click, in the band
    el.strip = K.div('lab strip vis', layer.mid);

    GF.plot.build(layer);
  }

  // Place the frames, units, names and arrows for growth t (0: day 3 alone, 1: eight days).
  function setGrowth(t) {
    growth = t;
    COLS.forEach(function (name) {
      var f = G.frame(name, t), fr = el.frame[name];
      fr.style.left = f.x + 'px';
      fr.style.top = f.y + 'px';
      fr.style.width = f.w + 'px';
      fr.style.height = f.h + 'px';
      var u = el.unit[name];
      u.style.left = f.x + 'px';
      u.style.top = (f.bottom - G.BORDER - G.UNIT + 1) + 'px';
      var na = G.nameAt(name, t);
      K.pos(el.name[name], na[0], na[1], na[2]);
    });
    var R = G.routes(t);
    ['x2a', 'w2a', 'b2a', 'a2yhat', 'yhat2l', 'y2l'].forEach(function (k) { K.setArrow(el.a[k], R[k]); });
    var ra = G.reluAt(t);
    K.pos(el.relu, ra[0], ra[1], 'bc');
    el.card.setAttribute('transform', 'translate(' + G.relu.x + ',' + G.reluCardY(t).toFixed(1) + ')');
  }

  // The dots on the small ReLU: one per day whose yhat is known, at (a, ReLU(a)), a kept inside
  // the card's range.
  function placeDots(f, known) {
    var R = G.relu;
    el.dots.forEach(function (d, i) {
      var a = Math.max(-R.A, Math.min(R.A, f.a[i]));
      d.setAttribute('cx', (R.ox + a / R.A * R.half).toFixed(1));
      d.setAttribute('cy', (R.oy - M.relu(a) / R.A * R.half).toFixed(1));
      K.show(d, known[i]);
    });
  }

  // ===== what a state shows

  function shows(st) {
    var later = st.iter > 1;
    function R(n) { return later || st.reached('black', n); }
    return { day: R('day'), grown: R('days'), plot: R('plot'), a: R('a'), relu: R('relu'),
             line: R('line'), loss: R('loss'), mean: R('mean') };
  }

  // Is the value of cell (name, i) known in this state?
  function known(s, name, i) {
    if (!s.day) return false;
    if (i === M.DAY) return true;
    if (name === 'y' || name === 'x') return s.grown;
    if (name === 'a') return s.a;
    if (name === 'yhat') return s.relu;
    return s.loss;
  }

  // The forward pass the columns show: at the hopped numbers while a grasshopper stands hopped.
  function hopNow(st) {
    var h = GF.parts.blue.hopped(st);
    return h === 'w' ? st.hw : h === 'b' ? st.hb : null;
  }

  function cellValue(name, i, f) {
    if (name === 'y') return M.Y[i];
    if (name === 'x') return M.X[i];
    return f[name][i];
  }

  // The worked cell of the click (iteration 1), as pieces of a formula; sources say where the
  // numbers that fly in come from.
  function stripFor(st) {
    if (st.iter !== 1 || st.part !== 'black') return null;
    var f = st.f, w = st.w, b = st.b, i = 0, C = el.cells;
    if (st.name === 'a') {
      return { cx: G.cell('a', 0).cx, target: C.a[i].v, key: 'r', pieces: [
        { key: 'lhs', tex: 'a = w\\,x + b ={}' },
        { key: 'w', tex: M.wrap(w), from: el.w.val },
        { key: 't', tex: '{}\\times{}' },
        { key: 'x', tex: M.wrap(M.X[i]), from: C.x[i].v },
        { key: 'p', tex: '{}+{}' },
        { key: 'b', tex: M.wrap(b), from: el.b.val },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(f.a[i]) }
      ], worked: [C.x[i], C.a[i]] };
    }
    if (st.name === 'relu') {
      return { cx: G.cell('yhat', 0).cx, target: C.yhat[i].v, key: 'r', pieces: [
        { key: 'lhs', tex: '\\hat y = \\mathrm{ReLU}(a) = \\max(0,\\,' },
        { key: 'a', tex: M.fmtCell(f.a[i]), from: C.a[i].v },
        { key: 'c', tex: ')' },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(f.yhat[i]) }
      ], worked: [C.a[i], C.yhat[i]] };
    }
    if (st.name === 'loss') {
      return { cx: G.cell('l', 0).cx, target: C.l[i].v, key: 'r', pieces: [
        { key: 'lhs', tex: '\\ell = (y - \\hat y)^2 = (' },
        { key: 'y', tex: String(M.Y[i]), from: C.y[i].v },
        { key: 'm', tex: '{}-{}' },
        { key: 'yh', tex: M.wrap(f.yhat[i], 2), from: C.yhat[i].v },
        { key: 'c', tex: ')^2' },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(f.l[i]) }
      ], worked: [C.y[i], C.yhat[i], C.l[i]] };
    }
    if (st.name === 'mean') {
      var pieces = [{ key: 'lhs', tex: '\\bar\\ell = \\tfrac{1}{8}\\,(' }];
      for (var j = 0; j < M.N; j++) {
        if (j) pieces.push({ key: 'p' + j, tex: '{}+{}' });
        pieces.push({ key: 'l' + j, tex: M.fmtCell(f.l[j]), from: C.l[j].v });
      }
      pieces.push({ key: 'c', tex: ')' }, { key: 'eq', tex: '{}={}' }, { key: 'r', tex: M.fmt(f.lbar) });
      return { cx: 640, target: el.lbar.val, key: 'r', pieces: pieces, worked: [] };
    }
    return null;
  }

  // ===== render

  function render(st) {
    var s = shows(st), H = hopNow(st), f = H ? H.to : st.f;
    setGrowth(s.grown ? 1 : 0);

    COLS.forEach(function (name) {
      K.show(el.frame[name], s.day);
      K.show(el.unit[name], s.day);
      K.show(el.name[name], s.day);
      el.cells[name].forEach(function (c, i) {
        var on = s.day && (s.grown || i === M.DAY);
        K.show(c.d, on);
        c.d.classList.toggle('sep', s.grown && i > 0);
        c.d.classList.toggle('day3', i === M.DAY && st.iter === 1 && st.is('black', 'days'));
        var kn = known(s, name, i);
        K.show(c.v, kn);
        if (kn) {
          var txt = M.fmtCell(cellValue(name, i, f));
          K.tex(c.v, txt);
          if (txt.length >= 8) K.fit(c.v, G.col[name].w - 8);
          else c.v.style.fontSize = '';
        }
        var flatDay = (name === 'a' || name === 'yhat') && kn && f.a[i] <= 0;
        c.d.classList.toggle('flat', flatDay);
        var changed = !!H && kn && (name === 'a' || name === 'yhat' || name === 'l') &&
          cellValue(name, i, H.to) !== cellValue(name, i, H.from);
        c.d.classList.toggle('hopped', changed);
        c.d.classList.remove('worked');
      });
    });
    el.idx.forEach(function (d) { K.show(d, s.grown); });

    // the single numbers: w and b (the hopped one in blue), lbar
    K.show(el.w.box, s.day); K.show(el.lab.w, s.day);
    K.show(el.b.box, s.day); K.show(el.lab.b, s.day);
    var hw = H && H.which === 'w', hb = H && H.which === 'b';
    K.tex(el.w.val, M.fmt(hw ? st.w + st.eps : st.wShown));
    K.tex(el.b.val, M.fmt(hb ? st.b + st.eps : st.bShown));
    el.w.val.classList.toggle('hopped', !!hw);
    el.b.val.classList.toggle('hopped', !!hb);
    K.show(el.lbar.box, s.mean); K.show(el.lab.lbar, s.mean);
    K.tex(el.lbar.val, M.fmt(f.lbar));
    el.lbar.val.classList.toggle('hopped', !!H);
    ['w', 'b', 'lbar'].forEach(function (n) { K.fit(el[n].val, G.box[n].w - 14); });

    // the arrows and the operations on them
    ['x2a', 'w2a', 'b2a', 'a2yhat', 'yhat2l', 'y2l'].forEach(function (k) { K.show(el.a[k].g, s.day); });
    K.show(el.relu, s.day);
    K.show(el.card, s.day);
    placeDots(f, el.cells.yhat.map(function (c, i) { return known(s, 'yhat', i); }));
    K.show(el.a.l2lbar.g, s.mean);
    K.show(el.mean, s.mean);

    // the worked cell of the click
    var S = stripFor(st);
    K.show(el.strip, !!S);
    if (S) {
      K.row(el.strip, S.pieces);
      K.pos(el.strip, S.cx, G.band.strip, 'cc');
      K.fit(el.strip, 900);
      S.worked.forEach(function (c) { c.d.classList.add('worked'); });
    }

    // the plot: the points from its click on, the line of (w, b), its marks, the gaps
    var trail = [];
    for (var k = Math.max(0, st.ws.length - 1 - GF.plot.TRAIL); k < st.ws.length - 1; k++) trail.push([st.ws[k], st.bs[k]]);
    GF.plot.render({ axes: s.plot, points: s.plot, line: s.line, marks: s.line, gaps: s.loss,
                     w: st.w, b: st.b, trail: trail });
  }

  // Write a forward pass f into the columns a, yhat, l and the box of lbar, marking in blue the
  // cells that differ from base (when given): the blue part's hops use it to switch the cells over.
  // names: the columns and boxes to write (default all of a, yhat, l and lbar).
  function paint(f, base, names) {
    names = names || ['a', 'yhat', 'l', 'lbar'];
    names.forEach(function (name) {
      if (name === 'lbar') {
        K.tex(el.lbar.val, M.fmt(f.lbar));
        el.lbar.val.classList.toggle('hopped', !!base);
        K.fit(el.lbar.val, G.box.lbar.w - 14);
        return;
      }
      el.cells[name].forEach(function (c, i) {
        var txt = M.fmtCell(f[name][i]);
        K.tex(c.v, txt);
        if (txt.length >= 8) K.fit(c.v, G.col[name].w - 8);
        else c.v.style.fontSize = '';
        c.d.classList.toggle('hopped', !!base && f[name][i] !== base[name][i]);
        c.d.classList.toggle('flat', name !== 'l' && f.a[i] <= 0);
      });
    });
  }

  // Write a number into the box of w or b, in blue while its grasshopper stands hopped.
  function paintBox(name, v, hopped) {
    K.tex(el[name].val, M.fmt(v));
    el[name].val.classList.toggle('hopped', !!hopped);
    K.fit(el[name].val, G.box[name].w - 14);
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

  // Numbers fly from sources straight into one cell, which then shows its value.
  function direct(sources, target, delay, then) {
    K.temp(target, 'opacity', '0');
    var left = sources.length;
    sources.forEach(function (s, j) {
      K.wait(delay + j * 110, function () {
        K.flyTex(s.tex, K.rect(s.from), K.rect(target), 520, 'k-black', function () {
          if (--left > 0) return;
          target.style.opacity = '';
          K.flash(target);
          if (then) then();
        }, 19);
      });
    });
  }

  // The remaining cells of a column appear one after another, top to bottom.
  function rest(name, rows, delay, step) {
    rows.forEach(function (i, j) {
      var v = el.cells[name][i].v;
      K.temp(v, 'opacity', '0');
      K.wait(delay + j * (step || 70), function () { v.style.opacity = ''; K.flash(v); });
    });
  }

  var OTHERS = [0, 1, 3, 4, 5, 6, 7].filter(function (i) { return i !== M.DAY; });
  var REST = OTHERS.filter(function (i) { return i > 1; });

  function animate(st, prev) {
    var C = el.cells, f = st.f, P = GF.plot.el;
    if (st.is('black', 'day')) {
      // the data first, then w and b, then the boxes the model computes, left to right
      var at = { y: 0, x: 0, a: 650, yhat: 900, l: 1150 };
      COLS.forEach(function (name) {
        [el.frame[name], el.cells[name][M.DAY].d, el.unit[name], el.name[name]].forEach(function (e) { K.later(e, at[name]); });
      });
      [el.w.box, el.b.box, el.lab.w, el.lab.b, GF.hopper.w.g, GF.hopper.b.g].forEach(function (e) { K.later(e, 300); });
      K.later(el.relu, 900);
      K.later(el.card, 900);
      K.drawArrow(el.a.x2a, 350, 450);
      K.drawArrow(el.a.w2a, 350, 450);
      K.drawArrow(el.a.b2a, 300, 500);
      K.drawArrow(el.a.a2yhat, 300, 750);
      K.drawArrow(el.a.yhat2l, 300, 1000);
      K.drawArrow(el.a.y2l, 600, 1000);
    } else if (st.is('black', 'days')) {
      // every box of one number per day grows into a column; then the eight days fill y and x
      setGrowth(0);
      COLS.forEach(function (name) {
        el.cells[name].forEach(function (c, i) {
          if (i !== M.DAY) { K.temp(c.d, 'opacity', '0'); }
        });
      });
      rest('y', OTHERS, 1000, 60);
      rest('x', OTHERS, 1000, 60);
      K.tween(850, function (e) { setGrowth(e); }, K.ease.inOut, function () {
        COLS.forEach(function (name) {
          el.cells[name].forEach(function (c, i) { if (i !== M.DAY) c.d.style.opacity = ''; });
        });
      });
      el.idx.forEach(function (d, i) { K.later(d, 1000 + i * 60); });
    } else if (st.is('black', 'plot')) {
      K.drawArrow(P.axX, 500, 0);
      K.drawArrow(P.axY, 500, 0);
      P.pts.forEach(function (c, i) {
        K.temp(c, 'opacity', '0');
        K.wait(500 + i * 110, function () {
          var from = K.rect(C.y[i].d), to = { cx: G.px(M.X[i]), cy: G.py(M.Y[i]) };
          from = { cx: (from.cx + K.rect(C.x[i].d).cx) / 2, cy: from.cy };
          K.flyDot(from, to, 750, 'k-black', function () { c.style.opacity = ''; K.pulse(c); });
        });
      });
    } else if (st.is('black', 'a')) {
      var S = stripFor(st);
      REST.forEach(function (i) { K.temp(C.a[i].v, 'opacity', '0'); });
      K.temp(C.a[1].v, 'opacity', '0');
      work(S, 250, function () {
        direct([{ tex: M.wrap(st.w), from: el.w.val }, { tex: M.wrap(M.X[1]), from: C.x[1].v },
                { tex: M.wrap(st.b), from: el.b.val }], C.a[1].v, 200, function () {
          REST.forEach(function (i, j) {
            K.wait(250 + j * 80, function () { C.a[i].v.style.opacity = ''; K.flash(C.a[i].v); });
          });
        });
      });
    } else if (st.is('black', 'relu')) {
      var S2 = stripFor(st);
      REST.forEach(function (i) { K.temp(C.yhat[i].v, 'opacity', '0'); });
      K.temp(C.yhat[1].v, 'opacity', '0');
      work(S2, 250, function () {
        direct([{ tex: M.fmtCell(f.a[1]), from: C.a[1].v }], C.yhat[1].v, 200, function () {
          REST.forEach(function (i, j) {
            K.wait(200 + j * 70, function () {
              K.flyTex(M.fmtCell(f.a[i]), K.rect(C.a[i].v), K.rect(C.yhat[i].v), 520, 'k-black', function () {
                C.yhat[i].v.style.opacity = ''; K.flash(C.yhat[i].v);
              }, 19);
            });
          });
        });
      });
    } else if (st.is('black', 'line')) {
      K.drawOn(P.line, 900, 0);
      P.marks.forEach(function (m, i) {
        K.temp(m, 'opacity', '0');
        K.wait(1000 + i * 120, function () {
          K.flyTex(M.fmtCell(f.yhat[i]), K.rect(C.yhat[i].v), { cx: G.px(M.X[i]), cy: G.py(f.yhat[i]) }, 700, 'k-black', function () {
            m.style.opacity = ''; K.pulse(m);
          }, 18);
        });
      });
    } else if (st.is('black', 'loss')) {
      var S3 = stripFor(st);
      REST.forEach(function (i) { K.temp(C.l[i].v, 'opacity', '0'); });
      K.temp(C.l[1].v, 'opacity', '0');
      P.gaps.forEach(function (g) { K.temp(g, 'opacity', '0'); });
      var gap = function (i, d) { K.wait(d, function () { P.gaps[i].style.opacity = ''; K.drawOn(P.gaps[i], 450, 0); }); };
      gap(M.DAY, 200);
      work(S3, 250, function () {
        gap(0, 0);
        direct([{ tex: String(M.Y[1]), from: C.y[1].v }, { tex: M.wrap(f.yhat[1], 2), from: C.yhat[1].v }], C.l[1].v, 200, function () {
          gap(1, 0);
          REST.forEach(function (i, j) {
            K.wait(250 + j * 90, function () { C.l[i].v.style.opacity = ''; K.flash(C.l[i].v); gap(i, 0); });
          });
        });
      });
    } else if (st.is('black', 'mean')) {
      K.drawArrow(el.a.l2lbar, 450, 0);
      K.later(el.mean, 300);
      K.later(el.lbar.box, 200);
      K.later(el.lab.lbar, 400);
      var S4 = stripFor(st), sp = el.strip.__spans || {};
      S4.pieces.forEach(function (p) { if (p.key !== 'lhs' && p.key !== 'c') K.temp(sp[p.key], 'opacity', '0'); });
      K.temp(sp.c, 'opacity', '0');
      K.temp(el.lbar.val, 'opacity', '0');
      for (var j = 0; j < M.N; j++) {
        (function (j) {
          K.wait(500 + j * 230, function () {
            K.flyTex(M.fmtCell(f.l[j]), K.rect(C.l[j].v), K.rect(sp['l' + j]), 700, 'k-black', function () {
              sp['l' + j].style.opacity = '';
              if (j) sp['p' + j].style.opacity = '';
              if (j === M.N - 1) {
                sp.c.style.opacity = '';
                K.wait(350, function () {
                  sp.eq.style.opacity = ''; sp.r.style.opacity = ''; K.flash(sp.r);
                  K.wait(550, function () {
                    K.flyTex(M.fmt(f.lbar), K.rect(sp.r), K.rect(el.lbar.val), 800, 'k-black', function () {
                      el.lbar.val.style.opacity = ''; K.flash(el.lbar.val);
                    }, 26);
                  });
                });
              }
            }, 21);
          });
        })(j);
      }
    } else if (st.is('black', 'recompute')) {
      // the new numbers run through the columns, left to right, while the line moves to them
      ['a', 'yhat', 'l'].forEach(function (name, c) {
        el.cells[name].forEach(function (cell, i) {
          K.temp(cell.v, 'opacity', '0.25');
          K.wait(c * 380 + i * 35, function () { cell.v.style.opacity = ''; K.flash(cell.v); });
        });
      });
      K.temp(el.lbar.val, 'opacity', '0.25');
      K.wait(3 * 380 + 100, function () { el.lbar.val.style.opacity = ''; K.flash(el.lbar.val); });
      if (prev && st.iter === prev.iter + 1) {
        var w0 = prev.w, b0 = prev.b, w1 = st.w, b1 = st.b, tr = [];
        for (var k = Math.max(0, st.ws.length - 1 - GF.plot.TRAIL); k < st.ws.length - 1; k++) tr.push([st.ws[k], st.bs[k]]);
        K.tween(900, function (e) {
          GF.plot.render({ axes: true, points: true, line: true, marks: true, gaps: true,
                           w: w0 + (w1 - w0) * e, b: b0 + (b1 - b0) * e, trail: e < 1 ? tr.slice(0, -1) : tr });
        }, K.ease.inOut);
      }
    }
  }

  GF.parts.black = {
    steps: function (iter) {
      return iter === 1 ? ['day', 'days', 'plot', 'a', 'relu', 'line', 'loss', 'mean'] : ['recompute'];
    },
    build: build, render: render, animate: animate,
    el: el, shows: shows, paint: paint, paintBox: paintBox
  };
})();
