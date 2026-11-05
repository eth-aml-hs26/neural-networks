/* layout.js: where everything sits, as window.DC.geo, in stage pixels (the stage is 1600 x 900,
 * scaled to the window as a whole).
 *
 * The arrangement of slide 13: the spread-out input on the left, the kernel in the middle, the
 * output on the right, all on one pitch and one middle line. The steps before the slide's view keep
 * the same places: the 2 by 2 input sits in the middle of the grid's place, where it spreads out
 * from in step 9, the kernel in the middle of the kernel's place, the output in the middle of the
 * output's place. The words of a step sit in a band under the title.
 *
 * Under the kernel, top to bottom: its label, then a note of at most NOTE_LINES lines. A long
 * formula under the output reaches left under the note (step 12's is 468 wide, centred on the
 * output), so its top is set from the note's last line, FORMULA_GAP below it. Everything here is in
 * stage pixels, so the gaps are the same at every window size; dev/drive.mjs checks them at five.
 */
(function () {
  'use strict';
  var DC = window.DC = window.DC || {};
  var P = 56;
  var MID = 514;                                   // the middle line of the drawing
  var GRID = { x: 160, y: MID - 4.5 * P };         // the 9 by 9 grid
  var KER = { x: 760, y: MID - 2 * P };            // the place of the 4 by 4 kernel
  var OUT = { x: 1088, y: MID - 3 * P };           // the place of the 6 by 6 output
  var UNDER_K = KER.y + 4 * P;                     // the bottom edge of the kernel
  var NOTE_Y = UNDER_K + 64;                       // the middle of a note's first line
  var NOTE_DY = 28;                                // from one line of a note to the next, its height
  var NOTE_LINES = 2;
  var NOTE_BOTTOM = NOTE_Y + (NOTE_LINES - 0.5) * NOTE_DY;
  var FORMULA_GAP = 16;

  DC.geo = {
    W: 1600, H: 900, P: P, MID: MID,
    GRID: GRID, KER: KER, OUT: OUT,
    // the centres of the three places, around which smaller grids are drawn
    CG: { x: GRID.x + 4.5 * P, y: MID },
    CK: { x: KER.x + 2 * P, y: MID },
    CO: { x: OUT.x + 3 * P, y: MID },
    STAR: { x: (GRID.x + 9 * P + KER.x) / 2, y: MID },
    EQ: { x: (KER.x + 4 * P + OUT.x) / 2, y: MID },
    KLAB_Y: UNDER_K + 26,                          // the middle of the kernel's label
    NOTE_Y: NOTE_Y, NOTE_DY: NOTE_DY, NOTE_LINES: NOTE_LINES,
    FORMULA_Y: NOTE_BOTTOM + FORMULA_GAP,          // the top of a formula under the output (748)
    // the story: the picture of a card and the words beside it (the tiles page's places)
    story: { pic: { x: 40, y: 92, w: 920, h: 690 }, text: { x: 1010, y: 150, w: 550 } }
  };
})();
