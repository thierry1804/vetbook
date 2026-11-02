(function () {
  var content = document.getElementById('pg-content');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function fail(message) {
    document.title = 'Médaille introuvable · App’lika';
    content.innerHTML = '<div class="pg-error"><h1>Médaille introuvable</h1><p>' + esc(message) + '</p></div>';
  }

  function formatDate(iso) {
    if (!iso) return '';
    var parts = String(iso).slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function fact(label, value) {
    if (!value) return '';
    return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  function render(card, token) {
    var name = card.name || 'Animal';
    document.title = name + ' · Médaille App’lika';
    var photo = card.hasPhoto
      ? '<img src="/api/identity/public/' + encodeURIComponent(token) + '/photo" alt="">'
      : esc(name.charAt(0).toUpperCase());
    var dial = String(card.phone || '').replace(/[^\d+]/g, '');
    var call = dial
      ? '<a class="pg-call" href="tel:' + esc(dial) + '">Appeler ' + esc(card.ownerName || 'le propriétaire') + '</a>'
      : '<p class="pg-muted">Aucun numéro n’a été laissé sur cette médaille.</p>';
    var subtitle = [card.race, card.species].filter(Boolean).join(' · ');
    var weight = card.weight != null ? String(card.weight).replace('.', ',') + ' kg' : '';
    var facts = [
      fact('Espèce', card.species),
      fact('Race', card.race),
      fact('Sexe', card.sex),
      fact('Naissance', formatDate(card.dob)),
      fact('Couleur', card.color),
      fact('Puce', card.chip),
      fact('Stérilisé', card.sterilise),
      fact('Poids', weight),
    ].join('');
    content.innerHTML =
      '<article class="pg-medal">' +
        '<div class="pg-hero">' +
          '<div class="pg-avatar">' + photo + '</div>' +
          '<div><h1>' + esc(name) + '</h1>' +
          (subtitle ? '<p class="pg-sub">' + esc(subtitle) + '</p>' : '') +
          (card.ownerName ? '<p class="pg-sub">Propriétaire : ' + esc(card.ownerName) + '</p>' : '') +
          '</div>' +
        '</div>' +
        (facts ? '<section class="pg-section"><h2>Identité</h2><dl class="pg-facts">' + facts + '</dl></section>' : '') +
        '<section class="pg-section"><h2>Joindre le propriétaire</h2>' +
          (card.phone ? '<p>' + esc(card.phone) + '</p>' : '') +
          call +
        '</section>' +
        '<p class="pg-foot">Médaille d’identité App’lika. Elle ne contient pas le carnet de santé.</p>' +
      '</article>';
  }

  var token = new URLSearchParams(location.search).get('t') || '';
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) {
    fail('Ce QR code ne correspond à aucune médaille.');
    return;
  }
  fetch('/api/identity/public/' + encodeURIComponent(token))
    .then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        return { ok: res.ok, body: body };
      });
    })
    .then(function (result) {
      if (!result.ok) {
        fail((result.body && result.body.error) || 'Cette médaille n’est plus disponible.');
        return;
      }
      render(result.body, token);
    })
    .catch(function () { fail('La fiche ne peut pas être chargée.'); });
})();
