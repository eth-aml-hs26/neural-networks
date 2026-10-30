/* Will it last? The pictures. window.Views.
 *
 * Both draw a phone held upright, in a viewBox about 100 units high, and take
 * every colour from css/round.css and css/verdict.css.
 *
 * StackView: round 1 and the run page. The phone's screen shows what was
 *   seen: day 17, 3 GB used. Inside it the 3 GB are a gold outlined column,
 *   and the guess is a stack of 17 bricks, one per day, each w high, built on
 *   the same floor at the same scale. The gap (guess too small) is shaded blue
 *   with dots, the overhang (guess too large) vermillion with hatching, and the
 *   shaded height IS the loss |3 - w * 17|. A thin arrow runs from the top of
 *   the stack to the top of the column: the correction still to make. When the
 *   gap is too thin to see, a lens beside the column magnifies its corner.
 *
 * MonthView: round 2. The same phone with the plan's 5 GB as the gold column
 *   and up to 30 bricks. Days 1 to 17 stand from the start; playing the month
 *   adds the others one by one. What goes over the plan is hatched vermillion,
 *   and once the 5 GB are gone the phone says so and a snail sits on the pile.
 */
(function () {
  'use strict';

  var UI = window.UI;
  var WL = window.WillItLast;

  var MAX_BRICKS = 60;
  var GAP = 0.32;          // the gap between two bricks, in viewBox units
  var MIN_BRICK = 1.4;     // below this height the bricks merge into a column
  // The floor of the pile. It leaves room under it, inside the screen, for
  // its label (x = 17, 17 days, 30 days); at 85 the label's foot ran onto
  // the bezel, which the white screen of the daylight studio shows.
  var FLOOR = 82.6;

  function extend(base, more) {
    var out = {};
    var k;
    for (k in base) { if (Object.prototype.hasOwnProperty.call(base, k)) { out[k] = base[k]; } }
    if (more) { for (k in more) { if (Object.prototype.hasOwnProperty.call(more, k)) { out[k] = more[k]; } } }
    return out;
  }

  function patterns(svg, id) {
    var defs = UI.svg('defs', null, svg);
    var dots = UI.svg('pattern', { id: id + '-dots', width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse' }, defs);
    UI.svg('circle', { cx: 1.2, cy: 1.2, r: 0.42, 'class': 'pat-dot' }, dots);
    var hatch = UI.svg('pattern', {
      id: id + '-hatch', width: 2.4, height: 2.4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
    }, defs);
    UI.svg('line', { x1: 0, y1: 0, x2: 0, y2: 2.4, 'class': 'pat-line' }, hatch);
    return defs;
  }

  // Writes a number into an SVG <text>. A power of ten written by
  // WillItLast.fmt as "2.4 x 10^19" gets a real times sign and a raised exponent.
  function setNumText(el, text) {
    while (el.firstChild) { el.removeChild(el.firstChild); }
    var i = text.indexOf('^');
    if (i < 0) { el.textContent = text; return; }
    el.appendChild(document.createTextNode(text.slice(0, i).replace(' x ', ' ' + '\u00D7' + ' ')));
    var sup = UI.svg('tspan', { 'baseline-shift': 'super', 'font-size': '70%' }, el);
    sup.textContent = text.slice(i + 1);
  }

  function arrowPath(x1, y1, x2, y2, head) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) { return ''; }
    var ux = dx / len;
    var uy = dy / len;
    var hx = x2 - ux * head;
    var hy = y2 - uy * head;
    var px = -uy * head * 0.6;
    var py = ux * head * 0.6;
    return 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 +
      ' M' + (hx + px) + ' ' + (hy + py) + ' L' + x2 + ' ' + y2 + ' L' + (hx - px) + ' ' + (hy - py);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // ===== the phone =====

  // Draws the body, the screen, the notch and the status bar (the day on the
  // left, signal bars and a battery on the right), then the screen's title
  // and its big counter. Returns the pieces that change. A bare phone
  // (geo.bare, round 1) leaves the title and the counter empty and has no
  // header line, so its pile may rise to the status bar.
  function Phone(svg, geo, parent) {
    var px = geo.px;
    var py = geo.py;
    var pw = geo.pw;
    var ph = geo.ph;
    var inset = 2.2;
    var g = UI.svg('g', { 'class': 'phone' }, parent || svg);
    this.g = g;
    UI.svg('rect', { 'class': 'ph-body', x: px, y: py, width: pw, height: ph, rx: 7, ry: 7 }, g);
    this.screen = UI.svg('rect', {
      'class': 'ph-screen', x: px + inset, y: py + inset, width: pw - 2 * inset, height: ph - 2 * inset, rx: 5, ry: 5
    }, g);
    UI.svg('rect', { 'class': 'ph-notch', x: px + pw / 2 - 5.5, y: py + inset + 1.2, width: 11, height: 2.5, rx: 1.25, ry: 1.25 }, g);
    var sy = py + inset + 2.55;
    this.day = UI.svg('text', { 'class': 'ph-day', x: px + inset + 3.4, y: sy }, g);
    // signal bars, then a battery, right aligned
    var bx = px + pw - inset - 13.2;
    this.signal = UI.svg('g', { 'class': 'ph-signal' }, g);
    for (var i = 0; i < 4; i++) {
      var hh = 0.9 + i * 0.62;
      UI.svg('rect', { x: bx + i * 1.25, y: sy + 0.95 - hh, width: 0.85, height: hh, rx: 0.2, ry: 0.2 }, this.signal);
    }
    this.cross = UI.svg('path', { 'class': 'ph-cross', d: 'M' + (bx - 0.4) + ' ' + (sy + 1.2) + ' L' + (bx + 5.2) + ' ' + (sy - 3.4) }, g);
    var batX = px + pw - inset - 6.6;
    UI.svg('rect', { 'class': 'ph-bat', x: batX, y: sy - 2.25, width: 4.2, height: 2.3, rx: 0.55, ry: 0.55 }, g);
    UI.svg('rect', { 'class': 'ph-bat-fill', x: batX + 0.55, y: sy - 1.7, width: 2.6, height: 1.2, rx: 0.25, ry: 0.25 }, g);
    UI.svg('rect', { 'class': 'ph-bat-tip', x: batX + 4.35, y: sy - 1.55, width: 0.5, height: 0.9, rx: 0.2, ry: 0.2 }, g);
    var mid = px + pw / 2;
    this.title = UI.svg('text', { 'class': 'ph-title', x: mid, y: py + 11.6 }, g);
    this.count = UI.svg('text', { 'class': 'ph-count', x: mid, y: py + 18.4 }, g);
    this.countBig = UI.svg('tspan', { 'class': 'ph-count-big' }, this.count);
    this.countSmall = UI.svg('tspan', { 'class': 'ph-count-small', dx: 0.8 }, this.count);
    // Below the header the screen holds the pile; what grows past the header
    // slides under it, as content scrolls under a phone's title bar.
    this.top = py + (geo.bare ? 7.4 : 21);
    this.bottom = py + ph - inset;
    this.left = px + inset;
    this.right = px + pw - inset;
    if (!geo.bare) {
      UI.svg('line', { 'class': 'ph-sep', x1: this.left + 2.5, x2: this.right - 2.5, y1: this.top, y2: this.top }, g);
    }
    this.setOut(false);
  }

  // A clip path for the screen under the header. Returns its url().
  Phone.prototype.clip = function (defs, id) {
    var cp = UI.svg('clipPath', { id: id }, defs);
    UI.svg('rect', { x: this.left, y: this.top, width: this.right - this.left, height: this.bottom - this.top }, cp);
    return 'url(#' + id + ')';
  };

  Phone.prototype.setDay = function (text) { this.day.textContent = text; };
  Phone.prototype.setTitle = function (text) { this.title.textContent = text; };
  Phone.prototype.setCount = function (big, small) {
    this.countBig.textContent = big;
    this.countSmall.textContent = small;
  };
  // Out of data: the title turns vermillion, the signal is crossed out.
  Phone.prototype.setOut = function (on) {
    this.g.setAttribute('class', 'phone' + (on ? ' out' : ''));
    this.cross.setAttribute('visibility', on ? 'visible' : 'hidden');
  };

  // A row of bricks from the floor B: n bricks of height h (negative h goes
  // down). The rects are made once and reused, so a tween only moves them.
  function Bricks(parent, max) {
    this.g = UI.svg('g', { 'class': 'bricks' }, parent);
    this.rects = [];
    for (var i = 0; i < max; i++) {
      this.rects.push(UI.svg('rect', { 'class': 'brick' + (i % 2 ? ' odd' : ''), x: 0, y: 0, width: 0, height: 0 }, this.g));
    }
    this.solid = UI.svg('rect', { 'class': 'brick solid', x: 0, y: 0, width: 0, height: 0 }, this.g);
  }

  // Lays out n bricks of height h on [x, x + w] from the floor B. Returns the
  // y of the far end of the pile. A brick that lies wholly outside the
  // viewBox is hidden and one that crosses its edge is cut there, so a pile
  // that blows up never stacks dozens of huge rects on top of one another.
  var FAR = [-20, 140];
  Bricks.prototype.layout = function (n, h, x, w, B) {
    var whole = Math.floor(n);
    var merged = whole !== n || whole > this.rects.length || Math.abs(h) < MIN_BRICK;
    var top = B - n * h;
    var i;
    for (i = 0; i < this.rects.length; i++) {
      var r = this.rects[i];
      var ya = Math.min(B - (i + 1) * h, B - i * h) + GAP / 2;
      var yb = ya + Math.abs(h) - GAP;
      if (merged || i >= whole || yb < FAR[0] || ya > FAR[1]) {
        r.setAttribute('width', 0);
        r.setAttribute('height', 0);
        continue;
      }
      ya = Math.max(ya, FAR[0]);
      yb = Math.min(yb, FAR[1]);
      r.setAttribute('x', x);
      r.setAttribute('width', w);
      r.setAttribute('y', ya);
      r.setAttribute('height', Math.max(0, yb - ya));
    }
    if (merged && n > 0 && h !== 0) {
      var a = clamp(Math.min(top, B), FAR[0], FAR[1]);
      var b = clamp(Math.max(top, B), FAR[0], FAR[1]);
      this.solid.setAttribute('x', x);
      this.solid.setAttribute('width', w);
      this.solid.setAttribute('y', a);
      this.solid.setAttribute('height', b - a);
    } else {
      this.solid.setAttribute('width', 0);
      this.solid.setAttribute('height', 0);
    }
    return top;
  };

  Bricks.prototype.setClass = function (extra) {
    this.g.setAttribute('class', 'bricks' + (extra ? ' ' + extra : ''));
  };

  // ===== StackView =====

  // opts: { id, used, days, reveal (the text under the phone before the round
  //         is won), sym, geo: { vw, vh, px, py, pw, ph, cx, cw, B, TH, lx, lr } }
  // px, py, pw, ph place the phone; cx, cw the column; B is the floor and TH
  // the height of the target column; lx, lr place the corner lens. sym
  // (round 1) writes the letters of the game, y = 3 on the column and x = 17
  // under it, on a bare phone with no title and no counter.
  function StackView(svg, opts) {
    this.svg = svg;
    this.opts = opts || {};
    this.id = this.opts.id || 'stack';
    var geo = extend({ vw: 100, vh: 100, px: 27, py: 1.5, pw: 46, ph: 89, cx: 39, cw: 22, B: FLOOR, TH: 45, lx: 87.5, lr: 10.5 }, this.opts.geo);
    this.geo = geo;
    this.cur = null;       // the brick height (viewBox units) currently drawn
    this.cancel = null;
    this.info = null;
    this.solved = false;
    svg.setAttribute('viewBox', '0 0 ' + geo.vw + ' ' + geo.vh);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.defs = patterns(svg, this.id);
    this.sym = !!this.opts.sym;
    this.phone = new Phone(svg, extend(geo, { bare: this.sym }));
    if (!this.sym) { this.phone.setTitle('MOBILE DATA'); }
    var pile = this.phone.clip(this.defs, this.id + '-pile');
    var cx = geo.cx;
    var cw = geo.cw;
    var B = geo.B;
    var yT = B - geo.TH;
    this.gFloor = UI.svg('rect', { 'class': 'sq-floor', x: cx, y: yT, width: cw, height: geo.TH }, svg);
    UI.svg('line', { 'class': 'col-ground', x1: cx - 2.4, x2: cx + cw + 2.4, y1: B, y2: B }, svg);
    var gPile = UI.svg('g', { 'clip-path': pile }, svg);
    this.gTrail = UI.svg('g', { 'class': 'sq-trail' }, gPile);
    this.bricks = new Bricks(gPile, MAX_BRICKS);
    this.gDiff = UI.svg('g', { 'class': 'sq-diff' }, gPile);
    this.gDiffFill = UI.svg('path', { 'class': 'fill', d: '' }, this.gDiff);
    this.gDiffPat = UI.svg('path', { 'class': 'pat', d: '' }, this.gDiff);
    this.gTarget = UI.svg('rect', { 'class': 'sq-target thick', x: cx, y: yT, width: cw, height: geo.TH }, svg);
    this.gArrow = UI.svg('path', { 'class': 'sq-arrow', d: '' }, gPile);
    this.gLoss = UI.svg('text', { 'class': 'sq-label loss', x: 0, y: 0 }, svg);
    this.gTLabel = UI.svg('text', { 'class': 'col-label gold', x: cx - 1.3, y: yT }, svg);
    this.gDays = UI.svg('text', { 'class': 'col-days', x: cx + cw / 2, y: B + 2.6 }, svg);
    this.gReveal = UI.svg('text', { 'class': 'sq-side', x: geo.px + geo.pw / 2, y: geo.py + geo.ph + 5 }, svg);
    this.buildLoupe();
    this.gBadge = null;
    this.setTarget(this.opts.used || WL.SEEN.used, this.opts.days || WL.SEEN.days);
    this.setReveal(this.opts.reveal || '', false);
    this.draw(null);
  }

  // The corner lens: when the gap is too thin to see, a round lens beside the
  // column shows its top right corner blown up by a power of ten.
  StackView.prototype.buildLoupe = function () {
    var geo = this.geo;
    var cid = this.id + '-lens';
    var clip = UI.svg('clipPath', { id: cid }, this.defs);
    this.gClip = UI.svg('circle', { cx: geo.lx, cy: 0, r: geo.lr }, clip);
    this.gLoupe = UI.svg('g', { 'class': 'loupe', visibility: 'hidden' }, this.svg);
    this.gLead = UI.svg('line', { 'class': 'loupe-lead', x1: 0, y1: 0, x2: 0, y2: 0 }, this.gLoupe);
    this.gLBg = UI.svg('circle', { 'class': 'loupe-bg', cx: geo.lx, cy: 0, r: geo.lr }, this.gLoupe);
    var inner = UI.svg('g', { 'clip-path': 'url(#' + cid + ')' }, this.gLoupe);
    this.gLDiff = UI.svg('g', { 'class': 'sq-diff' }, inner);
    this.gLDiffFill = UI.svg('path', { 'class': 'fill', d: '' }, this.gLDiff);
    this.gLDiffPat = UI.svg('path', { 'class': 'pat', d: '' }, this.gLDiff);
    this.gLGuess = UI.svg('path', { 'class': 'loupe-guess', d: '' }, inner);
    this.gLTarget = UI.svg('path', { 'class': 'loupe-target', d: '' }, inner);
    this.gLRing = UI.svg('circle', { 'class': 'loupe-ring', cx: geo.lx, cy: 0, r: geo.lr }, this.gLoupe);
    this.gLText = UI.svg('text', { 'class': 'loupe-x', x: geo.lx, y: 0 }, this.gLoupe);
  };

  StackView.prototype.drawLoupe = function (h, show) {
    var geo = this.geo;
    var yT = geo.B - geo.TH;
    var gap = h === null ? 0 : (geo.B - this.days * h) - yT;   // > 0: the stack is short
    var mag = Math.abs(gap);
    if (!show || this.solved || h === null || !(mag > 1e-12) || mag >= 1.2) {
      this.gLoupe.setAttribute('visibility', 'hidden');
      return;
    }
    var k = Math.ceil(Math.log(1.2 / mag) / Math.LN10);
    var m = Math.pow(10, k);
    var d = gap * m;
    var cx = geo.lx;
    var cy = yT;
    var r = geo.lr + 1;
    [this.gClip, this.gLBg, this.gLRing].forEach(function (c) { c.setAttribute('cy', cy); });
    this.gLText.setAttribute('y', cy + geo.lr + 3.6);
    var dir = gap > 0 ? 'up' : 'down';
    this.gLTarget.setAttribute('d', 'M' + (cx - r) + ' ' + cy + ' H' + cx + ' V' + (cy + r));
    this.gLGuess.setAttribute('d', 'M' + (cx - r) + ' ' + (cy + d) + ' H' + cx + ' V' + (cy + r));
    var poly = 'M' + (cx - r) + ' ' + cy + ' H' + cx + ' V' + (cy + d) + ' H' + (cx - r) + ' Z';
    this.gLDiffFill.setAttribute('d', poly);
    this.gLDiffPat.setAttribute('d', poly);
    this.gLDiffPat.setAttribute('fill', 'url(#' + this.id + (dir === 'up' ? '-dots' : '-hatch') + ')');
    this.gLDiff.setAttribute('class', 'sq-diff ' + dir);
    var tx = geo.cx + geo.cw;
    var vx = tx - cx;
    var len = Math.abs(vx) || 1;
    this.gLead.setAttribute('x1', cx + vx / len * geo.lr);
    this.gLead.setAttribute('y1', cy);
    this.gLead.setAttribute('x2', tx);
    this.gLead.setAttribute('y2', cy);
    this.gLText.textContent = '\u00D7' + WL.fmt(m, 0);
    this.gLoupe.setAttribute('visibility', 'visible');
  };

  // What was seen: used GB after days days. The column is always TH high, so
  // the scale is TH / used units per GB.
  StackView.prototype.setTarget = function (used, days) {
    this.used = used;
    this.days = days;
    this.U = this.geo.TH / used;
    if (this.sym) {
      this.gTLabel.textContent = 'y = ' + WL.fmt(used, 3);
      this.gDays.textContent = 'x = ' + WL.fmt(days, 3);
    } else {
      this.gTLabel.textContent = WL.fmt(used, 3) + ' GB';
      this.gDays.textContent = WL.fmt(days, 3) + (days === 1 ? ' day' : ' days');
      this.phone.setCount(WL.fmt(used, 2, { keepZeros: true }), 'GB used');
    }
    this.phone.setDay('Day ' + WL.fmt(days, 3));
    this.clearTrail();
  };

  StackView.prototype.brick = function (w) {
    if (w === null || w === undefined || !isFinite(w)) { return null; }
    return w * this.U;
  };

  // The text under the phone: "?" until the round is won, then the exact
  // rate in gold.
  StackView.prototype.setReveal = function (text, gold) {
    this.gReveal.textContent = text;
    this.gReveal.setAttribute('class', 'sq-side' + (gold ? ' solved' : ''));
  };

  // Draws a stack of bricks of height h (viewBox units, null for none).
  StackView.prototype.draw = function (h, showLabel) {
    var geo = this.geo;
    var cx = geo.cx;
    var cw = geo.cw;
    var B = geo.B;
    var yT = B - geo.TH;
    this.drawLoupe(h, showLabel);
    if (h === null) {
      this.bricks.layout(0, 0, cx, cw, B);
      this.gDiffFill.setAttribute('d', '');
      this.gDiffPat.setAttribute('d', '');
      this.gArrow.setAttribute('d', '');
      this.gLoss.textContent = '';
      return;
    }
    var top = this.bricks.layout(this.days, h, cx, cw, B);
    this.bricks.setClass(this.solved ? 'solved' : '');
    var a = clamp(Math.min(top, yT), -400, 400);
    var b = clamp(Math.max(top, yT), -400, 400);
    var dir = top > yT ? 'up' : 'down';
    var thick = b - a;
    var d = 'M' + cx + ' ' + a + ' H' + (cx + cw) + ' V' + b + ' H' + cx + ' Z';
    if (this.solved || thick < 0.05) { d = ''; }
    this.gDiffFill.setAttribute('d', d);
    this.gDiffPat.setAttribute('d', d);
    this.gDiffPat.setAttribute('fill', 'url(#' + this.id + (dir === 'up' ? '-dots' : '-hatch') + ')');
    this.gDiff.setAttribute('class', 'sq-diff ' + dir);
    // the correction still to make: from the top of the stack to the target's,
    // within the part of the band the screen shows
    var va = Math.max(a, this.phone.top + 0.8);
    var vb = Math.min(b, this.phone.bottom - 0.8);
    if (!this.solved && thick >= 5 && vb - va >= 5) {
      var ax = cx + cw - 3.4;
      var off = 1.3;
      var from = dir === 'up' ? Math.min(top, vb) - off : Math.max(top, va) + off;
      var to = dir === 'up' ? yT + off : yT - off;
      this.gArrow.setAttribute('d', arrowPath(ax, from, ax, to, 2.2));
      this.gArrow.setAttribute('class', 'sq-arrow ' + dir);
    } else {
      this.gArrow.setAttribute('d', '');
    }
    // the loss, written in its own shaded band when the band is thick enough
    if (showLabel && this.info && this.info.lossText && !this.solved && vb - va >= 7) {
      this.gLoss.setAttribute('x', cx + cw * 0.4);
      this.gLoss.setAttribute('y', (va + vb) / 2);
      this.gLoss.setAttribute('class', 'sq-label loss ' + dir);
      setNumText(this.gLoss, this.info.lossText);
    } else {
      this.gLoss.textContent = '';
    }
  };

  // info: { lossText } or null. opts.ms animates from the drawn size.
  StackView.prototype.set = function (w, info, opts) {
    opts = opts || {};
    var self = this;
    var h = this.brick(w);
    this.info = info || null;
    if (this.cancel) { this.cancel(); this.cancel = null; }
    if (h === null) {
      this.cur = null;
      this.draw(null);
      return;
    }
    var from = this.cur === null ? 0 : this.cur;
    var ms = opts.ms || 0;
    this.cancel = UI.tween(from, h, ms, function (v) {
      self.cur = v;
      self.draw(v, false);
    }, function () {
      self.cur = h;
      self.draw(h, true);
      self.cancel = null;
      if (opts.done) { opts.done(); }
    });
  };

  StackView.prototype.clearTrail = function () {
    while (this.gTrail.firstChild) { this.gTrail.removeChild(this.gTrail.firstChild); }
  };

  // Faint marks at the tops of earlier guesses. hi: index to emphasise, or -1.
  StackView.prototype.setTrail = function (ws, hi) {
    this.clearTrail();
    var geo = this.geo;
    var drawn = [];
    for (var i = 0; i < ws.length; i++) {
      var h = this.brick(ws[i]);
      if (h === null) { continue; }
      var y = geo.B - this.days * h;
      if (y < this.phone.top || y > this.phone.bottom || Math.abs(y - geo.B) < 0.2) { continue; }
      // One mark per height: a run that bounces between two values would
      // otherwise stack dozens of faint marks into two solid ones.
      var seen = false;
      for (var k = 0; k < drawn.length; k++) {
        if (Math.abs(drawn[k] - y) < 0.05) { seen = true; break; }
      }
      if (seen && i !== hi) { continue; }
      drawn.push(y);
      UI.svg('line', {
        x1: geo.cx - 1.6, x2: geo.cx + geo.cw + 1.6, y1: y, y2: y, 'class': i === hi ? 'hi' : ''
      }, this.gTrail);
    }
  };

  // The gold look and the check badge, for a winning guess on show.
  StackView.prototype.setSolved = function (on) {
    on = !!on;
    if (on === this.solved) { return; }
    this.solved = on;
    if (this.gBadge) { this.gBadge.parentNode.removeChild(this.gBadge); this.gBadge = null; }
    if (on) {
      var geo = this.geo;
      var cx = geo.cx + geo.cw / 2;
      var cy = geo.B - geo.TH / 2;
      this.gBadge = UI.svg('g', { 'class': 'sq-badge' }, this.svg);
      UI.svg('circle', { cx: cx, cy: cy, r: 5.6 }, this.gBadge);
      UI.svg('path', { d: 'M' + (cx - 2.5) + ' ' + (cy + 0.2) + ' L' + (cx - 0.6) + ' ' + (cy + 2.2) + ' L' + (cx + 2.8) + ' ' + (cy - 2.1) }, this.gBadge);
    }
    this.draw(this.cur, true);
  };

  StackView.prototype.celebrate = function () {
    var geo = this.geo;
    UI.sparkles(this.svg, geo.cx + geo.cw / 2, geo.B - geo.TH / 2, geo.TH * 0.6);
  };

  // ===== MonthView =====

  // opts: { id, geo } with the same geometry as StackView; TH is the height
  // of the plan's 5 GB.
  function MonthView(svg, opts) {
    this.svg = svg;
    this.opts = opts || {};
    this.id = this.opts.id || 'month';
    var geo = extend({ vw: 100, vh: 100, px: 27, py: 1.5, pw: 46, ph: 89, cx: 39, cw: 22, B: FLOOR, TH: 50 }, this.opts.geo);
    this.geo = geo;
    this.plan = WL.PLAN;
    this.U = geo.TH / this.plan.gb;
    this.w = WL.RATE0;
    this.day = WL.SEEN.days;
    this.out = false;
    svg.setAttribute('viewBox', '0 0 ' + geo.vw + ' ' + geo.vh);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    var defs = patterns(svg, this.id);
    this.phone = new Phone(svg, geo);
    var pile = UI.svg('g', { 'clip-path': this.phone.clip(defs, this.id + '-pile') }, svg);
    var cx = geo.cx;
    var cw = geo.cw;
    var B = geo.B;
    var yP = B - geo.TH;
    this.gFloor = UI.svg('rect', { 'class': 'sq-floor', x: cx, y: yP, width: cw, height: geo.TH }, svg);
    UI.svg('line', { 'class': 'col-ground', x1: cx - 2.4, x2: cx + cw + 2.4, y1: B, y2: B }, svg);
    this.bricks = new Bricks(pile, MAX_BRICKS);
    // what goes over the plan: hatched vermillion laid over the bricks
    this.gOver = UI.svg('rect', { 'class': 'over', x: cx, y: 0, width: cw, height: 0 }, pile);
    this.gOverPat = UI.svg('rect', { 'class': 'over-pat', x: cx, y: 0, width: cw, height: 0, fill: 'url(#' + this.id + '-hatch)' }, pile);
    this.gTarget = UI.svg('rect', { 'class': 'sq-target thick', x: cx, y: yP, width: cw, height: geo.TH }, svg);
    var lab = UI.svg('text', { 'class': 'col-label gold', x: cx - 1.3, y: yP }, svg);
    lab.textContent = WL.fmt(this.plan.gb, 0) + ' GB';
    this.gMark = UI.svg('g', { 'class': 'day-mark' }, svg);
    this.gMarkTri = UI.svg('path', { d: '' }, this.gMark);
    this.gMarkText = UI.svg('text', { x: 0, y: 0 }, this.gMark);
    this.gSnail = UI.svg('g', { 'class': 'snail', visibility: 'hidden' }, svg);
    this.gSnailInner = UI.svg('g', null, this.gSnail);
    this.gSnailInner.innerHTML = UI.icon.snailPaths();
    this.gDays = UI.svg('text', { 'class': 'col-days', x: cx + cw / 2, y: B + 2.6 }, svg);
    this.gDays.textContent = WL.fmt(this.plan.days, 0) + ' days';
    this.gNote = UI.svg('text', { 'class': 'sq-side', x: geo.px + geo.pw / 2, y: geo.py + geo.ph + 5 }, svg);
    this.draw();
  }

  MonthView.prototype.setRate = function (w) {
    this.w = w;
    this.draw();
  };

  // Shows days 1 to d. pop: the newest brick pops in.
  MonthView.prototype.setDay = function (d, pop) {
    this.day = d;
    this.draw(pop);
  };

  MonthView.prototype.draw = function (pop) {
    var geo = this.geo;
    var cx = geo.cx;
    var cw = geo.cw;
    var B = geo.B;
    var yP = B - geo.TH;
    var w = this.w;
    var d = this.day;
    var h = w * this.U;
    var v = WL.verdict(w, this.plan);
    var top = this.bricks.layout(d, h, cx, cw, B);
    var out = !v.lasts && d >= v.outDay;
    this.out = out;
    this.bricks.setClass(out ? 'out' : '');
    // the newest brick pops in
    var newest = this.bricks.rects[Math.floor(d) - 1];
    this.bricks.rects.forEach(function (r) { r.classList.remove('pop'); r.classList.remove('today'); });
    if (newest) {
      if (pop && !UI.still) { void newest.getBoundingClientRect(); newest.classList.add('pop'); }
      if (d === WL.SEEN.days) { newest.classList.add('today'); }
    }
    // over the plan: hatched vermillion
    if (top < yP) {
      var a = clamp(top, -400, 400);
      this.gOver.setAttribute('y', a);
      this.gOver.setAttribute('height', yP - a);
      this.gOverPat.setAttribute('y', a);
      this.gOverPat.setAttribute('height', yP - a);
    } else {
      this.gOver.setAttribute('height', 0);
      this.gOverPat.setAttribute('height', 0);
    }
    // the day marker on the right of the pile's top
    var my = clamp(top, this.phone.top + 2, this.phone.bottom - 2);
    var mx = cx + cw + 1.2;
    this.gMarkTri.setAttribute('d', 'M' + mx + ' ' + my + ' l1.9 -1.25 v2.5 Z');
    this.gMarkText.setAttribute('x', mx + 2.7);
    this.gMarkText.setAttribute('y', my);
    this.gMarkText.textContent = 'day ' + WL.fmt(d, 0);
    // the phone
    var used = Math.min(w * d, this.plan.gb);
    this.phone.setDay('Day ' + WL.fmt(d, 0));
    this.phone.setTitle(out ? 'OUT OF DATA' : 'MOBILE DATA');
    this.phone.setCount(WL.fmt(Math.max(used, 0), 2, { keepZeros: true }), 'of ' + WL.fmt(this.plan.gb, 0) + ' GB');
    this.phone.setOut(out);
    // a snail on top of the pile, once the data is gone
    if (out) {
      var s = 7;
      var sx = cx + cw / 2 - s / 2;
      var sy = clamp(top, this.phone.top + s, this.phone.bottom) - s + 0.6;
      this.gSnailInner.setAttribute('transform', 'translate(' + sx + ' ' + sy + ') scale(' + (s / 24) + ')');
      this.gSnail.setAttribute('visibility', 'visible');
    } else {
      this.gSnail.setAttribute('visibility', 'hidden');
    }
  };

  // The line under the phone.
  MonthView.prototype.setNote = function (text, cls) {
    this.gNote.textContent = text || '';
    this.gNote.setAttribute('class', 'sq-side' + (cls ? ' ' + cls : ''));
  };

  MonthView.prototype.celebrate = function () {
    var geo = this.geo;
    UI.sparkles(this.svg, geo.cx + geo.cw / 2, geo.B - geo.TH / 2, geo.TH * 0.55);
  };

  // Phone and Bricks also draw the phone in the story's pictures (js/story.js).
  window.Views = { StackView: StackView, MonthView: MonthView, Phone: Phone, Bricks: Bricks };
}());
