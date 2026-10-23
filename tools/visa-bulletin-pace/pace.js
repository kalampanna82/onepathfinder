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

  function fmtMonths(n) {
    if (n < 12) return n + ' mo';
    var y = Math.floor(n / 12), r = n % 12;
    return y + ' yr' + (r ? ' ' + r + ' mo' : '');
  }

  // Change between two points. rate is the average movement in whole months per year, only when both ends are dates.
  function compare(from, to) {
    if (!from || !to) return null;
    var months = monthIndex(to.m) - monthIndex(from.m), rate = null;
    if (months > 0 && from.v !== 'C' && from.v !== 'U' && to.v !== 'C' && to.v !== 'U') {
      var diff = (ms(parseCell(to.v)) - ms(parseCell(from.v))) / 864e5 / 30.4375;
      rate = Math.round(diff / (months / 12));
    }
    return { from: from, to: to, move: movement(from.v, to.v), months: months, rate: rate };
  }

  var ANCHORS = [36, 24, 12];

  // The newest bulletin, the points 1, 2 and 3 years before it, the change over each stretch, and the change from each anchor to now.
  function summarize(s) {
    var last = s[s.length - 1], pts = ANCHORS.map(function (b) { return pointBack(s, b); }).concat([last]);
    var win = windowOf(s);
    return {
      now: last,
      pts: pts,
      steps: [compare(pts[0], pts[1]), compare(pts[1], pts[2]), compare(pts[2], pts[3])],
      y1: compare(pts[2], last), y2: compare(pts[1], last), y3: compare(pts[0], last),
      win: win,
      stats: stats(win)
    };
  }

  // Bulletins inside the 3-year window ending at the newest one.
  function windowOf(s) {
    var start = monthIndex(s[s.length - 1].m) - 36;
    return s.filter(function (p) { return monthIndex(p.m) >= start; });
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
    series: series, pointBack: pointBack, compare: compare, windowOf: windowOf, fmtMonths: fmtMonths, summarize: summarize, stats: stats, standing: standing };
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

  var narrowNow = null;
  function isNarrow() { return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:560px)').matches; }
  var CLS = { 1: 'up', 0: 'same', '-1': 'down' };

  /* The chart covers the 3 years ending at the newest bulletin. Year lines mark each anniversary with how far the date moved that year.
     Segments are colored by direction. The grey dashed line shows what "one year of movement per year" would look like from the start. */
  function chart(sm, pd) {
    var s = sm.win, narrow = isNarrow(), W = narrow ? 440 : 640, H = narrow ? 400 : 340, L = narrow ? 84 : 76, R = 18, T = 52, B = 40, pw = W - L - R, ph = H - T - B;
    var m1 = monthIndex(sm.now.m), m0 = m1 - 36;
    var X = function (mi) { return L + (mi - m0) / 36 * pw; };
    var dated = s.filter(function (p) { return p.v !== 'C' && p.v !== 'U'; }).map(function (p) { return dayNum(parseCell(p.v)); });
    var first = s[0], refOk = first && first.v !== 'C' && first.v !== 'U' && monthIndex(first.m) === m0;
    var ref0 = refOk ? dayNum(parseCell(first.v)) : null;
    if (refOk) dated.push(ref0 + 3 * 365.25);
    if (pd) dated.push(dayNum(pd));
    var hasC = s.some(function (p) { return p.v === 'C'; }), hasU = s.some(function (p) { return p.v === 'U'; });
    var topPad = hasC ? 26 : 0, botPad = hasU ? 26 : 0, lo, hi;
    if (dated.length) { lo = Math.min.apply(null, dated); hi = Math.max.apply(null, dated); }
    else { lo = Date.UTC(2020, 0, 1) / 864e5; hi = Date.UTC(2021, 0, 1) / 864e5; }
    var pad = Math.max((hi - lo) * 0.08, 60); lo -= pad; hi += pad;
    var yTop = T + topPad, yBot = T + ph - botPad;
    var Y = function (d) { return yBot - (d - lo) / (hi - lo) * (yBot - yTop); };
    var out = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-labelledby="pace-t pace-d" class="pace-svg"><title id="pace-t">Final Action Date by month, last 3 years</title>' +
      '<desc id="pace-d">' + esc(s.length + ' bulletins from ' + monthLabel(s[0].m) + ' to ' + monthLabel(sm.now.m) + '. The same numbers are in the story above and in the table below the chart.') + '</desc>';
    // alternate year bands, with the movement for each year at the top
    for (var k = 0; k < 3; k++) {
      var xa = X(m0 + 12 * k), xb = X(m0 + 12 * (k + 1)), st = sm.steps[k];
      if (k % 2 === 0) out += '<rect x="' + xa.toFixed(1) + '" y="' + T + '" width="' + (xb - xa).toFixed(1) + '" height="' + ph + '" class="pace-yband"/>';
      var cls = st ? CLS[st.move.dir] : 'na';
      out += '<text x="' + ((xa + xb) / 2).toFixed(1) + '" y="' + (T - 28) + '" text-anchor="middle" class="pace-yl">Year ' + (k + 1) + '</text>' +
        '<text x="' + ((xa + xb) / 2).toFixed(1) + '" y="' + (T - 9) + '" text-anchor="middle" class="pace-ym pace-t-' + cls + '">' + (st ? esc(st.move.label.replace(/ \d+ d$/, '').replace(/^([+−])(\d+ d)$/, '$1$2')) : 'n/a') + '</text>';
    }
    // date grid
    var y0 = new Date(lo * 864e5).getUTCFullYear(), y1 = new Date(hi * 864e5).getUTCFullYear(), step = y1 - y0 > 8 ? 2 : 1;
    for (var yr = y0; yr <= y1 + 1; yr += step) {
      var dd = Date.UTC(yr, 0, 1) / 864e5; if (dd < lo || dd > hi) continue;
      out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(dd).toFixed(1) + '" y2="' + Y(dd).toFixed(1) + '" class="pace-grid"/><text x="' + (L - 8) + '" y="' + (Y(dd) + 4).toFixed(1) + '" text-anchor="end" class="pace-axis">' + yr + '</text>';
    }
    if (hasC) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + 8) + '" y2="' + (T + 8) + '" class="pace-band"/><text x="' + (L - 8) + '" y="' + (T + 12) + '" text-anchor="end" class="pace-axis">Current</text>';
    if (hasU) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph - 8) + '" y2="' + (T + ph - 8) + '" class="pace-band"/><text x="' + (L - 8) + '" y="' + (T + ph - 4) + '" text-anchor="end" class="pace-axis">Unavailable</text>';
    // x labels every 6 months
    for (var mi = m0; mi <= m1; mi += narrow ? 12 : 6) out += '<text x="' + X(mi).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="' + (mi === m0 ? 'start' : mi === m1 ? 'end' : 'middle') + '" class="pace-axis">' + MONFULL[mi % 12] + " '" + String(Math.floor(mi / 12)).slice(2) + '</text>';
    // anniversary lines
    for (var j = 0; j <= 3; j++) out += '<line x1="' + X(m0 + 12 * j).toFixed(1) + '" x2="' + X(m0 + 12 * j).toFixed(1) + '" y1="' + (T - 4) + '" y2="' + (T + ph) + '" class="pace-ann"/>';
    // one year per year reference
    if (refOk) out += '<line x1="' + X(m0).toFixed(1) + '" y1="' + Y(ref0).toFixed(1) + '" x2="' + X(m1).toFixed(1) + '" y2="' + Y(ref0 + 3 * 365.25).toFixed(1) + '" class="pace-ref"/>';
    if (pd) out += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(dayNum(pd)).toFixed(1) + '" y2="' + Y(dayNum(pd)).toFixed(1) + '" class="pace-pd"/>';
    // segments, colored by direction; dashed where a month is missing
    for (var i = 1; i < s.length; i++) {
      var a2 = s[i - 1], b2 = s[i];
      if (a2.v === 'C' || a2.v === 'U' || b2.v === 'C' || b2.v === 'U') continue;
      var gap = monthIndex(b2.m) - monthIndex(a2.m) > 1, dir = movement(a2.v, b2.v).dir;
      out += '<line x1="' + X(monthIndex(a2.m)).toFixed(1) + '" y1="' + Y(dayNum(parseCell(a2.v))).toFixed(1) + '" x2="' + X(monthIndex(b2.m)).toFixed(1) + '" y2="' + Y(dayNum(parseCell(b2.v))).toFixed(1) + '" class="pace-seg pace-s-' + CLS[dir] + (gap ? ' pace-gap' : '') + '"/>';
    }
    s.forEach(function (p) {
      var cy = p.v === 'C' ? T + 8 : p.v === 'U' ? T + ph - 8 : Y(dayNum(parseCell(p.v)));
      out += '<circle cx="' + X(monthIndex(p.m)).toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.8" class="pace-dot' + (p.v === 'C' || p.v === 'U' ? ' pace-dot-' + p.v : '') + '"/>';
    });
    // anchor points get a larger marker and their date
    sm.pts.forEach(function (p, idx) {
      if (!p) return;
      var cy = p.v === 'C' ? T + 8 : p.v === 'U' ? T + ph - 8 : Y(dayNum(parseCell(p.v))), x = X(monthIndex(p.m));
      var anchor = idx === 0 ? 'start' : idx === 3 ? 'end' : 'middle', below = idx % 2 === 1 && p.v !== 'U';
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5.5" class="pace-anchor"/><text x="' + x.toFixed(1) + '" y="' + (below ? cy + 20 : cy - 11).toFixed(1) + '" text-anchor="' + anchor + '" class="pace-av">' + esc(fmtCell(p.v)) + '</text>';
    });
    return out + '</svg>' +
      '<p class="pace-legend small"><span class="pace-li"><i class="pace-lg pace-lg-up"></i>forward</span><span class="pace-li"><i class="pace-lg pace-lg-down"></i>backward</span><span class="pace-li"><i class="pace-lg pace-lg-same"></i>no change</span>' +
      (refOk ? '<span class="pace-li"><i class="pace-lg pace-lg-ref"></i>one year of movement per calendar year</span>' : '') +
      (pd ? '<span class="pace-li"><i class="pace-lg pace-lg-pd"></i>your priority date</span>' : '') + '</p>';
  }

  function chipFor(c) { return '<span class="pace-chip pace-' + CLS[c.move.dir] + '">' + esc(c.move.label) + '</span>'; }

  function rateText(c) {
    if (c.rate === null) return '';
    if (c.rate === 0) return 'Average: no movement';
    return 'Average: ' + (c.rate > 0 ? '+' : '−') + fmtMonths(Math.abs(c.rate)) + ' per year';
  }

  function tr(label, c) {
    if (!c) return '<div class="pace-row"><div class="pace-lab">' + label + '</div><div class="pace-dates small">Not enough bulletins in the data to compare.</div></div>';
    var rt = rateText(c);
    return '<div class="pace-row"><div class="pace-lab">' + label + '<br><span class="small">' + monthLabel(c.from.m) + ' to ' + monthLabel(c.to.m) + '</span></div>' +
      '<div class="pace-chipbox">' + chipFor(c) + '</div>' +
      '<div class="pace-dates">' + esc(fmtCell(c.from.v)) + ' &rarr; ' + esc(fmtCell(c.to.v)) + (rt ? ' <span class="small">&middot; ' + rt + '</span>' : '') + '</div></div>';
  }

  // The story in order: three years ago, a year later, then, now.
  function story(sm) {
    var lead = ['Three years ago', 'A year later', 'A year after that', 'Now'], out = '<ol class="pace-story">';
    sm.pts.forEach(function (p, i) {
      if (!p) { out += '<li><span class="pace-when">' + lead[i] + '</span> We do not have a bulletin for this point.</li>'; return; }
      var c = i ? sm.steps[i - 1] : null;
      out += '<li><span class="pace-when">' + lead[i] + ' <span class="small">(' + monthLabel(p.m) + ')</span></span> ' + 'it was <strong>' + esc(fmtCell(p.v)) + '</strong>' + (c ? ' ' + chipFor(c) : '') + '</li>';
    });
    return out + '</ol>';
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
    html += '<h3 class="pace-h3">The last three years, step by step</h3>' + story(sm);
    html += '<h3 class="pace-h3">How much it changed</h3><div class="pace-rows">' + tr('In 1 year', sm.y1) + tr('In 2 years', sm.y2) + tr('In 3 years', sm.y3) + '</div>';
    html += '<h3 class="pace-h3">The pace on a chart</h3>' + chart(sm, pd);
    var bits = [];
    if (st.current) bits.push('current in ' + plural(st.current, 'bulletin'));
    if (st.unavailable) bits.push('unavailable in ' + plural(st.unavailable, 'bulletin'));
    html += '<p class="small">Across ' + plural(st.published, 'bulletin') + ' (' + monthLabel(sm.win[0].m) + ' to ' + monthLabel(sm.now.m) + '): the date moved forward ' + plural(st.forward, 'time') + ', stayed the same ' + plural(st.same, 'time') + ' and moved back ' + plural(st.back, 'time') + (bits.length ? '. It was ' + bits.join(' and ') : '') + '. Each bulletin is compared with the one before it that we have.</p>';
    if (sm.win.length < 37) html += '<p class="small">Some months are missing for this category, so a few line segments are dashed.</p>';
    html += '<details class="pace-details"><summary>Show the numbers month by month</summary><table class="result-table"><thead><tr><th scope="col">Bulletin</th><th scope="col">Final Action Date</th></tr></thead><tbody>' +
      sm.win.slice().reverse().map(function (p) { return '<tr><th scope="row">' + monthLabel(p.m) + '</th><td>' + esc(fmtCell(p.v)) + '</td></tr>'; }).join('') + '</tbody></table></details>';
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
      narrowNow = isNarrow();
      window.addEventListener('resize', function () { if (isNarrow() !== narrowNow) { narrowNow = isNarrow(); render(); } });
    }).catch(function () {
      $('pace-result').innerHTML = '<p>Sorry, the bulletin history could not be loaded. Please try again later.</p>';
    });
  });
})(typeof window !== 'undefined' ? window : this);
