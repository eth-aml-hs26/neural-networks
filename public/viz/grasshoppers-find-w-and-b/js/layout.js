/* layout.js: where everything sits, as window.GF.geo. The page is one stage of 1600 x 900 that is
 * scaled to the window as a whole, so these are stage pixels and nothing ever leaves the screen.
 *
 * Left: the diagram of Carlos's sketches (IMG_9248 and IMG_9251, 30 October 2026), one day, so
 * every box is a small square: y, x, a, yhat and the loss in a row, w above x and b above a, w's
 * line joining b's arrow down into a, the arrow a -> yhat carrying the ReLU. The boxes stand where
 * the columns of the next page stand. The purple pair of the gradient sits above the loss, and the
 * bracket of the backward pass runs over the top into w and into b. The band above the bracket holds
 * the two update formulas.
 *
 * Right: the two grounds, the loss against w with b held (top) and against b with w held (bottom),
 * and at the end the plot of the energy against the temperature.
 *
 * setRun(F) takes the views of GFMath.frames once per start.
 */
(function () {
  'use strict';

  var G = {
    W: 1600, H: 900,

    // boxes {x, y, w, h}
    box: {
      y:    { x: 40,  y: 560, w: 100, h: 96 },
      x:    { x: 180, y: 560, w: 100, h: 96 },
      a:    { x: 330, y: 560, w: 156, h: 96 },
      yhat: { x: 616, y: 560, w: 120, h: 96 },
      loss: { x: 790, y: 560, w: 150, h: 96 },
      w:    { x: 160, y: 360, w: 140, h: 96 },
      b:    { x: 338, y: 360, w: 140, h: 96 },
      grad: { x: 770, y: 360, w: 190, h: 96 }     // two cells: dl/dw and dl/db
    },

    // the routes of the arrows, tip last
    route: {
      x2a:    [[280, 608], [330, 608]],
      w2a:    [[300, 408], [316, 408], [316, 508], [408, 508], [408, 560]],
      b2j:    [[408, 456], [408, 508]],                            // b's line joins w's arrow
      a2yhat: [[486, 608], [616, 608]],
      yhat2l: [[736, 608], [790, 608]],
      y2l:    [[118, 656], [118, 750], [806, 750], [806, 656]],
      l2grad: [[865, 560], [865, 456]],
      back:   [[865, 360], [865, 278], [270, 278], [270, 360]],
      backB:  [[455, 278], [455, 360]]
    },
    join: [408, 508],

    // labels: [x, y, anchor] (anchor as in GFKit.pos)
    label: {
      y:    [76, 690, 'cc'],
      x:    [230, 690, 'cc'],
      a:    [408, 690, 'cc'],
      yhat: [676, 690, 'cc'],
      loss: [822, 690, 'cl'],
      w:    [148, 408, 'cr'],
      b:    [490, 408, 'cl'],
      relu: [551, 600, 'bc'],
      nabla: [760, 408, 'cr'],
      gw:   [817, 354, 'bc'],
      gb:   [912, 354, 'bc'],
      forward:  [600, 380, 'cc'],
      backward: [884, 258, 'cl']
    },

    // the little plot of the ReLU above its arrow: a from -A to A over 2 * half pixels, the same
    // scale upwards, so the rising part climbs at 45 degrees
    relu: { ox: 551, oy: 548, half: 48, card: { x: 492, y: 466, w: 118, h: 96 } },

    // the red loop of the forward pass, clockwise from the left of w: round w, b, the ReLU, a,
    // yhat and the loss, leaving x and y outside
    loop: [[110, 404], [134, 330], [250, 306], [420, 300], [560, 312], [652, 352], [676, 432],
           [712, 510], [820, 530], [985, 534], [1016, 612], [1004, 706], [880, 728], [600, 730],
           [380, 728], [312, 704], [302, 610], [296, 530], [200, 512], [122, 478]],

    // the two grounds: axes cross at (ox, oy), the curve fills x0..x1 and rises to ytop
    ground: {
      w: { ox: 1105, oy: 382, x0: 1130, x1: 1525, ytop: 128, xend: 1558, yend: 96, row: [1132, 54] },
      b: { ox: 1105, oy: 800, x0: 1130, x1: 1525, ytop: 546, xend: 1558, yend: 514, row: [1132, 472] }
    },
    // the magnified ground of a hop: eps is EPS_PX wide, the hop starts at HOP_AT of the width
    EPS_PX: 118, HOP_AT: 0.3, ZOOM_FILL: 0.5,

    // the update formulas, over the bracket
    upd: { row1: 112, row2: 182, w: 60, b: 610, alpha: 1080 },

    // the plot of the energy against the temperature, at the end
    coda: { ox: 1110, oy: 790, x0: 1110, x1: 1530, ytop: 316, xend: 1560, yend: 282,
            tlo: -5, thi: 21, ehi: 80 },

    // the story cards: the picture and the words beside it
    story: { pic: { x: 40, y: 92, w: 920, h: 690 }, text: { x: 1010, y: 150, w: 550 } },

    // the grasshoppers perched on the boxes of w and b: their feet, their scale
    perch: { w: { x: 206, y: 360, s: 0.62 }, b: { x: 384, y: 360, s: 0.62 } },

    // the controls, bottom left
    controls: { x: 40, y: 822 }
  };

  // A box's centre and edges.
  G.mid = function (name) {
    var b = G.box[name];
    return { x: b.x + b.w / 2, y: b.y + b.h / 2, top: b.y, bottom: b.y + b.h, left: b.x, right: b.x + b.w };
  };

  // The views of one start (GFMath.frames).
  G.setRun = function (F) { G.F = F; };

  window.GF = window.GF || {};
  window.GF.geo = G;
  window.GF.parts = window.GF.parts || {};
})();
