/* Will it last? The pure logic of the show.
 *
 * No DOM in this file. It runs in the page (as window.WillItLast) and under
 * node (require('./js/logic.js')), which is how tests/logic.test.js checks it.
 *
 * The story: on day 17 of a 30-day plan the phone says 3 GB used. At a steady
 * rate w (GB a day), 17 days use w * 17. Round 1 finds w by guessing; round 2
 * asks whether the plan's 5 GB last the 30 days; the final has a machine find
 * w the same way. What lives here: reading a typed guess, writing a number,
 * the hint (which way and how far), round 1's scoring, the verdict on the
 * plan, and the machine's run, which is the canonical Python of page 4 written
 * again in JavaScript, operation for operation, so the floating point results
 * are the same bits.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.WillItLast = api;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var THIN = '\u2009';   // thin space, the thousands separator on screen
  var MINUS = '\u2212';  // the typographic minus sign

  // ===== The show's fixed numbers =====

  // The plan: 5 GB for a cycle of 30 days. On day 17, 3 GB are used.
  var PLAN = { gb: 5, days: 30 };
  var SEEN = { used: 3, days: 17 };

  // Round 1. Guess w in GB a day. A guess wins when |3 - w * 17| < 0.001,
  // a megabyte, so 0.1765 wins and 0.176 does not. The hint sizes run on a log
  // scale from a loss of 0.001 (smallest type) to 5 (largest type).
  var ROUND1 = { used: SEEN.used, days: SEEN.days, win: 0.001, lo: 0.001, hi: 5 };

  // Round 2 starts from this rate until round 1 has been won.
  var RATE0 = 0.1765;

  // The final. The call printed on page 4 (used, days), the first guess and
  // the step size that the function sets for itself (w, alpha), and the
  // guards that stop a run that will never settle.
  var MACHINE = { used: 3, days: 17, w: 0, alpha: 0.03, tol: 0.001, maxSteps: 1000, blowUp: 1e7 };

  // Where "a tiny bit" becomes "a bit" and "a bit" becomes "by a lot", on
  // the 0..1 log scale that also sets the font size.
  var BUCKETS = { lot: 0.75, bit: 0.45 };

  // Page 4 prints exactly this. The loop has the shape of Square One's: no
  // step budget, the test in the while condition, no comments. The first
  // guess and the step size are set inside the function, so the call carries
  // only the data (Carlos, 30 October 2026: fewer things to hold in mind).
  // The last line is the verdict: does 30 days of w fit in 5 GB?
  // tests/logic.test.js checks the text character for character and runs it
  // in Python when python3 is on the machine.
  var CANONICAL_CODE = [
    'def rate(used, days):',
    '    w = 0',
    '    alpha = 0.03',
    '    l = used - w * days',
    '    while abs(l) > 0.001:',
    '        w = w + alpha * l',
    '        l = used - w * days',
    '    return w',
    '',
    'w = rate(3, 17)',
    'w * 30 <= 5'
  ].join('\n');

  var WORDS = {
    up: { lot: 'increase by a lot', bit: 'increase a bit', tiny: 'increase a tiny bit' },
    down: { lot: 'decrease by a lot', bit: 'decrease a bit', tiny: 'decrease a tiny bit' }
  };

  // ===== Reading a guess =====

  // Accepts "0.18", "0,18" (Swiss decimal comma), ".18", "+0.18", "1e-1" and
  // "41'285". Returns { value, decimals } or null for garbage. decimals counts
  // the digits after the point once trailing zeros are gone, and is what the
  // tables use to decide how many digits to show.
  function parseGuess(raw) {
    if (raw === null || raw === undefined) { return null; }
    var s = String(raw);
    s = s.replace(/[\s\u00A0\u2009\u202F'\u2019_]/g, '');
    s = s.replace(/\u2212/g, '-');
    if (s === '' || s.length > 24) { return null; }
    var commas = s.split(',').length - 1;
    var hasDot = s.indexOf('.') >= 0;
    if (commas > 0 && hasDot) {
      s = s.replace(/,/g, '');
    } else if (commas === 1) {
      s = s.replace(',', '.');
    } else if (commas > 1) {
      return null;
    }
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d{1,3})?$/.test(s)) { return null; }
    var v = Number(s);
    if (!isFinite(v)) { return null; }
    var decimals;
    if (/[eE]/.test(s)) {
      decimals = decimalsOf(v);
    } else {
      var m = /\.(\d*)$/.exec(s);
      decimals = m ? m[1].replace(/0+$/, '').length : 0;
    }
    return { value: v, decimals: decimals };
  }

  function decimalsOf(v) {
    var s = String(Math.abs(v));
    if (/e/i.test(s)) { return 10; }
    var i = s.indexOf('.');
    return i < 0 ? 0 : Math.min(10, s.length - i - 1);
  }

  // ===== Writing a number =====

  function groupThousands(digits) {
    if (digits.length < 4) { return digits; }
    var out = '';
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) { out += THIN; }
      out += digits.charAt(i);
    }
    return out;
  }

  // Splits x into the pieces a table cell needs:
  //   { sign, int, frac }            for ordinary numbers, rounded to dec
  //                                  decimals (trailing zeros trimmed unless
  //                                  opts.keepZeros), thousands grouped
  //   { sci: true, sign, mant, exp } from 1e9 up, as mant x 10^exp
  //   { bad: true, text }            for NaN and the infinities
  // opts.plus puts a "+" on positive numbers. opts.sig asks for at least
  // that many significant digits on numbers below 1, up to opts.maxDec.
  function numParts(x, dec, opts) {
    opts = opts || {};
    if (typeof x !== 'number' || !isFinite(x)) {
      return { bad: true, text: x !== x ? 'NaN' : (x > 0 ? '+inf' : MINUS + 'inf') };
    }
    var a = Math.abs(x);
    var d = dec;
    if (opts.sig && a > 0 && a < 1) {
      var need = Math.ceil(-Math.log(a) / Math.LN10) + opts.sig - 1;
      d = Math.max(d, Math.min(need, opts.maxDec || 8));
    }
    if (a >= 1e9) {
      var e = Math.floor(Math.log(a) / Math.LN10);
      var mant = a / Math.pow(10, e);
      if (Number(mant.toFixed(1)) >= 10) { mant = mant / 10; e += 1; }
      return { sci: true, sign: x < 0 ? MINUS : (opts.plus ? '+' : ''), mant: mant.toFixed(1), exp: e };
    }
    var s = a.toFixed(d);
    var parts = s.split('.');
    var ip = parts[0];
    var fp = parts[1] || '';
    if (!opts.keepZeros) { fp = fp.replace(/0+$/, ''); }
    var zero = /^[0.]*$/.test(ip + fp);
    var sign = '';
    if (x < 0 && !zero) { sign = MINUS; } else if (opts.plus && !zero) { sign = '+'; }
    return { sign: sign, int: groupThousands(ip), frac: fp };
  }

  // Plain text version of numParts, for places that are not table cells.
  function fmt(x, dec, opts) {
    var p = numParts(x, dec, opts);
    if (p.bad) { return p.text; }
    if (p.sci) { return p.sign + p.mant + ' x 10^' + p.exp; }
    return p.sign + p.int + (p.frac ? '.' + p.frac : '');
  }

  // ===== The hint =====

  // Where |loss| sits between lo and hi on a log scale, clamped to 0..1.
  function scaleT(absLoss, lo, hi) {
    if (!(absLoss > 0)) { return 0; }
    var t = (Math.log(absLoss) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
    if (t !== t) { return 0; }
    return t < 0 ? 0 : (t > 1 ? 1 : t);
  }

  function bucketOf(t) {
    if (t >= BUCKETS.lot) { return 'lot'; }
    if (t >= BUCKETS.bit) { return 'bit'; }
    return 'tiny';
  }

  // move > 0: the guess has to go up (it is too small).
  // move < 0: the guess has to come down (it is too large).
  // cal: { win, lo, hi }.
  function hint(move, absLoss, cal) {
    if (absLoss < cal.win) {
      return { dir: 'solved', label: 'SOLVED', words: '', t: 1, size: 'none' };
    }
    var t = scaleT(absLoss, cal.lo, cal.hi);
    var size = bucketOf(t);
    var dir = move > 0 ? 'up' : 'down';
    return {
      dir: dir,
      label: dir === 'up' ? 'TOO SMALL' : 'TOO LARGE',
      words: WORDS[dir][size],
      t: t,
      size: size
    };
  }

  // ===== Round 1 =====

  // The estimate is what 17 days at w would use, in the order the Python
  // writes it: w * days.
  function judgeRate(w, cal) {
    cal = cal || ROUND1;
    var est = w * cal.days;
    var gap = cal.used - est;
    var loss = Math.abs(gap);
    return { w: w, est: est, gap: gap, loss: loss, solved: loss < cal.win, hint: hint(gap, loss, cal) };
  }

  // ===== Round 2: the verdict =====

  // At w GB a day, does the plan last? lasts is the last line of the code,
  // w * 30 <= 5. When it does not, outAfter is how many days the 5 GB last
  // (5 / w) and outDay the day on which they run out.
  function verdict(w, plan) {
    plan = plan || PLAN;
    var total = w * plan.days;
    var lasts = total <= plan.gb;
    var out = {
      w: w, total: total, lasts: lasts, spare: plan.gb - total,
      outAfter: w > 0 ? plan.gb / w : Infinity, outDay: null
    };
    if (!lasts) {
      out.outDay = Math.min(plan.days, Math.max(1, Math.ceil(out.outAfter)));
    }
    return out;
  }

  // The data used by the end of day d at w GB a day.
  function usedBy(w, d) { return w * d; }

  // ===== The machine =====

  // The canonical code of page 4, line for line, with the first guess w and
  // the step size alpha passed in so the run page can change them:
  //   def rate(used, days):
  //       w = 0
  //       alpha = 0.03
  //       l = used - w * days
  //       while abs(l) > 0.001:
  //           w = w + alpha * l
  //           l = used - w * days
  //       return w
  // plus three guards Python does not have: stop when w stops being a
  // finite number, when |w| passes 1e7, or after 1000 steps.
  //
  // rows[k] = { k, w, est, l, upd, next }: the k-th guess, what 17 days of it
  // use, its signed miss, and (when the loop goes round again) the update
  // alpha * l and the next guess. status is 'converged', 'diverged' or
  // 'stalled'.
  function runMachine(used, days, w, alpha, opts) {
    opts = opts || {};
    var tol = opts.tol === undefined ? MACHINE.tol : opts.tol;
    var maxSteps = opts.maxSteps === undefined ? MACHINE.maxSteps : opts.maxSteps;
    var blowUp = opts.blowUp === undefined ? MACHINE.blowUp : opts.blowUp;
    var out = { used: used, days: days, w0: w, alpha: alpha, rows: [], status: 'converged', steps: 0, result: null };
    if (!isFinite(used) || !isFinite(days) || !isFinite(w) || !isFinite(alpha)) {
      out.status = 'diverged';
      return out;
    }
    var l = used - w * days;
    var k = 0;
    out.rows.push({ k: 0, w: w, est: w * days, l: l });
    while (Math.abs(l) > tol) {
      if (k >= maxSteps) { out.status = 'stalled'; break; }
      var upd = alpha * l;
      var nw = w + upd;
      var last = out.rows[out.rows.length - 1];
      last.upd = upd;
      last.next = nw;
      w = nw;
      l = used - w * days;
      k += 1;
      if (!isFinite(w) || !isFinite(l)) {
        out.status = 'diverged';
        break;
      }
      out.rows.push({ k: k, w: w, est: w * days, l: l });
      if (Math.abs(w) > blowUp) {
        out.status = 'diverged';
        break;
      }
    }
    out.steps = k;
    if (out.status === 'converged') { out.result = w; }
    return out;
  }

  // ===== Digits that agree =====

  // How many leading characters two strings share.
  function commonPrefix(a, b) {
    var n = 0;
    while (n < a.length && n < b.length && a.charAt(n) === b.charAt(n)) { n += 1; }
    return n;
  }

  // The machine stops once 17 days of its w miss 3 GB by at most 0.001, so
  // its w is good to about four decimals. It is shown to 4 decimals and the
  // true rate used / days to 7, and the digits they share are the ones lit
  // up. For the canonical call that is 0.1764 against 0.1764706.
  function compareToTruth(result, used, days) {
    var truth = used / days;
    var a = fmt(result, 4, { keepZeros: true });
    var b = fmt(truth, 7, { keepZeros: true });
    return { machine: a, truth: b, match: commonPrefix(a, b), truthValue: truth };
  }

  // A run of agreeing characters counts only once it reaches a significant
  // digit of the truth: "0." alone agrees with every rate below 1.
  function settledPrefix(text, truthText) {
    var n = commonPrefix(text, truthText);
    var first = truthText.search(/[1-9]/);
    if (first < 0 || n <= first) { return 0; }
    return n;
  }

  return {
    THIN: THIN,
    MINUS: MINUS,
    PLAN: PLAN,
    SEEN: SEEN,
    ROUND1: ROUND1,
    RATE0: RATE0,
    MACHINE: MACHINE,
    BUCKETS: BUCKETS,
    CANONICAL_CODE: CANONICAL_CODE,
    WORDS: WORDS,
    parseGuess: parseGuess,
    decimalsOf: decimalsOf,
    groupThousands: groupThousands,
    numParts: numParts,
    fmt: fmt,
    scaleT: scaleT,
    bucketOf: bucketOf,
    hint: hint,
    judgeRate: judgeRate,
    verdict: verdict,
    usedBy: usedBy,
    runMachine: runMachine,
    commonPrefix: commonPrefix,
    compareToTruth: compareToTruth,
    settledPrefix: settledPrefix
  };
}));
