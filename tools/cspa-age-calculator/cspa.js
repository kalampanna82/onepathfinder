/* CSPA age estimator (INA 203(h)(1)(A)).
   Runs entirely in the browser. Nothing is sent anywhere.
   CSPA age = age on the date the visa becomes available, minus the number of days the petition was pending. */
(function (root) {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function parseDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = Date.UTC(y, mo - 1, d);
    var chk = new Date(t);
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== mo - 1 || chk.getUTCDate() !== d) return null;
    if (y < 1900 || y > 2200) return null;
    return { y: y, m: mo, d: d };
  }

  function utc(dt) { return Date.UTC(dt.y, dt.m - 1, dt.d); }
  function fromUtc(t) { var x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; }
  function cmp(a, b) { return utc(a) - utc(b); }
  function daysBetween(a, b) { return Math.round((utc(b) - utc(a)) / 86400000); }
  function addDays(dt, n) { return fromUtc(utc(dt) + n * 86400000); }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  // Age in whole years, months and days on a given date.
  function ageYMD(birth, on) {
    var y = on.y - birth.y, m = on.m - birth.m, d = on.d - birth.d;
    if (d < 0) {
      m -= 1;
      var pm = on.m - 1, py = on.y;
      if (pm < 1) { pm = 12; py -= 1; }
      d += daysInMonth(py, pm);
    }
    if (m < 0) { y -= 1; m += 12; }
    return { years: y, months: m, days: d };
  }

  function addOneYear(dt) {
    var d = Math.min(dt.d, daysInMonth(dt.y + 1, dt.m));
    return { y: dt.y + 1, m: dt.m, d: d };
  }

  function fmtDate(dt) { return MONTHS[dt.m - 1] + ' ' + dt.d + ', ' + dt.y; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function fmtAge(a) { return plural(a.years, 'year') + ', ' + plural(a.months, 'month') + ', ' + plural(a.days, 'day'); }

  // input: { dob, filed, approved, current } as YYYY-MM-DD strings.
  // "current" is any date in the Visa Bulletin month when the priority date became current (first day of that month is used).
  function calculate(input) {
    var dob = parseDate(input.dob), filed = parseDate(input.filed), approved = parseDate(input.approved), cur = parseDate(input.current);
    if (!dob) return { error: 'Enter the child’s date of birth.' };
    if (!filed) return { error: 'Enter the date the petition was filed.' };
    if (!approved) return { error: 'Enter the date the petition was approved.' };
    if (!cur) return { error: 'Enter a date in the Visa Bulletin month when the priority date became current.' };
    if (cmp(approved, filed) < 0) return { error: 'The approval date can’t be before the filing date.' };

    var curFirst = { y: cur.y, m: cur.m, d: 1 };
    var availability = cmp(curFirst, approved) >= 0 ? curFirst : approved;
    var availabilityReason = cmp(curFirst, approved) >= 0
      ? 'the first day of the Visa Bulletin month when the priority date became current'
      : 'the petition approval date, because it is later';

    if (cmp(availability, dob) <= 0) return { error: 'The visa availability date has to be after the child’s date of birth. Please check your dates.' };

    var pending = daysBetween(filed, approved);
    var ageAtAvailability = ageYMD(dob, availability);
    var effective = addDays(availability, -pending);
    var beforeBirth = cmp(effective, dob) < 0;
    var cspaAge = beforeBirth ? { years: 0, months: 0, days: 0 } : ageYMD(dob, effective);
    var under21 = beforeBirth ? true : cspaAge.years < 21;
    var deadline = addOneYear(availability);

    return {
      availability: availability,
      availabilityText: fmtDate(availability),
      availabilityReason: availabilityReason,
      pendingDays: pending,
      ageAtAvailability: ageAtAvailability,
      ageAtAvailabilityText: fmtAge(ageAtAvailability),
      cspaAge: cspaAge,
      cspaAgeText: beforeBirth ? 'under 1 day (pending time is longer than the child’s age)' : fmtAge(cspaAge),
      under21: under21,
      deadline: deadline,
      deadlineText: fmtDate(deadline)
    };
  }

  var api = { calculate: calculate, parseDate: parseDate, ageYMD: ageYMD, daysBetween: daysBetween, addDays: addDays, fmtDate: fmtDate };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.CSPA = api;

  // ---- Page wiring (browser only) ----
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('cspa-form');
    if (!form) return;
    var out = document.getElementById('cspa-result');

    function row(label, value) {
      return '<tr><th scope="row">' + label + '</th><td>' + value + '</td></tr>';
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = calculate({
        dob: form.dob.value, filed: form.filed.value, approved: form.approved.value, current: form.current.value
      });
      if (r.error) {
        out.className = 'result result-error';
        out.innerHTML = '<p><strong>Check your dates.</strong> ' + esc(r.error) + '</p>';
        out.focus();
        return;
      }
      var headline = r.under21
        ? 'Estimate: under 21 under the CSPA formula'
        : 'Estimate: 21 or older under the CSPA formula';
      var next = r.under21
        ? '<p>If this is right, the child may be protected from aging out, but only if they take a qualifying step to seek permanent residence within one year of the visa availability date (before ' + esc(r.deadlineText) + '). Don’t wait until the last day.</p>'
        : '<p>If this is right, the child would be 21 or older for green card purposes. What happens next depends on the visa category and the family’s situation. A licensed immigration attorney or DOJ-accredited representative can explain the options.</p>';
      out.className = 'result ' + (r.under21 ? 'result-ok' : 'result-no');
      out.innerHTML =
        '<h3>' + headline + '</h3>' +
        '<table class="result-table"><tbody>' +
        row('Visa availability date', esc(r.availabilityText) + '<br><span class="small">Used ' + esc(r.availabilityReason) + '.</span>') +
        row('Child’s age on that date', esc(r.ageAtAvailabilityText)) +
        row('Days the petition was pending', esc(r.pendingDays.toLocaleString('en-US'))) +
        row('CSPA age (age minus pending days)', '<strong>' + esc(r.cspaAgeText) + '</strong>') +
        row('One-year deadline to take a qualifying step', 'Before ' + esc(r.deadlineText)) +
        '</tbody></table>' + next +
        '<p class="small">This is an estimate for general information only. It is not legal advice and does not guarantee any outcome.</p>';
      out.focus();
    });

    form.addEventListener('reset', function () {
      out.className = 'result';
      out.innerHTML = '';
    });
  });
})(typeof window !== 'undefined' ? window : this);
