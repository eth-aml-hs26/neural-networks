/* art.js : the three things of the Wuggish of 31 October 2026, a cat, a duck
 * and a fish, drawn side on and facing right (SPEC.md, "The pictures"), with
 * diving in place of flying since 4 November 2026.
 *
 * Four looks, each a SHAPE, whose colour only decorates:
 *   running   a running pose, legs stretched, speed lines behind   cat, duck
 *   booted    a boot with a cuff on each foot                       cat, duck
 *   swimming  a band of water with a wavy top across the foot of
 *             the box, the thing in it                              duck, fish
 *   diving    deep under water in a mask and a snorkel, bubbles
 *             rising from the snorkel; the water fills the box
 *             nearly to its top and darkens below                  duck, fish
 * A thing is in one place at a time: it runs, swims or dives, at most one
 * of them (PLACE); boots go with any of them, and a duck that swims or dives
 * in its boots shows them under clear water.  The plain cat and the plain
 * duck stand on the floor; the plain fish is drawn alone, low in its box,
 * with no water.  The running duck runs upright, as the runner duck does.
 *
 * Every drawing lives in a box 200 high with the floor at y = 182, each
 * thing 220 wide.  Colours are never inline: every fill and stroke is a CSS
 * class of css/style.css, so the light and dark themes recolour the art for
 * free, and scripts/check-palette.js gates them.
 *
 * Public API (window.ART):
 *   OBJECTS                  ['cat', 'duck', 'fish'], the order of a scene
 *   LOOKS[obj]               the looks that thing can wear
 *   PLACE                    ['running', 'swimming', 'diving']: at most one
 *   WIDTH                    the width of each thing's box
 *   legal(obj, flags)        whether that thing can wear those looks
 *   object(obj, flags)       inner SVG markup of one thing, in its own box
 *   objectSVG(obj, flags, px)    a complete <svg> of one thing, px wide
 *   scene(spec, px)          a complete <svg> of the things in spec, side by
 *                            side in the order of OBJECTS; spec maps a thing
 *                            to its flags, absent or null for "not there".
 *                            A third argument {fit: true} is accepted and
 *                            changes nothing: a scene always fits its things.
 *   MARKS                    ['booted', 'diving'], the looks with a mark
 *                            that stands alone
 *   markSVG(look, px)        a complete <svg> of that mark alone, px square:
 *                            a boot, or the mask and the snorkel
 *
 * flags is a plain object such as {running: true, booted: true}.  A flag the
 * thing cannot wear is ignored.
 */
(function () {
  'use strict';

  const OBJECTS = ['cat', 'duck', 'fish'];
  const LOOKS = {
    cat: ['running', 'booted'],
    duck: ['running', 'booted', 'swimming', 'diving'],
    fish: ['swimming', 'diving'],
  };
  const PLACE = ['running', 'swimming', 'diving'];
  const WIDTH = { cat: 220, duck: 220, fish: 220 };
  const FLOOR = 182;

  function legal(obj, flags) {
    const on = Object.keys(flags || {}).filter(f => flags[f]);
    return on.every(f => LOOKS[obj].indexOf(f) >= 0) && on.filter(f => PLACE.indexOf(f) >= 0).length <= 1;
  }
  function wears(obj, flags) {
    const f = {};
    for (const k of LOOKS[obj]) if (flags && flags[k]) f[k] = true;
    return f;
  }
  const r2 = x => Math.round(x * 100) / 100;

  /* ==== shapes shared by the things =================================== */

  // a limb: a thick stroke with an ink edge, through the given points
  function limb(pts, w, cls) {
    const d = 'M' + pts.map(p => r2(p[0]) + ',' + r2(p[1])).join(' L');
    return `<path class="s-ink" d="${d}" stroke-width="${w + 7}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path class="${cls}" d="${d}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // the rotation, in degrees, that stands a shape drawn upright at (0, 0) on
  // a foot, its top pointing back up the leg (hip to foot is the vector d)
  function along(hip, foot) { return Math.atan2(-(foot[0] - hip[0]), foot[1] - hip[1]) * 180 / Math.PI; }

  // A boot: its sole at (0, 0), its shaft up the leg, its toe forward (+x),
  // a flared cuff folded over its top and an ink sole.  One shape for one
  // word, scaled per thing.
  const BOOT = 'M-12,-30 L12,-30 L12,-13 Q27,-12 28,-4 L28,0 L-13,0 L-13,-7 Q-13,-13 -12,-19 Z';
  const CUFF = 'M-16,-41 L16,-41 L13,-28 L-13,-28 Z';
  function boot(at, angle, s, far) {
    const sw = r2(3.4 / s);
    return `<g transform="translate(${r2(at[0])},${r2(at[1])}) rotate(${r2(angle)}) scale(${s})">` +
      `<path class="${far ? 'f-boot-far' : 'f-boot'} s-ink" stroke-width="${sw}" stroke-linejoin="round" d="${BOOT}"/>` +
      `<path class="f-ink" d="M-13,-5 L28,-5 L28,0 L-13,0 Z"/>` +
      `<path class="f-cuff s-ink" stroke-width="${sw}" stroke-linejoin="round" d="${CUFF}"/></g>`;
  }
  // a boot on the end of a limb [hip, ..., foot] whose stroke is w wide:
  // its sole where the rounded end of the limb would touch the ground
  function bootOn(pts, w, s, far) {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const reach = (w + 7) / 2;
    return boot([b[0] + (b[0] - a[0]) / len * reach, b[1] + (b[1] - a[1]) / len * reach], along(a, b), s, far);
  }

  // speed lines: three bold strokes of different lengths, flying off behind
  function speed(x, y) {
    return '<g class="s-speed" fill="none" stroke-width="6" stroke-linecap="round">' +
      `<path d="M${x},${y} h-30"/><path d="M${x + 8},${y + 14} h-42"/><path d="M${x},${y + 28} h-26"/></g>`;
  }
  // a puff of dust on the floor, kicked up behind a foot
  function dust(x) {
    return '<g class="f-dust s-ink" stroke-width="2.5">' +
      `<circle cx="${x}" cy="${FLOOR - 8}" r="7.5"/><circle cx="${x - 14}" cy="${FLOOR - 5}" r="5"/><circle cx="${x - 25}" cy="${FLOOR - 3}" r="3.5"/></g>`;
  }
  // water: a band from y = top to the foot of the box, with a wavy surface
  function waves(top, w) {
    let d = `M0,${top}`;
    for (let x = 0; x < w - 1; x += 22) d += ' q5.5,-5 11,0 q5.5,5 11,0';   // 22 divides the width
    return d;
  }
  function waterBack(top, w) {
    return `<path class="f-water" d="${waves(top, w)} L${w},200 L0,200 Z"/>`;
  }
  // the front of the water, in two parts: a tint over what lies under the
  // surface (alpha), then short wave lines and the surface line on top, so
  // that something can sit between the two, clear under the water
  function waterTint(top, w, alpha) {
    return `<path class="f-water" fill-opacity="${alpha}" d="${waves(top, w)} L${w},200 L0,200 Z"/>`;
  }
  function waterLines(top, w) {
    const lines = [];
    let k = 0;
    for (let y = top + 20; y < 196; y += 18, k++) {
      for (let x = k % 2 ? 22 : 54; x < w - 24; x += 72) lines.push(`M${x},${y} q7,-4 14,0 q7,4 14,0`);
    }
    return `<path class="s-wave" fill="none" stroke-width="3" stroke-linecap="round" d="${lines.join(' ')}"/>` +
      `<path class="s-water-line" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="${waves(top, w)}"/>`;
  }
  function bubbles(list) {
    return '<g class="f-bubble s-water-line" stroke-width="2.5">' +
      list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>';
  }

  // Deep water, for diving (Carlos, 2026-11-04: "the animal wearing a snorkel
  // and the water deep"): the surface near the top of the box, and the water
  // darkening in two steps below it, so that it reads deeper than the band of
  // swimming.  Back, then the thing, then the front: a light tint over the
  // thing, two ripples under the surface and the surface line.
  const DEEP_TOP = 18;
  function deepBack(w) {
    const step = (y, a) => `<path class="f-deep" fill-opacity="${a}" ` +
      `d="M0,${y} C${w * 0.3},${y - 7} ${w * 0.7},${y + 7} ${w},${y} L${w},200 L0,200 Z"/>`;
    const ray = (x0, x1, x2, x3) => `<path class="f-glint" fill-opacity="0.16" d="M${x0},${DEEP_TOP} L${x1},${DEEP_TOP} L${x2},200 L${x3},200 Z"/>`;
    return `<path class="f-water" d="${waves(DEEP_TOP, w)} L${w},200 L0,200 Z"/>` + step(84, 0.45) + step(140, 0.75) +
      ray(52, 74, 40, 6) + ray(118, 132, 116, 88);
  }
  function deepTint(w, alpha) {
    return `<path class="f-water" fill-opacity="${alpha}" d="${waves(DEEP_TOP, w)} L${w},200 L0,200 Z"/>`;
  }
  function deepFront(w) {
    return '<path class="s-wave" fill="none" stroke-width="3" stroke-linecap="round" ' +
      `d="M24,${DEEP_TOP + 20} q7,-4 14,0 q7,4 14,0 M${w - 74},${DEEP_TOP + 34} q7,-4 14,0 q7,4 14,0"/>` +
      `<path class="s-water-line" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="${waves(DEEP_TOP, w)}"/>`;
  }
  // a stroke with an ink edge, for the snorkel and the strap of the mask
  function band(d, w, cls) {
    return `<path class="s-ink" d="${d}" stroke-width="${w + 5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path class="${cls}" d="${d}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // A diving mask over an eye at (x, y): a pale glass in a yellow frame, and
  // its strap, the path `strap`, running back round the head (none when
  // strap is null, for the mark drawn alone).
  function mask(x, y, rx, ry, strap) {
    return (strap ? band(strap, 4.5, 's-snorkel') : '') +
      `<ellipse class="s-ink" fill="none" stroke-width="9.5" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>` +
      `<ellipse class="s-snorkel" fill="none" stroke-width="4.5" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>` +
      `<ellipse class="f-glass" fill-opacity="0.55" cx="${x}" cy="${y}" rx="${rx - 2}" ry="${ry - 2}"/>` +
      `<path class="s-glint" fill="none" stroke-width="2" stroke-linecap="round" d="M${x - rx * 0.45},${y - ry * 0.25} q${rx * 0.2},${-ry * 0.4} ${rx * 0.55},${-ry * 0.45}"/>`;
  }
  // A snorkel along the path `d`, from the mouthpiece up to its open top at
  // (tx, ty), which carries a cap.
  function snorkel(d, tx, ty) {
    return band(d, 6, 's-snorkel') +
      `<rect class="f-snorkel s-ink" stroke-width="2.5" x="${tx - 6}" y="${ty - 3}" width="12" height="9" rx="2.5"/>`;
  }

  /* ==== cat ============================================================ */

  const CAT_LEGS = {
    // hip, knee, foot of the far front, far hind, near front and near hind legs
    stand: {
      ff: [[138, 130], [139, 151], [140, 172]], fh: [[88, 132], [90, 152], [88, 172]],
      nf: [[152, 132], [153, 152], [154, 172]], nh: [[72, 136], [70, 154], [68, 172]],
    },
    // a gallop, stretched out: the front legs reach forward, the hind ones back
    run: {
      ff: [[140, 122], [163, 136], [185, 140]], fh: [[88, 124], [66, 138], [42, 140]],
      nf: [[152, 124], [177, 142], [198, 152]], nh: [[72, 128], [48, 146], [24, 154]],
    },
  };
  function cat(f) {
    const run = !!f.running, lift = run ? -8 : 0;
    const L = CAT_LEGS[run ? 'run' : 'stand'];
    const p = [];
    if (run) p.push(speed(44, 88));
    // tail
    const tail = run ? 'M60,106 C54,90 52,74 46,58' : 'M60,114 C38,108 28,86 34,64 C37,54 45,51 50,56';
    p.push(`<path class="s-ink" d="${tail}" stroke-width="19" fill="none" stroke-linecap="round"/>`);
    p.push(`<path class="s-cat" d="${tail}" stroke-width="12" fill="none" stroke-linecap="round"/>`);
    // far legs, a shade darker, behind the body
    p.push(limb(L.ff, 12, 's-cat-far'), limb(L.fh, 12, 's-cat-far'));
    if (f.booted) p.push(bootOn(L.ff, 12, 0.86, true), bootOn(L.fh, 12, 0.86, true));
    // body
    p.push(`<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" transform="translate(0,${lift})" ` +
      'd="M60,116 C60,100 82,94 106,96 C132,98 152,98 160,112 C166,128 154,144 130,146 C104,149 80,148 66,140 C58,134 58,126 60,116 Z"/>');
    // near legs, then the haunch over the top of the hind leg
    p.push(limb(L.nf, 13, 's-cat'), limb(L.nh, 13, 's-cat'));
    p.push(`<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" transform="translate(0,${lift})" ` +
      'd="M58,124 C60,106 96,106 98,124 C98,138 82,146 72,146 C62,146 57,136 58,124 Z"/>');
    if (f.booted) p.push(bootOn(L.nf, 13, 0.88, false), bootOn(L.nh, 13, 0.88, false));
    // head: ears, face, eye, nose, whiskers
    p.push(`<g transform="translate(${run ? 4 : 0},${lift})">` +
      '<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" d="M150,76 L153,42 L172,62 Z"/>' +
      '<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" d="M171,61 L190,40 L194,72 Z"/>' +
      '<path class="f-cat-inner" d="M155,70 L157,50 L167,62 Z"/><path class="f-cat-inner" d="M177,62 L187,49 L190,69 Z"/>' +
      '<circle class="f-cat s-ink" stroke-width="4" cx="170" cy="86" r="25"/>' +
      '<ellipse class="f-ink" cx="181" cy="81" rx="4.3" ry="5.8"/><circle class="f-bg" cx="182.5" cy="79.2" r="1.5"/>' +
      '<path class="f-ink" d="M190,89 l6,1 l-3,5 z"/>' +
      '<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M193,96 q-4,4 -9,2"/>' +
      '<path class="s-ink" stroke-width="2" fill="none" stroke-linecap="round" d="M186,94 L212,90 M186,98 L212,100"/>' +
      '</g>');
    if (run) p.push(dust(40));
    return p.join('');
  }

  /* ==== duck =========================================================== */

  // a webbed foot at the end of a leg, its toes forward along the sole
  function webbed(pts, far) {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    return `<g transform="translate(${r2(b[0])},${r2(b[1])}) rotate(${r2(along(a, b))})">` +
      `<path class="${far ? 'f-bill-far' : 'f-bill'} s-ink" stroke-width="3" stroke-linejoin="round" d="M-7,1 L18,-1 C22,3 20,9 15,9 L-6,9 C-10,9 -10,1 -7,1 Z"/>` +
      '<path class="s-ink" stroke-width="2" fill="none" d="M2,2 L3,9 M10,1 L11,9"/></g>';
  }
  function duckLegs(f, legs) {
    const p = [];
    legs.forEach((pts, i) => {
      const far = i === 0;
      p.push(limb(pts, 4.5, far ? 's-bill-far' : 's-bill'));
      p.push(f.booted ? bootOn(pts, 4.5, 0.72, far) : webbed(pts, far));
    });
    return p.join('');
  }
  // the head, the bill level whatever the body does: centre (x, y)
  function duckHead(x, y) {
    return `<g transform="translate(${x - 152},${y - 66})">` +
      '<circle class="f-duck s-ink" stroke-width="4" cx="152" cy="66" r="20"/>' +
      '<path class="f-bill s-ink" stroke-width="3.5" stroke-linejoin="round" d="M167,60 C179,56 195,60 201,68 C197,74 183,76 169,73 Z"/>' +
      '<path class="s-ink" stroke-width="2.2" fill="none" stroke-linecap="round" d="M171,67 C181,68 191,68 199,68"/>' +
      '<circle class="f-ink" cx="157" cy="60" r="4"/><circle class="f-bg" cx="158.4" cy="58.6" r="1.3"/></g>';
  }
  // the body: a boat with its tail up, the folded wing on its side
  const DUCK_BODY = '<path class="f-duck s-ink" stroke-width="4" stroke-linejoin="round" d="M40,96 C52,108 68,112 88,110 C114,108 140,108 154,122 C164,134 158,150 134,154 C106,158 74,156 56,144 C42,134 36,116 40,96 Z"/>' +
    '<path class="f-duck-wing s-ink" stroke-width="3.5" stroke-linejoin="round" d="M70,120 C88,110 124,112 140,124 C132,138 106,142 86,138 C76,136 60,132 52,122 C58,124 64,122 70,120 Z"/>' +
    '<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M66,126 C76,128 86,128 96,126 M78,132 C88,134 100,134 110,131"/>';
  // the neck, from the top of the chest to under the head
  const DUCK_NECK = '<path class="f-duck s-ink" stroke-width="4" stroke-linejoin="round" d="M126,118 C126,100 132,88 140,80 L163,82 C158,94 154,108 152,126 Z"/>';

  function duckStanding(f) {
    return duckLegs(f, [[[100, 144], [98, 171]], [[114, 144], [116, 171]]]) + DUCK_BODY + DUCK_NECK + duckHead(152, 66);
  }
  // upright, the way a runner duck runs: the body tipped up at the front,
  // the neck straight up, one leg reaching forward and one pushing back
  function duckRunning(f) {
    return speed(40, 70) + dust(52) +
      duckLegs(f, [[[102, 150], [76, 170]], [[114, 148], [138, 171]]]) +
      `<g transform="rotate(-34 106 142)">${DUCK_BODY}</g>` +
      '<path class="f-duck s-ink" stroke-width="4" stroke-linejoin="round" d="M120,104 C120,84 124,66 128,52 L148,54 C146,70 146,88 146,102 Z"/>' +
      duckHead(140, 40);
  }
  // on the water: the body cut by the surface and tinted below it, the legs
  // paddling under it in clear water, drawn over the tint so that their feet,
  // or their boots, keep their colours (SPEC.md: a duck that swims in its
  // boots shows them under clear water)
  function duckSwimming(f) {
    const top = 140;
    return waterBack(top, WIDTH.duck) +
      `<g transform="translate(0,6)">${DUCK_BODY}${DUCK_NECK}${duckHead(152, 66)}</g>` +
      waterTint(top, WIDTH.duck, 0.5) +
      `<g transform="translate(0,6)" opacity="0.92">${duckLegs(f, [[[98, 156], [80, 172]], [[116, 156], [136, 175]]])}</g>` +
      waterLines(top, WIDTH.duck) +
      '<path class="s-water-line" fill="none" stroke-width="3.5" stroke-linecap="round" d="M28,134 q-8,4 -16,2 M176,134 q8,4 16,2"/>';
  }
  // Diving: deep under the surface, the body level and stretched, the neck
  // reaching forward, the wing folded, the feet kicking behind, the mask on
  // its eye and the snorkel up the side of its head.  Like the swimming duck,
  // the legs go over the tint, so that the feet, or the boots, keep their
  // colours under the water.
  const DIVER = 'translate(4,46) scale(0.86) rotate(6 100 98)';
  function duckDiving(f) {
    const W = WIDTH.duck;
    return deepBack(W) +
      `<g transform="${DIVER}">` +
      '<path class="f-duck s-ink" stroke-width="4" stroke-linejoin="round" d="M40,74 C54,84 70,86 90,84 C116,82 142,82 158,90 C170,98 166,114 142,118 C114,122 80,120 60,110 C46,102 36,88 40,74 Z"/>' +
      '<g transform="translate(6,-26)"><path class="f-duck-wing s-ink" stroke-width="3.5" stroke-linejoin="round" d="M70,120 C88,110 124,112 140,124 C132,138 106,142 86,138 C76,136 60,132 52,122 C58,124 64,122 70,120 Z"/>' +
      '<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M66,126 C76,128 86,128 96,126 M78,132 C88,134 100,134 110,131"/></g>' +
      '<path class="f-duck s-ink" stroke-width="4" stroke-linejoin="round" d="M146,88 C156,82 166,76 174,72 L184,90 C176,94 166,100 156,110 Z"/>' +
      duckHead(184, 74) +
      mask(190, 67, 10.5, 9, 'M180,65 C175,63 169,65 165,70') +
      snorkel('M198,78 C192,88 180,90 176,82 L172,38', 172, 34) +
      '</g>' +
      deepTint(W, 0.16) +
      `<g transform="${DIVER}" opacity="0.92">${duckLegs(f, [[[80, 106], [46, 112]], [[92, 112], [56, 126]]])}</g>` +
      bubbles([[153, 64, 3.5], [158, 50, 4.5], [152, 34, 5.5]]) +
      deepFront(W);
  }
  function duck(f) {
    if (f.diving) return duckDiving(f);
    if (f.swimming) return duckSwimming(f);
    if (f.running) return duckRunning(f);
    return duckStanding(f);
  }

  /* ==== fish =========================================================== */

  // the fish at (0, 0), its nose at x = 66: tail fin, fins, body, gill, eye,
  // and `side`, the small fin on its side
  const SIDE_FIN = '<path class="f-fish-fin s-ink" stroke-width="3" stroke-linejoin="round" d="M22,2 C12,8 6,16 8,24 C18,20 26,12 28,4 Z"/>';
  function fishShape(side) {
    return '<path class="f-fish-fin s-ink" stroke-width="3.5" stroke-linejoin="round" d="M-48,0 L-82,-30 C-88,-12 -88,12 -82,30 Z"/>' +
      '<path class="f-fish-fin s-ink" stroke-width="3.5" stroke-linejoin="round" d="M-18,-26 C-10,-46 14,-48 28,-24 Z"/>' +
      '<path class="f-fish-fin s-ink" stroke-width="3.5" stroke-linejoin="round" d="M-8,26 C-2,40 14,42 20,24 Z"/>' +
      '<path class="f-fish s-ink" stroke-width="4" stroke-linejoin="round" d="M-54,0 C-34,-34 32,-38 62,-10 C69,-4 69,4 62,10 C32,38 -34,34 -54,0 Z"/>' +
      '<path class="s-ink" stroke-width="3" fill="none" stroke-linecap="round" d="M38,-20 C30,-8 30,8 38,20"/>' +
      '<circle class="f-ink" cx="49" cy="-7" r="5.5"/><circle class="f-bg" cx="50.8" cy="-8.8" r="1.7"/>' +
      '<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M66,3 q-6,4 -11,2"/>' +
      (side == null ? SIDE_FIN : side);
  }
  function fish(f) {
    if (f.swimming) {
      const top = 84;
      return waterBack(top, WIDTH.fish) +
        `<g transform="translate(112,136)">${fishShape()}</g>` +
        bubbles([[186, 112, 4.5], [194, 98, 6]]) +
        waterTint(top, WIDTH.fish, 0.12) + waterLines(top, WIDTH.fish);
    }
    if (f.diving) {
      // deep down, near the floor of the box, in a mask and a snorkel
      return deepBack(WIDTH.fish) +
        '<g transform="translate(106,142) rotate(6)">' + fishShape() +
        mask(50, -8, 9.5, 8.5, 'M41,-11 C38,-18 36,-24 34,-30') +
        snorkel('M63,5 C58,13 48,13 44,5 L40,-60', 40, -64) + '</g>' +
        deepTint(WIDTH.fish, 0.12) +
        bubbles([[148, 72, 3.5], [153, 58, 4.5], [147, 42, 5.5]]) +
        deepFront(WIDTH.fish);
    }
    return `<g transform="translate(112,136)">${fishShape()}</g>`;
  }

  const DRAW = { cat, duck, fish };

  function object(name, flags) {
    return DRAW[name](wears(name, flags));
  }

  function floorLine(x0, x1) {
    return `<line class="s-floor" stroke-width="2" x1="${x0}" y1="${FLOOR + 3}" x2="${x1}" y2="${FLOOR + 3}"/>`;
  }

  function objectSVG(name, flags, px) {
    const w = WIDTH[name];
    px = px || w;
    const h = Math.round(px * 200 / w);
    return `<svg class="art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 200" width="${px}" height="${h}" role="img">` +
      floorLine(12, w - 12) + object(name, flags) + '</svg>';
  }

  // The things present, side by side in the order of OBJECTS, each in its
  // own box, the boxes overlapping by GAP so that a scene reads as one row.
  const GAP = -6;
  function scene(spec, px) {
    const present = OBJECTS.filter(o => spec && spec[o]);
    let x = 0;
    const parts = [];
    for (const name of present) {
      parts.push(`<g transform="translate(${x},0)">${object(name, spec[name])}</g>`);
      x += WIDTH[name] + GAP;
    }
    const w = Math.max(1, x - GAP);
    px = px || w;
    const h = Math.round(px * 200 / w);
    return `<svg class="art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 200" width="${px}" height="${h}" role="img">` +
      floorLine(12, w - 12) + parts.join('') + '</svg>';
  }

  // The marks of two looks drawn alone, for the plates of the attention deck
  // (dev/snapshot.js): booted, a boot; diving, the mask and the snorkel as
  // the diving duck wears them, upright and without the strap, which has no
  // head to go round.  Each in a square box of its own.
  const MARK = {
    booted: { size: 60, draw: () => boot([24, 50.5], 0, 1, false) },
    diving: {
      size: 76,
      draw: () => '<g transform="translate(-147,-23)">' +
        mask(190, 67, 10.5, 9, null) +
        snorkel('M198,78 C192,88 180,90 176,82 L172,38', 172, 34) + '</g>',
    },
  };
  function markSVG(look, px) {
    const m = MARK[look];
    px = px || m.size;
    return `<svg class="art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.size} ${m.size}" width="${px}" height="${px}" role="img">` +
      m.draw() + '</svg>';
  }

  window.ART = { OBJECTS, LOOKS, PLACE, WIDTH, MARKS: Object.keys(MARK), legal, object, objectSVG, scene, markSVG };
})();
