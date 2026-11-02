/* purple.js: the purple part, the gradient and the backward pass, as GF.parts.purple.
 *
 * Iteration 1, one click each:
 *   grad     the two slopes stand together as one pair: an arrow from lbar up to a box of two
 *            cells, nabla lbar = (dlbar/dw, dlbar/db) = (627, 45); the two numbers fly in from the
 *            grounds, the grounds go and the grasshoppers jump back onto their boxes
 *   back     the bracket of the backward pass, from the pair over the top into w and into b
 *   formula  the two updates, w <- w - alpha dlbar/dw and b <- b - alpha dlbar/db, and alpha
 *   update   the numbers fly in, w <- -1 - 0.01 x 627 = -7.27 and b <- 60 - 0.01 x 45 = 59.55; both
 *            new values fly down the bracket at once and both grasshoppers hop
 * Iteration 2 on, two clicks:
 *   grad     all of grad, back and formula at once
 *   update   as above
 * At speed 3 (the jumps only) there is no purple part: the next iteration's forward pass shows the
 * new pair.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = { cell: {}, row1: {}, row2: {} };

  function build(layer) {
    var P = G.edges('grad');
    el.box = K.div('box pair vis', layer.mid);
    el.box.style.left = P.x + 'px';
    el.box.style.top = P.y + 'px';
    el.box.style.width = P.w + 'px';
    el.box.style.height = P.h + 'px';
    ['w', 'b'].forEach(function (who) {
      var c = K.div('pcell', el.box);
      el.cell[who] = K.div('val', c);
    });

    function lab(tex, at, cls) {
      var d = K.div('lab vis' + (cls ? ' ' + cls : ''), layer.mid);
      K.tex(d, tex);
      K.pos(d, at[0], at[1], at[2]);
      return d;
    }
    el.nabla = lab('\\nabla \\bar\\ell =', [P.left - 10, P.cy, 'cr']);
    el.labW = lab('\\dfrac{\\partial \\bar\\ell}{\\partial w}', G.label.gw, 'grad-lab');
    el.labB = lab('\\dfrac{\\partial \\bar\\ell}{\\partial b}', G.label.gb, 'grad-lab');

    var R = G.bracketRoutes();
    el.aUp = K.arrow(layer.back, R.up, '');
    el.aBack = K.arrow(layer.back, R.main, 'back', { r: 22, size: 17 });
    el.aBackB = K.arrow(layer.back, R.branch, 'back', { size: 17 });

    el.word = K.div('word vis', layer.mid);
    el.word.textContent = 'backward pass';
    K.pos(el.word, G.label.backward[0], G.label.backward[1], G.label.backward[2]);

    var U = G.upd;
    ['w', 'b'].forEach(function (who) {
      el.row1[who] = K.div('lab update-row vis', layer.mid);
      K.tex(el.row1[who], who + ' \\;\\leftarrow\\; ' + who + ' - \\alpha\\,\\dfrac{\\partial \\bar\\ell}{\\partial ' + who + '}');
      K.pos(el.row1[who], U[who], U.row1, 'cl');
      el.row2[who] = K.div('lab update-row numbers vis', layer.mid);
      K.pos(el.row2[who], U[who], U.row2, 'cl');
    });
    el.alpha = K.div('lab alpha-lab vis', layer.mid);
    K.pos(el.alpha, U.alpha, U.row1, 'cl');
  }

  function rowPieces(who, v, g, alpha, next) {
    return [
      { key: 'lhs', tex: who + ' \\;\\leftarrow\\;' },
      { key: 'v', tex: M.wrap(v) },
      { key: 'm', tex: '-' },
      { key: 'a', tex: M.fmt(alpha, 6) },
      { key: 't', tex: '\\times' },
      { key: 'g', tex: M.wrap(g) },
      { key: 'eq', tex: '=' },
      { key: 'r', tex: M.fmt(next) }
    ];
  }

  function render(st) {
    var later = st.iter > 1;
    var on = st.partReached('purple');
    var grad = on && (later || st.reached('purple', 'grad'));
    var back = on && (later || st.reached('purple', 'back'));
    var formula = on && (later || st.reached('purple', 'formula'));
    var upd = st.reached('purple', 'update');
    var g = M.grad(st.w, st.b);

    K.show(el.box, grad); K.show(el.nabla, grad); K.show(el.labW, grad); K.show(el.labB, grad);
    K.show(el.aUp.g, grad);
    K.tex(el.cell.w, M.fmtGrad(g.w));
    K.tex(el.cell.b, M.fmtGrad(g.b));
    K.fit(el.cell.w, G.box.grad.w / 2 - 12);
    K.fit(el.cell.b, G.box.grad.w / 2 - 12);
    K.show(el.aBack.g, back); K.show(el.aBackB.g, back); K.show(el.word, back);
    K.show(el.row1.w, formula); K.show(el.row1.b, formula); K.show(el.alpha, formula);
    K.tex(el.alpha, '\\alpha = ' + M.fmt(st.alpha, 6));

    K.show(el.row2.w, upd); K.show(el.row2.b, upd);
    K.row(el.row2.w, rowPieces('w', st.w, g.w, st.alpha, st.wNext));
    K.row(el.row2.b, rowPieces('b', st.b, g.b, st.alpha, st.bNext));
    K.fit(el.row2.w, G.upd.b - G.upd.w - 30);
    K.fit(el.row2.b, G.upd.alpha - G.upd.b - 30);
  }

  // Both grasshoppers jump from wherever the blue part left them back onto their boxes.
  function jumpHome(st, delay) {
    ['w', 'b'].forEach(function (who, i) {
      var h = GF.hopper[who], home = GF.hopper.perchPose(who), from = st.hopFrom && st.hopFrom[who];
      if (!from || (Math.abs(from.x - home.x) < 1 && Math.abs(from.y - home.y) < 1)) return;
      h.setPose(from);
      K.wait((delay || 0) + i * 150, function () { GF.hopper.jump(h, home, 1000, 160); });
    });
  }

  // The pair appears and the two derivatives fly in from the grounds.
  function showGrad(delay) {
    var P = GF.parts.ground.el;
    K.drawArrow(el.aUp, 500, delay);
    K.later(el.box, delay + 300);
    K.later(el.nabla, delay + 500);
    K.later(el.labW, delay + 500);
    K.later(el.labB, delay + 500);
    ['w', 'b'].forEach(function (who, i) {
      var cell = el.cell[who], src = P[who].row.__spans && P[who].row.__spans.v;
      K.temp(cell, 'opacity', '0');
      K.wait(delay + 250 + i * 200, function () {
        if (!src) { cell.style.opacity = ''; return; }
        K.flyTex(cell.__tex, K.rect(src), K.rect(cell), 900, 'k-purple', function () {
          cell.style.opacity = '';
          K.flash(cell);
        }, 30);
      });
    });
  }

  function showBack(delay) {
    K.drawArrow(el.aBack, 1100, delay);
    K.temp(el.aBackB.line, 'opacity', '0');
    K.temp(el.aBackB.head, 'opacity', '0');
    K.wait(delay + 700, function () {
      el.aBackB.line.style.opacity = '';
      K.drawArrow(el.aBackB, 300, 0);
    });
    K.later(el.word, delay + 900);
  }

  function update(st, delay) {
    var bl = GF.parts.black.el, g = M.grad(st.w, st.b);
    var left = 2;
    ['w', 'b'].forEach(function (who) {
      var sp = el.row2[who].__spans || {};
      ['lhs', 'v', 'm', 'a', 't', 'g', 'eq', 'r'].forEach(function (k) { if (sp[k]) K.temp(sp[k], 'opacity', '0'); });
      // the box keeps its old value until the new one lands
      K.tex(bl[who].val, M.fmt(st[who]));
      K.wait(delay, function () {
        ['lhs', 'm', 't'].forEach(function (k) { sp[k].style.opacity = ''; });
        var flights = [
          { src: M.wrap(st[who]), from: bl[who].val, key: 'v' },
          { src: M.fmt(st.alpha, 6), from: el.alpha, key: 'a' },
          { src: M.wrap(g[who]), from: el.cell[who], key: 'g' }
        ];
        var n = flights.length;
        flights.forEach(function (f, i) {
          K.wait(i * 220, function () {
            K.flyTex(f.src, K.rect(f.from), K.rect(sp[f.key]), 800, 'k-purple', function () {
              sp[f.key].style.opacity = '';
              if (--n > 0) return;
              K.wait(300, function () {
                sp.eq.style.opacity = '';
                sp.r.style.opacity = '';
                K.flash(sp.r);
                if (--left === 0) K.wait(700, function () { land(st); });
              });
            }, 24);
          });
        });
      });
    });
  }

  // Both new values fly down the bracket into their boxes at once; the grasshoppers hop.
  function land(st) {
    var bl = GF.parts.black.el;
    K.pulse(el.aBack.line);
    K.pulse(el.aBackB.line);
    ['w', 'b'].forEach(function (who) {
      var nv = who === 'w' ? st.wNext : st.bNext, sp = el.row2[who].__spans;
      K.flyTex(M.fmt(nv), K.rect(sp.r), K.rect(bl[who].val), 900, 'k-purple', function () {
        K.tex(bl[who].val, M.fmt(nv));
        K.fit(bl[who].val, G.box[who].w - 14);
        K.flash(bl[who].val);
        GF.hopper.jump(GF.hopper[who], GF.hopper.perchPose(who), 520, 45);
      }, 30);
    });
  }

  function animate(st) {
    var later = st.iter > 1;
    if (st.is('purple', 'grad') && !later) {
      showGrad(0);
      jumpHome(st, 900);
    } else if (st.is('purple', 'grad') && later) {
      showGrad(0);
      jumpHome(st, 900);
      showBack(1700);
      K.later(el.row1.w, 2800);
      K.later(el.row1.b, 2900);
      K.later(el.alpha, 3000);
    } else if (st.is('purple', 'back')) {
      showBack(0);
    } else if (st.is('purple', 'formula')) {
      K.later(el.row1.b, 400);
      K.later(el.alpha, 800);
    } else if (st.is('purple', 'update')) {
      update(st, 100);
    }
  }

  GF.parts.purple = {
    steps: function (iter, ctx) {
      if (ctx && ctx.mode === 3) return [];
      return iter === 1 ? ['grad', 'back', 'formula', 'update'] : ['grad', 'update'];
    },
    build: build, render: render, animate: animate,
    el: el
  };
})();
