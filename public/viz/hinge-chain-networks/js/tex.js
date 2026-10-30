/* KaTeX helpers (render a string, fill the data-tex placeholders) and number formatting. A formula
 * marks a knob with \htmlClass{kn}{...}, which KaTeX renders only with trust on; every string it
 * renders comes from this folder. */
window.Tex = (function () {
  'use strict';
  var MINUS = '−';

  function render(s, display) {
    return katex.renderToString(s, { throwOnError: false, displayMode: !!display, trust: true, strict: 'ignore' });
  }
  function renderStatic(root) {
    root.querySelectorAll('[data-tex]').forEach(function (el) { el.innerHTML = render(el.getAttribute('data-tex')); });
  }

  // v with two decimals and the true minus sign; -0.00 prints as 0.00
  function num(v) {
    var a = Math.abs(v), s = a < 0.005 ? '0.00' : a >= 100 ? a.toFixed(1) : a.toFixed(2);
    return (v < 0 && a >= 0.005 ? MINUS : '') + s;
  }

  return { MINUS: MINUS, render: render, renderStatic: renderStatic, num: num };
})();
