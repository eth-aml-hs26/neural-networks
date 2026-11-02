/* blue.js: the blue part, the two grasshoppers measure their slopes, as GF.parts.blue.
 *
 * Iteration 1, one click each:
 *   hopw    grasshopper w hops to w + eps: every cell of a, yhat and l changes, and so does lbar;
 *           its row in the band takes the two averages, Delta_eps / eps = (lbar after - lbar
 *           before) / eps, written as in steps 0 and 1
 *   slopew  the row ends: their difference over eps is the slope, and as eps goes to 0 the
 *           derivative dlbar/dw; the grasshopper hops back and the cells return
 *   hopb    the same for grasshopper b, in one click
 * Iteration 2 on, one click each:
 *   hopw    the hop and the whole row of w; a day on the flat side keeps its yhat and its l
 *   hopb    w hops back; the hop and the whole row of b
 * At speed 2 (quick, step 0's two triangles), one click in every iteration:
 *   direct  no hop: the two slopes straight from the derivatives, (1/8) of the sum over the days on
 *           the rising side of -2 x (y - yhat) and of -2 (y - yhat); the cells they read light up
 * At speed 3 (the jumps only) the blue part has no click.
 * While a grasshopper stands hopped, the columns show the hopped numbers: black.js asks hopped().
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF;
  var el = { row: {} };

  function build(layer) {
    var G = GF.geo;
    el.row.w = K.div('lab band-row vis', layer.mid);
    el.row.b = K.div('lab band-row vis', layer.mid);
    K.pos(el.row.w, G.band.x, G.band.yw, 'cl');
    K.pos(el.row.b, G.band.x, G.band.yb, 'cl');
  }

  // Which grasshopper stands hopped in state st: 'w', 'b' or null.
  function hopped(st) {
    if (st.is('blue', 'hopw')) return 'w';
    if (st.is('blue', 'hopb')) return 'b';
    return null;
  }

  // The row of one grasshopper: the slope's definition, the two averages, the slope, its limit.
  function pieces(which, H) {
    var S = M.hopShown(H);
    return [
      { key: 'lhs', tex: '\\Delta_\\varepsilon / \\varepsilon = \\big(' },
      { key: 'l1', tex: S.l1 },
      { key: 'm', tex: '{}-{}' },
      { key: 'l0', tex: S.l0 },
      { key: 'c', tex: '\\big)\\,/\\,' + S.eps },
      { key: 'eq', tex: '{}={}' },
      { key: 's', tex: S.slope },
      { key: 'to', tex: '\\;\\xrightarrow{\\;\\varepsilon\\,\\to\\,0\\;}\\;' },
      { key: 'dl', tex: '\\tfrac{\\partial\\bar\\ell}{\\partial ' + which + '}={}' },
      { key: 'dv', tex: S.deriv }
    ];
  }
  var TAIL = ['eq', 's', 'to', 'dl', 'dv'];

  // The row of one derivative at speed 2: its formula, then its value (the number purple's box
  // takes). Only the days on the rising side (a > 0) count: the ReLU's slope is 0 on the flat side.
  function directPieces(which, g) {
    var term = which === 'w' ? '-2\\,x_i\\,(y_i - \\hat y_i)' : '-2\\,(y_i - \\hat y_i)';
    return [
      { key: 'dl', tex: '\\tfrac{\\partial\\bar\\ell}{\\partial ' + which + '} = \\tfrac{1}{8}\\sum_{a_i > 0} ' + term },
      { key: 'eq', tex: '{}={}' },
      { key: 'dv', tex: M.fmtGrad(g) }
    ];
  }

  function render(st) {
    var later = st.iter > 1, purple = st.partReached('purple');
    if (st.mode === 2) {
      var on = !purple && st.reached('blue', 'direct');
      K.show(el.row.w, on);
      K.show(el.row.b, on);
      if (on) {
        K.row(el.row.w, directPieces('w', st.g.w));
        K.row(el.row.b, directPieces('b', st.g.b));
        K.fit(el.row.w, 1130 - GF.geo.band.x);
        K.fit(el.row.b, 1130 - GF.geo.band.x);
      }
      return;
    }
    var showW = !purple && st.reached('blue', 'hopw');
    var showB = !purple && st.reached('blue', 'hopb');
    K.show(el.row.w, showW);
    K.show(el.row.b, showB);
    // (a row is typeset only while it shows, so a run of Play costs nothing here)
    if (showW) {
      var spW = K.row(el.row.w, pieces('w', st.hw));
      // in iteration 1 the row of w stops at the two averages until the next click
      var cut = !later && st.is('blue', 'hopw');
      TAIL.forEach(function (k) { spW[k].classList.toggle('hide', cut); });
      K.fit(el.row.w, 1130 - GF.geo.band.x);
    }
    if (showB) {
      K.row(el.row.b, pieces('b', st.hb));
      K.fit(el.row.b, 1130 - GF.geo.band.x);
    }

    var h = hopped(st);
    if (h === 'w') GF.hopper.w.setPose(GF.hopper.hopPose('w'));
    if (h === 'b') GF.hopper.b.setPose(GF.hopper.hopPose('b'));
  }

  // ===== animations

  // The cells and the box of one column at a time switch to the hopped numbers.
  function switchOver(H, delay) {
    var B = GF.parts.black;
    ['a', 'yhat', 'l'].forEach(function (name, c) {
      K.wait(delay + c * 300, function () {
        B.paint(H.to, H.from, [name]);
        B.el.cells[name].forEach(function (cell, i) {
          if (H.to[name][i] !== H.from[name][i]) K.flash(cell.v);
        });
      });
    });
    K.wait(delay + 3 * 300, function () { B.paint(H.to, H.from, ['lbar']); K.flash(B.el.lbar.val); });
  }

  // One grasshopper's hop: lbar before the hop flies into its row, the grasshopper hops, every
  // cell it touches changes, lbar after the hop flies in; whole: then the slope and its limit.
  function hopSequence(which, st, delay, whole) {
    var B = GF.parts.black, H = which === 'w' ? st.hw : st.hb, h = GF.hopper[which];
    var row = el.row[which], sp = row.__spans || {};
    var v0 = which === 'w' ? st.w : st.b;
    B.paint(H.from, null);
    B.paintBox(which, v0, false);
    h.setPose(GF.hopper.perchPose(which));
    ['l1', 'm', 'l0', 'c'].concat(TAIL).forEach(function (k) { K.temp(sp[k], 'opacity', '0'); });
    K.wait(delay, function () {
      K.flyTex(M.hopShown(H).l0, K.rect(B.el.lbar.val), K.rect(sp.l0), 650, 'k-blue', function () {
        sp.l0.style.opacity = '';
        sp.m.style.opacity = '';
      }, 22);
    });
    K.wait(delay + 750, function () {
      GF.hopper.jump(h, GF.hopper.hopPose(which), 480, 34, function () {
        B.paintBox(which, v0 + H.eps, true);
        K.flash(B.el[which].val);
      });
    });
    switchOver(H, delay + 1300);
    K.wait(delay + 2500, function () {
      K.flyTex(M.hopShown(H).l1, K.rect(B.el.lbar.val), K.rect(sp.l1), 650, 'k-blue', function () {
        ['l1', 'c'].forEach(function (k) { sp[k].style.opacity = ''; });
        if (whole) tail(sp, 350);
      }, 22);
    });
  }

  // The end of a row: the slope, then its limit.
  function tail(sp, delay) {
    K.wait(delay, function () { sp.eq.style.opacity = ''; sp.s.style.opacity = ''; K.flash(sp.s); });
    K.wait(delay + 900, function () {
      ['to', 'dl', 'dv'].forEach(function (k) { sp[k].style.opacity = ''; });
      K.flash(sp.dv);
    });
  }

  // A hopped grasshopper hops back onto its perch, and the cells return to the numbers before.
  function hopBack(which, st, delay, done) {
    var B = GF.parts.black, H = which === 'w' ? st.hw : st.hb, h = GF.hopper[which];
    var v0 = which === 'w' ? st.w : st.b;
    h.setPose(GF.hopper.hopPose(which));
    B.paint(H.to, H.from);
    B.paintBox(which, v0 + H.eps, true);
    K.wait(delay, function () {
      GF.hopper.jump(h, GF.hopper.perchPose(which), 420, 26, function () {
        B.paint(H.from, null);
        B.paintBox(which, v0, false);
        if (done) done();
      });
    });
  }

  // Speed 2: each row writes its formula while the cells it reads light up, day by day on the
  // rising side, then its value.
  function directRows(st, delay) {
    var C = GF.parts.black.el.cells;
    ['w', 'b'].forEach(function (which, j) {
      var sp = el.row[which].__spans || {}, t = delay + j * 1500;
      ['dl', 'eq', 'dv'].forEach(function (k) { if (sp[k]) K.temp(sp[k], 'opacity', '0'); });
      K.wait(t, function () { sp.dl.style.opacity = ''; });
      var cols = which === 'w' ? ['x', 'y', 'yhat'] : ['y', 'yhat'];
      var on = [];
      for (var i = 0; i < M.N; i++) if (st.f.a[i] > 0) on.push(i);
      on.forEach(function (i, n) {
        K.wait(t + 250 + n * 70, function () { cols.forEach(function (c) { K.flash(C[c][i].v); }); });
      });
      K.wait(t + 250 + on.length * 70 + 400, function () {
        sp.eq.style.opacity = '';
        sp.dv.style.opacity = '';
        K.flash(sp.dv);
      });
    });
  }

  function animate(st, prev) {
    var later = st.iter > 1;
    if (st.is('blue', 'direct')) {
      directRows(st, 200);
    } else if (st.is('blue', 'hopw')) {
      hopSequence('w', st, later ? 0 : 300, later);
    } else if (st.is('blue', 'slopew')) {
      var sp = el.row.w.__spans || {};
      TAIL.forEach(function (k) { K.temp(sp[k], 'opacity', '0'); });
      tail(sp, 150);
      hopBack('w', st, 1900);
    } else if (st.is('blue', 'hopb')) {
      var t = 0;
      if (prev && prev.iter === st.iter && hopped(prev) === 'w') {
        hopBack('w', st, 100);
        t = 700;
      }
      hopSequence('b', st, t, true);
    }
  }

  GF.parts.blue = {
    steps: function (iter, mode) {
      if (mode === 3) return [];
      if (mode === 2) return ['direct'];
      return iter === 1 ? ['hopw', 'slopew', 'hopb'] : ['hopw', 'hopb'];
    },
    build: build, render: render, animate: animate,
    hopped: hopped, hopBack: hopBack, el: el
  };
})();
