/* The menu of target functions, all on [-2, 2]. Piecewise-linear targets list their bends, so the page
 * can say how many layers an exact fit needs; smooth ones are fitted better with every extra layer.
 *
 * Loaded by the page (window.Targets) and by scripts/check-math.js (module.exports). */
(function (root) {
  'use strict';

  function pl(points) {
    return function (x) {
      if (x <= points[0][0]) return points[0][1];
      for (var i = 1; i < points.length; i++) {
        if (x <= points[i][0]) {
          var p = points[i - 1], q = points[i], t = (x - p[0]) / (q[0] - p[0]);
          return p[1] + t * (q[1] - p[1]);
        }
      }
      return points[points.length - 1][1];
    };
  }
  // the interior points where the slope changes
  function bendsOf(points) {
    var out = [];
    for (var i = 1; i < points.length - 1; i++) {
      var s0 = (points[i][1] - points[i - 1][1]) / (points[i][0] - points[i - 1][0]);
      var s1 = (points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]);
      if (Math.abs(s1 - s0) > 1e-9) out.push(points[i][0]);
    }
    return out;
  }
  function piecewise(id, name, points, tex) {
    return { id: id, name: name, group: 'pl', f: pl(points), kinks: bendsOf(points), tex: tex };
  }
  function smooth(id, name, f, tex) {
    return { id: id, name: name, group: 'smooth', f: f, kinks: null, tex: tex };
  }

  var wave = [];
  for (var i = 0; i <= 8; i++) wave.push([-2 + 0.5 * i, i % 2 ? 0.75 : -0.75]);

  var list = [
    piecewise('zigzag', 'Zigzag', [[-2, -1], [-1, 1], [0, 0], [1, 2], [2, -1]], '\\text{kinks at } x=-1,\\ 0,\\ 1'),
    piecewise('abs', 'Absolute value', [[-2, 1], [0, -1], [2, 1]], 'f(x)=|x|-1'),
    piecewise('tent', 'Tent', [[-2, 0], [-1, 0], [0, 1.5], [1, 0], [2, 0]], 'f(x)=\\tfrac32\\max\\{0,\\,1-|x|\\}'),
    piecewise('w', 'W shape', [[-2, 1], [-1, -1], [0, 0.5], [1, -1], [2, 1]], '\\text{kinks at } x=-1,\\ 0,\\ 1'),
    piecewise('ramp', 'Clipped ramp', [[-2, -1], [-0.5, -1], [0.5, 1], [2, 1]], 'f(x)=\\min\\{1,\\max\\{-1,\\,2x\\}\\}'),
    piecewise('step', 'Steep step', [[-2, -1], [-0.2, -1], [0.2, 1], [2, 1]], 'f(x)=\\min\\{1,\\max\\{-1,\\,5x\\}\\}'),
    piecewise('wave', 'Triangle wave', wave, '\\text{amplitude } 0.75,\\ \\text{period } 1'),
    piecewise('stairs', 'Staircase', [[-2, -1.5], [-1.3, -1.5], [-1.1, -0.5], [-0.2, -0.5], [0, 0.5], [0.9, 0.5], [1.1, 1.5], [2, 1.5]],
              '\\text{three steps}'),
    smooth('sine', 'Sine', function (x) { return Math.sin(Math.PI * x / 2); }, 'f(x)=\\sin(\\pi x/2)'),
    smooth('sine2', 'Two periods', function (x) { return Math.sin(Math.PI * x); }, 'f(x)=\\sin(\\pi x)'),
    smooth('parabola', 'Parabola', function (x) { return x * x / 2 - 1; }, 'f(x)=x^2/2-1'),
    smooth('cubic', 'Cubic', function (x) { return x * x * x / 4 - x / 2; }, 'f(x)=x^3/4-x/2'),
    smooth('bump', 'Gaussian bump', function (x) { return 1.5 * Math.exp(-1.5 * x * x); }, 'f(x)=\\tfrac32\\,e^{-3x^2/2}'),
    smooth('runge', 'Runge function', function (x) { return 1 / (1 + 8 * x * x); }, 'f(x)=\\dfrac{1}{1+8x^2}'),
    smooth('chirp', 'Chirp', function (x) { return Math.sin(1.5 * x * x); }, 'f(x)=\\sin(\\tfrac32 x^2)')
  ];

  var byId = {};
  list.forEach(function (t) { byId[t.id] = t; });

  var api = { list: list, byId: byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Targets = api;
})(typeof window !== 'undefined' ? window : this);
