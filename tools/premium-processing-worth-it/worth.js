/* Premium processing vs regular processing. Runs in the browser; nothing you enter is sent or stored.
   Premium timeframes and fees are from 8 CFR 106.4 and the USCIS fee schedule (G-1055), as of Oct 2026.
   Regular processing time comes from processing.json (the number USCIS shows: 80% of cases are completed within this many months) or is typed in by the visitor, because it changes every month and by office.
   Uses the business-day counter from the OPT premium processing tracker (tracker.js). Not legal advice. */
(function (root) {
  'use strict';
  var T = typeof require === 'function' ? require('../opt-premium-processing-tracker/tracker.js') : root.OPTTracker;
  var DAY = 864e5, MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fee and business days per category. Re-check against 8 CFR 106.4 and G-1055 when USCIS changes them.
  var CATS = [
    { id: 'h1b', name: 'H-1B work visa (Form I-129)', fee: 2965, days: 15 },
    { id: 'i129', name: 'Other I-129 work visas: L-1, O-1, P, Q, E, TN, H-3', fee: 2965, days: 15 },
    { id: 'h2b', name: 'H-2B or R-1 (Form I-129)', fee: 1780, days: 15 },
    { id: 'i140a', name: 'Green card petition (I-140): EB-1A, EB-1B, EB-2 without a waiver, EB-3', fee: 2965, days: 15 },
    { id: 'i140b', name: 'Green card petition (I-140): EB-1C or EB-2 national interest waiver', fee: 2965, days: 45 },
    { id: 'opt', name: 'F-1 OPT or STEM OPT work permit (Form I-765)', fee: 1780, days: 30, card: true },
    { id: 'i539', name: 'Change of status to F, J or M (Form I-539)', fee: 2075, days: 30 }
  ];

  function parseISO(s) { return T.parseISO(s); }
  function fmt(t) { var d = new Date(t); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function weeks(days) { return Math.round(days / 7 * 10) / 10; }
  function wk(n) { n = Math.round(n); return plural(n, 'week'); }

  /* start: UTC midnight date USCIS receives (or received) the case with the I-907.
     months: regular processing time, the number USCIS shows ("80% of cases are completed within"). need: optional date you need to hear by. */
  function compare(cat, start, months, need) {
    var prem = T.schedule(start, true, cat.days)[cat.days - 1];
    var reg = start + Math.round(months * 30.4375 * DAY);
    var premDays = Math.round((prem - start) / DAY), saved = Math.round((reg - prem) / DAY);
    var out = { cat: cat, start: start, prem: prem, premDays: premDays, reg: reg, saved: saved, perWeek: saved > 0 ? cat.fee / (saved / 7) : null, need: need };
    if (need !== null && need !== undefined) {
      // For a work permit, the card still has to be made and mailed after approval: plan for up to 3 more weeks.
      var buffer = cat.card ? 21 * DAY : 0;
      out.buffer = buffer;
      // 80% of cases finish by the regular date, so meeting your date is likely but not certain; missing it is possible.
      out.regular = reg + buffer <= need ? 'in' : 'maybe';
      out.premium = prem + buffer <= need ? 'in' : 'out';
    }
    return out;
  }

  var api = { CATS: CATS, compare: compare, fmt: fmt, money: money, weeks: weeks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PPWorth = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function num(id) { var v = parseFloat($(id).value); return isFinite(v) && v >= 0 ? v : null; }

  var VERDICT = {
    in: ['In time', 'pw-go'], maybe: ['Might miss it', 'pw-warn'], out: ['Too late', 'pw-late']
  };
  var known = {}, typed = false;

  function prefill() {
    var item = known[CATS[parseInt($('pw-cat').value, 10)].id], note = $('pw-known');
    if (item) { $('pw-months').value = item.months; note.innerHTML = 'USCIS showed <strong>' + esc(item.months) + ' months</strong> for ' + esc(item.form) + ' (' + esc(item.office) + ') on ' + esc(fmt(parseISO(item.asOf))) + '. Change it if the page shows something different for your office.'; }
    else { $('pw-months').value = ''; note.textContent = 'Look up your form on the USCIS processing times page and type the number it shows.'; }
  }

  function render(fromButton) {
    var box = $('pw-result'), cat = CATS[parseInt($('pw-cat').value, 10)];
    var start = parseISO($('pw-start').value) || parseISO(todayISO());
    var months = num('pw-months');
    box.className = 'result';
    if (months === null) { if (fromButton) box.className = 'result result-error'; box.innerHTML = '<p>' + (fromButton ? '<strong>One more thing.</strong> ' : '') + 'Enter how long regular processing takes for your form, in months, from the <a href="https://egov.uscis.gov/processing-times/" rel="noopener">USCIS processing times page</a>. It shows &ldquo;80% of cases are completed within&rdquo; a number of months. That number goes in the box.</p>'; return; }
    var need = parseISO($('pw-need').value), r = compare(cat, start, months, need);
    var html = '<h2 class="pw-h">' + esc(cat.name) + '</h2>';
    html += '<table class="result-table pw-table"><thead><tr><th scope="col"></th><th scope="col">Regular</th><th scope="col">Premium</th></tr></thead><tbody>' +
      '<tr><th scope="row">Extra cost</th><td>$0</td><td>' + money(cat.fee) + '</td></tr>' +
      '<tr><th scope="row">USCIS first action</th><td>80% of cases done by ' + esc(fmt(r.reg)) + '</td><td>by ' + esc(fmt(r.prem)) + '</td></tr>' +
      '<tr><th scope="row">How long</th><td>' + wk(months * 30.4375 / 7) + ' or less for 80% of cases</td><td>' + plural(cat.days, 'business day') + ' (about ' + wk(r.premDays / 7) + ')</td></tr>' +
      '<tr><th scope="row">If USCIS is late</th><td>No deadline</td><td>Fee refunded, case keeps going</td></tr>' +
      '</tbody></table>';
    if (r.saved <= 0) {
      html += '<p class="pw-msg pw-warn">By this number, regular processing is expected to be about as fast as the premium deadline, or faster. Premium would add cost without saving much time. Check that the regular time you entered is current.</p>';
    } else {
      html += '<p class="pw-msg pw-info">Premium would bring USCIS&rsquo;s first answer about <strong>' + wk(r.saved / 7) + '</strong> sooner than the date by which 80% of regular cases are done. That is about <strong>' + money(r.perWeek) + '</strong> for each week saved. About 1 in 5 regular cases take longer than that, so the real gap can be bigger.</p>';
    }
    if (need !== null) {
      var b = r.buffer ? ' The card can take up to 3 more weeks after approval, so this adds 3 weeks.' : '';
      html += '<h3 class="pw-h3">Your date: ' + esc(fmt(need)) + '</h3><ul class="pw-need">' +
        '<li><span class="pw-tag ' + VERDICT[r.regular][1] + '">' + VERDICT[r.regular][0] + '</span> Regular processing</li>' +
        '<li><span class="pw-tag ' + VERDICT[r.premium][1] + '">' + VERDICT[r.premium][0] + '</span> Premium processing</li></ul>' +
        '<p class="small">&ldquo;In time&rdquo; for regular processing means 80% of cases are done by your date, so about 1 in 5 may not be. For premium it means USCIS must act before your date.' + b + ' A request for evidence would delay both.</p>';
    }
    html += '<p class="small">Premium processing guarantees a first action (approval, denial, request for evidence or notice of intent to deny), not an approval. The premium date counts business days from ' + esc(fmt(start)) + ' and skips weekends and federal holidays. It is the latest USCIS must act, so it may come sooner.</p>';
    box.innerHTML = html;
  }

  // The button: work it out, then bring the answer into view (the answer sits below the form on a phone).
  function show() {
    render(true);
    var box = $('pw-result');
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('pw-form'); if (!form) return;
    $('pw-cat').innerHTML = CATS.map(function (c, i) { return '<option value="' + i + '">' + esc(c.name) + '</option>'; }).join('');
    $('pw-cat').value = '5'; $('pw-start').value = todayISO();
    ['pw-cat', 'pw-start', 'pw-months', 'pw-need'].forEach(function (id) { $(id).addEventListener('change', function () { render(); }); $(id).addEventListener('input', function () { render(); }); });
    $('pw-cat').addEventListener('change', prefill);
    form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
    form.addEventListener('reset', function () { setTimeout(function () { $('pw-cat').value = '5'; $('pw-start').value = todayISO(); prefill(); render(); }, 0); });
    fetch('processing.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : { items: {} }; }).catch(function () { return { items: {} }; }).then(function (j) {
      known = j.items || {}; prefill(); render();
    });
  });
})(typeof window !== 'undefined' ? window : this);
