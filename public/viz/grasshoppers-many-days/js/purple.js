/* purple.js: the purple part, the gradient and the backward pass, as GF.parts.purple.
 *
 * Iteration 1, one click each:
 *   grad    grasshopper b hops back; the two slopes stand together as one pair: an arrow from lbar
 *           up to a box of two cells, nabla lbar = (dlbar/dw, dlbar/db) = (600, 46.75); the two
 *           numbers fly in from the rows of the grasshoppers, which go
 *   back    the bracket of the backward pass, from the pair over the top into w and into b
 *   update  the two updates side by side, w <- w - alpha dlbar/dw and b <- b - alpha dlbar/db, and
 *           alpha; the numbers fly in, w <- -1 - 0.01 x 600 = -7 and b <- 60 - 0.01 x 46.75 =
 *           59.5325; both new values fly down the bracket at once and both grasshoppers hop
 * Iteration 2 on, two clicks:
 *   grad    grad and back at once
 *   update  as above
 * At speed 2 the same; at speed 3 (the jumps only) no click: the update shows as the jump of the
 * next iteration (black.js, recompute).
 * The arrangement is step 1's (../grasshoppers-find-w-and-b/): the pair, the bracket, the updates.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = { cell: {}, row1: {}, row2: {} };

  function build(layer) {
    var P = G.grad;
    el.box = K.div('box pair vis', layer.mid);
    el.box.style.left = P.x + 'px';
    el.box.style.top = P.y + 'px';
    el.box.style.width = 2 * P.cw + 'px';
    el.box.style.height = P.h + 'px';
    ['w', 'b'].forEach(function (who) {
      var c = K.div('pcell', el.box);
      el.cell[who] = K.div('val', c);
    });

    function lab(name, tex, cls) {
      var d = K.div('lab vis ' + (cls || ''), layer.mid);
      K.tex(d, tex);
      K.pos(d, G.label[name][0], G.label[name][1], G.label[name][2]);
      return d;
    }
    el.nabla = lab('nabla', '\\nabla \\bar\\ell =', 'name');
    el.labW = lab('gw', '\\dfrac{\\partial \\bar\\ell}{\\partial w}', 'pair-lab');
    el.labB = lab('gb', '\\dfrac{\\partial \\bar\\ell}{\\partial b}', 'pair-lab');

    var R = G.bracketRoutes();
    el.up = K.arrow(layer.back, R.up, '');
    el.main = K.arrow(layer.back, R.main, 'back', { r: 20, size: 17 });
    el.branch = K.arrow(layer.back, R.branch, 'back', { size: 17 });
    el.word = K.div('word vis', layer.mid);
    el.word.textContent = 'backward pass';
    K.pos(el.word, G.label.backward[0], G.label.backward[1], G.label.backward[2]);

    var U = G.upd;
    ['w', 'b'].forEach(function (who) {
      el.row1[who] = K.div('lab update-row vis', layer.mid);
      K.tex(el.row1[who], who + ' \\;\\leftarrow\\; ' + who + ' - \\alpha\\,\\tfrac{\\partial \\bar\\ell}{\\partial ' + who + '}');
      K.pos(el.row1[who], U[who], U.row1, 'cl');
      el.row2[who] = K.div('lab update-row vis', layer.mid);
      K.pos(el.row2[who], U[who], U.row2, 'cl');
    });
    el.alpha = K.div('lab alpha-lab vis', layer.mid);
  }

  // A component of the gradient inside a formula, in parentheses when it is negative.
  function gwrap(g) {
    var s = M.fmtGrad(g);
    return s.charAt(0) === '-' ? '(' + s + ')' : s;
  }

  function rowPieces(who, v, g, alpha, next) {
    return [
      { key: 'lhs', tex: who + ' \\;\\leftarrow{}' },
      { key: 'v', tex: M.wrap(v) },
      { key: 'm', tex: '{}-{}' },
      { key: 'a', tex: M.fmt(alpha, 6) },
      { key: 't', tex: '{}\\times{}' },
      { key: 'g', tex: gwrap(g) },
      { key: 'eq', tex: '{}={}' },
      { key: 'r', tex: M.fmt(next) }
    ];
  }

  function render(st) {
    var later = st.iter > 1;
    var on = st.partReached('purple');
    var back = on && (later || st.reached('purple', 'back'));
    var upd = st.reached('purple', 'update');

    K.show(el.box, on); K.show(el.up.g, on);
    [el.nabla, el.labW, el.labB].forEach(function (e) { K.show(e, on); });
    K.show(el.main.g, back); K.show(el.branch.g, back); K.show(el.word, back);
    ['w', 'b'].forEach(function (who) { K.show(el.row1[who], upd); K.show(el.row2[who], upd); });
    K.show(el.alpha, upd);
    // (typeset only what shows, so a run of Play costs nothing here)
    if (on) {
      K.tex(el.cell.w, M.fmtGrad(st.g.w));
      K.tex(el.cell.b, M.fmtGrad(st.g.b));
      K.fit(el.cell.w, G.grad.cw - 10);
      K.fit(el.cell.b, G.grad.cw - 10);
    }
    if (!upd) return;
    ['w', 'b'].forEach(function (who) {
      K.row(el.row2[who], rowPieces(who, who === 'w' ? st.w : st.b, who === 'w' ? st.g.w : st.g.b,
                                    st.alpha, who === 'w' ? st.wNext : st.bNext));
    });
    // the block of w ends before the block of b begins
    K.fit(el.row2.w, G.upd.b - G.upd.w - 30);
    K.tex(el.alpha, '\\alpha = ' + M.fmt(st.alpha, 6));
    // alpha stands a little right of the block of b
    var r1 = K.rect(el.row1.b), r2 = K.rect(el.row2.b);
    K.pos(el.alpha, Math.max(r1.x + r1.w, r2.x + r2.w) + 48, G.upd.row1, 'cl');
  }

  // ===== animations

  function showPair(st, delay) {
    var blue = GF.parts.blue, rw = blue.el.row.w.__spans || {}, rb = blue.el.row.b.__spans || {};
    var from = { w: rw.dv ? K.rect(rw.dv) : null, b: rb.dv ? K.rect(rb.dv) : null };
    K.drawArrow(el.up, 500, delay);
    K.later(el.box, delay + 350);
    K.later(el.nabla, delay + 450);
    K.later(el.labW, delay + 550);
    K.later(el.labB, delay + 650);
    ['w', 'b'].forEach(function (who, j) {
      var cell = el.cell[who], g = who === 'w' ? st.g.w : st.g.b;
      K.temp(cell, 'opacity', '0');
      K.wait(delay + 750 + j * 300, function () {
        K.flyTex(M.fmtGrad(g), from[who] || K.rect(GF.parts.black.el.lbar.val), K.rect(cell), 900, 'k-purple', function () {
          cell.style.opacity = '';
          K.flash(cell);
        }, 26);
      });
    });
  }

  function showBack(delay) {
    K.drawArrow(el.main, 1300, delay);
    K.drawArrow(el.branch, 450, delay + 1000);
    K.later(el.word, delay + 900);
  }

  function update(st, delay) {
    var B = GF.parts.black;
    B.paintBox('w', st.w, false);
    B.paintBox('b', st.b, false);
    var keys = ['v', 'm', 'a', 't', 'g', 'eq', 'r'];
    ['w', 'b'].forEach(function (who, j) {
      var sp = el.row2[who].__spans || {};
      keys.forEach(function (k) { K.temp(sp[k], 'opacity', '0'); });
      var base = delay + 400 + j * 350;
      var flights = [
        { key: 'v', src: M.wrap(who === 'w' ? st.w : st.b), from: B.el[who].val },
        { key: 'a', src: M.fmt(st.alpha, 6), from: el.alpha },
        { key: 'g', src: gwrap(who === 'w' ? st.g.w : st.g.b), from: el.cell[who] }
      ];
      K.wait(base, function () { ['m', 't'].forEach(function (k) { sp[k].style.opacity = ''; }); });
      var left = flights.length;
      flights.forEach(function (f, i) {
        K.wait(base + i * 200, function () {
          K.flyTex(f.src, K.rect(f.from), K.rect(sp[f.key]), 800, 'k-purple', function () {
            sp[f.key].style.opacity = '';
            if (--left > 0) return;
            K.wait(300, function () { sp.eq.style.opacity = ''; sp.r.style.opacity = ''; K.flash(sp.r); });
          }, 23);
        });
      });
    });
    // both new numbers fly down the bracket into their boxes at once, and both grasshoppers hop
    K.wait(delay + 2900, function () {
      K.pulse(el.main.line);
      K.pulse(el.branch.line);
      ['w', 'b'].forEach(function (who) {
        var sp = el.row2[who].__spans || {}, v = who === 'w' ? st.wNext : st.bNext;
        K.flyTex(M.fmt(v), K.rect(sp.r), K.rect(B.el[who].val), 900, 'k-purple', function () {
          B.paintBox(who, v, false);
          K.flash(B.el[who].val);
          GF.hopper.jump(GF.hopper[who], GF.hopper.perchPose(who), 520, 45);
        }, 28);
      });
    });
  }

  function animate(st, prev) {
    var later = st.iter > 1, blue = GF.parts.blue;
    if (st.is('purple', 'grad')) {
      if (prev && prev.iter === st.iter && blue.hopped(prev) === 'b') blue.hopBack('b', st, 100);
      showPair(st, 300);
      if (later) showBack(2400);
    } else if (st.is('purple', 'back')) {
      showBack(0);
    } else if (st.is('purple', 'update')) {
      update(st, 0);
    }
  }

  GF.parts.purple = {
    steps: function (iter, mode) {
      if (mode === 3) return [];
      return iter === 1 ? ['grad', 'back', 'update'] : ['grad', 'update'];
    },
    build: build, render: render, animate: animate,
    el: el
  };
})();
