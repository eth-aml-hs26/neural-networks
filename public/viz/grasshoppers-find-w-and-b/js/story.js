/* story.js: the story, four cards before the diagram, as GF.parts.story. In the style of the
 * story of "Will it last?" (../will-it-last/js/story.js): a picture and a sentence or two a card,
 * with the same Lina, copied from there.
 *
 *   home     her first winter in her own flat; the heating's app counts the energy of every day
 *   days     on warm days the heating stays off; the colder the day, the more it uses (the eight
 *            days of the next page, as bars against the temperature)
 *   today    one day: the weather app says 5 degrees C, the heating's app 40 kWh
 *   symbols  the day in symbols, on a board: x = 5, y = 40, yhat = ReLU(w x + b)
 *
 * The pictures are drawn here as SVG markup; their colours are classes in css/story.css. The words
 * are in WORDS below.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var DEG = '&#176;';
  var el = { cards: {}, dots: [] };

  var CARDS = ['home', 'days', 'today', 'symbols'];
  var WORDS = {
    home: { title: 'Her own home',
      text: 'Lina&rsquo;s first winter in her own flat. Its heating has an app that counts the energy of each day, in kWh.' },
    days: { title: 'Cold days, warm days',
      text: 'On warm days the heating stays off. The colder the day, the more energy it uses.' },
    today: { title: 'One day',
      text: 'Today the weather app says 5&nbsp;' + DEG + 'C. The heating&rsquo;s app says 40&nbsp;kWh.' },
    symbols: { title: 'In symbols',
      text: 'Guess the energy from the temperature: find <i>w</i> and <i>b</i>.' }
  };

  // ===== markup helpers

  function attrs(o) {
    var s = '';
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function t(name, o, inner) {
    return '<' + name + attrs(o || {}) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>');
  }
  function g(cls, transform, inner) {
    var o = {};
    if (cls) o['class'] = cls;
    if (transform) o.transform = transform;
    return t('g', o, inner);
  }

  // ===== Lina, front on, holding her phone (copied from ../will-it-last/js/story.js). Her feet are
  // at 0 0 and she is about 108 units tall before the scale.

  var HAIR = 'M-12.9 -84.6 C-14.2 -96.6 -7.9 -101.4 0 -101.4 C7.9 -101.4 14.2 -96.6 12.9 -84.6 ' +
    'C12.2 -89.4 10.9 -92.6 8.4 -94.6 C4.4 -91.8 -2 -91.6 -6.8 -94.8 C-9.6 -93 -12 -89.8 -12.9 -84.6 Z';

  var FACES = {
    happy: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('path', { 'class': 'ln-mouth', d: 'M-3.2 -79.4 Q0 -76.2 3.2 -79.4' }),
    surprised: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85.2, rx: 1.5, ry: 2 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85.2, rx: 1.5, ry: 2 }) +
      t('path', { 'class': 'ln-brow', d: 'M-6.8 -89.4 Q-4.4 -91.8 -2 -90 M2 -90 Q4.4 -91.8 6.8 -89.4' }) +
      t('ellipse', { 'class': 'ln-mouth-o', cx: 0, cy: -78.4, rx: 1.7, ry: 2.2 })
  };

  function lina(x, y, sc, mood, scarf) {
    var s = '';
    s += t('ellipse', { 'class': 'ln-shadow', cx: 0, cy: 0, rx: 17, ry: 2.8 });
    s += t('path', { 'class': 'ln-leg', d: 'M-5 -37 L-5.3 -5.2 M5 -37 L5.3 -5.2' });
    s += t('path', { 'class': 'ln-shoe', d: 'M-11.4 -0.6 C-11.4 -4.6 -8.8 -6.4 -5.6 -6.4 C-2.6 -6.4 -1.1 -4.5 -1.1 -2.1 L-1.1 -0.6 Z' });
    s += t('path', { 'class': 'ln-shoe', d: 'M11.4 -0.6 C11.4 -4.6 8.8 -6.4 5.6 -6.4 C2.6 -6.4 1.1 -4.5 1.1 -2.1 L1.1 -0.6 Z' });
    s += t('path', { 'class': 'ln-top', d: 'M-12.2 -66.4 C-12.2 -70.6 -9.4 -72.4 -5.8 -72.4 L5.8 -72.4 C9.4 -72.4 12.2 -70.6 12.2 -66.4 L13.8 -40.2 C13.8 -37.4 12.3 -35.8 9.6 -35.8 L-9.6 -35.8 C-12.3 -35.8 -13.8 -37.4 -13.8 -40.2 Z' });
    s += t('path', { 'class': 'ln-top-dk', d: 'M-13.6 -42.6 L13.6 -42.6 L13.8 -40.2 C13.8 -37.4 12.3 -35.8 9.6 -35.8 L-9.6 -35.8 C-12.3 -35.8 -13.8 -37.4 -13.8 -40.2 Z' });
    s += t('rect', { 'class': 'ln-skin-dk', x: -2.9, y: -76.8, width: 5.8, height: 5.6, rx: 1.2 });
    s += t('path', { 'class': 'ln-top-dk', d: 'M-7.8 -72.4 C-5.6 -67 5.6 -67 7.8 -72.4 C4.6 -70.2 -4.6 -70.2 -7.8 -72.4 Z' });
    s += t('path', { 'class': 'ln-string', d: 'M-2.3 -68.8 V-62.4 M2.3 -68.8 V-62.4' });
    s += t('circle', { 'class': 'ln-hair', cx: 0, cy: -103.6, r: 5.8 });
    s += t('circle', { 'class': 'ln-skin', cx: 0, cy: -87, r: 12.4 });
    s += t('path', { 'class': 'ln-hair', d: HAIR });
    s += t('circle', { 'class': 'ln-cheek', cx: -7.9, cy: -81, r: 2.1 }) + t('circle', { 'class': 'ln-cheek', cx: 7.9, cy: -81, r: 2.1 });
    s += FACES[mood] || FACES.happy;
    if (scarf) {
      // a winter scarf, red with a hanging end
      s += t('path', { 'class': 'ln-scarf', d: 'M-9 -74.6 C-5 -70.4 5 -70.4 9 -74.6 L9.6 -70.6 C5 -66.2 -5 -66.2 -9.6 -70.6 Z' });
      s += t('path', { 'class': 'ln-scarf', d: 'M3.4 -69 L7.8 -56.6 L3.2 -55.6 L0.6 -68.2 Z' });
    }
    s += t('path', { 'class': 'ln-arm', d: 'M-10.6 -67 C-15.4 -61.4 -15.2 -55.6 -6.8 -55.4 M10.6 -67 C15.4 -61.4 15.2 -55.6 6.8 -55.4' });
    s += t('rect', { 'class': 'ln-phone', x: -4.6, y: -63.4, width: 9.2, height: 14.6, rx: 1.8 });
    s += t('circle', { 'class': 'ln-cam', cx: -2.3, cy: -61.1, r: 0.85 });
    s += t('circle', { 'class': 'ln-skin', cx: -5.9, cy: -55.4, r: 2.7 }) + t('circle', { 'class': 'ln-skin', cx: 5.9, cy: -55.4, r: 2.7 });
    return g('lina', 'translate(' + x + ' ' + y + ') scale(' + sc + ')', s);
  }

  // ===== the scene: her house in the snow

  var SNOW = [[14, 22], [40, 48], [62, 16], [88, 40], [112, 18], [136, 52], [158, 26], [30, 84], [70, 66],
              [104, 92], [150, 78], [178, 58], [22, 120], [184, 104], [8, 60], [126, 70], [56, 104]];

  function snowflakes(list, r) {
    return list.map(function (p, i) {
      return t('circle', { 'class': 'flake', cx: p[0], cy: p[1], r: (r || 1.7) * (i % 3 === 0 ? 1.25 : 1) });
    }).join('');
  }

  function house(night) {
    var s = '';
    s += t('rect', { 'class': 'hs-wall', x: 14, y: 112, width: 108, height: 98 });
    s += t('path', { 'class': 'hs-roof', d: 'M4 116 L68 64 L132 116 Z' });
    s += t('path', { 'class': 'hs-snow', d: 'M2 117 L68 61 L134 117 L128 119 L68 69 L8 119 Z' });
    s += t('rect', { 'class': 'hs-chim', x: 94, y: 70, width: 12, height: 22 });
    s += t('rect', { 'class': 'hs-snow', x: 92, y: 66, width: 16, height: 6, rx: 3 });
    // a window, lit at night, and the door
    s += t('rect', { 'class': night ? 'hs-win lit' : 'hs-win', x: 28, y: 132, width: 34, height: 30, rx: 2 });
    s += t('path', { 'class': 'hs-bar', d: 'M45 132 V162 M28 147 H62' });
    s += t('rect', { 'class': 'hs-door', x: 82, y: 156, width: 24, height: 54, rx: 2 });
    s += t('circle', { 'class': 'hs-knob', cx: 101, cy: 184, r: 1.6 });
    // the heat pump beside the house, its fan behind a grille
    s += t('rect', { 'class': 'hp-box', x: 124, y: 186, width: 30, height: 24, rx: 2 });
    s += t('rect', { 'class': 'hs-snow', x: 122, y: 183, width: 34, height: 5, rx: 2.5 });
    s += t('circle', { 'class': 'hp-fan', cx: 139, cy: 198, r: 8.6 });
    s += t('path', { 'class': 'hp-grille', d: 'M131 198 H147 M139 190 V206 M133.2 192.2 L144.8 203.8 M144.8 192.2 L133.2 203.8' });
    return s;
  }

  function ground() {
    return t('rect', { 'class': 'snow-ground', x: 0, y: 208, width: 320, height: 32 }) +
      t('path', { 'class': 'snow-edge', d: 'M0 209 Q40 204 80 208 T160 207 T240 209 T320 206' });
  }

  // The phone blown up beside her: a dark body and a light screen of width W and height H.
  var PH = { x: 206, y: 16, w: 100, h: 196 };
  function phone(screen) {
    var p = PH, s = '';
    s += t('rect', { 'class': 'ph-body', x: p.x, y: p.y, width: p.w, height: p.h, rx: 13 });
    s += t('rect', { 'class': 'ph-screen', x: p.x + 5, y: p.y + 6, width: p.w - 10, height: p.h - 12, rx: 9 });
    s += t('rect', { 'class': 'ph-notch', x: p.x + p.w / 2 - 14, y: p.y + 9, width: 28, height: 5, rx: 2.5 });
    return s + screen;
  }

  // the dashed lines from the phone in her hands to the big one
  function zoomFrom(x, y) {
    var r = 13, s = '';
    [[PH.x + 4, PH.y + 14], [PH.x + 4, PH.y + PH.h - 14]].forEach(function (p) {
      var dx = p[0] - x, dy = p[1] - y, len = Math.sqrt(dx * dx + dy * dy);
      s += t('path', { 'class': 'zoom-lead', d: 'M' + (x + dx / len * r).toFixed(1) + ' ' + (y + dy / len * r).toFixed(1) + ' L' + p[0] + ' ' + p[1] });
    });
    return s + t('circle', { 'class': 'zoom-ring', cx: x, cy: y, r: r });
  }

  // a flame, the icon of the heating's app, at (x, y) with size k
  function flame(x, y, k) {
    return g(null, 'translate(' + x + ' ' + y + ') scale(' + k + ')',
      t('path', { 'class': 'ic-flame', d: 'M0 -11 C4 -6 7 -3 7 2 C7 7 3.6 10 0 10 C-3.6 10 -7 7 -7 2 C-7 -2 -4.4 -4 -3.4 -8 C-1.6 -5.6 -1.2 -4 -0.4 -2.6 C0.6 -5.2 0.8 -8 0 -11 Z' }) +
      t('path', { 'class': 'ic-flame-in', d: 'M0 1 C2 3 3 4.6 3 6.2 C3 8 1.6 9 0 9 C-1.6 9 -3 8 -3 6.2 C-3 4.4 -1.6 3.6 0 1 Z' }));
  }
  // a cloud, the icon of the weather app
  function cloudIcon(x, y, k) {
    return g(null, 'translate(' + x + ' ' + y + ') scale(' + k + ')',
      t('path', { 'class': 'ic-cloud', d: 'M-9 6 C-13 6 -14 1 -10.6 -0.6 C-11 -5.6 -5 -8 -2 -4.6 C-0.4 -9.6 7.6 -9.2 8.4 -3.4 C12.6 -3.2 13.4 2.6 10 5 C9.4 5.6 8.6 6 7.6 6 Z' }));
  }

  // The heating's app on the phone: a flame, kWh, and a bar a day.
  var WEEK = M.DAYS.seq.map(function (i) { return M.DAYS.y[i]; });
  function heatApp() {
    var p = PH, s = '', x0 = p.x + 14, base = p.y + p.h - 34, top = p.y + 64, bw = 7.6, gap = 2.6;
    s += flame(p.x + 24, p.y + 34, 1.15);
    s += t('text', { 'class': 'ph-unit', x: p.x + 38, y: p.y + 38 }, 'kWh');
    s += t('path', { 'class': 'ph-axis', d: 'M' + (x0 - 3) + ' ' + base + ' H' + (p.x + p.w - 10) });
    WEEK.forEach(function (v, i) {
      var h = v / 63 * (base - top), x = x0 + i * (bw + gap);
      s += t('rect', { 'class': 'ph-bar', x: x.toFixed(1), y: (base - h).toFixed(1), width: bw, height: Math.max(h, 0.0).toFixed(1), rx: 1.2 });
    });
    return s;
  }

  // The two apps of today: the weather, 5 degrees C, and the heating, 40 kWh.
  function todayApps() {
    var p = PH, s = '', cx = p.x + p.w / 2;
    s += t('rect', { 'class': 'ph-card', x: p.x + 12, y: p.y + 26, width: p.w - 24, height: 70, rx: 8 });
    s += cloudIcon(cx, p.y + 46, 1.25);
    s += t('text', { 'class': 'ph-big', x: cx, y: p.y + 84 }, M.X + DEG + 'C');
    s += t('rect', { 'class': 'ph-card', x: p.x + 12, y: p.y + 106, width: p.w - 24, height: 76, rx: 8 });
    s += flame(cx, p.y + 126, 1.15);
    s += t('text', { 'class': 'ph-big', x: cx, y: p.y + 164 }, String(M.Y));
    s += t('text', { 'class': 'ph-small', x: cx, y: p.y + 176 }, 'kWh');
    return s;
  }

  function sceneDefs(id, night) {
    return t('defs', {}, t('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 },
      t('stop', { offset: 0, 'class': night ? 'sky-n0' : 'sky-d0' }) + t('stop', { offset: 1, 'class': night ? 'sky-n1' : 'sky-d1' })));
  }

  var LINA = { x: 168, y: 226, s: 1.28 };
  function linaPhone() { return [LINA.x, LINA.y - 56.1 * LINA.s]; }

  function picHome() {
    var s = sceneDefs('sky-home', true);
    s += t('rect', { x: 0, y: 0, width: 320, height: 240, fill: 'url(#sky-home)' });
    s += t('circle', { 'class': 'moon', cx: 176, cy: 30, r: 9 });
    s += house(true) + ground() + snowflakes(SNOW);
    s += lina(LINA.x, LINA.y, LINA.s, 'happy', true);
    var z = linaPhone();
    s += zoomFrom(z[0], z[1]) + phone(heatApp());
    return s;
  }

  function picToday() {
    var s = sceneDefs('sky-today', false);
    s += t('rect', { x: 0, y: 0, width: 320, height: 240, fill: 'url(#sky-today)' });
    s += cloudIcon(48, 34, 2.2) + cloudIcon(150, 22, 1.6);
    s += house(false) + ground() + snowflakes(SNOW.slice(0, 7), 1.4);
    s += lina(LINA.x, LINA.y, LINA.s, 'surprised', true);
    var z = linaPhone();
    s += zoomFrom(z[0], z[1]) + phone(todayApps());
    return s;
  }

  // The eight days as bars against the temperature: cold on the left, warm on the right.
  function picDays() {
    var D = M.DAYS, s = '', L = 40, R = 300, base = 196, top = 46;
    function X(T) { return L + (T + 4) / 26 * (R - L); }
    function H(E) { return E / 70 * (base - top); }
    s += t('rect', { 'class': 'chart-paper', x: 8, y: 8, width: 304, height: 224, rx: 12 });
    // a snowflake on the cold side, a sun on the warm side
    s += g(null, 'translate(' + X(-1) + ' 30)', t('path', { 'class': 'ic-snow', d: 'M0 -9 V9 M-7.8 -4.5 L7.8 4.5 M-7.8 4.5 L7.8 -4.5 M-2.6 -7.6 L0 -5 L2.6 -7.6 M-2.6 7.6 L0 5 L2.6 7.6' }));
    s += t('circle', { 'class': 'ic-sun', cx: X(19.4), cy: 30, r: 6.4 });
    s += t('path', { 'class': 'ic-sun-ray', d: 'M' + X(19.4) + ' 18 V21 M' + X(19.4) + ' 39 V42 M' + (X(19.4) - 12) + ' 30 H' + (X(19.4) - 9) + ' M' + (X(19.4) + 9) + ' 30 H' + (X(19.4) + 12) });
    s += t('path', { 'class': 'chart-axis', d: 'M' + (L - 14) + ' ' + base + ' H' + (R + 8) });
    s += t('text', { 'class': 'chart-unit', x: L - 12, y: top - 6 }, 'kWh');
    s += t('text', { 'class': 'chart-unit end', x: R + 8, y: base + 30 }, DEG + 'C');
    D.x.forEach(function (T, i) {
      var E = D.y[i], x = X(T), h = H(E);
      if (E > 0) s += t('rect', { 'class': 'chart-bar', x: (x - 7).toFixed(1), y: (base - h).toFixed(1), width: 14, height: h.toFixed(1), rx: 2 });
      else s += t('path', { 'class': 'chart-zero', d: 'M' + (x - 7).toFixed(1) + ' ' + (base - 1.5) + ' H' + (x + 7).toFixed(1) });
      s += t('text', { 'class': 'chart-t', x: x.toFixed(1), y: base + 15 }, T < 0 ? '&#8722;' + (-T) : String(T));
    });
    return s;
  }

  // ===== build

  function build(layer) {
    var P = G.story.pic, T = G.story.text;
    el.box = K.div('story vis', layer.top);
    CARDS.forEach(function (name) {
      var c = { name: name };
      c.pic = K.div('story-pic', el.box);
      K.pos(c.pic, P.x, P.y, 'tl');
      c.pic.style.width = P.w + 'px';
      c.pic.style.height = P.h + 'px';
      if (name === 'symbols') {
        c.pic.classList.add('board');
        var lines = [
          'x = ' + M.X + '\\,{}^\\circ\\mathrm{C}',
          'y = ' + M.Y + '\\ \\mathrm{kWh}',
          '\\hat y = \\mathrm{ReLU}(w\\,x + b)'
        ];
        lines.forEach(function (src, i) {
          var d = K.div('chalk chalk-' + i, c.pic);
          K.tex(d, src);
        });
      } else {
        var svg = K.svg('svg', { viewBox: '0 0 320 240', width: P.w, height: P.h, role: 'img' }, c.pic, 'story-svg');
        svg.innerHTML = name === 'home' ? picHome() : name === 'days' ? picDays() : picToday();
      }
      c.words = K.div('story-words', el.box);
      K.pos(c.words, T.x, T.y, 'tl');
      c.words.style.width = T.w + 'px';
      c.words.innerHTML = '<h2>' + WORDS[name].title + '</h2><p>' + WORDS[name].text + '</p>';
      el.cards[name] = c;
    });
    el.dotRow = K.div('story-dots', el.box);
    K.pos(el.dotRow, T.x, G.story.pic.y + G.story.pic.h - 10, 'bl');
    CARDS.forEach(function () { el.dots.push(K.div('dot', el.dotRow, 'span')); });
  }

  function render(st) {
    var on = st.part === 'story';
    K.show(el.box, on);
    CARDS.forEach(function (name, i) {
      var c = el.cards[name], cur = on && st.name === name;
      c.pic.classList.toggle('cur', cur);
      c.words.classList.toggle('cur', cur);
      el.dots[i].classList.toggle('cur', cur);
    });
    document.getElementById('stage').classList.toggle('in-story', on);
  }

  function animate(st) {
    if (st.part !== 'story') return;
    var c = el.cards[st.name];
    K.tempClass(c.pic, 'enter');
    K.tempClass(c.words, 'enter');
  }

  GF.parts.story = {
    steps: function (iter) { return iter === 1 ? CARDS.slice() : []; },
    build: build, render: render, animate: animate,
    el: el
  };
})();
