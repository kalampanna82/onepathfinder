/* Green card travel timing estimator. Runs entirely in the browser; nothing is sent anywhere.
   Shows the date six months and one year after you leave. It does not decide whether you keep your status. */
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
  function addMonths(t, n) {
    var d = new Date(t), mo = d.getUTCMonth() + n, y = d.getUTCFullYear() + Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    var last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return Date.UTC(y, mo, Math.min(d.getUTCDate(), last));
  }
  function fmt(t) { var d = new Date(t); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  function days(a, b) { return Math.round((b - a) / DAY); }

  // input: { depart:'YYYY-MM-DD', ret:'YYYY-MM-DD' (optional) }
  function calculate(input) {
    var dep = parse(input.depart);
    if (dep === null) return { error: 'Enter the date you plan to leave the United States.' };
    var six = addMonths(dep, 6), year = addMonths(dep, 12);
    var out = {
      sixMonths: six, sixMonthsText: fmt(six),
      suggested: six - 14 * DAY, suggestedText: fmt(six - 14 * DAY),
      oneYear: year, oneYearText: fmt(year)
    };
    if (input.ret) {
      var ret = parse(input.ret);
      if (ret === null) return { error: 'The return date isn’t a valid date.' };
      if (ret < dep) return { error: 'The return date is before the departure date.' };
      out.tripDays = days(dep, ret);
      out.status = ret >= year ? 'year' : (ret > six ? 'over6' : 'ok');
    }
    return out;
  }

  var api = { calculate: calculate, parse: parse, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Reentry = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('reentry-form');
    if (!form) return;
    var out = document.getElementById('reentry-result');
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function status(cls, title, text) { return '<div class="status ' + cls + '"><strong>' + esc(title) + '</strong><p>' + esc(text) + '</p></div>'; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = calculate({ depart: form.depart.value, ret: form.ret.value });
      if (r.error) {
        out.className = 'result result-error';
        out.innerHTML = '<p><strong>Check your dates.</strong> ' + esc(r.error) + '</p>';
        out.focus(); return;
      }
      var html = '<h3>Be back by ' + esc(r.sixMonthsText) + ' to keep the trip within six months</h3>' +
        '<table class="result-table"><tbody>' +
        '<tr><th scope="row">Six months after you leave</th><td>' + esc(r.sixMonthsText) + '</td></tr>' +
        '<tr><th scope="row">Suggested latest arrival, with two weeks of room for delays</th><td>' + esc(r.suggestedText) + '</td></tr>' +
        '<tr><th scope="row">One year after you leave</th><td>' + esc(r.oneYearText) + '</td></tr>' +
        '</tbody></table>';
      if (r.status) {
        html += '<p><strong>Your planned trip: ' + r.tripDays + ' days.</strong></p>';
        if (r.status === 'ok') html += status('good', 'Within six months', 'This trip is not longer than six months. You can still be asked questions at the border.');
        else if (r.status === 'over6') html += status('warn', 'Longer than six months', 'A trip of more than six months can lead officers to question whether you kept your permanent residence, and can affect continuous residence for citizenship. Ask a professional before you plan this trip.');
        else html += status('bad', 'One year or longer', 'After a year abroad, a green card by itself generally is not enough to return. A re-entry permit is applied for before you leave. Ask a professional before you plan this trip.');
      }
      html += '<p class="small">This is general information, not legal advice. Staying under six months does not guarantee entry or protect your status. What matters is whether you kept your permanent residence.</p>';
      out.className = 'result result-ok';
      out.innerHTML = html;
      out.focus();
    });
    form.addEventListener('reset', function () { out.className = 'result'; out.innerHTML = ''; });
  });
})(typeof window !== 'undefined' ? window : this);
