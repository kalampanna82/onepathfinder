/* OPT and STEM OPT date planner. Runs in the browser; nothing you enter is sent or stored.
   Rules are from the USCIS Policy Manual, Volume 2, Part F, Chapter 5 (Practical Training) and 8 CFR 214.2(f), as of Oct 2026:
   apply from 90 days before to 60 days after the program end date; start date up to 60 days after the program end date; 12 months of OPT;
   60 days after the work permit ends; 90 days of unemployment on OPT and 150 in total with STEM OPT; STEM OPT filed from 90 days before the
   OPT work permit ends and before it ends; 24 months; up to 180 days of automatic extension if filed in time.
   This is a calendar. Your school's DSO and USCIS decide your actual dates. Not legal advice. */
(function (root) {
  'use strict';
  var DAY = 864e5, WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseISO(s) {
    var a = String(s || '').split('-');
    if (a.length !== 3 || a[0].length !== 4) return null;
    var t = Date.UTC(+a[0], +a[1] - 1, +a[2]), d = new Date(t);
    return d.getUTCFullYear() === +a[0] && d.getUTCMonth() === +a[1] - 1 && d.getUTCDate() === +a[2] ? t : null;
  }
  function fmt(t) { var d = new Date(t); return WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function addDays(t, n) { return t + n * DAY; }
  function addMonths(t, n) { var d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function away(date, asof) {
    var n = Math.round((date - asof) / DAY);
    if (n === 0) return { tag: 'today', text: 'Today' };
    if (n < 0) return { tag: 'past', text: plural(-n, 'day') + ' ago' };
    return { tag: 'soon', text: n <= 90 ? 'In ' + plural(n, 'day') : 'In about ' + plural(Math.round(n / 30.4375), 'month') };
  }

  /* end: program end date. start: OPT start date you will request (default: the day after the program end date).
     used: days of unemployment so far. stem: include STEM OPT dates. asof: today. All dates are UTC midnight timestamps. */
  function plan(end, start, used, stem, asof) {
    var assumed = start === null || start === undefined;
    if (assumed) start = addDays(end, 1);
    var problems = [];
    if (start < end) problems.push('Your start date is before your program end date. Post-completion OPT cannot start before the program ends.');
    if (start > addDays(end, 60)) problems.push('Your start date is more than 60 days after your program end date. USCIS does not allow that.');
    var optEnd = addDays(addMonths(start, 12), -1);
    var items = [
      { id: 'open', date: addDays(end, -90), title: 'OPT application window opens', note: 'The earliest day USCIS can receive your OPT application (Form I-765). Your school’s DSO has to recommend OPT in SEVIS and give you a new I-20 first.' },
      { id: 'start', date: start, title: assumed ? 'Your OPT starts (we assumed the day after your program ends)' : 'Your OPT starts', note: 'The start date you request. It has to be within 60 days after your program end date, and cannot be before it.' },
      { id: 'close', date: addDays(end, 60), title: 'Last day to apply for OPT', note: 'USCIS must receive your application by this day, and within 30 days after your DSO recommends OPT in SEVIS. Ask your DSO early.' },
      { id: 'optend', date: optEnd, title: 'Your OPT work permit ends', note: '12 months from your start date, if your application is approved for the full period.' },
      { id: 'grace', date: addDays(optEnd, 60), title: 'Your 60-day grace period ends', note: 'After your work permit ends you can stay in F-1 status for 60 days, but you cannot work. Use it to leave, transfer, change status or start a new program.' }
    ];
    if (stem) {
      var stemEnd = addDays(addMonths(addDays(optEnd, 1), 24), -1);
      items.push(
        { id: 'stemopen', date: addDays(optEnd, -90), title: 'STEM OPT: earliest day to file', note: 'USCIS can receive your STEM OPT application from 90 days before your OPT work permit ends. Get the STEM I-20 from your DSO first. USCIS must receive your application within 60 days after the DSO recommends it.' },
        { id: 'stemclose', date: optEnd, title: 'STEM OPT: USCIS must receive it before this date', note: 'File before your OPT work permit ends. Counting is by when USCIS receives it, not when you mail it. Leave time for mail.' },
        { id: 'auto', date: addDays(optEnd, 180), title: 'If you filed in time, you may keep working until this date at the latest', note: 'Work authorization is extended automatically for up to 180 days after your OPT ends, or until USCIS decides your STEM OPT application, whichever comes first.' },
        { id: 'stemend', date: stemEnd, title: 'STEM OPT would end (24 months)', note: 'A fixed 24 months in a row starting the day after your OPT ends, if approved.' }
      );
    }
    items.sort(function (a, b) { return a.date - b.date; });
    items.forEach(function (it) { it.away = away(it.date, asof); });
    var u = { used: used, optLeft: 90 - used, totalLeft: 150 - used };
    return { items: items, problems: problems, assumed: assumed, start: start, optEnd: optEnd, unemployment: u };
  }

  var api = { parseISO: parseISO, fmt: fmt, plan: plan, addMonths: addMonths, addDays: addDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OPTPlanner = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function render(fromButton) {
    var box = $('pl-result'), end = parseISO($('pl-end').value);
    box.className = 'result';
    if (end === null) { if (fromButton) box.className = 'result result-error'; box.innerHTML = '<p>' + (fromButton ? '<strong>One more thing.</strong> ' : '') + 'Enter your program end date. It is on your I-20, in section 5 (&ldquo;Program of study&rdquo;), next to &ldquo;Normal program length&rdquo; and &ldquo;Program end date&rdquo;.</p>'; return; }
    var start = parseISO($('pl-start').value), asof = parseISO($('pl-asof').value) || parseISO(todayISO());
    var used = parseInt($('pl-used').value, 10); if (!isFinite(used) || used < 0) used = 0;
    var r = plan(end, start, used, $('pl-stem').value === 'yes', asof), html = '<h2 class="pl-h">Your OPT timeline</h2>';
    r.problems.forEach(function (p) { html += '<p class="pl-msg pl-bad"><strong>Check this.</strong> ' + esc(p) + '</p>'; });
    html += '<ol class="pl-list">' + r.items.map(function (it) {
      return '<li class="pl-' + it.away.tag + '"><div class="pl-top"><span class="pl-date">' + esc(fmt(it.date)) + '</span><span class="pl-chip pl-c-' + it.away.tag + '">' + esc(it.away.text) + '</span></div><div class="pl-title">' + esc(it.title) + '</div><div class="small">' + esc(it.note) + '</div></li>';
    }).join('') + '</ol>';
    var u = r.unemployment;
    html += '<h3 class="pl-h3">Unemployment days</h3><p>' + (u.optLeft >= 0 ? 'You have <strong>' + plural(u.optLeft, 'day') + '</strong> left of the 90 allowed during your first 12 months of OPT.' : 'You are <strong>' + plural(-u.optLeft, 'day') + ' over</strong> the 90 allowed on OPT. Talk to your DSO right away.') + '</p>';
    if ($('pl-stem').value === 'yes') html += '<p>' + (u.totalLeft >= 0 ? 'Across OPT and STEM OPT together you have <strong>' + plural(u.totalLeft, 'day') + '</strong> left of the 150 allowed.' : 'You are <strong>' + plural(-u.totalLeft, 'day') + ' over</strong> the 150 allowed across OPT and STEM OPT. Talk to your DSO right away.') + '</p>';
    html += '<p class="small">Days without qualifying work count toward these limits. Ask your DSO how your days are counted and what you need to report.</p>';
    box.innerHTML = html;
  }

  function show() {
    render(true);
    var box = $('pl-result');
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('pl-form'); if (!form) return;
    $('pl-asof').value = todayISO();
    ['pl-end', 'pl-start', 'pl-used', 'pl-asof', 'pl-stem'].forEach(function (id) { $(id).addEventListener('change', function () { render(); }); $(id).addEventListener('input', function () { render(); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
    form.addEventListener('reset', function () { setTimeout(function () { $('pl-asof').value = todayISO(); render(); }, 0); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
