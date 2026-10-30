/* black.js: the black part, the day and the model, as GF.parts.black.
 *
 * Iteration 1, one click each:
 *   day     the boxes x = 5 (degrees C) and y = 40 (kWh)
 *   a       the box of a, the arrow from x, the label a = w x + b
 *   w       the box of w with a question mark, its arrow into a, its grasshopper
 *   b       the box of b with a question mark, its line joining w's arrow, a second grasshopper
 *   relu    the box of yhat, the arrow from a carrying a little plot of the ReLU: flat, then rising
 *   guess   the boxes of w and b take the numbers typed by the room (Enter goes from w to b; Enter
 *           or Next keeps them; an empty field gives -1 or 60; a start where the heating is off
 *           is refused)
 *   aval    w, 5 and b fly into the box of a: -1 x 5 + 60, then 55
 *   yval    a flies through the ReLU: max(0, 55), then 55; a dot on the little plot
 *   loss    the box of the loss, the arrows from yhat and from y; 40 and yhat fly in: (40 - 55)^2
 * Iteration 2 on, one click:
 *   recompute   the new pair flows through again: a, yhat, then the loss
 *
 * While a grasshopper tests its hop (st.hop), its box shows its number plus eps and the boxes a,
 * yhat and l the forward pass of the hop, in blue.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var DEG = String.fromCharCode(176);
  var el = { arr: {}, lab: {}, in: {} };

  function makeBox(layer, name, unit) {
    var b = G.box[name];
    var box = K.div('box vis', layer);
    box.style.left = b.x + 'px';
    box.style.top = b.y + 'px';
    box.style.width = b.w + 'px';
    box.style.height = b.h + 'px';
    var o = { box: box };
    o.calc = K.div('calc vis', box);
    o.val = K.div('val vis on', box);
    o.unit = K.div('unit', box);
    o.unit.textContent = unit || '';
    return o;
  }

  function label(layer, name, tex) {
    var L = G.label[name];
    var d = K.div('lab vis', layer);
    K.pos(d, L[0], L[1], L[2]);
    K.tex(d, tex);
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

  // The little plot of the ReLU on the arrow from a to yhat.
  function buildRelu(layer) {
    var R = G.relu, c = R.card;
    el.relu = K.svg('g', null, layer.back, 'relu vis');
    K.svg('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 8 }, el.relu, 'relu-card');
    K.arrow(el.relu, [[R.ox - R.half - 6, R.oy], [R.ox + R.half + 10, R.oy]], 'axis on', { size: 10 });
    K.arrow(el.relu, [[R.ox, R.oy + 4], [R.ox, R.oy - R.half - 16]], 'axis on', { size: 10 });
    el.reluCurve = K.svg('path', {
      d: 'M ' + (R.ox - R.half) + ' ' + R.oy + ' L ' + R.ox + ' ' + R.oy + ' L ' + (R.ox + R.half) + ' ' + (R.oy - R.half)
    }, el.relu, 'relu-curve');
    el.reluGuideV = K.svg('path', null, el.relu, 'guide vis');
    el.reluGuideH = K.svg('path', null, el.relu, 'guide vis');
    el.reluDot = K.svg('circle', { r: 5.5 }, el.relu, 'point vis');
    el.reluWord = label(layer.mid, 'relu', '\\mathrm{ReLU}');
    el.reluWord.classList.add('relu-word');
  }

  function build(layer) {
    el.y = makeBox(layer.mid, 'y', 'kWh');
    el.x = makeBox(layer.mid, 'x', DEG + 'C');
    el.a = makeBox(layer.mid, 'a', 'kWh');
    el.w = makeBox(layer.mid, 'w', 'kWh per ' + DEG + 'C');
    el.b = makeBox(layer.mid, 'b', 'kWh');
    el.yhat = makeBox(layer.mid, 'yhat', 'kWh');
    el.loss = makeBox(layer.mid, 'loss', '');
    K.tex(el.y.val, String(M.Y));
    K.tex(el.x.val, String(M.X));

    el.in.w = field(el.w, 'w', 'The start of w, in kWh per degree C');
    el.in.b = field(el.b, 'b', 'The start of b, in kWh');

    el.lab.y = label(layer.mid, 'y', 'y');
    el.lab.x = label(layer.mid, 'x', 'x');
    el.lab.a = label(layer.mid, 'a', 'a = w\\,x + b');
    el.lab.w = label(layer.mid, 'w', 'w');
    el.lab.b = label(layer.mid, 'b', 'b');
    el.lab.yhat = label(layer.mid, 'yhat', '\\hat y = \\mathrm{ReLU}(a)');
    el.lab.loss = label(layer.mid, 'loss', '\\ell = (y - \\hat y)^2');

    el.arr.x2a = K.arrow(layer.back, G.route.x2a, 'k-black');
    el.arr.w2a = K.arrow(layer.back, G.route.w2a, 'k-black');
    el.b2j = K.svg('path', { d: K.route(G.route.b2j) }, layer.back, 'join-line vis');
    el.joinDot = K.svg('circle', { cx: G.join[0], cy: G.join[1], r: 5 }, layer.back, 'join-dot vis');
    el.arr.a2yhat = K.arrow(layer.back, G.route.a2yhat, 'k-black');
    el.arr.yhat2l = K.arrow(layer.back, G.route.yhat2l, 'k-black');
    el.arr.y2l = K.arrow(layer.back, G.route.y2l, 'k-black');
    buildRelu(layer);
  }

  // ===== the calc rows, as pieces a number can fly into

  function calcA(w, b, hot) {
    return [{ key: 'w', tex: M.wrap(w), hot: hot === 'w' }, { key: 't', tex: '\\times' }, { key: 'x', tex: String(M.X) },
            { key: 'p', tex: '+' }, { key: 'b', tex: M.wrap(b), hot: hot === 'b' }];
  }
  function calcYhat(a, hot) {
    return [{ key: 'l', tex: '\\max(0,' }, { key: 'a', tex: M.fmt(a), hot: hot }, { key: 'r', tex: ')' }];
  }
  function calcLoss(yh, hot) {
    return [{ key: 'l', tex: '(' }, { key: 'y', tex: String(M.Y) }, { key: 'm', tex: '-' },
            { key: 'yhat', tex: M.wrap(yh), hot: hot }, { key: 'r', tex: ')^2' }];
  }

  // K.row, then the pieces of a hop in blue.
  function row(calc, pieces) {
    var sp = K.row(calc, pieces);
    pieces.forEach(function (p) { if (p.key && sp[p.key]) sp[p.key].classList.toggle('hop', !!p.hot); });
    return sp;
  }

  function setVal(o, tex, hot) {
    K.tex(o.val, tex);
    o.val.classList.toggle('hop', !!hot);
  }

  function renderRelu(st, on, dot) {
    var R = G.relu, A = st.F.relu.A;
    K.show(el.relu, on);
    K.show(el.reluWord, on);
    var a = M.lin(st.w, st.b), px = R.ox + a / A * R.half, py = R.oy - M.relu(a) / A * R.half;
    el.reluDot.setAttribute('cx', px.toFixed(1));
    el.reluDot.setAttribute('cy', py.toFixed(1));
    el.reluGuideV.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' L ' + px.toFixed(1) + ' ' + R.oy);
    el.reluGuideH.setAttribute('d', 'M ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' L ' + R.ox + ' ' + py.toFixed(1));
    K.show(el.reluDot, on && dot);
    K.show(el.reluGuideV, on && dot);
    K.show(el.reluGuideH, on && dot && a > 0);
  }

  function render(st) {
    var later = st.iter > 1;
    var story = st.part === 'story';
    function R(n) { return !story && (later || st.reached('black', n)); }
    var day = R('day'), aBox = R('a'), wBox = R('w'), bBox = R('b'), relu = R('relu');
    var hasA = R('aval'), hasY = R('yval'), hasL = R('loss');
    var guessing = st.is('black', 'guess');

    K.show(el.y.box, day); K.show(el.lab.y, day);
    K.show(el.x.box, day); K.show(el.lab.x, day);
    K.show(el.a.box, aBox); K.show(el.lab.a, aBox); K.show(el.arr.x2a.g, aBox);
    K.show(el.w.box, wBox); K.show(el.lab.w, wBox); K.show(el.arr.w2a.g, wBox);
    K.show(el.b.box, bBox); K.show(el.lab.b, bBox); K.show(el.b2j, bBox); K.show(el.joinDot, bBox);
    K.show(el.yhat.box, relu); K.show(el.lab.yhat, relu); K.show(el.arr.a2yhat.g, relu);
    renderRelu(st, relu, hasY);
    K.show(el.loss.box, hasL); K.show(el.lab.loss, hasL);
    K.show(el.arr.yhat2l.g, hasL); K.show(el.arr.y2l.g, hasL);

    // the boxes of w and b: a question mark, then the fields of the start, then the values
    var hop = st.hop, hw = hop && hop.who === 'w', hb = hop && hop.who === 'b';
    ['w', 'b'].forEach(function (who) {
      var f = el.in[who], o = el[who];
      f.classList.toggle('on', guessing);
      K.show(o.val, !guessing);
      o.box.classList.toggle('guessing', guessing);
      if (guessing) {
        if (document.activeElement !== f) f.value = st.typed ? String(who === 'w' ? st.w0 : st.b0) : '';
      } else if (document.activeElement === f) f.blur();
    });
    if (guessing) {
      setTimeout(function () {
        var a = document.activeElement;
        if (el.in.w.classList.contains('on') && a !== el.in.w && a !== el.in.b) el.in.w.focus({ preventScroll: true });
      }, 30);
    } else {
      var known = later || hasA;
      setVal(el.w, known ? M.fmt(hw ? st.w + st.eps : st.wShown) : '?', hw);
      setVal(el.b, known ? M.fmt(hb ? st.b + st.eps : st.bShown) : '?', hb);
    }

    // a, yhat and the loss of this iteration's pair, or of the hop being tested
    var fwd = hop && hop.fwd;
    var w = fwd && hw ? st.w + st.eps : st.w, b = fwd && hb ? st.b + st.eps : st.b;
    var a = M.lin(w, b), yh = M.yhat(w, b), l = M.loss(w, b);
    K.show(el.a.calc, hasA); K.show(el.a.val, hasA);
    if (hasA) { row(el.a.calc, calcA(w, b, fwd ? hop.who : null)); setVal(el.a, M.fmt(a), fwd); }
    K.show(el.yhat.calc, hasY); K.show(el.yhat.val, hasY);
    if (hasY) { row(el.yhat.calc, calcYhat(a, fwd)); setVal(el.yhat, M.fmt(yh), fwd); }
    K.show(el.loss.calc, hasL); K.show(el.loss.val, hasL);
    if (hasL) { row(el.loss.calc, calcLoss(yh, fwd)); setVal(el.loss, M.fmt(l), fwd); }

    // long numbers (a wild start, a loss of 7.5 x 10^-10) shrink to fit their box
    ['w', 'b', 'a', 'yhat', 'loss'].forEach(function (n) {
      var maxW = G.box[n].w - 16;
      K.fit(el[n].val, maxW);
      K.fit(el[n].calc, maxW);
    });
  }

  // Numbers fly into the pieces of a calc row, the row appears, then the value lights up.
  function flyInto(o, sources, delay, then) {
    var calc = o.calc, val = o.val, spans = calc.__spans || {};
    K.temp(calc, 'opacity', '0');
    K.temp(val, 'opacity', '0');
    var left = sources.length;
    sources.forEach(function (s, i) {
      K.wait(delay + i * 160, function () {
        K.flyTex(s.tex, K.rect(s.from), K.rect(spans[s.key]), 750, s.cls || 'k-black', function () {
          if (--left > 0) return;
          calc.style.opacity = '';
          K.wait(350, function () {
            val.style.opacity = '';
            K.flash(val);
            if (then) then();
          });
        }, 23);
      });
    });
  }

  function flyA(st, delay, then, hop) {
    var w = hop === 'w' ? st.w + st.eps : st.w, b = hop === 'b' ? st.b + st.eps : st.b;
    flyInto(el.a, [
      { from: el.w.val, key: 'w', tex: M.wrap(w), cls: hop === 'w' ? 'k-blue' : null },
      { from: el.x.val, key: 'x', tex: String(M.X) },
      { from: el.b.val, key: 'b', tex: M.wrap(b), cls: hop === 'b' ? 'k-blue' : null }
    ], delay, then);
  }

  function flyYhat(st, delay, then, hop) {
    var w = hop === 'w' ? st.w + st.eps : st.w, b = hop === 'b' ? st.b + st.eps : st.b;
    flyInto(el.yhat, [{ from: el.a.val, key: 'a', tex: M.fmt(M.lin(w, b)), cls: hop ? 'k-blue' : null }], delay, then);
  }

  function flyLoss(st, delay, then, hop) {
    var w = hop === 'w' ? st.w + st.eps : st.w, b = hop === 'b' ? st.b + st.eps : st.b;
    flyInto(el.loss, [
      { from: el.y.val, key: 'y', tex: String(M.Y) },
      { from: el.yhat.val, key: 'yhat', tex: M.wrap(M.yhat(w, b)), cls: hop ? 'k-blue' : null }
    ], delay, then);
  }

  // The forward pass of a hop through a, yhat and the loss; then() once the loss is in.
  function flowHop(st, who, delay, then) {
    ['a', 'yhat', 'loss'].forEach(function (n) {
      K.temp(el[n].calc, 'opacity', '0');
      K.temp(el[n].val, 'opacity', '0');
    });
    flyA(st, delay, function () {
      flyYhat(st, 150, function () { flyLoss(st, 150, then, who); }, who);
    }, who);
  }

  function popDot(delay) {
    [el.reluDot, el.reluGuideV, el.reluGuideH].forEach(function (e) { K.temp(e, 'opacity', '0'); });
    K.wait(delay, function () {
      el.reluGuideV.style.opacity = '';
      el.reluGuideH.style.opacity = '';
      el.reluDot.style.opacity = '';
      K.pulse(el.reluDot);
    });
  }

  function animate(st) {
    if (st.is('black', 'day')) {
      K.later(el.x.box, 300); K.later(el.lab.x, 300);
    } else if (st.is('black', 'a')) {
      K.drawArrow(el.arr.x2a, 450, 0);
      K.later(el.a.box, 350); K.later(el.lab.a, 700);
    } else if (st.is('black', 'w')) {
      K.drawArrow(el.arr.w2a, 700, 300);
      hopIn('w', 0);
    } else if (st.is('black', 'b')) {
      K.drawOn(el.b2j, 400, 300);
      K.later(el.joinDot, 650);
      hopIn('b', 0);
    } else if (st.is('black', 'relu')) {
      K.drawArrow(el.arr.a2yhat, 500, 0);
      K.later(el.relu, 300);
      K.drawOn(el.reluCurve, 900, 600);
      K.later(el.reluWord, 500);
      K.later(el.yhat.box, 900); K.later(el.lab.yhat, 1200);
    } else if (st.is('black', 'aval')) {
      flyA(st, 150);
    } else if (st.is('black', 'yval')) {
      flyYhat(st, 150);
      popDot(1100);
    } else if (st.is('black', 'loss')) {
      K.drawArrow(el.arr.yhat2l, 400, 0);
      K.drawArrow(el.arr.y2l, 900, 0);
      K.later(el.loss.box, 300); K.later(el.lab.loss, 600);
      flyLoss(st, 1000);
    } else if (st.is('black', 'recompute')) {
      ['a', 'yhat', 'loss'].forEach(function (n) {
        K.temp(el[n].calc, 'opacity', '0');
        K.temp(el[n].val, 'opacity', '0');
      });
      popDot(1500);
      flyA(st, 100, function () { flyYhat(st, 150, function () { flyLoss(st, 150); }); });
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
    if (M.dead(out.w, out.b)) return { ok: false, which: 'both' };
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
    var f = el.in[list[0]];
    f.focus({ preventScroll: true });
    f.select();
  }

  // Enter in the field of w goes on to the field of b; true when it did.
  function enterInField(f) {
    if (f === el.in.w) { el.in.b.focus({ preventScroll: true }); el.in.b.select(); return true; }
    return false;
  }

  function switchField(f) {
    var g = f === el.in.w ? el.in.b : el.in.w;
    g.focus({ preventScroll: true });
    g.select();
  }

  function focusGuess() {
    var a = document.activeElement;
    if (a !== el.in.w && a !== el.in.b) el.in.w.focus({ preventScroll: true });
  }

  GF.parts.black = {
    steps: function (iter) {
      return iter === 1 ? ['day', 'a', 'w', 'b', 'relu', 'guess', 'aval', 'yval', 'loss'] : ['recompute'];
    },
    build: build, render: render, animate: animate,
    readGuess: readGuess, shake: shake, focusGuess: focusGuess, enterInField: enterInField,
    switchField: switchField, flowHop: flowHop,
    el: el
  };
})();
