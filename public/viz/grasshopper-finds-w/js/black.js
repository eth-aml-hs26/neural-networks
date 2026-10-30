/* black.js: the black part, the data and the model, as GF.parts.black.
 *
 * Iteration 1, one click each:
 *   story   the boxes x = 17 (days) and y = 3 (GB)
 *   model   the box of yhat, the arrow from x, the label yhat = w x
 *   wbox    the box of w with a question mark, the arrow into yhat
 *   guess   the box of w takes a number typed by the room (Enter or Next keeps it; empty gives 0.5)
 *   yhat    w and 17 fly into the box of yhat: w x 17, and its value
 *   loss    the box of the loss, the arrows from yhat and from y; 3 and yhat fly in: (3 - yhat)^2
 * Iteration 2 on, one click (speeds 1 and 2; at speed 3 the boxes just show the new numbers):
 *   recompute   the new w flows through again: yhat, then the loss
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = { a: {}, lab: {} };

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

  function build(layer) {
    el.y = makeBox(layer.mid, 'y', 'GB');
    el.x = makeBox(layer.mid, 'x', 'days');
    el.w = makeBox(layer.mid, 'w', 'GB a day');
    el.yhat = makeBox(layer.mid, 'yhat', 'GB');
    el.loss = makeBox(layer.mid, 'loss', '');
    K.tex(el.y.val, String(M.Y));
    K.tex(el.x.val, String(M.X));

    el.input = K.div('w-input', el.w.box, 'input');
    el.input.type = 'text';
    el.input.setAttribute('inputmode', 'decimal');
    el.input.setAttribute('autocomplete', 'off');
    el.input.setAttribute('spellcheck', 'false');
    el.input.setAttribute('maxlength', '9');
    el.input.setAttribute('placeholder', '?');
    el.input.setAttribute('aria-label', 'Your guess for w, in GB a day');

    el.lab.y = label(layer.mid, 'y', 'y');
    el.lab.x = label(layer.mid, 'x', 'x');
    el.lab.w = label(layer.mid, 'w', 'w');
    el.lab.yhat = label(layer.mid, 'yhat', '\\hat y = w\\,x');
    el.lab.loss = label(layer.mid, 'loss', '\\ell = (y - \\hat y)^2');

    el.a.x2yhat = K.arrow(layer.back, G.route.x2yhat, 'k-black');
    el.a.w2yhat = K.arrow(layer.back, G.route.w2yhat, 'k-black');
    el.a.yhat2l = K.arrow(layer.back, G.route.yhat2l, 'k-black');
    el.a.y2l = K.arrow(layer.back, G.route.y2l, 'k-black');
  }

  function calcYhat(w) {
    return [{ key: 'w', tex: M.wrap(w) }, { key: 'op', tex: '\\times' }, { key: 'x', tex: String(M.X) }];
  }
  function calcLoss(yh) {
    return [{ key: 'l', tex: '(' }, { key: 'y', tex: String(M.Y) }, { key: 'm', tex: '-' },
            { key: 'yhat', tex: M.wrap(yh) }, { key: 'r', tex: ')^2' }];
  }

  function render(st) {
    var later = st.iter > 1;
    function R(n) { return later || st.reached('black', n); }
    var story = R('story'), model = R('model'), wbox = R('wbox'), hasY = R('yhat'), hasL = R('loss');
    var guessing = st.is('black', 'guess');

    K.show(el.y.box, story); K.show(el.lab.y, story);
    K.show(el.x.box, story); K.show(el.lab.x, story);
    K.show(el.yhat.box, model); K.show(el.lab.yhat, model); K.show(el.a.x2yhat.g, model);
    K.show(el.w.box, wbox); K.show(el.lab.w, wbox); K.show(el.a.w2yhat.g, wbox);
    K.show(el.loss.box, hasL); K.show(el.lab.loss, hasL);
    K.show(el.a.yhat2l.g, hasL); K.show(el.a.y2l.g, hasL);

    // the box of w: a question mark, then the field for the guess, then the value
    el.input.classList.toggle('on', guessing);
    K.show(el.w.val, !guessing);
    if (guessing) {
      if (document.activeElement !== el.input) el.input.value = st.typed ? String(st.w0) : '';
      setTimeout(function () { if (el.input.classList.contains('on')) el.input.focus({ preventScroll: true }); }, 30);
    } else {
      if (document.activeElement === el.input) el.input.blur();
      K.tex(el.w.val, later || st.reached('black', 'yhat') ? M.fmt(st.wShown) : '?');
    }
    el.w.box.classList.toggle('guessing', guessing);

    // yhat = w x and the loss, for the w of this iteration
    var yh = M.yhat(st.w);
    K.show(el.yhat.calc, hasY); K.show(el.yhat.val, hasY);
    if (hasY) { K.row(el.yhat.calc, calcYhat(st.w)); K.tex(el.yhat.val, M.fmt(yh)); }
    K.show(el.loss.calc, hasL); K.show(el.loss.val, hasL);
    if (hasL) { K.row(el.loss.calc, calcLoss(yh)); K.tex(el.loss.val, M.fmt(M.loss(st.w))); }

    // long numbers (a large guess, a loss of 2.5 x 10^-7) shrink to fit their box
    ['w', 'yhat', 'loss'].forEach(function (n) {
      var maxW = G.box[n].w - 16;
      K.fit(el[n].val, maxW);
      K.fit(el[n].calc, maxW);
    });
  }

  // Numbers fly into the pieces of a calc row, the row appears, then the value lights up.
  function flyInto(calc, val, sources, delay, then) {
    var spans = calc.__spans || {};
    K.temp(calc, 'opacity', '0');
    K.temp(val, 'opacity', '0');
    var left = sources.length;
    sources.forEach(function (s, i) {
      K.wait(delay + i * 160, function () {
        K.flyTex(s.tex, K.rect(s.from), K.rect(spans[s.key]), 750, 'k-black', function () {
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

  function flyYhat(st, delay, then) {
    flyInto(el.yhat.calc, el.yhat.val, [
      { from: el.w.val, key: 'w', tex: M.wrap(st.w) },
      { from: el.x.val, key: 'x', tex: String(M.X) }
    ], delay, then);
  }

  function flyLoss(st, delay, then) {
    flyInto(el.loss.calc, el.loss.val, [
      { from: el.y.val, key: 'y', tex: String(M.Y) },
      { from: el.yhat.val, key: 'yhat', tex: M.wrap(M.yhat(st.w)) }
    ], delay, then);
  }

  function animate(st) {
    if (st.is('black', 'story')) {
      K.later(el.x.box, 300); K.later(el.lab.x, 300);
    } else if (st.is('black', 'model')) {
      K.drawArrow(el.a.x2yhat, 450, 0);
      K.later(el.yhat.box, 350); K.later(el.lab.yhat, 700);
    } else if (st.is('black', 'wbox')) {
      K.drawArrow(el.a.w2yhat, 600, 300);
    } else if (st.is('black', 'yhat')) {
      flyYhat(st, 150);
    } else if (st.is('black', 'loss')) {
      K.drawArrow(el.a.yhat2l, 400, 0);
      K.drawArrow(el.a.y2l, 900, 0);
      K.later(el.loss.box, 300); K.later(el.lab.loss, 600);
      flyLoss(st, 1000);
    } else if (st.is('black', 'recompute')) {
      K.temp(el.loss.calc, 'opacity', '0');
      K.temp(el.loss.val, 'opacity', '0');
      flyYhat(st, 100, function () { flyLoss(st, 300); });
    }
  }

  // What the room typed: {ok: true, value} (an empty field gives the default) or {ok: false}.
  function readGuess() {
    var s = el.input.value.trim();
    if (s === '') return { ok: true, value: M.W_DEFAULT };
    var v = M.parse(s);
    return v === null ? { ok: false } : { ok: true, value: v };
  }

  function shake() {
    el.w.box.classList.remove('shake');
    void el.w.box.offsetWidth;
    el.w.box.classList.add('shake');
    el.input.focus({ preventScroll: true });
    el.input.select();
  }

  function focusGuess() { el.input.focus({ preventScroll: true }); }

  GF.parts.black = {
    steps: function (iter, mode) {
      if (iter === 1) return ['story', 'model', 'wbox', 'guess', 'yhat', 'loss'];
      return mode === 3 ? [] : ['recompute'];
    },
    build: build, render: render, animate: animate,
    readGuess: readGuess, shake: shake, focusGuess: focusGuess,
    el: el
  };
})();
