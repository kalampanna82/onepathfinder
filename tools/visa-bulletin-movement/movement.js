/* Visa Bulletin movement: compares two monthly bulletins. Cells are DDMMMYY as printed by the State Department, or C for current.
   Column order: Rest of World, China, India, Mexico, Philippines. To add a month, replace FROM/TO and the two data sets. */
(function () {
  var FROM = 'October 2026', TO = 'November 2026';
  var CSHORT = ['Rest of World', 'China', 'India', 'Mexico', 'Philippines'];
  var CATS = {
    eb: [['EB-1', 'Priority workers'], ['EB-2', 'Advanced degree or exceptional ability, including NIW'], ['EB-3', 'Skilled workers and professionals'],
      ['EB-3 Other Workers', 'Less than two years of training'], ['EB-4', 'Certain special immigrants'], ['EB-4 Religious Workers', 'Certain religious workers'],
      ['EB-5 Unreserved', 'Investors outside the set-asides'], ['EB-5 Rural', '20% set-aside'], ['EB-5 High Unemployment', '10% set-aside'], ['EB-5 Infrastructure', '2% set-aside']],
    fam: [['F1', 'Unmarried sons and daughters of U.S. citizens'], ['F2A', 'Spouses and children of permanent residents'],
      ['F2B', 'Unmarried adult sons and daughters of permanent residents'], ['F3', 'Married sons and daughters of U.S. citizens'], ['F4', 'Brothers and sisters of adult U.S. citizens']]
  };
  var C5 = ['C', 'C', 'C', 'C', 'C'], S5 = function (d) { return [d, d, d, d, d]; };
  var DATA = {
    from: {
      eb: {
        fad: [['C', '01JUL23', '01FEB23', 'C', 'C'], ['01JAN25', '01OCT21', '01NOV13', '01JAN25', '01JAN25'], ['15MAY24', '08JAN22', '01JAN14', '15MAY24', '15AUG23'],
          ['01JAN22', '01OCT19', '01JAN14', '01JAN22', '01JAN22'], S5('15DEC22'), S5('15DEC22'), ['C', '01DEC16', '01DEC23', 'C', 'C'], C5, C5, C5],
        dff: [['C', '01JUL24', '01JUL24', 'C', 'C'], ['15MAR26', '01JAN23', '15JAN15', '15MAR26', '15MAR26'], ['01AUG24', '01APR24', '15JAN15', '01AUG24', '01JAN24'],
          ['01JUN22', '01OCT20', '15JAN15', '01JUN22', '01JUN22'], S5('01JAN25'), S5('01JAN25'), ['C', '01MAR21', '01MAY24', 'C', 'C'], C5, C5, C5]
      },
      fam: {
        fad: [['22JAN20', '22JAN20', '22JAN20', '08SEP08', '01NOV13'], ['22SEP26', '22SEP26', '22SEP26', '22MAR26', '22SEP26'], ['22AUG19', '22AUG19', '22AUG19', '15MAY10', '01OCT13'],
          ['22OCT14', '22OCT14', '22OCT14', '01JUL01', '22JUL06'], ['22OCT11', '22OCT11', '15DEC06', '22APR01', '15MAY08']],
        dff: [['01FEB20', '01FEB20', '01FEB20', '01DEC08', '22APR15'], C5, ['01SEP19', '01SEP19', '01SEP19', '22MAR11', '01OCT14'],
          ['01NOV14', '01NOV14', '01NOV14', '01DEC02', '22OCT06'], ['01NOV11', '01NOV11', '01FEB07', '30APR01', '22MAR09']]
      }
    },
    to: {
      eb: {
        fad: [['C', '01AUG23', '01FEB23', 'C', 'C'], ['01APR25', '01OCT21', '01NOV13', '01APR25', '01APR25'], ['15JUN24', '22JAN22', '22JAN14', '15JUN24', '15AUG23'],
          ['01JUN22', '01OCT19', '22JAN14', '01JUN22', '01JAN22'], S5('15DEC22'), S5('15DEC22'), ['C', '01DEC16', '01DEC23', 'C', 'C'], C5, C5, C5],
        dff: [['C', '01JUL24', '01JUL24', 'C', 'C'], ['15MAR26', '01JAN23', '15JAN15', '15MAR26', '15MAR26'], ['01AUG24', '01APR24', '15JAN15', '01AUG24', '01JAN24'],
          ['01JUL22', '01OCT20', '15JAN15', '01JUL22', '01JUN22'], S5('01JAN25'), S5('01JAN25'), ['C', '01MAR21', '01MAY24', 'C', 'C'], C5, C5, C5]
      },
      fam: {
        fad: [['22JAN21', '22JAN21', '22JAN21', '22SEP08', '01NOV13'], ['22OCT26', '22OCT26', '22OCT26', '22APR26', '22OCT26'], ['22AUG20', '22AUG20', '22AUG20', '15MAY10', '01OCT13'],
          ['22OCT15', '22OCT15', '22OCT15', '15JUL01', '22JUL06'], ['22OCT12', '22OCT12', '15DEC06', '22APR01', '15MAY08']],
        dff: [['01FEB21', '01FEB21', '01FEB21', '01DEC08', '22APR15'], C5, ['01SEP20', '01SEP20', '01SEP20', '22MAR11', '01OCT14'],
          ['01NOV15', '01NOV15', '01NOV15', '01DEC02', '22OCT06'], ['01NOV12', '01NOV12', '01FEB07', '30APR01', '22MAR09']]
      }
    }
  };

  var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var MONFULL = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function parse(s) { return { y: 2000 + parseInt(s.slice(5), 10), m: MON.indexOf(s.slice(2, 5)), d: parseInt(s.slice(0, 2), 10) }; }
  function ms(p) { return Date.UTC(p.y, p.m, p.d); }
  function fmt(s) { if (s === 'C') return 'Current'; var p = parse(s); return p.d + ' ' + MONFULL[p.m] + ' ' + p.y; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* dir: 1 forward, 0 same, -1 retrogressed. A date that becomes current is forward; current that gets a date is retrogression. */
  function movement(o, n) {
    if (o === n) return { dir: 0, label: 'No change', days: 0 };
    if (o === 'C') return { dir: -1, label: 'No longer current', days: null };
    if (n === 'C') return { dir: 1, label: 'Now current', days: null };
    var a = parse(o), b = parse(n), dir = ms(b) > ms(a) ? 1 : -1;
    var lo = dir === 1 ? a : b, hi = dir === 1 ? b : a;
    var days = Math.round((ms(hi) - ms(lo)) / 864e5);
    var months = (hi.y - lo.y) * 12 + (hi.m - lo.m) - (hi.d < lo.d ? 1 : 0);
    var rem = Math.round((ms(hi) - Date.UTC(lo.y, lo.m + months, lo.d)) / 864e5);
    var label;
    if (rem === 0 && months >= 12) { var y = Math.floor(months / 12), r = months % 12; label = y + ' yr' + (r ? ' ' + r + ' mo' : ''); }
    else if (rem === 0 && months >= 1) label = months + ' mo';
    else if (months === 0) label = days % 7 === 0 ? (days / 7) + (days / 7 === 1 ? ' wk' : ' wks') : plural(days, 'day');
    else label = (months >= 12 ? Math.floor(months / 12) + ' yr ' + (months % 12 ? months % 12 + ' mo ' : '') : months + ' mo ') + rem + ' d';
    return { dir: dir, label: (dir === 1 ? '+' : '−') + label.trim(), days: dir * days };
  }

  var state = { kind: 'eb', chart: 'fad', country: -1, only: false };
  var $ = function (id) { return document.getElementById(id); };

  function render() {
    var oldT = DATA.from[state.kind][state.chart], newT = DATA.to[state.kind][state.chart], cats = CATS[state.kind];
    var up = 0, same = 0, down = 0, html = '';
    cats.forEach(function (cat, r) {
      var items = '';
      CSHORT.forEach(function (name, c) {
        if (state.country !== -1 && state.country !== c) return;
        var mv = movement(oldT[r][c], newT[r][c]);
        if (mv.dir === 1) up++; else if (mv.dir === -1) down++; else same++;
        if (state.only && mv.dir === 0) return;
        var cls = mv.dir === 1 ? 'up' : mv.dir === -1 ? 'down' : 'same', glyph = mv.dir === 1 ? '▲' : mv.dir === -1 ? '▼' : '●';
        var was = mv.dir === 0 ? 'Same as ' + FROM.split(' ')[0] : 'Was ' + fmt(oldT[r][c]) + (mv.days ? ' · ' + Math.abs(mv.days) + ' days' : '');
        items += '<div class="vbm-item"><span class="vbm-who">' + name + '</span>' +
          '<span class="vbm-new">' + fmt(newT[r][c]) + '</span><span class="vbm-was">' + was + '</span>' +
          '<span class="vbm-chip ' + cls + '"><span aria-hidden="true">' + glyph + '</span>' + mv.label + '</span></div>';
      });
      if (items) html += '<article class="vbm-card"><h3>' + cat[0] + '<small>' + cat[1] + '</small></h3>' + items + '</article>';
    });
    $('vbm-grid').innerHTML = html || '<p class="vbm-empty">No changes for this selection.</p>';
    $('vbm-up').textContent = up; $('vbm-same').textContent = same; $('vbm-down').textContent = down;
    $('vbm-meta').textContent = FROM + ' to ' + TO + ', ' + (state.chart === 'fad' ? 'Final Action Dates' : 'Dates for Filing') + '.';
  }
  function wire(id, key, num) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state[key] = num ? parseInt(b.getAttribute('data-v'), 10) : b.getAttribute('data-v');
      Array.prototype.forEach.call($(id).children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      render();
    });
  }
  var seg = '<button type="button" data-v="-1" aria-pressed="true">All</button>';
  CSHORT.forEach(function (c, i) { seg += '<button type="button" data-v="' + i + '" aria-pressed="false">' + c + '</button>'; });
  $('vbm-country').innerHTML = seg;
  wire('vbm-kind', 'kind'); wire('vbm-chart', 'chart'); wire('vbm-country', 'country', true);
  $('vbm-only').addEventListener('change', function (e) { state.only = e.target.checked; render(); });
  render();
})();
