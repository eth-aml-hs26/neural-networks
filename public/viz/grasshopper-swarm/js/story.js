/* story.js: the story, five cards before the diagram, as GF.parts.story (STORY.md, sections 2, 3 and
 * 6). The cards follow step 1 (../grasshoppers-find-w-and-b/js/story.js): a picture and one or two
 * sentences a card, on the page's paper. The pictures follow Will it last? (../will-it-last/js/
 * story.js): the same street at four hours of the day, now seen from Lina's balcony over a
 * railing, the same Lina (front on, green hoodie, her phone in both hands, a face that changes),
 * and her phone blown up beside her, its title bar reading APHIDS.
 *
 *   spring    morning, day 1: she photographs a rose bud; the photo shows 5 aphids; the first point
 *   order     full day: she orders a box of ladybird larvae, for 100 aphids, coming on day 10
 *   evenings  dusk: one photo an evening, days 1 to 8, each count a point (a montage on a click)
 *   worry     night of day 8: 73 aphids, 2 days until the box for 100 comes
 *   board     a blackboard: the eight points, the line at 100 and the question at day 10; under the
 *             sentence, the problem in symbols; Next reads Fit
 *
 * The pictures are SVG markup built here; their colours are classes in css/story.css. The words are
 * in WORDS below. The motion of a card plays only on a forward click (the class play), so the flag
 * still, Back and a reload show each picture at its end.
 */
(function () {
  'use strict';
  var M = window.SwarmMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var T = M.DEFAULTS, XS = T.x, YS = T.y, N = XS.length, Q = T.question;
  var VW = 320, VH = 240, KERB = 198;
  var LINA = { x: 84, y: 225, s: 1.42 };
  var PH = { x: 194, y: 14, s: 2.32, pw: 46, ph: 89 };
  var CARDS = ['spring', 'order', 'evenings', 'worry', 'board'];
  var el = { cards: {}, dots: [] };

  var WORDS = {
    spring: { title: 'Spring on the balcony',
      text: 'Lina&rsquo;s rose has its first buds. On <b>day&nbsp;1</b> she finds <b>5&nbsp;aphids</b> on one of them and takes a photo.' },
    order: { title: 'Ladybirds on the way',
      text: 'She orders a box of <b>ladybird larvae</b>, which eat aphids. One box is enough for <b>100&nbsp;aphids</b>, and it comes on <b>day&nbsp;10</b>.' },
    evenings: { title: 'One photo an evening',
      text: 'Every evening she photographs the bud and counts the aphids. Each count becomes a point.' },
    worry: { title: 'Will one box do?',
      text: 'On <b>day&nbsp;8</b> she counts <b>73</b>. The box comes on <b>day&nbsp;10</b>: will there be more than <b>100&nbsp;aphids</b> by then?' },
    board: { title: 'Find the curve',
      text: 'Each day adds more aphids than the day before, so the points bend upward.' }
  };
  var LABELS = {
    spring: 'Morning on Lina\'s balcony: she photographs a rose bud, and her phone shows 5 aphids on it.',
    order: 'Lina orders a box of ladybird larvae on her phone: enough for 100 aphids, delivered on day 10.',
    evenings: 'Evenings 1 to 8: each evening the photo shows more aphids, and each count lands as a point in the chart on her phone.',
    worry: 'Night of day 8: 73 aphids, and 2 days until the box for 100 aphids comes.',
    board: 'A blackboard: eight points for days 1 to 8, flat at first and then rising faster and faster, a dashed line at 100 aphids for one box, and a question mark at day 10.'
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
  function f2(v) { return (Math.round(v * 100) / 100).toString(); }

  // ===== the street across, from the balcony (../will-it-last/js/story.js)

  function skyDefs(uid) {
    return t('linearGradient', { id: uid + '-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
      t('stop', { offset: 0, 'class': 'sky0' }) + t('stop', { offset: 0.62, 'class': 'sky1' }) + t('stop', { offset: 1, 'class': 'sky2' }));
  }
  var BACK = [[-6, 42, 92], [34, 30, 116], [62, 46, 82], [106, 26, 110], [130, 40, 90], [168, 30, 114], [196, 46, 76], [240, 34, 100], [272, 54, 86]];
  var FRONT = [[-8, 32, 136], [22, 38, 148], [58, 28, 128], [84, 44, 144], [126, 32, 132], [156, 40, 152], [194, 34, 126], [226, 40, 142], [264, 30, 132], [292, 36, 148]];
  function city(lit) {
    var s = '';
    BACK.forEach(function (b) { s += t('rect', { 'class': 'bld-b', x: b[0], y: b[2], width: b[1], height: KERB - b[2] }); });
    FRONT.forEach(function (b, i) {
      s += t('rect', { 'class': 'bld-f', x: b[0], y: b[2], width: b[1], height: KERB - b[2] });
      var r = 0;
      for (var y = b[2] + 7; y < KERB - 12; y += 11) {
        var c = 0;
        for (var x = b[0] + 5; x + 4 <= b[0] + b[1] - 4; x += 8) {
          var on = lit && ((r * 5 + c * 3 + i * 7) % 7) < 3;
          s += t('rect', { 'class': 'win' + (on ? ' lit' : ''), x: x, y: y, width: 4, height: 5.5, rx: 0.6 });
          c += 1;
        }
        r += 1;
      }
    });
    return s;
  }
  function sun(x, y, r) { return t('circle', { 'class': 'sun-halo', cx: x, cy: y, r: r * 1.9 }) + t('circle', { 'class': 'sun', cx: x, cy: y, r: r }); }
  function cloud(x, y, k) {
    return t('path', { 'class': 'cloud',
      d: 'M' + x + ' ' + y + ' h' + (30 * k) + ' a' + (5 * k) + ' ' + (5 * k) + ' 0 0 0 -' + (6 * k) + ' -' + (6 * k) +
        ' a' + (8 * k) + ' ' + (8 * k) + ' 0 0 0 -' + (14 * k) + ' -' + (2 * k) + ' a' + (6 * k) + ' ' + (6 * k) + ' 0 0 0 -' + (10 * k) + ' ' + (8 * k) + ' Z' });
  }
  function moon(x, y, r) {
    return t('path', { 'class': 'moon',
      d: 'M' + x + ' ' + (y - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + x + ' ' + (y + r) + ' A' + (r * 1.25) + ' ' + (r * 1.25) + ' 0 0 1 ' + x + ' ' + (y - r) + ' Z' });
  }
  function stars(list, pop) {
    return list.map(function (p, i) {
      var x = p[0], y = p[1], r = p[2];
      return t('path', { 'class': 'star' + (pop ? ' pop' : ''), style: pop ? 'animation-delay:' + (0.1 + 0.12 * i).toFixed(2) + 's' : '',
        d: 'M' + x + ' ' + (y - r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
          ' Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + ' Z' });
    }).join('');
  }

  // the balcony: deck boards where the pavement was, and a railing behind Lina
  function balcony() {
    var s = t('rect', { 'class': 'deck', x: 0, y: KERB, width: VW, height: VH - KERB });
    [206, 216, 228].forEach(function (y) { s += t('path', { 'class': 'deck-line', d: 'M0 ' + y + ' H' + VW }); });
    s += t('rect', { 'class': 'rail', x: 0, y: 148, width: VW, height: 3.4, rx: 1 });
    s += t('rect', { 'class': 'rail', x: 0, y: 193.5, width: VW, height: 2.2 });
    var d = '';
    for (var x = 5; x < VW; x += 10) d += 'M' + x + ' 151 V194 ';
    s += t('path', { 'class': 'rail-bar', d: d });
    return s;
  }

  // ===== the rose in its terracotta pot, beside Lina: three buds, the top one at her shoulder

  function bud(x, y, k) {
    return g(null, 'translate(' + x + ' ' + y + ') scale(' + k + ')',
      t('path', { 'class': 'petal', d: 'M0 -9 C4.6 -8 5.4 -2.4 3.6 1 C2.4 3 -2.4 3 -3.6 1 C-5.4 -2.4 -4.6 -8 0 -9 Z' }) +
      t('path', { 'class': 'petal-dk', d: 'M0 -9 C2 -6.4 2.2 -2.6 0.4 0.6 C-1.6 -2 -1.8 -6 0 -9 Z' }) +
      t('path', { 'class': 'sepal', d: 'M-3.8 0.4 L-1.2 4.2 L0 1.8 L1.2 4.2 L3.8 0.4 L2.4 3 C1 4.6 -1 4.6 -2.4 3 Z' }));
  }
  function rose() {
    var s = '';
    s += t('path', { 'class': 'stem', d: 'M37 199 C36 176 39 150 38 124' });
    s += t('path', { 'class': 'stem', d: 'M37 178 C33 168 29 154 28 143' });
    s += t('path', { 'class': 'stem', d: 'M38 170 C43 162 47 156 48 149' });
    [[33, 186, -35], [42, 180, 30], [31, 160, -28], [43, 158, 32], [39, 140, 25], [35, 134, -30]].forEach(function (l) {
      s += t('ellipse', { 'class': 'leaf', cx: l[0], cy: l[1], rx: 4.2, ry: 2, transform: 'rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')' });
    });
    s += bud(38, 125, 1.05) + bud(28, 145, 0.8) + bud(48, 151, 0.75);
    s += t('rect', { 'class': 'pot-rim', x: 21, y: 197, width: 32, height: 6, rx: 1.4 });
    s += t('path', { 'class': 'pot', d: 'M23 203 L51 203 L48 229 L26 229 Z' });
    return s;
  }

  // ===== Lina (../will-it-last/js/story.js), feet at LINA, about 108 units tall before the scale

  var HAIR = 'M-12.9 -84.6 C-14.2 -96.6 -7.9 -101.4 0 -101.4 C7.9 -101.4 14.2 -96.6 12.9 -84.6 ' +
    'C12.2 -89.4 10.9 -92.6 8.4 -94.6 C4.4 -91.8 -2 -91.6 -6.8 -94.8 C-9.6 -93 -12 -89.8 -12.9 -84.6 Z';
  var FACES = {
    happy: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('path', { 'class': 'ln-mouth', d: 'M-3.2 -79.4 Q0 -76.2 3.2 -79.4' }),
    surprised: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85.2, rx: 1.5, ry: 2 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85.2, rx: 1.5, ry: 2 }) +
      t('path', { 'class': 'ln-brow', d: 'M-6.8 -89.4 Q-4.4 -91.8 -2 -90 M2 -90 Q4.4 -91.8 6.8 -89.4' }) +
      t('ellipse', { 'class': 'ln-mouth-o', cx: 0, cy: -78.4, rx: 1.7, ry: 2.2 }),
    worried: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('path', { 'class': 'ln-brow', d: 'M-7 -88.6 L-2.4 -90.6 M2.4 -90.6 L7 -88.6' }) +
      t('path', { 'class': 'ln-mouth', d: 'M-3.6 -78.2 Q-1.8 -79.8 0 -78.4 Q1.8 -77 3.6 -78.6' }) +
      t('path', { 'class': 'ln-sweat', d: 'M10.6 -94.4 Q8.6 -91 10.6 -89.8 Q12.6 -91 10.6 -94.4 Z' })
  };
  function lina(mood) {
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
    s += t('path', { 'class': 'ln-arm', d: 'M-10.6 -67 C-15.4 -61.4 -15.2 -55.6 -6.8 -55.4 M10.6 -67 C15.4 -61.4 15.2 -55.6 6.8 -55.4' });
    s += t('rect', { 'class': 'ln-phone', x: -4.6, y: -63.4, width: 9.2, height: 14.6, rx: 1.8 });
    s += t('circle', { 'class': 'ln-cam', cx: -2.3, cy: -61.1, r: 0.85 });
    s += t('circle', { 'class': 'ln-skin', cx: -5.9, cy: -55.4, r: 2.7 }) + t('circle', { 'class': 'ln-skin', cx: 5.9, cy: -55.4, r: 2.7 });
    return g('lina', 'translate(' + LINA.x + ' ' + LINA.y + ') scale(' + LINA.s + ')', s);
  }

  // the ring round the phone in her hands, and the dashed lines to the phone blown up
  var ZOOM = { x: LINA.x, y: LINA.y - 56.1 * LINA.s, r: 15 };
  function zoomLines() {
    var s = '';
    [[PH.x + 5, PH.y + 12], [PH.x + 5, PH.y + PH.ph * PH.s - 12]].forEach(function (p) {
      var dx = p[0] - ZOOM.x, dy = p[1] - ZOOM.y, len = Math.sqrt(dx * dx + dy * dy);
      s += t('path', { 'class': 'zoom-lead', d: 'M' + f2(ZOOM.x + dx / len * ZOOM.r) + ' ' + f2(ZOOM.y + dy / len * ZOOM.r) + ' L' + p[0] + ' ' + p[1] });
    });
    return s;
  }
  function zoomRing() { return t('circle', { 'class': 'zoom-ring', cx: ZOOM.x, cy: ZOOM.y, r: ZOOM.r }); }

  // ===== the phone blown up (Views.Phone of ../will-it-last, as markup), in phone units

  function phone(day, inner) {
    var pw = PH.pw, ph = PH.ph, inset = 2.2, s = '';
    s += t('rect', { 'class': 'ph-body', x: 0, y: 0, width: pw, height: ph, rx: 7 });
    s += t('rect', { 'class': 'ph-screen', x: inset, y: inset, width: pw - 2 * inset, height: ph - 2 * inset, rx: 5 });
    s += t('rect', { 'class': 'ph-notch', x: pw / 2 - 5.5, y: inset + 1.2, width: 11, height: 2.5, rx: 1.25 });
    var sy = inset + 2.55, bx = pw - inset - 13.2;
    s += t('text', { 'class': 'ph-day day-text', x: inset + 3.4, y: sy }, 'Day ' + day);
    var bars = '';
    for (var i = 0; i < 4; i++) { var hh = 0.9 + i * 0.62; bars += t('rect', { x: f2(bx + i * 1.25), y: f2(sy + 0.95 - hh), width: 0.85, height: f2(hh), rx: 0.2 }); }
    s += g('ph-signal', null, bars);
    var batX = pw - inset - 6.6;
    s += t('rect', { 'class': 'ph-bat', x: batX, y: sy - 2.25, width: 4.2, height: 2.3, rx: 0.55 });
    s += t('rect', { 'class': 'ph-bat-fill', x: batX + 0.55, y: sy - 1.7, width: 2.6, height: 1.2, rx: 0.25 });
    s += t('rect', { 'class': 'ph-bat-tip', x: batX + 4.35, y: sy - 1.55, width: 0.5, height: 0.9, rx: 0.2 });
    s += t('text', { 'class': 'ph-title', x: pw / 2, y: 11.2 }, 'APHIDS');
    s += t('line', { 'class': 'ph-sep', x1: inset + 2.5, x2: pw - inset - 2.5, y1: 13.6, y2: 13.6 });
    return g('st-phone', 'translate(' + PH.x + ' ' + PH.y + ') scale(' + PH.s + ')', s + inner);
  }

  // ===== the photo of the bud: 73 fixed places for aphids, the first at the tip of the bud, the
  // later ones spiralling down the bud and onto the stem; day n shows the first y_n

  var PHOTO = { x: 5, y: 16, w: 36, h: 33 };
  var APH = (function () {
    var out = [];
    for (var k = 0; k < YS[N - 1]; k++) {
      var th = k * 2.39996, x, y, r;
      if (k < 40) {
        var u = k / 39;
        y = 3.4 + u * 11;
        var hw = 5.2 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 9.2) / 7, 2)));
        x = 17 + 0.86 * hw * Math.sin(th);
      } else {
        y = 16.6 + (k - 40) / 32 * 15.6;
        x = 17.3 + 2.5 * Math.sin(th);
      }
      r = -90 + ((k * 37) % 40) - 20;
      out.push([x, y, r]);
    }
    return out;
  })();

  function aphid(p, i, popDelay) {
    var body = t('ellipse', { 'class': 'aphid', cx: 0, cy: 0, rx: 0.95, ry: 0.66 }) +
      t('path', { 'class': 'aphid-leg', d: 'M0.85 -0.25 L1.9 -0.9 M0.85 0.25 L1.9 0.9 M-0.8 -0.3 L-1.3 -0.55 M-0.8 0.3 L-1.3 0.55' });
    var o = { 'class': 'aph' + (popDelay !== undefined ? ' pop' : ''), 'data-k': i };
    if (popDelay !== undefined) o.style = 'animation-delay:' + popDelay.toFixed(2) + 's';
    return t('g', { transform: 'translate(' + f2(p[0]) + ' ' + f2(p[1]) + ') rotate(' + p[2] + ')' }, t('g', o, body));
  }

  // the photo with the first n aphids; pop: the last `pop` of them pop in on a click; badge: the count
  function photo(n, pop) {
    var s = t('rect', { 'class': 'photo-bg', x: 0, y: 0, width: PHOTO.w, height: PHOTO.h, rx: 2.4 });
    s += t('ellipse', { 'class': 'photo-leaf', cx: 6, cy: 25, rx: 7, ry: 3.2, transform: 'rotate(-25 6 25)' });
    s += t('ellipse', { 'class': 'photo-leaf', cx: 30, cy: 10, rx: 6, ry: 2.6, transform: 'rotate(30 30 10)' });
    s += t('path', { 'class': 'stem', d: 'M17.2 15 C17.6 21 17 27 17.4 33.5', style: 'stroke-width:1.9' });
    s += t('ellipse', { 'class': 'leaf', cx: 22, cy: 24.5, rx: 3.6, ry: 1.5, transform: 'rotate(-28 22 24.5)' });
    s += t('ellipse', { 'class': 'leaf', cx: 12.6, cy: 29, rx: 3.3, ry: 1.4, transform: 'rotate(26 12.6 29)' });
    s += g(null, 'translate(17 15) scale(1.55)',
      t('path', { 'class': 'petal', d: 'M0 -9 C4.6 -8 5.4 -2.4 3.6 1 C2.4 3 -2.4 3 -3.6 1 C-5.4 -2.4 -4.6 -8 0 -9 Z' }) +
      t('path', { 'class': 'petal-dk', d: 'M0 -9 C2 -6.4 2.2 -2.6 0.4 0.6 C-1.6 -2 -1.8 -6 0 -9 Z' }) +
      t('path', { 'class': 'sepal', d: 'M-3.8 0.4 L-1.2 4.2 L0 1.8 L1.2 4.2 L3.8 0.4 L2.4 3 C1 4.6 -1 4.6 -2.4 3 Z' }));
    var a = '';
    for (var i = 0; i < APH.length; i++) {
      var d = pop && i >= n - pop && i < n ? 0.75 + 0.18 * (i - (n - pop)) : undefined;
      a += t('g', { 'class': 'aph-slot', style: i < n ? '' : 'display:none' }, aphid(APH[i], i, d));
    }
    s += g('aphids', null, a);
    s += t('rect', { 'class': 'flash-rect', x: 0, y: 0, width: PHOTO.w, height: PHOTO.h, rx: 2.4 });
    s += t('circle', { 'class': 'badge-c', cx: 31.6, cy: 4.2, r: 3.4 });
    s += t('text', { 'class': 'badge-t', x: 31.6, y: 4.3 }, String(n));
    return g('photo', 'translate(' + PHOTO.x + ' ' + PHOTO.y + ')', s);
  }

  // ===== the small chart under the photo: the day from 0 to 11 across, the aphids from 0 to 120 up

  var CH = { x0: 7, x1: 41.5, base: 84, top: 55.5 };
  function chX(d) { return CH.x0 + d / 11 * (CH.x1 - CH.x0); }
  function chY(v) { return CH.base - v / 120 * (CH.base - CH.top); }
  function chart(n, opts) {
    opts = opts || {};
    var s = t('path', { 'class': 'ch-axis', d: 'M' + CH.x0 + ' ' + CH.top + ' V' + CH.base + ' H' + CH.x1 });
    [2, 4, 6, 8, 10].forEach(function (d) { s += t('text', { 'class': 'ch-tick', x: f2(chX(d)), y: CH.base + 2.3 }, String(d)); });
    [50, 100].forEach(function (v) { s += t('text', { 'class': 'ch-tick', x: CH.x0 - 2.2, y: f2(chY(v) + 0.6) }, String(v)); });
    if (opts.question) {
      s += t('path', { 'class': 'ch-q draw', d: 'M' + CH.x0 + ' ' + f2(chY(Q.y)) + ' H' + CH.x1, style: 'animation-delay:0.5s' });
      s += t('path', { 'class': 'ch-q', d: 'M' + f2(chX(Q.x)) + ' ' + CH.base + ' V' + f2(CH.top - 1) });
      s += g('pop', null, kbox(CH.x1 - 3, chY(Q.y) - 2.2, 0.32)).replace('class="pop"', 'class="pop" style="animation-delay:1.5s"');
      s += t('text', { 'class': 'ch-qm pulse-once', x: f2(chX(Q.x)), y: f2(CH.top - 1.6), style: 'animation-delay:2.2s' }, '?');
    }
    for (var i = 0; i < N; i++) {
      var o = { 'class': 'ch-pt' + (opts.popLast && i === n - 1 ? ' pop' : ''), cx: f2(chX(XS[i])), cy: f2(chY(YS[i])), r: 0.8, 'data-i': i };
      if (opts.popLast && i === n - 1) o.style = 'animation-delay:' + opts.popLast + 's';
      if (i >= n) o.style = 'display:none';
      s += t('circle', o);
    }
    return g('chart', null, s);
  }

  // ===== the box of ladybird larvae: kraft, air holes, a ladybird on the lid (centred at x, y)

  function kbox(x, y, k) {
    var s = t('rect', { 'class': 'kbox', x: -9, y: -2, width: 18, height: 11, rx: 0.8 });
    s += t('rect', { 'class': 'kbox-lid', x: -10, y: -5.6, width: 20, height: 4.2, rx: 0.8 });
    [-5, 0, 5].forEach(function (hx) { s += t('circle', { 'class': 'kbox-hole', cx: hx, cy: 5.4, r: 0.75 }); });
    s += t('ellipse', { 'class': 'bug', cx: 0.6, cy: -3.6, rx: 3.6, ry: 2.6 });
    s += t('circle', { 'class': 'bug-head', cx: -3.2, cy: -3.6, r: 1.2 });
    s += t('path', { 'class': 'bug-line', d: 'M-2 -3.6 H4.2' });
    s += t('circle', { 'class': 'bug-spot', cx: -0.4, cy: -4.7, r: 0.6 }) + t('circle', { 'class': 'bug-spot', cx: 2, cy: -2.5, r: 0.6 }) +
      t('circle', { 'class': 'bug-spot', cx: 2.6, cy: -4.6, r: 0.5 }) + t('circle', { 'class': 'bug-spot', cx: -0.2, cy: -2.4, r: 0.5 });
    return g(null, 'translate(' + f2(x) + ' ' + f2(y) + ') scale(' + k + ')', s);
  }

  // the shop on the phone: the box, "for 100 aphids", the Order button (a check once ordered) and
  // the delivery tag "day 10"
  function shop() {
    var s = t('rect', { 'class': 'shop-card slide-up', x: 5, y: 16.5, width: 36, height: 66, rx: 2.6 });
    s += g('slide-up', null, kbox(23, 33, 0.95) +
      t('text', { 'class': 'shop-t', x: 23, y: 49 }, 'for 100 aphids'));
    s += g('order-btn', null, t('rect', { 'class': 'shop-btn', x: 11, y: 55, width: 24, height: 7, rx: 3.5 }) +
      t('text', { 'class': 'shop-btn-t', x: 23, y: 58.6 }, 'Order'));
    s += g('order-done', null, t('rect', { 'class': 'shop-btn', x: 11, y: 55, width: 24, height: 7, rx: 3.5 }) +
      t('path', { 'class': 'shop-check', d: 'M19.6 58.6 L22.2 61 L26.8 56.4' }));
    s += g('pop', null, t('path', { 'class': 'tag', d: 'M15 68 H31 L33.4 71.5 L31 75 H15 Z' }) +
      t('text', { 'class': 'tag-t', x: 23, y: 71.6 }, 'day ' + Q.x)).replace('class="pop"', 'class="pop" style="animation-delay:2.1s"');
    return s;
  }

  // ===== the props: the desk calendar (its line "of 30" dropped) and the callout of card 4

  function calendar(x, y, n) {
    var s = '';
    s += t('rect', { 'class': 'cal-shadow', x: 2, y: 3, width: 40, height: 44, rx: 5 });
    s += t('rect', { 'class': 'cal-page', x: 0, y: 0, width: 40, height: 44, rx: 5 });
    s += t('path', { 'class': 'cal-top', d: 'M0 13 V5 A5 5 0 0 1 5 0 H35 A5 5 0 0 1 40 5 V13 Z' });
    s += t('rect', { 'class': 'cal-ring', x: 9, y: -3.4, width: 3.2, height: 8, rx: 1.6 });
    s += t('rect', { 'class': 'cal-ring', x: 27.8, y: -3.4, width: 3.2, height: 8, rx: 1.6 });
    s += t('text', { 'class': 'cal-head', x: 20, y: 9.4 }, 'DAY');
    s += t('text', { 'class': 'cal-n', x: 20, y: 37 }, String(n));
    return g(null, 'translate(' + x + ' ' + y + ')', s);
  }

  function callout() {
    var tx = PH.x + chX(XS[N - 1]) * PH.s, ty = PH.y + chY(YS[N - 1]) * PH.s;
    var w = 74, h = 36, x = 108, y = 56;
    var s = t('path', { 'class': 'callout-lead', d: 'M' + (x + w) + ' ' + (y + h / 2) + ' L' + f2(tx) + ' ' + f2(ty) });
    s += t('circle', { 'class': 'callout-dot', cx: f2(tx), cy: f2(ty), r: 3.4 });
    s += t('rect', { 'class': 'callout-bg', x: x, y: y, width: w, height: h, rx: 9 });
    s += t('text', { 'class': 'callout-a', x: x + w / 2, y: y + 15.5 }, YS[N - 1] + ' aphids');
    s += t('text', { 'class': 'callout-b', x: x + w / 2, y: y + 28 }, (Q.x - XS[N - 1]) + ' days to go');
    return g('pop', null, s).replace('class="pop"', 'class="pop" style="animation-delay:1.8s"');
  }

  // ===== card 5: the blackboard

  var BD = { ox: 44, oy: 186, day: 21.6, ap: 1.32 };
  function bX(d) { return BD.ox + d * BD.day; }
  function bY(v) { return BD.oy - v * BD.ap; }
  function chalkboard(uid) {
    var s = '';
    s += t('rect', { 'class': 'bd-wood', x: 0, y: 0, width: VW, height: VH });
    s += t('rect', { x: 8, y: 8, width: VW - 16, height: 206, rx: 2, fill: 'url(#' + uid + '-board)' });
    s += t('ellipse', { 'class': 'bd-dust', cx: 118, cy: 64, rx: 64, ry: 13, transform: 'rotate(-7 118 64)' });
    s += t('ellipse', { 'class': 'bd-dust', cx: 236, cy: 150, rx: 54, ry: 11, transform: 'rotate(5 236 150)' });
    s += t('rect', { 'class': 'bd-tray', x: 2, y: 214, width: VW - 4, height: 9, rx: 1.5 });
    s += t('rect', { 'class': 'bd-tray-hi', x: 2, y: 214, width: VW - 4, height: 1.6 });
    s += g(null, 'translate(74 204)', t('rect', { 'class': 'bd-felt', x: 0, y: 4.2, width: 36, height: 5.8, rx: 1 }) +
      t('rect', { 'class': 'bd-eraser', x: 0, y: 0, width: 36, height: 5.6, rx: 1.6 }));
    s += t('rect', { 'class': 'bd-chalk', x: 264, y: 209.4, width: 22, height: 4.6, rx: 2.3 });
    s += t('rect', { 'class': 'bd-chalk y', x: 290, y: 209.8, width: 14, height: 4.2, rx: 2.1 });
    // the axes, with arrowheads, and their ticks
    s += t('path', { 'class': 'bd-axis', d: 'M' + BD.ox + ' ' + BD.oy + ' H300 M294 ' + (BD.oy - 4) + ' L300 ' + BD.oy + ' L294 ' + (BD.oy + 4) +
      ' M' + BD.ox + ' ' + BD.oy + ' V18 M' + (BD.ox - 4) + ' 24 L' + BD.ox + ' 18 L' + (BD.ox + 4) + ' 24' });
    [2, 4, 6, 8, 10].forEach(function (d) {
      s += t('path', { 'class': 'bd-tick', d: 'M' + bX(d) + ' ' + BD.oy + ' v4' });
      s += t('text', { 'class': 'bd-lab', x: bX(d), y: BD.oy + 13 }, String(d));
    });
    [25, 50, 75, 100].forEach(function (v) {
      s += t('path', { 'class': 'bd-tick', d: 'M' + BD.ox + ' ' + f2(bY(v)) + ' h-4' });
      s += t('text', { 'class': 'bd-lab end', x: BD.ox - 7, y: f2(bY(v)) }, String(v));
    });
    s += t('text', { 'class': 'bd-lab', x: 300, y: BD.oy - 7 }, 'x');
    s += t('text', { 'class': 'bd-lab', x: BD.ox + 9, y: 22 }, 'y');
    // the points, one a day
    for (var i = 0; i < N; i++) {
      s += t('circle', { 'class': 'bd-dot pop', cx: f2(bX(XS[i])), cy: f2(bY(YS[i])), r: 3.3, style: 'animation-delay:' + (0.2 + 0.15 * i).toFixed(2) + 's' });
    }
    // the question: 100 aphids, one box; day 10
    var y100 = bY(Q.y), x10 = bX(Q.x);
    s += t('path', { 'class': 'bd-q draw', d: 'M' + BD.ox + ' ' + f2(y100) + ' H290', style: 'animation-delay:1.5s' });
    s += g('pop', null, t('path', { 'class': 'bd-box', d: 'M291 ' + f2(y100 - 3) + ' h14 v9 h-14 Z M290 ' + f2(y100 - 3) + ' l2 -3 h12 l2 3' }) +
      t('text', { 'class': 'bd-y end', x: 306, y: f2(y100 + 20) }, '1 box')).replace('class="pop"', 'class="pop" style="animation-delay:2.4s"');
    s += t('path', { 'class': 'bd-q draw', d: 'M' + x10 + ' ' + BD.oy + ' V' + f2(y100 - 4), style: 'animation-delay:2.6s' });
    s += t('text', { 'class': 'bd-qm pop', x: x10, y: f2(y100 - 7), style: 'animation-delay:3.4s' }, '?');
    s += t('text', { 'class': 'bd-f fade-in', x: 304, y: 22, style: 'animation-delay:3.9s' }, '&#375;(x) = ?');
    return s;
  }

  // ===== the five pictures

  function scene(uid, time, back, mood, mid, front, screen, day) {
    return t('defs', {}, skyDefs(uid)) +
      t('rect', { x: 0, y: 0, width: VW, height: VH, fill: 'url(#' + uid + '-sky)' }) +
      back + city(time === 'dusk' || time === 'night') + balcony() + rose() + lina(mood) + zoomLines() + mid + zoomRing() +
      phone(day, screen) + front;
  }

  function picture(name) {
    var n8 = YS[N - 1];
    if (name === 'spring') {
      return scene('st1', 'morning', sun(36, 54, 11) + cloud(104, 30, 1.1) + cloud(150, 46, 0.8), 'surprised', '', '',
        photo(YS[0], YS[0]) + chart(1, { popLast: 1.9 }), 1);
    }
    if (name === 'order') {
      return scene('st2', 'day', sun(30, 30, 9) + cloud(110, 26, 1.05) + cloud(150, 52, 0.75), 'happy', '', '', shop(), 1);
    }
    if (name === 'evenings') {
      return scene('st3', 'dusk', stars([[134, 22, 2.2], [176, 40, 1.4], [58, 18, 1.2]]) + moon(30, 34, 8), 'happy',
        g('cal-holder', null, calendar(128, 52, N)), '', photo(n8) + chart(N), N);
    }
    if (name === 'worry') {
      return scene('st4', 'night', moon(30, 36, 9) + stars([[66, 18, 1.6], [112, 28, 2.2], [150, 16, 1.4], [178, 34, 1.8], [96, 52, 1.1], [14, 74, 1.2], [128, 46, 1]], true),
        'worried', '', callout(), photo(n8) + chart(N, { question: true }), N);
    }
    return t('defs', {}, t('linearGradient', { id: 'st5-board', x1: 0, y1: 0, x2: 0, y2: 1 },
      t('stop', { offset: 0, 'class': 'bd0' }) + t('stop', { offset: 1, 'class': 'bd1' }))) + chalkboard('st5');
  }

  // ===== the symbols of card 5 (STORY.md, section 6)

  function symbols(box) {
    var d = K.div('sym', box);
    function row(key, tex, say) {
      var k = K.div('key', d);
      k.textContent = key;
      var w = K.div('what', d);
      var m = K.div('m', w, 'span');
      K.tex(m, tex);
      if (say) { var s = K.div('say', w, 'span'); s.textContent = say; }
    }
    row('given', 'x = ' + XS.join(',\\ '), 'days');
    row('', 'y = ' + YS.join(',\\ '), 'aphids');
    row('find', '\\hat y(x)', 'a curve close to every point');
    K.div('rule', d);
    row('then', '\\hat y(' + Q.x + ') > ' + Q.y + '\\ ?', 'one box or two');
  }

  // ===== build, render, animate

  function build(layer) {
    var P = G.story.pic, W = G.story.text;
    el.box = K.div('story vis', layer.top);
    CARDS.forEach(function (name, k) {
      var c = { name: name };
      c.pic = K.div('story-pic', el.box);
      K.pos(c.pic, P.x, P.y, 'tl');
      c.pic.style.width = P.w + 'px';
      c.pic.style.height = P.h + 'px';
      c.svg = K.svg('svg', { viewBox: '0 0 ' + VW + ' ' + VH, width: P.w, height: P.h, role: 'img', 'aria-label': LABELS[name] }, c.pic,
        'story-svg t-' + ['morning', 'day', 'dusk', 'night', 'board'][k]);
      c.svg.innerHTML = picture(name);
      c.words = K.div('story-words', el.box);
      K.pos(c.words, W.x, W.y, 'tl');
      c.words.style.width = W.w + 'px';
      c.words.innerHTML = '<h2>' + WORDS[name].title + '</h2><p>' + WORDS[name].text + '</p>';
      if (name === 'board') symbols(c.words);
      el.cards[name] = c;
    });
    el.dotRow = K.div('story-dots', el.box);
    K.pos(el.dotRow, W.x, P.y + P.h - 10, 'bl');
    CARDS.forEach(function () { el.dots.push(K.div('dot', el.dotRow, 'span')); });
  }

  // card 3 at evening d: the calendar, the status bar, the aphids, the badge and the points
  function setEvening(c, d) {
    var n = YS[d - 1];
    c.svg.querySelector('.cal-n').textContent = String(d);
    c.svg.querySelector('.day-text').textContent = 'Day ' + d;
    c.svg.querySelector('.badge-t').textContent = String(n);
    Array.prototype.forEach.call(c.svg.querySelectorAll('.aph-slot'), function (s, i) { s.style.display = i < n ? '' : 'none'; });
    Array.prototype.forEach.call(c.svg.querySelectorAll('.ch-pt'), function (p, i) { p.style.display = i < d ? '' : 'none'; });
  }

  function render(st) {
    var on = st.part === 'story';
    K.show(el.box, on);
    CARDS.forEach(function (name, i) {
      var c = el.cards[name], cur = on && st.name === name;
      c.pic.classList.toggle('cur', cur);
      c.words.classList.toggle('cur', cur);
      c.svg.classList.remove('play');
      el.dots[i].classList.toggle('cur', cur);
    });
    setEvening(el.cards.evenings, N);
    el.cards.spring.svg.querySelector('.badge-t').textContent = String(YS[0]);
    document.getElementById('stage').classList.toggle('in-story', on);
  }

  function animate(st) {
    if (st.part !== 'story') return;
    var c = el.cards[st.name];
    K.tempClass(c.pic, 'enter');
    K.tempClass(c.words, 'enter');
    void c.svg.getBoundingClientRect();
    c.svg.classList.add('play');
    if (st.name === 'spring') {
      // the badge ticks from 0 to 5 while the aphids pop in
      var b = c.svg.querySelector('.badge-t');
      b.textContent = '0';
      for (var k = 1; k <= YS[0]; k++) {
        (function (k) { K.wait(750 + 180 * (k - 1) + 120, function () { b.textContent = String(k); }); })(k);
      }
    } else if (st.name === 'evenings') {
      // a montage of evenings 1 to 8, about 0.4 s each: the calendar turns, the screen flashes,
      // the new aphids appear, the badge counts, a point drops
      setEvening(c, 1);
      var fl = c.svg.querySelector('.flash-rect');
      for (var d = 2; d <= N; d++) {
        (function (d) {
          K.wait(500 + (d - 2) * 420, function () {
            setEvening(c, d);
            fl.style.animation = 'none';
            void fl.getBoundingClientRect();
            fl.style.animation = 'st-flash 0.35s ease-out';
            var p = c.svg.querySelectorAll('.ch-pt')[d - 1];
            p.classList.remove('pop');
            void p.getBoundingClientRect();
            p.classList.add('pop');
          });
        })(d);
      }
    }
  }

  GF.parts.story = {
    steps: function (iter) { return iter === 1 ? CARDS.slice() : []; },
    build: build, render: render, animate: animate,
    el: el, APH: APH
  };
})();
