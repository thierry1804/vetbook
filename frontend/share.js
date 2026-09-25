/* Carnet partagé en lecture seule.
 *   share.html?t=<jeton>  : lien vétérinaire (public, expirant)
 *   share.html?h=<foyer>  : carnets d'un foyer dont on est membre (connexion requise)
 */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var token = q.get('t');
  var household = q.get('h');
  var content = document.getElementById('pg-content');
  var printBtn = document.getElementById('pg-print');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(d) { if (!d) return '—'; var x = new Date(String(d).slice(0, 10) + 'T12:00:00'); return isNaN(x) ? '—' : x.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function days(d) { var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(String(d).slice(0, 10) + 'T00:00:00') - t) / 86400000); }
  function age(dob) {
    if (!dob) return '';
    var m = Math.floor((Date.now() - new Date(String(dob).slice(0, 10) + 'T12:00:00')) / (864e5 * 30.44));
    if (isNaN(m) || m < 0) return '';
    return m < 24 ? m + ' mois' : Math.floor(m / 12) + ' ans';
  }
  function dueCell(next) {
    if (!next) return '<span class="pg-muted">—</span>';
    var d = days(next);
    return d < 0 ? '<span class="pg-late">' + esc(fmt(next)) + ' (en retard de ' + Math.abs(d) + ' j)</span>' : esc(fmt(next));
  }
  function errorView(title, text, login) {
    content.innerHTML = '<div class="pg-error"><h1>' + esc(title) + '</h1><p>' + esc(text) + '</p>' + (login ? '<p><a class="pg-btn" href="./">Ouvrir App’lika pour se connecter</a></p>' : '') + '</div>';
  }

  function table(head, rows, empty) {
    if (!rows.length) return '<p class="pg-muted">' + esc(empty) + '</p>';
    return '<div class="pg-table-wrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }

  function chart(weights) {
    var pts = (weights || []).filter(function (w) { return w.date && Number(w.weight) > 0; }).slice(-24);
    if (pts.length < 2) return '';
    var W = 600, H = 180, pl = 36, pr = 10, pt = 12, pb = 24;
    var vals = pts.map(function (p) { return Number(p.weight); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (lo === hi) { lo -= 1; hi += 1; }
    var pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
    var x = function (i) { return pl + i * (W - pl - pr) / (pts.length - 1); };
    var y = function (v) { return pt + (hi - v) / (hi - lo) * (H - pt - pb); };
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(Number(p.weight)).toFixed(1); }).join(' ');
    var ticks = [lo + pad, (lo + hi) / 2, hi - pad].map(function (v) { return '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 4"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + v.toFixed(1).replace('.', ',') + '</text>'; }).join('');
    var dots = pts.map(function (p, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(Number(p.weight)).toFixed(1) + '" r="3.5" fill="var(--accent)"><title>' + esc(fmt(p.date)) + ' : ' + esc(String(p.weight).replace('.', ',')) + ' kg</title></circle>'; }).join('');
    return '<svg class="pg-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Évolution du poids en kilogrammes, de ' + esc(fmt(pts[0].date)) + ' à ' + esc(fmt(pts[pts.length - 1].date)) + '">' + ticks + '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' + dots +
      '<text x="' + pl + '" y="' + (H - 6) + '" font-size="11" fill="var(--muted)">' + esc(fmt(pts[0].date)) + '</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + esc(fmt(pts[pts.length - 1].date)) + '</text></svg>';
  }

  function petView(p, photoUrl, meta) {
    var a = p.animal || {};
    var all = [].concat(p.vaccines || [], p.dewormings || [], p.hygiene || []);
    var late = all.filter(function (x) { return x.next && days(x.next) < 0; }).length;
    var status = late ? '<span class="pg-chip pg-chip--late">' + late + ' soin' + (late > 1 ? 's' : '') + ' en retard</span>' : '<span class="pg-chip pg-chip--ok">Soins à jour</span>';
    var facts = [['Espèce', a.species], ['Race', a.race], ['Sexe', a.sex], ['Né(e) le', a.dob ? fmt(a.dob) + (age(a.dob) ? ' (' + age(a.dob) + ')' : '') : ''], ['Poids', a.weight != null && a.weight !== '' ? String(a.weight).replace('.', ',') + ' kg' : ''], ['Taille', a.height != null && a.height !== '' ? String(a.height).replace('.', ',') + ' cm' : ''],
      ['Robe', a.color], ['Stérilisation', a.sterilise], ['Puce électronique', a.chip]].filter(function (f) { return f[1]; });
    var nutri = p.nutrition && p.nutrition.dailyPlan && (p.nutrition.dailyPlan.foodBrand || p.nutrition.dailyPlan.targetCalories) ? p.nutrition.dailyPlan : null;
    var ped = p.pedigree && (p.pedigree.registryNumber || p.pedigree.sire || p.pedigree.dam) ? p.pedigree : null;
    var html = '<section class="pg-hero"><div class="pg-avatar" aria-hidden="true">' + esc((a.name || '?').charAt(0).toUpperCase()) + '</div><div><h1>' + esc(a.name || 'Animal') + '</h1><p class="pg-sub">' + esc([a.race || a.species, a.sex, age(a.dob)].filter(Boolean).join(' · ')) + '</p><div class="pg-chips">' + status + '</div></div></section>';
    html += '<section class="pg-section"><h2>Identité</h2><dl class="pg-facts">' + facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' + (a.notes ? '<p class="pg-muted">' + esc(a.notes) + '</p>' : '') + '</section>';
    html += '<section class="pg-section"><h2>Vaccins</h2>' + table(['Date', 'Vaccin', 'Prochain rappel', 'Vétérinaire'], (p.vaccines || []).slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); }).map(function (v) { return '<tr><td class="num">' + esc(fmt(v.date)) + '</td><td>' + esc(v.name) + '</td><td class="num">' + dueCell(v.next) + '</td><td>' + esc(v.vet || '') + '</td></tr>'; }), 'Aucun vaccin enregistré.') + '</section>';
    html += '<section class="pg-section"><h2>Déparasitage</h2>' + table(['Date', 'Produit', 'Type', 'Prochaine prise'], (p.dewormings || []).slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); }).map(function (d) { return '<tr><td class="num">' + esc(fmt(d.date)) + '</td><td>' + esc(d.name) + '</td><td>' + esc(d.type || '') + '</td><td class="num">' + dueCell(d.next) + '</td></tr>'; }), 'Aucun déparasitage enregistré.') + '</section>';
    html += '<section class="pg-section"><h2>Traitements</h2>' + table(['Médicament', 'Posologie', 'Période', 'État'], (p.medications || []).slice().sort(function (x, y) { return String(y.startDate).localeCompare(String(x.startDate)); }).map(function (m) { var active = m.active !== false && (!m.endDate || days(m.endDate) >= 0); return '<tr><td>' + esc(m.name) + '</td><td>' + esc([m.dosage, m.frequency].filter(Boolean).join(' · ')) + '</td><td class="num">' + esc(fmt(m.startDate)) + (m.endDate ? ' → ' + esc(fmt(m.endDate)) : ' → en continu') + '</td><td>' + (active ? 'En cours' : 'Terminé') + (m.notes ? '<br><span class="pg-muted">' + esc(m.notes) + '</span>' : '') + '</td></tr>'; }), 'Aucun traitement enregistré.') + '</section>';
    html += '<section class="pg-section"><h2>Consultations</h2>' + table(['Date', 'Motif', 'Diagnostic et traitement', 'Vétérinaire'], (p.consultations || []).slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); }).map(function (c) { return '<tr><td class="num">' + esc(fmt(c.date)) + '</td><td>' + esc(c.reason) + '</td><td>' + esc([c.diagnosis, c.treatment].filter(Boolean).join(' — ')) + (c.notes ? '<br><span class="pg-muted">' + esc(c.notes) + '</span>' : '') + '</td><td>' + esc(c.vet || '') + '</td></tr>'; }), 'Aucune consultation enregistrée.') + '</section>';
    var w = chart(a.weightHistory);
    if (w || (a.weightHistory || []).length) html += '<section class="pg-section"><h2>Poids</h2>' + w + table(['Date', 'Poids'], (a.weightHistory || []).slice(-8).reverse().map(function (x) { return '<tr><td class="num">' + esc(fmt(x.date)) + '</td><td class="num">' + esc(String(x.weight).replace('.', ',')) + ' kg</td></tr>'; }), '') + '</section>';
    html += '<section class="pg-section"><h2>Hygiène et soins</h2>' + table(['Date', 'Soin', 'Prochain'], (p.hygiene || []).slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); }).slice(0, 12).map(function (h) { return '<tr><td class="num">' + esc(fmt(h.date)) + '</td><td>' + esc(h.type) + (h.notes ? '<br><span class="pg-muted">' + esc(h.notes) + '</span>' : '') + '</td><td class="num">' + dueCell(h.next) + '</td></tr>'; }), 'Aucun soin enregistré.') + '</section>';
    if (nutri) html += '<section class="pg-section"><h2>Alimentation</h2><dl class="pg-facts">' + [['Aliment', nutri.foodBrand], ['Calories par jour', nutri.targetCalories], ['Repas par jour', nutri.mealsPerDay], ['Ration', nutri.portionSize]].filter(function (f) { return f[1]; }).map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl></section>';
    if (ped) html += '<section class="pg-section"><h2>Origines</h2><dl class="pg-facts">' + [['Registre', [ped.registry, ped.registryNumber].filter(Boolean).join(' ')], ['Père', ped.sire], ['Mère', ped.dam]].filter(function (f) { return f[1]; }).map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl></section>';
    if (p.notes) html += '<section class="pg-section"><h2>Notes de suivi</h2>' + table(['Date', 'Note'], p.notes.slice().sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); }).slice(0, 30).map(function (n) { return '<tr><td class="num">' + esc(fmt(n.date)) + '</td><td><b>' + esc(n.title) + '</b>' + (n.content ? '<br>' + esc(n.content) : '') + '</td></tr>'; }), 'Aucune note.') + '</section>';
    if (p.photos && p.photos.length) html += '<section class="pg-section"><h2>Photos</h2><div class="pg-photos">' + p.photos.slice(0, 24).map(function (ph) { return '<figure><img loading="lazy" src="' + esc(photoUrl(ph.id)) + '" alt="' + esc(ph.caption || 'Photo de ' + (a.name || 'l’animal')) + '"><figcaption>' + esc(ph.caption || fmt(ph.date)) + '</figcaption></figure>'; }).join('') + '</div></section>';
    return html + (meta || '');
  }

  function ownerBlock(o) {
    if (!o || (!o.name && !o.phone && !o.clinic)) return '';
    return '<section class="pg-section"><h2>Propriétaire</h2><dl class="pg-facts">' + [['Nom', o.name], ['Téléphone', o.phone], ['Clinique habituelle', o.clinic]].filter(function (f) { return f[1]; }).map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl></section>';
  }

  function loadShared() {
    fetch('/api/share/public/' + encodeURIComponent(token), { credentials: 'omit', headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Carnet indisponible.'); return j; });
    }).then(function (p) {
      document.title = (p.animal && p.animal.name ? p.animal.name + ' · ' : '') + 'Carnet de santé partagé';
      var foot = '<p class="pg-foot">Carnet partagé en lecture seule' + (p.label ? ' avec ' + esc(p.label) : '') + ' le ' + esc(fmt(p.sharedAt)) + ' · le lien expire le ' + esc(fmt(p.expiresAt)) + '.<br>Ces informations ne remplacent pas un avis vétérinaire.</p>';
      content.innerHTML = '<div class="pg-notice">Vous consultez un carnet de santé partagé par son propriétaire. Il est en lecture seule.</div>' + petView(p, function (id) { return '/api/share/public/' + encodeURIComponent(token) + '/photo/' + encodeURIComponent(id); }, ownerBlock(p.owner)) + foot;
      printBtn.hidden = false;
    }).catch(function (e) { errorView('Ce carnet n’est pas accessible', e.message + ' Demandez un nouveau lien à son propriétaire.'); });
  }

  function loadHousehold() {
    fetch('/api/household/' + encodeURIComponent(household) + '/pets', { credentials: 'include', headers: { Accept: 'application/json' } }).then(function (r) {
      if (r.status === 401) throw Object.assign(new Error('Connectez-vous à App’lika avec le compte invité pour consulter ces carnets.'), { login: true });
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Foyer indisponible.'); return j; });
    }).then(function (h) {
      if (!h.pets.length) { errorView('Aucun carnet', 'Ce foyer ne contient pas encore de carnet.'); return; }
      var current = 0;
      function draw() {
        var p = h.pets[current];
        var tabs = h.pets.length > 1 ? '<div class="pg-tabs" role="tablist" aria-label="Animaux du foyer">' + h.pets.map(function (x, i) { return '<button type="button" role="tab" class="pg-tab" aria-selected="' + (i === current) + '" data-i="' + i + '">' + esc(x.animal.name || 'Animal') + '</button>'; }).join('') + '</div>' : '';
        content.innerHTML = '<div class="pg-notice">Carnets de ' + esc(h.ownerName || 'votre proche') + ' · lecture seule.</div>' + tabs + petView(p, function (id) { return '/api/household/' + encodeURIComponent(household) + '/photo/' + encodeURIComponent(id); }, '') + '<p class="pg-foot">Ces informations ne remplacent pas un avis vétérinaire.</p>';
        printBtn.hidden = false;
      }
      content.addEventListener('click', function (e) { var b = e.target.closest('.pg-tab'); if (b) { current = Number(b.dataset.i); draw(); } });
      draw();
    }).catch(function (e) { errorView('Carnets indisponibles', e.message, e.login); });
  }

  printBtn.addEventListener('click', function () { window.print(); });
  if (token) loadShared();
  else if (household) loadHousehold();
  else errorView('Lien incomplet', 'Ce lien ne contient pas de carnet à afficher.');
})();
