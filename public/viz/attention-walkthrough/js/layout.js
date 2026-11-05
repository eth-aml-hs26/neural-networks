/* layout.js: every position on the stage of 1920 x 1080, as window.AW.geo, computed from the sizes
 * of the world (n words in the sentence, d features, k slots), so that another sentence or another
 * set of features lays itself out.
 *
 * The diagram follows the BMAI walkthrough (git_bmai, 2026hs/w2-lecture-material/
 * attention-walkthrough/normalized.html) and the attention mechanism of the deck's frame 34: one
 * band of rows, one row per word, from the words on the left to the new rows on the right, and
 * each product in Falk's scheme, the right factor above the product and the left factor on its
 * rows:
 *
 *                 W_Q W_K
 *                                        V = E
 *                         K^T
 *   words    E    Q   K   S              S V
 *
 * so the row of a query and the column of a key meet in their score, and the row of scores and a
 * column of V meet in S V. W_Q and W_K stand over Q and K (their columns over its columns), E on
 * their rows.
 */
(function () {
  'use strict';
  var AW = window.AW = window.AW || {};
  var M = AW.M, n = M.n, d = M.d, k = M.k;

  var G = AW.geo = {
    W: 1920, H: 1080,
    CW: 38,           // the width of a column of every block
    CH: 38,           // the height of a row of the band: one word
    BAND_Y: 620,      // the top of the band
    WORDS_R: 148,     // the right edge of the words on the left of the band
    NAME_Y: 792,      // the centre of a block's name under the band
    SIZE_Y: 822,      // the centre of its size
    WORK_Y: 850,      // the top of the working under the band
    HEAD_GAP: 8,      // from a block's top edge to the foot of its turned column heads
    HEAD_LEN: 88,     // room for the longest turned feature (swimming)
    BRACE_RISE: 8,    // from the top of the heads to a group brace
    W_ROW: 22         // a row of W_Q and W_K: one feature
  };
  var CW = G.CW, CH = G.CH;

  // left to right along the band
  var x = {};
  x.E = G.WORDS_R + 12;
  x.Q = x.E + d * CW + 94;       // room for the features beside the rows of W_Q
  x.K = x.Q + k * CW + 26;
  x.S = x.K + k * CW + 68;       // room for the name of K^T
  x.SV = x.S + n * CW + 104;     // room for the score column beside V

  var wTop = G.BAND_Y - 54 - d * G.W_ROW;              // W_Q and W_K end above the slots of Q and K
  var vTop = G.BAND_Y - 26 - n * CH;                    // V stands over S V

  G.blocks = {
    E:  { x: x.E,  y: G.BAND_Y,            rows: n, cols: d },
    WQ: { x: x.Q,  y: wTop,                rows: d, cols: k, ch: G.W_ROW },
    Q:  { x: x.Q,  y: G.BAND_Y,            rows: n, cols: k },
    WK: { x: x.K,  y: wTop,                rows: d, cols: k, ch: G.W_ROW },
    K:  { x: x.K,  y: G.BAND_Y,            rows: n, cols: k },
    KT: { x: x.S,  y: G.BAND_Y - 14 - k * CH, rows: k, cols: n },
    S:  { x: x.S,  y: G.BAND_Y,            rows: n, cols: n },
    V:  { x: x.SV, y: vTop,                rows: n, cols: d },
    SV: { x: x.SV, y: G.BAND_Y,            rows: n, cols: d }
  };
  Object.keys(G.blocks).forEach(function (id) {
    var b = G.blocks[id];
    b.id = id;
    b.cw = b.cw || CW;
    b.ch = b.ch || CH;
    b.w = b.cols * b.cw;
    b.h = b.rows * b.ch;
    b.cx = b.x + b.w / 2;
  });
  var B = G.blocks;

  // the cell (i, j) of a block, a run of its cells, a row, a column, the whole block
  G.cell = function (id, i, j) {
    var b = B[id], cx = b.x + j * b.cw, cy = b.y + i * b.ch;
    return { x: cx, y: cy, w: b.cw, h: b.ch, cx: cx + b.cw / 2, cy: cy + b.ch / 2 };
  };
  G.span = function (id, i0, j0, i1, j1) {
    var a = G.cell(id, i0, j0), z = G.cell(id, i1, j1);
    var sx = a.x, sy = a.y, w = z.x + z.w - a.x, h = z.y + z.h - a.y;
    return { x: sx, y: sy, w: w, h: h, cx: sx + w / 2, cy: sy + h / 2 };
  };
  G.row = function (id, i) { return G.span(id, i, 0, i, B[id].cols - 1); };
  G.col = function (id, j) { return G.span(id, 0, j, B[id].rows - 1, j); };
  G.all = function (id) { return G.span(id, 0, 0, B[id].rows - 1, B[id].cols - 1); };

  // the centre of row i of the band
  G.rowY = function (i) { return G.BAND_Y + (i + 0.5) * CH; };

  // over W_Q and W_K, from the block up: the slot numbers, the brace of each place, the size, the
  // name; K^T and V have their names on their left or above their heads
  G.slotY = function (id) { return B[id].y - 16; };
  G.placeBraceY = function (id) { return B[id].y - 32; };
  G.names = {
    WQ: { x: B.WQ.cx, y: B.WQ.y - 100, sy: B.WQ.y - 74 },
    WK: { x: B.WK.cx, y: B.WK.y - 100, sy: B.WK.y - 74 },
    KT: { x: B.KT.cx, y: B.KT.y - 104, sy: B.KT.y - 78 },
    V:  { x: B.V.x - 50, y: B.V.y - 58, sy: B.V.y - 28 }
  };

  // the score column beside V while a row of S V is worked out, and its signs
  G.scoreCol = { x: B.V.x - 72, w: CW, gap: 18 };

  // the work under a block: its centre
  G.workX = {
    Q: (B.Q.x + B.K.x + B.K.w) / 2, K: (B.Q.x + B.K.x + B.K.w) / 2, V: B.SV.cx,
    KT: B.S.cx, S: B.S.cx, SV: B.SV.cx
  };

  // the words beside the new rows at the end, and their pictures
  G.read = { x: B.SV.x + B.SV.w + 16, size: 60 };

  // the formula of the last click, in the free corner under the title
  G.formula = { x: 60, y: 200 };
})();
