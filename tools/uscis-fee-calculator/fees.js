/* USCIS filing fee estimator. Runs entirely in the browser; nothing is sent anywhere.
   FEES_AS_OF: the date these amounts were last checked. Update this block when USCIS changes fees.
   Biometric services are included in these fees. This tool does not cover every form or every fee category. */
(function (root) {
  'use strict';
  var FEES_AS_OF = 'October 2026';

  var FORMS = [
    { id: 'i130', name: 'I-130', desc: 'Petition for Alien Relative', paper: 675, online: 625 },
    { id: 'i485', name: 'I-485', desc: 'Application to Register Permanent Residence or Adjust Status', paper: 1440, online: 1390,
      option: { label: 'Child under 14 filing with a parent', paper: 950, online: 900 } },
    { id: 'i765', name: 'I-765', desc: 'Application for Employment Authorization', paper: 520, online: 470,
      option: { label: 'Filed with a pending I-485 that was filed on or after April 1, 2024', paper: 260, online: 260 } },
    { id: 'i131', name: 'I-131', desc: 'Application for Travel Document', paper: 630, online: 580 },
    { id: 'n400', name: 'N-400', desc: 'Application for Naturalization', paper: 760, online: 710,
      option: { label: 'Reduced fee: household income at or below 400% of the Federal Poverty Guidelines (paper filing only)', paper: 380, online: null } },
    { id: 'i90', name: 'I-90', desc: 'Replace or renew a permanent resident card', paper: 465, online: 415 },
    { id: 'i751', name: 'I-751', desc: 'Petition to Remove Conditions on Residence', paper: 750, online: 700 },
    { id: 'n600', name: 'N-600', desc: 'Application for Certificate of Citizenship', paper: 1385, online: 1335 }
  ];

  function find(id) { for (var i = 0; i < FORMS.length; i++) if (FORMS[i].id === id) return FORMS[i]; return null; }

  // selections: [{ id, method:'online'|'paper', option:boolean }]
  function calculate(selections) {
    var lines = [], total = 0, warnings = [];
    (selections || []).forEach(function (s) {
      var f = find(s.id);
      if (!f) return;
      var method = s.method === 'paper' ? 'paper' : 'online';
      var fee, label = f.name;
      if (s.option && f.option) {
        var v = f.option[method];
        if (v === null || v === undefined) {
          method = 'paper';
          v = f.option.paper;
          warnings.push(f.name + ': this option is available only for paper filing, so the paper fee is shown.');
        }
        fee = v; label += ' (' + f.option.label.split(':')[0] + ')';
      } else {
        fee = f[method];
      }
      lines.push({ id: f.id, label: label, method: method, fee: fee });
      total += fee;
    });
    return { lines: lines, total: total, warnings: warnings };
  }

  var api = { calculate: calculate, FORMS: FORMS, FEES_AS_OF: FEES_AS_OF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.USCISFees = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var host = document.getElementById('fee-forms');
    if (!host) return;
    var out = document.getElementById('fee-result');
    function money(n) { return '$' + n.toLocaleString('en-US'); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    FORMS.forEach(function (f) {
      var div = document.createElement('div');
      div.className = 'fee-form';
      div.innerHTML =
        '<label class="fee-pick"><input type="checkbox" id="pick-' + f.id + '"> <span><strong>' + f.name + '</strong> ' + esc(f.desc) + '</span></label>' +
        '<div class="fee-opts" id="opts-' + f.id + '" hidden>' +
        '<label for="m-' + f.id + '">Filing method</label>' +
        '<select id="m-' + f.id + '"><option value="online">Online (' + money(f.online) + ')</option><option value="paper">Paper (' + money(f.paper) + ')</option></select>' +
        (f.option ? '<label class="check"><input type="checkbox" id="o-' + f.id + '"> ' + esc(f.option.label) + '</label>' : '') +
        '</div>';
      host.appendChild(div);
      div.querySelector('#pick-' + f.id).addEventListener('change', function (e) {
        div.querySelector('.fee-opts').hidden = !e.target.checked;
        update();
      });
      div.addEventListener('change', update);
    });

    function update() {
      var sel = [];
      FORMS.forEach(function (f) {
        if (document.getElementById('pick-' + f.id).checked) {
          var o = document.getElementById('o-' + f.id);
          sel.push({ id: f.id, method: document.getElementById('m-' + f.id).value, option: !!(o && o.checked) });
        }
      });
      var r = calculate(sel);
      if (!r.lines.length) { out.innerHTML = '<p>Choose a form to see the estimated fee.</p>'; return; }
      var rows = r.lines.map(function (l) {
        return '<tr><th scope="row">' + esc(l.label) + ' <span class="small">(' + l.method + ')</span></th><td>' + money(l.fee) + '</td></tr>';
      }).join('');
      out.innerHTML = '<table class="result-table"><tbody>' + rows +
        '<tr><th scope="row"><strong>Estimated total</strong></th><td><strong>' + money(r.total) + '</strong></td></tr></tbody></table>' +
        r.warnings.map(function (w) { return '<p class="small">' + esc(w) + '</p>'; }).join('');
    }
    update();
  });
})(typeof window !== 'undefined' ? window : this);
