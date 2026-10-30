/* Will it last? The story: five cards that set the scene before round 1, the
 * way Mara's story opens Mara's road in the CSCS workshop (cscs-hs26,
 * courier-road-game): one picture and two short sentences a card, Back and
 * Next, and dots. window.StoryPage.
 *
 *   1 Five gigabytes a month   day 1, morning: the plan, an empty gold column
 *   2 A little every day       a montage of days 1 to 16, one brick a day
 *   3 Day 17                   dusk: she checks, 3.00 of 5 GB
 *   4 Will it last?            night: 2 GB left, 13 days to go, and a snail
 *   5 What is w?               the problem on a blackboard: given x = 17 and
 *                              y = 3, find w such that y = w x
 *
 * The words of the cards are in index.html. This file draws the pictures: a
 * street at four hours of the day, Lina, and her phone blown up beside her.
 * The phone is the one of rounds 1 and 2 (Views.Phone and Views.Bricks) with
 * the plan's 5 GB as the gold column and her days as bricks, so the rounds
 * look familiar when they start. Card 5 lays the same bricks out on a
 * blackboard, one a day, so they climb the line y = w x from zero to 3 GB on
 * day 17. The pictures never give the rate away: during the montage the
 * counter shows a question mark, and the board writes w = ?.
 *
 * No colour is written here. The street and Lina take theirs from
 * css/story.css, the phone from css/round.css and css/verdict.css.
 */
(function () {
  'use strict';

  var UI = window.UI;
  var WL = window.WillItLast;
  var Views = window.Views;

  var VW = 320;
  var VH = 240;
  var KERB = 198;                                  // where the pavement starts
  var RATE = WL.SEEN.used / WL.SEEN.days;          // 3 / 17 GB a day
  var LINA = { x: 84, y: 225, s: 1.42 };           // her feet, and her scale
  var PH = { x: 194, y: 14, s: 2.32, pw: 46, ph: 89 };
  var COL = { cx: 11, cw: 18, B: 82, TH: 50 };     // the plan's 5 GB, in phone units
  var U = COL.TH / WL.PLAN.gb;                     // phone units per GB
  var MONTAGE_LAST = WL.SEEN.days - 1;             // the montage runs days 1 to 16
  var MONTAGE_STEP = 210;                          // ms a day

  // ===== markup helpers: the static parts of a picture are built as text =====

  function attrs(o) {
    var s = '';
    for (var k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) { s += ' ' + k + '="' + o[k] + '"'; }
    }
    return s;
  }
  function t(name, o, inner) {
    return '<' + name + attrs(o || {}) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>');
  }
  function g(cls, transform, inner) {
    var o = {};
    if (cls) { o['class'] = cls; }
    if (transform) { o.transform = transform; }
    return t('g', o, inner);
  }

  // ===== the street =====

  function skyDefs(uid) {
    return t('linearGradient', { id: uid + '-sky', x1: 0, y1: 0, x2: 0, y2: 1 },
      t('stop', { offset: 0, 'class': 'sky0' }) + t('stop', { offset: 0.62, 'class': 'sky1' }) + t('stop', { offset: 1, 'class': 'sky2' }));
  }

  // x, width, top of each building; the back row is lighter and plain
  var BACK = [[-6, 42, 92], [34, 30, 116], [62, 46, 82], [106, 26, 110], [130, 40, 90], [168, 30, 114], [196, 46, 76], [240, 34, 100], [272, 54, 86]];
  var FRONT = [[-8, 32, 136], [22, 38, 148], [58, 28, 128], [84, 44, 144], [126, 32, 132], [156, 40, 152], [194, 34, 126], [226, 40, 142], [264, 30, 132], [292, 36, 148]];

  function city(lit) {
    var s = '';
    BACK.forEach(function (b) {
      s += t('rect', { 'class': 'bld-b', x: b[0], y: b[2], width: b[1], height: KERB - b[2] });
    });
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

  function street() {
    var s = t('rect', { 'class': 'walk', x: 0, y: KERB, width: VW, height: VH - KERB });
    s += t('rect', { 'class': 'kerb', x: 0, y: KERB, width: VW, height: 2.6 });
    for (var x = 18; x < VW; x += 44) {
      s += t('path', { 'class': 'joint', d: 'M' + x + ' ' + (KERB + 2.6) + ' L' + (x - 14) + ' ' + VH });
    }
    return s;
  }

  function sun(x, y, r) {
    return t('circle', { 'class': 'sun-halo', cx: x, cy: y, r: r * 1.9 }) + t('circle', { 'class': 'sun', cx: x, cy: y, r: r });
  }
  function cloud(x, y, k) {
    return t('path', {
      'class': 'cloud',
      d: 'M' + x + ' ' + y + ' h' + (30 * k) + ' a' + (5 * k) + ' ' + (5 * k) + ' 0 0 0 -' + (6 * k) + ' -' + (6 * k) +
        ' a' + (8 * k) + ' ' + (8 * k) + ' 0 0 0 -' + (14 * k) + ' -' + (2 * k) + ' a' + (6 * k) + ' ' + (6 * k) + ' 0 0 0 -' + (10 * k) + ' ' + (8 * k) + ' Z'
    });
  }
  function moon(x, y, r) {
    // a crescent: the left half of a disc, less a shallower arc
    return t('path', {
      'class': 'moon',
      d: 'M' + x + ' ' + (y - r) + ' A' + r + ' ' + r + ' 0 0 0 ' + x + ' ' + (y + r) +
        ' A' + (r * 1.25) + ' ' + (r * 1.25) + ' 0 0 1 ' + x + ' ' + (y - r) + ' Z'
    });
  }
  function stars(list) {
    return list.map(function (p) {
      var x = p[0];
      var y = p[1];
      var r = p[2];
      return t('path', {
        'class': 'star',
        d: 'M' + x + ' ' + (y - r) + ' Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
          ' Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + ' Z'
      });
    }).join('');
  }

  // A ring round the phone in Lina's hands and two dashed lines to the big
  // phone: the big one is her screen, blown up. The lines go under the props
  // (the calendar, the badges) and the ring over Lina.
  var ZOOM = { x: LINA.x, y: LINA.y - 56.1 * LINA.s, r: 15 };
  function zoomLines() {
    var s = '';
    [[PH.x + 5, PH.y + 12], [PH.x + 5, PH.y + PH.ph * PH.s - 12]].forEach(function (p) {
      var dx = p[0] - ZOOM.x;
      var dy = p[1] - ZOOM.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      s += t('path', {
        'class': 'zoom-lead',
        d: 'M' + (ZOOM.x + dx / len * ZOOM.r).toFixed(2) + ' ' + (ZOOM.y + dy / len * ZOOM.r).toFixed(2) + ' L' + p[0] + ' ' + p[1]
      });
    });
    return s;
  }
  function zoomRing() { return t('circle', { 'class': 'zoom-ring', cx: ZOOM.x, cy: ZOOM.y, r: ZOOM.r }); }

  // ===== Lina =====

  var HAIR = 'M-12.9 -84.6 C-14.2 -96.6 -7.9 -101.4 0 -101.4 C7.9 -101.4 14.2 -96.6 12.9 -84.6 ' +
    'C12.2 -89.4 10.9 -92.6 8.4 -94.6 C4.4 -91.8 -2 -91.6 -6.8 -94.8 C-9.6 -93 -12 -89.8 -12.9 -84.6 Z';

  var FACES = {
    // looking down at the phone, pleased
    happy: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('path', { 'class': 'ln-mouth', d: 'M-3.2 -79.4 Q0 -76.2 3.2 -79.4' }),
    // eyes shut, humming along to the music
    music: t('path', { 'class': 'ln-lid', d: 'M-6 -84.6 Q-4.3 -87 -2.6 -84.6 M2.6 -84.6 Q4.3 -87 6 -84.6' }) +
      t('path', { 'class': 'ln-mouth-o', d: 'M-3.4 -79.8 Q0 -74.4 3.4 -79.8 Z' }),
    // brows up, mouth round
    surprised: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85.2, rx: 1.5, ry: 2 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85.2, rx: 1.5, ry: 2 }) +
      t('path', { 'class': 'ln-brow', d: 'M-6.8 -89.4 Q-4.4 -91.8 -2 -90 M2 -90 Q4.4 -91.8 6.8 -89.4' }) +
      t('ellipse', { 'class': 'ln-mouth-o', cx: 0, cy: -78.4, rx: 1.7, ry: 2.2 }),
    // brows tilted, a wobbly mouth and a drop of sweat
    worried: t('ellipse', { 'class': 'ln-eye', cx: -4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('ellipse', { 'class': 'ln-eye', cx: 4.3, cy: -85, rx: 1.3, ry: 1.65 }) +
      t('path', { 'class': 'ln-brow', d: 'M-7 -88.6 L-2.4 -90.6 M2.4 -90.6 L7 -88.6' }) +
      t('path', { 'class': 'ln-mouth', d: 'M-3.6 -78.2 Q-1.8 -79.8 0 -78.4 Q1.8 -77 3.6 -78.6' }) +
      t('path', { 'class': 'ln-sweat', d: 'M10.6 -94.4 Q8.6 -91 10.6 -89.8 Q12.6 -91 10.6 -94.4 Z' })
  };

  // Lina, front on, holding her phone in both hands. Her feet are at 0 0 and
  // she is about 108 units tall before the scale.
  function lina(mood) {
    var s = '';
    s += t('ellipse', { 'class': 'ln-shadow', cx: 0, cy: 0, rx: 17, ry: 2.8 });
    s += t('path', { 'class': 'ln-leg', d: 'M-5 -37 L-5.3 -5.2 M5 -37 L5.3 -5.2' });
    s += t('path', { 'class': 'ln-shoe', d: 'M-11.4 -0.6 C-11.4 -4.6 -8.8 -6.4 -5.6 -6.4 C-2.6 -6.4 -1.1 -4.5 -1.1 -2.1 L-1.1 -0.6 Z' });
    s += t('path', { 'class': 'ln-shoe', d: 'M11.4 -0.6 C11.4 -4.6 8.8 -6.4 5.6 -6.4 C2.6 -6.4 1.1 -4.5 1.1 -2.1 L1.1 -0.6 Z' });
    // the hoodie, its hem, the neck, the hood's collar and the strings
    s += t('path', { 'class': 'ln-top', d: 'M-12.2 -66.4 C-12.2 -70.6 -9.4 -72.4 -5.8 -72.4 L5.8 -72.4 C9.4 -72.4 12.2 -70.6 12.2 -66.4 L13.8 -40.2 C13.8 -37.4 12.3 -35.8 9.6 -35.8 L-9.6 -35.8 C-12.3 -35.8 -13.8 -37.4 -13.8 -40.2 Z' });
    s += t('path', { 'class': 'ln-top-dk', d: 'M-13.6 -42.6 L13.6 -42.6 L13.8 -40.2 C13.8 -37.4 12.3 -35.8 9.6 -35.8 L-9.6 -35.8 C-12.3 -35.8 -13.8 -37.4 -13.8 -40.2 Z' });
    s += t('rect', { 'class': 'ln-skin-dk', x: -2.9, y: -76.8, width: 5.8, height: 5.6, rx: 1.2 });
    s += t('path', { 'class': 'ln-top-dk', d: 'M-7.8 -72.4 C-5.6 -67 5.6 -67 7.8 -72.4 C4.6 -70.2 -4.6 -70.2 -7.8 -72.4 Z' });
    s += t('path', { 'class': 'ln-string', d: 'M-2.3 -68.8 V-62.4 M2.3 -68.8 V-62.4' });
    // the head: the bun behind, the face, the hair over it
    s += t('circle', { 'class': 'ln-hair', cx: 0, cy: -103.6, r: 5.8 });
    s += t('circle', { 'class': 'ln-skin', cx: 0, cy: -87, r: 12.4 });
    s += t('path', { 'class': 'ln-hair', d: HAIR });
    s += t('circle', { 'class': 'ln-cheek', cx: -7.9, cy: -81, r: 2.1 }) + t('circle', { 'class': 'ln-cheek', cx: 7.9, cy: -81, r: 2.1 });
    s += FACES[mood] || FACES.happy;
    if (mood === 'music') {
      s += t('path', { 'class': 'ln-hp-band', d: 'M-13.4 -86.4 C-14.6 -104 14.6 -104 13.4 -86.4' });
      s += t('rect', { 'class': 'ln-hp', x: -16.6, y: -91.6, width: 5.6, height: 10, rx: 2.6 });
      s += t('rect', { 'class': 'ln-hp', x: 11, y: -91.6, width: 5.6, height: 10, rx: 2.6 });
    }
    // the arms, the phone (we see its back) and the hands on its sides
    s += t('path', { 'class': 'ln-arm', d: 'M-10.6 -67 C-15.4 -61.4 -15.2 -55.6 -6.8 -55.4 M10.6 -67 C15.4 -61.4 15.2 -55.6 6.8 -55.4' });
    s += t('rect', { 'class': 'ln-phone', x: -4.6, y: -63.4, width: 9.2, height: 14.6, rx: 1.8 });
    s += t('circle', { 'class': 'ln-cam', cx: -2.3, cy: -61.1, r: 0.85 });
    s += t('circle', { 'class': 'ln-skin', cx: -5.9, cy: -55.4, r: 2.7 }) + t('circle', { 'class': 'ln-skin', cx: 5.9, cy: -55.4, r: 2.7 });
    return g('lina', 'translate(' + LINA.x + ' ' + LINA.y + ') scale(' + LINA.s + ')', s);
  }

  // ===== the props =====

  // A desk calendar page: "DAY", the number, and "of 30".
  function calendar(x, y, n) {
    var s = '';
    s += t('rect', { 'class': 'cal-shadow', x: 2, y: 3, width: 40, height: 48, rx: 5 });
    s += t('rect', { 'class': 'cal-page', x: 0, y: 0, width: 40, height: 48, rx: 5 });
    s += t('path', { 'class': 'cal-top', d: 'M0 13 V5 A5 5 0 0 1 5 0 H35 A5 5 0 0 1 40 5 V13 Z' });
    s += t('rect', { 'class': 'cal-ring', x: 9, y: -3.4, width: 3.2, height: 8, rx: 1.6 });
    s += t('rect', { 'class': 'cal-ring', x: 27.8, y: -3.4, width: 3.2, height: 8, rx: 1.6 });
    s += t('text', { 'class': 'cal-head', x: 20, y: 9.4 }, 'DAY');
    s += t('text', { 'class': 'cal-n', x: 20, y: 35.6 }, String(n));
    s += t('text', { 'class': 'cal-sub', x: 20, y: 44 }, 'of ' + WL.PLAN.days);
    // the place sits on the outer group, the motion on the inner one: a CSS
    // transform would replace a transform attribute on the same element
    return g(null, 'translate(' + x + ' ' + y + ')', g('cal st-pop', null, s));
  }

  // What a day of hers is made of, as round badges that pop up one by one.
  var ICONS = {
    pin: t('path', { 'class': 'ico', d: 'M12 21.5 C7.6 16.4 5 12.8 5 9.6 A7 7 0 0 1 19 9.6 C19 12.8 16.4 16.4 12 21.5 Z' }) +
      t('circle', { 'class': 'ico-hole', cx: 12, cy: 9.6, r: 2.6 }),
    note: t('path', { 'class': 'ico-line', d: 'M9.4 17.6 V5.6 L19 3.4 V15.4' }) +
      t('circle', { 'class': 'ico', cx: 6.9, cy: 17.6, r: 2.9 }) + t('circle', { 'class': 'ico', cx: 16.5, cy: 15.4, r: 2.9 }),
    chat: t('path', { 'class': 'ico', d: 'M3.5 6.5 A3 3 0 0 1 6.5 3.5 H17.5 A3 3 0 0 1 20.5 6.5 V13.5 A3 3 0 0 1 17.5 16.5 H11 L6.5 20.5 V16.5 A3 3 0 0 1 3.5 13.5 Z' }) +
      t('circle', { 'class': 'ico-hole', cx: 8, cy: 10, r: 1.25 }) + t('circle', { 'class': 'ico-hole', cx: 12, cy: 10, r: 1.25 }) + t('circle', { 'class': 'ico-hole', cx: 16, cy: 10, r: 1.25 }),
    // a cat video: a cat's head with a play button for a nose
    cat: t('path', { 'class': 'ico-cat', d: 'M3.6 20 V7.4 L3.4 2.6 L8.8 6.2 H15.2 L20.6 2.6 L20.4 7.4 V20 Z' }) +
      t('path', { 'class': 'ico-play', d: 'M10.2 10.6 L15.4 13.6 L10.2 16.6 Z' }) +
      t('path', { 'class': 'ico-whisk', d: 'M1.6 13.4 H6 M1.8 16.4 L6 15.6 M22.4 13.4 H18 M22.2 16.4 L18 15.6' })
  };
  function badge(x, y, r, icon, k) {
    var s = t('circle', { 'class': 'badge-bg', cx: 0, cy: 0, r: r });
    s += g(null, 'translate(' + (-r * 0.62) + ' ' + (-r * 0.62) + ') scale(' + (r * 1.24 / 24) + ')', ICONS[icon]);
    return g(null, 'translate(' + x + ' ' + y + ')', g('badge st-pop b' + k, null, s));
  }

  // A note in the air with a dashed lead to the free part of the column. It
  // stands in front of the phone, so the lead reaches the column.
  function callout() {
    var tx = PH.x + COL.cx * PH.s;
    var ty = PH.y + (COL.B - (WL.PLAN.gb + WL.SEEN.used) / 2 * U) * PH.s;
    var w = 76;
    var h = 38;
    var x = 108;
    var y = ty - h / 2;     // level with the middle of what is left
    var s = t('path', { 'class': 'callout-lead', d: 'M' + (x + w) + ' ' + ty + ' L' + tx + ' ' + ty });
    s += t('circle', { 'class': 'callout-dot', cx: tx, cy: ty, r: 1.8 });
    s += t('rect', { 'class': 'callout-bg', x: x, y: y, width: w, height: h, rx: 9 });
    s += t('text', { 'class': 'callout-a', x: x + w / 2, y: y + 16.5 }, WL.fmt(WL.PLAN.gb - WL.SEEN.used, 0) + ' GB left');
    s += t('text', { 'class': 'callout-b', x: x + w / 2, y: y + 29 }, WL.fmt(WL.PLAN.days - WL.SEEN.days, 0) + ' days to go');
    return g('callout st-pop', null, s);
  }

  // A snail on the pavement, facing Lina, with a loading wheel on its shell.
  function snail(x, y) {
    var s = '';
    s += t('ellipse', { 'class': 'sn-shadow', cx: 2, cy: 0.4, rx: 19, ry: 2.2 });
    s += t('path', { 'class': 'sn-body', d: 'M-19 0 C-19 -3.6 -15.6 -5.4 -12 -5.4 L13 -5.4 C17.4 -5.4 20.4 -2.8 20.6 0 Z' });
    s += t('path', { 'class': 'sn-body', d: 'M-16.8 -2.6 C-19.4 -6.4 -19.6 -11.6 -17.4 -15.2 C-15.6 -18 -11.4 -18.2 -10 -15 C-9 -12.6 -9.8 -8.6 -8.4 -5 Z' });
    s += t('path', { 'class': 'sn-stalk', d: 'M-16.2 -15.6 L-19.6 -23.4 M-12.2 -16.4 L-12.6 -24.6' });
    s += t('circle', { 'class': 'sn-eye', cx: -19.8, cy: -24, r: 1.7 }) + t('circle', { 'class': 'sn-eye', cx: -12.6, cy: -25.2, r: 1.7 });
    s += t('path', { 'class': 'sn-smile', d: 'M-16.6 -10.6 Q-14.6 -8.8 -12.6 -10.4' });
    s += t('circle', { 'class': 'sn-shell', cx: 4, cy: -14.4, r: 11.6 });
    s += t('path', { 'class': 'sn-spiral', d: 'M4 -14.4 m-4.6 0 a4.6 4.6 0 1 0 4.6 -4.6 a2.4 2.4 0 0 0 -2.4 2.4' });
    // the loading wheel turns on its own (css/story.css)
    s += g('sn-wheel', 'translate(4 -14.4)',
      t('circle', { 'class': 'sn-wheel-bg', cx: 0, cy: 0, r: 7.6 }) +
      g('sn-wheel-spin', null, t('path', { 'class': 'sn-wheel-arc', d: 'M0 -7.6 A7.6 7.6 0 1 1 -7.6 0' })));
    return g('snail-walk', 'translate(' + x + ' ' + y + ')', g('snail-crawl', null, s));
  }

  // ===== card 5: the problem on a blackboard =====

  // The plot on the board: x in days to the right and y in GB up, from the
  // origin (ox, oy), with day and gb the units of one day and one GB. One
  // brick a day, each w high, climbs from zero to 3 GB on day 17, so the
  // bricks' corners lie on the line y = w x. Brick 9 stands for w.
  var BD = { ox: 44, oy: 194, day: 11.6, gb: 46, pick: 9 };

  function boardDefs(uid) {
    return t('linearGradient', { id: uid + '-board', x1: 0, y1: 0, x2: 0, y2: 1 },
      t('stop', { offset: 0, 'class': 'bd0' }) + t('stop', { offset: 1, 'class': 'bd1' }));
  }

  function chalkboard(uid) {
    var n = WL.SEEN.days;
    var used = WL.SEEN.used;
    var X = function (d) { return BD.ox + d * BD.day; };
    var Y = function (gb) { return BD.oy - gb * BD.gb; };
    var h = used / n * BD.gb;
    var px = X(n);
    var py = Y(used);
    var s = '';
    // the frame, the board and its chalk dust, the tray, an eraser, two sticks
    s += t('rect', { 'class': 'bd-wood', x: 0, y: 0, width: VW, height: VH });
    s += t('rect', { 'class': 'bd-board', x: 8, y: 8, width: VW - 16, height: 206, rx: 2, fill: 'url(#' + uid + '-board)' });
    s += t('ellipse', { 'class': 'bd-dust', cx: 118, cy: 64, rx: 64, ry: 13, transform: 'rotate(-7 118 64)' });
    s += t('ellipse', { 'class': 'bd-dust', cx: 236, cy: 150, rx: 54, ry: 11, transform: 'rotate(5 236 150)' });
    s += t('ellipse', { 'class': 'bd-dust', cx: 84, cy: 168, rx: 40, ry: 9 });
    s += t('rect', { 'class': 'bd-tray', x: 2, y: 214, width: VW - 4, height: 9, rx: 1.5 });
    s += t('rect', { 'class': 'bd-tray-hi', x: 2, y: 214, width: VW - 4, height: 1.6 });
    s += g(null, 'translate(74 204)',
      t('rect', { 'class': 'bd-felt', x: 0, y: 4.2, width: 36, height: 5.8, rx: 1 }) +
      t('rect', { 'class': 'bd-eraser', x: 0, y: 0, width: 36, height: 5.6, rx: 1.6 }));
    s += t('rect', { 'class': 'bd-chalk', x: 264, y: 209.4, width: 22, height: 4.6, rx: 2.3 });
    s += t('rect', { 'class': 'bd-chalk y', x: 290, y: 209.8, width: 14, height: 4.2, rx: 2.1 });
    // the axes, with arrowheads, and 0 at the origin
    s += t('path', {
      'class': 'bd-axis',
      d: 'M' + BD.ox + ' ' + BD.oy + ' H298 M292 ' + (BD.oy - 4) + ' L298 ' + BD.oy + ' L292 ' + (BD.oy + 4) +
        ' M' + BD.ox + ' ' + BD.oy + ' V18 M' + (BD.ox - 4) + ' 24 L' + BD.ox + ' 18 L' + (BD.ox + 4) + ' 24'
    });
    s += t('text', { 'class': 'bd-lab end', x: BD.ox - 5, y: BD.oy + 9 }, '0');
    // one brick a day, popping in one after the other
    for (var k = 1; k <= n; k++) {
      s += t('rect', {
        'class': 'bd-brick bd-pop' + (k === BD.pick ? ' w' : ''),
        x: (X(k - 1) + 0.6).toFixed(2), y: (Y(k * used / n) + 0.6).toFixed(2),
        width: (BD.day - 1.2).toFixed(2), height: (h - 1.2).toFixed(2),
        style: 'animation-delay:' + (0.15 + 0.07 * (k - 1)).toFixed(2) + 's'
      });
    }
    // the line through zero and the bricks' corners, a little past day 17
    var e = n + 3.4;
    s += t('path', { 'class': 'bd-line', d: 'M' + BD.ox + ' ' + BD.oy + ' L' + X(e).toFixed(2) + ' ' + Y(e * used / n).toFixed(2) });
    // what was seen, on the axes: x = 17 and y = 3
    s += t('path', { 'class': 'bd-guide', d: 'M' + px + ' ' + py + ' V' + BD.oy + ' M' + px + ' ' + py + ' H' + BD.ox });
    s += t('circle', { 'class': 'bd-dot bd-pop', cx: px, cy: py, r: 3.4 });
    s += t('text', { 'class': 'bd-lab g', x: px, y: BD.oy + 13 }, 'x = ' + n);
    s += t('text', { 'class': 'bd-lab g end mid', x: BD.ox - 6, y: py }, 'y = ' + used);
    // brick 9 is w: a short lead and its name
    var wy = Y((BD.pick - 0.5) * used / n);
    var wx = X(BD.pick);
    s += g('bd-name bd-pop', null,
      t('path', { 'class': 'bd-lead', d: 'M' + (wx + 1.6).toFixed(2) + ' ' + wy.toFixed(2) + ' H' + (wx + 13).toFixed(2) }) +
      t('text', { 'class': 'bd-w', x: (wx + 16).toFixed(2), y: wy.toFixed(2) }, 'w = ?'));
    // and the rule they all follow
    s += t('text', { 'class': 'bd-f bd-pop', x: 280, y: 25 }, 'y = w &#215; x');
    return s;
  }

  // ===== the five cards =====

  var CARDS = [
    {
      time: 'morning',
      label: 'Day 1 in the morning: Lina looks at her phone, which shows the plan\'s 5 GB as an empty gold column and a counter at 0.00 of 5 GB',
      back: function () { return sun(36, 64, 11) + cloud(104, 30, 1.1) + cloud(146, 44, 0.8); },
      mid: function () { return calendar(128, 52, 1); },
      mood: 'happy',
      front: function () { return ''; }
    },
    {
      time: 'day',
      label: 'A montage of days 1 to 16: maps, music, messages and a cat video, and one brick of data a day piling up in her phone',
      back: function () { return sun(30, 30, 9) + cloud(110, 26, 1.05) + cloud(150, 52, 0.75); },
      mid: function () {
        return badge(128, 64, 12.5, 'pin', 1) + badge(160, 38, 12, 'note', 2) + badge(172, 82, 12, 'chat', 3) + badge(136, 104, 13.5, 'cat', 4);
      },
      mood: 'music',
      front: function () { return ''; }
    },
    {
      time: 'dusk',
      label: 'Day 17 at dusk: Lina is surprised, her phone says 3.00 of 5 GB, and 17 bricks fill the gold column up to 3 GB',
      back: function () { return stars([[134, 22, 2.2], [176, 40, 1.4], [58, 18, 1.2]]) + moon(30, 34, 8); },
      mid: function () { return calendar(128, 52, WL.SEEN.days); },
      mood: 'surprised',
      front: function () { return ''; }
    },
    {
      time: 'night',
      label: 'Night: Lina is worried, 2 GB are left for 13 days, and a snail with a loading wheel crawls towards her',
      back: function () {
        return moon(30, 36, 9) + stars([[66, 18, 1.6], [112, 28, 2.2], [150, 16, 1.4], [178, 34, 1.8], [96, 52, 1.1], [14, 74, 1.2], [128, 46, 1]]);
      },
      mid: function () { return ''; },
      mood: 'worried',
      front: function () { return callout() + snail(158, 228); }
    },
    {
      time: 'board',
      label: 'A blackboard: one brick a day climbs from zero to y = 3 on day x = 17, along the line y = w times x through zero; one brick is marked w = ?'
    }
  ];

  // Builds the picture of card k into its <svg>. The phone and what it
  // shows are made with the same pieces as the rounds; the rest is markup.
  // The blackboard of card 5 is markup only.
  function build(svg, k) {
    var c = CARDS[k];
    var uid = 'st' + (k + 1);
    svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('class', 'story-pic t-' + c.time);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', c.label);
    if (c.time === 'board') {
      svg.innerHTML = t('defs', {}, boardDefs(uid)) + chalkboard(uid);
      return { svg: svg, card: k, board: true };
    }
    svg.innerHTML = t('defs', {}, skyDefs(uid)) +
      t('rect', { 'class': 'sky', x: 0, y: 0, width: VW, height: VH, fill: 'url(#' + uid + '-sky)' }) +
      c.back() + city(c.time === 'dusk' || c.time === 'night') + street() + lina(c.mood) + zoomLines() + c.mid() + zoomRing();

    var v = { svg: svg, card: k };
    var pg = UI.svg('g', { 'class': 'st-phone', transform: 'translate(' + PH.x + ' ' + PH.y + ') scale(' + PH.s + ')' }, svg);
    v.phone = new Views.Phone(svg, { px: 0, py: 0, pw: PH.pw, ph: PH.ph }, pg);
    v.phone.setTitle('MOBILE DATA');
    var cx = COL.cx;
    var cw = COL.cw;
    var B = COL.B;
    var yP = B - COL.TH;
    var ySeen = B - WL.SEEN.used * U;
    // the column grows from the floor on card 1, so its two layers share a class
    var colBack = UI.svg('g', { 'class': 'st-col' }, pg);
    UI.svg('rect', { 'class': 'sq-floor', x: cx, y: yP, width: cw, height: COL.TH }, colBack);
    if (k === 3) {
      // what is left of the plan: a gold wash with a question mark in it
      UI.svg('rect', { 'class': 'st-free', x: cx, y: yP, width: cw, height: ySeen - yP }, colBack);
      var q = UI.svg('text', { 'class': 'st-q', x: cx + cw / 2, y: (yP + ySeen) / 2 }, pg);
      q.textContent = '?';
    }
    UI.svg('line', { 'class': 'col-ground', x1: cx - 2.4, x2: cx + cw + 2.4, y1: B, y2: B }, pg);
    v.bricks = new Views.Bricks(pg, WL.PLAN.days);
    var colFront = UI.svg('g', { 'class': 'st-col' }, pg);
    UI.svg('rect', { 'class': 'sq-target thick', x: cx, y: yP, width: cw, height: COL.TH }, colFront);
    var lab = UI.svg('text', { 'class': 'col-label gold', x: cx - 1.3, y: yP }, pg);
    lab.textContent = WL.fmt(WL.PLAN.gb, 0) + ' GB';
    var days = UI.svg('text', { 'class': 'col-days', x: cx + cw / 2, y: B + 2.6 }, pg);
    days.textContent = WL.fmt(WL.PLAN.days, 0) + ' days';
    if (k >= 2) {
      var seen = UI.svg('text', { 'class': 'col-label gold st-seen', x: cx - 1.3, y: ySeen }, pg);
      seen.textContent = WL.fmt(WL.SEEN.used, 0) + ' GB';
    }
    v.mark = UI.svg('g', { 'class': 'day-mark', visibility: 'hidden' }, pg);
    v.markTri = UI.svg('path', { d: '' }, v.mark);
    v.markText = UI.svg('text', { x: 0, y: 0 }, v.mark);

    // what stands in front of the phone: the snail
    var front = UI.svg('g', null, svg);
    front.innerHTML = c.front();
    return v;
  }

  // The phone of a picture on day d with n bricks; pop: the newest pops in.
  function setDay(v, d, n, pop) {
    var h = RATE * U;
    var top = v.bricks.layout(n, h, COL.cx, COL.cw, COL.B);
    v.bricks.rects.forEach(function (r) { r.classList.remove('pop'); r.classList.remove('today'); });
    var newest = v.bricks.rects[n - 1];
    if (newest) {
      if (pop && !UI.still) { void newest.getBoundingClientRect(); newest.classList.add('pop'); }
      if (n === WL.SEEN.days) { newest.classList.add('today'); }
    }
    v.phone.setDay('Day ' + WL.fmt(d, 0));
    if (n > 0) {
      var mx = COL.cx + COL.cw + 1.2;
      v.markTri.setAttribute('d', 'M' + mx + ' ' + top + ' l1.9 -1.25 v2.5 Z');
      v.markText.setAttribute('x', mx + 2.7);
      v.markText.setAttribute('y', top);
      v.markText.textContent = 'day ' + WL.fmt(n, 0);
      v.mark.setAttribute('visibility', 'visible');
    } else {
      v.mark.setAttribute('visibility', 'hidden');
    }
  }

  function countText(gb) { return WL.fmt(gb, 2, { keepZeros: true }); }
  var OF_PLAN = 'of ' + WL.PLAN.gb + ' GB';

  // ===== the page =====

  // opts.step(d): one page on (d = 1) or back (d = -1), for Next on the last
  // card and Back on the first.
  function StoryPage(root, opts) {
    var self = this;
    this.root = root;
    this.opts = opts || {};
    this.k = 0;
    this.timer = 0;
    this.cancel = null;
    this.pics = UI.$$('.story-pic', root);
    this.views = this.pics.map(function (svg, k) { return build(svg, k); });
    this.cards = UI.$$('.story-card', root);
    this.last = this.cards.length - 1;
    this.stepEl = UI.$('.story-step', root);
    this.dots = UI.$('.story-dots', root);
    this.dots.innerHTML = this.cards.map(function () { return '<i></i>'; }).join('');
    this.btnBack = UI.$('[data-act="back"]', root);
    this.btnNext = UI.$('[data-act="next"]', root);
    this.nextLabel = UI.$('.nx-label', this.btnNext);
    this.btnBack.addEventListener('click', function () { if (!self.prev() && self.opts.step) { self.opts.step(-1); } });
    this.btnNext.addEventListener('click', function () { if (!self.next() && self.opts.step) { self.opts.step(1); } });

    // a swipe across the picture turns the card, on a phone
    var x0 = null;
    var y0 = null;
    var area = UI.$('.story-pics', root);
    area.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    area.addEventListener('touchend', function (e) {
      if (x0 === null) { return; }
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < 1.5 * Math.abs(dy)) { return; }
      if (dx < 0) { self.btnNext.click(); } else { self.btnBack.click(); }
    }, { passive: true });

    this.views.forEach(function (v, k) { self.still(v, k); });
    this.paint();
  }

  // Each picture's final state: what the still flag and a card left behind
  // show. The blackboard moves by CSS alone.
  StoryPage.prototype.still = function (v, k) {
    if (v.board) { return; }
    if (k === 0) {
      setDay(v, 1, 0, false);
      v.phone.setCount(countText(0), OF_PLAN);
    } else if (k === 1) {
      setDay(v, MONTAGE_LAST, MONTAGE_LAST, false);
      v.phone.setCount('?', OF_PLAN);
    } else {
      setDay(v, WL.SEEN.days, WL.SEEN.days, false);
      v.phone.setCount(countText(WL.SEEN.used), OF_PLAN);
    }
  };

  StoryPage.prototype.stop = function () {
    window.clearInterval(this.timer);
    window.clearTimeout(this.timer);
    this.timer = 0;
    if (this.cancel) { this.cancel(); this.cancel = null; }
  };

  // Plays card k from its start: the montage adds a day every 210 ms, and on
  // day 17 the counter ticks up to 3.00.
  StoryPage.prototype.play = function (k) {
    var self = this;
    var v = this.views[k];
    this.stop();
    if (UI.still) { this.still(v, k); return; }
    if (k === 1) {
      var d = 1;
      v.phone.setCount('?', OF_PLAN);
      setDay(v, d, d, true);
      this.timer = window.setInterval(function () {
        d += 1;
        setDay(v, d, d, true);
        if (d >= MONTAGE_LAST) { window.clearInterval(self.timer); self.timer = 0; }
      }, MONTAGE_STEP);
    } else if (k === 2) {
      setDay(v, WL.SEEN.days, WL.SEEN.days, true);
      v.phone.setCount('?', OF_PLAN);
      this.timer = window.setTimeout(function () {
        self.cancel = UI.tween(0, WL.SEEN.used, 1100, function (x) {
          v.phone.setCount(countText(x), OF_PLAN);
        }, function () {
          v.phone.setCount(countText(WL.SEEN.used), OF_PLAN);
          self.cancel = null;
        });
      }, 550);
    } else {
      this.still(v, k);
    }
  };

  StoryPage.prototype.paint = function () {
    var k = this.k;
    var self = this;
    this.pics.forEach(function (p, i) { p.classList.toggle('on', i === k); });
    this.cards.forEach(function (c, i) { c.classList.toggle('on', i === k); });
    UI.$$('i', this.dots).forEach(function (d, i) { d.classList.toggle('on', i === k); });
    this.stepEl.textContent = (k + 1) + ' of ' + this.cards.length;
    this.nextLabel.textContent = k === this.last ? 'Round 1' : 'Next';
    this.btnNext.classList.toggle('to-round', k === this.last);
    // restart the picture's own animations (badges, calendar, snail)
    var pic = this.pics[k];
    pic.classList.remove('play');
    void pic.getBoundingClientRect();
    pic.classList.add('play');
    window.setTimeout(function () { if (self.k === k && self.active) { self.play(k); } }, 0);
  };

  StoryPage.prototype.show = function (k) {
    k = Math.max(0, Math.min(this.last, Math.floor(k)));
    this.k = k;
    this.paint();
  };

  // One card on or back; false when there is none, so the page moves on.
  StoryPage.prototype.next = function () {
    if (this.k >= this.last) { return false; }
    this.show(this.k + 1);
    return true;
  };
  StoryPage.prototype.prev = function () {
    if (this.k <= 0) { return false; }
    this.show(this.k - 1);
    return true;
  };

  // how: 'next' (from the title card) starts at card 1, 'prev' (back from
  // round 1) at the last card, and a jump keeps the card it was on.
  StoryPage.prototype.enter = function (how) {
    this.active = true;
    if (how === 'next') { this.k = 0; }
    if (how === 'prev') { this.k = this.last; }
    this.paint();
  };
  StoryPage.prototype.leave = function () {
    this.active = false;
    this.stop();
    var k = this.k;
    this.still(this.views[k], k);
  };

  window.StoryPage = StoryPage;
}());
