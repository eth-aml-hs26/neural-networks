/* blue.js: the blue part, the grasshopper measures the slope, as GF.parts.blue.
 *
 * Speed 1 (everything), iteration 1, one click each, in the order Carlos dictated (30 October 2026):
 *   hopper   the grasshopper drops onto the box of w
 *   onplot   it jumps to its point (w, l(w)) on the red plot
 *   lens     a magnifying glass round it, and the magnified view (top right): the red curve near
 *            the point, the grasshopper on it, two rulers w and l as on the plot
 *   eps      eps = 0.01, a bracket of that length on the w ruler
 *   ww       w + eps = 0.5 + 0.01 = 0.51; the grasshopper hops sideways along the bracket, the
 *            ruler gets the ticks 0.5 and 0.51
 *   lplus    l(w + eps) = (3 - 17 x 0.51)^2 = (3 - 8.67)^2 = 32.1489; then it rises (or drops) to
 *            the curve, which closes a right triangle; the l ruler gets the tick 32.1489
 *   compare  l(w) = (3 - 17 x 0.5)^2 = (3 - 8.5)^2 = 30.25 under it, from the box of the loss
 *   delta    Delta_eps = 32.1489 - 30.25 = 1.8989, the vertical side of the triangle
 *   define   Delta_eps = l(w + eps) - l(w) slides in as its definition
 *   slope    Delta_eps / eps = 1.8989 / 0.01 = 189.89: the two numbers fly into the fraction; the
 *            third side is drawn and the grasshopper tilts onto it
 *   limit    the arithmetic becomes a table; the grasshopper hops again with eps / 2, eps / 5 and
 *            eps / 10, each hop a smaller triangle inside the last, AT THE SAME SCALE, so the room
 *            sees the hops shrink; their rows read 188.445, 187.578, 187.289, and eps / 100, too
 *            small to draw, 187.0289
 *   deriv    lim_{eps -> 0} Delta_eps / eps = dl/dw = 187, the tangent, and a big arrow from the
 *            view to the formula, right above where the purple box dl/dw will appear
 * Iteration 2 on, two clicks:
 *   measure  lens to slope in one go, the arithmetic in short (the grasshopper is on the plot already)
 *   deriv    limit and deriv in one go
 *
 * Speed 2 (quick): hopper and onplot as above, then
 *   tangent  the glass and the view; the tangent at the point and a right triangle under it: a run
 *            of eps and its rise, dl/dw x eps (0.01 and 1.87)
 *   direct   dl/dw = -2 x (y - yhat) = -2 x 17 x (3 - 8.5) = 187, the numbers flying in from the
 *            boxes of x, y and yhat
 * Iteration 2 on, one click: direct (tangent and direct in one go). Speed 3: no click of its own.
 *
 * The view keeps one scale through the blue part of an iteration (Carlos, 30 October 2026: a view
 * that zooms in with each eps hides that the eps get smaller). When the purple part starts every
 * blue thing goes but the last line, the derivative, which stays where it is until purple's grad
 * flies its value into the box dl/dw (el.final, el.derivVal).
 *
 * Every number shown checks by hand from the digits shown. The room types a guess of at most four
 * decimals, so the numbers of iterations 1 and 2 are exact decimals (BigInt, below): no rounding at
 * all. Later guesses carry many decimals; then the losses are rounded to fixed decimals and the
 * difference and the slope are computed from the rounded losses shown. The direct line of speed 2
 * ends on dl/dw itself, the number purple's box shows: in iterations 1 and 2 it is exactly
 * -34 (3 - yhat) of the yhat shown; from iteration 3 on, yhat is shown rounded (as in its box) and
 * the product by hand can differ in the last digits, as the boxes of yhat and the loss do.
 */
(function () {
  'use strict';
  var M = window.GFMath, K = window.GFKit, GF = window.GF, G = GF.geo;
  var el = { lab: {}, cell: {}, tab: {}, tri: [] };

  // ===== exact decimals {m, s}: the value m / 10^s, m a BigInt

  var TEN = BigInt(10), ZERO = BigInt(0), ONE = BigInt(1), TWO = BigInt(2);
  function p10(n) { var r = ONE; while (n-- > 0) r *= TEN; return r; }
  function norm(a) {
    var m = a.m, s = a.s;
    while (s > 0 && m % TEN === ZERO) { m /= TEN; s--; }
    return { m: m, s: s };
  }
  function dec(str) {
    var t = String(str).trim(), neg = t.charAt(0) === '-';
    if (neg || t.charAt(0) === '+') t = t.slice(1);
    var i = t.indexOf('.');
    var s = i < 0 ? 0 : t.length - i - 1;
    var m = BigInt((i < 0 ? t : t.slice(0, i) + t.slice(i + 1)) || '0');
    return norm({ m: neg ? -m : m, s: s });
  }
  // a float as the decimal it stands for: 15 significant digits wipe out the binary noise
  function fromNum(v) {
    var t = Number(v).toPrecision(15);
    if (t.indexOf('e') >= 0) t = Number(v).toFixed(20);
    return dec(t);
  }
  function up(a, s) { return a.m * p10(s - a.s); }
  function add(a, b) { var s = Math.max(a.s, b.s); return norm({ m: up(a, s) + up(b, s), s: s }); }
  function sub(a, b) { var s = Math.max(a.s, b.s); return norm({ m: up(a, s) - up(b, s), s: s }); }
  function mul(a, b) { return norm({ m: a.m * b.m, s: a.s + b.s }); }
  // a times 10^k
  function shift(a, k) {
    if (k <= 0) return norm({ m: a.m, s: a.s - k });
    return a.s >= k ? norm({ m: a.m, s: a.s - k }) : norm({ m: a.m * p10(k - a.s), s: 0 });
  }
  // rounded to s decimals, halves away from zero
  function round(a, s) {
    if (a.s <= s) return a;
    var d = p10(a.s - s), m = a.m < ZERO ? -a.m : a.m;
    var q = m / d;
    if ((m % d) * TWO >= d) q += ONE;
    return norm({ m: a.m < ZERO ? -q : q, s: s });
  }
  // a / b: exact when b is 1, 2, 4, 5 or 8 times a power of ten (every hop here: a / 0.005 is
  // a x 200), else rounded to 4 decimals
  function divide(a, b) {
    var q = p10(b.s), m = b.m < ZERO ? -b.m : b.m;
    if (m !== ZERO && q % m === ZERO) {
      var r = mul(a, { m: q / m, s: 0 });
      return b.m < ZERO ? norm({ m: -r.m, s: r.s }) : r;
    }
    return round(fromNum(num(a) / num(b)), 4);
  }
  function num(a) { return Number(a.m) / Math.pow(10, a.s); }
  function neg(a) { return a.m < ZERO; }
  // TeX of a decimal: every digit, a thin space between thousands from five integer digits on
  function str(a) {
    var m = neg(a) ? -a.m : a.m, t = m.toString();
    while (t.length <= a.s) t = '0' + t;
    var ip = t.slice(0, t.length - a.s), fp = a.s > 0 ? t.slice(t.length - a.s) : '';
    if (ip.length > 4) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
    return (neg(a) ? '-' : '') + ip + (fp ? '.' + fp : '');
  }
  // inside a formula: in parentheses when negative, as in 17 x (-0.99)
  function wrap(a) { return neg(a) ? '(' + str(a) + ')' : str(a); }
  // the two halves of a number for a column aligned on the decimal point
  function halves(a) {
    var t = str(a), i = t.indexOf('.');
    return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i)];
  }

  var N3 = dec('3'), N17 = dec('17'), M34 = dec('-34'), HALF = dec('0.5'), FIFTH = dec('0.2');

  // ===== one measurement: the hop eps (a decimal) from w (a float)

  // places: Infinity for exact numbers, else the decimals the losses are rounded to
  function measure(w, ed, places) {
    var wd = fromNum(w), exact = !(places < Infinity);
    var wp = add(wd, ed);
    var p = mul(N17, wp), r = sub(N3, p), lp = mul(r, r);
    var p0 = mul(N17, wd), r0 = sub(N3, p0), l = mul(r0, r0);
    var lpS = exact ? lp : round(lp, places), lS = exact ? l : round(l, places);
    var delta = sub(lpS, lS);
    var wS = exact ? wd : round(wd, 4);
    return {
      exact: exact, w: wd, e: ed, wS: wS, wpS: add(wS, ed), wp: wp,
      p: p, r: r, p0: p0, r0: r0, lp: lpS, l: lS, delta: delta, slope: divide(delta, ed)
    };
  }

  // exact while the guess has at most four decimals (every guess the room types, and iteration 2)
  function exactFor(w) { return fromNum(w).s <= 4; }
  function bandPlaces(w, ed) { return exactFor(w) ? Infinity : Math.max(4, 2 * ed.s); }

  // The hops of the limit: eps, eps / 2, eps / 5, eps / 10, drawn at one scale (200, 100, 40 and
  // 20 pixels), then eps / 100, too small to draw, as numbers only.
  var DRAWN = 4;
  function limitEps(ed) { return [ed, mul(ed, HALF), mul(ed, FIFTH), shift(ed, -1), shift(ed, -2)]; }

  // the decimal a box shows for v (fmt of js/math.js: 4 decimals, 2 from a thousand, none from
  // 100 000)
  function shown(v) { var a = Math.abs(v); return round(fromNum(v), a >= 1e5 ? 0 : a >= 1e3 ? 2 : 4); }
  // dl/dw straight from the boxes: -2 x (y - yhat) = -34 (3 - yhat), yhat as its box shows it
  function direct(w) {
    var yh = shown(M.yhat(w)), r = sub(N3, yh);
    return { yh: yh, r: r, D: mul(M34, r) };
  }

  // ===== where things sit (stage pixels; see GF.geo.inset and GF.geo.band)

  var V = { x: 1000, y: 30, w: 570, h: 362 };          // the magnified view
  var VA = { l: 1120, r: 1560, t: 40, b: 350 };         // its drawing; the rulers run along l and b
  var SX = 1236;                                        // x of the grasshopper's point in the view
  var HOP = 200;                                        // the hop of eps in the view, in pixels
  var TILT = 38;                                        // the triangle of eps rises at this angle...
  var BEND = 110;                                       // ...unless the curve bends more over a hop
  var CY = [200, 228];                                  // the triangle of eps is centred on this height
                                                        // (lower when it falls: room above its point)
  var BACK = 42;                                        // how far behind its point it watches the limit
  var BIG = 1, LENS_R = 40;                             // the grasshopper of the view, the glass
  var BAND = { x: 372, y: 62, w: 612, h: 190 };         // the arithmetic, then the table
  var LOW = { x: 618, y: 288 };                         // the slope, then the derivative (centre y)
  var LOW2 = { x: 540, y: 316 };                        // the two lines of speed 2: left, foot (the
                                                        // bands of the passes are hidden meanwhile)

  // ===== KaTeX with classes on pieces (\htmlClass), so numbers can fly into a piece

  var KOPT = { throwOnError: false, trust: true, strict: 'ignore' };
  function tex(e, src) {
    src = String(src);
    if (e.__b !== src) { e.__b = src; katex.render(src, e, KOPT); }
    return e;
  }
  function cl(name, body) { return '\\htmlClass{bl-' + name + '}{' + body + '}'; }
  function part(e, name) { return e.querySelector('.bl-' + name) || e; }
  function lab(layer, cls) { return K.div('bl-lab vis ' + (cls || ''), layer); }
  // the font of e shrinks until e is at most maxW wide (offsetWidth is not scaled with the stage)
  function fitW(e, maxW) {
    e.style.fontSize = '';
    var w = e.offsetWidth;
    if (w > maxW) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * maxW / w * 0.98).toFixed(2) + 'px';
  }

  // ===== the magnified view: one scale for the blue part of an iteration

  function secant(w, e) { return (M.loss(w + e) - M.loss(w)) / e; }

  // The hop of eps spans HOP pixels. l is stretched so that the triangle of eps rises at TILT
  // degrees, unless the curve would then bend away from its tangent by more than BEND pixels over
  // one hop: near the bottom the slope is small and the bend is what there is to see. es: the hops
  // drawn (floats). S is the grasshopper's point; the triangle of eps is centred on CY.
  function scaleOf(w, eps, es) {
    var sx = HOP / eps;
    var sy = Math.min(Math.tan(TILT * Math.PI / 180) * sx / Math.max(Math.abs(secant(w, eps)), 1e-12),
      BEND / (M.X * M.X * eps * eps));
    var rise = (M.loss(w + eps) - M.loss(w)) * sy;
    return { w: w, eps: eps, es: es, sx: sx, sy: sy, l0: M.loss(w), S: { x: SX, y: CY[rise < 0 ? 1 : 0] + rise / 2 } };
  }
  // the point of the curve at w + e
  function pt(sc, e) { return { x: sc.S.x + e * sc.sx, y: sc.S.y - (M.loss(sc.w + e) - sc.l0) * sc.sy }; }
  // a slope of the loss as pixels down per pixel across
  function pxSlope(sc, k) { return -k * sc.sy / sc.sx; }
  function deg(dx, dy) { return Math.atan2(dy, dx) * 180 / Math.PI; }
  // the grasshopper's angle on the secant of the hop e, and on the tangent
  function angSec(sc, e) { var E = pt(sc, e); return deg(E.x - sc.S.x, E.y - sc.S.y); }
  function angTan(sc) { return deg(1, pxSlope(sc, M.dloss(sc.w))); }
  // Where it stands to watch the limit: just behind its point, nose at it, so the small triangles
  // in front of its point stay in view ('B': on the curve, BACK pixels before the point; 'T': on
  // the tangent). The angle that goes with 'B': along the chord to the point.
  function behind(sc, onTangent) {
    var S = sc.S;
    if (onTangent) { var a = Math.atan(pxSlope(sc, M.dloss(sc.w))); return { x: S.x - BACK * Math.cos(a), y: S.y - BACK * Math.sin(a) }; }
    var k = pxSlope(sc, M.dloss(sc.w)), b = BACK / Math.sqrt(1 + k * k), P = pt(sc, -b / sc.sx);
    var len = Math.hypot(S.x - P.x, S.y - P.y);
    return pt(sc, -b * BACK / Math.max(1, len) / sc.sx);
  }
  function angBack(sc) { var P = behind(sc, false); return deg(sc.S.x - P.x, sc.S.y - P.y); }

  function lineD(a, b) { return 'M ' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
  // a line through p with slope k (pixels down per pixel across), across the whole view
  function across(p, k) {
    var x0 = VA.l - 30, x1 = VA.r + 30;
    return lineD([x0, p.y + (x0 - p.x) * k], [x1, p.y + (x1 - p.x) * k]);
  }
  function curveD(sc) {
    var d = '';
    for (var x = VA.l - 12; x <= VA.r + 12; x += 4) {
      var y = sc.S.y - (M.loss(sc.w + (x - sc.S.x) / sc.sx) - sc.l0) * sc.sy;
      y = Math.max(VA.t - 600, Math.min(VA.b + 600, y));
      d += (d ? ' L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(2);
    }
    return d;
  }
  function dot(c, p) { c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1)); }

  // The right triangle under the tangent (speed 2): the run eps from the point, the rise up to the
  // tangent; its corner sits below the tangent, away from the grasshopper standing on it.
  function tanTri(sc) {
    var S = sc.S, run = sc.eps * sc.sx, T = { x: S.x + run, y: S.y + pxSlope(sc, M.dloss(sc.w)) * run };
    var upHill = T.y <= S.y;
    return { S: S, T: T, up: upHill, C: upHill ? { x: T.x, y: S.y } : { x: S.x, y: T.y } };
  }

  // ===== the magnified view: build

  function buildView(layer) {
    var g = K.svg('g', null, layer.back, 'bl-view vis');
    el.view = g;
    K.svg('rect', { x: V.x + 5, y: V.y + 6, width: V.w, height: V.h, rx: 10 }, g, 'bl-shadow');
    el.frame = K.svg('rect', { x: V.x, y: V.y, width: V.w, height: V.h, rx: 10 }, g, 'bl-frame');
    var cp = K.svg('clipPath', { id: 'bl-clip' }, g);
    K.svg('rect', { x: VA.l + 1, y: V.y + 3, width: V.x + V.w - VA.l - 4, height: VA.b - V.y - 4 }, cp);
    var c = K.svg('g', { 'clip-path': 'url(#bl-clip)' }, g);
    el.vgS = K.svg('path', null, c, 'bl-guide vis');
    el.vgE = K.svg('path', null, c, 'bl-guide vis');
    el.vgSL = K.svg('path', null, c, 'bl-guide vis');
    el.vgEL = K.svg('path', null, c, 'bl-guide vis');
    el.vcurve = K.svg('path', null, c, 'bl-curve k-red vis');
    el.vtan = K.svg('path', null, c, 'bl-tan vis');
    el.vsec = K.svg('path', null, c, 'bl-sec vis');
    // the hops: 0 is eps, 1 to 3 the smaller hops of the limit, each its two legs and its point
    for (var j = 0; j < DRAWN; j++) {
      el.tri.push({
        hop: K.svg('path', null, c, 'bl-leg vis'),
        rise: K.svg('path', null, c, 'bl-leg vis'),
        dot: K.svg('circle', { r: 7 }, c, 'point bl-dot vis')
      });
    }
    // the triangle under the tangent (speed 2)
    el.trun = K.svg('path', null, c, 'bl-leg vis');
    el.trise = K.svg('path', null, c, 'bl-leg vis');
    el.vdotS = K.svg('circle', { r: 7 }, c, 'point k-red vis');
    el.axW = K.arrow(g, [[VA.l - 8, VA.b], [VA.r, VA.b]], 'bl-axis on', { size: 11 });
    el.axL = K.arrow(g, [[VA.l, VA.b + 8], [VA.l, VA.t]], 'bl-axis on', { size: 11 });
    el.vbr = K.svg('path', null, g, 'bl-bracket vis');
    el.vtS = K.svg('path', null, g, 'bl-tick vis');
    el.vtE = K.svg('path', null, g, 'bl-tick vis');
    el.vtSL = K.svg('path', null, g, 'bl-tick vis');
    el.vtEL = K.svg('path', null, g, 'bl-tick vis');

    var L = el.lab;
    L.nW = lab(layer.mid, 'bl-name'); tex(L.nW, 'w'); K.pos(L.nW, VA.r - 4, VA.b + 7, 'tr');
    L.nL = lab(layer.mid, 'bl-name'); tex(L.nL, '\\ell'); K.pos(L.nL, VA.l - 12, VA.t - 6, 'tr');
    L.tW = lab(layer.mid, 'bl-tick-lab');
    L.tWp = lab(layer.mid, 'bl-tick-lab');
    L.tL = lab(layer.mid, 'bl-tick-lab');
    L.tLp = lab(layer.mid, 'bl-tick-lab');
    L.lE = lab(layer.mid, 'bl-leg-lab'); tex(L.lE, '\\varepsilon');
    L.lD = lab(layer.mid, 'bl-leg-lab'); tex(L.lD, '\\Delta_\\varepsilon');
    L.run = lab(layer.mid, 'bl-num-lab');
    L.rise = lab(layer.mid, 'bl-num-lab');
    el.big = GF.hopper.make(layer.front, 'big');
  }

  // ===== the magnified view: draw one moment
  //
  // v.j: the hop being drawn, 0 for eps, 1 to 3 for the smaller hops of the limit; the hops before
  // it are drawn whole and pale, the hops after it not at all. v.hop and v.rise (0 to 1): how far
  // the sideways leg and the vertical leg of hop j have gone. v.at: where the grasshopper stands on
  // hop j, 'S' (its point), 'H' (along the hop) or 'E' (along the rise), or behind its point, 'B'
  // on the curve or 'T' on the tangent; null leaves it where it is. v.ang: its angle in degrees. v.secE and v.brE: the hops the secant and the bracket span
  // (they shrink with the hops of the limit).

  function vs(sc, o) {
    var v = { j: 0, hop: 0, rise: 0, at: 'S', ang: 0, secE: sc.es[0], brE: sc.es[0] };
    Object.keys(o || {}).forEach(function (k) { v[k] = o[k]; });
    return v;
  }

  function poseOf(sc, v) {
    var S = sc.S, E = pt(sc, sc.es[v.j]), x = S.x, y = S.y;
    if (v.at === 'H') x = S.x + v.hop * (E.x - S.x);
    if (v.at === 'E') { x = E.x; y = S.y + v.rise * (E.y - S.y); }
    if (v.at === 'B' || v.at === 'T') { var P = behind(sc, v.at === 'T'); x = P.x; y = P.y; }
    return { x: x, y: y, a: v.ang, s: BIG, f: 1 };
  }

  // the box a grasshopper covers at pose p (feet line at y = 0, from -58 to 57 across, 60 high)
  function hopBox(p) {
    var c = Math.cos(p.a * Math.PI / 180), s = Math.sin(p.a * Math.PI / 180), xs = [], ys = [];
    [[-60, 0], [58, 0], [-60, -62], [58, -62]].forEach(function (q) {
      xs.push(p.x + p.s * (q[0] * c - q[1] * s));
      ys.push(p.y + p.s * (q[0] * s + q[1] * c));
    });
    return { l: Math.min.apply(null, xs), r: Math.max.apply(null, xs), t: Math.min.apply(null, ys), b: Math.max.apply(null, ys) };
  }

  function drawView(sc, v) {
    var S = sc.S, L = el.lab;
    el.vcurve.setAttribute('d', curveD(sc));
    dot(el.vdotS, S);
    el.tri.forEach(function (t, i) {
      var E = pt(sc, sc.es[i]);
      var hp = i < v.j ? 1 : i === v.j ? v.hop : 0, rs = i < v.j ? 1 : i === v.j ? v.rise : 0;
      t.hop.setAttribute('d', lineD([S.x, S.y], [S.x + hp * (E.x - S.x), S.y]));
      t.rise.setAttribute('d', lineD([E.x, S.y], [E.x, S.y + rs * (E.y - S.y)]));
      dot(t.dot, E);
      [t.hop, t.rise, t.dot].forEach(function (e) { e.classList.toggle('ghost', i < v.j); });
    });
    var E0 = pt(sc, sc.es[0]), Es = pt(sc, v.secE), Eb = pt(sc, v.brE);
    el.vsec.setAttribute('d', across(S, (Es.y - S.y) / (Es.x - S.x)));
    el.vtan.setAttribute('d', across(S, pxSlope(sc, M.dloss(sc.w))));
    // the guides and ticks of the point and of the hop of eps
    var ry0 = v.j > 0 ? E0.y : S.y + v.rise * (E0.y - S.y);
    el.vgS.setAttribute('d', lineD([S.x, S.y], [S.x, VA.b]));
    el.vgE.setAttribute('d', lineD([E0.x, Math.max(S.y, ry0)], [E0.x, VA.b]));
    el.vgSL.setAttribute('d', lineD([S.x, S.y], [VA.l, S.y]));
    el.vgEL.setAttribute('d', lineD([E0.x, E0.y], [VA.l, E0.y]));
    el.vtS.setAttribute('d', lineD([S.x, VA.b - 6], [S.x, VA.b + 6]));
    el.vtE.setAttribute('d', lineD([E0.x, VA.b - 6], [E0.x, VA.b + 6]));
    el.vtSL.setAttribute('d', lineD([VA.l - 6, S.y], [VA.l + 6, S.y]));
    el.vtEL.setAttribute('d', lineD([VA.l - 6, E0.y], [VA.l + 6, E0.y]));
    K.pos(L.tW, S.x, VA.b + 8, 'tc');
    K.pos(L.tWp, E0.x, VA.b + 8, 'tc');
    // the two ticks of l a little apart when the ground is nearly flat
    var gap = 27, ys = S.y, ye = E0.y;
    if (Math.abs(ys - ye) < gap) {
      var m = (ys + ye) / 2, sg = ye <= ys ? -1 : 1;
      ye = m + sg * gap / 2; ys = m - sg * gap / 2;
    }
    K.pos(L.tL, VA.l - 10, ys, 'cr');
    K.pos(L.tLp, VA.l - 10, ye, 'cr');
    // the bracket of the hop brE, eps over it
    var by = VA.b - 12;
    el.vbr.setAttribute('d', 'M ' + S.x + ' ' + (by - 7) + ' L ' + S.x + ' ' + (by + 7) + ' M ' + S.x + ' ' + by +
      ' L ' + Eb.x.toFixed(1) + ' ' + by + ' M ' + Eb.x.toFixed(1) + ' ' + (by - 7) + ' L ' + Eb.x.toFixed(1) + ' ' + (by + 7));
    K.pos(L.lE, (S.x + Eb.x) / 2, by - 6, 'bc');
    // the triangle under the tangent: the run along its bottom, the rise up its side
    var tt = tanTri(sc), bot = Math.max(tt.S.y, tt.T.y);
    el.trun.setAttribute('d', tt.up ? lineD([tt.S.x, tt.S.y], [tt.C.x, tt.C.y]) : lineD([tt.C.x, tt.C.y], [tt.T.x, tt.T.y]));
    el.trise.setAttribute('d', tt.up ? lineD([tt.C.x, tt.C.y], [tt.T.x, tt.T.y]) : lineD([tt.S.x, tt.S.y], [tt.C.x, tt.C.y]));
    K.pos(L.run, (tt.S.x + tt.T.x) / 2, bot + 7, 'tc');
    // the rise beside its side; above the tip when the tangent is nearly flat (it would sit on the
    // dashed tangent)
    if (Math.abs(tt.T.y - tt.S.y) < 26) K.pos(L.rise, tt.T.x, Math.min(tt.S.y, tt.T.y) - 12, 'bc');
    else if (tt.up) K.pos(L.rise, tt.T.x + 10, (tt.S.y + tt.T.y) / 2, 'cl');
    else K.pos(L.rise, tt.S.x - 10, (tt.S.y + tt.T.y) / 2, 'cr');

    // Delta beside the vertical side of the hop of eps, clear of the grasshopper: right of the
    // side halfway up, else right of it at the end away from the grasshopper, else inside the
    // triangle, else right of the grasshopper
    var p = v.at ? poseOf(sc, v) : el.big.pose, bx = hopBox(p);
    var mid = (S.y + ry0) / 2, far = S.y + 0.22 * (ry0 - S.y);
    function hits(x0, x1, y) { return y > bx.t - 18 && y < bx.b + 22 && x0 < bx.r + 4 && x1 > bx.l - 4; }
    if (Math.abs(ry0 - S.y) < 30) K.pos(L.lD, E0.x + 12, Math.min(S.y, ry0) - 20, 'cl');   // a flat side: above it
    else if (!hits(E0.x + 12, E0.x + 58, mid)) K.pos(L.lD, E0.x + 12, mid, 'cl');
    else if (!hits(E0.x + 12, E0.x + 58, far)) K.pos(L.lD, E0.x + 12, far, 'cl');
    else if (!hits(E0.x - 58, E0.x - 12, mid) && Math.abs(ry0 - S.y) > 40) K.pos(L.lD, E0.x - 12, mid, 'cr');
    else K.pos(L.lD, bx.r + 8, mid, 'cl');
    if (v.at) el.big.place(p.x, p.y, p.a, p.s, p.f);
  }

  // the view from v0 to v1 over ms: numbers in between (the hops secE and brE geometrically, as
  // they shrink by factors), the rest as in v1
  function tweenView(sc, v0, v1, ms, delay, done) {
    K.wait(delay || 0, function () {
      K.tween(ms, function (t) {
        var v = {};
        Object.keys(v1).forEach(function (k) {
          var a = v0[k], b = v1[k];
          if (typeof a !== 'number' || typeof b !== 'number') v[k] = b;
          else if (k === 'secE' || k === 'brE') v[k] = a * Math.pow(b / a, t);
          else v[k] = a + (b - a) * t;
        });
        drawView(sc, v);
      }, K.ease.inOut, done);
    });
  }

  // ===== the glass on the plot, and the lines up to the view

  function buildLens(layer) {
    el.cone = K.svg('g', null, layer.back, 'bl-cone-g vis');
    el.coneA = K.svg('path', null, el.cone, 'bl-cone');
    el.coneB = K.svg('path', null, el.cone, 'bl-cone');
    el.lens = K.svg('g', null, layer.front, 'bl-lens vis');
    el.glass = K.svg('circle', { r: LENS_R }, el.lens, 'bl-glass');
    el.handle = K.svg('path', null, el.lens, 'bl-handle');
  }

  // the point of the plot, the glass round the grasshopper on it, and its handle pointing away
  // from the curve (the plot's view is read now: it zooms from one iteration to the next)
  function plotPoint(w) { return { x: G.wx(w), y: G.ly(M.loss(w)) }; }
  function drawLens(w) {
    var p = plotPoint(w), c = { x: p.x, y: Math.min(p.y - 12, G.plot.oy - 30) };
    var right = w >= M.W_STAR, low = p.y > 760;
    var ang = (low ? -45 : 45) * Math.PI / 180, ux = Math.cos(ang) * (right ? 1 : -1), uy = Math.sin(ang);
    el.glass.setAttribute('cx', c.x.toFixed(1));
    el.glass.setAttribute('cy', c.y.toFixed(1));
    el.handle.setAttribute('d', lineD([c.x + ux * (LENS_R + 3), c.y + uy * (LENS_R + 3)],
      [c.x + ux * (LENS_R + 38), c.y + uy * (LENS_R + 38)]));
    el.lens.__c = c;
    var corners = [[V.x + 70, V.y + V.h], [V.x + V.w - 2, V.y + V.h]];
    [el.coneA, el.coneB].forEach(function (path, i) {
      var P = corners[i], dx = P[0] - c.x, dy = P[1] - c.y, d = Math.hypot(dx, dy);
      var th = Math.atan2(dy, dx), al = Math.acos(Math.min(1, LENS_R / d));
      var t1 = [c.x + LENS_R * Math.cos(th + al), c.y + LENS_R * Math.sin(th + al)];
      var t2 = [c.x + LENS_R * Math.cos(th - al), c.y + LENS_R * Math.sin(th - al)];
      var t = (i === 0) === (t1[0] < t2[0]) ? t1 : t2;
      path.setAttribute('d', lineD(t, P));
    });
  }

  // ===== the arithmetic (top middle): rows aligned on "=", the two losses on the decimal point

  function gcell(rows, cls, src) {
    var c = K.div('bl-c ' + cls + ' vis', el.grid);
    if (src !== undefined) tex(c, src);
    rows.push(c);
    return c;
  }
  function grow(key, labelTex) {
    var r = el.rows[key] = [];
    gcell(r, 'c-lab', labelTex);
    gcell(r, 'c-eq', '=');
    return r;
  }
  // a value split on its decimal point, into the two last columns
  function gvalue(r, a, key) {
    var h = halves(a);
    return [gcell(r, 'c-int', cl(key, h[0])), gcell(r, 'c-frac', h[1] ? cl(key + 'f', h[1]) : '')];
  }

  // chain: the whole computation of each loss (iteration 1), or just its value (later)
  function makeGrid(m, chain) {
    var sig = [chain, str(m.e), str(m.wS), str(m.wpS), str(m.lp), str(m.l), str(m.delta)].join('|');
    if (el.grid.__sig === sig) return;
    el.grid.__sig = sig;
    while (el.grid.firstChild) el.grid.removeChild(el.grid.firstChild);
    el.rows = {};
    var C = el.cell;
    C.e = gcell(grow('eps', '\\varepsilon'), 'c-span', str(m.e));
    C.ww = gcell(grow('ww', 'w + \\varepsilon'), 'c-span',
      cl('w', str(m.wS)) + ' + ' + cl('e', str(m.e)) + ' = ' + cl('wp', str(m.wpS)));
    // the grid places its cells in the order they are made: each row whole before the next
    function lossRow(key, labelTex, wv, pv, v) {
      var r = grow(key, labelTex), a = null, b = null, val;
      if (chain) {
        a = gcell(r, 'c-a', '(3 - 17 \\times ' + cl('w', wrap(wv)) + ')^2');
        gcell(r, 'c-eq', '=');
        b = gcell(r, 'c-a', '(3 - ' + cl('p', wrap(pv)) + ')^2');
        gcell(r, 'c-eq', '=');
        val = gvalue(r, v, 'v');
      } else {
        val = [gcell(r, 'c-span', cl('v', str(v)))];
      }
      return [a, b, val];
    }
    var q3 = lossRow('lplus', '\\ell(w + \\varepsilon)', m.wp, m.p, m.lp);
    C.lpA = q3[0]; C.lpB = q3[1]; C.lp = q3[2];
    var q4 = lossRow('compare', '\\ell(w)', m.w, m.p0, m.l);
    C.lA = q4[0]; C.lB = q4[1]; C.l = q4[2];
    var r5 = grow('delta', '\\Delta_\\varepsilon');
    var sp = gcell(r5, 'c-span bl-flex');
    C.def = K.div('bl-p', sp, 'span');
    tex(C.def, '\\ell(w + \\varepsilon) - \\ell(w) =');
    C.nums = K.div('bl-p', sp, 'span');
    tex(C.nums, cl('a', str(m.lp)) + ' - ' + cl('b', str(m.l)));
    C.res = K.div('bl-p', sp, 'span');
    tex(C.res, '= ' + cl('d', str(m.delta)));
  }

  // ===== the table of the limit (in place of the arithmetic)

  function makeTable(ms, lS) {
    var sig = str(lS) + '|' + ms.map(function (m) { return [str(m.e), str(m.lp), str(m.delta), str(m.slope)].join(','); }).join('|');
    var T = el.table;
    if (T.__sig === sig) return;
    T.__sig = sig;
    while (T.firstChild) T.removeChild(T.firstChild);
    el.tab = { rows: [], cells: [] };
    function c(cls, src) { var d = K.div('bl-c ' + cls + ' vis', T); if (src !== undefined) tex(d, src); return d; }
    el.tab.top = c('t-top', '\\ell(w) = ' + cl('l', str(lS)));
    el.tab.head = ['\\varepsilon', '\\ell(w + \\varepsilon)', '\\Delta_\\varepsilon', '\\Delta_\\varepsilon / \\varepsilon']
      .map(function (h, i) { return c('t-head' + (i ? '' : ' t-head0'), h); });
    ms.forEach(function (m) {
      var row = [], cells = {};
      [['e', m.e], ['lp', m.lp], ['d', m.delta], ['s', m.slope]].forEach(function (q, j) {
        var h = halves(q[1]);
        var a = c('t-int' + (j ? ' t-gap' : ''), h[0]), b = c('t-frac', h[1]);
        row.push(a, b);
        cells[q[0]] = [a, b];
      });
      el.tab.rows.push(row);
      el.tab.cells.push(cells);
    });
  }

  // ===== build

  function build(layer) {
    buildLens(layer);
    buildView(layer);
    el.grid = K.div('bl-grid vis', layer.mid);
    K.pos(el.grid, BAND.x, BAND.y, 'tl');
    el.rows = {};
    el.table = K.div('bl-table vis', layer.mid);
    K.pos(el.table, BAND.x + 6, BAND.y - 2, 'tl');
    el.slope = K.div('bl-formula vis', layer.mid);
    el.final = K.div('bl-formula vis', layer.mid);
    el.arrow = K.arrow(layer.back, [[V.x - 4, LOW.y], [V.x - 90, LOW.y]], 'bl-big', { size: 30 });
  }

  // union of the boxes of a list of elements, in stage pixels
  function rectOf(list) {
    var rs = list.filter(Boolean).map(function (e) { return K.rect(e); });
    var x0 = Math.min.apply(null, rs.map(function (r) { return r.x; }));
    var y0 = Math.min.apply(null, rs.map(function (r) { return r.y; }));
    var x1 = Math.max.apply(null, rs.map(function (r) { return r.x + r.w; }));
    var y1 = Math.max.apply(null, rs.map(function (r) { return r.y + r.h; }));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  // the font of a grid shrinks until its widest row fits maxW and the whole block fits maxH
  function fitBlock(block, maxW, maxH) {
    block.style.fontSize = '';
    var right = 0, left = K.rect(block).x;
    Array.prototype.forEach.call(block.querySelectorAll('.katex'), function (k) {
      var r = K.rect(k);
      if (r.w > 0) right = Math.max(right, r.x + r.w);
    });
    var s = Math.min(1, maxW / Math.max(1, right - left), maxH ? maxH / Math.max(1, block.offsetHeight) : 1);
    if (s < 1) block.style.fontSize = (parseFloat(getComputedStyle(block).fontSize) * s * 0.98).toFixed(2) + 'px';
  }

  // ===== the clicks, per speed

  var STEPS1 = ['hopper', 'onplot', 'lens', 'eps', 'ww', 'lplus', 'compare', 'delta', 'define', 'slope', 'limit', 'deriv'];
  var QUICK1 = ['hopper', 'onplot', 'tangent', 'direct'];
  var ORDER1 = ['hopper', 'onplot', 'lens', 'tangent', 'eps', 'ww', 'lplus', 'compare', 'delta', 'define',
                'slope', 'limit', 'deriv', 'direct'];
  function steps(iter, mode) {
    if (mode === 3) return [];
    if (iter === 1) return (mode === 2 ? QUICK1 : STEPS1).slice();
    return mode === 2 ? ['direct'] : ['measure', 'deriv'];
  }
  function order(iter) { return iter === 1 ? ORDER1.slice() : ['measure', 'deriv', 'direct']; }

  // how far the blue story has got, as the place in ORDER1 of the last blue click shown
  var LV = {}, LATER = { measure: 'slope', deriv: 'deriv', direct: 'direct' };
  ORDER1.forEach(function (s, i) { LV[s] = i + 1; });
  function where(st) {
    var mode = st.mode || 1;
    var o = { n: 0, quick: mode === 2, purple: st.partReached('purple'), grad: st.reached('purple', 'grad') };
    steps(st.iter, mode).forEach(function (s) {
      if (st.reached('blue', s)) o.n = Math.max(o.n, LV[st.iter === 1 ? s : LATER[s]]);
    });
    return o;
  }

  // what the view shows at level n once the moves of its click are over
  function restView(sc, n, quick) {
    var last = sc.es[DRAWN - 1];
    if (quick) return vs(sc, { ang: n >= LV.tangent ? angTan(sc) : 0 });
    if (n <= LV.eps) return vs(sc, {});
    if (n === LV.ww) return vs(sc, { at: 'H', hop: 1 });
    if (n < LV.slope) return vs(sc, { at: 'E', hop: 1, rise: 1 });
    if (n === LV.slope) return vs(sc, { at: 'E', hop: 1, rise: 1, ang: angSec(sc, sc.es[0]) });
    // the limit: it watches from just behind its point, on the curve; the derivative: on the
    // tangent, still behind its point, so the small triangles stay in view
    var lim = { j: DRAWN - 1, hop: 1, rise: 1, secE: last, brE: last };
    if (n === LV.limit) { lim.at = 'B'; lim.ang = angBack(sc); } else { lim.at = 'T'; lim.ang = angTan(sc); }
    return vs(sc, lim);
  }

  // the numbers of one state: the measurement of the arithmetic, the rows of the table, the line
  // of speed 2
  function numbers(st) {
    var w = st.w, ed = fromNum(st.eps), lim = limitEps(ed);
    var places = exactFor(w) ? Infinity : 2 * lim[lim.length - 1].s;
    var ms = lim.map(function (e) { return measure(w, e, places); });
    return {
      w: w, ed: ed, band: measure(w, ed, bandPlaces(w, ed)), table: ms,
      chain: st.iter === 1 && exactFor(w), dir: direct(w)
    };
  }

  function showAll(list, on) { list.forEach(function (e) { K.show(e, on); }); }

  // ===== render

  function render(st) {
    var o = where(st), n = o.n, quick = o.quick, N = numbers(st), w = N.w, L = el.lab;
    var sc = scaleOf(w, st.eps, N.table.slice(0, DRAWN).map(function (m) { return num(m.e); }));
    el.o = o; el.N = N; el.sc = sc;
    // from the purple part on, only the last line stays (until purple's grad)
    var on = !o.purple, one = on && !quick, two = on && quick;
    var lensOn = on && n >= (quick ? LV.tangent : LV.lens);

    // the glass and the view
    K.show(el.lens, lensOn);
    K.show(el.cone, lensOn);
    if (lensOn) drawLens(w);
    K.show(el.view, lensOn);
    el.big.show(lensOn);
    showAll([el.vcurve, el.vdotS, L.nW, L.nL], lensOn);
    var t0 = el.tri[0];
    showAll([el.vbr, L.lE], one && n >= LV.eps);
    showAll([t0.hop, el.vtS, el.vtE, L.tW, L.tWp, el.vgS, el.vgE], one && n >= LV.ww);
    showAll([t0.rise, t0.dot, el.vtEL, L.tLp, el.vgEL], one && n >= LV.lplus);
    showAll([el.vtSL, L.tL, el.vgSL], one && n >= LV.compare);
    K.show(L.lD, one && n >= LV.delta && n < LV.limit);
    K.show(el.vsec, one && n >= LV.slope);
    el.tri.slice(1).forEach(function (t) { showAll([t.hop, t.rise, t.dot], one && n >= LV.limit); });
    K.show(el.vtan, (one && n >= LV.deriv) || (two && n >= LV.tangent));
    showAll([el.trun, el.trise, L.run, L.rise], two && n >= LV.tangent);
    var mV = N.band;
    tex(L.tW, str(mV.wS));
    tex(L.tWp, str(mV.wpS));
    tex(L.tL, str(mV.l));
    tex(L.tLp, str(mV.lp));
    fitW(L.tL, VA.l - V.x - 16);
    fitW(L.tLp, VA.l - V.x - 16);
    tex(L.run, str(N.ed));
    tex(L.rise, M.fmt(M.dloss(w) * num(N.ed), 6));
    if (lensOn) drawView(sc, restView(sc, n, quick));

    // the arithmetic
    makeGrid(N.band, N.chain);
    K.show(el.grid, one && n >= LV.eps && n < LV.limit);
    [['eps', LV.eps], ['ww', LV.ww], ['lplus', LV.lplus], ['compare', LV.compare], ['delta', LV.delta]]
      .forEach(function (q) { showAll(el.rows[q[0]], n >= q[1]); });
    el.cell.def.style.display = n >= LV.define ? '' : 'none';
    if (one && n >= LV.eps && n < LV.limit) fitBlock(el.grid, BAND.w);

    // the slope
    K.show(el.slope, one && n === LV.slope);
    tex(el.slope, '\\dfrac{\\Delta_\\varepsilon}{\\varepsilon} = \\dfrac{' + cl('num', str(N.band.delta)) + '}{' +
      cl('den', str(N.band.e)) + '} = ' + cl('res', str(N.band.slope)));
    K.pos(el.slope, LOW.x, LOW.y, 'cl');

    // the table of the limit
    makeTable(N.table, N.table[0].l);
    K.show(el.table, one && n >= LV.limit);
    showAll([el.tab.top].concat(el.tab.head), true);
    el.tab.rows.forEach(function (r) { showAll(r, true); });
    if (one && n >= LV.limit) fitBlock(el.table, BAND.w - 6, BAND.h);

    // the last line: the limit (speed 1) or the derivative from the boxes (speed 2); it outlives
    // the rest of the blue part until purple's grad flies its value into the box dl/dw
    var finalOn = (quick ? n >= LV.direct : n >= LV.deriv) && !o.grad;
    if (quick) {
      // two lines, the second ending on the value, right above where purple's box opens
      var d = N.dir;
      tex(el.final, '\\begin{aligned}' + cl('d0', '\\dfrac{\\partial \\ell}{\\partial w}') +
        ' &' + cl('d1', '{}= -2\\,x\\,(y - \\hat y)') + ' \\\\ &' +
        cl('d2', '{}= -2 \\times ' + cl('x', '17') + ' \\times (' + cl('y', '3') + ' - ' + cl('yh', wrap(d.yh)) + ')') +
        cl('d3', '{}= ' + cl('val', M.fmt(M.dloss(w)))) + '\\end{aligned}');
    } else {
      tex(el.final, cl('f1', '\\lim\\limits_{\\varepsilon \\to 0}') + '\\,' +
        cl('f2', '\\dfrac{\\Delta_\\varepsilon}{\\varepsilon}') + cl('f3', '\\;=\\;\\dfrac{\\partial \\ell}{\\partial w}') +
        cl('f4', '\\;=\\;' + cl('val', M.fmt(M.dloss(w)))));
    }
    if (quick) { K.pos(el.final, LOW2.x, LOW2.y, 'bl'); fitW(el.final, V.x - 70 - LOW2.x); }
    else K.pos(el.final, LOW.x, LOW.y, 'cl');
    K.show(el.final, finalOn);
    // the value piece and its TeX, for purple's grad: the box dl/dw shows the same number
    el.derivVal = part(el.final, 'val');
    el.derivTex = M.fmt(M.dloss(w));
    // the big arrow from the view to the value (its line, at speed 2)
    var arrowOn = on && (quick ? n >= LV.direct : n >= LV.deriv);
    K.show(el.arrow.g, arrowOn);
    if (arrowOn) {
      var fr = K.rect(el.final), vr = quick ? K.rect(part(el.final, 'd3')) : fr;
      K.setArrow(el.arrow, [[V.x - 8, vr.cy], [fr.x + fr.w + 18, vr.cy]]);
    }

    // the plot's formula would sit under the lines from the glass to the view
    var red = GF.parts.red && GF.parts.red.el;
    if (red && red.formula && lensOn) K.show(red.formula, false);
  }

  // ===== animation helpers (a forward click only; render has drawn the end already)

  function hide(e) { if (e) K.temp(e, 'opacity', '0'); }
  function showAt(e, ms, flash) {
    if (!e) return;
    hide(e);
    K.wait(ms, function () { e.style.opacity = ''; if (flash) K.flash(e); });
  }
  function showList(list, ms, flash) { list.forEach(function (e) { showAt(e, ms, flash); }); }
  // a copy of src flies from the element(s) from to the element(s) to, which appear as it lands
  function fly(src, from, to, delay, done) {
    var tos = [].concat(to).filter(Boolean);
    tos.forEach(hide);
    K.wait(delay, function () {
      K.flyTex(src, rectOf([].concat(from)), rectOf(tos), 750, 'k-blue', function () {
        tos.forEach(function (e) { e.style.opacity = ''; });
        if (done) done();
      }, 21);
    });
  }
  // e grows from nothing round (cx, cy)
  function growFrom(e, cx, cy, ms, delay) {
    K.temp(e, 'transformOrigin', cx + 'px ' + cy + 'px');
    K.temp(e, 'transform', 'scale(0.01)');
    K.wait(delay, function () {
      K.tween(ms, function (t) { e.style.transform = 'scale(' + Math.max(0.01, t).toFixed(3) + ')'; }, K.ease.back,
        function () { e.style.transform = ''; });
    });
  }
  function rowCells(key) { return el.rows[key] || []; }
  function bandRow(key, delay) { showList(rowCells(key).slice(0, 2), delay); }
  function redPoint() { var red = GF.parts.red && GF.parts.red.el; return red && red.point; }

  // ===== the clicks of iteration 1

  // the grasshopper drops onto the box of w, where the engine put it
  function aHopper() {
    var h = GF.hopper.main, P = { x: h.pose.x, y: h.pose.y, s: h.pose.s };
    h.place(P.x, P.y - 120, 0, P.s, 1);
    K.tween(650, function (t) { h.place(P.x, P.y - 120 * (1 - t), 0, P.s, 1); }, K.ease.out);
  }

  // it jumps from where it was onto its point of the plot, where the engine put it
  function aOnplot(st, delay) {
    var h = GF.hopper.main, to = { x: h.pose.x, y: h.pose.y, a: h.pose.a, s: h.pose.s, f: h.pose.f };
    if (st.hopFrom) h.setPose(st.hopFrom);
    K.wait(delay || 0, function () { GF.hopper.jump(h, to, 1100, 190); });
    if (redPoint()) K.pulse(redPoint(), (delay || 0) + 1100);
  }

  function aLens(st, delay, fast) {
    var c = el.lens.__c, k = fast ? 0.6 : 1;
    growFrom(el.lens, c.x, c.y, 450 * k, delay);
    K.drawOn(el.coneA, 500 * k, delay + 350 * k);
    K.drawOn(el.coneB, 500 * k, delay + 350 * k);
    showAt(el.view, delay + 700 * k);
    showList([el.lab.nW, el.lab.nL], delay + 900 * k);
    K.drawOn(el.vcurve, 700 * k, delay + 900 * k);
    showList([el.big.g, el.vdotS], delay + 1350 * k);
  }

  function aEps(delay) {
    bandRow('eps', delay);
    showAt(el.cell.e, delay + 250, true);
    K.drawOn(el.vbr, 500, delay + 500);
    showAt(el.lab.lE, delay + 900);
  }

  function aWW(st, N, delay) {
    var C = el.cell, bl = GF.parts.black.el, ww = C.ww, sc = el.sc, t0 = el.tri[0];
    bandRow('ww', delay);
    hide(ww);
    var pw = part(ww, 'w'), pe = part(ww, 'e'), pwp = part(ww, 'wp');
    hide(pwp);
    fly(str(N.band.wS), bl.w.val, pw, delay + 100);
    fly(str(N.band.e), C.e, pe, delay + 300, function () {
      ww.style.opacity = '';
      K.wait(300, function () { pwp.style.opacity = ''; K.flash(pwp); });
    });
    // then the hop, sideways, to w + eps
    var t = delay + 1500;
    drawView(sc, vs(sc, {}));
    showList([t0.hop, el.vtS, el.lab.tW, el.vgS], t);
    tweenView(sc, vs(sc, { at: 'H', hop: 0 }), vs(sc, { at: 'H', hop: 1 }), 750, t);
    showList([el.vtE, el.vgE], t + 750);
    showAt(el.lab.tWp, t + 750, true);
  }

  function aLplus(st, N, delay, fast) {
    var C = el.cell, r = rowCells('lplus'), k = fast ? 0.5 : 1, sc = el.sc, t0 = el.tri[0];
    bandRow('lplus', delay);
    var t = delay;
    if (C.lpA) {
      hide(C.lpA);
      fly(str(N.band.wpS), part(C.ww, 'wp'), part(C.lpA, 'w'), delay + 100, function () { C.lpA.style.opacity = ''; });
      showList([r[3], C.lpB], delay + 1200 * k);
      K.flash(part(C.lpB, 'p'), delay + 1200 * k);
      t = delay + 1800 * k;
      showList([r[5]], t);
    }
    showList(C.lp, t, true);
    // then the rise or drop to the curve, which closes the triangle
    var t1 = t + 600 * k;
    drawView(sc, vs(sc, { at: 'H', hop: 1 }));
    showAt(t0.rise, t1);
    tweenView(sc, vs(sc, { at: 'E', hop: 1, rise: 0 }), vs(sc, { at: 'E', hop: 1, rise: 1 }), 700 * k, t1);
    showList([t0.dot, el.vtEL, el.vgEL], t1 + 700 * k);
    showAt(el.lab.tLp, t1 + 700 * k, true);
  }

  function aCompare(st, N, delay) {
    var C = el.cell, bl = GF.parts.black.el, r = rowCells('compare');
    bandRow('compare', delay);
    var t = delay;
    if (C.lA) {
      fly(str(N.band.w), bl.w.val, part(C.lA, 'w'), delay + 100);
      showAt(C.lA, delay + 850);
      fly('(3 - ' + wrap(N.band.p0) + ')^2', bl.loss.calc, C.lB, delay + 400);
      showList([r[3], r[5]], delay + 1150);
      t = delay + 600;
    }
    fly(str(N.band.l), bl.loss.val, C.l, t, function () {
      C.l.concat(C.lp).forEach(function (e) { K.flash(e); });
    });
    showList([el.vtSL, el.vgSL], t + 900);
    showAt(el.lab.tL, t + 900, true);
    K.flash(el.lab.tLp, t + 900);
  }

  function aDelta(st, N, delay) {
    var C = el.cell;
    bandRow('delta', delay);
    hide(C.res);
    fly(str(N.band.lp), C.lp, part(C.nums, 'a'), delay + 150);
    fly(str(N.band.l), C.l, part(C.nums, 'b'), delay + 350);
    K.wait(delay + 1300, function () { C.res.style.opacity = ''; K.flash(part(C.res, 'd')); });
    showAt(el.lab.lD, delay + 1300);
    K.pulse(el.tri[0].rise, delay + 1300);
  }

  // the definition slides in between "Delta =" and the numbers
  function aDefine() {
    var C = el.cell, moving = [C.nums, C.res];
    var now = moving.map(function (e) { return K.rect(e).x; });
    C.def.style.display = 'none';
    var before = moving.map(function (e) { return K.rect(e).x; });
    C.def.style.display = '';
    moving.forEach(function (e, i) { K.temp(e, 'transform', 'translateX(' + (before[i] - now[i]).toFixed(1) + 'px)'); });
    hide(C.def);
    K.wait(150, function () {
      K.tween(700, function (t) {
        moving.forEach(function (e, i) { e.style.transform = 'translateX(' + ((before[i] - now[i]) * (1 - t)).toFixed(1) + 'px)'; });
      }, K.ease.inOut, function () {
        moving.forEach(function (e) { e.style.transform = ''; });
        C.def.style.opacity = '';
        K.flash(C.def);
      });
    });
  }

  function aSlope(st, N, delay, fast) {
    var C = el.cell, s = el.slope, k = fast ? 0.6 : 1, sc = el.sc;
    showAt(s, delay);
    var res = part(s, 'res');
    hide(res);
    fly(str(N.band.delta), part(C.res, 'd'), part(s, 'num'), delay + 200);
    fly(str(N.band.e), C.e, part(s, 'den'), delay + 400);
    K.wait(delay + 1400 * k, function () { res.style.opacity = ''; K.flash(res); });
    // the third side through both points, and the grasshopper tilts onto it
    var t0 = delay + 1500 * k, a = vs(sc, { at: 'E', hop: 1, rise: 1 });
    drawView(sc, a);
    K.drawOn(el.vsec, 700, t0);
    tweenView(sc, a, restView(sc, LV.slope), 600, t0 + 500);
  }

  // The limit, at the scale of the hop of eps: the row of eps moves into the table; the
  // grasshopper hops back to its point; then for eps / 2, eps / 5 and eps / 10 it hops and rises
  // (or drops) again, each triangle inside the one before, which turns pale; the bracket shrinks
  // with the hop and the secant turns onto the new point; each row appears as its hop lands. Then
  // the row of eps / 100. Returns when it ends.
  function aLimit(st, N, delay, fast) {
    var C = el.cell, T = el.tab, k = fast ? 0.55 : 1, sc = el.sc, es = sc.es;
    showList([T.top].concat(T.head), delay + 150 * k);
    T.rows.forEach(function (r) { r.forEach(hide); });
    if (fast) showList(T.rows[0], delay + 250 * k);
    else {
      var c0 = T.cells[0], m0 = N.table[0];
      fly(str(m0.e), C.e, c0.e, delay + 200);
      fly(str(m0.lp), C.lp, c0.lp, delay + 350);
      fly(str(m0.delta), part(C.res, 'd'), c0.d, delay + 500);
      fly(str(m0.slope), part(el.slope, 'res'), c0.s, delay + 650);
    }
    el.tri.slice(1).forEach(function (t) { [t.hop, t.rise, t.dot].forEach(hide); });

    // from where the slope left it, at the end of the hop of eps on its secant, back to its point
    var v = vs(sc, { at: 'E', hop: 1, rise: 1, ang: angSec(sc, es[0]) });
    drawView(sc, v);
    var t = delay + 300 * k;
    K.wait(t, function () { GF.hopper.jump(el.big, poseOf(sc, vs(sc, {})), 550 * k, 40); });
    t += 750 * k;

    var HOPMS = [0, 560, 440, 380], RISEMS = [0, 440, 360, 320];
    for (var j = 1; j < DRAWN; j++) {
      (function (j, t0) {
        var a = HOPMS[j] * k, b = RISEMS[j] * k, tri = el.tri[j], prev = es[j - 1];
        // the hop: the leg grows under the grasshopper, the bracket shrinks to it
        K.wait(t0, function () { tri.hop.style.opacity = ''; });
        tweenView(sc, vs(sc, { j: j, at: 'H', hop: 0, secE: prev, brE: prev }),
          vs(sc, { j: j, at: 'H', hop: 1, secE: prev, brE: es[j] }), a, t0);
        // the rise (or drop) to the curve
        K.wait(t0 + a, function () { tri.rise.style.opacity = ''; });
        tweenView(sc, vs(sc, { j: j, at: 'E', hop: 1, rise: 0, secE: prev, brE: es[j] }),
          vs(sc, { j: j, at: 'E', hop: 1, rise: 1, secE: prev, brE: es[j] }), b, t0 + a);
        // its point, its row; the secant turns onto it
        K.wait(t0 + a + b, function () {
          tri.dot.style.opacity = '';
          T.rows[j].forEach(function (e) { e.style.opacity = ''; });
          T.cells[j].s.forEach(function (e) { K.flash(e); });
        });
        tweenView(sc, vs(sc, { j: j, at: null, hop: 1, rise: 1, secE: prev, brE: es[j] }),
          vs(sc, { j: j, at: null, hop: 1, rise: 1, secE: es[j], brE: es[j] }), 320 * k, t0 + a + b);
        // and back to its point; after the last hop, to just behind it, to watch
        var to = j < DRAWN - 1 ? vs(sc, { j: j }) : restView(sc, LV.limit);
        K.wait(t0 + a + b + 250 * k, function () { GF.hopper.jump(el.big, poseOf(sc, to), 420 * k, 22); });
      })(j, t);
      t += (HOPMS[j] + RISEMS[j] + 250 + 520) * k;
    }
    // eps / 100: numbers only
    K.wait(t, function () {
      T.rows[DRAWN].forEach(function (e) { e.style.opacity = ''; });
      T.cells[DRAWN].s.forEach(function (e) { K.flash(e); });
    });
    return t + 500 * k;
  }

  // the limit is the derivative: the formula piece by piece, the tangent, the arrow from the view
  function aDeriv(st, N, delay) {
    var F = el.final, p1 = part(F, 'f1'), p3 = part(F, 'f3'), p4 = part(F, 'f4'), sc = el.sc;
    showAt(F, delay);
    hide(p1); hide(p3); hide(p4);
    K.wait(delay + 150, function () { p1.style.opacity = ''; });
    K.wait(delay + 800, function () { p3.style.opacity = ''; });
    K.wait(delay + 1400, function () { p4.style.opacity = ''; K.flash(part(F, 'val')); });
    K.drawArrow(el.arrow, 600, delay + 700);
    var a = restView(sc, LV.limit), b = restView(sc, LV.deriv);
    K.wait(delay, function () { drawView(sc, a); });
    K.drawOn(el.vtan, 900, delay);
    K.wait(delay + 900, function () { GF.hopper.jump(el.big, poseOf(sc, b), 450, 12); });
  }

  // ===== iteration 2 on: the measurement in one click (the grasshopper is on the plot already)

  function aMeasure(st, N) {
    var L = el.lab, sc = el.sc, t0 = el.tri[0];
    drawView(sc, vs(sc, {}));
    if (redPoint()) K.pulse(redPoint(), 0);
    aLens(st, 150, true);
    var t = 1100;
    ['eps', 'ww', 'lplus', 'compare', 'delta'].forEach(function (key, i) { showList(rowCells(key), t + i * 380); });
    showList([el.vbr, L.lE], t);
    showList([t0.hop, el.vtS, L.tW, el.vgS], t + 380);
    tweenView(sc, vs(sc, { at: 'H', hop: 0 }), vs(sc, { at: 'H', hop: 1 }), 500, t + 380);
    showList([el.vtE, el.vgE, L.tWp], t + 880);
    showAt(t0.rise, t + 1140);
    tweenView(sc, vs(sc, { at: 'E', hop: 1, rise: 0 }), vs(sc, { at: 'E', hop: 1, rise: 1 }), 500, t + 1140);
    showList([t0.dot, el.vtEL, el.vgEL, L.tLp, el.vtSL, el.vgSL, L.tL], t + 1640);
    showAt(L.lD, t + 1900);
    showAt(el.slope, t + 2300);
    K.flash(part(el.slope, 'res'), t + 2500);
    K.drawOn(el.vsec, 600, t + 2300);
    tweenView(sc, vs(sc, { at: 'E', hop: 1, rise: 1 }), restView(sc, LV.slope), 500, t + 2700);
  }

  // ===== speed 2: the tangent and the derivative straight from the boxes

  // the glass and the view, the tangent through the point, the grasshopper onto it, the run and
  // the rise of the triangle under it. Returns when it ends.
  function aTangent(st, delay, fast) {
    var sc = el.sc, L = el.lab, k = fast ? 0.7 : 1;
    if (st.iter > 1 && redPoint()) K.pulse(redPoint(), delay);
    aLens(st, delay, true);
    var a = vs(sc, {}), b = restView(sc, LV.tangent, true);
    drawView(sc, a);
    var t = delay + 950 * k;
    K.drawOn(el.vtan, 700 * k, t);
    tweenView(sc, a, b, 450 * k, t + 450 * k);
    K.drawOn(el.trun, 420 * k, t + 950 * k);
    K.drawOn(el.trise, 420 * k, t + 1370 * k);
    showAt(L.run, t + 1300 * k);
    showAt(L.rise, t + 1750 * k);
    return t + 2000 * k;
  }

  // dl/dw = -2 x (y - yhat), then 17, 3 and yhat fly in from their boxes, then the value and the
  // arrow from the view
  function aDirect(st, N, delay) {
    var F = el.final, bl = GF.parts.black.el, d2 = part(F, 'd2'), d3 = part(F, 'd3');
    showAt(F, delay);
    hide(d2); hide(d3);
    K.wait(delay + 600, function () { d2.style.opacity = ''; });
    fly('17', bl.x.val, part(F, 'x'), delay + 600);
    fly('3', bl.y.val, part(F, 'y'), delay + 760);
    fly(wrap(N.dir.yh), bl.yhat.val, part(F, 'yh'), delay + 920);
    K.wait(delay + 2000, function () { d3.style.opacity = ''; K.flash(part(F, 'val')); });
    K.drawArrow(el.arrow, 500, delay + 1900);
  }

  function animate(st) {
    var o = el.o, N = el.N;
    if (!o || !o.n || o.purple || !st.is('blue')) return;
    var c = st.name;
    if (o.quick) {
      if (c === 'hopper') aHopper();
      else if (c === 'onplot') aOnplot(st, 0);
      else if (c === 'tangent') aTangent(st, 0, false);
      else if (c === 'direct') aDirect(st, N, st.iter > 1 ? aTangent(st, 0, true) + 150 : 0);
      return;
    }
    if (st.iter > 1) {
      if (c === 'measure') aMeasure(st, N);
      else if (c === 'deriv') aDeriv(st, N, aLimit(st, N, 0, true) + 200);
      return;
    }
    if (c === 'hopper') aHopper();
    else if (c === 'onplot') aOnplot(st, 0);
    else if (c === 'lens') aLens(st, 0, false);
    else if (c === 'eps') aEps(0);
    else if (c === 'ww') aWW(st, N, 0);
    else if (c === 'lplus') aLplus(st, N, 0, false);
    else if (c === 'compare') aCompare(st, N, 0);
    else if (c === 'delta') aDelta(st, N, 0);
    else if (c === 'define') aDefine();
    else if (c === 'slope') aSlope(st, N, 0, false);
    else if (c === 'limit') aLimit(st, N, 0, false);
    else if (c === 'deriv') aDeriv(st, N, 0);
  }

  GF.parts.blue = {
    steps: steps, order: order,
    build: build, render: render, animate: animate,
    el: el,
    test: {
      dec: dec, fromNum: fromNum, str: str, measure: measure, limitEps: limitEps, direct: direct,
      add: add, sub: sub, mul: mul, divide: divide
    }
  };
})();
