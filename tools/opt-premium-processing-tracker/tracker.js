/* OPT premium processing day tracker. Runs in the browser; nothing you enter is sent or stored.
   USCIS says it will act on a premium processing request for F-1 OPT / STEM OPT (Form I-765) within 30 business days,
   not counting weekends or federal holidays. The count starts when USCIS receives Form I-907.
   This is an estimate from a calendar. USCIS's own count is the one that matters. */
(function (root) {
  'use strict';
  var DAYS = 30, DAY = 864e5;
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseISO(s) {
    var a = String(s || '').split('-');
    if (a.length !== 3 || a[0].length !== 4) return null;
    var t = Date.UTC(+a[0], +a[1] - 1, +a[2]), d = new Date(t);
    return d.getUTCFullYear() === +a[0] && d.getUTCMonth() === +a[1] - 1 && d.getUTCDate() === +a[2] ? t : null;
  }
  function fmt(t) { var d = new Date(t); return WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function fmtShort(t) { var d = new Date(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // nth weekday (0 Sun .. 6 Sat) of a month; n = -1 for the last one.
  function nth(y, m, wd, n) {
    if (n > 0) { var f = new Date(Date.UTC(y, m, 1)).getUTCDay(); return Date.UTC(y, m, 1 + ((wd - f + 7) % 7) + (n - 1) * 7); }
    var l = new Date(Date.UTC(y, m + 1, 0)); return Date.UTC(y, m, l.getUTCDate() - ((l.getUTCDay() - wd + 7) % 7));
  }
  // Federal holidays for a year, with the Friday or Monday they are observed when they fall on a weekend.
  var cache = {};
  function holidays(y) {
    if (cache[y]) return cache[y];
    var fixed = [[0, 1], [5, 19], [6, 4], [10, 11], [11, 25]], list = [], out = {};
    fixed.forEach(function (x) {
      var t = Date.UTC(y, x[0], x[1]), wd = new Date(t).getUTCDay();
      list.push(wd === 6 ? t - DAY : wd === 0 ? t + DAY : t);
    });
    list.push(nth(y, 0, 1, 3), nth(y, 1, 1, 3), nth(y, 4, 1, -1), nth(y, 8, 1, 1), nth(y, 9, 1, 2), nth(y, 10, 4, 4));
    list.forEach(function (t) { out[t] = true; });
    cache[y] = out; return out;
  }
  function isHoliday(t) {
    var y = new Date(t).getUTCFullYear();
    return !!(holidays(y)[t] || holidays(y + 1)[t] || holidays(y - 1)[t]);
  }
  function isBusiness(t, skipHolidays) {
    var wd = new Date(t).getUTCDay();
    return wd !== 0 && wd !== 6 && !(skipHolidays !== false && isHoliday(t));
  }

  // Business days after the start date (the start date is day 0), up to and including "until".
  function elapsed(start, until, skipHolidays) {
    var n = 0;
    for (var t = start + DAY; t <= until; t += DAY) if (isBusiness(t, skipHolidays)) n++;
    return n;
  }
  // The dates of business day 1 to 30 after the start date.
  function schedule(start, skipHolidays) {
    var out = [], t = start;
    while (out.length < DAYS) { t += DAY; if (isBusiness(t, skipHolidays)) out.push(t); }
    return out;
  }

  /* start: when USCIS received Form I-907. rfe: optional date USCIS received a response to a request for evidence or notice of intent to deny.
     asof: the day to count to. All are UTC midnight timestamps. */
  function track(start, rfe, asof) {
    var from = rfe !== null && rfe !== undefined && rfe >= start ? rfe : start, restarted = from !== start;
    var sched = schedule(from), alt = schedule(from, false), deadline = sched[DAYS - 1];
    var used = asof < from ? 0 : elapsed(from, asof), status;
    if (asof < from) status = 'notstarted';
    else if (used >= DAYS && asof > deadline) status = 'past';
    else if (asof === deadline) status = 'last';
    else if (used >= DAYS - 5) status = 'final';
    else status = 'inprogress';
    return {
      from: from, restarted: restarted, sched: sched, deadline: deadline, altDeadline: alt[DAYS - 1],
      used: Math.min(used, DAYS), remaining: Math.max(DAYS - used, 0),
      calElapsed: Math.max(Math.round((asof - from) / DAY), 0), calLeft: Math.round((deadline - asof) / DAY),
      calTotal: Math.round((deadline - from) / DAY), status: status, asof: asof
    };
  }

  var api = { parseISO: parseISO, fmt: fmt, holidays: holidays, isHoliday: isHoliday, isBusiness: isBusiness, elapsed: elapsed, schedule: schedule, track: track, DAYS: DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OPTTracker = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  var HEAD = {
    notstarted: ['The count has not started yet', 'The 30 business days begin after the date USCIS receives your Form I-907.', 'wait'],
    inprogress: ['In progress', '', 'go'],
    final: ['In the final stretch', 'Most of the 30 business days have passed.', 'go'],
    last: ['Today is business day 30', 'This is the last day of the premium processing period. If you have not seen an action by the end of the day, see what to do below.', 'go'],
    past: ['Past 30 business days', 'USCIS has used its 30 business days by this count. Check your case status online first, because the notice may be on its way. If nothing has happened, see what to do below.', 'late']
  };

  function strip(t) {
    var out = '<ol class="opt-strip" aria-label="The 30 business days">';
    t.sched.forEach(function (d, i) {
      var cls = d < t.asof || (d === t.asof) ? (d === t.asof ? 'opt-now' : 'opt-done') : 'opt-todo';
      if (t.status === 'notstarted') cls = 'opt-todo';
      out += '<li class="' + cls + '" title="' + esc(fmt(d)) + '"><span class="opt-n">' + (i + 1) + '</span></li>';
    });
    return out + '</ol>';
  }

  function render() {
    var start = parseISO($('opt-recv').value), box = $('opt-result');
    if (start === null) { box.innerHTML = '<p>Enter the date USCIS received your Form I-907 to see your count. You will find it on the receipt notice (Form I-797C), as the &ldquo;Received date&rdquo;.</p>'; return; }
    var rfe = parseISO($('opt-rfe').value), asof = parseISO($('opt-asof').value);
    if (asof === null) asof = parseISO(todayISO());
    var t = track(start, rfe, asof), h = HEAD[t.status];
    var msg = h[1];
    if (t.status === 'inprogress') msg = 'You are on business day ' + t.used + ' of ' + DAYS + '. ' + plural(t.remaining, 'business day') + ' to go.';
    var html = '<h2 class="opt-h">' + esc(h[0]) + '</h2>';
    html += '<div class="opt-big"><div><span class="small">Business days used</span><br><strong>' + t.used + '</strong> of ' + DAYS + '</div>' +
      '<div><span class="small">Calendar days since ' + (t.restarted ? 'restart' : 'receipt') + '</span><br><strong>' + (t.status === 'notstarted' ? 0 : t.calElapsed) + '</strong></div>' +
      '<div><span class="small">Business day 30 falls on</span><br><strong class="opt-date">' + esc(fmt(t.deadline)) + '</strong></div></div>';
    if (msg) html += '<p class="opt-msg opt-' + h[2] + '">' + esc(msg) + '</p>';
    html += strip(t);
    html += '<p class="small">Each box is one business day. The 30 business days are about ' + plural(t.calTotal, 'calendar day') + ' long this time' +
      (t.status === 'notstarted' || t.calLeft <= 0 ? '' : ', and ' + plural(t.calLeft, 'calendar day') + ' are left') + '.</p>';
    if (t.restarted) html += '<p class="small">Counting from ' + esc(fmt(t.from)) + ', when USCIS received your response, not from ' + esc(fmt(start)) + '.</p>';
    if (t.altDeadline !== t.deadline) html += '<p class="small">This count skips federal holidays. If USCIS counted every weekday, the date would be ' + esc(fmt(t.altDeadline)) + '.</p>';
    html += '<details class="opt-details"><summary>Show every business day</summary><table class="result-table"><thead><tr><th scope="col">Day</th><th scope="col">Date</th></tr></thead><tbody>' +
      t.sched.map(function (d, i) { return '<tr' + (d === t.asof ? ' class="opt-trnow"' : '') + '><th scope="row">' + (i + 1) + '</th><td>' + esc(fmt(d)) + (d === t.asof ? ' (today)' : '') + '</td></tr>'; }).join('') + '</tbody></table></details>';
    box.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('opt-form');
    if (!form) return;
    $('opt-asof').value = todayISO();
    ['opt-recv', 'opt-rfe', 'opt-asof'].forEach(function (id) { $(id).addEventListener('change', render); $(id).addEventListener('input', render); });
    form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
    form.addEventListener('reset', function () { setTimeout(function () { $('opt-asof').value = todayISO(); render(); }, 0); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
