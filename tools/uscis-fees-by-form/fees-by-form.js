/* Search box for the fees-by-form tables. Runs in the browser; what you type is not sent or stored. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var q = document.getElementById('fee-q');
    if (!q) return;
    var rows = Array.prototype.slice.call(document.querySelectorAll('.fee-table tbody tr'));
    var cats = Array.prototype.slice.call(document.querySelectorAll('.fee-cat'));
    var count = document.getElementById('fee-count');
    function run() {
      var t = q.value.toLowerCase().replace(/\s+/g, ' ').trim();
      var terms = t ? t.split(' ') : [];
      var shown = 0;
      rows.forEach(function (r) {
        var hay = r.getAttribute('data-s');
        var ok = terms.every(function (w) { return hay.indexOf(w) !== -1; });
        r.hidden = !ok;
        if (ok) shown++;
      });
      cats.forEach(function (c) { c.hidden = !c.querySelector('tbody tr:not([hidden])'); });
      count.textContent = !t ? '' : shown ? shown + (shown === 1 ? ' form shown' : ' forms shown') : 'No forms match. Try the form number, such as I-130.';
    }
    q.addEventListener('input', run);
  });
})();
