/* I-864 sponsor income check. Runs entirely in the browser; nothing is sent anywhere.
   Poverty guidelines: 2026 HHS Poverty Guidelines (published January 2026). Check Form I-864P for the guidelines USCIS applies to your case. */
(function (root) {
  'use strict';
  var GUIDE = {
    lower48: { sizes: [15960, 21640, 27320, 33000, 38680, 44360, 50040, 55720], extra: 5680 },
    alaska:  { sizes: [19950, 27050, 34150, 41250, 48350, 55450, 62550, 69650], extra: 7100 },
    hawaii:  { sizes: [18360, 24890, 31420, 37950, 44480, 51010, 57540, 64070], extra: 6530 }
  };
  var GUIDE_YEAR = 2026;

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  // 100% of the poverty guideline for a household size.
  function guideline(region, size) {
    var g = GUIDE[region] || GUIDE.lower48;
    if (size <= 8) return g.sizes[size - 1];
    return g.sizes[7] + g.extra * (size - 8);
  }

  // input: { region, military:boolean, spouse, dependents, sponsored, previous, income }
  function calculate(input) {
    var income = Number(input.income);
    if (input.income === '' || input.income === null || input.income === undefined || !isFinite(income) || income < 0) {
      return { error: 'Enter the sponsor’s annual income as a number.' };
    }
    var size = 1 + (input.spouse | 0) + (input.dependents | 0) + Math.max(1, input.sponsored | 0) + (input.previous | 0);
    var pct = input.military ? 1.0 : 1.25;
    var base = guideline(input.region, size);
    var required = Math.round(base * pct);
    var diff = income - required;
    return { size: size, percent: pct, required: required, income: income, diff: diff, met: diff >= 0, shortfall: diff < 0 ? -diff : 0 };
  }

  var api = { calculate: calculate, guideline: guideline, money: money, GUIDE_YEAR: GUIDE_YEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.I864 = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('i864-form');
    if (!form) return;
    var out = document.getElementById('i864-result');
    var sizeEl = document.getElementById('household-size');

    function num(id) { var v = parseInt(form[id].value, 10); return isFinite(v) && v >= 0 ? v : 0; }
    function values() {
      return {
        region: form.region.value, military: form.military.value === 'yes',
        spouse: num('spouse'), dependents: num('dependents'), sponsored: Math.max(1, num('sponsored')), previous: num('previous'),
        income: form.income.value
      };
    }
    function updateSize() {
      var v = values();
      sizeEl.textContent = String(1 + v.spouse + v.dependents + v.sponsored + v.previous);
    }
    form.addEventListener('input', updateSize);
    updateSize();

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = calculate(values());
      if (r.error) {
        out.className = 'result result-error';
        out.innerHTML = '<p><strong>Check your entries.</strong> ' + esc(r.error) + '</p>';
        out.focus(); return;
      }
      var pctText = r.percent === 1 ? '100% (active-duty sponsor)' : '125%';
      var html = '<h3>' + (r.met ? 'Estimate: income meets the minimum' : 'Estimate: income is below the minimum') + '</h3>' +
        '<table class="result-table"><tbody>' +
        '<tr><th scope="row">Household size</th><td>' + r.size + '</td></tr>' +
        '<tr><th scope="row">Minimum income (' + pctText + ' of the ' + GUIDE_YEAR + ' poverty guideline)</th><td>' + money(r.required) + '</td></tr>' +
        '<tr><th scope="row">Sponsor’s income</th><td>' + money(r.income) + '</td></tr>' +
        '<tr><th scope="row">' + (r.met ? 'Above the minimum by' : 'Short by') + '</th><td><strong>' + money(Math.abs(r.diff)) + '</strong></td></tr>' +
        '</tbody></table>';
      if (!r.met) {
        html += '<p>If the income is short, the Form I-864 instructions describe options such as a joint sponsor, counting the income of certain household members (Form I-864A), or counting qualifying assets. The rules for each are detailed, so a licensed immigration attorney or DOJ-accredited representative can explain what applies.</p>';
      }
      html += '<p class="small">This is an estimate for general information only. It is not legal advice and does not guarantee any outcome.</p>';
      out.className = 'result ' + (r.met ? 'result-ok' : 'result-no');
      out.innerHTML = html;
      out.focus();
    });
    form.addEventListener('reset', function () {
      out.className = 'result'; out.innerHTML = '';
      setTimeout(updateSize, 0);
    });
  });
})(typeof window !== 'undefined' ? window : this);
