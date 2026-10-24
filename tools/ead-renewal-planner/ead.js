/* EAD renewal planner. Runs in the browser; nothing you enter is sent or stored.
   Rules as of Oct 2026: USCIS says you can file a renewal Form I-765 up to 180 days before your EAD expires (USCIS I-765 and EAD pages).
   Renewals filed on or after Oct 30, 2025 get no automatic extension (interim final rule FR 2025-19702, Oct 30, 2025; final rule 2026-20955,
   effective Oct 14, 2026). Not affected: TPS EADs extended by law or Federal Register notice, E and L spouses (work authorized incident to
   status), and F-1 STEM OPT (180-day extension). Renewals filed before Oct 30, 2025 keep any extension they already had.
   The processing time is typed by the visitor from egov.uscis.gov/processing-times because it changes monthly. Not legal advice. */
(function (root) {
  'use strict';
  var DAY = 864e5, WINDOW = 180, CUTOFF = Date.UTC(2025, 9, 30), WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseISO(s) {
    var a = String(s || '').split('-');
    if (a.length !== 3 || a[0].length !== 4) return null;
    var t = Date.UTC(+a[0], +a[1] - 1, +a[2]), d = new Date(t);
    return d.getUTCFullYear() === +a[0] && d.getUTCMonth() === +a[1] - 1 && d.getUTCDate() === +a[2] ? t : null;
  }
  function fmt(t) { var d = new Date(t); return WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function addDays(t, n) { return t + n * DAY; }
  /* Adds whole and half months: 1.5 months is 1 month and 15 days. */
  function addMonths(t, m) { var w = Math.floor(m), d = new Date(t), r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + w, d.getUTCDate()); return addDays(r, Math.round((m - w) * 30)); }
  function days(a, b) { return Math.round((b - a) / DAY); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function away(date, asof) {
    var n = days(asof, date);
    if (n === 0) return { tag: 'today', text: 'Today' };
    if (n < 0) return { tag: 'past', text: plural(-n, 'day') + ' ago' };
    return { tag: 'soon', text: n <= 90 ? 'In ' + plural(n, 'day') : 'In about ' + plural(Math.round(n / 30.4375), 'month') };
  }

  /* cat: 'standard' | 'tps' | 'el' | 'stem'. expires: EAD end date. filed: date USCIS received the renewal, or null if not filed.
     months: USCIS processing time in months, or null. asof: today. Dates are UTC midnight timestamps. */
  function plan(cat, expires, filed, months, asof) {
    if (cat === 'el' || cat === 'stem') return { status: cat };
    var open = addDays(expires, -WINDOW), r = { status: 'plan', cat: cat, expires: expires, open: open, filed: filed, months: months, problems: [] };
    if (filed !== null && filed < open) r.problems.push('Your filing date is more than 180 days before your card expires. USCIS generally says to file within the 180 days, so check your receipt notice.');
    if (filed !== null && filed > expires) r.problems.push('You filed after your card expired. This is not a renewal on time: you cannot work until the new card is approved.');
    r.preCutoff = filed !== null && filed < CUTOFF;
    r.items = [
      { date: open, title: 'Earliest day to file your renewal', note: 'USCIS says you can file Form I-765 to renew up to 180 days before your card expires. Filing early does not shorten your current card.' },
      { date: expires, title: 'Your current EAD expires', note: cat === 'tps' ? 'TPS EADs can be extended automatically by law or by a Federal Register notice for your country. Check USCIS’s TPS page for your country before this date.' : (r.preCutoff ? 'You filed before Oct 30, 2025, so an automatic extension you already had still counts. Check your receipt notice.' : 'For renewals filed on or after Oct 30, 2025 there is no automatic extension. Unless your new card is approved, you have to stop working at the end of this day.') }
    ];
    if (filed !== null) r.items.push({ date: filed, title: 'USCIS received your renewal', note: 'The receipt date on your Form I-797C notice.' });
    if (months !== null) {
      r.latest = addMonths(expires, -months);
      var from = filed !== null ? filed : Math.max(asof, open);
      r.decision = addMonths(from, months);
      r.gap = days(expires, r.decision);
      r.lateWindow = r.latest < open;
      if (filed === null && r.lateWindow) r.problems.push('At this processing time you would need to file by ' + fmt(r.latest) + ' to have a decision before your card expires, but that is before the 180-day filing window opens. File as soon as the window opens.');
      else if (filed === null) r.items.push({ date: r.latest, title: 'File by this day to have a decision before your card expires', note: 'Based on the processing time you entered. Processing times change every month.' });
      r.items.push({ date: r.decision, title: filed !== null ? 'Estimated decision (from your filing date)' : 'Estimated decision if you file ' + (asof > open ? 'today' : 'on the first day'), note: 'Your filing date plus the processing time you entered. A real decision can come sooner or later.' });
    }
    r.items.sort(function (a, b) { return a.date - b.date; });
    r.items.forEach(function (it) { it.away = away(it.date, asof); });
    return r;
  }

  var api = { parseISO: parseISO, fmt: fmt, plan: plan, addMonths: addMonths, addDays: addDays, CUTOFF: CUTOFF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.EADPlanner = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function msg(cls, html) { return '<p class="ead-msg ' + cls + '">' + html + '</p>'; }

  function render(fromButton) {
    var box = $('ead-result'), cat = $('ead-cat').value, expires = parseISO($('ead-exp').value);
    box.className = 'result';
    if (cat === 'el') { box.innerHTML = msg('ead-ok', '<strong>You may not need an EAD to work.</strong> E and L spouses are work authorized because of their status. An I-94 marked as an E or L spouse can be shown to an employer. You can still renew the card if you want one, but there is no automatic extension question for you.'); return; }
    if (cat === 'stem') { box.innerHTML = msg('ead-ok', '<strong>STEM OPT has its own rules.</strong> If you file your STEM OPT extension on time, your work authorization can continue for up to 180 days while it is pending. Use the <a href="/tools/opt-date-planner/">OPT and STEM OPT date planner</a> for your dates.'); return; }
    if (expires === null) { if (fromButton) box.className = 'result result-error'; box.innerHTML = '<p>' + (fromButton ? '<strong>One more thing.</strong> ' : '') + 'Enter the date your current EAD expires. It is printed on the card as &ldquo;Card expires&rdquo;.</p>'; return; }
    var asof = parseISO($('ead-asof').value) || parseISO(todayISO()), m = parseFloat($('ead-months').value);
    var r = plan(cat, expires, parseISO($('ead-filed').value), isFinite(m) && m > 0 && m <= 60 ? m : null, asof), html = '<h2 class="ead-h">Your renewal timeline</h2>';
    r.problems.forEach(function (p) { html += msg('ead-bad', '<strong>Check this.</strong> ' + esc(p)); });
    if (r.decision !== undefined && cat !== 'tps' && !r.preCutoff) {
      if (r.gap > 0) html += msg('ead-bad', '<strong>Possible gap of about ' + plural(r.gap, 'day') + '.</strong> At the processing time you entered, your new card would come after your current one expires on ' + esc(fmt(expires)) + '. Without an automatic extension you would have to stop working in between. Talk to your employer early, and ask an immigration attorney whether you can request faster processing.');
      else html += msg('ead-ok', '<strong>No gap expected.</strong> At the processing time you entered, a decision would come about ' + plural(-r.gap, 'day') + ' before your card expires. Processing times change, so file as early as you can.');
    } else if (r.decision === undefined) html += '<p class="small">Add the USCIS processing time to see whether your new card is likely to arrive before the old one expires.</p>';
    html += '<ol class="ead-list">' + r.items.map(function (it) {
      return '<li class="ead-' + it.away.tag + '"><div class="ead-top"><span class="ead-date">' + esc(fmt(it.date)) + '</span><span class="ead-chip ead-c-' + it.away.tag + '">' + esc(it.away.text) + '</span></div><div class="ead-title">' + esc(it.title) + '</div><div class="small">' + esc(it.note) + '</div></li>';
    }).join('') + '</ol>';
    box.innerHTML = html;
  }

  function show() {
    render(true);
    var box = $('ead-result');
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('ead-form'); if (!form) return;
    $('ead-asof').value = todayISO();
    ['ead-cat', 'ead-exp', 'ead-filed', 'ead-months', 'ead-asof'].forEach(function (id) { $(id).addEventListener('change', function () { render(); }); $(id).addEventListener('input', function () { render(); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
    form.addEventListener('reset', function () { setTimeout(function () { $('ead-asof').value = todayISO(); render(); }, 0); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
