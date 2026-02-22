/**
 * VetBook — Carnet de Santé Animal
 * Application web : gestion du profil animal, vaccins, déparasitage, photos, alertes.
 * Données persistées dans localStorage.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'vetbook_data';
  const DEFAULT_ANIMAL = {
    id: 1,
    animal: {
      name: 'Bolt',
      species: 'Canine',
      race: 'Coton de Tuléar',
      sex: 'Mâle',
      dob: '2024-11-27',
      weight: 5.7,
      color: '',
      chip: '',
      sterilise: 'Non',
      notes: '',
      avatar: null
    },
    owner: {
      name: 'Randriamananjara Onjaniaine',
      phone: '038 427 M68',
      email: 'onjaniaine.randriamananjara@outlook.com',
      clinic: 'VetCare Madagascar',
      address: ''
    },
    photos: [],
    vaccines: [
      { id: 1, date: '2025-01-25', name: 'Nobivac 1-Pv', next: '2025-02-15', vet: 'Dr Andrianarivo Herivalisoa' },
      { id: 2, date: '2025-02-22', name: 'Nobivac 1-DAPPv', next: '2025-03-15', vet: 'Dr Andrianarivo Herivalisoa' },
      { id: 3, date: '2025-03-15', name: 'Nobivac 1-DAPPvL2', next: '2025-04-15', vet: 'Dr Andrianarivo Herivalisoa' },
      { id: 4, date: '2025-04-15', name: 'Nobivac Rabies', next: '2026-03-15', vet: 'Dr Rakotomanatovo' }
    ],
    dewormings: [
      { id: 1, date: '2025-01-13', name: 'Antcycle liq', next: '2025-02-13', type: 'interne' },
      { id: 2, date: '2025-02-12', name: 'Milpro 1cp', next: '', type: 'interne' },
      { id: 3, date: '2025-03-22', name: 'Quantel 3,1 Ess', next: '', type: 'interne' },
      { id: 4, date: '2025-04-22', name: 'Zerokrim', next: '', type: 'interne' },
      { id: 5, date: '2025-05-30', name: 'Ivermachin 1cp', next: '', type: 'interne' },
      { id: 6, date: '2025-09-14', name: 'Deworm Plus', next: '', type: 'interne' },
      { id: 7, date: '2026-01-07', name: 'Pyrantel liq', next: '2026-03-07', type: 'interne' }
    ],
    notifications: {
      vaccineReminder: true,
      dewormingReminder: true,
      birthdayReminder: true,
      monthlySummary: false
    }
  };

  let state = {
    animals: [],
    nextId: 20,
    currentAnimalId: null,
    viewMode: 'home'  // 'home' | 'detail'
  };

  // ——— Helpers —————————————————————————————————————————————
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getStatus(nextDate) {
    if (!nextDate) return null;
    const diff = (new Date(nextDate) - new Date()) / 864e5;
    if (diff < 0) return { cls: 'status-overdue', lbl: 'En retard' };
    if (diff <= 30) return { cls: 'status-soon', lbl: 'Bientôt' };
    return { cls: 'status-ok', lbl: 'À jour' };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.animals = parsed.animals || [];
        state.nextId = Math.max(state.nextId, parsed.nextId || 20);
        state.currentAnimalId = parsed.currentAnimalId != null ? parsed.currentAnimalId : (state.animals[0]?.id ?? null);
      }
      if (state.animals.length === 0) {
        state.animals = [JSON.parse(JSON.stringify(DEFAULT_ANIMAL))];
        state.currentAnimalId = state.animals[0].id;
      }
      if (!state.animals.some(a => a.id === state.currentAnimalId)) {
        state.currentAnimalId = state.animals[0].id;
      }
    } catch (e) {
      console.warn('VetBook: erreur lecture localStorage', e);
      state.animals = [JSON.parse(JSON.stringify(DEFAULT_ANIMAL))];
      state.currentAnimalId = state.animals[0].id;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        animals: state.animals,
        nextId: state.nextId,
        currentAnimalId: state.currentAnimalId
      }));
    } catch (e) {
      console.warn('VetBook: erreur écriture localStorage', e);
    }
  }

  function getCurrent() {
    return state.animals.find(a => a.id === state.currentAnimalId) || state.animals[0];
  }

  function getUpcomingCount(data) {
    const today = new Date();
    const v = (data.vaccines.filter(x => x.next && new Date(x.next) >= today)).length;
    const d = (data.dewormings.filter(x => x.next && new Date(x.next) >= today)).length;
    return v + d;
  }

  // ——— Page d'accueil —————————————————————————————————────────—
  function renderHome() {
    const grid = document.getElementById('home-pet-grid');
    const emptyEl = document.getElementById('home-empty');
    if (!grid) return;

    if (state.animals.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) { emptyEl.hidden = false; }
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    grid.innerHTML = state.animals.map(function (data) {
      const a = data.animal;
      const name = a.name || 'Sans nom';
      const meta = [a.race, a.sex].filter(Boolean).join(' · ') || a.species || '—';
      const avatarHtml = a.avatar
        ? '<img src="' + a.avatar + '" alt="">'
        : (a.species === 'Féline' ? '🐱' : '🐕');
      const upcoming = getUpcomingCount(data);
      return '<article class="pet-card" data-animal-id="' + data.id + '">' +
        '<div class="pet-card-header">' +
        '<div class="pet-card-avatar">' + avatarHtml + '</div>' +
        '<div class="pet-card-info">' +
        '<div class="pet-card-name">' + name + '</div>' +
        '<div class="pet-card-meta">' + meta + '</div>' +
        '</div></div>' +
        '<div class="pet-card-stats">' +
        '<span>💉 ' + data.vaccines.length + ' vaccin(s)</span>' +
        '<span>🪱 ' + data.dewormings.length + ' déparas.</span>' +
        '<span>📷 ' + data.photos.length + ' photo(s)</span>' +
        (upcoming ? '<span>🔔 ' + upcoming + ' rappel(s)</span>' : '') +
        '</div>' +
        '<div class="pet-card-actions">' +
        '<button type="button" class="btn-card btn-card-primary" data-action="carnet" data-animal-id="' + data.id + '">📋 Voir le carnet</button>' +
        '<button type="button" class="btn-card btn-card-secondary" data-action="vaccin" data-animal-id="' + data.id + '">💉 Vaccin</button>' +
        '<button type="button" class="btn-card btn-card-secondary" data-action="deworming" data-animal-id="' + data.id + '">🪱 Déparas.</button>' +
        '<button type="button" class="btn-card btn-card-secondary" data-action="photos" data-animal-id="' + data.id + '">📷 Photos</button>' +
        '</div></article>';
    }).join('');

    grid.querySelectorAll('.btn-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = parseInt(btn.getAttribute('data-animal-id'), 10);
        const action = btn.getAttribute('data-action');
        if (!state.animals.some(function (x) { return x.id === id; })) return;
        state.currentAnimalId = id;
        saveState();
        showDetail();
        if (action === 'vaccin') { openModal('addVaccin'); }
        if (action === 'deworming') { openModal('addDeworming'); }
        if (action === 'photos') { switchTab('photos'); }
      });
    });
  }

  function showHome() {
    state.viewMode = 'home';
    document.getElementById('view-home').hidden = false;
    document.getElementById('view-detail').hidden = true;
    document.getElementById('animal-select').style.display = 'none';
    document.getElementById('btn-accueil').hidden = true;
    renderHome();
  }

  function showDetail() {
    state.viewMode = 'detail';
    document.getElementById('view-home').hidden = true;
    document.getElementById('view-detail').hidden = false;
    document.getElementById('animal-select').style.display = '';
    document.getElementById('btn-accueil').hidden = false;
    renderAnimalSelect();
    refreshAll();
    switchTab('profil');
  }

  // ——— Profil ———————————————————————————————————————————————
  function renderProfile() {
    const data = getCurrent();
    if (!data) return;
    const a = data.animal;
    const o = data.owner;

    document.getElementById('hero-name').textContent = a.name || '—';
    document.getElementById('hero-breed').textContent = [a.race, a.sex].filter(Boolean).join(' · ') || '—';
    document.getElementById('hero-dob').textContent = a.dob ? '🎂 ' + fmtDate(a.dob) : '🎂 —';
    document.getElementById('hero-weight').textContent = a.weight != null ? '⚖️ ' + a.weight + ' kg' : '⚖️ — kg';
    document.getElementById('hero-species').textContent = a.species ? '🔬 ' + a.species : '🔬 —';

    document.getElementById('info-race').textContent = a.race || '—';
    document.getElementById('info-weight').textContent = a.weight != null ? a.weight + ' kg' : '—';
    document.getElementById('info-chip').textContent = a.chip || 'Non renseigné';
    document.getElementById('info-color').textContent = a.color || '—';
    document.getElementById('info-sterilise').textContent = a.sterilise || 'Non';

    const ageEl = document.getElementById('age-display');
    if (a.dob) {
      const months = Math.floor((new Date() - new Date(a.dob)) / (864e5 * 30.44));
      ageEl.textContent = months < 24 ? months + ' mois' : Math.floor(months / 12) + ' ans';
    } else {
      ageEl.textContent = '—';
    }

    const av = document.getElementById('hero-avatar');
    if (a.avatar) {
      av.innerHTML = '<img src="' + a.avatar + '" alt="' + (a.name || 'Animal') + '">';
    } else {
      av.innerHTML = '';
      av.textContent = a.species === 'Féline' ? '🐱' : '🐕';
      av.style.fontSize = '48px';
    }

    document.getElementById('owner-name').textContent = o.name || '—';
    document.getElementById('owner-phone').textContent = o.phone || '—';
    document.getElementById('owner-email').textContent = o.email || '—';
    document.getElementById('owner-clinic').textContent = o.clinic || '—';

    document.getElementById('stat-vax').textContent = data.vaccines.length;
    document.getElementById('stat-dew').textContent = data.dewormings.length;
    document.getElementById('stat-photos').textContent = data.photos.length;

    const upcoming = [...data.vaccines.filter(v => v.next), ...data.dewormings.filter(d => d.next)]
      .filter(e => new Date(e.next) >= new Date());
    document.getElementById('stat-next').textContent = upcoming.length;
  }

  // ——— Sélecteur d'animal ————————————————————————————————————
  function renderAnimalSelect() {
    const sel = document.getElementById('animal-select');
    if (!sel) return;
    sel.innerHTML = state.animals.map(an => {
      const name = an.animal.name || 'Sans nom';
      return '<option value="' + an.id + '"' + (an.id === state.currentAnimalId ? ' selected' : '') + '>' + name + '</option>';
    }).join('');
    if (state.animals.length <= 1) sel.style.display = 'none';
    else sel.style.display = '';
  }

  function onAnimalSelectChange() {
    const sel = document.getElementById('animal-select');
    if (!sel) return;
    const id = parseInt(sel.value, 10);
    if (!isNaN(id) && state.animals.some(a => a.id === id)) {
      state.currentAnimalId = id;
      saveState();
      refreshAll();
    }
  }

  // ——— Modals —————————————————————————————————————————————————
  function openModal(name) {
    const data = getCurrent();
    if (!data) return;

    if (name === 'editAnimal') {
      const a = data.animal;
      const fields = ['name', 'species', 'race', 'sex', 'dob', 'weight', 'color', 'chip', 'sterilise', 'notes'];
      fields.forEach(f => {
        const el = document.getElementById('ea-' + f);
        if (el) el.value = a[f] != null && a[f] !== '' ? a[f] : '';
      });
      const prev = document.getElementById('edit-avatar-preview');
      if (a.avatar) prev.innerHTML = '<img src="' + a.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
      else { prev.innerHTML = ''; prev.textContent = a.species === 'Féline' ? '🐱' : '🐕'; }
    }

    if (name === 'editOwner') {
      const o = data.owner;
      ['name', 'phone', 'email', 'clinic', 'address'].forEach(f => {
        const el = document.getElementById('eo-' + f);
        if (el) el.value = o[f] || '';
      });
    }

    if (name === 'addVaccin') {
      document.getElementById('v-name').value = '';
      document.getElementById('v-date').value = '';
      document.getElementById('v-next').value = '';
      document.getElementById('v-vet').value = '';
    }

    if (name === 'addDeworming') {
      document.getElementById('d-name').value = '';
      document.getElementById('d-date').value = '';
      document.getElementById('d-next').value = '';
      document.getElementById('d-type').value = 'interne';
    }

    const overlay = document.getElementById('modal-' + name);
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal(name) {
    const overlay = document.getElementById('modal-' + name);
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  // ——— Sauvegarde formulaire animal —————————————————────────———
  function saveAnimal() {
    const data = getCurrent();
    if (!data) return;
    const a = data.animal;
    const fields = ['name', 'species', 'race', 'sex', 'dob', 'color', 'chip', 'sterilise', 'notes'];
    fields.forEach(f => {
      const el = document.getElementById('ea-' + f);
      if (el) a[f] = el.value.trim();
    });
    const w = parseFloat(document.getElementById('ea-weight').value, 10);
    a.weight = isNaN(w) ? a.weight : w;
    closeModal('editAnimal');
    saveState();
    renderProfile();
    renderAnimalSelect();
  }

  function saveOwner() {
    const data = getCurrent();
    if (!data) return;
    const o = data.owner;
    ['name', 'phone', 'email', 'clinic', 'address'].forEach(f => {
      const el = document.getElementById('eo-' + f);
      if (el) o[f] = el.value.trim();
    });
    closeModal('editOwner');
    saveState();
    renderProfile();
  }

  // ——— Ajouter un animal ——————————————————————————————————————
  function addAnimal() {
    const name = document.getElementById('aa-name').value.trim();
    if (!name) {
      alert('Veuillez saisir le nom de l\'animal.');
      return;
    }
    const newAnimal = {
      id: state.nextId++,
      animal: {
        name: name,
        species: document.getElementById('aa-species').value || 'Canine',
        race: document.getElementById('aa-race').value.trim() || '',
        sex: document.getElementById('aa-sex').value || 'Mâle',
        dob: document.getElementById('aa-dob').value || '',
        weight: parseFloat(document.getElementById('aa-weight').value, 10) || null,
        color: '',
        chip: '',
        sterilise: 'Non',
        notes: '',
        avatar: null
      },
      owner: JSON.parse(JSON.stringify((getCurrent() || {}).owner || { name: '', phone: '', email: '', clinic: '', address: '' })),
      photos: [],
      vaccines: [],
      dewormings: [],
      notifications: { vaccineReminder: true, dewormingReminder: true, birthdayReminder: true, monthlySummary: false }
    };
    state.animals.push(newAnimal);
    state.currentAnimalId = newAnimal.id;
    closeModal('addAnimal');
    document.getElementById('form-add-animal').reset();
    saveState();
    renderAnimalSelect();
    refreshAll();
    if (state.viewMode === 'home') {
      showDetail();
    }
  }

  // ——— Avatar —————————————————————————————————────────────────—
  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const data = getCurrent();
    if (!data) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      data.animal.avatar = ev.target.result;
      const prev = document.getElementById('edit-avatar-preview');
      prev.innerHTML = '<img src="' + data.animal.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
      saveState();
    };
    reader.readAsDataURL(file);
  }

  // ——— Photos —————————————————————————————————────────────────—
  function triggerPhotoUpload() {
    document.getElementById('photo-input').click();
  }

  function handlePhotoUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const data = getCurrent();
    if (!data) return;
    let loaded = 0;
    const total = files.length;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function (ev) {
        data.photos.push({
          id: state.nextId++,
          src: ev.target.result,
          date: new Date().toISOString().split('T')[0]
        });
        loaded++;
        if (loaded === total) {
          saveState();
          renderGallery();
          renderProfile();
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function renderGallery() {
    const data = getCurrent();
    const grid = document.getElementById('gallery-grid');
    if (!data || !grid) return;
    const addBtn = '<div class="gallery-add" id="gallery-add-trigger" role="button" tabindex="0"><span class="gallery-add-icon">📷</span><span>Ajouter une photo</span></div>';
    const items = data.photos.map(p => {
      const srcEsc = p.src.replace(/'/g, "\\'");
      return '<div class="gallery-item" data-photo-id="' + p.id + '">' +
        '<img src="' + p.src + '" alt="Photo">' +
        '<div class="photo-date">' + fmtDate(p.date) + '</div>' +
        '<button type="button" class="photo-delete" aria-label="Supprimer">✕</button></div>';
    }).join('');
    grid.innerHTML = addBtn + items;
    grid.querySelectorAll('.gallery-item').forEach(el => {
      const id = parseInt(el.getAttribute('data-photo-id'), 10);
      if (isNaN(id)) return;
      const img = el.querySelector('img');
      el.addEventListener('click', function (e) {
        if (e.target.classList.contains('photo-delete')) return;
        openLightbox(img.src);
      });
      el.querySelector('.photo-delete').addEventListener('click', function (e) {
        e.stopPropagation();
        deletePhoto(id);
      });
    });
    const addTrigger = document.getElementById('gallery-add-trigger');
    if (addTrigger) addTrigger.addEventListener('click', triggerPhotoUpload);
  }

  function deletePhoto(id) {
    if (!confirm('Supprimer cette photo ?')) return;
    const data = getCurrent();
    if (!data) return;
    data.photos = data.photos.filter(p => p.id !== id);
    saveState();
    renderGallery();
    renderProfile();
  }

  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('open');
    document.getElementById('lightbox').setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
  }

  // ——— Vaccins —————————————————————————————————────────────────—
  function renderVaccines() {
    const data = getCurrent();
    const tbody = document.getElementById('vaccine-table');
    const alertsEl = document.getElementById('vaccine-alerts');
    if (!data || !tbody) return;

    tbody.innerHTML = data.vaccines.map(v => {
      const st = getStatus(v.next);
      const stHtml = st ? '<span class="status ' + st.cls + '"><span class="status-dot"></span>' + st.lbl + '</span>' : '—';
      return '<tr><td>' + fmtDate(v.date) + '</td><td><strong>' + (v.name || '') + '</strong><br><span class="table-muted">' + (v.vet || '') + '</span></td><td>' + fmtDate(v.next) + '</td><td>' + stHtml + '</td><td><button type="button" class="btn-delete" data-vaccine-id="' + v.id + '" aria-label="Supprimer">✕</button></td></tr>';
    }).join('');

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce vaccin ?')) return;
        const id = parseInt(btn.getAttribute('data-vaccine-id'), 10);
        data.vaccines = data.vaccines.filter(v => v.id !== id);
        saveState();
        renderVaccines();
        renderProfile();
      });
    });

    const overdue = data.vaccines.filter(v => v.next && getStatus(v.next)?.cls === 'status-overdue');
    const soon = data.vaccines.filter(v => v.next && getStatus(v.next)?.cls === 'status-soon');
    let html = '';
    if (overdue.length) html += '<div class="alert-banner alert-warning"><span>⚠️</span> En retard : ' + overdue.map(v => v.name).join(', ') + '</div>';
    if (soon.length) html += '<div class="alert-banner alert-info"><span>⏰</span> Bientôt : ' + soon.map(v => v.name).join(', ') + '</div>';
    alertsEl.innerHTML = html;
  }

  function addVaccine() {
    const name = document.getElementById('v-name').value.trim();
    const date = document.getElementById('v-date').value;
    if (!name || !date) {
      alert('Nom et date du vaccin sont requis.');
      return;
    }
    const data = getCurrent();
    if (!data) return;
    data.vaccines.push({
      id: state.nextId++,
      date: date,
      name: name,
      next: document.getElementById('v-next').value || '',
      vet: document.getElementById('v-vet').value.trim()
    });
    closeModal('addVaccin');
    saveState();
    renderVaccines();
    renderProfile();
  }

  // ——— Déparasitage —————————————————————————————————────────——
  function renderDewormings() {
    const data = getCurrent();
    const tbody = document.getElementById('deworming-table');
    if (!data || !tbody) return;

    tbody.innerHTML = data.dewormings.map(d => {
      const st = d.next ? getStatus(d.next) : null;
      const stHtml = st ? '<span class="status ' + st.cls + '"><span class="status-dot"></span>' + st.lbl + '</span>' : '—';
      return '<tr><td>' + fmtDate(d.date) + '</td><td><strong>' + (d.name || '') + '</strong><br><span class="table-muted">' + d.type + '</span></td><td>' + fmtDate(d.next) + '</td><td>' + stHtml + '</td><td><button type="button" class="btn-delete" data-deworming-id="' + d.id + '" aria-label="Supprimer">✕</button></td></tr>';
    }).join('');

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce déparasitage ?')) return;
        const id = parseInt(btn.getAttribute('data-deworming-id'), 10);
        data.dewormings = data.dewormings.filter(d => d.id !== id);
        saveState();
        renderDewormings();
        renderProfile();
      });
    });
  }

  function addDeworming() {
    const name = document.getElementById('d-name').value.trim();
    const date = document.getElementById('d-date').value;
    if (!name || !date) {
      alert('Traitement et date sont requis.');
      return;
    }
    const data = getCurrent();
    if (!data) return;
    data.dewormings.push({
      id: state.nextId++,
      date: date,
      name: name,
      next: document.getElementById('d-next').value || '',
      type: document.getElementById('d-type').value || 'interne'
    });
    closeModal('addDeworming');
    saveState();
    renderDewormings();
    renderProfile();
  }

  // ——— Alertes & notifications ———————————————————————————————
  function renderAlerts() {
    const data = getCurrent();
    const cont = document.getElementById('upcoming-alerts');
    const notifList = document.getElementById('notif-list');
    if (!data || !cont) return;

    const today = new Date();
    const all = [
      ...data.vaccines.filter(v => v.next).map(v => ({ date: v.next, label: 'Vaccin : ' + v.name, icon: '💉' })),
      ...data.dewormings.filter(d => d.next).map(d => ({ date: d.next, label: 'Déparasitage : ' + d.name, icon: '🪱' }))
    ].filter(e => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (all.length === 0) {
      cont.innerHTML = '<p class="empty-state">Aucun rappel à venir. 🎉</p>';
    } else {
      cont.innerHTML = all.map(e => {
        const diff = Math.round((new Date(e.date) - today) / 864e5);
        const color = diff <= 7 ? '#dc2626' : diff <= 30 ? '#ca8a04' : '#16a34a';
        return '<div class="alert-row"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:18px">' + e.icon + '</span><div><div style="font-weight:600;font-size:14px">' + e.label + '</div><div style="font-size:12px;color:var(--text-muted)">' + fmtDate(e.date) + '</div></div></div><div style="font-weight:700;font-size:13px;color:' + color + '">J-' + diff + '</div></div>';
      }).join('');
    }

    const n = data.notifications;
    const animalName = data.animal.name || 'l\'animal';
    notifList.innerHTML = [
      { key: 'vaccineReminder', label: 'Rappels vaccins', desc: '30 jours avant la date de rappel' },
      { key: 'dewormingReminder', label: 'Rappels déparasitage', desc: '7 jours avant la date de rappel' },
      { key: 'birthdayReminder', label: 'Anniversaire de ' + animalName, desc: data.animal.dob ? 'Le ' + fmtDate(data.animal.dob) + ' chaque année' : 'Date de naissance à renseigner' },
      { key: 'monthlySummary', label: 'Résumé mensuel', desc: 'Récapitulatif de santé chaque mois' }
    ].map(item => {
      const isOn = n[item.key];
      return '<div class="notif-row"><div><div class="notif-label">' + item.label + '</div><div class="notif-desc">' + item.desc + '</div></div><button type="button" class="toggle' + (isOn ? ' on' : '') + '" data-notif="' + item.key + '" aria-pressed="' + isOn + '" aria-label="' + item.label + '"></button></div>';
    }).join('');

    notifList.querySelectorAll('.toggle').forEach(btn => {
      btn.addEventListener('click', function () {
        const key = this.getAttribute('data-notif');
        data.notifications[key] = !data.notifications[key];
        this.classList.toggle('on', data.notifications[key]);
        this.setAttribute('aria-pressed', data.notifications[key]);
        saveState();
      });
    });
  }

  // ——— Historique —————————————————————————————————────────—————
  function renderHistory() {
    const data = getCurrent();
    const timeline = document.getElementById('history-timeline');
    if (!data || !timeline) return;

    const all = [
      ...data.vaccines.map(v => ({ date: v.date, title: v.name, sub: 'Vaccin · ' + (v.vet || ''), icon: '💉' })),
      ...data.dewormings.map(d => ({ date: d.date, title: d.name, sub: 'Déparasitage ' + d.type, icon: '🪱' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    timeline.innerHTML = all.map(e => '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-date">' + fmtDate(e.date) + '</div><div class="timeline-content"><div class="timeline-title">' + e.icon + ' ' + e.title + '</div><div class="timeline-sub">' + e.sub + '</div></div></div>').join('');
  }

  // ——— Tabs ————————————————————————————————————————————————————
  function switchTab(tabName) {
    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
      s.hidden = true;
    });
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    const section = document.getElementById('section-' + tabName);
    const tab = document.querySelector('.tab[data-tab="' + tabName + '"]');
    if (section) { section.classList.add('active'); section.hidden = false; }
    if (tab) { tab.classList.add('active'); tab.setAttribute('aria-selected', 'true'); }

    if (tabName === 'vaccins') renderVaccines();
    if (tabName === 'deworming') renderDewormings();
    if (tabName === 'alertes') renderAlerts();
    if (tabName === 'historique') renderHistory();
    if (tabName === 'photos') renderGallery();
  }

  function refreshAll() {
    renderProfile();
    renderAnimalSelect();
    renderVaccines();
    renderDewormings();
    renderAlerts();
    renderHistory();
    renderGallery();
  }

  // ——— Init & bindings ————————————————————————————————————————
  function init() {
    loadState();
    showHome();

    document.getElementById('logo-home').addEventListener('click', function (e) {
      e.preventDefault();
      showHome();
    });
    document.getElementById('btn-accueil').addEventListener('click', showHome);
    var btnAddHome = document.getElementById('btn-add-animal-home');
    if (btnAddHome) btnAddHome.addEventListener('click', function () { openModal('addAnimal'); });

    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab'));
      });
    });

    document.getElementById('animal-select').addEventListener('change', onAnimalSelectChange);
    document.getElementById('btn-add-animal').addEventListener('click', function () { openModal('addAnimal'); });
    document.getElementById('btn-add-photo').addEventListener('click', triggerPhotoUpload);
    document.getElementById('gallery-add-trigger') && document.getElementById('gallery-add-trigger').addEventListener('click', triggerPhotoUpload);

    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
    document.getElementById('btn-avatar-upload').addEventListener('click', function () { document.getElementById('avatar-input').click(); });
    document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);

    document.getElementById('form-edit-animal').addEventListener('submit', function (e) { e.preventDefault(); saveAnimal(); });
    document.getElementById('form-edit-owner').addEventListener('submit', function (e) { e.preventDefault(); saveOwner(); });
    document.getElementById('form-add-vaccin').addEventListener('submit', function (e) { e.preventDefault(); addVaccine(); });
    document.getElementById('form-add-deworming').addEventListener('submit', function (e) { e.preventDefault(); addDeworming(); });
    document.getElementById('form-add-animal').addEventListener('submit', function (e) { e.preventDefault(); addAnimal(); });

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', function () { closeModal(this.getAttribute('data-close')); });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) {
          this.classList.remove('open');
          this.setAttribute('aria-hidden', 'true');
        }
      });
    });

    document.getElementById('lightbox').addEventListener('click', function (e) {
      if (e.target === this) closeLightbox();
    });
    document.getElementById('lightbox-close').addEventListener('click', function (e) {
      e.stopPropagation();
      closeLightbox();
    });
  }

  // API publique pour les appels depuis le HTML si besoin
  window.app = {
    openModal: openModal,
    closeModal: closeModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
