/* Document checklist generator. Runs in the browser; nothing you enter is sent or stored (the ticks are not saved either).
   Lists are from the USCIS form instructions and form pages as of Oct 2026: N-400 (01/20/25 edition), I-90 (01/20/25), I-765 (08/21/25;
   USCIS said it keeps accepting this edition under a Sep 14, 2026 order). Payment: paper checks and money orders are not accepted since
   Oct 28, 2025 (Form G-1450 card or G-1650 bank debit; G-1651 for an exemption). Photos: since Dec 12, 2025 USCIS takes photos at the
   biometrics appointment and no longer accepts self-submitted photos for most forms. Re-check each list when USCIS publishes a new edition.
   Not legal advice. */
(function (root) {
  'use strict';

  /* Each form: questions (id, label, options [value, text]) and items. An item shows when every key in `if` matches the answer
     (a list means any of those values). group: 'send' (send with the form), 'if' (send if it applies), 'later' (have ready later). */
  var FORMS = {
    n400: {
      name: 'N-400, Application for Naturalization', page: 'https://www.uscis.gov/n-400',
      questions: [
        { id: 'basis', label: 'What are you applying on the basis of?', options: [['5yr', '5 years as a permanent resident'], ['3yr', '3 years as a permanent resident, married to and living with a U.S. citizen'], ['mil', 'U.S. military service'], ['other', 'Something else']] },
        { id: 'card', label: 'Do you have your green card?', options: [['yes', 'Yes'], ['lost', 'No, it was lost, stolen or destroyed, and I filed Form I-90']] },
        { id: 'name', label: 'Has your legal name changed since you got your green card?', options: [['no', 'No'], ['yes', 'Yes']] },
        { id: 'arrest', label: 'Have you ever been arrested, cited, charged or convicted, anywhere?', options: [['no', 'No'], ['yes', 'Yes']] },
        { id: 'fee', label: 'Will you ask for a reduced fee or a fee waiver?', options: [['no', 'No'], ['yes', 'Yes']] }
      ],
      items: [
        { group: 'send', if: { card: 'yes' }, text: 'A copy of both sides of your green card (Permanent Resident Card).' },
        { group: 'send', if: { card: 'lost' }, text: 'A copy of your Form I-90 receipt notice, in place of a copy of your green card.' },
        { group: 'send', if: { basis: '3yr' }, text: 'Proof your spouse has been a U.S. citizen for the last 3 years, for example a birth certificate, naturalization certificate, or U.S. passport photo page.' },
        { group: 'send', if: { basis: '3yr' }, text: 'Your current marriage certificate.' },
        { group: 'send', if: { basis: '3yr' }, text: 'Proof that any earlier marriages of you and your spouse ended, for example divorce decrees, annulment decrees or death certificates.' },
        { group: 'send', if: { basis: '3yr' }, text: 'Documents showing you have lived together as a married couple for the last 3 years, for example joint bank statements, a joint lease or mortgage, or joint tax returns.' },
        { group: 'send', if: { basis: 'mil' }, text: 'Form N-426, Request for Certification of Military or Naval Service.' },
        { group: 'send', if: { name: 'yes' }, text: 'The document that legally changed your name, for example a marriage certificate, divorce decree or court order.' },
        { group: 'send', if: { arrest: 'yes' }, text: 'For each arrest, citation or charge: the arrest report and a certified court record showing how it ended (for example dismissed, or the sentence). You generally do not need these for traffic tickets without an arrest where the only penalty was a fine under $500 or points on your license.' },
        { group: 'send', if: { fee: 'yes' }, text: 'Your fee waiver (Form I-912) or reduced-fee request with the income evidence the instructions ask for. You must file on paper to ask for either.' },
        { group: 'later', text: 'For the interview: your green card, a state ID or driver’s license, your passports and travel documents, and the originals of everything you sent copies of.' }
      ]
    },
    i90: {
      name: 'I-90, Application to Replace Permanent Resident Card', page: 'https://www.uscis.gov/i-90',
      questions: [
        { id: 'cond', label: 'Is your green card a 2-year (conditional) card?', options: [['no', 'No, it is a 10-year card'], ['yes', 'Yes, a 2-year card']] },
        { id: 'reason', label: 'Why do you need a new card?', options: [['expire', 'It has expired or will expire within 6 months'], ['lost', 'It was lost, stolen or destroyed'], ['never', 'I never received it'], ['name', 'My legal name changed'], ['error', 'It has wrong information because of a USCIS error']] }
      ],
      stop: { if: { cond: 'yes', reason: 'expire' }, text: 'Do not use Form I-90 for this. A 2-year (conditional) card that is expiring is handled by removing conditions: Form I-751 (through marriage) or Form I-829 (investors). Ask an immigration attorney about your timing.' },
      items: [
        { group: 'send', if: { reason: ['expire', 'name'] }, text: 'A copy of your current green card (both sides).' },
        { group: 'send', if: { reason: ['lost', 'never'] }, text: 'A copy of a government-issued photo ID, for example your passport photo page or driver’s license. If you have a copy of your old green card, include it too.' },
        { group: 'send', if: { reason: 'name' }, text: 'The document that legally changed your name, for example a marriage certificate, divorce decree or court order.' },
        { group: 'send', if: { reason: 'error' }, text: 'The green card with the wrong information (the original card), and evidence of the correct information.' },
        { group: 'if', if: { reason: 'error' }, text: 'No fee is due when the mistake was made by USCIS. Check the instructions before you pay.' },
        { group: 'later', text: 'Keep your Form I-90 receipt notice. With your expiring or expired card, it can show your status while you wait (for renewals, USCIS extends the card’s validity for 36 months).' }
      ]
    },
    i765: {
      name: 'I-765, Application for Employment Authorization (work permit)', page: 'https://www.uscis.gov/i-765',
      questions: [
        { id: 'type', label: 'What are you applying for?', options: [['renew', 'Renewing a work permit (EAD) I already have'], ['opt', 'F-1 OPT after my program (post-completion)'], ['stem', 'F-1 STEM OPT extension']] }
      ],
      items: [
        { group: 'send', text: 'A copy of your Form I-94 (or the printout from i94.cbp.dhs.gov).' },
        { group: 'send', text: 'A copy of your passport photo page (or other travel document), and of your visa if you have one.' },
        { group: 'send', if: { type: ['renew', 'stem'] }, text: 'A copy of your current work permit (EAD), front and back.' },
        { group: 'send', if: { type: 'opt' }, text: 'A copy of any work permit (EAD) you had before, front and back.' },
        { group: 'send', if: { type: 'renew' }, text: 'The evidence the instructions list for your eligibility category (the code on your card, for example C09, C08 or C26). For a pending green card (C09), that is usually a copy of your Form I-485 receipt notice.' },
        { group: 'send', if: { type: 'opt' }, text: 'Your Form I-20 with your DSO’s OPT recommendation. USCIS must receive your application within 30 days after the DSO enters it in SEVIS.' },
        { group: 'send', if: { type: 'stem' }, text: 'Your Form I-20 with your DSO’s STEM OPT recommendation. USCIS must receive your application within 60 days after the DSO enters it in SEVIS.' },
        { group: 'send', if: { type: 'stem' }, text: 'A copy of your STEM degree (the diploma), or proof you completed it.' },
        { group: 'send', if: { type: 'stem' }, text: 'Your employer’s name and E-Verify company ID number, which you enter on the form.' },
        { group: 'if', text: 'Photos: since December 12, 2025, USCIS takes your photo at a biometrics appointment and does not accept photos you take yourself for most forms. Older I-765 instructions still ask for two passport-style photos. Follow what the I-765 page says when you file.' },
        { group: 'later', text: 'Go to your biometrics appointment when the notice arrives. USCIS takes your fingerprints and photo there.' }
      ]
    }
  };

  var COMMON = [
    { group: 'send', text: 'The form itself: the edition USCIS accepts today (the form page says which), every question answered, and signed. USCIS rejects unsigned forms.' },
    { group: 'send', text: 'Payment, if you file on paper: Form G-1450 (credit, debit or prepaid card) or Form G-1650 (debit from a U.S. bank account). USCIS no longer accepts paper checks or money orders unless you qualify for an exemption (Form G-1651). If you file online, you pay online.' },
    { group: 'if', text: 'A full English translation of any document in another language, with the translator’s signed statement that they are fluent in both languages and that it is accurate.' }
  ];

  function matches(cond, answers) {
    if (!cond) return true;
    return Object.keys(cond).every(function (k) { var v = cond[k]; return Array.isArray(v) ? v.indexOf(answers[k]) >= 0 : answers[k] === v; });
  }

  /* Returns { stop } or { send: [...], if: [...], later: [...] } with item texts, common items first. */
  function build(formId, answers) {
    var f = FORMS[formId];
    if (f.stop && matches(f.stop.if, answers)) return { stop: f.stop.text };
    var out = { send: [], if: [], later: [] };
    COMMON.concat(f.items).forEach(function (it) { if (matches(it.if, answers)) out[it.group].push(it.text); });
    return out;
  }

  var api = { FORMS: FORMS, COMMON: COMMON, build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DocChecklist = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var HEAD = { send: 'Send with your form', if: 'Also send, if it applies to you', later: 'Keep for later' };

  function questions() {
    var f = FORMS[$('dc-form').value];
    $('dc-questions').innerHTML = f.questions.map(function (q) {
      return '<div class="field"><label for="dc-q-' + q.id + '">' + esc(q.label) + '</label><select id="dc-q-' + q.id + '" data-q="' + q.id + '">' +
        q.options.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    }).join('');
    render();
  }

  function render() {
    var id = $('dc-form').value, f = FORMS[id], answers = {}, n = 0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-q]'), function (s) { answers[s.getAttribute('data-q')] = s.value; });
    var r = build(id, answers), html = '<h2 class="dc-h">Your checklist: Form ' + esc(f.name) + '</h2>';
    if (r.stop) { $('dc-result').innerHTML = html + '<p class="dc-msg dc-bad"><strong>Check this first.</strong> ' + esc(r.stop) + '</p>'; return; }
    ['send', 'if', 'later'].forEach(function (g) {
      if (!r[g].length) return;
      html += '<h3 class="dc-h3">' + HEAD[g] + '</h3><ul class="dc-list">' + r[g].map(function (t) {
        n++; return '<li><input type="checkbox" id="dc-i' + n + '"><label for="dc-i' + n + '">' + esc(t) + '</label></li>';
      }).join('') + '</ul>';
    });
    html += '<p class="small">Based on the form instructions as of October 2026. Before you mail anything, read the &ldquo;What evidence must you submit&rdquo; part of the current instructions on the <a href="' + f.page + '" rel="noopener">USCIS Form ' + esc(id === 'n400' ? 'N-400' : id === 'i90' ? 'I-90' : 'I-765') + ' page</a>. Send copies unless the instructions ask for an original.</p>';
    html += '<p class="actions dc-noprint"><button type="button" class="btn secondary" id="dc-print">Print checklist</button></p>';
    $('dc-result').innerHTML = html;
    $('dc-print').addEventListener('click', function () { window.print(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('dc-form')) return;
    $('dc-form').addEventListener('change', questions);
    $('dc-questions').addEventListener('change', render);
    questions();
  });
})(typeof window !== 'undefined' ? window : this);
