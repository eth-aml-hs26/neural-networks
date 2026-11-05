/* words.js: the words of the two cards and the 14 steps, as window.DC.words in the browser and
 * module.exports in node (scripts/check-math.js asserts every number in them).
 *
 * Every number in a sentence or a formula is taken from js/math.js, so the words cannot drift
 * from the drawing. Text between dollar signs is set in KaTeX; `tex` is the step's one displayed
 * formula; `note` is a short line under the kernel.
 *
 * The story convention of the repository: the heading states the point, one concept per step,
 * the picture before the symbols, at most one formula per step.
 */
(function (root) {
  'use strict';
  var M = (typeof module !== 'undefined' && module.exports) ? require('./math.js') : root.DC.math;
  var X = M.X, S = M.S, K2 = M.K2, K4 = M.K4;
  var n = X.length, k2 = K2.length, k4 = K4.length;
  var out2 = M.outSize(n, S, k2), out4 = M.outSize(n, S, k4);
  var WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
  function by(a) { return a + ' by ' + a; }

  // a sum of products, term by term, as KaTeX: x times kernel entry, in the order of the copies
  function sum(terms) {
    var total = 0;
    var parts = terms.map(function (t) { total += t.p; return t.x + '\\cdot ' + t.k; });
    return parts.join('+') + '=' + total;
  }
  function wsum(terms) {
    var total = 0;
    var parts = terms.map(function (t) { total += t.p; return t.z + '\\cdot ' + t.k; });
    return parts.join('+') + '=' + total;
  }

  var two = M.copies(X, K4, S, 2), all = M.copies(X, K4, S);
  var W = M.byWindows(X, K4, S);
  var first = M.windowAt(W.grid, W.turned, 0, 0);
  var mid = M.windowAt(W.grid, W.turned, M.CELL_MID[0], M.CELL_MID[1]);
  var up = M.UNET_UP[0];
  var size = '(n-1)s+k=(' + n + '-1)\\cdot ' + S + '+' + k4 + '=' + out4;

  var cards = [
    { id: 'conv', heading: 'A convolution makes a map smaller',
      text: 'A ' + by(2) + ' kernel with stride 2 turns each ' + by(2) + ' block of a map into one number. ' +
            'A ' + by(4) + ' map becomes a ' + by(M.convSize(4, 2, 2)) + ' map.' },
    { id: 'unet', heading: 'A U-Net makes maps bigger again',
      text: 'Its left half makes the maps smaller, step by step. Its right half makes them bigger again: ' +
            'each green arrow, an up-conv 2x2, doubles the side of a map, ' + up[0] + ' to ' + up[1] + '. ' +
            'That arrow is a deconvolutional filter.' }
  ];

  var steps = [
    { id: 'start', heading: 'From ' + by(n) + ' to ' + by(out2),
      text: 'A deconvolutional filter with a ' + by(k2) + ' kernel and stride ' + S + ' turns this ' +
            by(n) + ' input into a ' + by(out2) + ' output.' },
    { id: 'copy', heading: 'Each cell stamps a copy of the kernel',
      text: 'The cell with ' + X[0][0] + ' puts ' + X[0][0] + ' times the kernel into the output, at its top left.' },
    { id: 'stride', heading: 'The next copy lands ' + S + ' cells further',
      text: 'The stride is ' + S + ', so the copy of the cell with ' + X[0][1] + ' starts ' + S +
            ' cells to the right.' },
    { id: 'double', heading: 'Each cell becomes a block: the map doubles',
      text: 'The cells with ' + X[1][0] + ' and ' + X[1][1] + ' stamp the two blocks below. ' +
            'This is the up-conv 2x2 of the U-Net.' },
    { id: 'bigger', heading: 'A ' + by(k4) + ' kernel makes bigger copies',
      text: 'The stride stays ' + S + '. The cell with ' + X[0][0] + ' stamps ' + X[0][0] +
            ' times the new kernel at the top left of a ' + by(out4) + ' output.' },
    { id: 'overlap', heading: 'Where copies overlap, they add',
      text: 'The copy of the cell with ' + X[0][1] + ' lands ' + S + ' cells to the right. ' +
            'In the ' + WORD[k4 - S] + ' columns they share, the numbers add.',
      tex: sum(two.terms[M.CELL_TWO[0]][M.CELL_TWO[1]]), cell: M.CELL_TWO },
    { id: 'four', heading: 'Four copies make the ' + by(out4) + ' output',
      text: 'The cells with ' + X[1][0] + ' and ' + X[1][1] + ' stamp their copies ' + S + ' cells lower. ' +
            'The four cells in the middle add all four copies.',
      tex: sum(all.terms[M.CELL_MID[0]][M.CELL_MID[1]]), cell: M.CELL_MID },
    { id: 'size', heading: 'The size of the output',
      text: 'The copies start $s$ cells apart, so the last one starts $(n-1)s$ cells after the first ' +
            'and covers $k$ more. Here $n=' + n + '$ cells, the stride $s=' + S + '$ and the kernel $k=' + k4 + '$.',
      tex: size },
    { id: 'spread', heading: 'The slide’s view: spread the input out',
      text: 'Put stride minus 1 zeros between neighbouring cells: ' + WORD[S - 1] + ' zero, for stride ' + S + '.' },
    { id: 'pad', heading: 'Pad it with zeros',
      text: 'Put kernel size minus 1 zeros on every side: ' + WORD[k4 - 1] + ', for a ' + by(k4) +
            ' kernel. The grid is now ' + by(W.grid.length) + '.' },
    { id: 'window', heading: 'Slide the kernel as in a convolution',
      text: 'Each place of the window gives one output cell: multiply every cell by the kernel entry on it, ' +
            'then add. At the top left only the ' + X[0][0] + ' meets the kernel, on its corner.',
      tex: wsum(first.terms), cell: [0, 0],
      note: 'A half turn leaves this kernel the same. Any other kernel slides turned by half a turn.' },
    { id: 'middle', heading: 'The middle window meets all four cells',
      text: 'The window over the middle holds all four input cells: the same four products as the four copies.',
      tex: wsum(mid.terms), cell: M.CELL_MID,
      note: 'A half turn leaves this kernel the same. Any other kernel slides turned by half a turn.' },
    { id: 'every', heading: 'Every window gives the same output',
      text: 'The window takes ' + out4 + ' places across and ' + out4 + ' down. Its ' + (out4 * out4) +
            ' sums are the ' + (out4 * out4) + ' numbers of the copies.',
      note: 'A half turn leaves this kernel the same. Any other kernel slides turned by half a turn.' },
    { id: 'slide', heading: 'Deconvolutional filters: the slide',
      text: 'Input ' + by(n) + ', stride ' + S + ', padding ' + (k4 - 1) + ', kernel ' + by(k4) + ': a ' + by(out4) +
            ' output. Each coloured window makes the output cell of its colour.',
      tex: size }
  ];

  var api = { cards: cards, steps: steps, WORD: WORD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.DC = root.DC || {}; root.DC.words = api; }
})(typeof window !== 'undefined' ? window : this);
