/* Substantial Presence Test calculator. Runs in the browser; nothing you enter is sent or stored.
   Rules (IRS "Substantial presence test", "Exempt individuals: Teachers and trainees", Form 8843 instructions, as of Oct 2026):
   resident if present at least 31 days in the current year AND current-year days + 1/3 of prior-year days + 1/6 of the year-before days >= 183.
   Exempt-individual days are not counted. Students (F, J, M, Q): exempt for up to 5 calendar years (any part of a year counts).
   Teachers and trainees (J, Q): not exempt if exempt (as teacher, trainee or student) in any part of 2 of the 6 preceding years,
   unless exempt in 3 or fewer of them and a foreign employer paid all compensation (see the form instructions).
   Comparison is done in integers: 6*cur + 2*p1 + p2 >= 1098. This tool covers the substantial presence test only. Not tax or legal advice. */
(function (root) {
  'use strict';

  function leap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function maxDays(y) { return leap(y) ? 366 : 365; }

  /* in: { year, status: 'student'|'teacher'|'other', studentYears, prior6, foreignPaid,
           days: [cur, p1, p2], excl: [cur, p1, p2] }  (excl for the current year = other excluded days only) */
  function evaluate(inp) {
    var y = inp.year, problems = [], i;
    for (i = 0; i < 3; i++) {
      var yy = y - i, d = inp.days[i], x = inp.excl[i];
      if (d > maxDays(yy)) problems.push('Days in the U.S. in ' + yy + ' cannot be more than ' + maxDays(yy) + '.');
      else if (x > d) problems.push('Days not counted in ' + yy + ' cannot be more than your days in the U.S.');
    }
    if (problems.length) return { problems: problems };

    var exempt = 'no', why = '';
    if (inp.status === 'student') {
      if (inp.studentYears <= 5) { exempt = 'yes'; why = 'You are a student on an F, J, M or Q visa and this is calendar year ' + inp.studentYears + ' (any part of a year counts) of exempt status, within the 5-year limit.'; }
      else { exempt = 'maybe'; why = 'You have been exempt for any part of more than 5 calendar years. You can still exclude days as a student only if you establish that you do not intend to reside permanently in the U.S.'; }
    } else if (inp.status === 'teacher') {
      if (inp.prior6 < 2) { exempt = 'yes'; why = 'You are a teacher, trainee or researcher on a J or Q visa and you were exempt in fewer than 2 of the 6 preceding years.'; }
      else if (inp.prior6 <= 3 && inp.foreignPaid) { exempt = 'yes'; why = 'You were exempt in 2 or 3 of the 6 preceding years, but you say a foreign employer paid all your pay, so the exception may apply. Check every condition with the Form 8843 instructions.'; }
      else { exempt = 'no'; why = 'You were exempt in 2 or more of the 6 preceding years, so your days as a teacher or trainee count this year.'; }
    } else { why = 'Your status does not make you an exempt individual, so your days count.'; }

    function calc(excluded) {
      var cur = excluded ? 0 : Math.max(0, inp.days[0] - inp.excl[0]);
      var p1 = Math.max(0, inp.days[1] - inp.excl[1]), p2 = Math.max(0, inp.days[2] - inp.excl[2]);
      var six = 6 * cur + 2 * p1 + p2;
      var pass = cur >= 31 && six >= 1098;
      return { counted: [cur, p1, p2], weighted: six / 6, six: six, minDays: cur >= 31, minWeighted: six >= 1098, resident: pass,
               closer: pass && cur < 183 };
    }
    var res = { problems: [], exempt: exempt, why: why };
    res.main = calc(exempt === 'yes');
    if (exempt === 'maybe') { res.alt = res.main; res.main = calc(false); } /* main = not exempt; alt = exempt (days excluded) */
    if (exempt === 'maybe') res.alt = calc(true);
    return res;
  }

  var api = { evaluate: evaluate, maxDays: maxDays };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SPT = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(id) { var v = $(id).value; if (v === '') return null; var n = Number(v); return isFinite(n) && n >= 0 && Math.floor(n) === n ? n : NaN; }
  function r2(n) { return (Math.round(n * 100) / 100).toString(); }

  function table(inp, c) {
    var w = [1, 1 / 3, 1 / 6], lab = ['1', '1/3', '1/6'], h = '<div class="spt-wrap"><table class="spt-t"><thead><tr><th>Year</th><th>Days counted</th><th>Weight</th><th>Adds</th></tr></thead><tbody>';
    for (var i = 0; i < 3; i++) h += '<tr><td>' + (inp.year - i) + '</td><td>' + c.counted[i] + '</td><td>&times; ' + lab[i] + '</td><td>' + r2(c.counted[i] * w[i]) + '</td></tr>';
    return h + '<tr class="spt-sum"><td colspan="3">Total</td><td>' + r2(c.weighted) + '</td></tr></tbody></table></div>';
  }

  function verdict(c) {
    var h = '<ul class="spt-checks"><li>' + (c.minDays ? '&#10003;' : '&#10007;') + ' At least 31 days counted in the current year: <strong>' + c.counted[0] + '</strong></li>' +
      '<li>' + (c.minWeighted ? '&#10003;' : '&#10007;') + ' Weighted total of at least 183: <strong>' + r2(c.weighted) + '</strong></li></ul>';
    return h;
  }

  function render(fromButton) {
    var box = $('spt-result'), year = Number($('spt-year').value), status = $('spt-status').value;
    box.className = 'result';
    var d = [num('spt-d0'), num('spt-d1'), num('spt-d2')];
    if (d.some(function (x) { return x === null; })) { if (fromButton) box.className = 'result result-error'; box.innerHTML = '<p>' + (fromButton ? '<strong>One more thing.</strong> ' : '') + 'Enter the number of days you were in the U.S. in each of the three years. Use 0 if none.</p>'; return; }
    var x = [num('spt-x0'), num('spt-x1'), num('spt-x2')].map(function (v) { return v === null ? 0 : v; });
    if (d.concat(x).some(isNaN)) { box.className = 'result result-error'; box.innerHTML = '<p><strong>Check your numbers.</strong> Use whole numbers, 0 or more.</p>'; return; }
    var sy = num('spt-sy'), p6 = num('spt-p6');
    var inp = { year: year, status: status, studentYears: sy === null || isNaN(sy) ? 1 : sy, prior6: p6 === null || isNaN(p6) ? 0 : p6, foreignPaid: $('spt-fp').checked, days: d, excl: x };
    var r = evaluate(inp), html = '';
    if (r.problems.length) { box.className = 'result result-error'; box.innerHTML = r.problems.map(function (p) { return '<p><strong>Check this.</strong> ' + esc(p) + '</p>'; }).join(''); return; }

    var m = r.main;
    box.className = 'result ' + (m.resident ? 'result-ok' : 'result-no');
    html += '<h2 class="spt-h">' + (r.exempt === 'maybe' ? 'It depends on one thing' : (m.resident ? 'You meet the substantial presence test for ' + year : 'You do not meet the substantial presence test for ' + year)) + '</h2>';
    if (status !== 'other') html += '<p><strong>Exempt individual?</strong> ' + esc(r.why) + '</p>';
    if (r.exempt === 'maybe') {
      html += '<h3 class="spt-h3">If you cannot show you do not intend to stay permanently</h3>' + table(inp, m) + verdict(m) + '<p>' + (m.resident ? 'You would be a <strong>resident alien</strong> for tax purposes for ' + year + '.' : 'You would still be a <strong>nonresident alien</strong>.') + '</p>';
      html += '<h3 class="spt-h3">If you can show it</h3>' + table(inp, r.alt) + verdict(r.alt) + '<p>' + (r.alt.resident ? 'You would be a resident alien.' : 'You would be a <strong>nonresident alien</strong> for ' + year + '.') + '</p>';
    } else {
      html += table(inp, m) + verdict(m);
      html += '<p>' + (m.resident ? 'Under this test you are a <strong>resident alien</strong> for tax purposes for ' + year + '. That generally means Form 1040, taxed on your worldwide income.' : 'Under this test you are a <strong>nonresident alien</strong> for ' + year + '. That generally means Form 1040-NR, taxed on U.S.-source income.') + '</p>';
    }
    var notes = [];
    if (m.closer && r.exempt !== 'maybe') notes.push('You were in the U.S. fewer than 183 days in ' + year + ', so you may be able to claim the <strong>closer connection exception</strong> and be treated as a nonresident. It needs a tax home and closer connection to a foreign country, and it does not apply if you applied for a green card or took steps to. File Form 8840 to claim it.');
    var anyEx = (status !== 'other' && r.exempt !== 'no') || x.some(function (v) { return v > 0; });
    if (anyEx) notes.push('If you excluded days (exempt individual, medical condition and so on), you generally must file <strong>Form 8843</strong> even if you have no income and no return to file.');
    notes.push('This tool covers the substantial presence test only. You are also a resident if you hold a green card at any time in the year (green card test). Special rules apply in your first and last year, when you may be a dual-status alien.');
    html += '<ul class="spt-notes">' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>';
    if (year >= new Date().getFullYear()) html += '<p class="small">The tax year ' + year + ' is not over yet. Count the days you expect to be in the U.S. through December 31, or come back after the year ends.</p>';
    box.innerHTML = html;
  }

  function toggle() {
    var s = $('spt-status').value;
    $('spt-f-student').hidden = s !== 'student';
    $('spt-f-teacher').hidden = s !== 'teacher';
  }

  function show() {
    render(true);
    var box = $('spt-result');
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.focus({ preventScroll: true });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('spt-form'); if (!form) return;
    var cy = new Date().getFullYear(), sel = $('spt-year'), def = cy - 1;
    for (var y = cy; y >= cy - 3; y--) sel.insertAdjacentHTML('beforeend', '<option value="' + y + '"' + (y === def ? ' selected' : '') + '>' + y + '</option>');
    function labels() { var y = Number(sel.value); [0, 1, 2].forEach(function (i) { document.querySelectorAll('.spt-y' + i).forEach(function (e) { e.textContent = y - i; }); }); }
    labels(); toggle();
    form.addEventListener('input', function () { labels(); toggle(); render(); });
    form.addEventListener('change', function () { labels(); toggle(); render(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
    form.addEventListener('reset', function () { setTimeout(function () { labels(); toggle(); render(); }, 0); });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
