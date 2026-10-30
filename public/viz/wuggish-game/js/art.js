/* art.js : the three things of the new Wuggish, a cat, a pony and a lizard,
 * each drawn as a base plus one layer per look (2026-10-30, SPEC.md).
 *
 * Four looks, each a SHAPE, whose colour only decorates:
 *   striped  bands across the coat     cat and pony   (streept, zeebra)
 *   spotted  round dots on the coat    cat and pony   (spottet, lepperd)
 *   winged   a feathered wing          pony and lizard (winget, draggon)
 *   horned   a long plain cone         pony and lizard (hornit, unikorn)
 * A thing wears at most one coat look, and any body look it takes.  The
 * plain drawings wear no look: the pony is one colour, its mane and tail
 * solid shapes with no bands; the lizard has a smooth back with no crest or
 * spines, and no scale marks that could read as spots.
 *
 * Every drawing lives in a box 200 high with the floor at y = 182 (the cat
 * 200 wide, the pony and the lizard 220).  Colours are never inline: every
 * fill and stroke is a CSS class of css/style.css, so the light and dark
 * themes recolour the art for free, and scripts/check-palette.js gates them.
 * A coat part is drawn as fill, then its pattern clipped to it, then its
 * outline on top, so the ink edge stays crisp over the pattern.
 *
 * Public API (window.ART):
 *   OBJECTS                  ['cat', 'pony', 'lizard'], the order of a scene
 *   LOOKS[obj]               the looks that thing can wear
 *   COAT                     ['striped', 'spotted']: a thing wears at most one
 *   legal(obj, flags)        whether that thing can wear those looks
 *   object(obj, flags)       inner SVG markup of one thing, in its own box
 *   objectSVG(obj, flags, px)    a complete <svg> of one thing, px wide
 *   scene(spec, px)          a complete <svg> of the things in spec, side by
 *                            side in the order of OBJECTS; spec maps a thing
 *                            to its flags, absent or null for "not there".
 *                            A third argument {fit: true} is accepted and
 *                            changes nothing: a scene always fits its things.
 *
 * flags is a plain object such as {striped: true, horned: true}.  A flag the
 * thing cannot wear is ignored.  clipPath ids are numbered across the page,
 * since the contact sheet puts dozens of drawings on one page.
 */
(function () {
  'use strict';

  const OBJECTS = ['cat', 'pony', 'lizard'];
  const LOOKS = {
    cat: ['striped', 'spotted'],
    pony: ['striped', 'spotted', 'winged', 'horned'],
    lizard: ['winged', 'horned'],
  };
  const COAT = ['striped', 'spotted'];
  const WIDTH = { cat: 200, pony: 220, lizard: 220 };
  const FLOOR = 182;
  let uid = 0;

  function legal(obj, flags) {
    const on = Object.keys(flags || {}).filter(f => flags[f]);
    return on.every(f => LOOKS[obj].indexOf(f) >= 0) && on.filter(f => COAT.indexOf(f) >= 0).length <= 1;
  }
  function wears(obj, flags) {
    const f = {};
    for (const k of LOOKS[obj]) if (flags && flags[k]) f[k] = true;
    return f;
  }

  /* a coat part: its fill, its pattern clipped to it, its outline on top.
   * shape is an element without its closing, e.g. '<ellipse cx="1" cy="2" rx="3" ry="4"' */
  function part(shape, fill, pattern) {
    if (!pattern) return `${shape} class="${fill} s-ink" stroke-width="4" stroke-linejoin="round"/>`;
    const id = 'wgclip' + (uid++);
    return `${shape} class="${fill}"/>` +
      `<clipPath id="${id}">${shape}/></clipPath>` +
      `<g clip-path="url(#${id})">${pattern}</g>` +
      `${shape} class="s-ink" fill="none" stroke-width="4" stroke-linejoin="round"/>`;
  }
  // bands: thick butt-ended strokes in the mark colour
  function bands(paths, w) {
    return `<g class="s-mark" fill="none" stroke-width="${w}" stroke-linecap="butt">` +
      paths.map(d => `<path d="${d}"/>`).join('') + '</g>';
  }
  // spots: solid round dots in the mark colour
  function dots(list) {
    return '<g class="f-mark">' + list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>';
  }

  /* the two body looks, one shape each, placed by the thing that wears them */

  // A wing raised over the back, root at (0, 0), sweeping up and back to the
  // left: a smooth leading edge on top, a trailing edge of four scalloped
  // feathers below, and a line of coverts across it.  One silhouette with
  // fine inner lines, so it reads as a wing at 40 px and stays crisp at 300.
  const WING = 'M0,0 C10,-26 12,-62 0,-88 C-10,-106 -34,-118 -60,-116 ' +
    'C-72,-106 -68,-94 -58,-90 C-74,-82 -70,-68 -58,-66 C-72,-56 -66,-42 -54,-42 ' +
    'C-64,-30 -56,-18 -42,-20 C-44,-6 -24,4 0,0 Z';
  const WING_LINES = 'M-58,-90 C-46,-88 -34,-84 -24,-78 M-58,-66 C-46,-64 -34,-60 -22,-54 ' +
    'M-54,-42 C-42,-40 -30,-36 -18,-30 M-30,-100 C-18,-82 -10,-58 -10,-30';
  function wing(x, y, s, mirror) {
    const t = `translate(${x},${y}) scale(${mirror ? -s : s},${s})`;
    return `<g transform="${t}"><path class="f-wing s-ink" stroke-width="${(3.8 / s).toFixed(2)}" stroke-linejoin="round" d="${WING}"/>` +
      `<path class="s-wing-line" stroke-width="${(2.6 / s).toFixed(2)}" fill="none" stroke-linecap="round" d="${WING_LINES}"/></g>`;
  }

  // A long plain cone, base at (0, 0), pointing straight up before the
  // rotation; no spiral and no bands, so it can never read as stripes.
  function horn(x, y, len, angle) {
    const d = `M-7,0 C-5,${-len * 0.45} -2,${-len * 0.8} 0,${-len} C2,${-len * 0.8} 5,${-len * 0.45} 7,0 Z`;
    return `<g transform="translate(${x},${y}) rotate(${angle})">` +
      `<path class="f-horn s-ink" stroke-width="3.5" stroke-linejoin="round" d="${d}"/>` +
      `<ellipse class="f-horn s-ink" stroke-width="3" cx="0" cy="0" rx="9" ry="4"/></g>`;
  }

  /* cat: sitting, facing us */
  function cat(f) {
    const p = [];
    const tail = 'M138,158 C172,156 178,126 160,108';
    p.push(`<path class="s-ink" d="${tail}" stroke-width="20" fill="none" stroke-linecap="round"/>`);
    p.push(`<path class="s-cat" d="${tail}" stroke-width="12" fill="none" stroke-linecap="round"/>`);
    if (f.striped) p.push(`<path class="s-mark" d="${tail}" stroke-width="12" fill="none" stroke-dasharray="7 10" stroke-dashoffset="4"/>`);
    if (f.spotted) p.push(`<path class="s-mark" d="${tail}" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="0 15" stroke-dashoffset="-6"/>`);

    // body
    let pat = '';
    if (f.striped) {
      pat = bands(['M50,122 Q100,106 150,122', 'M50,142 Q100,126 150,142', 'M50,162 Q100,146 150,162', 'M50,182 Q100,166 150,182'], 10);
    } else if (f.spotted) {
      pat = dots([[66, 124, 7.5], [89, 121, 7.5], [112, 121, 7.5], [134, 124, 7.5],
        [77, 143, 7.5], [100, 141, 7.5], [123, 143, 7.5], [62, 162, 7], [138, 162, 7]]);
    }
    p.push(part('<ellipse cx="100" cy="136" rx="44" ry="46"', 'f-cat', pat));

    // front legs
    for (const x of [74, 106]) {
      let lp = '';
      if (f.striped) lp = bands([`M${x - 2},160 h24`, `M${x - 2},171 h24`], 5);
      else if (f.spotted) lp = dots([[x + 10, 163, 4.5]]);
      p.push(part(`<rect x="${x}" y="148" width="20" height="34" rx="9"`, 'f-cat', lp));
    }
    p.push(`<path class="s-ink" stroke-width="2.5" fill="none" d="M80,182 v-6 M88,182 v-6 M112,182 v-6 M120,182 v-6"/>`);

    // head: ears, then the round face with its pattern
    p.push(`<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" d="M70,66 L76,30 L96,50 Z"/>`);
    p.push(`<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" d="M130,66 L124,30 L104,50 Z"/>`);
    p.push(`<path class="f-cat-inner" d="M76,60 L79,40 L90,52 Z"/>`);
    p.push(`<path class="f-cat-inner" d="M124,60 L121,40 L110,52 Z"/>`);
    let hp = '';
    if (f.striped) {
      hp = bands(['M90,44 v16', 'M100,44 v17', 'M110,44 v16', 'M64,82 h13', 'M64,92 h11', 'M123,82 h13', 'M125,92 h11'], 6);
    } else if (f.spotted) {
      hp = dots([[88, 54, 4.5], [100, 50, 4.5], [112, 54, 4.5], [72, 86, 4], [128, 86, 4]]);
    }
    p.push(part('<circle cx="100" cy="78" r="34"', 'f-cat', hp));
    // eyes, nose, mouth, whiskers
    p.push(`<ellipse class="f-ink" cx="87" cy="76" rx="5" ry="6.5"/><ellipse class="f-ink" cx="113" cy="76" rx="5" ry="6.5"/>`);
    p.push(`<circle class="f-bg" cx="89" cy="74" r="1.6"/><circle class="f-bg" cx="115" cy="74" r="1.6"/>`);
    p.push(`<path class="f-ink" d="M95,87 h10 l-5,6 z"/>`);
    p.push(`<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M100,93 q-3,7 -9,5 M100,93 q3,7 9,5"/>`);
    p.push(`<path class="s-ink" stroke-width="2" fill="none" stroke-linecap="round" d="M84,90 L60,85 M84,94 L58,95 M116,90 L140,85 M116,94 L142,95"/>`);
    return p.join('');
  }

  /* pony: standing, side on, facing right */
  function pony(f) {
    const p = [];
    const coat = (shape, stripes, spots) => part(shape, 'f-pony',
      f.striped ? bands(stripes, 8) : f.spotted ? dots(spots) : '');

    // far legs, a shade darker, behind everything
    p.push(`<path class="f-pony-far s-ink" stroke-width="3.5" stroke-linejoin="round" d="M128,124 L140,124 L139,172 L129,172 Z"/>`);
    p.push(`<path class="f-pony-far s-ink" stroke-width="3.5" stroke-linejoin="round" d="M60,120 L72,120 L71,172 L61,172 Z"/>`);
    p.push(`<path class="f-hoof s-ink" stroke-width="3" stroke-linejoin="round" d="M128,170 h12 v12 h-13 Z M60,170 h12 v12 h-13 Z"/>`);

    // tail, a solid shape
    p.push(`<path class="f-mane s-ink" stroke-width="3.5" stroke-linejoin="round" d="M54,98 C40,100 30,118 30,140 C30,152 36,160 44,156 C44,140 48,122 60,108 Z"/>`);

    // the wing behind the body (the far side) is left out: one raised wing reads at any size
    // body
    p.push(coat('<path d="M52,96 C60,82 128,80 146,96 C156,106 154,126 140,134 C122,142 72,142 56,134 C44,126 42,108 52,96 Z"',
      ['M66,82 C62,100 62,120 66,142', 'M86,80 C82,100 82,120 86,142', 'M106,80 C102,100 102,120 106,142', 'M126,82 C122,100 122,120 126,142'],
      [[64, 102, 6.5], [84, 96, 6.5], [72, 122, 6.5], [96, 116, 6.5], [116, 100, 6.5], [120, 124, 6.5], [138, 112, 6]]));

    // near legs
    p.push(coat('<path d="M140,122 L152,122 C153,140 152,158 151,172 L141,172 C141,158 140,140 140,122 Z"',
      ['M136,140 h20', 'M136,156 h20'], [[146, 148, 4.5]]));
    p.push(coat('<path d="M72,124 L84,124 C85,140 84,158 83,172 L73,172 C73,158 72,140 72,124 Z"',
      ['M68,140 h20', 'M68,156 h20'], [[78, 150, 4.5]]));
    p.push(`<path class="f-hoof s-ink" stroke-width="3" stroke-linejoin="round" d="M140,170 h12 v12 h-13 Z M72,170 h12 v12 h-13 Z"/>`);

    // neck and head
    p.push(coat('<path d="M118,100 C124,80 136,62 148,48 L172,60 C166,78 160,98 152,122 C140,124 124,116 118,100 Z"',
      ['M126,74 L156,92', 'M137,59 L166,76'], [[140, 96, 5.5], [152, 74, 5]]));
    p.push(`<path class="f-pony s-ink" stroke-width="4" stroke-linejoin="round" d="M156,38 L159,16 L171,33 Z"/>`);
    p.push(coat('<path d="M145,52 C143,36 160,27 175,32 C186,37 196,50 204,62 C209,72 202,85 189,84 L162,78 C150,74 145,64 145,52 Z"',
      ['M165,26 L158,78', 'M183,36 L175,82'], [[165, 58, 4.5]]));
    // mane over the crest of the neck, a solid shape
    p.push(`<path class="f-mane s-ink" stroke-width="3.5" stroke-linejoin="round" d="M155,32 C140,47 124,72 112,100 C120,102 124,98 128,90 C136,72 149,55 166,40 Z"/>`);
    // eye, nostril, mouth
    p.push(`<circle class="f-ink" cx="171" cy="51" r="4.3"/><circle class="f-bg" cx="172.6" cy="49.4" r="1.4"/>`);
    p.push(`<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M196,67 q2,1 3,3 M186,80 q5,-2 9,-1"/>`);

    if (f.horned) p.push(horn(175, 34, 38, 22));
    if (f.winged) p.push(wing(108, 92, 0.86, false));
    // the whole pony, every state alike, at 0.94 about its feet, so that the
    // tip of a wing or a horn stays inside the box (y >= 0) and never reaches
    // into the word above a picture
    return `<g transform="translate(110,${FLOOR}) scale(0.94) translate(-110,${-FLOOR})">${p.join('')}</g>`;
  }

  /* lizard: on all fours, side on, facing left, head raised; smooth back */
  function lizard(f) {
    const p = [];
    // tail, sweeping right along the floor
    p.push(`<path class="f-lizard s-ink" stroke-width="4" stroke-linejoin="round" d="M150,140 C176,142 196,158 212,176 C214,179 211,181 208,180 C190,174 170,164 146,160 Z"/>`);
    // far legs
    p.push(`<path class="f-lizard-far s-ink" stroke-width="3.5" stroke-linejoin="round" d="M84,150 C90,160 92,168 88,176 L96,177 C102,168 100,156 96,146 Z"/>`);
    p.push(`<path class="f-lizard-far s-ink" stroke-width="3.5" stroke-linejoin="round" d="M136,152 C146,160 150,168 150,176 L158,176 C160,166 154,154 146,146 Z"/>`);
    // body
    p.push(`<path class="f-lizard s-ink" stroke-width="4" stroke-linejoin="round" d="M54,132 C70,118 130,120 150,134 C160,142 156,158 140,162 C110,168 76,166 62,158 C50,152 46,140 54,132 Z"/>`);
    // near legs, with three toes each
    p.push(`<path class="f-lizard s-ink" stroke-width="4" stroke-linejoin="round" d="M66,150 C62,160 58,168 56,176 L72,176 C72,168 78,160 82,154 Z"/>`);
    p.push(`<path class="s-ink" stroke-width="3" fill="none" stroke-linecap="round" d="M56,176 l-7,6 M62,177 l-2,6 M68,177 l4,5"/>`);
    p.push(`<path class="f-lizard s-ink" stroke-width="4" stroke-linejoin="round" d="M124,156 C130,164 132,170 130,176 L146,176 C146,168 142,158 138,152 Z"/>`);
    p.push(`<path class="s-ink" stroke-width="3" fill="none" stroke-linecap="round" d="M130,176 l-6,6 M137,177 l-1,6 M143,177 l5,5"/>`);
    // neck and head, raised to the left
    p.push(`<path class="f-lizard s-ink" stroke-width="4" stroke-linejoin="round" d="M70,128 C62,112 52,100 40,96 C26,92 12,98 10,108 C8,116 16,122 28,122 C40,122 50,130 56,142 Z"/>`);
    p.push(`<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M12,111 C20,113 30,114 38,112"/>`);
    p.push(`<circle class="f-ink" cx="34" cy="103" r="4.5"/><circle class="f-bg" cx="35.5" cy="101.5" r="1.4"/>`);
    p.push(`<circle class="f-ink" cx="15" cy="103" r="1.6"/>`);

    if (f.horned) p.push(horn(25, 96, 40, -16));
    if (f.winged) p.push(wing(102, 128, 1.05, true));
    return p.join('');
  }

  const DRAW = { cat, pony, lizard };

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
    const present = OBJECTS.filter(n => spec && spec[n]);
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

  window.ART = { OBJECTS, LOOKS, COAT, WIDTH, legal, object, objectSVG, scene };
})();
