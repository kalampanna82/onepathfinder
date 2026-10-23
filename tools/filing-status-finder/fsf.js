/* Filing status finder. Runs in the browser; nothing you enter is sent or stored.
   Rules (IRS Publication 501 and Publication 519, as of Oct 2026): marital status is set on the last day of the year;
   a spouse who died during the year counts as married for the whole year; "considered unmarried" (lived apart the last
   6 months, paid more than half the cost of a home that was a qualifying child's main home for more than half the year)
   can file Head of Household; Qualifying Surviving Spouse for the 2 years after the year of death with a dependent child
   or stepchild who lived in the home all year. A nonresident alien cannot file jointly or as Head of Household.
   Standard deductions: 2025 from the One Big Beautiful Bill Act (IRS), 2026 from Rev. Proc. 2025-32.
   Re-check DEDUCTIONS when the IRS announces the next year's amounts. Not tax or legal advice. */
(function (root) {
  'use strict';

  var DEDUCTIONS = {
    2025: { single: 15750, mfj: 31500, mfs: 15750, hoh: 23625, qss: 31500 },
    2026: { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150, qss: 32200 }
  };

  var NODES = {
    start: {
      q: 'Were you a nonresident alien for tax purposes at any time during the year?',
      hint: 'Most people on F-1, J-1, H-1B and similar visas are nonresident aliens for at least some years. If you are not sure, try our <a href="/tools/substantial-presence-test/">substantial presence test calculator</a> first.',
      options: [
        { label: 'No. I was a U.S. citizen or resident alien all year', next: 'marital' },
        { label: 'Yes, for all of the year', next: 'R:nra' },
        { label: 'Yes, for part of the year', next: 'R:dual' }
      ]
    },
    marital: {
      q: 'What was your marital status on December 31?',
      hint: 'The IRS uses your status on the last day of the year for the whole year.',
      options: [
        { label: 'Never married', next: 'payHome' },
        { label: 'Divorced, or legally separated under a court decree', next: 'payHome' },
        { label: 'Married (including separated without a decree)', next: 'spouseNra' },
        { label: 'My spouse died this year', next: 'R:mfjDied' },
        { label: 'My spouse died in one of the 2 years before', next: 'qss' },
        { label: 'My spouse died 3 or more years ago, and I have not remarried', next: 'payHome' }
      ]
    },
    spouseNra: {
      q: 'Was your spouse a nonresident alien at any time during the year?',
      options: [
        { label: 'No', next: 'apart' },
        { label: 'Yes', next: 'R:nraSpouse' }
      ]
    },
    apart: {
      q: 'Did your spouse live in your home at any time during the last 6 months of the year?',
      hint: 'Temporary absences, such as for school, work, medical care or military service, count as living in the home.',
      options: [
        { label: 'Yes, we lived together for at least part of that time', next: 'R:married' },
        { label: 'No, we lived apart for all of the last 6 months', next: 'apartChild' }
      ]
    },
    apartChild: {
      q: 'Did you pay more than half the cost of keeping up your home, and was it the main home of your child, stepchild or foster child for more than half the year?',
      hint: 'You must also be able to claim the child as a dependent (or be unable to only because the other parent claims the child under the rules for divorced or separated parents).',
      options: [
        { label: 'Yes, all of that is true', next: 'R:hohApart' },
        { label: 'No', next: 'R:married' }
      ]
    },
    qss: {
      q: 'Are all of these true?',
      hint: '<ul class="fsf-notes"><li>You could have filed a joint return with your spouse for the year they died.</li><li>You did not remarry before the end of this year.</li><li>You have a child or stepchild (not a foster child) you can claim as a dependent.</li><li>That child lived in your home all year (temporary absences count).</li><li>You paid more than half the cost of keeping up that home.</li></ul>',
      options: [
        { label: 'Yes, all of them', next: 'R:qss' },
        { label: 'No, at least one is not true', next: 'payHome' }
      ]
    },
    payHome: {
      q: 'Did you pay more than half the cost of keeping up a home for the year?',
      hint: 'Costs include rent or mortgage interest, property tax, utilities, repairs and food eaten in the home. They do not include clothing, education, medical care or transportation.',
      options: [
        { label: 'Yes', next: 'qualPerson' },
        { label: 'No', next: 'R:single' }
      ]
    },
    qualPerson: {
      q: 'Did a qualifying person live with you in that home for more than half the year?',
      hint: 'Usually your child, stepchild, foster child, sibling or their descendant who meets the qualifying child tests, or a relative you can claim as a dependent. A parent you can claim as a dependent counts even if they live elsewhere, as long as you paid more than half the cost of their home.',
      options: [
        { label: 'Yes, or a parent I can claim as a dependent (who may live elsewhere)', next: 'R:hoh' },
        { label: 'No', next: 'R:single' }
      ]
    }
  };

  var RESULTS = {
    single: { status: 'Single', key: 'single',
      note: 'You were unmarried on December 31 and do not appear to qualify for Head of Household or Qualifying Surviving Spouse.' },
    hoh: { status: 'Head of Household', key: 'hoh',
      note: 'Head of Household usually means a larger standard deduction and lower tax than Single. Check the qualifying person rules in Publication 501: a person can make only one taxpayer eligible, and some relatives qualify only if you can claim them as a dependent.' },
    hohApart: { status: 'Head of Household (considered unmarried)', key: 'hoh',
      note: 'You are legally married, but the IRS considers you unmarried because you lived apart from your spouse for the last 6 months and kept up a home for your child. That lets you file as Head of Household instead of Married Filing Separately.' },
    married: { status: 'Married Filing Jointly or Married Filing Separately', key: 'mfj', both: true,
      note: 'Married couples choose. Filing jointly usually means lower tax, and both spouses are responsible for the whole tax. Filing separately can block credits such as the Earned Income Tax Credit and education credits, but can help in some cases, for example when one spouse has large medical expenses. Work it out both ways before you decide.' },
    mfjDied: { status: 'Married Filing Jointly (or Separately)', key: 'mfj', both: true,
      note: 'You are treated as married for the whole year your spouse died, so you can usually file a joint return with them for that year if you did not remarry before the end of the year. If you did remarry, you can file jointly with your new spouse instead, and your deceased spouse’s return is filed as Married Filing Separately.' },
    qss: { status: 'Qualifying Surviving Spouse', key: 'qss',
      note: 'You can use this status for the 2 years after the year your spouse died. It uses the same standard deduction and tax rates as Married Filing Jointly. After that, you may qualify as Head of Household.' },
    nraSpouse: { status: 'Married Filing Separately, or jointly if you choose to', key: 'mfs', both: true,
      note: 'If your spouse was a nonresident alien at any time in the year, you generally file as Married Filing Separately. You can instead choose to treat your spouse as a U.S. resident for the whole year and file jointly, but then both of you are taxed on worldwide income. If you do not make that choice and you kept up a home for a qualifying person, you may be able to file as Head of Household (Publication 501, "considered unmarried").' },
    nra: { status: 'Form 1040-NR filing status', key: null,
      note: 'Nonresident aliens file Form 1040-NR. You cannot file jointly or as Head of Household. If you are married you generally file as Married Filing Separately; if not, as Single. A surviving spouse can sometimes file as Qualifying Surviving Spouse. Nonresident aliens generally cannot take the standard deduction (students and business apprentices from India are an exception under the tax treaty). See Publication 519.' },
    dual: { status: 'Dual-status year', key: null,
      note: 'You were a nonresident alien for part of the year and a resident alien for the rest, so this is a dual-status year. You generally cannot file jointly or as Head of Household and cannot take the standard deduction, unless you are married and you and your spouse choose to be treated as residents for the whole year and file jointly. The rules are in Publication 519, chapter 6. This is a good case to have a professional review.' }
  };

  function money(n) { return '$' + n.toLocaleString('en-US'); }

  function deductionRows(r) {
    if (!r.key) return '';
    var h = '<table class="result-table"><tbody>';
    Object.keys(DEDUCTIONS).forEach(function (y) {
      var d = DEDUCTIONS[y], v;
      if (r.both && r.key === 'mfj') v = money(d.mfj) + ' jointly, or ' + money(d.mfs) + ' each separately';
      else if (r.both && r.key === 'mfs') v = money(d.mfs) + ' separately, or ' + money(d.mfj) + ' jointly';
      else v = money(d[r.key]);
      h += '<tr><th>Standard deduction, tax year ' + y + '</th><td>' + v + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  var api = { NODES: NODES, RESULTS: RESULTS, DEDUCTIONS: DEDUCTIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FSF = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var path = [], picks = [];
  var $ = function (id) { return document.getElementById(id); };

  function render() {
    var at = path[path.length - 1], qBox = $('fsf-q'), out = $('fsf-result'), h = '';
    if (picks.length) {
      h += '<ol class="fsf-answers">' + picks.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol>';
    }
    if (at.indexOf('R:') === 0) {
      var r = RESULTS[at.slice(2)];
      qBox.innerHTML = h + '<div class="fsf-nav"><button type="button" class="fsf-link" data-act="back">&larr; Change my last answer</button><button type="button" class="fsf-link" data-act="restart">Start over</button></div>';
      out.className = 'result result-ok';
      out.innerHTML = '<p class="fsf-step">Your likely filing status</p><h2 class="fsf-h">' + r.status + '</h2>' + deductionRows(r) + '<p>' + r.note + '</p>' +
        '<ul class="fsf-notes"><li>The standard deduction is higher if you or your spouse are 65 or older or blind, and lower if someone else can claim you as a dependent.</li>' +
        '<li>If more than one status fits, you can usually pick the one with the lower tax.</li></ul>';
      if (out.scrollIntoView) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
      out.focus({ preventScroll: true });
      return;
    }
    var n = NODES[at];
    out.className = 'result'; out.innerHTML = '';
    h += '<fieldset class="fsf-q"><p class="fsf-step">Question ' + path.length + '</p><legend>' + n.q + '</legend>' +
      (n.hint ? '<div class="hint">' + n.hint + '</div>' : '') + '<div class="fsf-opts">';
    n.options.forEach(function (o, i) { h += '<button type="button" class="btn secondary" data-opt="' + i + '">' + o.label + '</button>'; });
    h += '</div></fieldset>';
    if (path.length > 1) h += '<div class="fsf-nav"><button type="button" class="fsf-link" data-act="back">&larr; Back</button><button type="button" class="fsf-link" data-act="restart">Start over</button></div>';
    qBox.innerHTML = h;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var qBox = $('fsf-q'); if (!qBox) return;
    path = ['start']; picks = [];
    qBox.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.opt !== undefined) {
        var n = NODES[path[path.length - 1]], o = n.options[Number(b.dataset.opt)];
        picks.push(n.q + ' <strong>' + o.label + '</strong>'); path.push(o.next);
      } else if (b.dataset.act === 'back') { path.pop(); picks.pop(); }
      else if (b.dataset.act === 'restart') { path = ['start']; picks = []; }
      render();
      var first = qBox.querySelector('.fsf-opts .btn');
      if (first) first.focus();
    });
    render();
  });
})(typeof window !== 'undefined' ? window : this);
