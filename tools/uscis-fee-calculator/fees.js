/* USCIS filing fee calculator and fee list. Runs entirely in the browser; nothing is sent anywhere or stored.
   FEES_AS_OF: the date these amounts were last checked. Update FORMS (and this date) when USCIS changes fees.
   paper / online: fee in dollars. online: null means no online fee is listed (paper amount applies).
   flat: true means one fee, not split by paper or online. option: a reduced or special fee for the same form.
   isNew: fee changed for requests postmarked on or after October 16, 2026 (see note for the old fee).
   Biometric services are included in most of these fees. This tool does not cover every form or fee category. */
(function (root) {
  'use strict';
  var FEES_AS_OF = 'October 22, 2026';

  var CATEGORIES = [
    { id: 'family', title: 'Family and green card' },
    { id: 'citizenship', title: 'Citizenship' },
    { id: 'work', title: 'Work and temporary stay' },
    { id: 'humanitarian', title: 'Asylum, parole and TPS' }
  ];

  var FORMS = [
    // Family and green card
    { id: 'i130', cat: 'family', name: 'I-130', desc: 'Petition for Alien Relative', paper: 675, online: 625, kw: 'green card family spouse relative' },
    { id: 'i129f', cat: 'family', name: 'I-129F', desc: 'Petition for Alien Fiancé(e)', paper: 675, online: null, kw: 'fiance k-1 marriage' },
    { id: 'i485', cat: 'family', name: 'I-485', desc: 'Application to Register Permanent Residence or Adjust Status', paper: 1440, online: 1390, kw: 'green card permanent residence adjustment',
      option: { label: 'Child under 14 filing with a parent', paper: 950, online: 900 } },
    { id: 'i485a', cat: 'family', name: 'I-485 Supplement A', desc: 'Adjustment of status under INA 245(i)', paper: 1000, online: null, note: 'Some applicants are exempt, for example an unmarried applicant under 17.', kw: 'green card 245i' },
    { id: 'i765', cat: 'family', name: 'I-765', desc: 'Application for Employment Authorization (work permit)', paper: 520, online: 470, kw: 'ead work permit',
      option: { label: 'Filed with a pending I-485 that was filed on or after April 1, 2024', paper: 260, online: 260 } },
    { id: 'i131', cat: 'family', name: 'I-131', desc: 'Application for Travel Document (advance parole, reentry permit)', paper: 630, online: 580, kw: 'advance parole travel reentry' },
    { id: 'i751', cat: 'family', name: 'I-751', desc: 'Petition to Remove Conditions on Residence', paper: 750, online: 700, note: 'No fee for a battery or extreme cruelty waiver.', kw: 'green card marriage conditional' },
    { id: 'i90', cat: 'family', name: 'I-90', desc: 'Replace or renew a permanent resident card', paper: 465, online: 415, note: 'No fee in certain cases where USCIS made the error.', kw: 'green card renew replace' },
    { id: 'i601', cat: 'family', name: 'I-601', desc: 'Application for Waiver of Grounds of Inadmissibility', paper: 1050, online: null, kw: 'waiver' },
    { id: 'i601a', cat: 'family', name: 'I-601A', desc: 'Provisional Unlawful Presence Waiver', paper: 795, online: null, kw: 'waiver' },
    { id: 'i212', cat: 'family', name: 'I-212', desc: 'Permission to Reapply for Admission After Removal', paper: 1175, online: null, kw: 'waiver removal deportation' },
    { info: 'No USCIS fee', cat: 'family', name: 'I-864, I-693', desc: 'Affidavit of Support; Report of Medical Examination', note: 'The doctor who does the I-693 exam sets their own fee.', kw: 'sponsor medical exam' },

    // Citizenship
    { id: 'n400', cat: 'citizenship', name: 'N-400', desc: 'Application for Naturalization', paper: 760, online: 710, kw: 'citizenship naturalization citizen',
      note: 'No fee for qualifying military applicants.',
      option: { label: 'Reduced fee: household income at or below 400% of the Federal Poverty Guidelines (paper filing only)', paper: 380, online: null } },
    { id: 'n600', cat: 'citizenship', name: 'N-600', desc: 'Application for Certificate of Citizenship', paper: 1385, online: 1335, note: 'No fee for current or former armed forces members filing for themselves.', kw: 'citizenship citizen certificate' },
    { id: 'n565', cat: 'citizenship', name: 'N-565', desc: 'Replace a naturalization or citizenship document', paper: 555, online: 505, note: 'No fee to correct a USCIS error.', kw: 'citizenship replace lost' },
    { id: 'n336', cat: 'citizenship', name: 'N-336', desc: 'Request for a Hearing on a Naturalization Denial', paper: 830, online: 780, kw: 'citizenship appeal denial' },

    // Work and temporary stay
    { id: 'i539', cat: 'work', name: 'I-539', desc: 'Application to Extend or Change Nonimmigrant Status', paper: 470, online: 420, kw: 'extension change status visitor student' },
    { id: 'i129h1b', cat: 'work', name: 'I-129 (H-1B)', desc: 'Petition for a specialty-occupation worker', paper: 780, online: 730, kw: 'h1b work visa employer',
      note: 'Small employer means 25 or fewer full-time employees.',
      option: { label: 'Small employer or nonprofit', paper: 460, online: null } },
    { id: 'h1breg', cat: 'work', name: 'H-1B registration', desc: 'Cap registration, per registration', paper: 215, flat: true, kw: 'h1b lottery' },
    { id: 'i129l', cat: 'work', name: 'I-129 (L-1)', desc: 'Petition for an intracompany transferee', paper: 1385, online: 1335, kw: 'l1 work visa employer',
      option: { label: 'Small employer or nonprofit', paper: 695, online: null } },
    { id: 'i129o', cat: 'work', name: 'I-129 (O-1)', desc: 'Petition for a worker of extraordinary ability (1 to 25 named workers)', paper: 1055, online: 1005, kw: 'o1 work visa employer',
      option: { label: 'Small employer or nonprofit', paper: 530, online: null } },
    { id: 'i129e', cat: 'work', name: 'I-129 (E, TN)', desc: 'Petition for a treaty trader or investor, or a TN worker', paper: 1015, online: 965, kw: 'e-2 tn work visa employer',
      option: { label: 'Small employer or nonprofit', paper: 510, online: null } },
    { id: 'i140', cat: 'work', name: 'I-140', desc: 'Immigrant Petition for Alien Worker', paper: 715, online: 665, kw: 'green card employment eb-1 eb-2 eb-3 niw employer' },
    { id: 'prem1', cat: 'work', name: 'I-907 (most categories)', desc: 'Premium processing for most I-129 and I-140 categories. Added to the form fee.', paper: 2965, flat: true, kw: 'premium processing expedite' },
    { id: 'prem2', cat: 'work', name: 'I-907 (H-2B, R-1, OPT)', desc: 'Premium processing for H-2B, R-1 and OPT work permits', paper: 1780, flat: true, kw: 'premium processing expedite' },
    { id: 'prem3', cat: 'work', name: 'I-907 (F, J, M change of status)', desc: 'Premium processing for an I-539 change of status to F, J or M', paper: 2075, flat: true, kw: 'premium processing expedite student' },

    // Asylum, parole and TPS
    { id: 'i589', cat: 'humanitarian', name: 'I-589', desc: 'Application for Asylum, initial fee', paper: 100, flat: true, note: 'The annual asylum fee below also applies.', kw: 'asylum' },
    { id: 'i589y', cat: 'humanitarian', name: 'I-589 annual fee', desc: 'Annual fee for each year an asylum application is pending', paper: 105, flat: true, isNew: true, note: 'Was $102 for requests postmarked before October 16, 2026.', kw: 'asylum' },
    { id: 'i765h', cat: 'humanitarian', name: 'I-765 (first work permit)', desc: 'First work permit for asylum applicants, parolees and TPS', paper: 570, flat: true, isNew: true, note: 'Was $560. Renewals stay at $275 (asylum) and $280 (parole, TPS).', kw: 'ead work permit asylum parole tps' },
    { id: 'i131p', cat: 'humanitarian', name: 'I-131 (parole)', desc: 'Immigration parole fee', paper: 1050, flat: true, isNew: true, note: 'Was $1,020.', kw: 'parole' },
    { id: 'i821', cat: 'humanitarian', name: 'I-821', desc: 'Temporary Protected Status, initial application', paper: 520, flat: true, isNew: true, note: 'Was $510. A biometric services fee may also apply. Re-registration has no filing fee.', kw: 'tps' },
    { id: 'i821d', cat: 'humanitarian', name: 'I-821D', desc: 'Deferred Action for Childhood Arrivals (DACA)', paper: 85, flat: true, note: 'The work permit is a separate fee: $520 paper or $470 online.', kw: 'daca dreamers' },
    { info: 'No fee', cat: 'humanitarian', name: 'I-912', desc: 'Request for Fee Waiver', note: 'Not every form or fee can be waived.', kw: 'fee waiver' }
  ];

  function find(id) { for (var i = 0; i < FORMS.length; i++) if (FORMS[i].id === id) return FORMS[i]; return null; }

  // selections: [{ id, method:'online'|'paper', option:boolean }]
  function calculate(selections) {
    var lines = [], total = 0, warnings = [];
    (selections || []).forEach(function (s) {
      var f = find(s.id);
      if (!f) return;
      var method = (s.method === 'paper' || f.flat) ? 'paper' : 'online';
      var src = f, label = f.name;
      if (s.option && f.option) { src = f.option; label += ' (' + f.option.label.split(':')[0] + ')'; }
      var fee = src[method];
      if (fee === null || fee === undefined) {
        if (method === 'online') warnings.push(f.name + (src === f ? '' : ' (' + f.option.label.split(':')[0] + ')') + ': no online fee is listed here, so the paper fee is shown.');
        method = 'paper';
        fee = src.paper;
      }
      lines.push({ id: f.id, label: label, method: f.flat ? null : method, fee: fee });
      total += fee;
    });
    return { lines: lines, total: total, warnings: warnings };
  }

  function haystack(f) { return [f.name, f.desc, f.note || '', f.kw || '', f.option ? f.option.label : ''].join(' ').toLowerCase(); }
  function matches(f, term) {
    var words = String(term || '').toLowerCase().split(/\s+/).filter(Boolean);
    var h = haystack(f);
    return words.every(function (w) { return h.indexOf(w) !== -1; });
  }

  var api = { calculate: calculate, matches: matches, FORMS: FORMS, CATEGORIES: CATEGORIES, FEES_AS_OF: FEES_AS_OF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.USCISFees = api;

  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', function () {
    var host = document.getElementById('fee-forms');
    if (!host) return;
    var out = document.getElementById('fee-result');
    var bar = document.getElementById('fee-bar');
    var q = document.getElementById('fee-q');
    var count = document.getElementById('fee-count');
    function money(n) { return '$' + n.toLocaleString('en-US'); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function amountText(f) {
      if (f.flat) return money(f.paper);
      if (f.online === null) return money(f.paper) + ' (paper)';
      return 'Paper ' + money(f.paper) + ' · Online ' + money(f.online);
    }

    CATEGORIES.forEach(function (c) {
      var sec = document.createElement('section');
      sec.className = 'fee-cat';
      sec.id = c.id;
      sec.innerHTML = '<h2>' + esc(c.title) + '</h2>';
      FORMS.filter(function (f) { return f.cat === c.id; }).forEach(function (f) {
        var div = document.createElement('div');
        div.className = 'fee-form';
        div.setAttribute('data-s', haystack(f));
        var badge = f.isNew ? ' <span class="fee-new">New Oct 16, 2026</span>' : '';
        var note = f.note ? '<p class="fee-note small">' + esc(f.note) + '</p>' : '';
        if (f.info) {
          div.innerHTML = '<p class="fee-head"><strong>' + esc(f.name) + '</strong> ' + esc(f.desc) + '</p><p class="fee-amt">' + esc(f.info) + '</p>' + note;
          sec.appendChild(div);
          return;
        }
        var opts = '';
        if (!f.flat && f.online !== null) {
          opts += '<label for="m-' + f.id + '">Filing method</label>' +
            '<select id="m-' + f.id + '"><option value="online">Online (' + money(f.online) + ')</option><option value="paper">Paper (' + money(f.paper) + ')</option></select>';
        }
        if (f.option) opts += '<label class="check"><input type="checkbox" id="o-' + f.id + '"> ' + esc(f.option.label) + '</label>';
        div.innerHTML =
          '<label class="fee-pick"><input type="checkbox" id="pick-' + f.id + '"> <span><strong>' + esc(f.name) + '</strong> ' + esc(f.desc) + badge + '</span></label>' +
          '<p class="fee-amt">' + amountText(f) + '</p>' + note +
          (opts ? '<div class="fee-opts" id="opts-' + f.id + '" hidden>' + opts + '</div>' : '');
        sec.appendChild(div);
        div.querySelector('#pick-' + f.id).addEventListener('change', function (e) {
          var o = div.querySelector('.fee-opts');
          if (o) o.hidden = !e.target.checked;
          update();
        });
        div.addEventListener('change', update);
      });
      host.appendChild(sec);
    });

    function update() {
      var sel = [];
      FORMS.forEach(function (f) {
        var pick = document.getElementById('pick-' + f.id);
        if (pick && pick.checked) {
          var o = document.getElementById('o-' + f.id), m = document.getElementById('m-' + f.id);
          sel.push({ id: f.id, method: m ? m.value : 'paper', option: !!(o && o.checked) });
        }
      });
      var r = calculate(sel);
      if (!r.lines.length) { out.innerHTML = '<p>Tick a form to add its fee to your total.</p>'; if (bar) bar.hidden = true; return; }
      if (bar) {
        bar.hidden = false;
        bar.innerHTML = '<span>' + r.lines.length + (r.lines.length === 1 ? ' form' : ' forms') + ' selected</span> <strong>Estimated total ' + money(r.total) + '</strong> <a href="#fee-result">See breakdown</a>';
      }
      var rows = r.lines.map(function (l) {
        return '<tr><th scope="row">' + esc(l.label) + (l.method ? ' <span class="small">(' + l.method + ')</span>' : '') + '</th><td>' + money(l.fee) + '</td></tr>';
      }).join('');
      out.innerHTML = '<table class="result-table"><tbody>' + rows +
        '<tr><th scope="row"><strong>Estimated total</strong></th><td><strong>' + money(r.total) + '</strong></td></tr></tbody></table>' +
        r.warnings.map(function (w) { return '<p class="small">' + esc(w) + '</p>'; }).join('');
    }

    function filter() {
      var term = q.value.trim();
      var shown = 0;
      Array.prototype.forEach.call(host.querySelectorAll('.fee-form'), function (d) {
        var h = d.getAttribute('data-s');
        var ok = term.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return h.indexOf(w) !== -1; });
        d.hidden = !ok;
        if (ok) shown++;
      });
      Array.prototype.forEach.call(host.querySelectorAll('.fee-cat'), function (s) { s.hidden = !s.querySelector('.fee-form:not([hidden])'); });
      count.textContent = !term ? '' : shown ? shown + (shown === 1 ? ' form shown' : ' forms shown') : 'No forms match. Try the form number, such as I-130.';
    }
    if (q) q.addEventListener('input', filter);
    update();
  });
})(typeof window !== 'undefined' ? window : this);
