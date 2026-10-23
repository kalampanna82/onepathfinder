/* Premium processing vs regular processing. Runs in the browser; nothing you enter is sent or stored.
   Premium timeframes and fees are from 8 CFR 106.4 and the USCIS fee schedule (G-1055), as of Oct 2026.
   Regular processing time is typed in by you from USCIS's processing times page, because it changes every month and by service center.
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
     lowM, highM: regular processing time in months (shortest and longest you expect). need: optional date you need to hear by. */
  function compare(cat, start, lowM, highM, need) {
    var prem = T.schedule(start, true, cat.days)[cat.days - 1];
    var regLow = start + Math.round(lowM * 30.4375 * DAY), regHigh = start + Math.round(highM * 30.4375 * DAY);
    var premDays = Math.round((prem - start) / DAY);
    var savedLow = Math.round((regLow - prem) / DAY), savedHigh = Math.round((regHigh - prem) / DAY);
    var mid = (savedLow + savedHigh) / 2;
    var out = { cat: cat, start: start, prem: prem, premDays: premDays, regLow: regLow, regHigh: regHigh, savedLow: savedLow, savedHigh: savedHigh, perWeek: mid > 0 ? cat.fee / (mid / 7) : null, need: need };
    if (need !== null && need !== undefined) {
      // For a work permit, the card still has to be made and mailed after approval: plan for up to 3 more weeks.
      var buffer = cat.card ? 21 * DAY : 0;
      out.buffer = buffer;
      out.regular = regHigh + buffer <= need ? 'in' : regLow + buffer > need ? 'out' : 'maybe';
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

  function render() {
    var box = $('pw-result'), cat = CATS[parseInt($('pw-cat').value, 10)];
    var start = parseISO($('pw-start').value) || parseISO(todayISO());
    var low = num('pw-low'), high = num('pw-high');
    if (low === null) { box.innerHTML = '<p>Enter how long regular processing takes for your form, from the <a href="https://egov.uscis.gov/processing-times/" rel="noopener">USCIS processing times page</a>. USCIS shows a range in months. Put the shorter number in the first box and the longer in the second.</p>'; return; }
    if (high === null || high < low) high = low;
    var need = parseISO($('pw-need').value), r = compare(cat, start, low, high, need);
    var html = '<h2 class="pw-h">' + esc(cat.name) + '</h2>';
    html += '<table class="result-table pw-table"><thead><tr><th scope="col"></th><th scope="col">Regular</th><th scope="col">Premium</th></tr></thead><tbody>' +
      '<tr><th scope="row">Extra cost</th><td>$0</td><td>' + money(cat.fee) + '</td></tr>' +
      '<tr><th scope="row">USCIS first action</th><td>' + (low === high ? 'around ' + esc(fmt(r.regLow)) : esc(fmt(r.regLow)) + ' to ' + esc(fmt(r.regHigh))) + '</td><td>by ' + esc(fmt(r.prem)) + '</td></tr>' +
      '<tr><th scope="row">How long</th><td>' + (low === high ? 'about ' + wk(low * 30.4375 / 7) : wk(low * 30.4375 / 7) + ' to ' + wk(high * 30.4375 / 7)) + '</td><td>' + plural(cat.days, 'business day') + ' (about ' + wk(r.premDays / 7) + ')</td></tr>' +
      '<tr><th scope="row">If USCIS is late</th><td>No deadline</td><td>Fee refunded, case keeps going</td></tr>' +
      '</tbody></table>';
    // time and cost
    if (r.savedHigh <= 0) {
      html += '<p class="pw-msg pw-warn">By these numbers, regular processing is expected to be about as fast as the premium deadline, or faster. Premium would add cost without saving much time. Check that the regular time you entered is current.</p>';
    } else if (r.savedLow <= 0) {
      html += '<p class="pw-msg pw-info">Premium saves between 0 and about ' + wk(r.savedHigh / 7) + ', depending on where regular processing lands in its range. At the middle of your range that is about ' + wk((r.savedLow + r.savedHigh) / 14) + ' sooner' + (r.perWeek ? ', or about ' + money(r.perWeek) + ' for each week saved' : '') + '.</p>';
    } else {
      html += '<p class="pw-msg pw-info">Premium would bring USCIS&rsquo;s first answer about <strong>' + (r.savedLow === r.savedHigh ? wk(r.savedLow / 7) : wk(r.savedLow / 7) + ' to ' + wk(r.savedHigh / 7)) + '</strong> sooner. That is about <strong>' + money(r.perWeek) + '</strong> for each week saved, at the middle of your range.</p>';
    }
    if (need !== null) {
      var b = r.buffer ? ' The card can take up to 3 more weeks after approval, so this adds 3 weeks.' : '';
      html += '<h3 class="pw-h3">Your date: ' + esc(fmt(need)) + '</h3><ul class="pw-need">' +
        '<li><span class="pw-tag ' + VERDICT[r.regular][1] + '">' + VERDICT[r.regular][0] + '</span> Regular processing</li>' +
        '<li><span class="pw-tag ' + VERDICT[r.premium][1] + '">' + VERDICT[r.premium][0] + '</span> Premium processing</li></ul>' +
        '<p class="small">&ldquo;In time&rdquo; means USCIS&rsquo;s first action is expected before your date.' + b + ' A request for evidence would delay both.</p>';
    }
    html += '<p class="small">Premium processing guarantees a first action (approval, denial, request for evidence or notice of intent to deny), not an approval. The premium date counts business days from ' + esc(fmt(start)) + ' and skips weekends and federal holidays. It is the latest USCIS must act, so it may come sooner.</p>';
    box.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('pw-form'); if (!form) return;
    $('pw-cat').innerHTML = CATS.map(function (c, i) { return '<option value="' + i + '">' + esc(c.name) + '</option>'; }).join('');
    $('pw-cat').value = '5'; $('pw-start').value = todayISO();
    ['pw-cat', 'pw-start', 'pw-low', 'pw-high', 'pw-need'].forEach(function (id) { $(id).addEventListener('change', render); $(id).addEventListener('input', render); });
    form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
    form.addEventListener('reset', function () { setTimeout(function () { $('pw-cat').value = '5'; $('pw-start').value = todayISO(); render(); }, 0); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
