/* N-400 timing estimator. Runs entirely in the browser; nothing is sent anywhere.
   Estimates three things: earliest filing date, physical presence, and continuous residence.
   It does not check every naturalization requirement. */
(function (root) {
  'use strict';
  var DAY = 86400000;
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), c = new Date(t);
    if (c.getUTCFullYear() !== +m[1] || c.getUTCMonth() !== +m[2] - 1 || c.getUTCDate() !== +m[3]) return null;
    return t;
  }
  function addYears(t, n) {
    var d = new Date(t), y = d.getUTCFullYear() + n, m = d.getUTCMonth(), day = d.getUTCDate();
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Date.UTC(y, m, Math.min(day, last));
  }
  function fmt(t) { var d = new Date(t); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  function days(a, b) { return Math.round((b - a) / DAY); }

  // input: { gc:'YYYY-MM-DD', threeYear:boolean, trips:[{leave,ret}], today:'YYYY-MM-DD' (optional) }
  function calculate(input) {
    var gc = parse(input.gc);
    if (gc === null) return { error: 'Enter the date you became a permanent resident (the date on your green card).' };
    var today = input.today ? parse(input.today) : (function () { var n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); })();
    if (gc > today) return { error: 'The green card date can’t be in the future.' };

    var years = input.threeYear ? 3 : 5;
    var required = input.threeYear ? 548 : 913; // half of the statutory period, in days
    var earliest = addYears(gc, years) - 90 * DAY;

    var trips = [];
    for (var i = 0; i < (input.trips || []).length; i++) {
      var t = input.trips[i], l = t.leave || '', r = t.ret || '';
      if (!l && !r) continue;
      if (!l || !r) return { error: 'Trip ' + (i + 1) + ': enter both the departure and the return date, or remove the trip.' };
      var lt = parse(l), rt = parse(r);
      if (lt === null || rt === null) return { error: 'Trip ' + (i + 1) + ': one of the dates isn’t valid.' };
      if (rt < lt) return { error: 'Trip ' + (i + 1) + ': the return date is before the departure date.' };
      trips.push({ leave: lt, ret: rt });
    }

    var windowStart = addYears(today, -years);
    var start = Math.max(windowStart, gc);
    var elapsed = days(start, today) + 1; // days from start through today, inclusive
    var abroad = 0, longest = 0, broken = false, long6 = false;
    trips.forEach(function (t) {
      var len = days(t.leave, t.ret);
      var inWindow = t.ret >= windowStart && t.leave <= today;
      if (inWindow) {
        if (len > longest) longest = len;
        if (len >= 365) broken = true; else if (len > 180) long6 = true;
      }
      // The day you leave and the day you return count as days in the U.S.
      var lo = Math.max(t.leave + DAY, start), hi = Math.min(t.ret - DAY, today);
      if (hi >= lo) abroad += days(lo, hi) + 1;
    });
    var present = Math.max(0, elapsed - abroad);

    return {
      years: years,
      earliest: earliest, earliestText: fmt(earliest), pastEarliest: earliest <= today,
      required: required, present: present, abroad: abroad, presenceMet: present >= required,
      longest: longest, residence: broken ? 'broken' : (long6 ? 'check' : 'ok')
    };
  }

  var api = { calculate: calculate, parse: parse, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.N400 = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('n400-form');
    if (!form) return;
    var out = document.getElementById('n400-result');
    var host = document.getElementById('trips');
    var n = 0;

    function addTrip() {
      n++;
      var row = document.createElement('div');
      row.className = 'trip';
      row.innerHTML =
        '<div class="field"><label for="tl' + n + '">Left the U.S.</label><input type="date" id="tl' + n + '" class="t-leave"></div>' +
        '<div class="field"><label for="tr' + n + '">Returned</label><input type="date" id="tr' + n + '" class="t-ret"></div>' +
        '<button type="button" class="btn secondary t-remove" aria-label="Remove this trip">Remove</button>';
      row.querySelector('.t-remove').addEventListener('click', function () { row.parentNode.removeChild(row); });
      host.appendChild(row);
    }
    document.getElementById('add-trip').addEventListener('click', addTrip);
    addTrip();

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function status(cls, title, text) { return '<div class="status ' + cls + '"><strong>' + esc(title) + '</strong><p>' + esc(text) + '</p></div>'; }

    function values() {
      var trips = Array.prototype.map.call(host.querySelectorAll('.trip'), function (r) {
        return { leave: r.querySelector('.t-leave').value, ret: r.querySelector('.t-ret').value };
      });
      return { gc: form.gc.value, threeYear: form.rule.value === '3', trips: trips };
    }

    function show() {
      var r = calculate(values());
      if (r.error) {
        out.className = 'result result-error';
        out.innerHTML = '<p><strong>Check your entries.</strong> ' + esc(r.error) + '</p>';
        out.focus(); return;
      }
      var html = '<h3>Your estimate</h3>';
      html += r.pastEarliest
        ? status('good', 'Earliest filing date has passed', 'Under the ' + r.years + '-year rule with the 90-day early filing window, the earliest date was ' + r.earliestText + '.')
        : status('warn', 'Earliest filing date: ' + r.earliestText, 'Under the ' + r.years + '-year rule, you can file up to 90 days before you meet the residence requirement.');
      html += r.presenceMet
        ? status('good', 'Physical presence: likely met', 'About ' + r.present + ' days in the U.S. in the last ' + r.years + ' years (at least ' + r.required + ' needed).')
        : status('bad', 'Physical presence: not met yet', 'About ' + r.present + ' days in the U.S. counted so far (at least ' + r.required + ' needed). This counts only time since you became a permanent resident.');
      if (r.residence === 'broken') html += status('bad', 'Continuous residence: likely broken', 'A trip of one year or more generally breaks continuous residence unless an exception applies.');
      else if (r.residence === 'check') html += status('warn', 'Continuous residence: needs a closer look', 'A trip of more than six months but less than a year can create a presumption that continuous residence was broken. It can sometimes be overcome with evidence, so ask a professional.');
      else html += status('good', 'Continuous residence: no problem found', 'No trip you entered was longer than six months.');
      html += '<p class="small">This is an estimate for general information only. It is not legal advice and does not guarantee any outcome. It does not check every requirement. See &ldquo;What this tool does not check&rdquo; below.</p>';
      out.className = 'result result-ok';
      out.innerHTML = html;
      out.focus();
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); show(); });
    form.addEventListener('reset', function () {
      out.className = 'result'; out.innerHTML = '';
      host.innerHTML = ''; n = 0; addTrip();
    });
  });
})(typeof window !== 'undefined' ? window : this);
