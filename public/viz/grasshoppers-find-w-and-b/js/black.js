/* black.js: the black part, the six days and the model, as GF.parts.black.
 *
 * Iteration 1, one click each:
 *   days    the columns y and x, one cell per day, filled with the six days; each row flies out as a
 *           point of the plot of y against x
 *   a       the column a, empty, the arrow from x, the name a = w x + b
 *   w       the box of w with a question mark, its arrow into a, its grasshopper
 *   b       the box of b with a question mark, its line joining w's arrow, a second grasshopper
 *   relu    the column yhat, empty, the arrow from a carrying a small plot of the ReLU
 *   guess   the boxes of w and b take the numbers typed by the room (Enter goes from w to b; Enter
 *           or Next keeps them; an empty field gives -1 or 60; a start the run cannot use is refused)
 *   aval    the column a: day 1 worked out in the band, day 2 straight into its cell, the rest
 *   yval    the column yhat = ReLU(a), the same way, a dot per day on the small ReLU; then the hinge
 *           of (w, b) in the plot, and each cell of yhat flies to its mark on it
 *   loss    the column l = (y - yhat)^2, the same way, and the gaps in the plot
 *   mean    the six losses fold into one number, their average lbar
 * Iteration 2 on, one click:
 *   recompute   the new pair flows through every column and lbar; the hinge moves to it
 *
 * While a grasshopper tests its hop (st.hop), its box shows its number plus eps in blue, and with
 * st.hop.fwd the columns a, yhat and l and the box of lbar show the forward pass of the hop, in
 * blue wherever a cell changed. The plot shows whenever the grounds do not (js/ground.js).
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var DEG = String.fromCharCode(176);
  var COLS = ['y', 'x', 'a', 'yhat', 'l'];
  var UNITS = { y: 'kWh', x: DEG + 'C', a: 'kWh', yhat: 'kWh', l: '' };
  var NAMES = { y: 'y', x: 'x', a: 'a = w\\,x + b', yhat: '\\hat y = \\mathrm{ReLU}(a)', l: '\\ell = (y - \\hat y)^2' };
  var el = { frame: {}, unit: {}, name: {}, cells: {}, arr: {}, in: {}, idx: [], dots: [] };

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

  function field(box, who, aria) {
    var f = K.div('num-input', box.box, 'input');
    f.type = 'text';
    f.setAttribute('inputmode', 'decimal');
    f.setAttribute('autocomplete', 'off');
    f.setAttribute('spellcheck', 'false');
    f.setAttribute('maxlength', '9');
    f.setAttribute('placeholder', '?');
    f.setAttribute('aria-label', aria);
    f.setAttribute('data-who', who);
    return f;
  }

  function build(layer) {
    COLS.forEach(function (name) {
      var f = G.frame(name);
      var fr = el.frame[name] = K.div('col vis', layer.mid);
      fr.style.left = f.x + 'px';
      fr.style.top = f.y + 'px';
      fr.style.width = f.w + 'px';
      fr.style.height = f.h + 'px';
      el.cells[name] = [];
      for (var i = 0; i < M.N; i++) {
        var c = G.cell(name, i);
        var d = K.div('cell vis' + (i > 0 ? ' sep' : ''), layer.mid);
        d.style.left = c.x + 'px';
        d.style.top = c.y + 'px';
        d.style.width = c.w + 'px';
        d.style.height = c.h + 'px';
        var v = K.div('v vis', d, 'span');
        el.cells[name].push({ d: d, v: v });
      }
      var u = el.unit[name] = K.div('col-unit vis', layer.mid);
      u.textContent = UNITS[name];
      u.style.width = f.w + 'px';
      u.style.left = f.x + 'px';
      u.style.top = (f.bottom - G.BORDER - G.UNIT + 1) + 'px';
      var na = G.nameAt(name);
      el.name[name] = lab(layer.mid, NAMES[name], na[0], na[1], na[2], 'col-name');
    });
    for (var i = 0; i < M.N; i++) {
      var d = K.div('day-index vis', layer.mid);
      d.textContent = String(i + 1);
      K.pos(d, G.col.y.x - 8, G.cell('y', i).cy, 'cr');
      el.idx.push(d);
    }

    el.w = makeBox(layer.mid, 'w', 'kWh per ' + DEG + 'C');
    el.b = makeBox(layer.mid, 'b', 'kWh');
    el.lbar = makeBox(layer.mid, 'lbar', '');
    el.in.w = field(el.w, 'w', 'The start of w, in kWh per degree C');
    el.in.b = field(el.b, 'b', 'The start of b, in kWh');
    var W = G.edges('w'), B = G.edges('b'), L = G.edges('lbar');
    el.lab = {
      w: lab(layer.mid, 'w', W.left - 12, W.cy, 'cr', 'name'),
      b: lab(layer.mid, 'b', B.right + 12, B.cy, 'cl', 'name'),
      lbar: lab(layer.mid, '\\bar\\ell', L.cx, L.bottom + 26, 'cc', 'name')
    };
    var ra = G.reluAt();
    el.reluWord = lab(layer.mid, '\\mathrm{ReLU}', ra[0], ra[1], 'bc', 'op');
    var ma = G.meanAt();
    el.mean = lab(layer.mid, '\\tfrac{1}{6}\\textstyle\\sum', ma[0], ma[1], 'bc', 'op');

    // the small plot of the ReLU on its arrow: flat, then rising, and a dot for each day whose
    // yhat is known, at (a, ReLU(a))
    var R = G.relu;
    el.card = K.svg('g', { transform: 'translate(' + R.x + ',' + G.reluCardY() + ')' }, layer.back, 'relu vis');
    K.svg('rect', { x: 0, y: 0, width: R.w, height: R.h, rx: 8 }, el.card, 'relu-bg');
    K.arrow(el.card, [[6, R.oy], [R.w - 4, R.oy]], 'axis on', { size: 9 });
    K.arrow(el.card, [[R.ox, R.oy + 5], [R.ox, 6]], 'axis on', { size: 9 });
    el.reluCurve = K.svg('path', { d: 'M 8 ' + R.oy + ' L ' + R.ox + ' ' + R.oy + ' L ' + (R.ox + R.half) + ' ' + (R.oy - R.half) },
      el.card, 'relu-curve');
    for (var j = 0; j < M.N; j++) el.dots.push(K.svg('circle', { r: 4.2 }, el.card, 'relu-dot vis'));

    var Rt = G.routes();
    el.arr.x2a = K.arrow(layer.back, Rt.x2a, 'k-black');
    el.arr.w2a = K.arrow(layer.back, Rt.w2a, 'k-black');
    el.b2j = K.svg('path', { d: K.route(Rt.b2j) }, layer.back, 'join-line vis');
    el.joinDot = K.svg('circle', { cx: G.join[0], cy: G.join[1], r: 5 }, layer.back, 'join-dot vis');
    el.arr.a2yhat = K.arrow(layer.back, Rt.a2yhat, 'k-black');
    el.arr.yhat2l = K.arrow(layer.back, Rt.yhat2l, 'k-black');
    el.arr.l2lbar = K.arrow(layer.back, Rt.l2lbar, 'k-black');
    el.arr.y2l = K.arrow(layer.back, Rt.y2l, 'k-black');

    // the worked cell of a click, in the band
    el.strip = K.div('lab strip vis', layer.mid);

    GF.plot.build(layer);
  }

  // ===== what a state shows

  function shows(st) {
    var later = st.iter > 1, story = st.part === 'story';
    function R(n) { return !story && (later || st.reached('black', n)); }
    return { days: R('days'), a: R('a'), w: R('w'), b: R('b'), relu: R('relu'),
             aval: R('aval'), yval: R('yval'), loss: R('loss'), mean: R('mean') };
  }

  // Is the value of cell (name, i) known in this state?
  function known(s, name) {
    if (name === 'y' || name === 'x') return s.days;
    if (name === 'a') return s.aval;
    if (name === 'yhat') return s.yval;
    return s.loss;
  }

  function cellValue(name, i, f) {
    if (name === 'y') return M.Y[i];
    if (name === 'x') return M.X[i];
    return f[name][i];
  }

  // The forward pass the columns show, and the one it is compared with while a hop is tested.
  function passes(st) {
    var base = M.forward(st.w, st.b), hop = st.hop;
    if (!hop || !hop.fwd) return { f: base, base: null };
    var w = hop.who === 'w' ? st.w + st.eps : st.w, b = hop.who === 'b' ? st.b + st.eps : st.b;
    return { f: M.forward(w, b), base: base };
  }

  // The worked cell of the click (iteration 1), as pieces of a formula; `from` says where a number
  // that flies in comes from.
  function stripFor(st) {
    if (st.iter !== 1 || st.part !== 'black') return null;
    var f = M.forward(st.w, st.b), w = st.w, b = st.b, i = 0, C = el.cells;
    if (st.name === 'aval') {
      return { cx: G.cell('a', 0).cx, target: C.a[i].v, pieces: [
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
    if (st.name === 'yval') {
      return { cx: G.cell('yhat', 0).cx, target: C.yhat[i].v, pieces: [
        { key: 'lhs', tex: '\\hat y = \\mathrm{ReLU}(a) = \\max(0,\\,' },
        { key: 'a', tex: M.fmtCell(f.a[i]), from: C.a[i].v },
        { key: 'c', tex: ')' },
        { key: 'eq', tex: '{}={}' },
        { key: 'r', tex: M.fmtCell(f.yhat[i]) }
      ], worked: [C.a[i], C.yhat[i]] };
    }
    if (st.name === 'loss') {
      return { cx: G.cell('l', 0).cx, target: C.l[i].v, pieces: [
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
      var pieces = [{ key: 'lhs', tex: '\\bar\\ell = \\tfrac{1}{6}\\,(' }];
      for (var j = 0; j < M.N; j++) {
        if (j) pieces.push({ key: 'p' + j, tex: '{}+{}' });
        pieces.push({ key: 'l' + j, tex: M.fmtCell(f.l[j]), from: C.l[j].v });
      }
      pieces.push({ key: 'c', tex: ')' }, { key: 'eq', tex: '{}={}' }, { key: 'r', tex: M.fmt(f.lbar) });
      return { cx: 600, target: el.lbar.val, pieces: pieces, worked: [] };
    }
    return null;
  }

  // ===== render

  // A cell's number, shrunk when it is too wide for its column (a loss of 1950.11).
  function setCell(c, txt) {
    K.tex(c.v, txt);
    if (txt.length >= 7) K.fit(c.v, c.d.offsetWidth - 10);
    else c.v.style.fontSize = '';
  }

  function render(st) {
    var s = shows(st), P = passes(st), f = P.f;
    var frames = { y: s.days, x: s.days, a: s.a, yhat: s.relu, l: s.loss };

    COLS.forEach(function (name) {
      var on = frames[name], kn = known(s, name);
      K.show(el.frame[name], on);
      K.show(el.unit[name], on);
      K.show(el.name[name], on);
      el.cells[name].forEach(function (c, i) {
        K.show(c.d, on);
        K.show(c.v, on && kn);
        if (on && kn) setCell(c, M.fmtCell(cellValue(name, i, f)));
        c.d.classList.toggle('flat', (name === 'a' || name === 'yhat') && kn && !(f.a[i] > 0));
        c.d.classList.toggle('hop', !!P.base && kn && (name === 'a' || name === 'yhat' || name === 'l') &&
          cellValue(name, i, f) !== cellValue(name, i, P.base));
        c.d.classList.remove('worked');
      });
    });
    el.idx.forEach(function (d) { K.show(d, s.days); });

    // the boxes and arrows of the model, in the order the clicks bring them
    K.show(el.arr.x2a.g, s.a);
    K.show(el.w.box, s.w); K.show(el.lab.w, s.w); K.show(el.arr.w2a.g, s.w);
    K.show(el.b.box, s.b); K.show(el.lab.b, s.b); K.show(el.b2j, s.b); K.show(el.joinDot, s.b);
    K.show(el.arr.a2yhat.g, s.relu); K.show(el.card, s.relu); K.show(el.reluWord, s.relu);
    K.show(el.arr.yhat2l.g, s.loss); K.show(el.arr.y2l.g, s.loss);
    K.show(el.lbar.box, s.mean); K.show(el.lab.lbar, s.mean);
    K.show(el.arr.l2lbar.g, s.mean); K.show(el.mean, s.mean);
    el.dots.forEach(function (d, i) {
      var R = G.relu, a = Math.max(-R.A, Math.min(R.A, f.a[i]));
      d.setAttribute('cx', (R.ox + a / R.A * R.half).toFixed(1));
      d.setAttribute('cy', (R.oy - M.relu(a) / R.A * R.half).toFixed(1));
      K.show(d, s.yval);
    });

    // the boxes of w and b: a question mark, then the fields of the start, then the values
    var guessing = st.is('black', 'guess'), hop = st.hop;
    var hw = hop && hop.who === 'w', hb = hop && hop.who === 'b';
    ['w', 'b'].forEach(function (who) {
      var fi = el.in[who], o = el[who];
      fi.classList.toggle('on', guessing);
      K.show(o.val, !guessing);
      o.val.classList.add('on');
      o.box.classList.toggle('guessing', guessing);
      if (guessing) {
        if (document.activeElement !== fi) fi.value = st.typed ? String(who === 'w' ? st.w0 : st.b0) : '';
      } else if (document.activeElement === fi) fi.blur();
    });
    if (guessing) {
      setTimeout(function () {
        var a = document.activeElement;
        if (el.in.w.classList.contains('on') && a !== el.in.w && a !== el.in.b) el.in.w.focus({ preventScroll: true });
      }, 30);
    } else {
      var kn = st.iter > 1 || s.aval;
      setVal(el.w, kn ? M.fmt(hw ? st.w + st.eps : st.wShown) : '?', hw);
      setVal(el.b, kn ? M.fmt(hb ? st.b + st.eps : st.bShown) : '?', hb);
    }
    setVal(el.lbar, M.fmt(f.lbar), !!P.base);
    ['w', 'b', 'lbar'].forEach(function (n) { K.fit(el[n].val, G.box[n].w - 14); });

    // the worked cell of the click
    var S = stripFor(st);
    K.show(el.strip, !!S);
    if (S) {
      K.row(el.strip, S.pieces);
      K.pos(el.strip, S.cx, G.band.strip, 'cc');
      K.fit(el.strip, 980);
      S.worked.forEach(function (c) { c.d.classList.add('worked'); });
    }

    // the plot: the points from the click days on, the hinge of this iteration's pair and its
    // marks from yval, the gaps from loss; it gives way to the grounds
    var plotOn = s.days && !GF.parts.ground.showing(st);
    GF.plot.render({ axes: plotOn, points: plotOn, line: plotOn && s.yval, marks: plotOn && s.yval,
                     gaps: plotOn && s.loss, w: st.w, b: st.b, trail: trailOf(st) });
  }

  function setVal(o, tex, hot) {
    K.tex(o.val, tex);
    o.val.classList.toggle('hop', !!hot);
  }

  // The pairs of the iterations before this one, for the faint trail of the plot.
  function trailOf(st) {
    var out = [];
    for (var k = Math.max(0, st.iter - 1 - GF.plot.TRAIL); k < st.iter - 1; k++) out.push([st.ps[k].w, st.ps[k].b]);
    return out;
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

  var REST = [];
  for (var r = 2; r < M.N; r++) REST.push(r);

  // The column of name fills: day 1 worked in the band, day 2 straight in, the rest one by one.
  // o.second(): the sources of day 2; o.rest(i): what brings day i; o.landed(i): runs as day 1 and
  // day 2 land; o.done(): once the last cell is in.
  function fillColumn(name, st, o) {
    var C = el.cells[name], S = stripFor(st);
    REST.forEach(function (i) { K.temp(C[i].v, 'opacity', '0'); });
    K.temp(C[1].v, 'opacity', '0');
    work(S, 250, function () {
      if (o.landed) o.landed(0);
      direct(o.second(), C[1].v, 200, function () {
        if (o.landed) o.landed(1);
        REST.forEach(function (i, j) { K.wait(250 + j * 110, function () { o.rest(i); }); });
        if (o.done) K.wait(250 + REST.length * 110 + 300, o.done);
      });
    });
  }

  function popDots(delay) {
    el.dots.forEach(function (d, i) {
      K.temp(d, 'opacity', '0');
      K.wait(delay + i * 90, function () { d.style.opacity = ''; });
    });
  }

  function animate(st, prev) {
    var C = el.cells, f = M.forward(st.w, st.b), P = GF.plot.el;
    if (st.is('black', 'days')) {
      // the data: two columns, one row a day, and each row a point of the plot
      ['y', 'x'].forEach(function (name) {
        C[name].forEach(function (c, i) { K.later(c.v, 300 + i * 90); });
      });
      el.idx.forEach(function (d, i) { K.later(d, 300 + i * 90); });
      K.drawArrow(P.axX, 500, 900);
      K.drawArrow(P.axY, 500, 900);
      P.pts.forEach(function (c, i) {
        K.temp(c, 'opacity', '0');
        K.wait(1300 + i * 140, function () {
          var ry = K.rect(C.y[i].d), rx = K.rect(C.x[i].d);
          K.flyDot({ cx: (ry.cx + rx.cx) / 2, cy: ry.cy }, { cx: G.px(M.X[i]), cy: G.py(M.Y[i]) }, 800, 'k-black', function () {
            c.style.opacity = '';
            K.pulse(c);
          });
        });
      });
    } else if (st.is('black', 'a')) {
      K.drawArrow(el.arr.x2a, 450, 0);
      [el.frame.a, el.unit.a].concat(C.a.map(function (c) { return c.d; })).forEach(function (e) { K.later(e, 350); });
      K.later(el.name.a, 700);
    } else if (st.is('black', 'w')) {
      K.drawArrow(el.arr.w2a, 800, 300);
      hopIn('w', 0);
    } else if (st.is('black', 'b')) {
      K.drawOn(el.b2j, 400, 300);
      K.later(el.joinDot, 650);
      hopIn('b', 0);
    } else if (st.is('black', 'relu')) {
      K.drawArrow(el.arr.a2yhat, 500, 0);
      K.later(el.card, 300);
      K.drawOn(el.reluCurve, 900, 600);
      K.later(el.reluWord, 500);
      [el.frame.yhat, el.unit.yhat].concat(C.yhat.map(function (c) { return c.d; })).forEach(function (e) { K.later(e, 900); });
      K.later(el.name.yhat, 1200);
    } else if (st.is('black', 'aval')) {
      fillColumn('a', st, {
        second: function () {
          return [{ tex: M.wrap(st.w), from: el.w.val }, { tex: M.wrap(M.X[1]), from: C.x[1].v },
                  { tex: M.wrap(st.b), from: el.b.val }];
        },
        rest: function (i) { C.a[i].v.style.opacity = ''; K.flash(C.a[i].v); }
      });
    } else if (st.is('black', 'yval')) {
      // the column, a dot per day on the small ReLU as its cell lands, then the hinge in the plot
      // and the marks on it
      el.dots.forEach(function (d) { K.temp(d, 'opacity', '0'); });
      K.temp(P.line, 'opacity', '0');
      P.marks.forEach(function (m) { K.temp(m, 'opacity', '0'); });
      var dot = function (i) { el.dots[i].style.opacity = ''; };
      fillColumn('yhat', st, {
        second: function () { return [{ tex: M.fmtCell(f.a[1]), from: C.a[1].v }]; },
        landed: dot,
        rest: function (i) {
          K.flyTex(M.fmtCell(f.a[i]), K.rect(C.a[i].v), K.rect(C.yhat[i].v), 520, 'k-black', function () {
            C.yhat[i].v.style.opacity = '';
            K.flash(C.yhat[i].v);
            dot(i);
          }, 19);
        },
        done: function () {
          K.wait(300, function () { P.line.style.opacity = ''; K.drawOn(P.line, 900, 0); });
          P.marks.forEach(function (m, i) {
            K.wait(1200 + i * 130, function () {
              K.flyTex(M.fmtCell(f.yhat[i]), K.rect(C.yhat[i].v), { cx: G.px(M.X[i]), cy: G.py(Math.min(f.yhat[i], G.plot.ymax + 4)) },
                700, 'k-black', function () { m.style.opacity = ''; K.pulse(m); }, 18);
            });
          });
        }
      });
    } else if (st.is('black', 'loss')) {
      K.drawArrow(el.arr.yhat2l, 400, 0);
      K.drawArrow(el.arr.y2l, 900, 0);
      [el.frame.l, el.unit.l].concat(C.l.map(function (c) { return c.d; })).forEach(function (e) { K.later(e, 300); });
      K.later(el.name.l, 600);
      P.gaps.forEach(function (g) { K.temp(g, 'opacity', '0'); });
      var gap = function (i) { P.gaps[i].style.opacity = ''; K.drawOn(P.gaps[i], 450, 0); };
      fillColumn('l', st, {
        second: function () {
          return [{ tex: String(M.Y[1]), from: C.y[1].v }, { tex: M.wrap(f.yhat[1], 2), from: C.yhat[1].v }];
        },
        landed: gap,
        rest: function (i) { C.l[i].v.style.opacity = ''; K.flash(C.l[i].v); gap(i); }
      });
    } else if (st.is('black', 'mean')) {
      K.drawArrow(el.arr.l2lbar, 450, 0);
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
      // the new numbers run through the columns, left to right, while the hinge moves to them
      ['a', 'yhat', 'l'].forEach(function (name, c) {
        C[name].forEach(function (cell, i) {
          K.temp(cell.v, 'opacity', '0.25');
          K.wait(c * 380 + i * 40, function () { cell.v.style.opacity = ''; K.flash(cell.v); });
        });
      });
      K.temp(el.lbar.val, 'opacity', '0.25');
      K.wait(3 * 380 + 100, function () { el.lbar.val.style.opacity = ''; K.flash(el.lbar.val); });
      popDots(400);
      if (prev && st.iter === prev.iter + 1) {
        var w0 = prev.w, b0 = prev.b, w1 = st.w, b1 = st.b, tr = trailOf(st);
        K.tween(900, function (e) {
          GF.plot.render({ axes: true, points: true, line: true, marks: true, gaps: true,
                           w: w0 + (w1 - w0) * e, b: b0 + (b1 - b0) * e, trail: e < 1 ? tr.slice(0, -1) : tr });
        }, K.ease.inOut);
      }
    }
  }

  // A grasshopper drops onto the box of its number.
  function hopIn(who, delay) {
    var h = GF.hopper[who], home = GF.hopper.perchPose(who);
    h.setPose({ x: home.x - 40, y: home.y - 150, a: -20, s: home.s, f: 1 });
    K.temp(h.g, 'opacity', '0');
    K.wait(delay + 250, function () {
      h.g.style.opacity = '';
      GF.hopper.jump(h, home, 700, 30);
    });
  }

  // The forward pass of a hop through the columns a, yhat and l and the box of lbar: the cells
  // turn to the hopped numbers one column at a time, in blue where they change; then() once lbar
  // has turned.
  function flowHop(st, who, delay, then) {
    var base = M.forward(st.w, st.b);
    var w = who === 'w' ? st.w + st.eps : st.w, b = who === 'b' ? st.b + st.eps : st.b;
    var f = M.forward(w, b), C = el.cells;
    // show the pair's numbers first, then switch
    ['a', 'yhat', 'l'].forEach(function (name) {
      C[name].forEach(function (c, i) {
        setCell(c, M.fmtCell(base[name][i]));
        c.d.classList.remove('hop');
      });
    });
    K.tex(el.lbar.val, M.fmt(base.lbar));
    el.lbar.val.classList.remove('hop');
    ['a', 'yhat', 'l'].forEach(function (name, k) {
      C[name].forEach(function (c, i) {
        K.wait(delay + k * 520 + i * 70, function () {
          setCell(c, M.fmtCell(f[name][i]));
          c.d.classList.toggle('hop', f[name][i] !== base[name][i]);
          if (f[name][i] !== base[name][i]) K.flash(c.v);
        });
      });
    });
    K.wait(delay + 3 * 520 + 200, function () {
      K.tex(el.lbar.val, M.fmt(f.lbar));
      K.fit(el.lbar.val, G.box.lbar.w - 14);
      el.lbar.val.classList.add('hop');
      K.flash(el.lbar.val);
      if (then) K.wait(350, then);
    });
  }

  // ===== the start typed by the room

  // {ok: true, w, b} (an empty field gives the default) or {ok: false, which: 'w', 'b' or 'both'}.
  function readGuess() {
    var out = { ok: true };
    var bad = null;
    ['w', 'b'].forEach(function (who) {
      var s = el.in[who].value.trim();
      var v = s === '' ? (who === 'w' ? M.W_DEFAULT : M.B_DEFAULT) : M.parse(s);
      if (v === null && !bad) bad = who;
      out[who] = v;
    });
    if (bad) return { ok: false, which: bad };
    if (!M.takes(out.w, out.b)) return { ok: false, which: 'both' };
    return out;
  }

  function shake(which) {
    var list = which === 'both' ? ['w', 'b'] : [which];
    list.forEach(function (who) {
      var box = el[who].box;
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
    });
    var fi = el.in[list[0]];
    fi.focus({ preventScroll: true });
    fi.select();
  }

  // Enter in the field of w goes on to the field of b; true when it did.
  function enterInField(fi) {
    if (fi === el.in.w) { el.in.b.focus({ preventScroll: true }); el.in.b.select(); return true; }
    return false;
  }

  function switchField(fi) {
    var g = fi === el.in.w ? el.in.b : el.in.w;
    g.focus({ preventScroll: true });
    g.select();
  }

  function focusGuess() {
    var a = document.activeElement;
    if (a !== el.in.w && a !== el.in.b) el.in.w.focus({ preventScroll: true });
  }

  GF.parts.black = {
    steps: function (iter) {
      return iter === 1 ? ['days', 'a', 'w', 'b', 'relu', 'guess', 'aval', 'yval', 'loss', 'mean'] : ['recompute'];
    },
    build: build, render: render, animate: animate,
    readGuess: readGuess, shake: shake, focusGuess: focusGuess, enterInField: enterInField,
    switchField: switchField, flowHop: flowHop, trailOf: trailOf,
    el: el
  };
})();
