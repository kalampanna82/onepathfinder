/* Visa Bulletin pace: how a category's Final Action Date has moved over time. Runs in the browser; nothing you enter is sent or stored.
   Data: history.json (one entry per monthly bulletin). Cells are DDMMMYY as printed by the State Department, C (current) or U (unavailable).
   This shows what happened in past bulletins. It does not predict what will happen next. */
(function (root) {
  'use strict';
  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var MONFULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseCell(s) {
    if (s === 'C' || s === 'U') return s;
    var y = parseInt(s.slice(5), 10);
    return { y: y + (y <= 40 ? 2000 : 1900), m: MON.indexOf(s.slice(2, 5)), d: parseInt(s.slice(0, 2), 10) };
  }
  function ms(p) { return Date.UTC(p.y, p.m, p.d); }
  function fmtDate(p) { return p.d + ' ' + MONFULL[p.m] + ' ' + p.y; }
  function fmtCell(s) { var p = parseCell(s); return p === 'C' ? 'Current' : p === 'U' ? 'Unavailable' : fmtDate(p); }
  function monthLabel(m) { var a = m.split('-'); return MONFULL[parseInt(a[1], 10) - 1] + ' ' + a[0]; }
  function monthIndex(m) { var a = m.split('-'); return parseInt(a[0], 10) * 12 + parseInt(a[1], 10) - 1; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // Size of the gap between two dates, in calendar words, always positive. Same rules as the Visa Bulletin movement tool.
  function span(a, b) {
    var lo = ms(a) <= ms(b) ? a : b, hi = lo === a ? b : a;
    var days = Math.round((ms(hi) - ms(lo)) / 864e5);
    var months = (hi.y - lo.y) * 12 + (hi.m - lo.m) - (hi.d < lo.d ? 1 : 0);
    var rem = Math.round((ms(hi) - Date.UTC(lo.y, lo.m + months, lo.d)) / 864e5);
    var label;
    if (days === 0) return { label: '0 days', days: 0 };
    if (rem === 0 && months >= 12) { var y = Math.floor(months / 12), r = months % 12; label = y + ' yr' + (r ? ' ' + r + ' mo' : ''); }
    else if (rem === 0 && months >= 1) label = months + ' mo';
    else if (months === 0) label = days % 7 === 0 ? plural(days / 7, 'wk') : plural(days, 'day');
    else label = (months >= 12 ? Math.floor(months / 12) + ' yr ' + (months % 12 ? months % 12 + ' mo ' : '') : months + ' mo ') + rem + ' d';
    return { label: label.trim(), days: days };
  }

  /* dir: 1 forward, 0 same, -1 backward. A date that becomes current is forward; current that gets a date is backward. */
  function movement(o, n) {
    if (o === n) return { dir: 0, label: 'No change' };
    if (o === 'U') return { dir: 1, label: n === 'C' ? 'Now current' : 'Now available' };
    if (n === 'U') return { dir: -1, label: 'Now unavailable' };
    if (o === 'C') return { dir: -1, label: 'No longer current' };
    if (n === 'C') return { dir: 1, label: 'Now current' };
    var a = parseCell(o), b = parseCell(n), dir = ms(b) > ms(a) ? 1 : -1;
    if (ms(a) === ms(b)) return { dir: 0, label: 'No change' };
    return { dir: dir, label: (dir === 1 ? '+' : '−') + span(a, b).label };
  }

  // One category and country across the months we have. kind: 'eb' or 'fam'.
  function series(data, kind, row, col) {
    var out = [];
    data.months.forEach(function (mo) {
      var t = mo[kind];
      if (!t) return;
      out.push({ m: mo.m, v: t[row][col], src: mo.src });
    });
    return out;
  }

  // The point nearest to "months back" from the newest point, looking only at or before that month, within 2 months.
  function pointBack(s, monthsBack) {
    if (!s.length) return null;
    var target = monthIndex(s[s.length - 1].m) - monthsBack, best = null;
    s.forEach(function (p) { var i = monthIndex(p.m); if (i <= target && i >= target - 2) best = p; });
    return best;
  }

  function compare(s, from, to) {
    if (!from || !to) return null;
    return { from: from, to: to, move: movement(from.v, to.v), months: monthIndex(to.m) - monthIndex(from.m) };
  }

  function summarize(s) {
    var last = s[s.length - 1];
    return {
      now: last,
      year: compare(s, pointBack(s, 12), last),
      all: compare(s, s[0], last),
      stats: stats(s)
    };
  }

  function stats(s) {
    var st = { published: s.length, current: 0, unavailable: 0, forward: 0, same: 0, back: 0 };
    s.forEach(function (p, i) {
      if (p.v === 'C') st.current++;
      if (p.v === 'U') st.unavailable++;
      if (i) { var d = movement(s[i - 1].v, p.v).dir; if (d === 1) st.forward++; else if (d === -1) st.back++; else st.same++; }
    });
    return st;
  }

  // Where a priority date stands against the newest cutoff. pd is {y,m,d}. Current means the date is earlier than the cutoff.
  function standing(cell, pd) {
    var c = parseCell(cell);
    if (c === 'C') return { status: 'current', text: 'Everyone in this category is current.' };
    if (c === 'U') return { status: 'unavailable', text: 'No visa numbers are available in this category this month.' };
    if (ms(pd) < ms(c)) return { status: 'current', text: 'Your priority date is ' + span(pd, c).label + ' earlier than the cutoff.' };
    return { status: 'waiting', text: 'Your priority date is ' + (ms(pd) === ms(c) ? 'the same day as' : span(pd, c).label + ' later than') + ' the cutoff.' };
  }

  var api = { parseCell: parseCell, fmtCell: fmtCell, monthLabel: monthLabel, monthIndex: monthIndex, movement: movement, span: span,
    series: series, pointBack: pointBack, summarize: summarize, stats: stats, standing: standing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.VBPace = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DESC = {
    'EB-1': 'Priority workers', 'EB-2': 'Advanced degree or exceptional ability, including NIW', 'EB-3': 'Skilled workers and professionals',
    'EB-3 Other Workers': 'Less than two years of training', 'EB-4': 'Certain special immigrants', 'EB-5 Unreserved': 'Investors outside the set-asides',
    F1: 'Unmarried sons and daughters of U.S. citizens', F2A: 'Spouses and children of permanent residents',
    F2B: 'Unmarried adult sons and daughters of permanent residents', F3: 'Married sons and daughters of U.S. citizens', F4: 'Brothers and sisters of adult U.S. citizens'
  };
  var data = null;

  function dayNum(p) { return ms(p) / 864e5; }

  function chart(s, pd) {
    var W = 640, H = 300, L = 64, R = 14, T = 30, B = 40, pw = W - L - R, ph = H - T - B;
    var m0 = monthIndex(s[0].m), m1 = monthIndex(s[s.length - 1].m);
    var X = function (m) { return L + (m1 === m0 ? pw / 2 : (monthIndex(m) - m0) / (m1 - m0) * pw); };
    var dated = s.filter(function (p) { return p.v !== 'C' && p.v !== 'U'; }).map(function (p) { return dayNum(parseCell(p.v)); });
    if (pd) dated.push(dayNum(pd));
    var hasC = s.some(function (p) { return p.v === 'C'; }), hasU = s.some(function (p) { return p.v === 'U'; });
    var topPad = hasC ? 26 : 0, botPad = hasU ? 26 : 0;
    var lo, hi;
    if (dated.length) { lo = Math.min.apply(null, dated); hi = Math.max.apply(null, dated); }
    else { lo = Date.UTC(2020, 0, 1) / 864e5; hi = Date.UTC(2021, 0, 1) / 864e5; }
    var pad = Math.max((hi - lo) * 0.1, 60); lo -= pad; hi += pad;
    var yTop = T + topPad, yBot = T + ph - botPad;
    var Y = function (d) { return yBot - (d - lo) / (hi - lo) * (yBot - yTop); };
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-labelledby="pace-t pace-d" class="pace-svg"><title id="pace-t">Final Action Date by month</title>' +
      '<desc id="pace-d">' + esc(s.length + ' bulletins from ' + monthLabel(s[0].m) + ' to ' + monthLabel(s[s.length - 1].m) + '. The month-by-month numbers are listed in the table below the chart.') + '</desc>';
    // year grid
    var y0 = new Date(lo * 864e5).getUTCFullYear(), y1 = new Date(hi * 864e5).getUTCFullYear();
    var span1 = y1 - y0, step = span1 > 8 ? 2 : 1;
    for (var yr = y0; yr <= y1 + 1; yr += step) {
      var dd = Date.UTC(yr, 0, 1) / 864e5; if (dd < lo || dd > hi) continue;
      out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(dd).toFixed(1) + '" y2="' + Y(dd).toFixed(1) + '" class="pace-grid"/><text x="' + (L - 8) + '" y="' + (Y(dd) + 4).toFixed(1) + '" text-anchor="end" class="pace-axis">' + yr + '</text>';
    }
    if (hasC) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + 8) + '" y2="' + (T + 8) + '" class="pace-band"/><text x="' + (L - 8) + '" y="' + (T + 12) + '" text-anchor="end" class="pace-axis">Current</text>';
    if (hasU) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph - 8) + '" y2="' + (T + ph - 8) + '" class="pace-band"/><text x="' + (L - 8) + '" y="' + (T + ph - 4) + '" text-anchor="end" class="pace-axis">Unavailable</text>';
    // x labels: every 3 calendar months from the first bulletin, even where a month has no data
    for (var mi = m0; mi <= m1; mi += 3) {
      var yy = Math.floor(mi / 12), mm = mi % 12;
      var xx = L + (m1 === m0 ? pw / 2 : (mi - m0) / (m1 - m0) * pw);
      out += '<text x="' + xx.toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle" class="pace-axis">' + MONFULL[mm] + " '" + String(yy).slice(2) + '</text>';
    }
    // priority date line
    if (pd) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(dayNum(pd)).toFixed(1) + '" y2="' + Y(dayNum(pd)).toFixed(1) + '" class="pace-pd"/><text x="' + (W - R) + '" y="' + (Y(dayNum(pd)) - 5).toFixed(1) + '" text-anchor="end" class="pace-pdt">Your priority date</text>';
    // line segments between consecutive dated points (dashed across missing months)
    var path = '';
    for (var i = 1; i < s.length; i++) {
      var a2 = s[i - 1], b2 = s[i];
      if (a2.v === 'C' || a2.v === 'U' || b2.v === 'C' || b2.v === 'U') continue;
      var gap = monthIndex(b2.m) - monthIndex(a2.m) > 1;
      out += '<line x1="' + X(a2.m).toFixed(1) + '" y1="' + Y(dayNum(parseCell(a2.v))).toFixed(1) + '" x2="' + X(b2.m).toFixed(1) + '" y2="' + Y(dayNum(parseCell(b2.v))).toFixed(1) + '" class="pace-line' + (gap ? ' pace-gap' : '') + '"/>';
    }
    s.forEach(function (p) {
      var cy = p.v === 'C' ? T + 8 : p.v === 'U' ? T + ph - 8 : Y(dayNum(parseCell(p.v)));
      out += '<circle cx="' + X(p.m).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.5" class="pace-dot' + (p.v === 'C' || p.v === 'U' ? ' pace-dot-' + p.v : '') + '"/>';
    });
    return out + '</svg>';
  }

  function tr(label, cmp) {
    if (!cmp) return '<div class="pace-row"><div class="pace-lab">' + label + '</div><div class="pace-dates small">Not enough bulletins in the data to compare.</div></div>';
    var cls = cmp.move.dir === 1 ? 'pace-up' : cmp.move.dir === -1 ? 'pace-down' : 'pace-same';
    return '<div class="pace-row"><div class="pace-lab">' + label + '<br><span class="small">' + monthLabel(cmp.from.m) + ' to ' + monthLabel(cmp.to.m) + '</span></div>' +
      '<div class="pace-chipbox"><span class="pace-chip ' + cls + '">' + esc(cmp.move.label) + '</span></div>' +
      '<div class="pace-dates">' + esc(fmtCell(cmp.from.v)) + ' &rarr; ' + esc(fmtCell(cmp.to.v)) + '</div></div>';
  }

  function render() {
    var kind = $('pace-kind').value, row = parseInt($('pace-cat').value, 10), col = parseInt($('pace-country').value, 10);
    var pdv = $('pace-pd').value, pd = null;
    if (pdv) { var a = pdv.split('-'); if (a.length === 3 && a[0].length === 4) pd = { y: +a[0], m: +a[1] - 1, d: +a[2] }; }
    var s = series(data, kind, row, col), sm = summarize(s), st = sm.stats;
    var name = (kind === 'eb' ? data.ebRows : data.famRows)[row], country = data.cols[col];
    var html = '<h2 class="pace-h">' + esc(name) + ', ' + esc(country) + '</h2>';
    html += '<p class="pace-now"><span class="small">Final Action Date in the ' + monthLabel(sm.now.m) + ' bulletin</span><br><strong>' + esc(fmtCell(sm.now.v)) + '</strong></p>';
    if (pd) {
      var f = standing(sm.now.v, pd);
      html += '<p class="pace-stand pace-' + f.status + '">' + (f.status === 'current' ? '<strong>Current in this bulletin.</strong> ' : f.status === 'waiting' ? '<strong>Not current yet.</strong> ' : '<strong>Unavailable.</strong> ') + esc(f.text) + '</p>';
    }
    html += '<div class="pace-rows">' + tr('Last 12 months', sm.year) + tr('All bulletins we have', sm.all) + '</div>';
    var bits = [];
    if (st.current) bits.push('current in ' + plural(st.current, 'bulletin'));
    if (st.unavailable) bits.push('unavailable in ' + plural(st.unavailable, 'bulletin'));
    html += '<p class="small">Across ' + plural(st.published, 'bulletin') + ' (' + monthLabel(s[0].m) + ' to ' + monthLabel(sm.now.m) + '): the date moved forward ' + plural(st.forward, 'time') + ', stayed the same ' + plural(st.same, 'time') + ' and moved back ' + plural(st.back, 'time') + (bits.length ? '. It was ' + bits.join(' and ') : '') + '. Each bulletin is compared with the one before it that we have.</p>';
    html += chart(s, pd);
    if (s.length < data.months.length) html += '<p class="small">Some months are missing for this chart, so a few line segments are dashed.</p>';
    html += '<details class="pace-details"><summary>Show the numbers month by month</summary><table class="result-table"><thead><tr><th scope="col">Bulletin</th><th scope="col">Final Action Date</th></tr></thead><tbody>' +
      s.slice().reverse().map(function (p) { return '<tr><th scope="row">' + monthLabel(p.m) + '</th><td>' + esc(fmtCell(p.v)) + '</td></tr>'; }).join('') + '</tbody></table></details>';
    $('pace-result').innerHTML = html;
  }

  function fillCats() {
    var kind = $('pace-kind').value, rows = kind === 'eb' ? data.ebRows : data.famRows, sel = $('pace-cat');
    sel.innerHTML = rows.map(function (r, i) { return '<option value="' + i + '">' + esc(r) + ': ' + esc(DESC[r] || '') + '</option>'; }).join('');
    sel.value = kind === 'eb' ? '1' : '1';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('pace-form');
    if (!form) return;
    fetch('history.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
      data = j;
      $('pace-country').innerHTML = j.cols.map(function (c, i) { return '<option value="' + i + '">' + esc(i === 0 ? 'Rest of World (all other countries)' : c) + '</option>'; }).join('');
      $('pace-country').value = '0';
      fillCats();
      $('pace-kind').addEventListener('change', function () { fillCats(); render(); });
      ['pace-cat', 'pace-country', 'pace-pd'].forEach(function (id) { $(id).addEventListener('change', render); });
      $('pace-pd').addEventListener('input', render);
      form.addEventListener('submit', function (e) { e.preventDefault(); render(); });
      form.addEventListener('reset', function () { setTimeout(function () { fillCats(); render(); }, 0); });
      var last = j.months[j.months.length - 1].m;
      $('pace-meta').textContent = 'Based on ' + j.months.length + ' monthly bulletins, ' + monthLabel(j.months[0].m) + ' to ' + monthLabel(last) + '. Source: U.S. Department of State Visa Bulletin, Final Action Dates.';
      render();
    }).catch(function () {
      $('pace-result').innerHTML = '<p>Sorry, the bulletin history could not be loaded. Please try again later.</p>';
    });
  });
})(typeof window !== 'undefined' ? window : this);
