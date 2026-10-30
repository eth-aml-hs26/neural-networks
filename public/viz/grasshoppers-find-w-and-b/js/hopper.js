/* hopper.js: the paper grasshopper, as window.GF.hopper. Copied from the page before this one
 * (../grasshopper-finds-w/js/hopper.js); here there are two of them.
 *
 * The glyph is the cut-out of the BMAI page "Two grasshoppers fit a line" (git_bmai, 2026hs/
 * w4-lecture-material/grasshopper-regression/js/svg.js), copied part for part: the same polygons,
 * cut with the same seeded jitter, so it is the same grasshopper, here in blue paper. Foot line at
 * y = 0, facing right, about 112 units from hind foot to antenna tip at scale 1.
 *
 *   GF.hopper.defs(svg)          draw the glyph once into the <defs> of svg
 *   GF.hopper.make(parent, cls)  a grasshopper: {g, place(x, y, angle, scale, face), show(on), pose}
 *   GF.hopper.w, GF.hopper.b     THE two grasshoppers of the page (made by the engine)
 *   GF.hopper.perchPose(who)     the pose of grasshopper who ('w' or 'b') on the box of its number
 *
 * Colours are classes (hop-body, hop-deep, hop-ink, hop-eye, hop-shadow in css/style.css).
 */
(function () {
  'use strict';
  var K = window.GFKit;

  // ===== cut paper (from the BMAI svg.js)
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = hashStr(String(seed));
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function cut(pts, seed, amp, step) {
    amp = amp === undefined ? 1.3 : amp; step = step || 16;
    var r = rng(seed), out = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var m = Math.max(1, Math.round(len / step)), nx = -dy / len, ny = dx / len;
      out.push([a[0] + (r() - 0.5) * amp * 1.2, a[1] + (r() - 0.5) * amp * 1.2]);
      for (var j = 1; j < m; j++) {
        var f = j / m, o = (r() - 0.5) * 2 * amp;
        out.push([a[0] + dx * f + nx * o, a[1] + dy * f + ny * o]);
      }
    }
    return 'M ' + out.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L ') + ' Z';
  }
  function strip(x1, y1, x2, y2, w) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len * w / 2, ny = dx / len * w / 2;
    return [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
  }
  function disc(cx, cy, r, n) {
    var p = [];
    n = n || 26;
    for (var i = 0; i < n; i++) p.push([cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n)]);
    return p;
  }

  var S = strip;
  var PARTS = [
    ['hop-deep', [[-2, -17], [3, -24], [-29, -47], [-38, -45], [-35, -39]], 0.7],            // jumping leg, thigh
    ['hop-ink', S(-35, -43, -50, -1, 3.4), 0.3],                                             // its shin
    ['hop-ink', S(-50, -1, -58, 0, 3), 0.2],                                                 // its foot
    ['hop-ink', S(5, -14, 0, -6, 2.8), 0.25], ['hop-ink', S(0, -6, 6, 0, 2.8), 0.25],         // middle leg
    ['hop-ink', S(18, -15, 22, -7, 2.8), 0.25], ['hop-ink', S(22, -7, 28, 0, 2.8), 0.25],     // front leg
    ['hop-body', [[-48, -17], [-38, -23], [-22, -28], [-4, -31], [14, -33], [20, -32], [20, -16],
                  [4, -13], [-16, -12], [-34, -12], [-45, -13]], 0.9],                       // body
    ['hop-deep', [[14, -31], [-10, -30], [-36, -24], [-47, -18], [-34, -21], [-10, -26], [14, -27]], 0.5], // wing
    ['hop-body', [[15, -34], [24, -38], [33, -35], [37, -27], [35, -19], [27, -13], [18, -15]], 0.7], // head
    ['hop-ink', S(31, -35, 41, -49, 2.2), 0.2], ['hop-ink', S(41, -49, 57, -60, 2), 0.2],   // antenna
    ['hop-eye', disc(28, -27, 4.4, 12), 0.25],                                               // eye
    ['hop-ink', disc(29, -27, 2.1, 10), 0.1]
  ];

  var H = {};

  H.defs = function (svg) {
    var defs = K.svg('defs', null, svg);
    var paper = K.svg('g', { id: 'gf-hop' }, defs), shadow = K.svg('g', { id: 'gf-hop-shadow' }, defs);
    PARTS.forEach(function (p, i) {
      var d = cut(p[1], 'hopper-' + i, p[2], 7);
      K.svg('path', { d: d }, shadow, 'hop-shadow');
      K.svg('path', { d: d }, paper, p[0]);
    });
  };

  // A grasshopper: its shadow and its paper. face -1 mirrors it to face left.
  H.make = function (parent, cls) {
    var g = K.svg('g', null, parent, 'hopper vis' + (cls ? ' ' + cls : ''));
    var sh = K.svg('use', { href: '#gf-hop-shadow' }, g);
    var me = K.svg('use', { href: '#gf-hop' }, g);
    var h = { g: g, sh: sh, me: me, pose: { x: 0, y: 0, a: 0, s: 1, f: 1 } };
    h.place = function (x, y, angleDeg, scale, face) {
      var p = h.pose;
      p.x = x; p.y = y; p.a = angleDeg || 0; p.s = scale || 1; p.f = face === undefined ? 1 : face;
      var tr = 'translate(' + x.toFixed(2) + ',' + y.toFixed(2) + ') rotate(' + p.a.toFixed(3) +
        ') scale(' + (p.s * p.f).toFixed(4) + ',' + p.s.toFixed(4) + ')';
      me.setAttribute('transform', tr);
      sh.setAttribute('transform', 'translate(3,4) ' + tr);
      return h;
    };
    h.setPose = function (p) { return h.place(p.x, p.y, p.a, p.s, p.f); };
    h.show = function (on) { K.show(g, on); return h; };
    return h;
  };

  H.perchPose = function (who) {
    var P = window.GF.geo.perch[who];
    return { x: P.x, y: P.y, a: 0, s: P.s, f: 1 };
  };

  H.pose = function (h) {
    var p = h.pose;
    return { x: p.x, y: p.y, a: p.a, s: p.s, f: p.f };
  };

  // A jump from the current pose to pose q on an arc of height lift, over ms.
  H.jump = function (h, q, ms, lift, done) {
    var p = { x: h.pose.x, y: h.pose.y, a: h.pose.a, s: h.pose.s, f: h.pose.f };
    lift = lift === undefined ? 60 : lift;
    K.tween(ms, function (e) {
      h.place(p.x + (q.x - p.x) * e, p.y + (q.y - p.y) * e - Math.sin(Math.PI * e) * lift,
        p.a + (q.a - p.a) * e, p.s + (q.s - p.s) * e, e < 0.5 ? p.f : q.f);
    }, K.ease.inOut, done);
  };

  window.GF = window.GF || {};
  window.GF.hopper = H;
})();
