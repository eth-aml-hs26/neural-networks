/* ground.js: the ground under each grasshopper's feet, as GF.parts.ground. It has no clicks of its
 * own; the red and the blue clicks decide what it shows.
 *
 * Two plots on the right, one per grasshopper: the average loss lbar against w with b held (top)
 * and against b with w held (bottom). Each is the ground its grasshopper stands on: pieces of
 * parabolas, one piece for each set of days on which the heating runs. Red draws them (red:gw,
 * red:gb; red:plot later): the axes, the curve, the point where the pair stands, its two numbers on
 * the axes, the formula of the ground over the plot and a question mark under its lowest point.
 * While they show, the plot of y against x gives way (showing(st) says when).
 *
 * Blue zooms in on the feet of a grasshopper (blue:onw, blue:hopb; blue:measure later) until the
 * ground is a straight ramp, and draws the test hop on it: the hop eps along the axis, then the rise
 * (or drop) Delta_eps to the ground, a right triangle; over the plot, the slope Delta_eps / eps,
 * which then turns into its limit, the derivative.
 *
 * A view maps (v, l) to the stage: x = sx + (v - v0) kx, y = sy - (l - l0) ky, anchored on the
 * point (v0, l0) where the pair stands. The full view comes from the frame of the start
 * (GFMath.frames); the zoomed one makes eps G.EPS_PX wide and uses one vertical scale for both
 * grounds, so the steeper slope looks steeper. The zoom moves the point linearly across the stage
 * while the scales change geometrically.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var P = {};
  // the grasshoppers' scale on a ground, and on a magnified one (as on the page before: small on the
  // plot, big in the magnified view)
  var HS_FULL = 0.45, HS_ZOOM = 0.75;

  function lossAt(who, v, st) { return who === 'w' ? M.lbar(v, st.b) : M.lbar(st.w, v); }
  function derivAt(who, v, st) {
    var g = who === 'w' ? M.grad(v, st.b) : M.grad(st.w, v);
    return who === 'w' ? g.w : g.b;
  }

  // ===== views

  function fullView(who, st) {
    var Q = G.ground[who], Fr = who === 'w' ? st.F.W : st.F.B;
    var v = st[who], l = M.lbar(st.w, st.b);
    var kx = (Q.x1 - Q.x0) / (Fr.hi - Fr.lo), ky = (Q.oy - Q.ytop) / Fr.lmax;
    return { v0: v, l0: l, kx: kx, ky: ky, sx: Q.x0 + (v - Fr.lo) * kx, sy: Q.oy - l * ky, t: 0 };
  }

  function zoomView(who, st) {
    var Q = G.ground[who], h = M.hop(who, st.w, st.b, st.eps);
    var kx = G.EPS_PX / st.eps, ky = G.ZOOM_FILL * (Q.oy - Q.ytop) / st.F.zoom.big;
    return {
      v0: h.v, l0: h.l, kx: kx, ky: ky,
      sx: Q.x0 + G.HOP_AT * (Q.x1 - Q.x0), sy: (Q.oy + Q.ytop) / 2 + h.delta / 2 * ky, t: 1
    };
  }

  function mix(a, b, t) {
    function geo(p, q) { return Math.exp(Math.log(p) * (1 - t) + Math.log(q) * t); }
    return { v0: a.v0, l0: a.l0, kx: geo(a.kx, b.kx), ky: geo(a.ky, b.ky),
             sx: a.sx + (b.sx - a.sx) * t, sy: a.sy + (b.sy - a.sy) * t, t: t };
  }

  function sx(V, v) { return V.sx + (v - V.v0) * V.kx; }
  function sy(V, l) { return V.sy - (l - V.l0) * V.ky; }

  // ===== what a ground shows, from the state

  function stateOf(who, st) {
    var s = { shown: false, zoom: false, hopper: null, legs: 0, row: 'formula' };
    if (st.part === 'story' || st.partReached('purple') || st.partReached('coda')) return s;
    if (st.iter > 1) {
      s.shown = st.reached('red', 'plot');
      if (st.reached('blue', 'measure')) { s.zoom = true; s.hopper = 'point'; s.legs = 2; s.row = 'limit'; }
      return s;
    }
    if (who === 'w') {
      s.shown = st.reached('red', 'gw');
      if (!st.reached('blue', 'onw')) return s;
      s.zoom = true; s.hopper = 'point'; s.row = null;
      if (st.reached('blue', 'hopw')) { s.legs = 1; s.hopper = 'side'; }
      if (st.reached('blue', 'fwdw')) { s.legs = 2; s.hopper = 'up'; }
      if (st.reached('blue', 'slopew')) s.row = 'slope';
      if (st.reached('blue', 'limw')) { s.row = 'limit'; s.hopper = 'point'; }
      return s;
    }
    s.shown = st.reached('red', 'gb');
    if (!st.reached('blue', 'hopb')) return s;
    s.zoom = true; s.hopper = 'up'; s.legs = 2; s.row = null;
    if (st.reached('blue', 'slopeb')) { s.row = 'limit'; s.hopper = 'point'; }
    return s;
  }

  // ===== build

  function lab(layer, cls) { return K.div('lab vis ' + (cls || ''), layer); }

  function glassGlyph(parent, cls) {
    var gl = K.svg('g', null, parent, cls);
    K.svg('circle', { cx: 0, cy: 0, r: 26 }, gl, 'glass-lens');
    K.svg('path', { d: 'M 18.4 18.4 L 38 38' }, gl, 'glass-handle');
    return gl;
  }

  function buildOne(who, layer, defs) {
    var Q = G.ground[who], o = { who: who };
    var clipId = 'gclip-' + who;
    var cp = K.svg('clipPath', { id: clipId }, defs);
    K.svg('rect', { x: Q.x0 - 3, y: Q.yend + 4, width: Q.x1 - Q.x0 + 30, height: Q.oy - Q.yend - 4 }, cp);

    o.g = K.svg('g', null, layer.back, 'ground vis');
    o.axX = K.arrow(o.g, [[Q.ox - 12, Q.oy], [Q.xend, Q.oy]], 'axis on', { size: 13 });
    o.axY = K.arrow(o.g, [[Q.ox, Q.oy + 12], [Q.ox, Q.yend]], 'axis on', { size: 13 });
    var clipped = K.svg('g', { 'clip-path': 'url(#' + clipId + ')' }, o.g);
    o.guideV = K.svg('path', null, clipped, 'guide vis');
    o.guideH = K.svg('path', null, clipped, 'guide vis');
    o.guideVp = K.svg('path', null, clipped, 'guide k-blue vis');
    o.guideHp = K.svg('path', null, clipped, 'guide k-blue vis');
    o.curve = K.svg('path', null, clipped, 'curve vis');
    o.legH = K.svg('path', null, clipped, 'leg k-blue vis');
    o.legV = K.svg('path', null, clipped, 'leg k-blue vis');
    o.end = K.svg('circle', { r: 6 }, clipped, 'hop-end k-blue vis');
    o.point = K.svg('circle', { r: 9 }, clipped, 'point vis');
    // the magnifying glass of the page before this one: it lands on the point when the zoom
    // starts, and a small one stays in the corner of a magnified ground
    o.glass = glassGlyph(o.g, 'glass-fly k-blue');
    o.mark = glassGlyph(o.g, 'glass k-blue vis');
    o.mark.setAttribute('transform', 'translate(' + (Q.x1 + 4) + ' ' + (Q.yend + 28) + ') scale(0.5)');

    o.labV = lab(layer.mid, 'axis-lab');
    K.tex(o.labV, who);
    K.pos(o.labV, Q.xend + 10, Q.oy, 'cl');
    o.labL = lab(layer.mid, 'axis-lab');
    K.tex(o.labL, '\\bar\\ell');
    K.pos(o.labL, Q.ox, Q.yend - 6, 'bc');
    o.tickV = lab(layer.mid, 'tick');
    o.tickL = lab(layer.mid, 'tick');
    o.tickVp = lab(layer.mid, 'tick k-blue');
    o.tickLp = lab(layer.mid, 'tick k-blue');
    o.q = lab(layer.mid, 'question');
    K.tex(o.q, '?');
    o.formula = lab(layer.mid, 'plot-formula');
    K.pos(o.formula, Q.row[0], Q.row[1], 'cl');
    o.epsLab = lab(layer.mid, 'leg-lab k-blue');
    o.delLab = lab(layer.mid, 'leg-lab k-blue');
    o.row = lab(layer.mid, 'slope-row k-blue');
    K.pos(o.row, Q.row[0], Q.row[1], 'cl');
    P[who] = o;
  }

  function build(layer) {
    var defs = K.svg('defs', null, layer.back);
    buildOne('w', layer, defs);
    buildOne('b', layer, defs);
  }

  // ===== draw one ground for the view V

  // The formula of a ground, with the number held written in: for w = -1,
  // lbar(b) = 1/6 sum_i (y_i - ReLU(-x_i + b))^2.
  function groundFormula(who, st) {
    var head = '\\bar\\ell(' + who + ') = \\tfrac{1}{6}\\textstyle\\sum_i \\big(y_i - \\mathrm{ReLU}(';
    if (who === 'w') {
      var b = M.fmt(st.b);
      return head + 'x_i\\,w ' + (b.charAt(0) === '-' ? '- ' + b.slice(1) : '+ ' + b) + ')\\big)^2';
    }
    var w = M.fmt(st.w), c = w === '1' ? '' : w === '-1' ? '-' : w + '\\,';
    return head + c + 'x_i + b)\\big)^2';
  }

  function slopePieces(h) {
    var S = M.hopShown(h);
    return [{ key: 'lhs', tex: '\\dfrac{\\Delta_\\varepsilon}{\\varepsilon} =' },
            { key: 'd', tex: '\\dfrac{' + S.delta + '}{' + S.eps + '}' },
            { key: 'eq', tex: '=' }, { key: 'v', tex: S.slope }];
  }

  function limitPieces(h, val) {
    return [{ key: 'lhs', tex: '\\dfrac{\\partial \\bar\\ell}{\\partial ' + h.who + '} = \\lim\\limits_{\\varepsilon \\to 0} \\dfrac{\\Delta_\\varepsilon}{\\varepsilon} =' },
            { key: 'v', tex: val === undefined ? M.fmtGrad(h.deriv) : val }];
  }

  function path(pts) {
    return pts.map(function (p, i) { return (i ? 'L ' : 'M ') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  }

  // The grasshopper's angle on the ground at v: along the curve, at most 38 degrees.
  function tilt(who, st, V, v) {
    var a = -Math.atan(derivAt(who, v, st) * V.ky / V.kx) * 180 / Math.PI;
    return Math.max(-38, Math.min(38, a));
  }

  function draw(who, st, V, s) {
    var o = P[who], Q = G.ground[who], h = M.hop(who, st.w, st.b, st.eps);
    // the curve, sampled across the plot
    var pts = [], n = 180;
    for (var i = 0; i <= n; i++) {
      var X = Q.x0 + (Q.x1 - Q.x0) * i / n, v = V.v0 + (X - V.sx) / V.kx;
      var Y = sy(V, lossAt(who, v, st));
      pts.push([X, Math.max(-5000, Math.min(5000, Y))]);
    }
    o.curve.setAttribute('d', path(pts));

    var S = [sx(V, h.v), sy(V, h.l)], E = [sx(V, h.vp), sy(V, h.lp)], C = [E[0], S[1]];
    o.point.setAttribute('cx', S[0].toFixed(1));
    o.point.setAttribute('cy', S[1].toFixed(1));
    o.guideV.setAttribute('d', path([S, [S[0], Q.oy]]));
    o.guideH.setAttribute('d', path([S, [Q.ox, S[1]]]));
    o.guideVp.setAttribute('d', path([C, [C[0], Q.oy]]));
    o.guideHp.setAttribute('d', path([E, [Q.ox, E[1]]]));
    o.legH.setAttribute('d', path([S, C]));
    o.legV.setAttribute('d', path([C, E]));
    o.end.setAttribute('cx', E[0].toFixed(1));
    o.end.setAttribute('cy', E[1].toFixed(1));

    var HS = M.hopShown(h);
    K.tex(o.tickV, M.fmt(h.v));
    K.pos(o.tickV, S[0], Q.oy + 12, 'tc');
    K.tex(o.tickL, V.t > 0.5 ? HS.l0 : M.fmt(h.l));
    K.pos(o.tickL, Q.ox - 12, S[1], 'cr');
    K.tex(o.tickVp, M.fmt(h.vp));
    K.pos(o.tickVp, E[0], Q.oy + 12, 'tc');
    K.tex(o.tickLp, HS.l1);
    K.pos(o.tickLp, Q.ox - 12, E[1], 'cr');

    // the labels of the two legs. eps goes under the run: outside the triangle when the ground
    // rises, inside it near the right angle when the ground falls and the triangle is tall, and
    // under the ramp and the end of the hop when it falls and the triangle is flat (the grasshopper
    // stands over the run). Delta goes
    // beside the middle of a tall rise, else beside the right angle (rising) or past the end of the
    // hop (falling), where the ramp leaves room.
    var up = h.delta >= 0, tall = Math.abs(E[1] - C[1]) > 70;
    K.tex(o.epsLab, '\\varepsilon = ' + M.fmt(h.eps));
    if (up) K.pos(o.epsLab, (S[0] + C[0]) / 2, S[1] + 10, 'tc');
    else if (tall) K.pos(o.epsLab, C[0] - 8, S[1] + 10, 'tr');
    else K.pos(o.epsLab, (S[0] + C[0]) / 2, Math.max((S[1] + E[1]) / 2 + 14, E[1] + 6), 'tc');
    K.tex(o.delLab, '\\Delta_\\varepsilon = ' + HS.delta);
    if (tall) K.pos(o.delLab, C[0] + 12, (C[1] + E[1]) / 2, 'cl');
    else if (up) K.pos(o.delLab, C[0] + 12, C[1] + 6, 'tl');
    else K.pos(o.delLab, E[0] + 12, E[1] - 12, 'bl');

    // the question mark under the lowest point of this ground
    var vmin = M.lowest(who, who === 'w' ? st.b : st.w);
    var qx = sx(V, vmin);
    K.pos(o.q, qx, Q.oy + 10, 'tc');
    o.qFits = qx > Q.x0 && qx < Q.x1 && Math.abs(qx - S[0]) > 70;

    // the grasshopper on this ground
    if (s.hopper) {
      var hp = GF.hopper[who], at = s.hopper === 'point' ? S : s.hopper === 'side' ? C : E;
      var ang = s.hopper === 'side' ? 0 : tilt(who, st, V, s.hopper === 'point' ? h.v : h.vp);
      hp.place(at[0], at[1], ang, HS_FULL + (HS_ZOOM - HS_FULL) * V.t, 1);
    }
    o.S = S; o.E = E; o.C = C;
    return o;
  }

  function showAll(who, st, s) {
    var o = P[who], z = s.zoom, on = s.shown;
    K.show(o.g, on);
    // magnified, the ground takes the blue of the measuring part: its axes, their numbers, a glass
    o.g.classList.toggle('zoomed', z);
    [o.labV, o.labL, o.tickV, o.tickL].forEach(function (e) { e.classList.toggle('k-blue', z); });
    K.show(o.mark, on && z);
    [o.labV, o.labL, o.tickV, o.tickL, o.point, o.guideV, o.guideH, o.curve].forEach(function (e) { K.show(e, on); });
    K.show(o.formula, on && !z);
    K.show(o.q, on && !z && o.qFits);
    K.show(o.legH, on && z && s.legs >= 1);
    K.show(o.tickVp, on && z && s.legs >= 1);
    K.show(o.guideVp, on && z && s.legs >= 1);
    K.show(o.epsLab, on && z && s.legs >= 1);
    var two = on && z && s.legs >= 2;
    K.show(o.legV, two);
    K.show(o.end, two);
    K.show(o.delLab, two);
    K.show(o.guideHp, two);
    // the two numbers of the loss on the axis, unless they would sit on each other
    K.show(o.tickLp, two && Math.abs(o.E[1] - o.S[1]) > 30);
    K.show(o.row, on && z && !!s.row);
  }

  function renderOne(who, st) {
    var o = P[who], s = stateOf(who, st);
    o.state = s;
    var V = s.zoom ? zoomView(who, st) : fullView(who, st);
    draw(who, st, V, s);
    K.tex(o.formula, groundFormula(who, st));
    K.fit(o.formula, G.W - 12 - G.ground[who].row[0]);
    var h = M.hop(who, st.w, st.b, st.eps);
    if (s.row === 'slope') K.row(o.row, slopePieces(h));
    else if (s.row === 'limit') K.row(o.row, limitPieces(h));
    showAll(who, st, s);
    if (s.hopper) GF.hopper[who].show(true);
  }

  function render(st) {
    renderOne('w', st);
    renderOne('b', st);
  }

  // ===== animation

  // The zoom from the full view to the zoomed one: a glass lands on the point, then the ground
  // grows round it while the glass grows and fades; the grasshopper rides its point.
  function zoomIn(who, st, delay, ms, done) {
    var o = P[who], s = o.state, a = fullView(who, st), b = zoomView(who, st);
    var tmp = { shown: true, zoom: false, hopper: s.hopper ? 'point' : null, legs: 0 };
    var blue = [o.labV, o.labL, o.tickV, o.tickL];
    o.g.classList.remove('zoomed');
    blue.forEach(function (e) { e.classList.remove('k-blue'); });
    K.temp(o.mark, 'opacity', '0');
    K.temp(o.glass, 'opacity', '0');
    draw(who, st, a, tmp);
    var S0 = o.S.slice();
    function glass(x, y, k, op) {
      o.glass.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + k.toFixed(3) + ')');
      o.glass.style.opacity = String(op);
    }
    K.wait(delay, function () {
      K.tween(380, function (e) { glass(S0[0], S0[1], 0.3 + 0.7 * e, e); }, K.ease.out, function () {
        K.wait(250, function () {
          K.tween(ms, function (e) {
            draw(who, st, mix(a, b, e), tmp);
            glass(o.S[0], o.S[1], 1 + 3.5 * e, 1 - e);
          }, K.ease.inOut, function () {
            o.glass.style.opacity = '0';
            o.g.classList.add('zoomed');
            blue.forEach(function (e2) { e2.classList.add('k-blue'); });
            o.mark.style.opacity = '';
            draw(who, st, b, s);
            if (done) done();
          });
        });
      });
    });
  }

  // The grasshopper jumps from where it was (its box) onto its ground, at the point.
  function jumpOn(who, st, delay, then) {
    var h = GF.hopper[who], o = P[who];
    var V = fullView(who, st);
    var to = { x: sx(V, st[who]), y: sy(V, M.lbar(st.w, st.b)), a: tilt(who, st, V, st[who]), s: HS_FULL, f: 1 };
    h.setPose(st.hopFrom && st.hopFrom[who] ? st.hopFrom[who] : GF.hopper.perchPose(who));
    K.wait(delay, function () { GF.hopper.jump(h, to, 950, 170, then); });
    return o;
  }

  // Hide an element now; fade it in after delay.
  function later(e, delay) { K.later(e, delay); }

  function poseAt(who, st, which) {
    var o = P[who], V = zoomView(who, st), h = M.hop(who, st.w, st.b, st.eps);
    var at = which === 'point' ? o.S : which === 'side' ? o.C : o.E;
    var ang = which === 'side' ? 0 : tilt(who, st, V, which === 'point' ? h.v : h.vp);
    return { x: at[0], y: at[1], a: ang, s: HS_ZOOM, f: 1 };
  }

  // Ticks the value of the limit row through the slopes of smaller and smaller hops: the slope as
  // the slope row wrote it, then those of eps = 0.001, 0.0001, 0.00001, then the derivative.
  function tickLimit(who, st, delay) {
    var o = P[who], h = M.hop(who, st.w, st.b, st.eps);
    var seq = M.limitRow(who, st.w, st.b).slice(1).map(function (r) { return M.fmtSig(r.slope, 9); });
    seq.unshift(M.hopShown(h).slope);
    seq.push(M.fmtGrad(h.deriv));
    K.row(o.row, limitPieces(h, seq[0]));
    K.temp(o.row, 'opacity', '0');
    K.wait(delay, function () {
      o.row.style.opacity = '';
      seq.forEach(function (v, i) {
        K.wait(450 * (i + 1), function () {
          var sp = K.row(o.row, limitPieces(h, v));
          if (i === seq.length - 1) K.flash(sp.v);
        });
      });
    });
    return 450 * (seq.length + 1);
  }

  function slopeIn(who, st, delay) {
    var o = P[who], h = M.hop(who, st.w, st.b, st.eps);
    var sp = K.row(o.row, slopePieces(h));
    K.temp(o.row, 'opacity', '0');
    K.wait(delay, function () {
      o.row.style.opacity = '';
      ['d', 'eq', 'v'].forEach(function (k) { K.temp(sp[k], 'opacity', '0'); });
      var HS = M.hopShown(h);
      K.flyTex(HS.delta, K.rect(o.delLab), K.rect(sp.d), 700, 'k-blue', null, 21);
      K.flyTex(HS.eps, K.rect(o.epsLab), K.rect(sp.d), 700, 'k-blue', function () {
        sp.d.style.opacity = '';
        K.wait(300, function () { sp.eq.style.opacity = ''; sp.v.style.opacity = ''; K.flash(sp.v); });
      }, 21);
    });
  }

  // The whole measurement of one grasshopper: onto the ground, zoom, hop, forward pass, rise.
  function measure(who, st, opts) {
    var o = P[who], hp = GF.hopper[who], legsDelay;
    var withBoxes = opts.boxes, t0 = opts.delay || 0;
    // keep the zoomed pieces back until their moment
    [o.legH, o.legV, o.end, o.epsLab, o.delLab, o.tickVp, o.tickLp, o.guideVp, o.guideHp, o.row].forEach(function (e) {
      K.temp(e, 'opacity', '0');
    });
    jumpOn(who, st, t0);
    zoomIn(who, st, t0 + 1000, 1300, function () {
      hp.setPose(poseAt(who, st, 'point'));
      // the hop sideways
      GF.hopper.jump(hp, poseAt(who, st, 'side'), 650, 40);
      K.drawOn(o.legH, 600, 50);
      o.tickVp.style.opacity = ''; o.guideVp.style.opacity = '';
      K.wait(600, function () { o.epsLab.style.opacity = ''; });
      var rise = function () {
        GF.hopper.jump(hp, poseAt(who, st, 'up'), 600, 12);
        o.legV.style.opacity = '';
        K.drawOn(o.legV, 500, 100);
        K.wait(550, function () {
          o.end.style.opacity = ''; o.delLab.style.opacity = '';
          o.tickLp.style.opacity = ''; o.guideHp.style.opacity = '';
          if (opts.after) opts.after();
        });
      };
      legsDelay = 750;
      if (withBoxes) K.wait(legsDelay, function () { GF.parts.black.flowHop(st, who, 0, function () { K.wait(200, rise); }); });
      else K.wait(legsDelay, rise);
    });
  }

  function animate(st) {
    var later2 = st.iter > 1;
    if (st.is('red', 'gw') || st.is('red', 'gb')) {
      var who = st.name === 'gw' ? 'w' : 'b', o = P[who], bl = GF.parts.black.el;
      K.drawArrow(o.axX, 500, 0);
      K.drawArrow(o.axY, 500, 0);
      [o.point, o.guideV, o.guideH, o.tickV, o.tickL, o.curve, o.formula, o.q].forEach(function (e) { K.temp(e, 'opacity', '0'); });
      K.wait(500, function () {
        K.flyTex(M.fmt(st[who]), K.rect(bl[who].val), K.rect(o.tickV), 800, 'k-red', null, 23);
        K.flyTex(M.fmt(M.lbar(st.w, st.b)), K.rect(bl.lbar.val), K.rect(o.tickL), 800, 'k-red', null, 23);
      });
      K.wait(1300, function () {
        [o.tickV, o.tickL, o.guideV, o.guideH].forEach(function (e) { e.style.opacity = ''; });
      });
      K.wait(1600, function () { o.point.style.opacity = ''; K.pulse(o.point); });
      K.wait(2100, function () { o.curve.style.opacity = ''; K.drawOn(o.curve, 1400, 0); });
      K.wait(3200, function () { o.formula.style.opacity = ''; });
      K.wait(3600, function () { o.q.style.opacity = ''; });
    } else if (st.is('red', 'plot')) {
      ['w', 'b'].forEach(function (who) {
        var o = P[who];
        K.temp(o.point, 'opacity', '0');
        K.wait(700, function () { o.point.style.opacity = ''; K.pulse(o.point); });
      });
    } else if (st.is('blue', 'onw')) {
      var o1 = P.w;
      K.temp(o1.formula, 'opacity', '1');
      K.temp(o1.formula, 'visibility', 'visible');
      K.wait(900, function () { o1.formula.style.opacity = ''; o1.formula.style.visibility = ''; });
      jumpOn('w', st, 0);
      zoomIn('w', st, 1100, 1500);
    } else if (st.is('blue', 'hopw')) {
      var o2 = P.w;
      GF.hopper.w.setPose(poseAt('w', st, 'point'));
      GF.hopper.jump(GF.hopper.w, poseAt('w', st, 'side'), 700, 45);
      K.drawOn(o2.legH, 650, 80);
      later(o2.tickVp, 350); later(o2.guideVp, 350); later(o2.epsLab, 700);
    } else if (st.is('blue', 'fwdw')) {
      var o3 = P.w;
      [o3.legV, o3.end, o3.delLab, o3.tickLp, o3.guideHp].forEach(function (e) { K.temp(e, 'opacity', '0'); });
      GF.hopper.w.setPose(poseAt('w', st, 'side'));
      GF.parts.black.flowHop(st, 'w', 100, function () {
        K.wait(250, function () {
          GF.hopper.jump(GF.hopper.w, poseAt('w', st, 'up'), 650, 12);
          o3.legV.style.opacity = '';
          K.drawOn(o3.legV, 550, 80);
          K.wait(600, function () {
            [o3.end, o3.delLab, o3.tickLp, o3.guideHp].forEach(function (e) { e.style.opacity = ''; });
          });
        });
      });
    } else if (st.is('blue', 'slopew')) {
      slopeIn('w', st, 100);
    } else if (st.is('blue', 'limw')) {
      var ms = tickLimit('w', st, 100);
      GF.hopper.w.setPose(poseAt('w', st, 'up'));
      K.wait(ms - 300, function () { GF.hopper.jump(GF.hopper.w, poseAt('w', st, 'point'), 650, 30); });
    } else if (st.is('blue', 'hopb')) {
      measure('b', st, { boxes: true, delay: 0 });
    } else if (st.is('blue', 'slopeb')) {
      slopeIn('b', st, 100);
      var ms2 = 2300;
      K.wait(ms2, function () {
        var m = tickLimit('b', st, 0);
        K.wait(m - 300, function () { GF.hopper.jump(GF.hopper.b, poseAt('b', st, 'point'), 650, 30); });
      });
      GF.hopper.b.setPose(poseAt('b', st, 'up'));
    } else if (st.is('blue', 'measure') && later2) {
      ['w', 'b'].forEach(function (who, i) {
        measure(who, st, {
          boxes: false, delay: i * 250,
          after: function () {
            var m = tickLimit(who, st, 200);
            K.wait(m - 250, function () { GF.hopper.jump(GF.hopper[who], poseAt(who, st, 'point'), 600, 25); });
          }
        });
      });
    }
  }

  // Does either ground show in state st? (Then the plot of y against x gives way.)
  function showing(st) { return stateOf('w', st).shown || stateOf('b', st).shown; }

  GF.parts.ground = {
    steps: function () { return []; },
    build: build, render: render, animate: animate, showing: showing,
    panel: function (who) { return P[who]; },
    el: P
  };
})();
