/* art.js : the three objects of the world, drawn as base + modifier layers.
 *
 * Every drawing lives in a 200 x 200 box with the floor at y = 182.  Colours
 * are never inline: every fill and stroke is a CSS class defined in
 * css/style.css, so the light/dark toggle recolours the art for free.
 *
 * Public API (window.ART):
 *   OBJECTS                 ['cat', 'snake', 'chair']
 *   MODS[obj]               the two modifiers of that object
 *   object(obj, flags)      inner SVG markup for one object, 200 x 200 units
 *   objectSVG(obj, flags, px)   a complete <svg> of one object, px wide
 *   scene(spec, px)         a complete <svg> of a tableau; spec maps each
 *                           object name to a flags object, or to null/absent
 *                           for "not in this scene"
 *
 * flags is a plain object such as {striped: true, venomous: false}.  Unknown
 * flags are ignored, so a flag meant for another object is harmless.
 */
(function () {
  'use strict';

  const OBJECTS = ['cat', 'snake', 'chair'];
  const MODS = {
    cat: ['striped', 'booted'],
    snake: ['venomous', 'striped'],
    chair: ['wooden', 'broken'],
  };
  // The cat's collar was the other candidate in Stage 1; Carlos chose boots
  // on 2026-09-02.  The drawing is kept, the game never uses it.
  const ALT_MODS = { cat: ['collared'] };

  const FLOOR = 182;
  let uid = 0; // clipPath ids must be unique across every inline svg on a page

  /* cat */
  function cat(f) {
    const id = 'clip' + (uid++);
    const tail = 'M138,158 C172,156 178,126 160,108';
    const p = [];

    // tail, behind the body: outline pass, fill pass, optional band pass
    p.push(`<path class="s-ink" d="${tail}" stroke-width="20" fill="none" stroke-linecap="round"/>`);
    p.push(`<path class="s-cat" d="${tail}" stroke-width="12" fill="none" stroke-linecap="round"/>`);
    if (f.striped) {
      p.push(`<path class="s-cat-stripe" d="${tail}" stroke-width="12" fill="none" stroke-dasharray="7 11" stroke-dashoffset="5"/>`);
    }

    // body
    p.push(`<ellipse class="f-cat s-ink" cx="100" cy="136" rx="44" ry="46" stroke-width="4"/>`);
    if (f.striped) {
      p.push(`<clipPath id="${id}"><ellipse cx="100" cy="136" rx="42" ry="44"/></clipPath>`);
      p.push(`<g clip-path="url(#${id})" class="s-cat-stripe" stroke-width="9" fill="none" stroke-linecap="round">` +
        `<path d="M48,108 Q100,94 152,108"/>` +
        `<path d="M48,128 Q100,114 152,128"/>` +
        `<path d="M48,148 Q100,134 152,148"/>` +
        `<path d="M48,168 Q100,154 152,168"/></g>`);
    }

    // front legs: plain paws, or boots when the alternative modifier is on
    if (f.booted) {
      // left boot, toe pointing outward
      p.push(`<path class="f-boot s-ink" stroke-width="4" stroke-linejoin="round" d="M74,142 h22 v30 h4 v10 h-44 q0,-8 8,-10 h10 z"/>`);
      p.push(`<path class="s-ink" stroke-width="2.5" fill="none" d="M58,182 h42"/>`);
      p.push(`<rect class="f-cuff s-ink" stroke-width="3" x="70" y="136" width="30" height="10" rx="3"/>`);
      // right boot, mirrored about x = 100
      p.push(`<path class="f-boot s-ink" stroke-width="4" stroke-linejoin="round" d="M126,142 h-22 v30 h-4 v10 h44 q0,-8 -8,-10 h-10 z"/>`);
      p.push(`<path class="s-ink" stroke-width="2.5" fill="none" d="M100,182 h42"/>`);
      p.push(`<rect class="f-cuff s-ink" stroke-width="3" x="100" y="136" width="30" height="10" rx="3"/>`);
    } else {
      p.push(`<rect class="f-cat s-ink" stroke-width="4" x="74" y="148" width="20" height="34" rx="9"/>`);
      p.push(`<rect class="f-cat s-ink" stroke-width="4" x="106" y="148" width="20" height="34" rx="9"/>`);
      // toes
      p.push(`<path class="s-ink" stroke-width="2.5" fill="none" d="M80,182 v-6 M88,182 v-6 M112,182 v-6 M120,182 v-6"/>`);
    }

    // collar and bell sit on the neck, over the body and under the head
    if (f.collared) {
      p.push(`<path class="s-ink" d="M66,106 Q100,122 134,106" stroke-width="16" fill="none" stroke-linecap="round"/>`);
      p.push(`<path class="s-collar" d="M66,106 Q100,122 134,106" stroke-width="10" fill="none" stroke-linecap="round"/>`);
      p.push(`<circle class="f-bell s-ink" stroke-width="3.5" cx="100" cy="121" r="13"/>`);
      p.push(`<path class="s-ink" stroke-width="2.5" fill="none" d="M100,126 v7 M91,121 h18"/>`);
    }

    // head
    p.push(`<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" d="M70,66 L76,30 L96,50 Z"/>`);
    p.push(`<path class="f-cat s-ink" stroke-width="4" stroke-linejoin="round" d="M130,66 L124,30 L104,50 Z"/>`);
    p.push(`<path class="f-cat-inner" d="M76,60 L79,40 L90,52 Z"/>`);
    p.push(`<path class="f-cat-inner" d="M124,60 L121,40 L110,52 Z"/>`);
    p.push(`<circle class="f-cat s-ink" stroke-width="4" cx="100" cy="78" r="34"/>`);
    if (f.striped) {
      p.push(`<path class="s-cat-stripe" stroke-width="7" fill="none" stroke-linecap="round" d="M90,48 v12 M100,45 v13 M110,48 v12"/>`);
      p.push(`<path class="s-cat-stripe" stroke-width="7" fill="none" stroke-linecap="round" d="M68,84 h10 M122,84 h10"/>`);
    }
    // eyes, nose, mouth, whiskers
    p.push(`<ellipse class="f-ink" cx="87" cy="76" rx="5" ry="6.5"/>`);
    p.push(`<ellipse class="f-ink" cx="113" cy="76" rx="5" ry="6.5"/>`);
    p.push(`<circle class="f-bg" cx="89" cy="74" r="1.6"/><circle class="f-bg" cx="115" cy="74" r="1.6"/>`);
    p.push(`<path class="f-ink" d="M95,87 h10 l-5,6 z"/>`);
    p.push(`<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M100,93 q-3,7 -9,5 M100,93 q3,7 9,5"/>`);
    p.push(`<path class="s-ink" stroke-width="2" fill="none" stroke-linecap="round" d="M84,88 L58,82 M84,92 L56,92 M84,96 L58,102 M116,88 L142,82 M116,92 L144,92 M116,96 L142,102"/>`);
    return p.join('');
  }

  /* snake */
  function snake(f) {
    const body = 'M26,176 C50,194 60,130 96,142 C128,152 136,186 160,166 C186,144 154,112 152,88';
    const p = [];
    // body: outline, fill, optional bands (the dash follows the curve)
    p.push(`<path class="s-ink" d="${body}" stroke-width="28" fill="none" stroke-linecap="round"/>`);
    p.push(`<path class="s-snake" d="${body}" stroke-width="20" fill="none" stroke-linecap="round"/>`);
    if (f.striped) {
      p.push(`<path class="s-snake-stripe" d="${body}" stroke-width="20" fill="none" stroke-dasharray="11 13" stroke-dashoffset="6"/>`);
    }
    // belly highlight line, gives the tube some roundness
    p.push(`<path class="s-snake-belly" d="${body}" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(0,5)"/>`);

    // head, drawn last so the neck tucks under it; faces left.  The two
    // heads are different shapes, not the same shape wearing fangs: the
    // venomous one is a blunt-snouted wedge, drawn by Habouz on 2026-09-14
    // and ported from images/snake/venomous-snake.svg.
    if (f.venomous) {
      p.push(`<path class="f-snake s-ink" stroke-width="4" stroke-linejoin="round" d="M114.794,69.766c-5.14,5.367 -11.122,11.38 4.747,13.794c0,0 29.26,-0.289 37.663,-3.003c4.09,-1.321 10.959,-10.57 8.707,-13.871c0,0 -6.728,-14.147 -9.845,-19.279c-3.118,-5.131 -8.152,-3.894 -19.349,1.109c-6.131,2.74 -17.424,16.552 -21.923,21.25Z"/>`);
      // open mouth: a dark wedge cut into the front of the head
      p.push(`<path class="f-mouth s-ink" stroke-width="3.5" stroke-linejoin="round" d="M112.126,79.871l23.645,-15.293l5.362,18.228l-29.006,-2.934Z"/>`);
      // two fangs hanging from the upper jaw
      p.push(`<path class="f-fang s-ink" stroke-width="2" stroke-linejoin="round" d="M116.14,77.98l7.8,-5.4l0.92,17.44l-8.72,-12.04Z"/>`);
      p.push(`<path class="f-fang s-ink" stroke-width="2" stroke-linejoin="round" d="M124.674,71.432l7.844,-5.335l0.776,17.447l-8.62,-12.111Z"/>`);
      // a drop of venom falling from the front fang
      p.push(`<path class="f-venom s-ink" stroke-width="3" d="M127,83c-8,11 -8,21 0,21c5.995,0 7.497,-5.615 4.508,-13.058c-1,-2.49 -2.502,-5.184 -4.508,-7.942Z"/>`);
      p.push(`<path class="f-venom s-ink" stroke-width="3" d="M127,109c-5,6 -5,12 0,12c5,0 5,-6 0,-12Z"/>`);
      // two slit eyes, the far one smaller: an almond with a vertical pupil
      p.push(`<path class="f-eye s-ink" stroke-width="2" stroke-linejoin="round" d="M143.024,55.546c2.822,-1.984 5.886,-2.494 6.838,-1.14c0.952,1.355 -0.566,4.065 -3.388,6.048c-2.822,1.984 -5.886,2.494 -6.838,1.14c-0.952,-1.355 0.566,-4.065 3.388,-6.048Z"/>`);
      p.push(`<ellipse class="f-pupil s-ink" stroke-width="1.25" cx="144.75" cy="58.25" rx="1.65" ry="3.15"/>`);
      p.push(`<path class="f-eye s-ink" stroke-width="1.75" stroke-linejoin="round" d="M127.677,58.284c2.268,-1.867 4.845,-2.491 5.749,-1.393c0.905,1.099 -0.202,3.507 -2.47,5.375c-2.268,1.867 -4.845,2.491 -5.749,1.393c-0.905,-1.099 0.202,-3.507 2.47,-5.375Z"/>`);
      p.push(`<ellipse class="f-pupil s-ink" stroke-width="1" cx="129" cy="60.5" rx="1.4" ry="2.9"/>`);
    } else {
      p.push(`<ellipse class="f-snake s-ink" stroke-width="4" cx="142" cy="68" rx="26" ry="18"/>`);
      // closed mouth and a forked tongue
      p.push(`<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M118,72 q10,4 20,0"/>`);
      p.push(`<path class="s-ink" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M116,68 h-14 l-7,-6 M102,68 l-7,6"/>`);
      // one round eye and a nostril
      p.push(`<circle class="f-ink" cx="134" cy="61" r="4.5"/>`);
      p.push(`<circle class="f-bg" cx="135.5" cy="59.5" r="1.4"/>`);
      p.push(`<circle class="f-ink" cx="122" cy="64" r="1.6"/>`);
    }
    return p.join('');
  }

  /* chair */
  function chair(f) {
    const fill = f.wooden ? 'f-wood' : 'f-chair';
    const p = [];

    const body = [];
    // back legs, behind the seat
    body.push(`<rect class="${fill} s-ink" stroke-width="4" x="68" y="118" width="10" height="56" rx="2"/>`);
    body.push(`<rect class="${fill} s-ink" stroke-width="4" x="122" y="118" width="10" height="56" rx="2"/>`);
    // backrest: one solid panel, deliberately no slats, so "striped chair" never suggests itself
    body.push(`<rect class="${fill} s-ink" stroke-width="4" x="58" y="28" width="84" height="76" rx="12"/>`);
    // seat
    body.push(`<rect class="${fill} s-ink" stroke-width="4" x="48" y="100" width="104" height="24" rx="7"/>`);
    // front-left leg, always intact
    body.push(`<rect class="${fill} s-ink" stroke-width="4" x="52" y="122" width="12" height="60" rx="2"/>`);
    if (f.broken) {
      // front-right leg reduced to a jagged stub
      body.push(`<path class="${fill} s-ink" stroke-width="4" stroke-linejoin="round" d="M136,122 h12 v22 l-4,6 l-4,-6 l-4,6 z"/>`);
      // cracks in the seat next to it
      body.push(`<path class="s-ink" stroke-width="2.5" fill="none" stroke-linecap="round" d="M124,104 l6,8 l-5,7 M132,102 l3,6"/>`);
    } else {
      body.push(`<rect class="${fill} s-ink" stroke-width="4" x="136" y="122" width="12" height="60" rx="2"/>`);
    }
    if (f.wooden) {
      // grain on the backrest and the seat, and one knot
      body.push(`<g class="s-grain" stroke-width="2.5" fill="none" stroke-linecap="round">` +
        `<path d="M76,38 q5,14 0,30 q-5,14 0,28"/>` +
        `<path d="M100,36 q-5,14 0,30 q5,14 0,30"/>` +
        `<path d="M124,38 q5,14 0,30 q-5,14 0,28"/>` +
        `<path d="M58,112 q20,-4 40,0 t40,0"/>` +
        `<ellipse cx="112" cy="84" rx="5" ry="3"/></g>`);
    }

    if (f.broken) {
      // the whole chair tilts toward the missing leg, pivoting on the intact front foot
      p.push(`<g transform="rotate(7 58 182)">${body.join('')}</g>`);
      // the snapped-off piece lying on the floor
      p.push(`<g transform="translate(150,181) rotate(-72)"><path class="${fill} s-ink" stroke-width="4" stroke-linejoin="round" d="M0,0 h12 v-30 l-4,-6 l-4,6 l-4,-6 z"/></g>`);
    } else {
      p.push(body.join(''));
    }
    return p.join('');
  }

  const DRAW = { cat, snake, chair };

  /* helpers */
  function object(name, flags) {
    return DRAW[name](flags || {});
  }

  function floorLine(x0, x1) {
    return `<line class="s-floor" stroke-width="2" x1="${x0}" y1="${FLOOR + 3}" x2="${x1}" y2="${FLOOR + 3}"/>`;
  }

  function objectSVG(name, flags, px) {
    px = px || 200;
    return `<svg class="art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${px}" height="${px}" role="img">` +
      floorLine(14, 186) + object(name, flags) + '</svg>';
  }

  // Fixed layout: cat left, chair centre and slightly behind, snake right.
  // Absent objects leave their slot empty, so four answer options always
  // share one geometry and differ only in what is switched on.
  const SLOT = { cat: 0, chair: 190, snake: 380 };
  const SCENE_W = 580;

  // opts.fit crops the viewBox to the slots that are occupied, so a
  // one-object scene is drawn large instead of in one third of an empty
  // row.  Relative positions never change: the cat is always left of the
  // chair, the snake always right of it.
  function scene(spec, px, opts) {
    opts = opts || {};
    const present = OBJECTS.filter(n => spec[n]);
    let x0 = 0, x1 = SCENE_W;
    if (opts.fit && present.length) {
      x0 = Math.min.apply(null, present.map(n => SLOT[n]));
      x1 = Math.max.apply(null, present.map(n => SLOT[n])) + 200;
    }
    const w = x1 - x0;
    px = px || w;
    const h = Math.round(px * 200 / w);
    const parts = [floorLine(x0 + 12, x1 - 12)];
    for (const name of ['chair', 'cat', 'snake']) { // chair first so it sits behind
      const flags = spec[name];
      if (!flags) continue;
      parts.push(`<g transform="translate(${SLOT[name]},0)">${object(name, flags)}</g>`);
    }
    return `<svg class="art" xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 0 ${w} 200" width="${px}" height="${h}" role="img">` +
      parts.join('') + '</svg>';
  }

  window.ART = { OBJECTS, MODS, ALT_MODS, object, objectSVG, scene };
})();
