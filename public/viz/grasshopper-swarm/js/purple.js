/* purple.js: the purple part, the gradient and the backward pass, as GF.parts.purple (the design of
 * GRADIENTS.md, "Purple").
 *
 * The two columns of the gradient, d lbar / d w and d lbar / d b, are drawn here from the moment
 * the blue part makes them (blue:cell): four purple cells each, row j beside row j of w and b.
 *
 * Iteration 1, one click each:
 *   bracket  the bracket of the gradient grows from lbar up, left over the top and down into the
 *            columns w and b, the two gradient columns hanging under its top bar; nabla lbar; the
 *            words "backward pass"
 *   formula  w_j <- w_j - alpha d lbar / d w_j and b_j <- b_j - alpha d lbar / d b_j, and alpha
 *   one      grasshopper w_1's update in numbers: w_1 <- 1 - 0.003 x (-224.63) = 1.6739; it
 *            crouches; nothing moves yet
 *   all      one update per grasshopper: each new number runs from its row of the gradient along
 *            the bracket into its own row of w or b, row by row within about a second, and each
 *            grasshopper jumps as its number lands; the bends and the curve move in the plot
 * Iteration 2 on, one click:
 *   update   as all (the bracket and the formula are in view from iteration 2 on)
 * At speed 3 (the jumps only) purple has no click: the update shows as black:jump, the next
 * iteration's numbers.
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS, MM = T.m;
  var el = { cells: { w: [], b: [] }, frame: {}, lab: {} };

  function build(layer) {
    var mid = layer.mid;
    ['w', 'b'].forEach(function (which) {
      var name = 'g' + which, f = G.mframe(name, 1);
      el.frame[which] = K.div('col vis', mid);
      el.frame[which].style.left = f.x + 'px';
      el.frame[which].style.top = f.y + 'px';
      el.frame[which].style.width = f.w + 'px';
      el.frame[which].style.height = f.h + 'px';
      for (var j = 0; j < MM; j++) {
        var c = G.mcell(name, j), d = K.div('cell vis' + (j ? ' sep' : ''), mid);
        d.style.left = c.x + 'px';
        d.style.top = c.y + 'px';
        d.style.width = c.w + 'px';
        d.style.height = c.h + 'px';
        el.cells[which].push({ d: d, v: K.div('v vis', d, 'span') });
      }
      el.lab[which] = K.div('lab vis grad-lab', mid);
      K.tex(el.lab[which], '\\dfrac{\\partial \\bar\\ell}{\\partial ' + which + '}');
      K.pos(el.lab[which], f.cx, f.bottom + 6, 'tc');
    });

    var R = G.bracketRoutes();
    el.main = K.arrow(layer.back, R.main, 'back', { r: 20, size: 17 });
    el.branch = K.arrow(layer.back, R.branch, 'back', { size: 17 });
    el.hangW = K.svg('path', { d: K.route(R.hangW) }, layer.back, 'hang vis');
    el.hangB = K.svg('path', { d: K.route(R.hangB) }, layer.back, 'hang vis');
    el.nabla = K.div('lab vis name', mid);
    K.tex(el.nabla, '\\nabla\\bar\\ell');
    K.pos(el.nabla, G.label.nabla[0], G.label.nabla[1], G.label.nabla[2]);
    el.word = K.div('word vis', mid);
    el.word.textContent = 'backward pass';
    K.pos(el.word, G.label.backward[0], G.label.backward[1], G.label.backward[2]);

    el.row1 = K.div('lab update-row vis', mid);
    K.tex(el.row1, 'w_j \\;\\leftarrow\\; w_j - \\alpha\\,\\tfrac{\\partial \\bar\\ell}{\\partial w_j}' +
      '\\qquad\\quad b_j \\;\\leftarrow\\; b_j - \\alpha\\,\\tfrac{\\partial \\bar\\ell}{\\partial b_j}');
    K.pos(el.row1, G.band.x, G.band.y1 - 6, 'cl');
    el.alpha = K.div('lab alpha-lab vis', mid);
    el.row2 = K.div('lab update-row vis', mid);
    K.pos(el.row2, G.band.x, G.band.y2 - 4, 'cl');
  }

  // Which cells of the gradient hold their slope: iteration 1 fills them as the swarm measures
  // (blue:cell w_1, b1 b_1, n2 row 2, swarm the rest); later iterations at blue:hops.
  function filled(st) {
    var f = { w: [], b: [] }, j;
    for (j = 0; j < MM; j++) { f.w.push(false); f.b.push(false); }
    function row(j) { f.w[j] = true; f.b[j] = true; }
    if (st.iter > 1) {
      if (st.reached('blue', 'hops') || st.reached('blue', 'direct') || st.reached('black', 'jump')) {
        for (j = 0; j < MM; j++) row(j);
      }
      return f;
    }
    if (st.reached('blue', 'direct')) for (j = 0; j < MM; j++) row(j);
    if (st.reached('blue', 'cell')) f.w[0] = true;
    if (st.reached('blue', 'b1')) f.b[0] = true;
    if (st.reached('blue', 'n2')) row(1);
    if (st.reached('blue', 'swarm')) for (j = 2; j < MM; j++) row(j);
    return f;
  }

  function shows(st) {
    var later = st.iter > 1;
    return {
      cols: later || st.reached('blue', 'cell') || st.reached('blue', 'direct'),
      bracket: later || st.reached('purple', 'bracket'),
      formula: (later && st.iter < st.K) || st.reached('purple', 'formula'),
      one: st.iter === 1 && st.reached('purple', 'one')
    };
  }

  function rowPieces(st) {
    var j = 0, v = st.P.w[j], g = st.G.w[j];
    return [
      { key: 'lhs', tex: 'w_1 \\;\\leftarrow{}' },
      { key: 'v', tex: M.wrap(v) },
      { key: 'm', tex: '{}-{}' },
      { key: 'a', tex: M.fmt(st.alpha, 6) },
      { key: 't', tex: '{}\\times{}' },
      { key: 'g', tex: '(' + M.fmtGrad(g) + ')' },
      { key: 'eq', tex: '{}={}' },
      { key: 'r', tex: M.fmt(st.Pn.w[j]) }
    ];
  }

  function render(st) {
    var s = shows(st), f = filled(st), story = st.part === 'story';
    ['w', 'b'].forEach(function (which) {
      K.show(el.frame[which], s.cols && !story);
      K.show(el.lab[which], s.cols && !story);
      el.cells[which].forEach(function (c, j) {
        K.show(c.d, s.cols && !story);
        K.show(c.v, f[which][j]);
        GF.parts.black.setNum(c.v, M.fmtGrad(st.G[which][j]));
        c.d.classList.remove('lit');
      });
    });
    var br = s.bracket && !story;
    [el.main.g, el.branch.g, el.hangW, el.hangB, el.nabla, el.word].forEach(function (e) { K.show(e, br); });
    K.show(el.row1, s.formula && !story);
    K.show(el.alpha, s.formula && !story);
    K.tex(el.alpha, '\\alpha = ' + M.fmt(st.alpha, 6));
    var r1 = K.rect(el.row1);
    K.pos(el.alpha, r1.x + r1.w + 56, G.band.y1 - 6, 'cl');
    K.show(el.row2, s.one);
    if (s.one) K.row(el.row2, rowPieces(st));

    // the grasshopper of w_1 crouches, ready to jump, until all of them jump
    if (s.one && !st.reached('purple', 'all')) {
      GF.hopper.swarm.w[0].setPose(GF.hopper.crouchPose('w', 0));
    }
  }

  // After the update the plot shows where the numbers went: the new bends and the new curve; the
  // gaps wait for the next forward pass.
  function plot(st, o) {
    var upd = st.reached('purple', 'all') || st.reached('purple', 'update');
    if (!upd) return;
    if (o.bends) o.bends = st.Pn;
    if (o.curve) { o.curve = st.Pn; o.reading = st.Pn; }
    o.marks = null;
    o.gaps = false;
  }

  // ===== animations

  function showBracket(delay) {
    K.drawArrow(el.main, 1300, delay);
    K.drawArrow(el.branch, 450, delay + 1000);
    K.later(el.hangW, delay + 700);
    K.later(el.hangB, delay + 650);
    K.later(el.nabla, delay + 900);
    K.later(el.word, delay + 1100);
  }

  // the path a new number takes: up from its cell of the gradient, along the top bar, down into
  // its own row of w or b
  function trainPath(which, j) {
    var g = G.mcell('g' + which, j), c = G.mcell(which, j), gf = G.mframe('g' + which, 1), f = G.mframe(which, 1);
    return [[g.cx, g.cy], [gf.cx, gf.top - 6], [gf.cx, G.top], [f.cx, G.top], [f.cx, f.top - 6], [c.cx, c.cy]];
  }

  // one update per grasshopper: the train of new numbers, row by row; each lands on its own cell
  // and its grasshopper jumps
  function updateAll(st, delay) {
    var B = GF.parts.black, cells = B.el.m;
    // the columns keep the old numbers until each new one lands
    for (var j = 0; j < MM; j++) {
      B.setNum(cells.w.cells[j].v, M.fmt(st.P.w[j]));
      B.setNum(cells.b.cells[j].v, M.fmt(st.P.b[j]));
    }
    K.pulse(el.main.line, delay);
    K.pulse(el.branch.line, delay + 300);
    for (j = 0; j < MM; j++) {
      ['w', 'b'].forEach(function (which, q) {
        (function (j, which) {
          K.wait(delay + j * 260 + q * 110, function () {
            var v = st.Pn[which][j];
            K.flyPath(M.fmt(v), trainPath(which, j), 1100, 'k-purple', function () {
              var c = cells[which].cells[j];
              B.setNum(c.v, M.fmt(v));
              K.flash(c.v);
              GF.hopper.jump(GF.hopper.swarm[which][j], GF.hopper.perchPose(which, j), 420, 26);
            }, 18);
          });
        })(j, which);
      });
    }
    // the plot keeps the old bends and curve while the numbers travel, then glides to the new ones
    glide(st, st.P, st.Pn, delay + MM * 260 + 1100, 900);
  }

  // The plot's bends and curve glide from the numbers from to the numbers to, after delay, over ms;
  // they show from at once. Also speed 3's jump (black:jump). The next render draws the state again.
  function glide(st, from, to, delay, ms) {
    var shown = GF.parts.black.shows(st);
    function at(e) {
      var w = [], b = [];
      for (var q = 0; q < MM; q++) {
        w.push(from.w[q] + (to.w[q] - from.w[q]) * e);
        b.push(from.b[q] + (to.b[q] - from.b[q]) * e);
      }
      var P = M.params(w, b);
      GF.plot.render({ axes: true, points: true, question: true, bends: shown.bends ? P : null,
                       curve: shown.curve ? P : null, reading: shown.curve ? P : null });
    }
    at(0);
    K.wait(delay, function () { K.tween(ms, at, K.ease.inOut, function () { GF.engine.replot(st); }); });
  }

  function animate(st) {
    if (st.is('purple', 'bracket')) {
      showBracket(0);
    } else if (st.is('purple', 'formula')) {
      K.later(el.alpha, 500);
    } else if (st.is('purple', 'one')) {
      var B = GF.parts.black, sp = el.row2.__spans || {};
      ['v', 'a', 'g', 'eq', 'r'].forEach(function (k) { K.temp(sp[k], 'opacity', '0'); });
      var gw = el.cells.w[0].v;
      var flights = [
        { key: 'v', src: M.wrap(st.P.w[0]), from: B.el.m.w.cells[0].v },
        { key: 'a', src: M.fmt(st.alpha, 6), from: el.alpha },
        { key: 'g', src: '(' + M.fmtGrad(st.G.w[0]) + ')', from: gw }
      ];
      var left = flights.length;
      flights.forEach(function (f, i) {
        K.wait(300 + i * 220, function () {
          K.flyTex(f.src, K.rect(f.from), K.rect(sp[f.key]), 800, 'k-purple', function () {
            sp[f.key].style.opacity = '';
            if (--left > 0) return;
            K.wait(300, function () { sp.eq.style.opacity = ''; sp.r.style.opacity = ''; K.flash(sp.r); });
          }, 24);
        });
      });
      var h = GF.hopper.swarm.w[0];
      h.setPose(GF.hopper.perchPose('w', 0));
      GF.hopper.jump(h, GF.hopper.crouchPose('w', 0), 400, 0);
    } else if (st.is('purple', 'all') || st.is('purple', 'update')) {
      updateAll(st, 200);
    }
  }

  GF.parts.purple = {
    steps: function (iter, ctx) {
      if (ctx.mode === 3) return [];
      if (iter === 1) return ['bracket', 'formula', 'one', 'all'];
      return iter < ctx.K ? ['update'] : [];
    },
    build: build, render: render, plot: plot, animate: animate,
    el: el, filled: filled, glide: glide
  };
})();
