/* layout.js: where everything sits, as window.TT.geo, in stage pixels (the stage is 1600 x 900,
 * scaled to the window as a whole).
 *
 * BMAI's arrangement (convolution-walkthrough/js/tiles.js): the image on the left, the feature map
 * beside it on the same top edge, the four tiles in a column on the right, and the image rebuilt
 * under the image. The last card of the story shows the image exactly where step 1 draws it.
 */
(function () {
  'use strict';
  var TT = window.TT = window.TT || {};
  var E = window.EXAMPLES.tiles;

  TT.geo = {
    W: 1600, H: 900,
    N: E.size,                                       // the image: 7 by 7
    T: E.tile,                                       // a tile: 4 by 4
    M: E.map,                                        // the feature map: 4 by 4
    IMG: { x: 80, y: 130, p: 58 },                   // the image
    FM: { x: 640, y: 130, p: 58 },                   // the feature map, on the image's top edge
    TILE: { x: 1376, p: 34, tops: [108, 290, 472, 654] },
    REB: { x: 80, y: 604, p: 27 },                   // the image rebuilt, steps 8 to 12
    RING: 0.34,                                      // a ring's radius, in cells
    // the story: the picture of a card and the words beside it
    story: { pic: { x: 40, y: 92, w: 920, h: 690 }, text: { x: 1010, y: 150, w: 550 } }
  };
})();
