/* Family priority date checker. Runs in the browser; the date you enter is not sent anywhere.
   Compares a priority date with the cutoff dates in bulletin.json (copied from the Department of State Visa Bulletin). */
(function (root) {
  'use strict';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var COUNTRIES = { all: 'All other countries', china: 'China (mainland born)', india: 'India', mexico: 'Mexico', philippines: 'Philippines' };
  var CATEGORIES = {
    F1: 'F1: unmarried sons and daughters (21 or older) of U.S. citizens',
    F2A: 'F2A: spouses and unmarried children (under 21) of permanent residents',
    F2B: 'F2B: unmarried sons and daughters (21 or older) of permanent residents',
    F3: 'F3: married sons and daughters of U.S. citizens',
    F4: 'F4: brothers and sisters of adult U.S. citizens'
  };

  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), c = new Date(t);
    if (c.getUTCFullYear() !== +m[1] || c.getUTCMonth() !== +m[2] - 1 || c.getUTCDate() !== +m[3]) return null;
    return t;
  }
  function fmt(t) { var d = new Date(t); return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  function gapText(from, to) { // to is later than from
    var a = new Date(from), b = new Date(to);
    var months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    if (b.getUTCDate() < a.getUTCDate()) months -= 1;
    var y = Math.floor(months / 12), m = months % 12, out = [];
    if (y) out.push(y + (y === 1 ? ' year' : ' years'));
    if (m) out.push(m + (m === 1 ? ' month' : ' months'));
    return out.length ? out.join(' and ') : 'less than a month';
  }

  function one(data, chart, cat, country, pd) {
    var table = data[chart] && data[chart][cat];
    var v = table && table[country];
    if (!v) return { error: 'No data for that choice.' };
    if (v === 'C') return { status: 'current', cutoff: 'C', cutoffText: 'Current (no cutoff date)' };
    if (v === 'U') return { status: 'unavailable', cutoff: 'U', cutoffText: 'Unavailable' };
    var cut = parse(v);
    // A visa is available when the priority date is earlier than the cutoff date.
    if (pd < cut) return { status: 'current', cutoff: v, cutoffText: fmt(cut) };
    return { status: 'not', cutoff: v, cutoffText: fmt(cut), gap: gapText(cut, pd) };
  }

  // input: { category, country, chart:'final'|'filing', pd:'YYYY-MM-DD', today:'YYYY-MM-DD' (optional) }
  function check(data, input) {
    if (!CATEGORIES[input.category]) return { error: 'Choose a visa category.' };
    if (!COUNTRIES[input.country]) return { error: 'Choose a country.' };
    var pd = parse(input.pd);
    if (pd === null) return { error: 'Enter your priority date.' };
    var chart = input.chart === 'filing' ? 'filing' : 'final';
    var other = chart === 'final' ? 'filing' : 'final';
    var res = one(data, chart, input.category, input.country, pd);
    if (res.error) return res;
    res.chart = chart;
    res.other = one(data, other, input.category, input.country, pd);
    res.otherChart = other;
    var today = input.today ? parse(input.today) : (function () { var n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); })();
    var endOfMonth = Date.UTC(data.bulletinYear, data.bulletinMonthNumber, 0);
    res.stale = today > endOfMonth;
    return res;
  }

  // bulletin.json holds several bulletins. Use the newest one whose effectiveFrom (12:01 AM Eastern on the 1st of its month) has passed,
  // so the page switches to a new bulletin on its own, with no deploy needed at midnight. Falls back to the oldest if none has started.
  function pick(file, now) {
    if (!file || !file.bulletins) return file;
    var t = (now instanceof Date ? now : new Date()).getTime(), best = null, first = null;
    file.bulletins.forEach(function (b) {
      var at = Date.parse(b.effectiveFrom);
      if (isNaN(at)) return;
      if (first === null || at < Date.parse(first.effectiveFrom)) first = b;
      if (at <= t && (best === null || at > Date.parse(best.effectiveFrom))) best = b;
    });
    return best || first || file.bulletins[0];
  }

  // Calendar days from now to a moment, counted in Eastern time (the bulletin month starts at 12:01 AM Eastern).
  function etDay(ms) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)), v = {};
    p.forEach(function (x) { v[x.type] = x.value; });
    return Date.UTC(+v.year, +v.month - 1, +v.day);
  }
  function daysUntil(nowMs, atMs) { return Math.round((etDay(atMs) - etDay(nowMs)) / 864e5); }

  // The next bulletin that is already published but has not started yet, if any.
  function upcoming(file, now) {
    if (!file || !file.bulletins) return null;
    var t = (now instanceof Date ? now : new Date()).getTime(), next = null;
    file.bulletins.forEach(function (b) {
      var at = Date.parse(b.effectiveFrom);
      if (!isNaN(at) && at > t && (next === null || at < Date.parse(next.effectiveFrom))) next = b;
    });
    return next;
  }

  // What the published-but-not-yet-effective bulletin means for this person.
  // kind: 'becomes-current' | 'stays-current' | 'no-longer-current' | 'still-not-current' (null when no next bulletin).
  function forecast(file, input, now) {
    var n = now instanceof Date ? now : new Date();
    var next = upcoming(file, n);
    if (!next) return null;
    var active = pick(file, n);
    var nowRes = check(active, input), nextRes = check(next, input);
    if (nowRes.error || nextRes.error) return null;
    var isCur = function (r) { return r.status === 'current'; };
    var kind = isCur(nextRes) ? (isCur(nowRes) ? 'stays-current' : 'becomes-current') : (isCur(nowRes) ? 'no-longer-current' : 'still-not-current');
    var at = Date.parse(next.effectiveFrom);
    return { kind: kind, next: next, nextRes: nextRes, nowRes: nowRes, active: active, effectiveFrom: at, days: daysUntil(n.getTime(), at) };
  }

  var api = { check: check, pick: pick, upcoming: upcoming, forecast: forecast, daysUntil: daysUntil, parse: parse, fmt: fmt, COUNTRIES: COUNTRIES, CATEGORIES: CATEGORIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PDCheck = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('pd-form');
    if (!form) return;
    var out = document.getElementById('pd-result');
    var meta = document.getElementById('pd-meta');
    var data = null, file = null;

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    Object.keys(CATEGORIES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = CATEGORIES[k]; form.category.appendChild(o); });
    Object.keys(COUNTRIES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = COUNTRIES[k]; form.country.appendChild(o); });
    form.category.value = 'F4'; form.country.value = 'all';

    fetch('bulletin.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); }).then(function (d) {
      file = d;
      d = pick(file, new Date());
      data = d;
      meta.innerHTML = 'Based on the <a href="' + esc(d.source) + '" rel="noopener">' + esc(d.bulletinMonth) + ' Visa Bulletin</a> (published ' + esc(fmt(parse(d.published))) + ').';
      var up = upcoming(file, new Date());
      if (up) meta.innerHTML += ' The <a href="' + esc(up.source) + '" rel="noopener">' + esc(up.bulletinMonth) + ' bulletin</a> is already published and takes effect ' + esc(whenText(daysUntil(Date.now(), Date.parse(up.effectiveFrom)))) + '. We show both.';
    }).catch(function () {
      meta.innerHTML = 'We couldn’t load the bulletin data. Please check the <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" rel="noopener">official Visa Bulletin</a>.';
    });

    function whenText(days) {
      if (days <= 0) return 'now';
      if (days === 1) return 'tomorrow';
      return 'in ' + days + ' days';
    }
    function startDate(f) {
      var d = new Date(Date.parse(f.next.effectiveFrom));
      return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' }).format(d);
    }
    // Box about the next bulletin, shown only while it is published but not yet in effect.
    function nextBox(f, chart) {
      if (!f) return '';
      var m = esc(f.next.bulletinMonth), c = esc(chartName(chart)), cut = esc(f.nextRes.cutoffText), when = esc(startDate(f)), wt = esc(whenText(f.days));
      var head, body, cls;
      if (f.kind === 'becomes-current') {
        cls = 'pd-next pd-next-good';
        head = '<span aria-hidden="true">✓</span> Congratulations. Your date becomes current on ' + when;
        body = '<p>The ' + m + ' Visa Bulletin is already published. In it, your priority date is ' + (f.nextRes.cutoff === 'C' ? 'current for everyone in this category and country' : 'earlier than the cutoff date (' + c + ': ' + cut + ')') + '. That bulletin takes effect ' + wt + ', on ' + when + '.</p>';
      } else if (f.kind === 'stays-current') {
        cls = 'pd-next pd-next-good';
        head = '<span aria-hidden="true">✓</span> Still current in the ' + m + ' bulletin';
        body = '<p>The ' + m + ' Visa Bulletin is already published and your priority date stays current in it (' + c + ': ' + cut + '). It takes effect ' + wt + ', on ' + when + '.</p>';
      } else if (f.kind === 'no-longer-current') {
        cls = 'pd-next pd-next-warn';
        head = '<span aria-hidden="true">!</span> Heads up: not current in the ' + m + ' bulletin';
        body = '<p>Your date is current in the ' + esc(f.active.bulletinMonth) + ' bulletin, but the ' + m + ' Visa Bulletin (' + c + ') has a cutoff of ' + cut + '. It takes effect ' + wt + ', on ' + when + '. Ask a licensed attorney or accredited representative what this means for your case.</p>';
      } else {
        cls = 'pd-next pd-next-info';
        head = 'Not current in the ' + m + ' bulletin either';
        body = '<p>The ' + m + ' Visa Bulletin is already published (' + c + ' cutoff: ' + cut + '). It takes effect ' + wt + ', on ' + when + '. Your date is still later than the cutoff.</p>';
      }
      return '<div class="' + cls + '"><p class="pd-next-head">' + head + '</p>' + body +
        '<p class="small">Based on the published bulletin. Cutoff dates can change again, and for a green card application inside the U.S., USCIS says each month which chart to use. This is not legal advice and does not mean your case is approved.</p></div>';
    }

    function chartName(c) { return c === 'final' ? 'Final Action Dates' : 'Dates for Filing'; }
    function line(c, r) {
      var word = r.status === 'current' ? 'Current' : (r.status === 'unavailable' ? 'Unavailable' : 'Not current');
      return chartName(c) + ': ' + word + ' (cutoff: ' + r.cutoffText + ')';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!data) { out.className = 'result result-error'; out.innerHTML = '<p><strong>Bulletin data not loaded.</strong> Please refresh the page or check the official Visa Bulletin.</p>'; out.focus(); return; }
      data = pick(file, new Date());
      var input = { category: form.category.value, country: form.country.value, chart: form.chart.value, pd: form.pd.value };
      var r = check(data, input);
      if (r.error) { out.className = 'result result-error'; out.innerHTML = '<p><strong>Check your entries.</strong> ' + esc(r.error) + '</p>'; out.focus(); return; }
      var html;
      if (r.status === 'current') {
        out.className = 'result pd-yes';
        html = '<p class="pd-head"><span aria-hidden="true">✓</span> Current</p>' + (r.cutoff === 'C' ? '<p>The ' + esc(data.bulletinMonth) + ' Visa Bulletin (' + esc(chartName(r.chart)) + ') shows &ldquo;C&rdquo; for this category and country, which means current for every priority date.</p>' : '<p>Your priority date is earlier than the cutoff date in the ' + esc(data.bulletinMonth) + ' Visa Bulletin (' + esc(chartName(r.chart)) + ': ' + esc(r.cutoffText) + ').</p>');
      } else if (r.status === 'unavailable') {
        out.className = 'result pd-no';
        html = '<p class="pd-head"><span aria-hidden="true">✗</span> Not current</p><p>Visas in this category are marked unavailable (&ldquo;U&rdquo;) in the ' + esc(data.bulletinMonth) + ' Visa Bulletin.</p>';
      } else {
        out.className = 'result pd-no';
        html = '<p class="pd-head"><span aria-hidden="true">✗</span> Not current yet</p><p>The cutoff in the ' + esc(data.bulletinMonth) + ' Visa Bulletin (' + esc(chartName(r.chart)) + ') is ' + esc(r.cutoffText) + '. Your priority date is later than the cutoff (by ' + esc(r.gap) + '). Cutoff dates can move forward, stay the same, or move backward.</p>';
      }
      html += '<p class="small">' + esc(line(r.otherChart, r.other)) + '</p>';
      html += nextBox(forecast(file, input, new Date()), r.chart);
      if (r.stale) html += '<p class="small"><strong>This data is for ' + esc(data.bulletinMonth) + '.</strong> A newer bulletin may be out. Check the <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" rel="noopener">official Visa Bulletin</a>.</p>';
      html += '<p class="small">This is general information, not legal advice. A &ldquo;current&rdquo; result does not mean your case is approved or that you can file; other steps and rules apply.</p>';
      out.innerHTML = html;
      out.focus();
    });
    form.addEventListener('reset', function () { out.className = 'result'; out.innerHTML = ''; setTimeout(function () { form.category.value = 'F4'; form.country.value = 'all'; }, 0); });
  });
})(typeof window !== 'undefined' ? window : this);
