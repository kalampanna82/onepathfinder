/* New Jersey resident or nonresident tracker. Runs in the browser; nothing you enter is sent or stored.
   Rules (NJ Division of Taxation GIT-6 "Part-Year Residents" and NJ-1040 / NJ-1040NR instructions, as of Oct 2026):
   NJ domicile = resident, unless all year: no permanent home in NJ, a permanent home outside NJ, and 30 days or fewer in NJ.
   Not domiciled in NJ = resident only if you kept a permanent home in NJ and spent more than 183 days in NJ (statutory resident).
   Moving in or out = part-year resident: NJ-1040 for the resident period, NJ-1040NR for NJ-source income in the nonresident period.
   Filing threshold: gross income from everywhere for the whole year above $10,000 (Single, MFS) or $20,000 (MFJ, HoH, QSS).
   Re-check THRESHOLDS against the current NJ-1040 instructions each year. Not tax or legal advice. */
(function (root) {
  'use strict';

  var THRESHOLDS = { single: 10000, joint: 20000 };

  var NODES = {
    start: {
      q: 'Did you move into or out of New Jersey during the year?',
      hint: 'That is, did your permanent home (your domicile) change from New Jersey to another place, or from another place to New Jersey?',
      options: [
        { label: 'Yes, I moved in or out during the year', next: 'R:part' },
        { label: 'No, my situation was the same all year', next: 'domicile' }
      ]
    },
    domicile: {
      q: 'Is New Jersey your domicile?',
      hint: 'Your domicile is your one true, fixed, permanent home: the place you intend to return to whenever you are away. You can have more than one place to live but only one domicile. The state looks at things like where you vote, your driver’s license and car registration, where your family lives and where you keep your belongings.',
      options: [
        { label: 'Yes, New Jersey is my domicile', next: 'njExc' },
        { label: 'No, my domicile is another state or country', next: 'permHome' }
      ]
    },
    njExc: {
      q: 'Were all three of these true for the whole year?',
      hint: '<ul class="nj-notes"><li>You did not keep a permanent home in New Jersey.</li><li>You kept a permanent home outside New Jersey.</li><li>You spent 30 days or fewer in New Jersey.</li></ul>',
      options: [
        { label: 'Yes, all three', next: 'R:nrExc' },
        { label: 'No, at least one is not true', next: 'R:res' }
      ]
    },
    permHome: {
      q: 'Did you keep a permanent home in New Jersey during the year?',
      hint: 'A permanent home is a place you keep suitable for living all year, whether you own or rent it. A vacation home, a camp or a place kept only for a temporary assignment usually does not count.',
      options: [
        { label: 'Yes', next: 'days' },
        { label: 'No', next: 'R:nr' }
      ]
    },
    days: {
      q: 'Did you spend more than 183 days in New Jersey during the year?',
      hint: 'Any part of a day spent in New Jersey generally counts as a day.',
      options: [
        { label: 'Yes, more than 183 days', next: 'R:statRes' },
        { label: 'No, 183 days or fewer', next: 'R:nr' }
      ]
    }
  };

  var RESULTS = {
    res: { status: 'Full-year New Jersey resident', type: 'res', form: 'NJ-1040 (resident return)',
      note: 'New Jersey is your domicile and the narrow exception does not apply, so you are a resident for the whole year. You report income from all sources, wherever you earned it. If you paid tax to another state on the same income, you may get a credit for it.' },
    statRes: { status: 'Full-year New Jersey resident (statutory resident)', type: 'res', form: 'NJ-1040 (resident return)',
      note: 'New Jersey is not your domicile, but you kept a permanent home here and spent more than 183 days here, so New Jersey treats you as a resident for the year. You report income from all sources. Members of the Armed Forces have different rules.' },
    nr: { status: 'New Jersey nonresident', type: 'nr', form: 'NJ-1040NR (nonresident return), only if you had income from New Jersey sources',
      note: 'New Jersey does not treat you as a resident. If you earned income from New Jersey sources, such as wages for work done in New Jersey, New Jersey rental property or a New Jersey business, you may still need to file NJ-1040NR and pay tax on that income.' },
    nrExc: { status: 'New Jersey nonresident (domicile exception)', type: 'nr', form: 'NJ-1040NR (nonresident return), only if you had income from New Jersey sources',
      note: 'New Jersey is your domicile, but because you had no permanent home in New Jersey, kept one elsewhere and spent 30 days or fewer here, you are treated as a nonresident for this year.' },
    part: { status: 'Part-year New Jersey resident', type: 'part', form: 'NJ-1040 for the part of the year you lived in New Jersey, and NJ-1040NR if you had New Jersey income in the part of the year you lived elsewhere',
      note: 'New Jersey has no separate part-year form. You file a resident return (NJ-1040) for your resident period, and a nonresident return (NJ-1040NR) for any New Jersey-source income while you were a nonresident. Your days in each period depend on the date your domicile changed.' }
  };

  /* in: { type: 'res'|'nr'|'part', group: 'single'|'joint', income, njSource } */
  function mustFile(inp) {
    var limit = THRESHOLDS[inp.group], over = inp.income > limit;
    if (inp.type === 'nr' && !inp.njSource) return { must: false, limit: limit, why: 'nosource' };
    return { must: over, limit: limit, why: over ? 'over' : 'under' };
  }

  var api = { NODES: NODES, RESULTS: RESULTS, THRESHOLDS: THRESHOLDS, mustFile: mustFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NJR = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var path = [], picks = [];
  var $ = function (id) { return document.getElementById(id); };
  function money(n) { return '$' + n.toLocaleString('en-US'); }

  function filingCheck(r) {
    return '<h3 class="nj-h3">Do you need to file?</h3>' +
      '<div class="field"><label for="nj-group">Your filing status</label><select id="nj-group">' +
      '<option value="single">Single, or Married/CU partner filing separately</option>' +
      '<option value="joint">Married/CU couple filing jointly, Head of household, or Qualifying widow(er)/surviving CU partner</option></select></div>' +
      '<div class="field"><label for="nj-income">Gross income from everywhere for the whole year ($)</label>' +
      '<p class="hint">Before deductions, from all sources and all states and countries, for the entire year, not just the time you lived in New Jersey.</p>' +
      '<input type="number" id="nj-income" min="0" step="1" inputmode="numeric"></div>' +
      (r.type === 'nr' ? '<div class="field"><label class="check"><input type="checkbox" id="nj-src"> I had income from New Jersey sources (for example wages for work done in New Jersey, or New Jersey rental property)</label></div>' : '') +
      '<div id="nj-file" aria-live="polite"></div>';
  }

  function updateFiling(r) {
    var out = $('nj-file'), v = $('nj-income').value;
    if (v === '') { out.innerHTML = ''; return; }
    var n = Number(v);
    if (!isFinite(n) || n < 0) { out.innerHTML = '<p><strong>Check your number.</strong> Enter your income in dollars, 0 or more.</p>'; return; }
    var src = $('nj-src'), f = mustFile({ type: r.type, group: $('nj-group').value, income: n, njSource: src ? src.checked : true });
    var refund = ' Even if you do not have to file, file anyway to get back any New Jersey tax that was withheld from your pay or paid as estimated tax.';
    if (f.why === 'nosource') out.innerHTML = '<p>With no New Jersey-source income, a nonresident generally does not file a New Jersey return.' + refund + '</p>';
    else if (f.must) out.innerHTML = '<p><strong>You likely must file.</strong> Your gross income of ' + money(n) + ' is more than the ' + money(f.limit) + ' filing threshold for your filing status.</p>';
    else out.innerHTML = '<p><strong>You likely do not have to file.</strong> Your gross income of ' + money(n) + ' is not more than the ' + money(f.limit) + ' filing threshold for your filing status.' + refund + '</p>';
  }

  function render() {
    var at = path[path.length - 1], qBox = $('nj-q'), out = $('nj-result'), h = '';
    if (picks.length) h += '<ol class="nj-answers">' + picks.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol>';
    if (at.indexOf('R:') === 0) {
      var r = RESULTS[at.slice(2)];
      qBox.innerHTML = h + '<div class="nj-nav"><button type="button" class="nj-link" data-act="back">&larr; Change my last answer</button><button type="button" class="nj-link" data-act="restart">Start over</button></div>';
      out.className = 'result result-ok';
      out.innerHTML = '<p class="nj-step">Your likely New Jersey residency status</p><h2 class="nj-h">' + r.status + '</h2>' +
        '<table class="result-table"><tbody><tr><th>Likely return</th><td>' + r.form + '</td></tr></tbody></table><p>' + r.note + '</p>' + filingCheck(r);
      var upd = function () { updateFiling(r); };
      out.querySelectorAll('input,select').forEach(function (el) { el.addEventListener('input', upd); el.addEventListener('change', upd); });
      if (out.scrollIntoView) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
      out.focus({ preventScroll: true });
      return;
    }
    var n = NODES[at];
    out.className = 'result'; out.innerHTML = '';
    h += '<fieldset class="nj-q"><p class="nj-step">Question ' + path.length + '</p><legend>' + n.q + '</legend>' +
      (n.hint ? '<div class="hint">' + n.hint + '</div>' : '') + '<div class="nj-opts">';
    n.options.forEach(function (o, i) { h += '<button type="button" class="btn secondary" data-opt="' + i + '">' + o.label + '</button>'; });
    h += '</div></fieldset>';
    if (path.length > 1) h += '<div class="nj-nav"><button type="button" class="nj-link" data-act="back">&larr; Back</button><button type="button" class="nj-link" data-act="restart">Start over</button></div>';
    qBox.innerHTML = h;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var qBox = $('nj-q'); if (!qBox) return;
    path = ['start']; picks = [];
    qBox.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.opt !== undefined) {
        var n = NODES[path[path.length - 1]], o = n.options[Number(b.dataset.opt)];
        picks.push(n.q + ' <strong>' + o.label + '</strong>'); path.push(o.next);
      } else if (b.dataset.act === 'back') { path.pop(); picks.pop(); }
      else if (b.dataset.act === 'restart') { path = ['start']; picks = []; }
      render();
      var first = qBox.querySelector('.nj-opts .btn');
      if (first) first.focus();
    });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
