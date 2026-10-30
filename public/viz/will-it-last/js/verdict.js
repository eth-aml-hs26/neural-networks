/* Will it last? Round 2, the verdict (page 2). window.VerdictPage.
 *
 * The plan gives 5 GB for 30 days and the rate from round 1 is w GB a day.
 * The room decides: A, it lasts, or B, it runs out. The host locks the room's
 * answer (a click, or the keys a and b), then plays the month: from day 17 to
 * day 30 one brick a day lands on the pile in the phone and one day lights up
 * in the calendar. On the day the 5 GB are gone the phone says so, a snail
 * takes over and the remaining days crawl. At day 30 the verdict comes up,
 * the locked answer is judged, and the calculator strip shows the two lines
 * that decide it: 30 x w against 5 GB, and 5 / w, the days the 5 GB last.
 *
 * The rate is the winning guess of round 1, or 0.1765 before round 1 has been
 * won. Its number can be clicked and retyped (Enter keeps, Escape cancels),
 * for a "what if": at 0.15 GB a day the plan lasts.
 */
(function () {
  'use strict';

  var S = window.WillItLast;
  var UI = window.UI;
  var Views = window.Views;

  var STEP_MS = 430;

  function VerdictPage(root, opts) {
    var self = this;
    this.root = root;
    this.opts = opts || {};
    this.plan = S.PLAN;
    this.start = S.SEEN.days;
    this.w = S.RATE0;
    this.wDec = S.decimalsOf(S.RATE0);
    this.source = '';
    this.edited = false;
    this.answer = null;
    this.day = this.start;
    this.playing = false;
    this.finished = false;
    this.timer = 0;
    this.editing = null;

    this.panel = root.querySelector('.view-panel');
    this.view = new Views.MonthView(root.querySelector('.month-view'), { id: 'month' });
    this.rateBtn = root.querySelector('.rate-val');
    this.rateSrc = root.querySelector('.rate-src');
    this.cal = root.querySelector('.calendar');
    this.banner = root.querySelector('.verdict-banner');
    this.calc = root.querySelector('.calc');
    this.playBtn = root.querySelector('[data-act="play-month"]');
    this.answers = UI.$$('.answer', root);

    this.buildCalendar();
    this.answers.forEach(function (b) {
      b.addEventListener('click', function () { self.lock(b.getAttribute('data-answer')); });
    });
    this.playBtn.addEventListener('click', function () { self.toggle(); });
    root.querySelector('[data-act="rewind"]').addEventListener('click', function () { self.rewind(); });
    this.rateBtn.addEventListener('click', function () { self.editRate(); });
    this.showRate();
    this.rewind();
  }

  // ===== the calendar =====

  VerdictPage.prototype.buildCalendar = function () {
    var html = '';
    for (var d = 1; d <= this.plan.days; d++) {
      html += '<div class="day" data-d="' + d + '"><span class="d-num">' + d + '</span><span class="d-icon"></span></div>';
    }
    this.cal.innerHTML = html;
    this.cells = UI.$$('.day', this.cal);
  };

  VerdictPage.prototype.paintCalendar = function (pop) {
    var v = this.v;
    var self = this;
    this.cells.forEach(function (c, i) {
      var d = i + 1;
      var out = !v.lasts && d >= v.outDay && d <= self.day;
      var cls = 'day';
      if (d > self.day) { cls += ' future'; } else if (d < self.start) { cls += ' past'; } else if (d === self.start) { cls += ' today'; } else { cls += ' played'; }
      if (out) { cls += ' out'; }
      if (d === self.day && self.day > self.start && !self.finished) { cls += ' cur'; }
      if (pop && d === self.day && !UI.still) { cls += ' pop'; }
      if (d === v.outDay && out) { cls += ' first-out'; }
      c.className = cls;
      var icon = c.querySelector('.d-icon');
      var want = out ? 'snail' : '';
      if (icon.getAttribute('data-k') !== want) {
        icon.setAttribute('data-k', want);
        icon.innerHTML = out ? UI.icon.snail() : '';
      }
    });
  };

  // ===== the rate =====

  VerdictPage.prototype.showRate = function () {
    this.rateBtn.textContent = S.fmt(this.w, Math.max(this.wDec, 1));
    this.rateSrc.textContent = this.source === 'round1' ? 'from round 1' : '';
  };

  // Round 1 was won with w: round 2 takes it, unless the host has typed a
  // rate of their own here.
  VerdictPage.prototype.fromRound1 = function (w, dec) {
    if (this.edited) { return; }
    if (w === null) {
      this.setRate(S.RATE0, S.decimalsOf(S.RATE0), '');
      return;
    }
    this.setRate(w, dec, 'round1');
  };

  VerdictPage.prototype.setRate = function (w, dec, source) {
    var changed = w !== this.w;
    this.w = w;
    this.wDec = dec;
    this.source = source;
    this.showRate();
    if (changed) { this.rewind(); }
  };

  VerdictPage.prototype.editRate = function () {
    var self = this;
    if (this.editing) { return; }
    var btn = this.rateBtn;
    var input = document.createElement('input');
    input.className = 'rate-input';
    input.value = btn.textContent;
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-label', 'w in GB a day');
    input.style.width = Math.max(4, input.value.length + 1) + 'ch';
    btn.style.display = 'none';
    btn.parentNode.insertBefore(input, btn);
    this.editing = input;
    var closed = false;
    function close(commit) {
      if (closed) { return true; }
      if (commit) {
        var p = S.parseGuess(input.value);
        if (!p || !(p.value > 0) || p.value > 10) {
          UI.shake(input);
          return false;
        }
        closed = true;
        self.edited = true;
        self.setRate(p.value, Math.min(p.decimals, 8), 'host');
      }
      closed = true;
      self.editing = null;
      if (input.parentNode) { input.parentNode.removeChild(input); }
      btn.style.display = '';
      return true;
    }
    input.addEventListener('input', function () {
      input.style.width = Math.max(4, input.value.length + 1) + 'ch';
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); close(true); }
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
    });
    input.addEventListener('blur', function () {
      if (!close(true)) { close(false); }
    });
    input.focus();
    input.select();
  };

  // ===== the room's answer =====

  VerdictPage.prototype.lock = function (answer) {
    if (answer !== 'lasts' && answer !== 'out') { return; }
    this.answer = this.answer === answer && !this.finished ? null : answer;
    this.paintAnswers();
    if (this.finished) { this.showVerdict(false); }
  };

  VerdictPage.prototype.paintAnswers = function () {
    var self = this;
    var v = this.v;
    this.answers.forEach(function (b) {
      var a = b.getAttribute('data-answer');
      var cls = 'answer loz';
      if (a === self.answer) { cls += ' locked'; }
      if (self.finished) {
        var right = (a === 'out') === !v.lasts;
        if (right) { cls += ' right'; } else if (a === self.answer) { cls += ' wrong'; }
      }
      b.className = cls;
      b.setAttribute('aria-pressed', a === self.answer ? 'true' : 'false');
      b.querySelector('.ans-tag').textContent = a === self.answer ? 'Final answer' : 'Right answer';
    });
  };

  // ===== playing the month =====

  VerdictPage.prototype.rewind = function () {
    this.pause();
    this.v = S.verdict(this.w, this.plan);
    this.day = this.start;
    this.finished = false;
    this.view.setRate(this.w);
    this.view.setDay(this.day, false);
    this.view.setNote('', '');
    this.panel.classList.remove('out-flash');
    this.paintCalendar(false);
    this.paintAnswers();
    this.banner.innerHTML = '';
    this.banner.className = 'verdict-banner';
    this.calc.innerHTML = '';
    this.calc.className = 'calc';
    this.playBtn.classList.remove('hidden');
  };

  VerdictPage.prototype.step = function (animate) {
    if (this.day >= this.plan.days) { return false; }
    var wasOut = !this.v.lasts && this.day >= this.v.outDay;
    this.day += 1;
    var anim = animate && !UI.still;
    this.view.setDay(this.day, anim);
    this.paintCalendar(anim);
    var isOut = !this.v.lasts && this.day >= this.v.outDay;
    if (isOut && !wasOut && anim) {
      var p = this.panel;
      p.classList.remove('out-flash');
      void p.offsetWidth;
      p.classList.add('out-flash');
    }
    if (this.day >= this.plan.days) { this.finish(anim); }
    return true;
  };

  VerdictPage.prototype.play = function () {
    var self = this;
    if (this.finished) { this.rewind(); }
    this.playing = true;
    this.playBtn.classList.add('playing');
    function tick() {
      if (!self.playing) { return; }
      if (!self.step(true) || self.day >= self.plan.days) {
        self.pause();
        return;
      }
      self.timer = window.setTimeout(tick, STEP_MS);
    }
    this.timer = window.setTimeout(tick, UI.still ? 0 : 120);
  };

  VerdictPage.prototype.pause = function () {
    this.playing = false;
    window.clearTimeout(this.timer);
    this.playBtn.classList.remove('playing');
  };

  VerdictPage.prototype.toggle = function () {
    if (this.playing) { this.pause(); } else { this.play(); }
  };

  VerdictPage.prototype.toEnd = function () {
    this.pause();
    if (this.finished) { return; }
    this.day = this.plan.days - 1;
    this.step(false);
    this.finish(!UI.still);
  };

  VerdictPage.prototype.finish = function (animate) {
    if (this.finished) { return; }
    this.finished = true;
    this.pause();
    this.paintCalendar(false);
    this.playBtn.classList.add('hidden');
    this.showVerdict(animate);
  };

  // The banner, the judged answer and the calculator strip.
  VerdictPage.prototype.showVerdict = function (animate) {
    var v = this.v;
    var plan = this.plan;
    var wText = S.fmt(this.w, Math.max(this.wDec, 1));
    var pop = animate && !UI.still ? ' pop' : '';
    var judged = '';
    if (this.answer) {
      var right = (this.answer === 'out') === !v.lasts;
      judged = '<span class="judge ' + (right ? 'right' : 'wrong') + '">' +
        (right ? UI.icon.check() + 'Correct' : UI.icon.cross() + 'Wrong') + '</span>';
    }
    if (v.lasts) {
      this.banner.className = 'verdict-banner lasts' + pop;
      this.banner.innerHTML = '<div class="vb-main">' + UI.icon.check('vb-icon') + '<span>IT LASTS</span></div>' +
        '<div class="vb-sub">' + S.fmt(v.spare, 2) + ' GB to spare on day ' + plan.days + '</div>' + judged;
      this.view.setNote('It lasts', 'solved');
    } else {
      this.banner.className = 'verdict-banner out' + pop;
      this.banner.innerHTML = '<div class="vb-main">' + UI.icon.snail('vb-icon') + '<span>OUT ON DAY ' + v.outDay + '</span></div>' +
        '<div class="vb-sub">' + S.fmt(v.total - plan.gb, 2) + ' GB short by day ' + plan.days + '</div>' + judged;
      this.view.setNote('Out of data on day ' + v.outDay, 'out');
    }
    // the calculator strip: the two lines that decide it
    var cmp = v.lasts ? '&le;' : '&gt;';
    this.calc.className = 'calc show' + pop;
    this.calc.innerHTML =
      '<div class="calc-line"><span class="ck">' + plan.days + ' &times; ' + wText + '</span><span class="cv">= ' + S.fmt(v.total, 4) +
        ' GB</span><span class="cc ' + (v.lasts ? 'lasts' : 'out') + '">' + cmp + ' ' + plan.gb + ' GB</span></div>' +
      '<div class="calc-line"><span class="ck">' + plan.gb + ' &divide; ' + wText + '</span><span class="cv">= ' +
        S.fmt(v.outAfter, 2) + ' days</span><span class="cc ' + (v.lasts ? 'lasts' : 'out') + '">' + (v.lasts ? '&ge;' : '&lt;') + ' ' + plan.days + ' days</span></div>';
    this.paintAnswers();
    if (animate && this.answer && (this.answer === 'out') === !v.lasts) {
      this.view.celebrate();
      UI.celebrate(this.panel);
    }
  };

  // ===== page life =====

  VerdictPage.prototype.enter = function () {};

  VerdictPage.prototype.leave = function () {
    this.pause();
    if (this.editing) { this.editing.blur(); }
  };

  window.VerdictPage = VerdictPage;
}());
