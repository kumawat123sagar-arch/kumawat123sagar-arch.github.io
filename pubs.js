/* Keeps the publication list current: new papers indexed by OpenAlex
   (the open scholarly database that mirrors Google Scholar's journal
   records) are added automatically. Curated entries in index.html stay as is. */
(function () {
  var AUTHOR = 'A5000185800';
  var list = document.getElementById('pubList');
  if (!list) return;
  var NEW_DAYS = 120, now = Date.now();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function chem(s) {
    return esc(s)
      .replace(/(\b[A-Z][a-z]?|\)) (\d+(?:\.\d+)?)(?=[\s)(]|$)/g, '$1<sub>$2</sub>')
      .replace(/<\/sub> (?=[A-Z(])/g, '</sub>');
  }
  function cleanDoi(d) { return (d || '').replace(/^https?:\/\/doi\.org\//, '').toLowerCase(); }
  function markNew(el) {
    var d = Date.parse(el.getAttribute('data-date'));
    if (d && now - d < NEW_DAYS * 864e5 && !el.querySelector('.badge.new')) {
      var t = el.querySelector('.t');
      if (t) { var b = document.createElement('span'); b.className = 'badge new'; b.textContent = 'New'; t.appendChild(b); }
    }
  }
  function sortList() {
    var items = [].slice.call(list.querySelectorAll('.pub'));
    items.sort(function (a, b) { return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || ''); });
    items.forEach(function (i) { list.appendChild(i); });
  }
  function count() {
    var n = list.querySelectorAll('.pub:not([data-type="proc"])').length;
    [].forEach.call(document.querySelectorAll('[data-count]'), function (e) { e.textContent = n; });
  }
  function render(w) {
    var doi = cleanDoi(w.doi);
    var auth = (w.authorships || []).map(function (a) {
      var n = esc((a.author && a.author.display_name) || a.raw_author_name);
      return ((a.author && a.author.id) || '').indexOf(AUTHOR) > -1 ? '<b>' + n + '</b>' : n;
    });
    if (auth.length > 8) auth = auth.slice(0, 8).concat(['et al.']);
    var src = ((w.primary_location && w.primary_location.source && w.primary_location.source.display_name) || '')
      .split('/')[0].replace(/^Physical review\. ?([A-Z])\.?$/i, 'Physical Review $1');
    var bib = w.biblio || {};
    var vol = [bib.volume, bib.first_page].filter(Boolean).join(', ');
    var el = document.createElement('div');
    el.className = 'pub';
    el.setAttribute('data-doi', doi);
    el.setAttribute('data-date', w.publication_date || String(w.publication_year));
    el.innerHTML = '<span class="yr">' + esc(w.publication_year) + '</span><div><div class="t">' + chem(w.title || '') +
      '</div><div class="a">' + auth.join(', ') + '</div><div class="j"><i>' + esc(src) + '</i> ' + esc(vol) + '</div></div>' +
      (doi ? '<a class="lnk" href="https://doi.org/' + esc(doi) + '" target="_blank" rel="noopener">DOI ↗</a>' : '<span></span>');
    return el;
  }

  [].forEach.call(list.querySelectorAll('.pub'), markNew);
  if (!window.fetch) return;
  fetch('https://api.openalex.org/works?filter=author.id:' + AUTHOR + ',type:article&sort=publication_date:desc&per-page=100' +
        '&select=doi,title,publication_date,publication_year,primary_location,authorships,biblio')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.results || !d.results.length) return;
      var known = {};
      [].forEach.call(list.querySelectorAll('.pub[data-doi]'), function (e) { known[e.getAttribute('data-doi')] = 1; });
      d.results.forEach(function (w) {
        var doi = cleanDoi(w.doi);
        if (doi && !known[doi]) { var el = render(w); list.appendChild(el); markNew(el); known[doi] = 1; }
      });
      sortList();
      count();
    })
    .catch(function () {});
})();
