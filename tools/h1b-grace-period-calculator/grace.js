/* H-1B 60-day grace period calculator. Runs in the browser; nothing you enter is sent or stored.
   Rule: 8 CFR 214.1(l)(2), as described by USCIS (Options for Nonimmigrant Workers Following Termination of Employment), as of Oct 2026:
   E-1, E-2, E-3, H-1B, H-1B1, L-1, O-1 and TN workers (and dependents) may keep status for up to 60 consecutive days after employment ends,
   or until the end of the authorized validity period (I-94), whichever is shorter; once during each authorized validity period. The period
   starts the day after employment ends (usually the last day paid) and ends on any departure from the U.S. It is discretionary.
   DHS proposed on Sep 11, 2026 to eliminate it (91 FR 57807, docket USCIS-2026-0364, comments close Nov 10, 2026). Not final as of Oct 2026.
   This is a calendar. USCIS decides. Not legal advice. */
(function (root) {
  'use strict';
  var DAY = 864e5, GRACE = 60, WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var CLASSES = { 'H-1B': 1, 'H-1B1': 1, 'L-1': 1, 'O-1': 1, 'E-1': 1, 'E-2': 1, 'E-3': 1, 'TN': 1 };

  function parseISO(s) {
    var a = String(s || '').split('-');
    if (a.length !== 3 || a[0].length !== 4) return null;
    var t = Date.UTC(+a[0], +a[1] - 1, +a[2]), d = new Date(t);
    return d.getUTCFullYear() === +a[0] && d.getUTCMonth() === +a[1] - 1 && d.getUTCDate() === +a[2] ? t : null;
  }
  function fmt(t) { var d = new Date(t); return WD[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function addDays(t, n) { return t + n * DAY; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function away(date, asof) {
    var n = Math.round((date - asof) / DAY);
    if (n === 0) return { tag: 'today', text: 'Today' };
    if (n < 0) return { tag: 'past', text: plural(-n, 'day') + ' ago' };
    return { tag: 'soon', text: 'In ' + plural(n, 'day') };
  }

  /* cls: visa class. last: last day of employment. i94: I-94 end date or null. used: 'no' | 'yes' | 'unsure' (grace period already
     used during this validity period). abroad: true if outside the U.S. when the job ended. asof: today. Dates are UTC midnight timestamps.
     Returns { status, ... }: status is 'notcovered', 'abroad', 'used', 'expired' (I-94 ended on or before the last day) or 'grace'. */
  function calc(cls, last, i94, used, abroad, asof) {
    if (!CLASSES[cls]) return { status: 'notcovered' };
    if (abroad) return { status: 'abroad' };
    if (used === 'yes') return { status: 'used' };
    if (i94 !== null && i94 !== undefined && i94 <= last) return { status: 'expired', i94: i94 };
    var start = addDays(last, 1), sixty = addDays(last, GRACE), byI94 = i94 !== null && i94 !== undefined && i94 < sixty;
    var end = byI94 ? i94 : sixty, length = Math.round((end - last) / DAY), r = { status: 'grace', cls: cls, start: start, end: end, length: length, byI94: byI94, unsure: used === 'unsure' };
    if (asof < start) r.now = { phase: 'before', days: Math.round((start - asof) / DAY) };
    else if (asof > end) r.now = { phase: 'after', days: Math.round((asof - end) / DAY) };
    else r.now = { phase: 'during', day: Math.round((asof - last) / DAY), left: Math.round((end - asof) / DAY) + 1 };
    r.items = [
      { date: last, title: 'Your last day of employment', note: 'USCIS usually goes by the last day you were paid a salary or wage.' },
      { date: start, title: 'Grace period day 1', note: 'The grace period starts the day after your employment ends. You cannot work during it unless you are otherwise authorized.' }
    ];
    if (i94 !== null && i94 !== undefined) r.items.push({ date: i94, title: 'Your I-94 ends', note: byI94 ? 'Your I-94 ends before day 60, so the grace period ends here.' : 'Your I-94 ends after day 60, so it does not shorten the grace period.' });
    r.items.push({ date: end, title: 'Last day of the grace period (day ' + length + ')', note: 'By this day you need to have a new petition, change of status or other application properly filed, or to leave the U.S. Counting is by when USCIS receives a filing, not when it is mailed.' });
    r.items.sort(function (a, b) { return a.date - b.date; });
    r.items.forEach(function (it) { it.away = away(it.date, asof); });
    return r;
  }

  var api = { parseISO: parseISO, fmt: fmt, calc: calc, addDays: addDays, CLASSES: CLASSES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GracePeriod = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function msg(cls, html) { return '<p class="gp-msg ' + cls + '">' + html + '</p>'; }

  function render(fromButton) {
    var box = $('gp-result'), cls = $('gp-class').value, last = parseISO($('gp-last').value);
    box.className = 'result';
    if (cls !== 'other' && last === null) { if (fromButton) box.className = 'result result-error'; box.innerHTML = '<p>' + (fromButton ? '<strong>One more thing.</strong> ' : '') + 'Enter your last day of employment. This is usually the last day you were paid.</p>'; return; }
    var asof = parseISO($('gp-asof').value) || parseISO(todayISO());
    var r = calc(cls, last, parseISO($('gp-i94').value), $('gp-used').value, $('gp-abroad').value === 'yes', asof), html = '<h2 class="gp-h">Your grace period</h2>';
    if (r.status === 'notcovered') html += msg('gp-bad', '<strong>The 60-day grace period does not cover this status.</strong> It is only for E-1, E-2, E-3, H-1B, H-1B1, L-1, O-1 and TN workers and their dependents. F-1 students on OPT have their own rules: see the <a href="/tools/opt-date-planner/">OPT date planner</a>. For other statuses, ask an immigration attorney.');
    else if (r.status === 'abroad') html += msg('gp-bad', '<strong>The grace period generally does not apply.</strong> USCIS says that if you are outside the U.S. when your employment ends (or your notice period ends before you can return), you do not get a grace period. The grace period also ends on any departure from the U.S.');
    else if (r.status === 'used') html += msg('gp-bad', '<strong>You may not get another grace period.</strong> It is available once during each authorized validity period. A new petition approved for a new employer starts a new validity period, which can come with its own grace period. Ask an immigration attorney about your dates.');
    else if (r.status === 'expired') html += msg('gp-bad', '<strong>Your I-94 ended on ' + esc(fmt(r.i94)) + ', on or before your last day of employment.</strong> The grace period cannot run past the end of your authorized stay. Check the date on your most recent I-94 at <a href="https://i94.cbp.dhs.gov/" rel="noopener">i94.cbp.dhs.gov</a> and talk to an immigration attorney right away.');
    else {
      if (r.now.phase === 'during') html += msg('gp-ok', '<span class="gp-big">' + plural(r.now.left, 'day') + ' left</span>Today is day ' + r.now.day + ' of ' + r.length + '. The grace period ends on <strong>' + esc(fmt(r.end)) + '</strong>' + (r.byI94 ? ', when your I-94 ends' : '') + '.');
      else if (r.now.phase === 'before') html += msg('gp-ok', 'Your grace period starts in ' + plural(r.now.days, 'day') + ' and runs <strong>' + plural(r.length, 'day') + '</strong>, to <strong>' + esc(fmt(r.end)) + '</strong>' + (r.byI94 ? ' (your I-94 ends then)' : '') + '.');
      else html += msg('gp-bad', '<strong>Your grace period ended ' + plural(r.now.days, 'day') + ' ago</strong>, on ' + esc(fmt(r.end)) + '. If nothing was filed for you before then, talk to an immigration attorney right away.');
      if (r.unsure) html += msg('gp-bad', '<strong>Check this.</strong> You were not sure whether you already used a grace period during this validity period. If you did, you may not get another one.');
      html += '<ol class="gp-list">' + r.items.map(function (it) {
        return '<li class="gp-' + it.away.tag + '"><div class="gp-top"><span class="gp-date">' + esc(fmt(it.date)) + '</span><span class="gp-chip gp-c-' + it.away.tag + '">' + esc(it.away.text) + '</span></div><div class="gp-title">' + esc(it.title) + '</div><div class="small">' + esc(it.note) + '</div></li>';
      }).join('') + '</ol>';
      html += '<p class="small">Up to 60 days is the most you can get. USCIS can shorten or refuse the grace period at its discretion, and leaving the U.S. ends it.</p>';
    }
    box.innerHTML = html;
  }

  function show() {
    render(true);
    var box = $('gp-result');
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('gp-form'); if (!form) return;
    $('gp-asof').value = todayISO();
    ['gp-class', 'gp-last', 'gp-i94', 'gp-used', 'gp-abroad', 'gp-asof'].forEach(function (id) { $(id).addEventListener('change', function () { render(); }); $(id).addEventListener('input', function () { render(); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
    form.addEventListener('reset', function () { setTimeout(function () { $('gp-asof').value = todayISO(); render(); }, 0); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
