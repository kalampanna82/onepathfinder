/* SEVIS I-901 fee calculator. Runs in the browser; nothing you choose is sent anywhere.
   Amounts come from ICE (https://www.ice.gov/sevis/i901), last checked October 22, 2026. Update CATS if ICE changes them. */
(function (root) {
  'use strict';
  var CATS = {
    f:    { label: 'F-1 or F-3 student', fee: 350 },
    m:    { label: 'M-1 or M-3 student', fee: 350 },
    j:    { label: 'J-1 exchange visitor (most programs)', fee: 220, exchange: true },
    jlow: { label: 'J-1 au pair, camp counselor or summer work travel', fee: 35, exchange: true },
    jgov: { label: 'J-1 in a government-funded program (program codes G-1, G-2, G-3 or G-7)', fee: 0, exchange: true, reason: 'These exchange visitors do not pay the SEVIS fee.' },
    dep:  { label: 'Spouse or child of a student or exchange visitor (F-2, M-2 or J-2)', fee: 0, reason: 'Spouses and children in F-2, M-2 and J-2 status do not pay a SEVIS fee, unless they are changing to F-1, M-1 or J-1 themselves.' }
  };
  var SITS = {
    first:    { label: 'I am applying for a visa or student status for the first time, with a new Form I-20 or DS-2019', pays: true },
    change:   { label: 'I am inside the U.S. and changing to F, M or J status', pays: true },
    transfer: { label: 'I am transferring to another school at the same level, keeping my SEVIS ID', pays: false, reason: 'Transferring between approved schools at the same level with the same SEVIS ID does not need a new fee.' },
    short:    { label: 'I am returning after being away for less than 5 months, or being reinstated after less than 5 months out of status', pays: false, reason: 'Returning after an absence of less than five months, or reinstatement after less than five months out of status, does not need a new fee.' },
    long:     { label: 'I am returning after being away for 5 months or more, or being reinstated after more than 5 months out of status', pays: true }
  };

  function money(n) { return '$' + n; }

  // Returns { fee, pays, reason, notes[] } for a category key and a situation key.
  function calc(cat, sit) {
    var c = CATS[cat], s = SITS[sit];
    if (!c || !s) return { error: 'Choose your visa type and your situation.' };
    var notes = [];
    if (c.reason) return { fee: 0, pays: false, reason: c.reason, notes: notes, cat: c, sit: s };
    if (!s.pays) {
      if (c.exchange) notes.push('Exchange visitors have their own rules for paying again, for example after a substantive violation or 121 to 269 days out of status. Check the ICE page before you rely on this.');
      return { fee: 0, pays: false, reason: s.reason, notes: notes, cat: c, sit: s };
    }
    if (cat === 'jlow') notes.push('The $35 fee applies to au pair, camp counselor and summer work travel programs.');
    if (sit === 'long' && c.exchange) notes.push('For exchange visitors the rules differ: you pay again before reinstatement after a substantive violation or after 121 to 269 days out of status. Check the ICE page for your case.');
    if (sit === 'change') notes.push('Pay the fee before you apply for the change of status. Switching only between F-1 and F-3, or between M-1 and M-3, may not need a new fee. Check the ICE page.');
    return { fee: c.fee, pays: true, notes: notes, cat: c, sit: s };
  }

  var api = { calc: calc, CATS: CATS, SITS: SITS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SevisFee = api;
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('sevis-form');
    if (!form) return;
    var out = document.getElementById('sevis-result');
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    Object.keys(CATS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = CATS[k].label; form.cat.appendChild(o); });
    Object.keys(SITS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = SITS[k].label; form.sit.appendChild(o); });
    form.cat.value = 'f'; form.sit.value = 'first';

    function render() {
      var r = calc(form.cat.value, form.sit.value);
      if (r.error) { out.className = 'result result-error'; out.innerHTML = '<p>' + esc(r.error) + '</p>'; return; }
      var html;
      if (r.pays) {
        out.className = 'result result-ok';
        html = '<h3>' + money(r.fee) + '</h3><p>This is the SEVIS I-901 fee for <strong>' + esc(r.cat.label) + '</strong>. Pay it once on the official ICE payment site and keep the receipt.</p>';
      } else {
        out.className = 'result result-ok';
        html = '<h3>$0 for this situation</h3><p>' + esc(r.reason) + '</p>';
      }
      r.notes.forEach(function (n) { html += '<p class="small">' + esc(n) + '</p>'; });
      html += '<p class="small">The SEVIS fee is separate from the visa application fee and from your school costs. It has no waivers, but a school, sponsor or family member may pay it for you.</p>';
      out.innerHTML = html;
    }
    form.addEventListener('change', render);
    form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
