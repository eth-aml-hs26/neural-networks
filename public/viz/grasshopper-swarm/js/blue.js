/* blue.js: the blue part, the swarm measures its slopes, as GF.parts.blue (the design of
 * GRADIENTS.md, "Blue", click by click).
 *
 * Iteration 1, one new thing a click:
 *   hop      the grasshopper of w_1 stands and hops: its cell reads w_1 + eps = 1.01; the other
 *            seven crouch and dim; nothing else moves yet
 *   column   column 1 of A takes its new values (blue); columns 2 to 4 dim: w_1 reaches column 1
 *   gate     column 1 of Z: the days where neuron 1 is on take the change; day 1 keeps its 0 and
 *            dims: the ReLU is a gate
 *   hears    yhat and l change on exactly those days, each l with its change beside it; in the
 *            plot bend 1 is bold, the stretch right of it shaded, its days lit: what it hears
 *   slope    lbar after the hop, and the band's row: (lbar(w_1 + eps) - lbar) / eps, as shown,
 *            then its limit d lbar / d w_1
 *   cell     the two columns of the gradient appear; the slope flies into its cell, row 1; the
 *            grasshopper hops back (the hop was a test) and everything undims
 *   b1       the grasshopper of b_1 in one sweep: the same column, the same gate, the same days;
 *            its slope fills row 1 of d lbar / d b
 *   n2       neuron 2's two grasshoppers in turn: fewer days come through the gate; row 2 fills
 *   swarm    neurons 3 and 4, two grasshoppers each: the columns fill, and that is the gradient
 *   shortcut (optional; dropped by the flag lean) the shortcut that replaces the hop: a column of
 *            terms -2 (y_i - yhat_i) x_i / n beside l; each w slope adds the terms of the days its
 *            neuron hears; the formula in the band
 * Iteration 2 on, one click:
 *   hops     the swarm hops in turn, neuron by neuron, each lighting its column, its gate, its days
 *            and its points; the columns of the gradient refill row by row
 *
 * The black part draws the cells; it asks hopView(st) which hop they show, and how far it has
 * flowed (lv 1 to 5).
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS, N = T.x.length, MM = T.m;
  var LV = { hop: 1, column: 2, gate: 3, hears: 4, slope: 5 };
  var el = { row: [], terms: [] };

  function build(layer) {
    el.row.push(K.div('lab band-row vis', layer.mid), K.div('lab band-row vis', layer.mid));
    K.pos(el.row[0], G.band.x, G.band.y1, 'cl');
    K.pos(el.row[1], G.band.x, G.band.y2, 'cl');
    for (var i = 0; i < N; i++) {
      var d = K.div('dl vis', layer.mid);
      K.pos(d, G.frame('l').right + 6, G.cell('l', i).cy, 'cl');
      el.terms.push(d);
    }
    el.formula = K.div('lab band-row vis', layer.mid);
    K.tex(el.formula, '\\dfrac{\\partial \\bar\\ell}{\\partial w_j} = \\frac{1}{8} \\sum_{i\\,:\\;a_{ij} > 0} -2\\,(y_i - \\hat y_i)\\,x_i' +
      '\\qquad \\dfrac{\\partial \\bar\\ell}{\\partial b_j} = \\frac{1}{8} \\sum_{i\\,:\\;a_{ij} > 0} -2\\,(y_i - \\hat y_i)');
    K.pos(el.formula, G.band.x, (G.band.y1 + G.band.y2) / 2, 'cl');
  }

  // The hop the cells show in state st: grasshopper w_1 in iteration 1, from hop to slope.
  function hopView(st) {
    if (st.iter !== 1 || st.part !== 'blue' || !LV[st.name]) return null;
    return { which: 'w', j: 0, H: st.hop('w', 0), lv: LV[st.name] };
  }

  // The rows of the band at rest: the last grasshoppers measured (iteration 1 only).
  function bandRows(st) {
    if (st.iter !== 1 || st.part !== 'blue') return [];
    if (st.name === 'slope' || st.name === 'cell') return [['w', 0]];
    if (st.name === 'b1') return [['b', 0]];
    if (st.name === 'n2') return [['w', 1], ['b', 1]];
    if (st.name === 'swarm') return [['w', MM - 1], ['b', MM - 1]];
    return [];
  }

  // The row of one grasshopper: the slope from the two lbar values as shown, then its limit.
  function pieces(st, which, j) {
    var S = M.hopShown(st.hop(which, j)), name = which + '_' + (j + 1);
    return [
      { key: 'lhs', tex: '\\big(\\bar\\ell(' + name + ' + \\varepsilon) - \\bar\\ell\\big)\\,/\\,\\varepsilon = \\big(' },
      { key: 'l1', tex: S.l1 },
      { key: 'm', tex: '{}-{}' },
      { key: 'l0', tex: S.l0 },
      { key: 'c', tex: '\\big)\\,/\\,' + S.eps },
      { key: 'eq', tex: '{}={}' },
      { key: 's', tex: S.slope },
      { key: 'to', tex: '\\;\\xrightarrow{\\;\\varepsilon\\,\\to\\,0\\;}\\;' },
      { key: 'dl', tex: '\\tfrac{\\partial\\bar\\ell}{\\partial ' + name + '}={}' },
      { key: 'dv', tex: S.deriv }
    ];
  }

  function render(st) {
    var rows = bandRows(st);
    el.row.forEach(function (r, q) {
      K.show(r, !!rows[q]);
      if (rows[q]) {
        K.row(r, pieces(st, rows[q][0], rows[q][1]));
        K.fit(r, G.band.right - G.band.x);
      }
    });

    // the grasshoppers while w_1 hops: it stands hopped, the others crouch and dim
    var hv = hopView(st);
    if (hv) {
      GF.hoppers.each(function (h, which, j) {
        if (which === hv.which && j === hv.j) h.setPose(GF.hopper.hopPose(which, j));
        else { h.setPose(GF.hopper.crouchPose(which, j)); h.dim(true); }
      });
    }

    // the shortcut: the column of terms beside l and the formula
    var sc = st.iter === 1 && st.is('blue', 'shortcut');
    K.show(el.formula, sc);
    // the terms of neuron 1, which hears every day that anybody hears (GRADIENTS.md): day 1 counts
    // 0 at the start, since nobody hears it yet
    var TW = M.terms(st.D, st.P, 'w', 0);
    el.terms.forEach(function (d, i) {
      K.show(d, sc);
      if (sc) GF.parts.black.setNum(d, M.fmt(TW.t[i], 2));
      d.classList.remove('lit');
    });
  }

  function plot(st, o) {
    var hv = hopView(st);
    if (!hv || hv.lv < LV.hears) return;
    var k = M.knot(st.P, hv.j);
    o.focus = hv.j;
    o.heard = [k === null ? G.plot.xmin : k, G.plot.xmax];
    o.lit = st.D.x.map(function (x, i) { return hv.H.rows.indexOf(i) >= 0; });
  }

  // ===== animations

  // The cells a hop of which_j reaches, as elements: column j of A, the cells of column j of Z
  // that change, and the rows of yhat and l that change.
  // and the cells it leaves alone, which dim during its turn (y and x never dim)
  function reached(st, which, j) {
    var B = GF.parts.black.el, H = st.hop(which, j), out = { A: [], Z: [], rows: [], pts: [], rest: [] };
    for (var i = 0; i < N; i++) {
      for (var q = 0; q < MM; q++) {
        var a = B.tab.A.cells[i][q].d, z = B.tab.Z.cells[i][q].d;
        if (q === j && H.dA[i] !== 0) out.A.push(a); else out.rest.push(a);
        if (q === j && H.dZ[i] !== 0) out.Z.push(z); else out.rest.push(z);
      }
      if (H.rows.indexOf(i) >= 0) {
        out.rows.push(B.cells.yhat[i].d, B.cells.l[i].d);
        out.pts.push(GF.plot.el.pts[i]);
      } else {
        out.rest.push(B.cells.yhat[i].d, B.cells.l[i].d);
      }
    }
    return out;
  }

  function lightUp(list, on) { list.forEach(function (d) { d.classList.toggle('lit', on); }); }

  // One grasshopper's turn in a sweep, over ms from delay: it hops, its column of A lights, then
  // the cells through the gate, then its days and its points; its bend is bold; its slope appears
  // in its cell of the gradient; it hops back. withRow: its row in the band, slot q.
  function turn(st, which, j, delay, ms, withRow, q) {
    var B = GF.parts.black, h = GF.hopper.swarm[which][j], cell = B.el.m[which].cells[j].v;
    var R = reached(st, which, j), Pl = GF.plot.el, g = GF.parts.purple.el.cells[which][j].v;
    var H = st.hop(which, j), S = M.hopShown(H);
    K.temp(g, 'opacity', '0');
    K.wait(delay, function () {
      GF.hoppers.each(function (o, w2, j2) { if (o !== h) o.dim(true); });
      GF.hopper.jump(h, GF.hopper.hopPose(which, j), ms * 0.18, 18, function () {
        B.setNum(cell, M.fmt(H.to));
        cell.parentNode.classList.add('hopped');
      });
      K.wait(ms * 0.2, function () { lightUp(R.A, true); R.rest.forEach(function (d) { d.classList.add('dim'); }); });
      K.wait(ms * 0.32, function () { lightUp(R.Z, true); });
      K.wait(ms * 0.44, function () {
        lightUp(R.rows, true);
        Pl.bends.forEach(function (b, q2) { b.g.classList.toggle('bold', q2 === j); b.g.classList.toggle('dim', q2 !== j); });
        R.pts.forEach(function (p) { p.classList.add('lit'); });
      });
      if (withRow) {
        var sp = el.row[q].__spans || {};
        ['l1', 'm', 'l0', 'c', 'eq', 's', 'to', 'dl', 'dv'].forEach(function (k) { if (sp[k]) K.temp(sp[k], 'opacity', '0'); });
        K.wait(ms * 0.5, function () { ['l1', 'm', 'l0', 'c'].forEach(function (k) { sp[k].style.opacity = ''; }); });
        K.wait(ms * 0.62, function () { sp.eq.style.opacity = ''; sp.s.style.opacity = ''; K.flash(sp.s); });
        K.wait(ms * 0.74, function () { ['to', 'dl', 'dv'].forEach(function (k) { sp[k].style.opacity = ''; }); K.flash(sp.dv); });
      }
      K.wait(ms * 0.8, function () {
        var from = withRow ? K.rect((el.row[q].__spans || {}).dv) : K.rect(B.el.lbarVal);
        K.flyTex(S.deriv, from, K.rect(g), ms * 0.18 + 250, 'k-purple', function () {
          g.style.opacity = '';
          K.flash(g);
        }, 19);
        GF.hopper.jump(h, GF.hopper.perchPose(which, j), ms * 0.15, 14, function () {
          B.setNum(cell, M.fmt(st.P[which][j]));
          cell.parentNode.classList.remove('hopped');
          lightUp(R.A, false); lightUp(R.Z, false); lightUp(R.rows, false);
          R.rest.forEach(function (d) { d.classList.remove('dim'); });
          R.pts.forEach(function (p) { p.classList.remove('lit'); });
          Pl.bends.forEach(function (b) { b.g.classList.remove('bold'); b.g.classList.remove('dim'); });
          GF.hoppers.each(function (o) { o.dim(false); });
        });
      });
    });
  }

  function animate(st, prev) {
    var B = GF.parts.black;
    if (st.is('blue', 'hop')) {
      var h = GF.hopper.swarm.w[0];
      h.setPose(GF.hopper.perchPose('w', 0));
      GF.hopper.jump(h, GF.hopper.hopPose('w', 0), 500, 26);
      var v = B.el.m.w.cells[0].v;
      K.temp(v, 'opacity', '0');
      K.wait(450, function () { v.style.opacity = ''; K.flash(v); });
    } else if (st.is('blue', 'column')) {
      flashCells(B.el.tab.A.cells.map(function (r) { return r[0].v; }), 100, 60);
    } else if (st.is('blue', 'gate')) {
      var H = st.hop('w', 0);
      flashCells(B.el.tab.Z.cells.filter(function (r, i) { return H.dZ[i] !== 0; }).map(function (r) { return r[0].v; }), 100, 60);
    } else if (st.is('blue', 'hears')) {
      var H2 = st.hop('w', 0);
      H2.rows.forEach(function (i, q) {
        [B.el.cells.yhat[i].v, B.el.cells.l[i].v].forEach(function (c) { K.wait(100 + q * 70, function () { K.flash(c); }); });
        K.later(B.el.dl[i], 500 + q * 70);
      });
      var Pl = GF.plot.el;
      K.later(Pl.heard, 300);
    } else if (st.is('blue', 'slope')) {
      var sp = el.row[0].__spans || {};
      ['l1', 'm', 'l0', 'c', 'eq', 's', 'to', 'dl', 'dv'].forEach(function (k) { K.temp(sp[k], 'opacity', '0'); });
      K.temp(B.el.lbarVal, 'opacity', '0');
      K.wait(200, function () { B.el.lbarVal.style.opacity = ''; K.flash(B.el.lbarVal); });
      var S = M.hopShown(st.hop('w', 0));
      K.wait(700, function () {
        K.flyTex(S.l1, K.rect(B.el.lbarVal), K.rect(sp.l1), 700, 'k-blue', function () { sp.l1.style.opacity = ''; sp.m.style.opacity = ''; }, 22);
      });
      K.wait(1000, function () { sp.l0.style.opacity = ''; sp.c.style.opacity = ''; });
      K.wait(1900, function () { sp.eq.style.opacity = ''; sp.s.style.opacity = ''; K.flash(sp.s); });
      K.wait(2900, function () { ['to', 'dl', 'dv'].forEach(function (k) { sp[k].style.opacity = ''; }); K.flash(sp.dv); });
    } else if (st.is('blue', 'cell')) {
      // the slope flies into its cell; the grasshopper hops back onto its number
      var P = GF.parts.purple.el, g = P.cells.w[0].v, sp2 = el.row[0].__spans || {};
      [P.frame.w, P.frame.b, P.lab.w, P.lab.b].forEach(function (e) { K.later(e, 0); });
      P.cells.w.concat(P.cells.b).forEach(function (c) { K.later(c.d, 0); });
      K.temp(g, 'opacity', '0');
      K.wait(600, function () {
        K.flyTex(M.fmtGrad(st.G.w[0]), K.rect(sp2.dv || B.el.lbarVal), K.rect(g), 900, 'k-purple', function () {
          g.style.opacity = '';
          K.flash(g);
        }, 22);
      });
      var hh = GF.hopper.swarm.w[0];
      hh.setPose(GF.hopper.hopPose('w', 0));
      K.wait(1500, function () { GF.hopper.jump(hh, GF.hopper.perchPose('w', 0), 500, 22); });
    } else if (st.is('blue', 'b1')) {
      turn(st, 'b', 0, 200, 2600, true, 0);
    } else if (st.is('blue', 'n2')) {
      turn(st, 'w', 1, 200, 2600, true, 0);
      turn(st, 'b', 1, 3000, 2600, true, 1);
    } else if (st.is('blue', 'swarm')) {
      var t = 200;
      for (var j = 2; j < MM; j++) {
        turn(st, 'w', j, t, 900, false); t += 1000;
        turn(st, 'b', j, t, 900, false); t += 1000;
      }
    } else if (st.is('blue', 'shortcut')) {
      el.terms.forEach(function (d, i) { K.later(d, 200 + i * 90); });
      K.later(el.formula, 100);
      // each w slope gathers the terms of the days its neuron hears, from neuron 4 back to 1
      for (var q = MM - 1; q >= 0; q--) {
        (function (q, k) {
          var hs = M.hears(st.D, st.P, q);
          K.wait(1300 + k * 900, function () {
            hs.forEach(function (i) { el.terms[i].classList.add('lit'); });
            K.flash(GF.parts.purple.el.cells.w[q].v);
          });
          K.wait(1300 + k * 900 + 750, function () { hs.forEach(function (i) { el.terms[i].classList.remove('lit'); }); });
        })(q, MM - 1 - q);
      }
    } else if (st.is('blue', 'hops')) {
      var t2 = 150;
      for (var jj = 0; jj < MM; jj++) {
        turn(st, 'w', jj, t2, 260, false); t2 += 280;
        turn(st, 'b', jj, t2, 260, false); t2 += 280;
      }
    }
  }

  function flashCells(list, delay, step) {
    list.forEach(function (c, q) { K.wait(delay + q * step, function () { K.flash(c); }); });
  }

  GF.parts.blue = {
    steps: function (iter, ctx) {
      if (iter === 1) {
        var s = ['hop', 'column', 'gate', 'hears', 'slope', 'cell', 'b1', 'n2', 'swarm'];
        if (!ctx.lean) s.push('shortcut');
        return s;
      }
      return ['hops'];
    },
    build: build, render: render, plot: plot, animate: animate,
    hopView: hopView, el: el
  };
})();
