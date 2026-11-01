/**
 * App'lika — compte, profil et préférences.
 *
 *  - window.applikaPrefs : préférences d'affichage et de notification (local d'abord, synchronisées avec le
 *    compte quand il est connecté). Chargé avant app.js, qui les lit pour formater dates, unités, etc.
 *  - window.applikaAccount : la page « Compte & paramètres » (profil, sécurité, notifications, affichage,
 *    partage, données) et les liens reçus par e-mail (?verify=, ?reset=, ?invite=).
 *
 * Bureau : navigation latérale + panneau. Mobile : liste de sections, chaque section s'ouvre en plein écran.
 */
(function () {
  'use strict';

  var PREFS_KEY = 'vetbook_prefs';
  var LOCAL_PROFILE_KEY = 'vetbook_local_profile';
  var LOCAL_AVATAR_KEY = 'vetbook_user_avatar';
  var PENDING_INVITE_KEY = 'vetbook_pending_invite';

  // ——— Préférences ————————————————————————————————————————————
  var DEFAULT_PREFS = {
    units: { weight: 'kg', height: 'cm' },
    dateFormat: 'fr-short',
    weekStart: 'mon',
    defaultPetLocalId: null,
    notifications: {
      push: true, email: false,
      vaccineLeadDays: 7, dewormingLeadDays: 7, hygieneLeadDays: 7, medicationLeadDays: 7,
      quietHours: { enabled: false, from: '22:00', to: '07:00' }
    },
    accessibility: { textSize: 'normal', reduceMotion: false, highContrast: false }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, patch) {
    var out = clone(base);
    (function walk(dst, src) {
      Object.keys(src || {}).forEach(function (k) {
        if (isObj(src[k]) && isObj(dst[k])) walk(dst[k], src[k]);
        else dst[k] = src[k];
      });
    })(out, patch || {});
    return out;
  }

  var prefs = (function () {
    try { return merge(DEFAULT_PREFS, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (e) { return clone(DEFAULT_PREFS); }
  })();
  var prefListeners = [];
  var syncTimer = null;

  function applyPrefs() {
    var root = document.documentElement;
    root.setAttribute('data-text-size', prefs.accessibility.textSize);
    root.setAttribute('data-reduce-motion', prefs.accessibility.reduceMotion ? 'true' : 'false');
    root.setAttribute('data-contrast', prefs.accessibility.highContrast ? 'high' : 'normal');
  }

  function pushPrefsToServer() {
    var api = window.cloudSync;
    if (!api || !acc || !acc.user) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      api.api('/api/user/profile', { method: 'PATCH', body: JSON.stringify({ preferences: prefs }) }).catch(function () { /* hors ligne : renvoyé au prochain changement */ });
    }, 800);
  }

  function setPrefs(patch, opts) {
    prefs = merge(prefs, patch);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* stockage plein */ }
    applyPrefs();
    prefListeners.forEach(function (cb) { try { cb(prefs); } catch (e) { /* écouteur défaillant */ } });
    document.dispatchEvent(new CustomEvent('applika:prefs', { detail: prefs }));
    if (!opts || !opts.silent) pushPrefsToServer();
  }

  var LB = 2.2046226218;
  var IN = 0.3937007874;
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function fmtNum(v, digits) { return v.toFixed(digits).replace('.', ','); }

  window.applikaPrefs = {
    get: function () { return prefs; },
    set: setPrefs,
    onChange: function (cb) { prefListeners.push(cb); },
    // Poids et taille sont stockés en kg / cm ; l'unité choisie ne change que l'affichage.
    fmtWeight: function (kg, digits) {
      var n = num(kg); if (n === null) return '';
      var d = digits == null ? 1 : digits;
      return prefs.units.weight === 'lb' ? fmtNum(n * LB, d) + ' lb' : fmtNum(n, d).replace(/,0$/, '') + ' kg';
    },
    fmtHeight: function (cm) {
      var n = num(cm); if (n === null) return '';
      return prefs.units.height === 'in' ? fmtNum(n * IN, 1) + ' in' : fmtNum(n, 1).replace(/,0$/, '') + ' cm';
    },
    weightDelta: function (kg) {
      var n = num(kg); if (n === null) return '';
      var v = prefs.units.weight === 'lb' ? n * LB : n;
      return (v > 0 ? '+' : '−') + fmtNum(Math.abs(v), 1) + (prefs.units.weight === 'lb' ? ' lb' : ' kg');
    },
    formatDate: function (d) {
      var dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return '—';
      var f = prefs.dateFormat;
      if (f === 'iso') return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
      if (f === 'fr-numeric') return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (f === 'fr-long') return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    weekStartsOnSunday: function () { return prefs.weekStart === 'sun'; },
    leadDays: function (type) { var v = prefs.notifications[type + 'LeadDays']; return v || 7; },
    inQuietHours: function (now) {
      var q = prefs.notifications.quietHours;
      if (!q || !q.enabled) return false;
      function mins(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
      var from = mins(q.from), to = mins(q.to);
      if (from == null || to == null || from === to) return false;
      var d = now || new Date(); var cur = d.getHours() * 60 + d.getMinutes();
      return from < to ? cur >= from && cur < to : cur >= from || cur < to;
    }
  };
  applyPrefs();

  // ——— Outils ————————————————————————————————————————————————
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function ctx() { return (window.app && window.app._ctx) || null; }
  function toast(msg, type) { var c = ctx(); if (c) c.showToast(msg, type || 'info'); }
  function cs() { return window.cloudSync; }
  function configured() { return !!(cs() && cs().isConfigured()); }

  var ICONS = {
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    camera: '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
    link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
    laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15"/>',
    paw: '<path d="M12 21c-1.5 0-3-.5-4-1.5C6 18 5.5 16 6 14c.5-2 2-4 4-5s4-1 5.5 0 2.5 3 2.5 5-.5 4-2 5.5S13.5 21 12 21z"/><circle cx="8" cy="7" r="1.5"/><circle cx="16" cy="7" r="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>'
  };
  function icon(name, size) {
    var s = size || 20;
    return '<svg class="icon" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function ago(iso) {
    if (!iso) return '';
    var s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 45) return 'à l’instant';
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    if (s < 86400 * 30) return 'il y a ' + Math.round(s / 86400) + ' j';
    return 'le ' + window.applikaPrefs.formatDate(iso);
  }
  function inDays(iso) {
    var d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    return d <= 0 ? 'expire aujourd’hui' : 'expire dans ' + d + ' j';
  }
  function fmtBytes(b) {
    if (b == null) return '—';
    if (b < 1024) return b + ' o';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' Ko';
    if (b < 1073741824) return (b / 1048576).toFixed(1).replace('.', ',') + ' Mo';
    return (b / 1073741824).toFixed(2).replace('.', ',') + ' Go';
  }

  function strength(pw) {
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length < 8) return { level: 0, label: pw ? 'Trop court' : '' };
    return { level: Math.max(1, Math.min(4, score)), label: ['', 'Faible', 'Correct', 'Bon', 'Excellent'][Math.max(1, Math.min(4, score))] };
  }

  // ——— Dialogues (bureau : centré, mobile : feuille du bas) ————————————
  var dialogState = null;
  function closeDialog() {
    if (!dialogState) return;
    var d = dialogState; dialogState = null;
    d.el.remove();
    document.removeEventListener('keydown', d.onKey, true);
    if (d.returnFocus && document.body.contains(d.returnFocus)) d.returnFocus.focus({ preventScroll: true });
  }
  function openDialog(html, opts) {
    closeDialog();
    var el = document.createElement('div');
    el.className = 'accd';
    el.innerHTML = '<div class="accd__backdrop" data-dlg-close></div><div class="accd__panel" role="dialog" aria-modal="true" aria-labelledby="accd-title"><span class="accd__grab" aria-hidden="true"></span>' + html + '</div>';
    document.body.appendChild(el);
    var returnFocus = document.activeElement;
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button, input, select, textarea, a[href]', el).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    dialogState = { el: el, onKey: onKey, returnFocus: returnFocus };
    el.addEventListener('click', function (e) { if (e.target.closest('[data-dlg-close]')) closeDialog(); });
    var first = $((opts && opts.focus) || 'input, select, button:not([data-dlg-close])', el);
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 30);
    return el;
  }
  function confirmDialog(o) {
    return new Promise(function (resolve) {
      var el = openDialog('<h2 class="accd__title" id="accd-title">' + esc(o.title) + '</h2><p class="accd__text">' + o.text + '</p>' + (o.extra || '') +
        '<div class="accd__actions"><button type="button" class="acc-btn" data-dlg-close>' + esc(o.cancel || 'Annuler') + '</button><button type="button" class="acc-btn ' + (o.danger ? 'acc-btn--danger' : 'acc-btn--primary') + '" data-dlg-ok>' + esc(o.ok || 'Confirmer') + '</button></div>',
        { focus: o.focus || '[data-dlg-ok]' });
      var settled = false;
      function done(v) { if (settled) return; settled = true; resolve(v); }
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-dlg-close]')) done(null);
        if (e.target.closest('[data-dlg-ok]')) { var vals = {}; $$('input, select', el).forEach(function (i) { vals[i.name || i.id] = i.type === 'checkbox' ? i.checked : i.value; }); done(vals); }
      });
      var obs = new MutationObserver(function () { if (!document.body.contains(el)) { obs.disconnect(); done(null); } });
      obs.observe(document.body, { childList: true });
    });
  }

  // ——— État de la page ——————————————————————————————————————————
  var acc = {
    panel: 'profile',       // section affichée
    mobileOpen: false,      // mobile : section ouverte en plein écran
    user: null,             // profil serveur complet
    loading: false,
    sessions: null, links: null, household: null, storage: null,
    authTab: 'login',
    justCreatedLink: null,
    avatarBusy: false
  };
  var root = null;

  function signedIn() { return !!acc.user; }
  function localProfile() { try { return JSON.parse(localStorage.getItem(LOCAL_PROFILE_KEY) || '{}'); } catch (e) { return {}; } }
  function saveLocalProfile(p) { try { localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(p)); } catch (e) { /* stockage plein */ } }
  function localAvatar() { try { return localStorage.getItem(LOCAL_AVATAR_KEY) || ''; } catch (e) { return ''; } }

  // Identité affichée : le compte connecté d'abord, sinon le profil local.
  function identity() {
    var o = ctx() ? ctx().getOwner() : {};
    var lp = localProfile();
    if (acc.user) {
      return { firstName: acc.user.firstName || '', lastName: acc.user.lastName || '', email: acc.user.email, phone: acc.user.phone || o.phone || '',
        avatar: acc.user.picture || '', clinic: o.clinic || '', address: o.address || '', emergency: acc.user.emergencyContact || {} };
    }
    var parts = String(o.name || '').trim().split(/\s+/);
    return { firstName: lp.firstName != null ? lp.firstName : (parts[0] || ''), lastName: lp.lastName != null ? lp.lastName : parts.slice(1).join(' '),
      email: o.email || '', phone: o.phone || '', avatar: localAvatar(), clinic: o.clinic || '', address: o.address || '', emergency: lp.emergencyContact || {} };
  }
  function fullName(id) { return [id.firstName, id.lastName].filter(Boolean).join(' ').trim(); }
  function initials(id) { var s = ((id.firstName || '').charAt(0) + (id.lastName || '').charAt(0)) || (id.email || '?').charAt(0); return s.toUpperCase(); }
  function avatarHtml(id, size) {
    var cls = 'acc-avatar' + (size ? ' acc-avatar--' + size : '');
    return id.avatar ? '<span class="' + cls + '"><img src="' + esc(id.avatar) + '" alt="" referrerpolicy="no-referrer"></span>' : '<span class="' + cls + '" aria-hidden="true">' + esc(initials(id)) + '</span>';
  }

  function completeness() {
    var id = identity();
    var items = [
      { label: 'Prénom', ok: !!id.firstName },
      { label: 'Nom', ok: !!id.lastName },
      { label: 'Téléphone', ok: !!id.phone },
      { label: 'Photo de profil', ok: !!id.avatar },
      { label: 'Clinique référente', ok: !!id.clinic },
      { label: 'Personne de confiance', ok: !!(id.emergency && id.emergency.name && id.emergency.phone) }
    ];
    if (acc.user) items.push({ label: 'Adresse e-mail vérifiée', ok: !!acc.user.emailVerified });
    return { items: items, done: items.filter(function (i) { return i.ok; }).length };
  }

  // ——— Sections ——————————————————————————————————————————————
  var SECTIONS = [
    { key: 'profile', label: 'Profil', icon: 'user' },
    { key: 'security', label: 'Compte et sécurité', icon: 'shield' },
    { key: 'notifications', label: 'Notifications', icon: 'bell' },
    { key: 'display', label: 'Affichage et accessibilité', icon: 'eye' },
    { key: 'plan', label: 'Formule et abonnement', icon: 'star' },
    { key: 'sharing', label: 'Partage', icon: 'share' },
    { key: 'data', label: 'Données et confidentialité', icon: 'database' },
    { key: 'help', label: 'Aide', icon: 'help' }
  ];

  function sectionHint(key) {
    var id = identity();
    if (key === 'profile') { var c = completeness(); return c.done + ' sur ' + c.items.length + ' renseignés'; }
    if (key === 'security') return acc.user ? (acc.user.emailVerified ? 'Adresse vérifiée' : 'Adresse à vérifier') : 'Non connecté';
    if (key === 'notifications') { var n = prefs.notifications; return [n.push ? 'Push' : null, n.email ? 'E-mail' : null].filter(Boolean).join(' + ') || 'Désactivées'; }
    if (key === 'display') return (document.documentElement.getAttribute('data-theme') === 'dark' ? 'Sombre' : 'Clair') + ' · ' + { normal: 'texte normal', large: 'texte grand', xlarge: 'texte très grand' }[prefs.accessibility.textSize];
    if (key === 'sharing') return acc.user ? (acc.links ? acc.links.filter(function (l) { return l.active; }).length + ' lien(s) actif(s)' : 'Vétérinaire et foyer') : 'Connexion requise';
    if (key === 'data') { var ls = configured() && cs().lastSyncAt ? cs().lastSyncAt() : null; return acc.user ? (ls ? 'Synchronisé ' + ago(ls) : 'Sauvegarde serveur active') : 'Sauvegarde locale'; }
    if (key === 'plan') { var e = window.applikaPlan && window.applikaPlan.entitlements(); return e && e.plan ? planName(e.plan) : 'Gratuit'; }
    if (key === 'help') return 'Centre d’aide, introduction';
    return id.email;
  }

  function renderShell() {
    var id = identity();
    var nav = SECTIONS.map(function (s) {
      return '<button type="button" class="acc-nav__item' + (acc.panel === s.key ? ' is-active' : '') + '" data-act="open" data-panel="' + s.key + '"' + (acc.panel === s.key ? ' aria-current="page"' : '') + '>' +
        '<span class="acc-nav__icon">' + icon(s.icon, 20) + '</span><span class="acc-nav__text"><b>' + esc(s.label) + '</b><small>' + esc(sectionHint(s.key)) + '</small></span><span class="acc-nav__chev">' + icon('chevron', 18) + '</span></button>';
    }).join('');
    var current = SECTIONS.filter(function (s) { return s.key === acc.panel; })[0];
    root.className = 'acc' + (acc.mobileOpen ? ' is-open' : '');
    root.innerHTML =
      '<header class="acc-top">' +
        '<div class="acc-me">' + avatarHtml(id, 'lg') + '<div class="acc-me__text"><h1>' + esc(fullName(id) || 'Mon compte') + '</h1><p>' + esc(id.email || (acc.user ? '' : 'Non connecté · données sur cet appareil')) + '</p></div></div>' +
      '</header>' +
      '<div class="acc-body">' +
        '<nav class="acc-nav" aria-label="Sections du compte">' + nav + '</nav>' +
        '<section class="acc-panel" aria-labelledby="acc-panel-title">' +
          '<div class="acc-panel__bar"><button type="button" class="acc-back" data-act="back" aria-label="Retour aux réglages">' + icon('back', 20) + '<span>Réglages</span></button><h2 id="acc-panel-title">' + esc(current.label) + '</h2></div>' +
          '<div class="acc-panel__body" id="acc-panel-body"></div>' +
        '</section>' +
      '</div>';
    renderPanel();
  }

  function renderPanel() {
    var body = $('#acc-panel-body', root);
    if (!body) return;
    var fn = { profile: panelProfile, security: panelSecurity, notifications: panelNotifications, display: panelDisplay, plan: panelPlan, sharing: panelSharing, data: panelData, help: panelHelp }[acc.panel];
    var draft = {}, activeId = document.activeElement && document.activeElement.id;
    if (acc.panel === 'plan') $$('[id^="sub-"]', body).forEach(function (el) { if ('value' in el) draft[el.id] = el.value; });
    body.innerHTML = fn();
    Object.keys(draft).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = draft[id]; });
    if (draft[activeId] !== undefined) { var focused = document.getElementById(activeId); if (focused) focused.focus({ preventScroll: true }); }
    bindMeters(body);
    afterPanel();
  }

  // ——— Panneau : profil ————————————————————————————————————————
  function panelProfile() {
    var id = identity();
    var c = completeness();
    var pct = Math.round(c.done / c.items.length * 100);
    var missing = c.items.filter(function (i) { return !i.ok; });
    var em = id.emergency || {};
    var verify = acc.user ? (acc.user.emailVerified ? '<span class="acc-badge acc-badge--ok">' + icon('check', 14) + ' Adresse vérifiée</span>' : '<span class="acc-badge acc-badge--warn">Adresse non vérifiée</span> <button type="button" class="acc-link" data-act="resend-verify">Renvoyer l’e-mail</button>') : '';
    var pets = (ctx() ? ctx().getState().animals : []).map(function (a) {
      return '<button type="button" class="acc-pet" data-act="open-pet" data-pet="' + a.id + '">' + icon('paw', 18) + '<span>' + esc(a.animal.name || 'Sans nom') + '</span><small>' + esc(a.animal.race || a.animal.species || '') + '</small>' + icon('chevron', 16) + '</button>';
    }).join('');
    return '' +
      '<div class="acc-card acc-card--identity">' +
        '<div class="acc-avatar-edit">' + avatarHtml(id, 'xl') +
          '<div class="acc-avatar-edit__actions"><button type="button" class="acc-btn" data-act="avatar-pick"' + (acc.avatarBusy ? ' disabled' : '') + '>' + icon('camera', 18) + (id.avatar ? 'Changer la photo' : 'Ajouter une photo') + '</button>' +
          (id.avatar && (!acc.user || acc.user.hasCustomAvatar) ? '<button type="button" class="acc-btn acc-btn--quiet" data-act="avatar-remove">Retirer</button>' : '') +
          '<p class="acc-hint">JPEG, PNG ou WebP. Recadrée automatiquement en carré.</p></div>' +
          '<input type="file" id="acc-avatar-input" accept="image/jpeg,image/png,image/webp" hidden>' +
        '</div>' +
        (acc.user ? '<p class="acc-line">' + icon('mail', 16) + '<span>' + esc(acc.user.email) + '</span> ' + verify + '</p>' : '<p class="acc-hint">Vous n’êtes pas connecté : ces informations restent sur cet appareil. <button type="button" class="acc-link" data-act="goto" data-panel="security">Se connecter ou créer un compte</button></p>') +
      '</div>' +
      '<div class="acc-card acc-progress"><div class="acc-progress__top"><b>Profil complété à ' + pct + ' %</b><span>' + c.done + ' sur ' + c.items.length + '</span></div>' +
        '<div class="acc-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + c.items.length + '" aria-valuenow="' + c.done + '" aria-label="Profil complété à ' + pct + ' pour cent"><span style="width:' + pct + '%"></span></div>' +
        (missing.length ? '<div class="acc-chips">' + missing.map(function (m) { return '<span class="acc-chip">' + esc(m.label) + '</span>'; }).join('') + '</div>' : '<p class="acc-hint">Tout est renseigné, merci !</p>') + '</div>' +
      '<form class="acc-card acc-form" data-form="profile" novalidate>' +
        '<h3>Identité</h3>' +
        '<div class="acc-grid">' +
          field('pf-first', 'Prénom', 'text', id.firstName, { autocomplete: 'given-name', required: true }) +
          field('pf-last', 'Nom', 'text', id.lastName, { autocomplete: 'family-name' }) +
        '</div>' +
        field('pf-phone', 'Téléphone', 'tel', id.phone, { autocomplete: 'tel', placeholder: '06 12 34 56 78', inputmode: 'tel' }) +
        '<h3>Coordonnées</h3>' +
        field('pf-clinic', 'Clinique vétérinaire référente', 'text', id.clinic, { placeholder: 'Nom de votre clinique' }) +
        field('pf-address', 'Adresse', 'text', id.address, { autocomplete: 'street-address', placeholder: 'Numéro, rue, code postal, ville' }) +
        '<h3>Personne de confiance</h3><p class="acc-hint">Quelqu’un à prévenir si vous n’êtes pas joignable (gardiennage, urgence).</p>' +
        '<div class="acc-grid">' + field('pf-em-name', 'Nom', 'text', em.name || '', { autocomplete: 'off' }) + field('pf-em-relation', 'Lien', 'text', em.relation || '', { placeholder: 'Conjoint, voisin, ami…' }) + '</div>' +
        '<div class="acc-grid">' + field('pf-em-phone', 'Téléphone', 'tel', em.phone || '', { inputmode: 'tel' }) + field('pf-em-email', 'E-mail', 'email', em.email || '', { autocomplete: 'off' }) + '</div>' +
        '<p class="acc-status" id="pf-status" role="status" aria-live="polite" hidden></p>' +
        '<div class="acc-actions"><button type="submit" class="acc-btn acc-btn--primary">Enregistrer</button></div>' +
      '</form>' +
      '<div class="acc-card"><div class="acc-card__head"><h3>Mes compagnons</h3><button type="button" class="acc-btn acc-btn--quiet" data-act="add-pet">' + icon('plus', 16) + 'Ajouter</button></div>' +
        (pets ? '<div class="acc-pets">' + pets + '</div>' : '<p class="acc-hint">Aucun compagnon pour l’instant.</p>') + '</div>';
  }

  function field(id, label, type, value, o) {
    o = o || {};
    return '<div class="acc-field"><label for="' + id + '">' + esc(label) + (o.required ? ' <abbr title="obligatoire">*</abbr>' : '') + '</label><input id="' + id + '" name="' + id + '" type="' + type + '" value="' + esc(value) + '"' +
      (o.autocomplete ? ' autocomplete="' + o.autocomplete + '"' : '') + (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + (o.required ? ' required' : '') + (o.minlength ? ' minlength="' + o.minlength + '"' : '') + '></div>';
  }
  function passwordField(id, label, autocomplete, withMeter) {
    return '<div class="acc-field"><label for="' + id + '">' + esc(label) + '</label><div class="acc-pw"><input id="' + id + '" name="' + id + '" type="password" autocomplete="' + autocomplete + '" minlength="8" required><button type="button" class="acc-pw__toggle" data-act="toggle-pw" data-target="' + id + '" aria-label="Afficher le mot de passe" aria-pressed="false">' + icon('eye', 18) + '</button></div>' +
      (withMeter ? '<div class="acc-meter" data-meter-for="' + id + '" aria-live="polite"><span class="acc-meter__bar"><i></i><i></i><i></i><i></i></span><small></small></div>' : '') + '</div>';
  }

  // ——— Panneau : compte et sécurité —————————————————————————————
  function authCard() {
    var login = acc.authTab === 'login';
    return '<div class="acc-card acc-auth">' +
      '<div class="acc-tabs" role="tablist" aria-label="Connexion ou inscription"><button type="button" role="tab" class="acc-tabs__tab' + (login ? ' is-on' : '') + '" aria-selected="' + login + '" data-act="auth-tab" data-tab="login">Se connecter</button><button type="button" role="tab" class="acc-tabs__tab' + (!login ? ' is-on' : '') + '" aria-selected="' + !login + '" data-act="auth-tab" data-tab="register">Créer un compte</button></div>' +
      '<p class="acc-hint">Un compte sauvegarde vos carnets sur le serveur, les retrouve sur tous vos appareils et permet de les partager.</p>' +
      '<div class="acc-google" id="acc-google" hidden></div><p class="acc-or" id="acc-or" hidden>ou avec votre e-mail</p>' +
      (login ?
        '<form class="acc-form" data-form="login" novalidate>' + field('lg-email', 'Adresse e-mail', 'email', '', { autocomplete: 'email', required: true }) + passwordField('lg-pass', 'Mot de passe', 'current-password', false) +
        '<p class="acc-line acc-line--end"><button type="button" class="acc-link" data-act="forgot">Mot de passe oublié ?</button></p>' +
        '<p class="acc-status" id="auth-status" role="status" aria-live="polite" hidden></p><div class="acc-actions"><button type="submit" class="acc-btn acc-btn--primary acc-btn--block">Se connecter</button></div></form>' :
        '<form class="acc-form" data-form="register" novalidate><div class="acc-grid">' + field('rg-first', 'Prénom', 'text', '', { autocomplete: 'given-name', required: true }) + field('rg-last', 'Nom', 'text', '', { autocomplete: 'family-name' }) + '</div>' +
        field('rg-email', 'Adresse e-mail', 'email', '', { autocomplete: 'email', required: true }) + passwordField('rg-pass', 'Mot de passe', 'new-password', true) +
        '<label class="acc-check"><input type="checkbox" id="rg-terms" name="rg-terms"><span>J’accepte les <a href="legal.html#cgu" target="_blank" rel="noopener">conditions d’utilisation</a> et la <a href="legal.html#confidentialite" target="_blank" rel="noopener">politique de confidentialité</a>.</span></label>' +
        '<p class="acc-status" id="auth-status" role="status" aria-live="polite" hidden></p><div class="acc-actions"><button type="submit" class="acc-btn acc-btn--primary acc-btn--block">Créer mon compte</button></div></form>') +
      '</div>';
  }

  function panelSecurity() {
    if (!acc.user) return authCard() + '<div class="acc-card"><h3>Sans compte</h3><p class="acc-hint">Vos carnets restent enregistrés sur cet appareil et fonctionnent hors ligne. Pensez à exporter une sauvegarde depuis « Données et confidentialité ».</p></div>';
    var u = acc.user;
    var pending = u.pendingEmail ? '<div class="acc-banner acc-banner--info">' + icon('mail', 18) + '<span>Changement en attente : confirmez <b>' + esc(u.pendingEmail) + '</b> avec le lien reçu par e-mail. <button type="button" class="acc-link" data-act="resend-verify">Renvoyer</button></span></div>' : '';
    return pending +
      '<div class="acc-card"><div class="acc-card__head"><h3>Adresse e-mail</h3>' + (u.emailVerified ? '<span class="acc-badge acc-badge--ok">' + icon('check', 14) + ' Vérifiée</span>' : '<span class="acc-badge acc-badge--warn">À vérifier</span>') + '</div>' +
        '<p class="acc-line">' + icon('mail', 16) + '<span>' + esc(u.email) + '</span></p>' +
        (u.emailVerified ? '' : '<p class="acc-hint">Confirmez votre adresse pour sécuriser le compte et recevoir les rappels par e-mail. <button type="button" class="acc-link" data-act="resend-verify">Renvoyer l’e-mail de confirmation</button></p>') +
        (u.hasPassword ? '<details class="acc-more"><summary>Changer l’adresse e-mail</summary><form class="acc-form" data-form="change-email" novalidate>' + field('ce-new', 'Nouvelle adresse', 'email', '', { autocomplete: 'email', required: true }) + passwordField('ce-pass', 'Mot de passe actuel', 'current-password', false) +
          '<p class="acc-status" id="ce-status" role="status" aria-live="polite" hidden></p><div class="acc-actions"><button type="submit" class="acc-btn acc-btn--primary">Envoyer le lien de confirmation</button></div></form></details>' :
          '<p class="acc-hint">Ce compte utilise la connexion Google : l’adresse est celle de votre compte Google.</p>') + '</div>' +
      '<div class="acc-card"><div class="acc-card__head"><h3>Mot de passe</h3></div>' +
        '<details class="acc-more"' + (u.hasPassword ? '' : ' open') + '><summary>' + (u.hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe') + '</summary><form class="acc-form" data-form="change-password" novalidate>' +
          (u.hasPassword ? passwordField('cp-current', 'Mot de passe actuel', 'current-password', false) : '') + passwordField('cp-new', 'Nouveau mot de passe', 'new-password', true) + passwordField('cp-confirm', 'Confirmer le nouveau mot de passe', 'new-password', false) +
          '<p class="acc-hint">Vos autres appareils seront déconnectés.</p><p class="acc-status" id="cp-status" role="status" aria-live="polite" hidden></p><div class="acc-actions"><button type="submit" class="acc-btn acc-btn--primary">Enregistrer le mot de passe</button></div></form></details></div>' +
      '<div class="acc-card"><div class="acc-card__head"><h3>Appareils connectés</h3><button type="button" class="acc-btn acc-btn--quiet" data-act="revoke-others">Me déconnecter partout</button></div><div id="acc-sessions">' + (acc.sessions ? sessionsHtml() : '<p class="acc-hint">Chargement…</p>') + '</div></div>' +
      '<div class="acc-card"><div class="acc-card__head"><h3>Session</h3></div><div class="acc-actions acc-actions--start"><button type="button" class="acc-btn" data-act="signout">Se déconnecter de cet appareil</button></div></div>' +
      '<div class="acc-card acc-card--danger"><h3>Supprimer mon compte</h3><p class="acc-hint">Efface définitivement votre compte, vos carnets, vos photos, vos liens de partage et votre foyer sur le serveur. Les données enregistrées sur cet appareil peuvent être conservées. Cette action est irréversible.</p><div class="acc-actions acc-actions--start"><button type="button" class="acc-btn acc-btn--danger" data-act="delete-account">' + icon('trash', 18) + 'Supprimer mon compte</button></div></div>';
  }

  function sessionsHtml() {
    if (!acc.sessions.length) return '<p class="acc-hint">Aucun autre appareil.</p>';
    return '<ul class="acc-list">' + acc.sessions.map(function (s) {
      var mobile = /Android|iOS/.test(s.label);
      return '<li class="acc-row"><span class="acc-row__icon">' + icon(mobile ? 'phone' : 'laptop', 20) + '</span><span class="acc-row__text"><b>' + esc(s.label) + (s.current ? ' <span class="acc-badge acc-badge--ok">Cet appareil</span>' : '') + '</b><small>' + (s.lastSeenAt ? 'Actif ' + esc(ago(s.lastSeenAt)) : '') + (s.ip ? ' · ' + esc(s.ip) : '') + '</small></span>' +
        (s.current || s.legacy ? '' : '<button type="button" class="acc-btn acc-btn--quiet" data-act="revoke-session" data-id="' + esc(s.id) + '">Déconnecter</button>') + '</li>';
    }).join('') + '</ul>';
  }

  // ——— Panneau : notifications ————————————————————————————————
  function leadSelect(key, label) {
    var opts = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90];
    var cur = prefs.notifications[key];
    return '<div class="acc-field acc-field--inline"><label for="ld-' + key + '">' + esc(label) + '</label><select id="ld-' + key + '" data-pref="notifications.' + key + '" data-type="int">' + opts.map(function (d) { return '<option value="' + d + '"' + (d === cur ? ' selected' : '') + '>' + (d === 1 ? '1 jour avant' : d + ' jours avant') + '</option>'; }).join('') + '</select></div>';
  }
  function toggleRow(id, title, desc, checked, attrs) {
    return '<label class="acc-toggle" for="' + id + '"><span class="acc-toggle__text"><b>' + esc(title) + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</span><input type="checkbox" id="' + id + '" class="acc-switch" role="switch"' + (checked ? ' checked' : '') + (attrs || '') + '><span class="acc-switch__ui" aria-hidden="true"></span></label>';
  }
  function panelNotifications() {
    var n = prefs.notifications;
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    var permTxt = perm === 'granted' ? 'Autorisées sur ce navigateur' : perm === 'denied' ? 'Bloquées par le navigateur : à réactiver dans ses réglages' : perm === 'unsupported' ? 'Non prises en charge par ce navigateur' : 'Pas encore autorisées';
    var eventsOn = localStorage.getItem('vetbook_dog_events_reminder_enabled') !== 'false';
    return '' +
      '<div class="acc-card"><h3>Canaux</h3>' +
        toggleRow('nt-push', 'Notifications push', esc(permTxt) + (signedIn() ? '' : '. <b>Une connexion est nécessaire pour les recevoir application fermée.</b>'), n.push, ' data-pref="notifications.push" data-type="bool" data-feature="push_reminders"') +
        '<div class="acc-actions acc-actions--start"><button type="button" class="acc-btn" data-act="push-settings" data-feature="push_reminders">' + icon('bell', 18) + 'Autoriser ce navigateur</button></div>' +
        toggleRow('nt-email', 'Rappels par e-mail', signedIn() ? 'Envoyés à ' + esc(acc.user.email) + (acc.user.emailVerified ? '' : ' (adresse non vérifiée)') : 'Nécessite un compte connecté', n.email, ' data-pref="notifications.email" data-type="bool" data-feature="email_reminders"' + (signedIn() ? '' : ' disabled')) +
      '</div>' +
      '<div class="acc-card"><h3>Délais de rappel</h3><p class="acc-hint">Combien de temps à l’avance vous prévenir avant chaque échéance. Un soin en retard est toujours signalé.</p>' +
        leadSelect('vaccineLeadDays', 'Vaccins') + leadSelect('dewormingLeadDays', 'Déparasitage') + leadSelect('hygieneLeadDays', 'Hygiène et soins') + leadSelect('medicationLeadDays', 'Fin de traitement') + '</div>' +
      '<div class="acc-card"><h3>Heures calmes</h3>' +
        toggleRow('nt-quiet', 'Ne pas envoyer de notification la nuit', 'Les rappels attendent la fin de la plage.', n.quietHours.enabled, ' data-pref="notifications.quietHours.enabled" data-type="bool"') +
        '<div class="acc-grid"><div class="acc-field"><label for="qh-from">De</label><input type="time" id="qh-from" value="' + esc(n.quietHours.from) + '" data-pref="notifications.quietHours.from" data-type="str"></div><div class="acc-field"><label for="qh-to">À</label><input type="time" id="qh-to" value="' + esc(n.quietHours.to) + '" data-pref="notifications.quietHours.to" data-type="str"></div></div></div>' +
      '<div class="acc-card"><h3>Autres rappels</h3>' + toggleRow('nt-events', 'Événements canins du mois', 'Un rappel groupé le 1er de chaque mois.', eventsOn, ' data-act-change="events-toggle"') +
        '<p class="acc-hint">Les rappels de chaque animal (vaccins, hygiène, anniversaire, résumé mensuel) se règlent dans l’onglet « Rappels » de sa fiche.</p></div>';
  }

  // ——— Panneau : affichage et accessibilité —————————————————————
  function segmented(name, current, options, label) {
    return '<div class="acc-field"><span class="acc-field__label" id="seg-' + name + '">' + esc(label) + '</span><div class="acc-seg" role="radiogroup" aria-labelledby="seg-' + name + '">' + options.map(function (o) {
      return '<button type="button" role="radio" class="acc-seg__opt' + (o[0] === current ? ' is-on' : '') + '" aria-checked="' + (o[0] === current) + '" data-act="seg" data-name="' + name + '" data-value="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
  }
  function themeMode() { try { var t = localStorage.getItem('vetbook_theme'); return t === 'dark' || t === 'light' ? t : 'auto'; } catch (e) { return 'auto'; } }
  function panelDisplay() {
    var now = new Date();
    var fmts = ['fr-short', 'fr-numeric', 'fr-long', 'iso'];
    var pets = ctx() ? ctx().getState().animals : [];
    var saved = prefs.dateFormat;
    return '' +
      '<div class="acc-card"><h3>Apparence</h3>' + segmented('theme', themeMode(), [['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']], 'Thème') +
        segmented('textSize', prefs.accessibility.textSize, [['normal', 'Normal'], ['large', 'Grand'], ['xlarge', 'Très grand']], 'Taille de l’affichage') + '</div>' +
      '<div class="acc-card"><h3>Accessibilité</h3>' + toggleRow('ax-motion', 'Réduire les animations', 'Supprime les transitions et les mouvements.', prefs.accessibility.reduceMotion, ' data-pref="accessibility.reduceMotion" data-type="bool"') +
        toggleRow('ax-contrast', 'Contraste renforcé', 'Textes plus foncés et contours plus marqués.', prefs.accessibility.highContrast, ' data-pref="accessibility.highContrast" data-type="bool"') + '</div>' +
      '<div class="acc-card"><h3>Formats</h3>' +
        '<div class="acc-field"><label for="df">Format de date</label><select id="df" data-pref="dateFormat" data-type="str">' + fmts.map(function (f) { var save = prefs.dateFormat; prefs.dateFormat = f; var s = window.applikaPrefs.formatDate(now); prefs.dateFormat = save; return '<option value="' + f + '"' + (f === saved ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>' +
        segmented('weekStart', prefs.weekStart, [['mon', 'Lundi'], ['sun', 'Dimanche']], 'Premier jour de la semaine') +
        segmented('weightUnit', prefs.units.weight, [['kg', 'Kilogrammes'], ['lb', 'Livres']], 'Unité de poids') +
        segmented('heightUnit', prefs.units.height, [['cm', 'Centimètres'], ['in', 'Pouces']], 'Unité de taille') +
        '<p class="acc-hint">Les unités changent l’affichage. La saisie des pesées et des tailles se fait toujours en kg et en cm.</p></div>' +
      '<div class="acc-card"><h3>Au lancement</h3><div class="acc-field"><label for="dp">Animal affiché en premier</label><select id="dp" data-pref="defaultPetLocalId" data-type="pet"><option value=""' + (prefs.defaultPetLocalId == null ? ' selected' : '') + '>Le dernier consulté</option>' +
        pets.map(function (a) { return '<option value="' + a.id + '"' + (Number(prefs.defaultPetLocalId) === a.id ? ' selected' : '') + '>' + esc(a.animal.name || 'Sans nom') + '</option>'; }).join('') + '</select></div>' +
        countryField() +
        '<div class="acc-field"><label for="lang">Langue</label><select id="lang" disabled><option>Français</option></select><small class="acc-hint">L’application est disponible en français uniquement pour l’instant.</small></div></div>';
  }

  // ——— Pays et formule ——————————————————————————————————————
  function plans() { return window.applikaPlan || null; }
  function countries() { var c = plans() && plans().config(); return (c && c.countries) || []; }
  function countryLabel(code) { var f = countries().filter(function (c) { return c.code === code; })[0]; return f ? f.label : code || ''; }
  function countryField() {
    var list = countries();
    if (list.length < 2) return '';
    var cur = plans().country();
    return '<div class="acc-field"><label for="ctry">Pays</label><select id="ctry" data-act-change="country"><option value="">Tous les pays</option>' +
      list.map(function (c) { return '<option value="' + esc(c.code) + '"' + (c.code === cur ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') +
      '</select><small class="acc-hint">Détermine les numéros d’urgence, cliniques, conseils et événements affichés.</small></div>';
  }
  function chooseCountry(o) {
    var list = countries();
    if (list.length < 2) return;
    var cur = plans().country();
    openDialog(
      '<h2 id="accd-title">' + (o && o.first ? 'Où vis-tu ?' : 'Choisir le pays') + '</h2>' +
      '<p class="acc-hint">Nous affichons les numéros d’urgence, cliniques, conseils et événements de ton pays. Tu pourras changer dans Mon compte → Affichage.</p>' +
      '<div class="acc-list">' + list.map(function (c) {
        return '<button type="button" class="acc-row acc-row--btn' + (c.code === cur ? ' is-on' : '') + '" data-pick-country="' + esc(c.code) + '"><span class="acc-row__icon">' + icon('globe', 20) + '</span><span class="acc-row__text"><b>' + esc(c.label) + '</b></span></button>';
      }).join('') + '</div>' +
      '<div class="acc-actions"><button type="button" class="acc-btn" data-dlg-close>' + (o && o.first ? 'Plus tard' : 'Annuler') + '</button></div>'
    ).addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick-country]'); if (!b) return;
      applyCountry(b.getAttribute('data-pick-country'));
      closeDialog();
    });
    if (o && o.first) { try { localStorage.setItem('vetbook_country_asked', '1'); } catch (e) { /* rien */ } }
  }
  function applyCountry(code) {
    plans().setCountry(code);
    setPrefs({ country: code || null });
    refreshNavHints();
    if (acc.panel === 'display') renderPanel();
    toast(code ? 'Pays : ' + countryLabel(code) : 'Tous les pays affichés', 'success');
  }

  // toLocaleString('fr-FR') sépare les milliers par une espace fine insécable (U+202F) : plusieurs polices de
  // l'app n'ont pas ce glyphe et l'affichent comme rien du tout (« 20000 » au lieu de « 20 000 »). On la
  // remplace par une espace normale, visible partout.
  var THIN_SPACES = new RegExp('[' + String.fromCharCode(0x202f, 0x00a0) + ']', 'g');
  function fmtMga(n) { return Number(n || 0).toLocaleString('fr-FR').replace(THIN_SPACES, ' ') + ' Ar'; }
  function planBase(code) { return String(code || 'gratuit').replace(/_annuel$/, ''); }
  function planName(code) {
    var base = planBase(code), c = plans() && plans().config();
    var o = c && c.plans.filter(function (p) { return p.code === base; })[0];
    return o ? o.name : ({ gratuit: 'Gratuit', premium: 'Premium', eleveur: 'Éleveur', cabinet: 'Cabinet' }[base] || base);
  }
  // Sélection éditoriale des avantages par formule (4-5 lignes) — « pourquoi payer » doit se lire d'un
  // coup d'œil sur la carte, pas se déduire d'une liste de quotas. Les chiffres restent branchés sur les
  // données réelles (plans/fonctionnalités) pour ne pas se désynchroniser si un admin les change ; le texte
  // qui les encadre est écrit à la main. Une ligne finissant par « : » s'affiche comme en-tête, pas comme item.
  function planBenefits(code, features, labels) {
    var q = function (k) { var f = features && features[k]; return f && f.quota != null ? f.quota : null; };
    if (code === 'gratuit') return [
      'Carnet de santé complet, rappels dans l’app',
      (q('animals') || 5) + ' animaux',
      'Lien de partage vétérinaire',
      'Sauvegarde et synchronisation cloud',
    ];
    if (code === 'premium') return [
      (q('animals') || 15) + ' animaux',
      'Rappels par SMS et e-mail',
      'Export PDF et calendrier (.ics)',
      'Lien vétérinaire prolongé (' + (q('share_link_days') || 90) + ' jours)',
      'Assistant IA santé et bien-être',
    ];
    if (code === 'eleveur') return [
      'Tout Premium, en plus :',
      'Animaux illimités',
      'Reproduction et déclarations LOMAD',
      'Pedigree et recherche ACYM',
    ];
    return Object.keys(labels).filter(function (k) { return features && features[k] && features[k].enabled; }).slice(0, 4).map(function (k) { return labels[k].label; });
  }
  function planSavings(o) {
    if (!o.monthly || !o.yearly || !o.monthly.priceMga || !o.yearly.priceMga) return null;
    var diff = o.monthly.priceMga * 12 - o.yearly.priceMga;
    var months = Math.round(diff / o.monthly.priceMga);
    return months > 0 ? months : null;
  }
  var planPeriod = 'monthly'; // partagé par toutes les cartes — une seule bascule au-dessus, pas un prix par carte
  // Tableau comparatif unique (remplace les 3 « Voir le détail » dépliés indépendamment, qui cassaient la
  // mise en page) : lignes groupées par catégorie, repliables, un — au lieu d'un cadenas barré pour « non
  // inclus » (moins négatif à lire), en-tête de formules qui reste visible au défilement.
  function comparisonTableHtml(cfgPlans, labels) {
    var cats = [], byCat = {};
    Object.keys(labels).forEach(function (k) {
      var cat = labels[k].category || 'Autres';
      if (!byCat[cat]) { byCat[cat] = []; cats.push(cat); }
      byCat[cat].push(k);
    });
    var cols = '140px repeat(' + cfgPlans.length + ', minmax(96px, 1fr))';
    var header = '<div class="acc-compare__row acc-compare__row--head" style="grid-template-columns:' + cols + '"><div class="acc-compare__cell acc-compare__cell--label"></div>' +
      cfgPlans.map(function (o) { return '<div class="acc-compare__cell"><b>' + esc(o.name) + '</b></div>'; }).join('') + '</div>';
    var body = cats.map(function (cat) {
      var rows = byCat[cat].map(function (k) {
        return '<div class="acc-compare__row" style="grid-template-columns:' + cols + '"><div class="acc-compare__cell acc-compare__cell--label">' + esc(labels[k].label) + '</div>' +
          cfgPlans.map(function (o) {
            var f = o.features && o.features[k];
            var val = !f || !f.enabled ? '<span class="acc-compare__no" aria-label="Non inclus">—</span>'
              : (f.quota != null ? '<b>' + esc(f.quota) + '</b>' : (labels[k].kind === 'quota' ? '<b>Illimité</b>' : '<span class="acc-compare__yes">' + icon('check', 16) + '</span>'));
            return '<div class="acc-compare__cell">' + val + '</div>';
          }).join('') + '</div>';
      }).join('');
      return '<details class="acc-compare__cat"><summary>' + icon('chevron', 16) + '<span>' + esc(cat) + '</span><span class="acc-compare__cat-count">' + byCat[cat].length + '</span></summary><div class="acc-compare__body">' + rows + '</div></details>';
    }).join('');
    return '<div class="acc-card acc-compare-card"><h3>Comparer en détail</h3><div class="acc-compare">' + header + body + '</div></div>';
  }
  // Remplace l'ancien bloc « Ta formule » (qui ne faisait que répéter les limites de la carte au-dessus) par
  // une jauge d'usage réel : ce qui pousse à passer à une formule supérieure doit venir du produit au bon
  // moment (on approche la limite), pas d'une grille de prix relue à froid.
  function usageGaugeHtml(cfg, ent, counts) {
    var labels = cfg.featureLabels || {}, cur = ent && ent.plan ? planBase(ent.plan) : 'gratuit';
    var rows = [];
    if (ent && ent.enforced && ent.features) {
      Object.keys(ent.features).forEach(function (k) {
        var f = ent.features[k];
        if (!f.enabled || f.quota == null || !labels[k] || labels[k].kind !== 'quota') return;
        var used = k === 'animals' ? counts.animals : null;
        rows.push({ label: labels[k].label, used: used, quota: f.quota, pct: used != null ? Math.min(100, Math.round(used / f.quota * 100)) : null });
      });
    }
    var near = rows.filter(function (r) { return r.pct != null && r.pct >= 80; });
    var next = cur === 'gratuit' ? 'Premium' : cur === 'premium' ? 'Éleveur' : null;
    var html = '<div class="acc-card acc-usage"><div class="acc-usage__head"><h3>' + esc(planName(cur)) + '</h3>' + (ent && ent.status === 'essai' ? ' <span class="acc-chip">Essai</span>' : '') + '</div>';
    if (cfg.enforced === false) html += '<p class="acc-hint">Pour l’instant, toutes les fonctionnalités sont ouvertes : les formules seront appliquées prochainement.</p>';
    if (rows.length) html += '<div class="acc-usage__bars">' + rows.map(function (r) {
      return '<div class="acc-usage__bar"><div class="acc-usage__bar-label"><span>' + esc(r.label) + '</span><span>' + (r.used != null ? r.used + ' / ' + esc(r.quota) : 'jusqu’à ' + esc(r.quota)) + '</span></div>' +
        (r.pct != null ? '<div class="acc-usage__track"><div class="acc-usage__fill' + (r.pct >= 80 ? ' is-near' : '') + '" style="width:' + r.pct + '%"></div></div>' : '') + '</div>';
    }).join('') + '</div>';
    if (near.length && next) html += '<p class="acc-usage__nudge">' + icon('sparkle', 14) + 'Tu approches de la limite « ' + esc(near[0].label) + ' » — ' + esc(next) + ' l’enlève.</p>';
    html += '</div>';
    return html;
  }
  var subscriptionAccount = null, subscriptionError = '', subscriptionLoading = false;
  function loadSubscriptionAccount() {
    if (!acc.user || subscriptionLoading) return Promise.resolve();
    subscriptionLoading = true;
    var requestedUser = acc.user.userId;
    return cs().api('/api/me/subscription').then(function (data) { if (acc.user && acc.user.userId === requestedUser) { subscriptionAccount = data; subscriptionError = ''; } })
      .catch(function (error) { subscriptionError = error.message || 'Actualisation impossible.'; })
      .then(function () { subscriptionLoading = false; if (acc.panel === 'plan') renderPanel(); });
  }
  function subscriptionDate(value) { return value ? new Date(value).toLocaleString('fr-FR') : 'Sans échéance'; }
  function subscriptionAccountHtml(cfg) {
    if (!acc.user) return '<div class="acc-card"><h3>Demander une formule</h3><p>Connecte-toi pour envoyer et suivre une demande.</p><button type="button" class="acc-btn acc-btn--primary" data-act="goto" data-panel="security">Se connecter ou créer un compte</button></div>';
    var data = subscriptionAccount, state = data && data.entitlements.subscription;
    var stale = data && data.entitlements.validUntil && Date.parse(data.entitlements.validUntil) <= Date.now();
    var labels = { nouveau: 'Nouvelle', en_cours: 'En cours', traite: 'Traitée', refuse: 'Refusée', annule: 'Annulée', actif: 'Actif', essai: 'Essai', suspendu: 'Suspendu', expire: 'Expiré', termine: 'Terminé', remplace: 'Remplacé' };
    var html = '<div class="acc-card"><h3>Ton abonnement</h3>';
    if (subscriptionError) html += '<p role="alert">' + esc(subscriptionError) + '</p>';
    if (!data) return html + '<p>Chargement du suivi…</p><button class="acc-btn" data-act="subscription-refresh">Actualiser</button></div>';
    if (state) {
      var tracked = state.tracked;
      html += '<p class="acc-hint">Dernière vérification : ' + esc(subscriptionDate(data.entitlements.computedAt)) + '. Dates affichées dans le fuseau de cet appareil.</p><p>Accès effectif : <b>' + esc(stale ? 'À actualiser' : planName(data.entitlements.plan)) + '</b></p>';
      if (tracked) html += '<p>' + esc(planName(tracked.plan_code)) + ' · ' + esc(stale ? 'État à actualiser' : labels[tracked.state] || tracked.state || tracked.status) + '<br>Du ' + esc(subscriptionDate(tracked.started_at)) + ' au ' + esc(subscriptionDate(tracked.ends_at)) + '</p>';
      if (state.effective && state.effective.ends_at) html += '<p>Temps restant : ' + Math.max(0, Math.ceil((Date.parse(state.effective.ends_at) - Date.now()) / 86400000)) + ' jour(s).</p>';
      html += (state.upcoming || []).map(function (r) { return '<p>Activation prévue : <b>' + esc(planName(r.plan_code)) + '</b> le ' + esc(subscriptionDate(r.started_at)) + ', fin : ' + esc(subscriptionDate(r.ends_at)) + '</p>'; }).join('');
    }
    if (tracked && tracked.ends_at && ['actif','expire'].indexOf(tracked.state) >= 0 && !tracked.is_trial) html += '<button class="acc-btn" data-act="subscription-renew" data-plan="' + esc(tracked.plan_code) + '">Demander un renouvellement</button>';
    if (tracked && !tracked.ends_at) html += '<p class="acc-hint">Cet accès est sans échéance : aucun renouvellement n’est nécessaire. Tu peux choisir une autre formule plus haut si besoin.</p>';
    else if (tracked && (tracked.is_trial || tracked.state === 'essai')) html += '<p class="acc-hint">Pour poursuivre après cet essai, choisis une formule plus haut.</p>';
    html += '<p class="acc-hint">Tes données et leur export restent disponibles après une expiration. Chaque demande est examinée manuellement ; suis son état ci-dessous.</p><button class="acc-btn" data-act="subscription-refresh">Actualiser</button></div>';
    html += '<div class="acc-card"><h3>Mes demandes</h3>' + (data.requests.length ? data.requests.map(function (r) { return '<div class="acc-card"><b>' + esc(r.plan_name) + ' · ' + esc(r.period) + '</b><p>' + esc(r.kind === 'renew' ? 'Renouvellement' : 'Souscription / changement') + ' · ' + esc(labels[r.status]) + '</p><p class="acc-hint">Mise à jour : ' + esc(subscriptionDate(r.updated_at || r.created_at)) + '</p>' + (r.desired_start ? '<p>Début souhaité : ' + esc(subscriptionDate(r.desired_start)) + '</p>' : '') + (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + (r.public_reply ? '<p>Réponse : ' + esc(r.public_reply) + '</p>' : '') + (['nouveau','en_cours'].indexOf(r.status) >= 0 ? '<button class="acc-btn" data-act="subscription-cancel" data-id="' + esc(r.id) + '">Annuler la demande</button>' : '') + '</div>'; }).join('') : '<p>Aucune demande.</p>') + '</div>';
    html += '<div class="acc-card"><h3>Notifications</h3>' + (data.notifications.length ? data.notifications.map(function (n) { return '<div class="acc-card"><b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><small>' + esc(subscriptionDate(n.created_at)) + '</small>' + (!n.read_at ? '<button class="acc-btn" data-act="subscription-read" data-id="' + esc(n.id) + '">Marquer comme lue</button>' : '') + '</div>'; }).join('') : '<p>Aucune notification.</p>') + '</div>';
    return html;
  }
  var inbox = { rows: [], unread: 0, offset: 0, onlyUnread: false, checkedAt: null, pushConfigured: false };
  var inboxStream = null, inboxUser = null, inboxTimer = null, inboxRefresh = null, inboxPopover = null, inboxPreviewRows = [], inboxConnected = false, inboxPushActive = false;
  var inboxRequest = 0, inboxPreviewRequest = 0;
  function updateInboxBadge() {
    var anchor = document.getElementById('btn-user-nav');
    var button = document.getElementById('btn-inbox-nav');
    if (!anchor || !acc.user) { if (button) button.remove(); return; }
    if (!button) { button = document.createElement('button'); button.id = 'btn-inbox-nav'; button.type = 'button'; button.className = 'btn-icon'; button.setAttribute('aria-haspopup', 'dialog'); button.addEventListener('click', function () { showInbox(); }); anchor.parentNode.insertBefore(button, anchor); }
    button.setAttribute('aria-label', 'Notifications' + (inbox.unread ? ' : ' + inbox.unread + ' non lues' : ''));
    button.setAttribute('aria-expanded', inboxPopover ? 'true' : 'false');
    button.innerHTML = icon('bell', 22) + (inbox.unread ? '<span class="inbox-count">' + Math.min(inbox.unread, 99) + '</span>' : '');
  }
  function inboxHtml(compact) {
    var count = inbox.unread ? '<span class="acc-inbox__count">' + inbox.unread + '</span>' : '';
    var visibleRows = compact ? inboxPreviewRows : inbox.rows;
    var rows = visibleRows.length ? (compact ? visibleRows.slice(0, 3) : visibleRows).map(function (n) {
      return '<article class="acc-inbox__item' + (!n.read_at ? ' is-unread' : '') + '">' +
        '<span class="acc-inbox__item-icon" aria-hidden="true">' + icon('bell', 18) + '</span><div class="acc-inbox__item-content"><div class="acc-inbox__item-top"><h3>' + esc(n.title) + '</h3>' + (!n.read_at ? '<span class="acc-inbox__dot" aria-hidden="true"></span><span class="sr-only">Non lue</span>' : '') + '</div>' +
        '<p>' + esc(n.body) + '</p><time datetime="' + esc(n.created_at) + '">' + esc(subscriptionDate(n.created_at)) + '</time><div class="acc-inbox__item-actions"><button type="button" data-inbox="open" data-id="' + esc(n.id) + '">Voir le détail ' + icon('chevron', 14) + '</button>' +
        (!n.read_at ? '<button type="button" data-inbox="read" data-id="' + esc(n.id) + '" aria-label="Marquer comme lue : ' + esc(n.title) + '">Marquer comme lue</button>' : '') + '</div></div></article>';
    }).join('') : '<div class="acc-inbox__empty">' + icon('bell', 24) + '<strong>' + (!compact && inbox.onlyUnread ? 'Tout est lu' : 'Aucune notification pour le moment') + '</strong><p>' + (!compact && inbox.onlyUnread ? 'Les nouvelles notifications apparaîtront ici.' : 'Tu retrouveras ici les nouvelles concernant ton compte.') + '</p></div>';
    return '<div class="acc-inbox__header"><div><div class="acc-inbox__eyebrow">Votre activité</div><h2 id="' + (compact ? 'inbox-preview-title' : 'inbox-page-title') + '">Notifications ' + count + '</h2><p class="acc-inbox__sync"><span class="acc-inbox__sync-dot' + (inboxConnected ? ' is-live' : '') + '"></span>' + (inboxConnected ? 'À jour' : 'Actualisation régulière') + '</p></div><button type="button" class="acc-inbox__close" data-inbox="' + (compact ? 'close' : 'back') + '" aria-label="' + (compact ? 'Fermer le menu des notifications' : 'Retour au compte') + '">' + (compact ? '×' : '←') + '</button></div>' +
      (compact ? '<div class="acc-inbox__preview-label">Les plus récentes</div>' : '') +
      (compact ? '' : '<div class="acc-inbox__toolbar"><div class="acc-inbox__tabs" role="group" aria-label="Filtrer les notifications"><button type="button" data-inbox="all" aria-pressed="' + (!inbox.onlyUnread) + '" class="' + (!inbox.onlyUnread ? 'is-active' : '') + '">Toutes</button><button type="button" data-inbox="unread" aria-pressed="' + inbox.onlyUnread + '" class="' + (inbox.onlyUnread ? 'is-active' : '') + '">Non lues</button></div><button type="button" class="acc-inbox__read-all" data-inbox="read-all"' + (!inbox.unread ? ' disabled' : '') + '>Tout marquer comme lu</button></div>') +
      '<div class="acc-inbox__list">' + rows + '</div>' +
      (compact ? '<div class="acc-inbox__footer"><button type="button" class="acc-inbox__see-all" data-inbox="page">Voir toutes les notifications ' + icon('chevron', 16) + '</button></div>' : '<div class="acc-inbox__footer"><div class="acc-inbox__pages">' + (inbox.offset || inbox.next != null ? '<button type="button" data-inbox="previous"' + (!inbox.offset ? ' disabled' : '') + ' aria-label="Page précédente">‹</button><span>Page ' + (Math.floor(inbox.offset / 30) + 1) + '</span><button type="button" data-inbox="next"' + (inbox.next == null ? ' disabled' : '') + ' aria-label="Page suivante">›</button>' : '') + '</div>' +
      '<details class="acc-inbox__settings"><summary>' + icon('settings', 16) + ' Notifications sur cet appareil</summary>' + (inbox.pushConfigured ? '<button type="button" class="acc-btn" data-inbox="' + (inboxPushActive ? 'push-off' : 'push') + '">' + (inboxPushActive ? 'Désactiver les alertes sur cet appareil' : 'Activer les alertes sur cet appareil') + '</button>' : '<p>Les alertes hors application ne sont pas disponibles. Les messages restent visibles ici.</p>') + '</details></div>');
  }
  function renderInboxArea(area, compact) {
    if (!area) return;
    var focused = document.activeElement, action = area.contains(focused) && focused.dataset.inbox, id = focused && focused.dataset.id;
    var list = area.querySelector('.acc-inbox__list'), scroll = list ? list.scrollTop : 0;
    var settingsOpen = !!area.querySelector('.acc-inbox__settings[open]');
    area.innerHTML = inboxHtml(compact);
    area.querySelector('.acc-inbox__list').scrollTop = scroll;
    var settings = area.querySelector('.acc-inbox__settings'); if (settings && settingsOpen) settings.open = true;
    if (action) { var target = Array.from(area.querySelectorAll('[data-inbox]')).filter(function (node) { return node.dataset.inbox === action && node.dataset.id === id; })[0]; if (target && !target.disabled) target.focus({ preventScroll: true }); else { var heading = area.querySelector('h2'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); } }
  }
  function renderInboxSurfaces() {
    if (inboxPopover) renderInboxArea(inboxPopover, true);
    var page = document.getElementById('view-notifications');
    if (page && !page.hidden) renderInboxArea(page.querySelector('.acc-inbox-page__panel'), false);
  }
  function loadInbox() {
    if (!acc.user) return Promise.resolve();
    var userId = acc.user.userId, request = ++inboxRequest;
    var offset = inbox.offset, onlyUnread = inbox.onlyUnread;
    return cs().api('/api/me/notifications?offset=' + offset + '&unread=' + (onlyUnread ? '1' : '0')).then(function (data) {
      if (!acc.user || acc.user.userId !== userId || request !== inboxRequest) return;
      inbox = Object.assign({}, inbox, data); updateInboxBadge();
      renderInboxSurfaces();
    }).catch(function () { var page = document.getElementById('view-notifications'); if (request === inboxRequest && page && !page.hidden) toast('Notifications indisponibles. Réessaie dans un instant.', 'error'); });
  }
  function loadInboxPreview() {
    if (!acc.user) return Promise.resolve();
    var userId = acc.user.userId, request = ++inboxPreviewRequest;
    return cs().api('/api/me/notifications?offset=0&unread=0').then(function (data) {
      if (!acc.user || acc.user.userId !== userId || request !== inboxPreviewRequest) return;
      inboxPreviewRows = data.rows;
      inbox.unread = data.unread;
      updateInboxBadge();
      if (inboxPopover) renderInboxArea(inboxPopover, true);
    }).catch(function () { if (request === inboxPreviewRequest && inboxPopover) toast('Notifications indisponibles. Réessaie dans un instant.', 'error'); });
  }
  function closeInbox() {
    if (!inboxPopover) return;
    inboxPopover.remove(); inboxPopover = null;
    document.removeEventListener('pointerdown', closeInboxOutside);
    document.removeEventListener('keydown', closeInboxEscape);
    updateInboxBadge();
  }
  function closeInboxOutside(event) { if (inboxPopover && !inboxPopover.contains(event.target) && !event.target.closest('#btn-inbox-nav')) closeInbox(); }
  function closeInboxEscape(event) { if (event.key === 'Escape') { closeInbox(); document.getElementById('btn-inbox-nav')?.focus(); } }
  function renderInboxPage() {
    closeInbox();
    var page = document.getElementById('view-notifications'); if (!page) return;
    if (!page.dataset.inboxBound) { page.addEventListener('click', handleInboxClick); page.dataset.inboxBound = '1'; }
    page.innerHTML = '<div class="acc-inbox-page"><div class="acc-inbox-page__panel"></div></div>';
    if (!acc.user) { page.querySelector('.acc-inbox-page__panel').innerHTML = '<h1>Notifications</h1><p>Connecte-toi pour consulter tes notifications.</p><button type="button" class="acc-btn" id="inbox-login">Se connecter</button>'; page.querySelector('#inbox-login').onclick = function () { openAccountView(); }; return; }
    renderInboxArea(page.querySelector('.acc-inbox-page__panel'), false);
    loadInbox();
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('/').then(function (registration) { return registration && registration.pushManager.getSubscription(); }).then(function (subscription) { inboxPushActive = !!subscription; renderInboxSurfaces(); }).catch(function () {});
  }
  function showInbox() {
    if (inboxPopover) { closeInbox(); return; }
    var button = document.getElementById('btn-inbox-nav');
    inboxPopover = document.createElement('div'); inboxPopover.className = 'acc-inbox-popover'; inboxPopover.setAttribute('role', 'dialog'); inboxPopover.setAttribute('aria-labelledby', 'inbox-preview-title');
    inboxPopover.style.top = Math.min(window.innerHeight - 80, button.getBoundingClientRect().bottom + 8) + 'px';
    inboxPopover.style.right = Math.max(12, window.innerWidth - button.getBoundingClientRect().right) + 'px';
    document.body.appendChild(inboxPopover);
    inboxPopover.addEventListener('click', handleInboxClick);
    renderInboxArea(inboxPopover, true); updateInboxBadge();
    document.addEventListener('pointerdown', closeInboxOutside); document.addEventListener('keydown', closeInboxEscape);
    inboxPopover.querySelector('[data-inbox="page"]').focus();
    loadInboxPreview();
  }
  function handleInboxClick(event) {
      var button = event.target.closest('[data-inbox]'); if (!button || button.disabled) return;
      var action = button.dataset.inbox, id = button.dataset.id;
      if (action === 'close') { closeInbox(); document.getElementById('btn-inbox-nav')?.focus(); return; }
      if (action === 'page') { closeInbox(); var app = ctx(); if (app && app.showNotifications) app.showNotifications(); return; }
      if (action === 'back') { openAccountView(); return; }
      if (action === 'all' || action === 'unread') { if (inbox.onlyUnread === (action === 'unread')) return; inbox.onlyUnread = action === 'unread'; inbox.offset = 0; loadInbox(); return; }
      if (action === 'next' || action === 'previous') { inbox.offset = action === 'next' ? inbox.next : Math.max(0, inbox.offset - 30); loadInbox(); return; }
      if (action === 'push' || action === 'push-off') { withBusy(button, function () { return configureInboxPush(action === 'push'); }).then(function () { inboxPushActive = action === 'push'; renderInboxSurfaces(); }).catch(function (e) { toast(e.message, 'error'); }); return; }
      var row = (inboxPopover && inboxPopover.contains(button) ? inboxPreviewRows : inbox.rows).filter(function (n) { return n.id === id; })[0];
      withBusy(button, function () { return cs().api('/api/me/notifications/read', { method: 'POST', body: JSON.stringify(action === 'read-all' ? { before: inbox.checkedAt } : { id: id }) }).then(function () {
        if (action === 'open' && row) { closeInbox(); if (row.href === '/?account=plan') { acc.panel = 'plan'; acc.mobileOpen = true; if (ctx()) ctx().showUserProfile(); else render(); } }
        return Promise.all([loadInbox(), loadInboxPreview()]);
      }); }).catch(function (e) { toast(e.message, 'error'); });
  }
  function configureInboxPush(enable) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.reject(new Error('Notifications push indisponibles dans ce navigateur.'));
    return navigator.serviceWorker.ready.then(function (registration) {
      return registration.pushManager.getSubscription().then(function (subscription) {
        if (!enable) { if (!subscription) return; return cs().api('/api/me/notifications/push', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) }).then(function () { return subscription.unsubscribe(); }).then(function () { toast('Notifications désactivées sur cet appareil.', 'success'); }); }
        return Notification.requestPermission().then(function (permission) {
          if (permission !== 'granted') throw new Error('Autorise les notifications dans les réglages du navigateur.');
          var bytes = Uint8Array.from(atob(inbox.vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')), function (c) { return c.charCodeAt(0); });
          return subscription || registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
        }).then(function (sub) { return cs().api('/api/me/notifications/push', { method: 'POST', body: JSON.stringify(sub.toJSON()) }).catch(function (error) { if (!subscription) sub.unsubscribe(); throw error; }); }).then(function () { setPrefs({ notifications: { push: true } }); toast('Notifications activées sur cet appareil.', 'success'); });
      });
    });
  }
  function stopInboxLive() {
    if (inboxStream) inboxStream.close(); inboxStream = null; inboxUser = null; clearInterval(inboxTimer); clearTimeout(inboxRefresh); inboxConnected = false;
    ++inboxRequest; ++inboxPreviewRequest; inboxPreviewRows = [];
    inbox = { rows: [], unread: 0, offset: 0, onlyUnread: false, checkedAt: null, pushConfigured: false }; inboxPushActive = false; var badge = document.getElementById('btn-inbox-nav'); if (badge) badge.remove(); closeInbox();
  }
  function startInboxLive() {
    if (!acc.user || inboxUser === acc.user.userId) return;
    stopInboxLive(); inboxUser = acc.user.userId; loadInbox(); loadInboxPreview();
    function refresh() { clearTimeout(inboxRefresh); inboxRefresh = setTimeout(function () { loadInbox(); loadInboxPreview(); if (plans()) plans().refresh(); if (acc.panel === 'plan') loadSubscriptionAccount(); }, 150); }
    if (window.EventSource) {
      inboxStream = new EventSource('/api/me/events');
      inboxStream.addEventListener('ready', function () { inboxConnected = true; refresh(); });
      inboxStream.addEventListener('change', refresh);
      inboxStream.addEventListener('session-ended', function () { stopInboxLive(); onSignedOut(); });
      inboxStream.onerror = function () { inboxConnected = false; };
    }
    inboxTimer = setInterval(function () { if (!inboxConnected) refresh(); }, 30000);
  }
  window.addEventListener('online', function () { if (acc.user) { loadInbox(); loadInboxPreview(); if (acc.panel === 'plan') loadSubscriptionAccount(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && acc.user) { loadInbox(); loadInboxPreview(); if (acc.panel === 'plan') loadSubscriptionAccount(); } });

  function panelPlan() {
    var P = plans(), cfg = P && P.config();
    if (!cfg || !cfg.plans || !cfg.plans.length) return '<div class="acc-card"><h3>Formules</h3><p class="acc-hint">Les formules ne sont pas disponibles pour le moment. Vérifie ta connexion puis réessaie.</p><div class="acc-actions"><button type="button" class="acc-btn" data-act="plan-refresh">' + icon('refresh', 18) + 'Actualiser</button></div></div>';
    var ent = P.entitlements(), cur = ent && ent.plan ? planBase(ent.plan) : 'gratuit', labels = cfg.featureLabels || {};
    var counts = P.counts();
    var anyYearly = cfg.plans.some(function (o) { return o.yearly; });
    var toggle = anyYearly ? '<div class="acc-plan-toggle" role="group" aria-label="Période">' +
      '<button type="button" class="acc-plan-toggle__opt' + (planPeriod === 'monthly' ? ' is-on' : '') + '" data-act="plan-period" data-period="monthly" aria-pressed="' + (planPeriod === 'monthly') + '">Mensuel</button>' +
      '<button type="button" class="acc-plan-toggle__opt' + (planPeriod === 'yearly' ? ' is-on' : '') + '" data-act="plan-period" data-period="yearly" aria-pressed="' + (planPeriod === 'yearly') + '">Annuel <span class="acc-plan-toggle__badge">2 mois offerts</span></button></div>' : '';
    var cards = '<div class="acc-plans">' + cfg.plans.map(function (o) {
      var isCurrent = o.code === cur, isFeatured = o.code === 'premium';
      var activePrice = planPeriod === 'yearly' && o.yearly ? o.yearly : o.monthly;
      var priceMga = (activePrice && activePrice.priceMga) || 0;
      var savings = planPeriod === 'yearly' ? planSavings(o) : null;
      var price = '<p class="acc-plan__price"><b>' + fmtMga(priceMga) + '</b><span>/ ' + (planPeriod === 'yearly' ? 'an' : 'mois') + '</span></p>' +
        '<p class="acc-plan__savings">' + (savings ? icon('sparkle', 12) + savings + ' mois offerts' : '') + '</p>';
      var cta = isCurrent ? '<button type="button" class="acc-btn acc-plan__cta" disabled>' + icon('check', 16) + 'Ton plan</button>'
        : o.code !== 'gratuit' ? '<button type="button" class="acc-btn acc-btn--primary acc-plan__cta" data-act="plan-subscribe" data-plan="' + esc(o.code) + '">' + (o.trialDays ? 'Essayer ' + esc(o.trialDays) + ' jours' : 'Choisir ' + esc(o.name)) + '</button>' + (o.trialDays ? '<p class="acc-plan__cta-note">Sans engagement</p>' : '') : '';
      var benefits = planBenefits(o.code, o.features, labels);
      var benefitsHtml = '<ul class="acc-plan__benefits">' + benefits.map(function (b) {
        return (/:\s*$/.test(b)) ? '<li class="acc-plan__benefits-lead">' + esc(b) + '</li>' : '<li>' + icon('check', 14) + '<span>' + esc(b) + '</span></li>';
      }).join('') + '</ul>';
      return '<div class="acc-card acc-plan' + (isFeatured ? ' acc-plan--featured' : '') + (isCurrent ? ' is-current' : '') + '">' +
        '<h3 class="acc-plan__title">' + esc(o.name) + (isFeatured ? ' <span class="acc-chip acc-chip--featured">' + icon('sparkle', 12) + 'Recommandée</span>' : '') + (isCurrent ? ' <span class="acc-chip">Ton plan</span>' : '') + '</h3>' +
        '<p class="acc-plan__sub">' + esc(planSubtitle(o.code)) + '</p>' + price +
        '<div class="acc-plan__actions">' + cta + '</div>' + benefitsHtml + '</div>';
    }).join('') + '</div>';
    return usageGaugeHtml(cfg, ent, counts) + toggle + cards + comparisonTableHtml(cfg.plans, labels) + subscriptionAccountHtml(cfg);
  }
  function planSubtitle(code) {
    return { gratuit: 'Pour découvrir App’lika', premium: 'Pour toi et tes animaux', eleveur: 'Pour éleveurs et chenils' }[code] || '';
  }

  // Le bouton d'une carte ouvre une seule fenêtre focalisée (période → paiement → confirmation) au lieu de
  // faire défiler jusqu'à un formulaire générique en bas de page partagé par toutes les formules. Pas de
  // paiement automatisé ici (aucun numéro mobile money par moyen de paiement n'est configuré côté Réglages) :
  // la demande reste examinée manuellement, comme avant — juste un parcours net pour l'envoyer.
  function openSubscribeDialog(kind, planCode) {
    if (!acc.user) { acc.panel = 'security'; acc.mobileOpen = true; render(); scrollTop(); toast('Connecte-toi pour continuer.', 'info'); return; }
    var P = plans(), cfg = P && P.config();
    var o = cfg && cfg.plans.filter(function (p) { return p.code === planCode; })[0];
    if (!o) { toast('Offre indisponible pour le moment.', 'error'); return; }
    var step = 1, period = (o.yearly && planPeriod === 'yearly') ? 'yearly' : (o.monthly ? 'monthly' : 'yearly'), desiredStart = '', comment = '';
    function activePrice() { return period === 'yearly' ? o.yearly : o.monthly; }
    function stepsDots() { return '<p class="acc-step-label" role="status">Étape ' + step + ' sur 3</p><div class="acc-steps" aria-hidden="true">' + [1, 2, 3].map(function (n) { return '<span class="acc-steps__dot' + (n === step ? ' is-on' : n < step ? ' is-done' : '') + '"></span>'; }).join('') + '</div>'; }
    function stepHtml() {
      if (step === 1) {
        var hasBoth = o.monthly && o.yearly;
        return '<h2 id="accd-title">' + (kind === 'renew' ? 'Renouveler ' : 'Choisir ') + esc(o.name) + '</h2>' + stepsDots() +
          '<p class="acc-plan__sub">' + esc(planSubtitle(o.code)) + '</p>' +
          (hasBoth ? '<div class="acc-plan-toggle" role="group" aria-label="Période">' +
            '<button type="button" class="acc-plan-toggle__opt' + (period === 'monthly' ? ' is-on' : '') + '" data-step-act="period" data-period="monthly">Mensuel</button>' +
            '<button type="button" class="acc-plan-toggle__opt' + (period === 'yearly' ? ' is-on' : '') + '" data-step-act="period" data-period="yearly">Annuel <span class="acc-plan-toggle__badge">' + (planSavings(o) || 2) + ' mois offerts</span></button></div>' : '') +
          '<p class="acc-plan__price" style="margin-top:16px">' + '<b>' + fmtMga((activePrice() || {}).priceMga || 0) + '</b><span>/ ' + (period === 'yearly' ? 'an' : 'mois') + '</span></p>' +
          (o.trialDays && kind === 'assign' ? '<p class="acc-hint">' + esc(o.trialDays) + ' jours d’essai, sans engagement.</p>' : '') +
          '<div class="accd__actions"><button type="button" class="acc-btn" data-dlg-close>Annuler</button><button type="button" class="acc-btn acc-btn--primary" data-step-act="next">Continuer</button></div>';
      }
      if (step === 2) {
        return '<h2 id="accd-title">Modalités de la demande</h2>' + stepsDots() +
          '<p class="acc-hint">Ton choix sera transmis à l’équipe pour examen. Les modalités seront précisées dans la réponse.</p>' +
          '<div class="acc-field"><label for="sub2-date">Début souhaité (facultatif)</label><input id="sub2-date" type="date" value="' + esc(desiredStart) + '"></div>' +
          '<div class="acc-field"><label for="sub2-comment">Message à l’équipe (facultatif)</label><textarea id="sub2-comment" maxlength="1000">' + esc(comment) + '</textarea></div>' +
          '<div class="accd__actions"><button type="button" class="acc-btn" data-step-act="back">Retour</button><button type="button" class="acc-btn acc-btn--primary" data-step-act="next">Continuer</button></div>';
      }
      return '<h2 id="accd-title">Confirmer la demande</h2>' + stepsDots() +
        '<p>' + esc(o.name) + ' · ' + (period === 'yearly' ? 'Annuel' : 'Mensuel') + ' · <b>' + fmtMga((activePrice() || {}).priceMga || 0) + '</b></p>' +
        (desiredStart ? '<p class="acc-hint">Début souhaité : ' + esc(new Date(desiredStart + 'T12:00:00').toLocaleDateString('fr-FR')) + '</p>' : '') +
        '<p class="acc-hint">L’envoi transmet une demande à l’équipe. Il n’active pas la formule et ne déclenche aucun paiement automatique.</p>' +
        '<p id="sub-dlg-status" class="acc-status" role="status" hidden></p>' +
        '<div class="accd__actions"><button type="button" class="acc-btn" data-step-act="back">Retour</button><button type="button" class="acc-btn acc-btn--primary" data-step-act="submit">Envoyer la demande</button></div>';
    }
    var dialog = openDialog(stepHtml());
    function rerender() { dialog.querySelector('.accd__panel').innerHTML = stepHtml(); var title = dialog.querySelector('#accd-title'); if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); } }
    dialog.addEventListener('click', function (e) {
      var b = e.target.closest('[data-step-act]'); if (!b) return;
      var act = b.dataset.stepAct;
      if (act === 'period') { period = b.dataset.period; rerender(); return; }
      if (act === 'next') { if (step === 2) { var d = dialog.querySelector('#sub2-date'), c = dialog.querySelector('#sub2-comment'); desiredStart = d ? d.value : ''; comment = c ? c.value : ''; } step = Math.min(3, step + 1); rerender(); return; }
      if (act === 'back') { step = Math.max(1, step - 1); rerender(); return; }
      if (act === 'submit') {
        withBusy(b, function () {
          return cs().api('/api/me/subscription/requests', { method: 'POST', body: JSON.stringify({ kind: kind, planCode: (activePrice() || {}).planCode || o.code, desiredStart: desiredStart ? new Date(desiredStart + 'T12:00:00').toISOString() : null, comment: comment }) })
            .then(function () { closeDialog(); toast('Demande transmise. Suis son état dans Mes demandes.', 'success'); loadSubscriptionAccount(); });
        }).catch(function (err) { var st = dialog.querySelector('#sub-dlg-status'); if (st) { st.hidden = false; st.textContent = err.message; } });
      }
    });
  }

  // ——— Panneau : partage ————————————————————————————————————
  // Durées proposées : celles que la formule autorise (quota « durée du lien », en jours).
  function shareDayOptions() {
    var q = plans() ? plans().featureQuota('share_link_days') : null;
    var all = [[1, '24 heures'], [7, '7 jours'], [30, '30 jours'], [90, '90 jours']];
    var ok = all.filter(function (o) { return q == null || o[0] <= q; });
    if (!ok.length) ok = [[1, '24 heures']];
    var pick = ok.some(function (o) { return o[0] === 7; }) ? 7 : ok[ok.length - 1][0];
    return ok.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === pick ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
  }
  function panelSharing() {
    if (!acc.user) return '<div class="acc-card"><h3>Le partage nécessite un compte</h3><p class="acc-hint">Créez un compte pour transmettre un carnet à votre vétérinaire par un lien sécurisé ou pour inviter un proche.</p><div class="acc-actions acc-actions--start"><button type="button" class="acc-btn acc-btn--primary" data-act="goto" data-panel="security">Se connecter ou créer un compte</button></div></div>';
    var pets = ctx() ? ctx().getState().animals : [];
    return '' +
      '<div class="acc-card" data-feature="vet_share"><h3>Lien pour le vétérinaire</h3><p class="acc-hint">Un lien en lecture seule vers le carnet d’un animal : vaccins, traitements, consultations, poids. Il expire automatiquement et se révoque à tout moment.</p>' +
        (pets.length ? '<form class="acc-form" data-form="share" novalidate><div class="acc-grid"><div class="acc-field"><label for="sh-pet">Animal</label><select id="sh-pet" name="sh-pet">' + pets.map(function (a) { return '<option value="' + a.id + '">' + esc(a.animal.name || 'Sans nom') + '</option>'; }).join('') + '</select></div>' +
          '<div class="acc-field"><label for="sh-days">Validité</label><select id="sh-days" name="sh-days">' + shareDayOptions() + '</select></div></div>' +
          field('sh-label', 'Destinataire (facultatif)', 'text', '', { placeholder: 'Dr Martin, clinique des Lilas…' }) +
          '<fieldset class="acc-fieldset"><legend>Contenu partagé en plus</legend>' +
            '<label class="acc-check"><input type="checkbox" name="sh-notes"><span>Notes de suivi (journal)</span></label>' +
            '<label class="acc-check"><input type="checkbox" name="sh-photos"><span>Photos</span></label>' +
            '<label class="acc-check"><input type="checkbox" name="sh-contact"><span>Mes coordonnées (téléphone, clinique)</span></label></fieldset>' +
          '<p class="acc-status" id="sh-status" role="status" aria-live="polite" hidden></p><div class="acc-actions"><button type="submit" class="acc-btn acc-btn--primary">' + icon('link', 18) + 'Créer le lien</button></div></form>' : '<p class="acc-hint">Ajoutez un animal pour créer un lien.</p>') +
        '<div id="acc-newlink">' + (acc.justCreatedLink ? newLinkHtml(acc.justCreatedLink) : '') + '</div>' +
        '<h4 class="acc-sub">Liens créés</h4><div id="acc-links">' + (acc.links ? linksHtml() : '<p class="acc-hint">Chargement…</p>') + '</div></div>' +
      '<div class="acc-card" data-feature="household_members"><h3>Foyer</h3><p class="acc-hint">Invitez un proche à consulter vos carnets en lecture seule. Il garde son propre compte ; vous pouvez le retirer à tout moment. La modification partagée des carnets n’est pas encore disponible.</p>' +
        '<form class="acc-form acc-form--inline" data-form="invite" novalidate>' + field('iv-email', 'Adresse e-mail du proche', 'email', '', { autocomplete: 'off', required: true }) + '<button type="submit" class="acc-btn acc-btn--primary">Inviter</button></form>' +
        '<p class="acc-status" id="iv-status" role="status" aria-live="polite" hidden></p><div id="acc-household">' + (acc.household ? householdHtml() : '<p class="acc-hint">Chargement…</p>') + '</div></div>';
  }
  function newLinkHtml(l) {
    return '<div class="acc-newlink" role="status"><b>Lien créé pour ' + esc(l.petName) + '</b><p class="acc-hint">Copiez-le maintenant : pour votre sécurité, il ne sera plus affiché ensuite.</p>' +
      '<div class="acc-copy"><input type="text" readonly value="' + esc(l.url) + '" id="acc-newlink-url" aria-label="Lien de partage"><button type="button" class="acc-btn acc-btn--primary" data-act="copy-link">' + icon('copy', 18) + 'Copier</button></div>' +
      '<div class="acc-qr" id="acc-qr" aria-label="QR code du lien"></div><p class="acc-hint">Valable jusqu’au ' + esc(window.applikaPrefs.formatDate(l.expiresAt)) + '.</p></div>';
  }
  function linksHtml() {
    if (!acc.links.length) return '<p class="acc-hint">Aucun lien pour l’instant.</p>';
    return '<ul class="acc-list">' + acc.links.map(function (l) {
      var status = l.revokedAt ? '<span class="acc-badge">Révoqué</span>' : l.active ? '<span class="acc-badge acc-badge--ok">Actif</span>' : '<span class="acc-badge">Expiré</span>';
      var opts = [l.includeNotes ? 'notes' : null, l.includePhotos ? 'photos' : null, l.includeContact ? 'coordonnées' : null].filter(Boolean);
      return '<li class="acc-row"><span class="acc-row__icon">' + icon('link', 20) + '</span><span class="acc-row__text"><b>' + esc(l.petName) + (l.label ? ' · ' + esc(l.label) : '') + ' ' + status + '</b><small>' + (l.active ? esc(inDays(l.expiresAt)) : 'Créé ' + esc(ago(l.createdAt))) + ' · ' + l.viewCount + ' consultation' + (l.viewCount > 1 ? 's' : '') + (opts.length ? ' · + ' + esc(opts.join(', ')) : '') + '</small></span>' +
        (l.active ? '<button type="button" class="acc-btn acc-btn--quiet" data-act="revoke-link" data-id="' + esc(l.id) + '">Révoquer</button>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function householdHtml() {
    var h = acc.household, out = '';
    out += '<h4 class="acc-sub">Mon foyer</h4>';
    if (!h.members.length && !h.invites.length) out += '<p class="acc-hint">Personne pour l’instant.</p>';
    else out += '<ul class="acc-list">' + h.members.map(function (m) {
      return '<li class="acc-row"><span class="acc-avatar acc-avatar--sm" aria-hidden="true">' + esc((m.name || m.email).charAt(0).toUpperCase()) + '</span><span class="acc-row__text"><b>' + esc(m.name || m.email) + ' <span class="acc-badge">Lecture</span></b><small>' + esc(m.email) + '</small></span><button type="button" class="acc-btn acc-btn--quiet" data-act="remove-member" data-id="' + esc(m.id) + '" data-name="' + esc(m.name || m.email) + '">Retirer</button></li>';
    }).join('') + h.invites.map(function (i) {
      return '<li class="acc-row"><span class="acc-row__icon">' + icon('mail', 20) + '</span><span class="acc-row__text"><b>' + esc(i.email) + ' <span class="acc-badge acc-badge--warn">Invitation envoyée</span></b><small>' + esc(inDays(i.expiresAt)) + '</small></span><button type="button" class="acc-btn acc-btn--quiet" data-act="cancel-invite" data-id="' + esc(i.id) + '">Annuler</button></li>';
    }).join('') + '</ul>';
    if (h.memberships.length) {
      out += '<h4 class="acc-sub">Foyers dont je fais partie</h4><ul class="acc-list">' + h.memberships.map(function (m) {
        return '<li class="acc-row"><span class="acc-row__icon">' + icon('paw', 20) + '</span><span class="acc-row__text"><b>Carnets de ' + esc(m.ownerName) + '</b><small>Lecture seule</small></span><a class="acc-btn" href="share.html?h=' + esc(m.ownerId) + '" target="_blank" rel="noopener">Ouvrir</a><button type="button" class="acc-btn acc-btn--quiet" data-act="leave-household" data-id="' + esc(m.ownerId) + '" data-name="' + esc(m.ownerName) + '">Quitter</button></li>';
      }).join('') + '</ul>';
    }
    return out;
  }

  // ——— Panneau : données et confidentialité ————————————————————
  function panelData() {
    var cS = configured() ? cs() : null;
    var last = cS && cS.lastSyncAt ? cS.lastSyncAt() : null;
    var consent = acc.user && acc.user.consent;
    var consentHtml = !acc.user ? '<p class="acc-hint">Le consentement est demandé à la création du compte.</p>' :
      (consent && consent.acceptedAt ? '<p class="acc-line">' + icon('check', 16) + '<span>Accepté le ' + esc(window.applikaPrefs.formatDate(consent.acceptedAt)) + ' (version ' + esc(consent.version) + ')</span></p>' :
        '<div class="acc-banner acc-banner--warn">' + icon('info', 18) + '<span>Vous n’avez pas encore accepté les conditions d’utilisation et la politique de confidentialité.</span></div><div class="acc-actions acc-actions--start"><button type="button" class="acc-btn acc-btn--primary" data-act="accept-consent">J’accepte</button></div>');
    return '' +
      '<div class="acc-card" data-feature="cloud_sync"><h3>Synchronisation</h3>' +
        (acc.user ? '<p class="acc-line" id="acc-syncline">' + icon('refresh', 16) + '<span>' + (last ? 'Dernière sauvegarde ' + esc(ago(last)) : 'Sauvegarde automatique active') + '</span></p><p class="acc-hint">Chaque modification est envoyée au serveur dans les secondes qui suivent.</p><div class="acc-actions acc-actions--start"><button type="button" class="acc-btn acc-btn--primary" data-act="sync-now">Sauvegarder maintenant</button><button type="button" class="acc-btn" data-act="sync-restore">Restaurer depuis le serveur</button></div><p class="acc-status" id="sync-status" role="status" aria-live="polite" hidden></p>' :
          '<p class="acc-hint">Sauvegarde locale sur cet appareil uniquement. <button type="button" class="acc-link" data-act="goto" data-panel="security">Connectez-vous</button> pour retrouver vos carnets partout.</p>') + '</div>' +
      '<div class="acc-card"><h3>Espace utilisé</h3><ul class="acc-list acc-list--plain"><li class="acc-kv"><span>Sur cet appareil</span><b id="st-local">…</b></li>' + (acc.user ? '<li class="acc-kv"><span>Photos sur le serveur</span><b id="st-server">…</b></li>' : '') + '</ul></div>' +
      '<div class="acc-card"><h3>Mes données</h3><p class="acc-hint">Vos données vous appartiennent : exportez-les ou importez une sauvegarde à tout moment.</p><div class="acc-actions acc-actions--start acc-actions--wrap"><button type="button" class="acc-btn" data-act="export-json">' + icon('download', 18) + 'Exporter tout (JSON)</button><button type="button" class="acc-btn" data-act="export-ics">' + icon('download', 18) + 'Calendrier des rappels (.ics)</button><button type="button" class="acc-btn" data-act="import-backup">Importer une sauvegarde</button></div></div>' +
      '<div class="acc-card"><h3>Confidentialité</h3>' + consentHtml + '<ul class="acc-list acc-list--plain"><li><a class="acc-link" href="legal.html#confidentialite" target="_blank" rel="noopener">Politique de confidentialité</a></li><li><a class="acc-link" href="legal.html#cgu" target="_blank" rel="noopener">Conditions d’utilisation</a></li></ul></div>' +
      (acc.user ? '<div class="acc-card acc-card--danger"><h3>Supprimer mon compte</h3><p class="acc-hint">Droit à l’effacement : supprime votre compte et toutes vos données sur le serveur.</p><div class="acc-actions acc-actions--start"><button type="button" class="acc-btn acc-btn--danger" data-act="delete-account">' + icon('trash', 18) + 'Supprimer mon compte</button></div></div>' : '');
  }

  // ——— Panneau : aide ———————————————————————————————————————
  function panelHelp() {
    return '<div class="acc-card"><ul class="acc-list acc-list--links">' +
      '<li><button type="button" class="acc-row acc-row--btn" data-act="help">' + '<span class="acc-row__icon">' + icon('help', 20) + '</span><span class="acc-row__text"><b>Centre d’aide</b><small>Questions fréquentes et guides</small></span>' + icon('chevron', 18) + '</button></li>' +
      '<li><button type="button" class="acc-row acc-row--btn" data-act="onboarding"><span class="acc-row__icon">' + icon('info', 20) + '</span><span class="acc-row__text"><b>Revoir l’introduction</b><small>Refaire le tour de l’application</small></span>' + icon('chevron', 18) + '</button></li>' +
      '<li><button type="button" class="acc-row acc-row--btn" data-act="support"><span class="acc-row__icon">' + icon('mail', 20) + '</span><span class="acc-row__text"><b>Signaler un problème</b><small>Envoyer une demande au support</small></span>' + icon('chevron', 18) + '</button></li>' +
      '</ul></div><p class="acc-foot">App’lika · conçu avec soin pour la santé animale.<br>Vos compagnons, leurs carnets, vos données.</p>';
  }
  function openSupportDialog() {
    var el = openDialog('<h2 class="accd__title" id="accd-title">Contacter le support</h2><p class="acc-hint">Décris le problème rencontré. Une personne de l’équipe pourra répondre à ton adresse e-mail.</p>' +
      '<form id="support-form" class="acc-form"><div class="acc-field"><label for="support-email">Adresse e-mail</label><input id="support-email" type="email" required maxlength="200" value="' + esc(acc.user && acc.user.email || '') + '"></div>' +
      '<div class="acc-field"><label for="support-subject">Sujet</label><input id="support-subject" required minlength="3" maxlength="160"></div>' +
      '<div class="acc-field"><label for="support-description">Description</label><textarea id="support-description" required minlength="10" maxlength="4000" rows="5"></textarea></div>' +
      '<p id="support-status" class="acc-status" role="status" aria-live="polite" hidden></p><div class="accd__actions"><button type="button" class="acc-btn" data-dlg-close>Annuler</button><button type="submit" class="acc-btn acc-btn--primary">Envoyer</button></div></form>', { focus: '#support-email' });
    el.querySelector('#support-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.currentTarget, button = form.querySelector('[type="submit"]'), status = form.querySelector('#support-status');
      if (!form.reportValidity()) return;
      button.disabled = true;
      fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.querySelector('#support-email').value, subject: form.querySelector('#support-subject').value, description: form.querySelector('#support-description').value }) })
        .then(function (response) { return response.json().then(function (body) { if (!response.ok) throw new Error(body.error || 'Envoi impossible.'); return body; }); })
        .then(function (body) { form.innerHTML = '<p role="status">Demande n°' + esc(body.id) + ' enregistrée. L’équipe pourra te répondre par e-mail.</p><button type="button" class="acc-btn acc-btn--primary" data-dlg-close>Fermer</button>'; form.querySelector('button').focus(); })
        .catch(function (error) { status.hidden = false; status.textContent = error.message; button.disabled = false; });
    });
  }

  // ——— Après rendu : données asynchrones et champs dynamiques ————————
  function afterPanel() {
    if (acc.panel === 'security') { $$('.acc-form[data-form="register"], .acc-form[data-form="login"]', root); mountGoogle(); if (acc.user && !acc.sessions) loadSessions(); }
    if (acc.panel === 'sharing' && acc.user) { if (!acc.links) loadLinks(); if (!acc.household) loadHousehold(); if (acc.justCreatedLink) renderQr(); }
    if (acc.panel === 'data') loadStorage();
    if (acc.panel === 'plan' && plans() && !acc.planRefreshed) { acc.planRefreshed = true; subscriptionAccount = null; loadSubscriptionAccount(); plans().refresh(); }
  }
  function setHtml(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }

  function loadSessions() {
    cs().api('/api/user/sessions').then(function (r) { acc.sessions = r.sessions; setHtml('acc-sessions', sessionsHtml()); }).catch(function (e) { setHtml('acc-sessions', '<p class="acc-hint acc-error">' + esc(e.message) + '</p>'); });
  }
  function loadLinks() {
    cs().api('/api/share/links').then(function (r) { acc.links = r.links; setHtml('acc-links', linksHtml()); refreshNavHints(); }).catch(function (e) { setHtml('acc-links', '<p class="acc-hint acc-error">' + esc(e.message) + '</p>'); });
  }
  function loadHousehold() {
    cs().api('/api/household').then(function (r) { acc.household = r; setHtml('acc-household', householdHtml()); }).catch(function (e) { setHtml('acc-household', '<p class="acc-hint acc-error">' + esc(e.message) + '</p>'); });
  }
  function loadStorage() {
    var local = document.getElementById('st-local');
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { if (local) local.textContent = fmtBytes(e.usage); }).catch(function () { if (local) local.textContent = '—'; });
    else if (local) local.textContent = '—';
    if (acc.user) cs().api('/api/user/storage').then(function (r) { var el = document.getElementById('st-server'); if (el) el.textContent = r.photos.count + ' photo' + (r.photos.count > 1 ? 's' : '') + ' · ' + fmtBytes(r.photos.bytes); }).catch(function () { /* espace indisponible */ });
  }
  function refreshNavHints() {
    if (!root) return;
    $$('.acc-nav__item', root).forEach(function (b) { var s = $('small', b); if (s) s.textContent = sectionHint(b.dataset.panel); });
  }
  function renderQr() {
    var el = document.getElementById('acc-qr');
    if (!el || !window.qrcode || !acc.justCreatedLink) return;
    try { var q = window.qrcode(0, 'M'); q.addData(acc.justCreatedLink.url); q.make(); el.innerHTML = q.createSvgTag(4, 0); } catch (e) { el.hidden = true; }
  }

  function mountGoogle() {
    var box = document.getElementById('acc-google');
    if (!box || acc.user || !configured() || !cs().googleClientId()) return;
    cs().loadGoogleScript().then(function () {
      window.google.accounts.id.initialize({ client_id: cs().googleClientId(), callback: function (resp) {
        setStatus('auth-status', 'Connexion avec Google…');
        cs().signInWithGoogleCredential(resp.credential).catch(function (err) { setStatus('auth-status', err.message, true); });
      } });
      window.google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', width: 300, text: 'continue_with', locale: 'fr' });
      box.hidden = false; var or = document.getElementById('acc-or'); if (or) or.hidden = false;
    }).catch(function () { /* Google indisponible : e-mail et mot de passe restent possibles */ });
  }

  function setStatus(id, msg, isError) {
    var el = document.getElementById(id); if (!el) return;
    el.textContent = msg || ''; el.hidden = !msg; el.classList.toggle('is-error', !!isError);
  }

  // ——— Session et profil serveur ———————————————————————————————
  function loadUser() {
    if (!configured()) return Promise.resolve();
    return cs().api('/api/user/profile').then(function (p) {
      acc.user = p;
      acc.planRefreshed = false;
      startInboxLive();
      adoptServerPrefs(p);
      syncOwnerFromAccount(p);
      updateNavAvatar();
      return p;
    }).catch(function () { acc.user = null; updateNavAvatar(); });
  }
  function adoptServerPrefs(p) {
    var srv = p.preferences || {};
    if (Object.keys(srv).length) setPrefs(srv, { silent: true });
    else pushPrefsToServer();
  }
  // Le profil propriétaire local (fiches, exports) reprend l'identité du compte quand elle est renseignée.
  function syncOwnerFromAccount(p) {
    var c = ctx(); if (!c) return;
    var o = c.getOwner(); var changed = false;
    var name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    if (name && o.name !== name) { o.name = name; changed = true; }
    if (p.email && o.email !== p.email) { o.email = p.email; changed = true; }
    if (p.phone && o.phone !== p.phone) { o.phone = p.phone; changed = true; }
    if (changed) c.saveState();
  }
  function onSignedIn() {
    acc.sessions = acc.links = acc.household = acc.storage = null;
    return loadUser().then(function () {
      acceptPendingInvite();
      if (root && !root.closest('[hidden]')) render();
      var inboxPage = document.getElementById('view-notifications'); if (inboxPage && !inboxPage.hidden) renderInboxPage();
      var c = ctx(); if (c && c.refreshAll) c.refreshAll();
    });
  }
  function onSignedOut() {
    stopInboxLive();
    subscriptionAccount = null; subscriptionError = ''; acc.planRefreshed = false;
    acc.user = null; acc.sessions = acc.links = acc.household = null; acc.justCreatedLink = null;
    updateNavAvatar();
    var inboxPage = document.getElementById('view-notifications'); if (inboxPage && !inboxPage.hidden) renderInboxPage();
    if (root && !root.closest('[hidden]')) render();
  }

  function updateNavAvatar() {
    var btn = document.getElementById('btn-user-nav'); if (!btn) return;
    if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML;
    var id = identity();
    if (id.avatar) btn.innerHTML = '<img src="' + esc(id.avatar) + '" alt="" referrerpolicy="no-referrer">';
    else btn.innerHTML = btn.dataset.defaultHtml;
  }

  // ——— Avatar ———————————————————————————————————————————————
  function squareJpeg(file, size) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file); var img = new Image();
      img.onload = function () {
        var s = Math.min(img.width, img.height);
        var c = document.createElement('canvas'); c.width = c.height = size;
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Image illisible.')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
      img.src = url;
    });
  }
  function onAvatarChosen(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('Format non pris en charge (JPEG, PNG ou WebP).', 'error'); return; }
    acc.avatarBusy = true;
    squareJpeg(file, acc.user ? 512 : 192).then(function (blob) {
      if (acc.user) {
        var fd = new FormData(); fd.append('file', blob, 'avatar.jpg');
        return cs().api('/api/user/avatar', { method: 'POST', body: fd, headers: {} }).then(function (p) { acc.user = p; });
      }
      return new Promise(function (resolve) { var r = new FileReader(); r.onload = function () { try { localStorage.setItem(LOCAL_AVATAR_KEY, r.result); } catch (e) { toast('Photo trop lourde pour le stockage local.', 'error'); } resolve(); }; r.readAsDataURL(blob); });
    }).then(function () { toast('Photo de profil mise à jour', 'success'); }).catch(function (e) { toast(e.message || 'Envoi impossible.', 'error'); })
      .then(function () { acc.avatarBusy = false; updateNavAvatar(); render(); });
  }
  function removeAvatar() {
    var done = function () { toast('Photo retirée', 'success'); updateNavAvatar(); render(); };
    if (acc.user) cs().api('/api/user/avatar', { method: 'DELETE' }).then(function (p) { acc.user = p; done(); }).catch(function (e) { toast(e.message, 'error'); });
    else { try { localStorage.removeItem(LOCAL_AVATAR_KEY); } catch (e) { /* rien */ } done(); }
  }

  // ——— Actions ———————————————————————————————————————————————
  function copyText(text, input) {
    function fallback() { if (input) { input.select(); try { document.execCommand('copy'); toast('Lien copié', 'success'); } catch (e) { toast('Copiez le lien manuellement (Ctrl+C).', 'info'); } } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('Lien copié', 'success'); }, fallback);
    else fallback();
  }

  function withBusy(btn, fn) {
    if (btn) btn.disabled = true;
    return Promise.resolve().then(fn).then(function (v) { if (btn) btn.disabled = false; return v; }, function (e) { if (btn) btn.disabled = false; throw e; });
  }

  var actions = {
    'plan-subscribe': function (t) { openSubscribeDialog('assign', t.dataset.plan); },
    'subscription-renew': function (t) { openSubscribeDialog('renew', planBase(t.dataset.plan)); },
    'plan-period': function (t) { planPeriod = t.dataset.period; renderPanel(); },
    'subscription-refresh': function () { loadSubscriptionAccount(); if (plans()) plans().refresh(); },
    'subscription-cancel': function (t) { confirmDialog({ title: 'Annuler cette demande ?', text: 'Elle ne sera plus traitée par l’équipe.', ok: 'Annuler la demande' }).then(function (ok) { if (ok) withBusy(t, function () { return cs().api('/api/me/subscription/requests/' + t.dataset.id + '/cancel', { method: 'POST' }).then(loadSubscriptionAccount); }).catch(function (e) { toast(e.message, 'error'); }); }); },
    'subscription-read': function (t) { withBusy(t, function () { return cs().api('/api/me/subscription/notifications/' + t.dataset.id + '/read', { method: 'POST' }).then(loadSubscriptionAccount); }).catch(function (e) { toast(e.message, 'error'); }); },
    open: function (t) { acc.panel = t.dataset.panel; acc.mobileOpen = true; render(); scrollTop(); },
    goto: function (t) { acc.panel = t.dataset.panel; acc.mobileOpen = true; render(); scrollTop(); },
    back: function () { acc.mobileOpen = false; render(); scrollTop(); },
    'plan-refresh': function () { if (plans()) plans().refresh(); },
    'open-pet': function (t) { var c = ctx(); if (c) c.openPet(Number(t.dataset.pet)); },
    'add-pet': function () { var c = ctx(); if (c) c.openModal('addAnimal'); },
    'avatar-pick': function () { var i = document.getElementById('acc-avatar-input'); if (i) i.click(); },
    'avatar-remove': function () { removeAvatar(); },
    'auth-tab': function (t) { acc.authTab = t.dataset.tab; renderPanel(); },
    'toggle-pw': function (t) { var i = document.getElementById(t.dataset.target); if (!i) return; var show = i.type === 'password'; i.type = show ? 'text' : 'password'; t.setAttribute('aria-pressed', String(show)); t.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'); },
    forgot: function () { forgotDialog(); },
    'resend-verify': function (t) { withBusy(t, function () { return cs().api('/api/auth/resend-verification', { method: 'POST', body: '{}' }); }).then(function (r) { toast(r.alreadyVerified ? 'Votre adresse est déjà vérifiée.' : 'E-mail envoyé : consultez votre boîte de réception.', 'success'); }).catch(function (e) { toast(e.message, 'error'); }); },
    signout: function () {
      confirmDialog({ title: 'Se déconnecter ?', text: 'Vos carnets restent sauvegardés sur le serveur. Sur un appareil partagé, effacez aussi les carnets enregistrés ici : ils ne seraient pas mélangés avec un autre compte.',
        extra: '<label class="acc-check"><input type="checkbox" name="wipe"><span>Effacer les carnets de cet appareil</span></label>', ok: 'Me déconnecter' }).then(function (v) {
        if (!v) return;
        cs().signOut().then(function () {
          if (v.wipe) { ['vetbook_data', 'vetbook_vet_directory', LOCAL_PROFILE_KEY, LOCAL_AVATAR_KEY, 'vetbook_last_sync'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } }); toast('Déconnecté et carnets effacés de cet appareil.', 'success'); setTimeout(function () { location.reload(); }, 700); }
          else toast('Vous êtes déconnecté.', 'success');
        });
      });
    },
    'revoke-session': function (t) { cs().api('/api/user/sessions/' + t.dataset.id, { method: 'DELETE' }).then(function () { toast('Appareil déconnecté', 'success'); acc.sessions = null; loadSessions(); }).catch(function (e) { toast(e.message, 'error'); }); },
    'revoke-others': function () {
      confirmDialog({ title: 'Se déconnecter partout ?', text: 'Tous vos autres appareils seront déconnectés. Celui-ci reste connecté.', ok: 'Me déconnecter partout' }).then(function (v) { if (!v) return;
        cs().api('/api/user/sessions/revoke-others', { method: 'POST', body: '{}' }).then(function () { toast('Vos autres appareils sont déconnectés.', 'success'); acc.sessions = null; loadSessions(); }).catch(function (e) { toast(e.message, 'error'); }); });
    },
    'delete-account': function () { deleteAccountDialog(); },
    'push-settings': function () { var c = ctx(); if (c) c.openModal('pushSettings'); },
    seg: function (t) {
      var n = t.dataset.name, v = t.dataset.value;
      if (n === 'theme') { var c = ctx(); if (c && c.setTheme) c.setTheme(v); }
      else if (n === 'textSize') setPrefs({ accessibility: { textSize: v } });
      else if (n === 'weekStart') setPrefs({ weekStart: v });
      else if (n === 'weightUnit') setPrefs({ units: { weight: v } });
      else if (n === 'heightUnit') setPrefs({ units: { height: v } });
      renderPanel(); refreshNavHints();
    },
    'copy-link': function () { var i = document.getElementById('acc-newlink-url'); if (i) copyText(i.value, i); },
    'revoke-link': function (t) {
      confirmDialog({ title: 'Révoquer ce lien ?', text: 'Le vétérinaire ne pourra plus ouvrir ce carnet avec ce lien.', ok: 'Révoquer', danger: true }).then(function (v) { if (!v) return;
        cs().api('/api/share/links/' + t.dataset.id, { method: 'DELETE' }).then(function () { toast('Lien révoqué', 'success'); acc.links = null; loadLinks(); }).catch(function (e) { toast(e.message, 'error'); }); });
    },
    'remove-member': function (t) {
      confirmDialog({ title: 'Retirer ' + t.dataset.name + ' ?', text: 'Cette personne n’aura plus accès à vos carnets.', ok: 'Retirer', danger: true }).then(function (v) { if (!v) return;
        cs().api('/api/household/members/' + t.dataset.id, { method: 'DELETE' }).then(function () { toast('Membre retiré', 'success'); acc.household = null; loadHousehold(); }).catch(function (e) { toast(e.message, 'error'); }); });
    },
    'cancel-invite': function (t) { cs().api('/api/household/invites/' + t.dataset.id, { method: 'DELETE' }).then(function () { toast('Invitation annulée', 'success'); acc.household = null; loadHousehold(); }).catch(function (e) { toast(e.message, 'error'); }); },
    'leave-household': function (t) {
      confirmDialog({ title: 'Quitter le foyer de ' + t.dataset.name + ' ?', text: 'Vous ne pourrez plus consulter ses carnets, sauf nouvelle invitation.', ok: 'Quitter', danger: true }).then(function (v) { if (!v) return;
        cs().api('/api/household/memberships/' + t.dataset.id, { method: 'DELETE' }).then(function () { toast('Foyer quitté', 'success'); acc.household = null; loadHousehold(); }).catch(function (e) { toast(e.message, 'error'); }); });
    },
    'accept-consent': function () { cs().api('/api/user/consent', { method: 'POST', body: JSON.stringify({ accept: true }) }).then(function () { toast('Merci, votre acceptation est enregistrée.', 'success'); return loadUser(); }).then(function () { render(); }).catch(function (e) { toast(e.message, 'error'); }); },
    'sync-now': function (t) {
      withBusy(t, function () { setStatus('sync-status', 'Sauvegarde en cours…'); return cs().pushAllToCloud(); }).then(function () { setStatus('sync-status', 'Sauvegardé sur le serveur.'); refreshSyncLine(); }).catch(function (e) { setStatus('sync-status', e.message, true); });
    },
    'sync-restore': function () {
      confirmDialog({ title: 'Restaurer depuis le serveur ?', text: 'Les carnets de cet appareil seront <b>remplacés</b> par ceux du serveur. Les modifications non sauvegardées seront perdues.', ok: 'Restaurer', danger: true }).then(function (v) { if (!v) return;
        setStatus('sync-status', 'Restauration en cours…');
        cs().pullAllFromCloud().then(function (found) { if (!found) { setStatus('sync-status', 'Aucune donnée sur le serveur pour ce compte.', true); return; } setStatus('sync-status', 'Restauré. Rechargement…'); setTimeout(function () { location.reload(); }, 600); }).catch(function (e) { setStatus('sync-status', e.message, true); }); });
    },
    'export-json': function () { var c = ctx(); if (c) c.exportJson(); },
    'export-ics': function () { var c = ctx(); if (c) c.exportIcs(); },
    'import-backup': function () { var c = ctx(); if (c) c.openModal('backup'); },
    help: function () { var c = ctx(); if (c) c.showHelp(); },
    support: openSupportDialog,
    onboarding: function () { var c = ctx(); if (c) c.showOnboarding(); }
  };
  function scrollTop() { var v = document.getElementById('view-user-profile'); if (v && v.scrollIntoView) v.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); }
  function refreshSyncLine() { var el = $('#acc-syncline span'); var last = cs().lastSyncAt && cs().lastSyncAt(); if (el) el.textContent = last ? 'Dernière sauvegarde ' + ago(last) : 'Sauvegarde automatique active'; refreshNavHints(); }

  // ——— Formulaires ——————————————————————————————————————————
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  var forms = {
    profile: function (form) {
      var first = val('pf-first').trim();
      if (!first) { setStatus('pf-status', 'Indiquez votre prénom.', true); document.getElementById('pf-first').focus(); return; }
      var data = { firstName: first, lastName: val('pf-last').trim(), phone: val('pf-phone').trim() };
      var emergency = { name: val('pf-em-name').trim(), relation: val('pf-em-relation').trim(), phone: val('pf-em-phone').trim(), email: val('pf-em-email').trim() };
      var c = ctx(); var o = c.getOwner();
      o.clinic = val('pf-clinic').trim(); o.address = val('pf-address').trim();
      setStatus('pf-status', 'Enregistrement…');
      var finish = function () {
        o.name = [data.firstName, data.lastName].filter(Boolean).join(' '); o.phone = data.phone; if (acc.user) o.email = acc.user.email;
        c.saveState(); updateNavAvatar(); refreshNavHints();
        setStatus('pf-status', 'Profil enregistré.'); toast('Profil enregistré', 'success');
        var h = $('.acc-me__text h1', root); if (h) h.textContent = o.name || 'Mon compte';
        var pc = $('.acc-progress', root); if (pc) { var tmp = document.createElement('div'); tmp.innerHTML = panelProfile(); var np = $('.acc-progress', tmp); if (np) pc.replaceWith(np); }
      };
      if (acc.user) cs().api('/api/user/profile', { method: 'PATCH', body: JSON.stringify({ firstName: data.firstName, lastName: data.lastName, phone: data.phone, emergencyContact: emergency }) }).then(function (p) { acc.user = p; finish(); }).catch(function (e) { setStatus('pf-status', e.message, true); });
      else { var lp = localProfile(); lp.firstName = data.firstName; lp.lastName = data.lastName; lp.emergencyContact = emergency; saveLocalProfile(lp); finish(); }
    },
    login: function (form) {
      var email = val('lg-email').trim(), pass = val('lg-pass');
      if (!email || !pass) { setStatus('auth-status', 'Saisissez votre adresse e-mail et votre mot de passe.', true); return; }
      var btn = $('button[type="submit"]', form);
      withBusy(btn, function () { setStatus('auth-status', 'Connexion…'); return cs().login(email, pass); }).then(function () { toast('Connexion réussie', 'success'); }).catch(function (e) { setStatus('auth-status', e.message, true); });
    },
    register: function (form) {
      var first = val('rg-first').trim(), email = val('rg-email').trim(), pass = val('rg-pass');
      if (!first) { setStatus('auth-status', 'Indiquez votre prénom.', true); return; }
      if (!email) { setStatus('auth-status', 'Indiquez votre adresse e-mail.', true); return; }
      if (pass.length < 8) { setStatus('auth-status', 'Le mot de passe doit faire 8 caractères minimum.', true); return; }
      if (!document.getElementById('rg-terms').checked) { setStatus('auth-status', 'Acceptez les conditions d’utilisation et la politique de confidentialité pour continuer.', true); return; }
      var btn = $('button[type="submit"]', form);
      withBusy(btn, function () { setStatus('auth-status', 'Création du compte…'); return cs().register({ email: email, password: pass, firstName: first, lastName: val('rg-last').trim(), acceptTerms: true }); })
        .then(function () { toast('Compte créé : un e-mail de confirmation vous a été envoyé.', 'success'); }).catch(function (e) { setStatus('auth-status', e.message, true); });
    },
    'change-email': function (form) {
      var btn = $('button[type="submit"]', form);
      withBusy(btn, function () { return cs().api('/api/user/change-email', { method: 'POST', body: JSON.stringify({ newEmail: val('ce-new').trim(), password: val('ce-pass') }) }); })
        .then(function (r) { acc.user.pendingEmail = r.pendingEmail; toast('Lien de confirmation envoyé à ' + r.pendingEmail, 'success'); renderPanel(); }).catch(function (e) { setStatus('ce-status', e.message, true); });
    },
    'change-password': function (form) {
      var np = val('cp-new'), cf = val('cp-confirm');
      if (np.length < 8) { setStatus('cp-status', 'Le nouveau mot de passe doit faire 8 caractères minimum.', true); return; }
      if (np !== cf) { setStatus('cp-status', 'Les deux mots de passe ne correspondent pas.', true); return; }
      var btn = $('button[type="submit"]', form);
      withBusy(btn, function () { return cs().api('/api/user/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: val('cp-current'), newPassword: np }) }); })
        .then(function () { toast('Mot de passe modifié. Vos autres appareils sont déconnectés.', 'success'); acc.sessions = null; return loadUser(); }).then(function () { renderPanel(); }).catch(function (e) { setStatus('cp-status', e.message, true); });
    },
    share: function (form) {
      var petId = Number(val('sh-pet'));
      var body = { petLocalId: petId, days: Number(val('sh-days')), label: val('sh-label').trim(), includeNotes: form.elements['sh-notes'].checked, includePhotos: form.elements['sh-photos'].checked, includeContact: form.elements['sh-contact'].checked };
      var btn = $('button[type="submit"]', form);
      withBusy(btn, function () {
        setStatus('sh-status', 'Préparation du lien…');
        // Le carnet doit exister sur le serveur : on le sauvegarde d'abord.
        return cs().pushAllToCloud().catch(function () { /* déjà à jour ou rien à envoyer */ }).then(function () { return cs().api('/api/share/links', { method: 'POST', body: JSON.stringify(body) }); });
      }).then(function (r) { acc.justCreatedLink = r; acc.links = null; setStatus('sh-status', ''); setHtml('acc-newlink', newLinkHtml(r)); renderQr(); loadLinks(); var el = document.getElementById('acc-newlink-url'); if (el) { el.focus(); el.select(); } })
        .catch(function (e) { setStatus('sh-status', e.message, true); });
    },
    invite: function (form) {
      var email = val('iv-email').trim(); var btn = $('button[type="submit"]', form);
      withBusy(btn, function () { return cs().api('/api/household/invites', { method: 'POST', body: JSON.stringify({ email: email }) }); })
        .then(function () { setStatus('iv-status', 'Invitation envoyée à ' + email + '.'); document.getElementById('iv-email').value = ''; acc.household = null; loadHousehold(); }).catch(function (e) { setStatus('iv-status', e.message, true); });
    }
  };

  function forgotDialog(prefill) {
    var el = openDialog('<h2 class="accd__title" id="accd-title">Mot de passe oublié</h2><p class="accd__text">Saisissez l’adresse de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.</p><form class="acc-form" data-dlg-form="forgot" novalidate>' + field('fg-email', 'Adresse e-mail', 'email', prefill || val('lg-email') || '', { autocomplete: 'email', required: true }) + '<p class="acc-status" id="fg-status" role="status" aria-live="polite" hidden></p><div class="accd__actions"><button type="button" class="acc-btn" data-dlg-close>Fermer</button><button type="submit" class="acc-btn acc-btn--primary">Envoyer le lien</button></div></form>');
    $('form', el).addEventListener('submit', function (e) {
      e.preventDefault();
      var email = val('fg-email').trim(); if (!email) { setStatus('fg-status', 'Indiquez votre adresse e-mail.', true); return; }
      withBusy($('button[type="submit"]', el), function () { return cs().api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email }) }); })
        .then(function () { setStatus('fg-status', 'Si un compte existe pour cette adresse, un e-mail vient d’être envoyé. Pensez à vérifier vos courriers indésirables.'); }).catch(function (err) { setStatus('fg-status', err.message, true); });
    });
  }

  function resetDialog(token) {
    var el = openDialog('<h2 class="accd__title" id="accd-title">Nouveau mot de passe</h2><form class="acc-form" data-dlg-form="reset" novalidate>' + passwordField('rs-new', 'Nouveau mot de passe', 'new-password', true) + passwordField('rs-confirm', 'Confirmer le mot de passe', 'new-password', false) + '<p class="acc-status" id="rs-status" role="status" aria-live="polite" hidden></p><div class="accd__actions"><button type="button" class="acc-btn" data-dlg-close>Annuler</button><button type="submit" class="acc-btn acc-btn--primary">Enregistrer</button></div></form>');
    bindMeters(el);
    $('form', el).addEventListener('submit', function (e) {
      e.preventDefault();
      var np = val('rs-new'), cf = val('rs-confirm');
      if (np.length < 8) { setStatus('rs-status', 'Le mot de passe doit faire 8 caractères minimum.', true); return; }
      if (np !== cf) { setStatus('rs-status', 'Les deux mots de passe ne correspondent pas.', true); return; }
      withBusy($('button[type="submit"]', el), function () { return cs().api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: token, password: np }) }); })
        .then(function () { closeDialog(); acc.panel = 'security'; acc.authTab = 'login'; acc.mobileOpen = true; toast('Mot de passe modifié : connectez-vous avec le nouveau.', 'success'); openAccountView(); }).catch(function (err) { setStatus('rs-status', err.message, true); });
    });
  }

  function deleteAccountDialog() {
    var u = acc.user;
    var el = openDialog('<h2 class="accd__title" id="accd-title">Supprimer mon compte</h2><p class="accd__text">Cette action est <b>définitive</b> : votre compte, vos carnets, vos photos, vos liens de partage et votre foyer seront effacés du serveur.</p>' +
      '<form class="acc-form" data-dlg-form="delete" novalidate>' + (u.hasPassword ? passwordField('dl-pass', 'Mot de passe', 'current-password', false) : field('dl-email', 'Saisissez ' + u.email + ' pour confirmer', 'email', '', { autocomplete: 'off' })) +
      '<label class="acc-check"><input type="checkbox" id="dl-local"><span>Effacer aussi les carnets enregistrés sur cet appareil</span></label><p class="acc-status" id="dl-status" role="status" aria-live="polite" hidden></p>' +
      '<div class="accd__actions"><button type="button" class="acc-btn" data-dlg-close>Annuler</button><button type="submit" class="acc-btn acc-btn--danger">Supprimer définitivement</button></div></form>');
    $('form', el).addEventListener('submit', function (e) {
      e.preventDefault();
      var body = u.hasPassword ? { password: val('dl-pass') } : { confirmEmail: val('dl-email') };
      var wipe = document.getElementById('dl-local').checked;
      withBusy($('button[type="submit"]', el), function () { return cs().api('/api/user/account', { method: 'DELETE', body: JSON.stringify(body) }); })
        .then(function () {
          closeDialog();
          if (wipe) { ['vetbook_data', 'vetbook_vet_directory', LOCAL_PROFILE_KEY, LOCAL_AVATAR_KEY].forEach(function (k) { try { localStorage.removeItem(k); } catch (er) { /* rien */ } }); }
          cs().signOut().then(function () { toast('Votre compte a été supprimé.', 'success'); if (wipe) setTimeout(function () { location.reload(); }, 800); });
        }).catch(function (err) { setStatus('dl-status', err.message, true); });
    });
  }

  // ——— Liens reçus par e-mail ————————————————————————————————
  function cleanUrl() { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* rien */ } }
  function handleDeepLinks() {
    if (new URLSearchParams(location.search).get('account') === 'plan') { acc.panel = 'plan'; acc.mobileOpen = true; if (ctx()) ctx().showUserProfile(); }
    var q = new URLSearchParams(location.search);
    var verify = q.get('verify'), reset = q.get('reset'), invite = q.get('invite');
    if (!verify && !reset && !invite) return;
    cleanUrl();
    if (!configured()) return;
    if (verify) {
      cs().api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verify }) }).then(function (r) {
        toast(r.kind === 'change-email' ? 'Adresse mise à jour : ' + r.email : 'Adresse e-mail confirmée. Merci !', 'success');
        cs().refresh().then(function () { return loadUser(); }).then(function () { if (root) render(); });
      }).catch(function (e) { toast(e.message, 'error'); });
    }
    if (reset) resetDialog(reset);
    if (invite) {
      try { sessionStorage.setItem(PENDING_INVITE_KEY, invite); } catch (e) { /* rien */ }
      cs().getSession().then(function (s) {
        if (s) acceptPendingInvite();
        else { toast('Connectez-vous avec l’adresse invitée pour accepter l’invitation.', 'info'); acc.panel = 'security'; acc.authTab = 'login'; acc.mobileOpen = true; openAccountView(); }
      });
    }
  }
  function acceptPendingInvite() {
    var token = null; try { token = sessionStorage.getItem(PENDING_INVITE_KEY); } catch (e) { /* rien */ }
    if (!token || !acc.user) return;
    cs().api('/api/household/accept', { method: 'POST', body: JSON.stringify({ token: token }) }).then(function (r) {
      try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch (e) { /* rien */ }
      toast('Vous faites maintenant partie du foyer de ' + r.ownerName + '.', 'success');
      acc.household = null; acc.panel = 'sharing'; acc.mobileOpen = true; openAccountView();
    }).catch(function (e) { try { sessionStorage.removeItem(PENDING_INVITE_KEY); } catch (er) { /* rien */ } toast(e.message, 'error'); });
  }
  function openAccountView() { var c = ctx(); if (c && c.showUserProfile) c.showUserProfile(); else render(); }

  // ——— Mesures de mot de passe ——————————————————————————————————
  function bindMeters(scope) {
    $$('[data-meter-for]', scope || root).forEach(function (m) {
      var input = document.getElementById(m.getAttribute('data-meter-for')); if (!input) return;
      function upd() { var s = strength(input.value); $$('i', m).forEach(function (bar, i) { bar.className = i < s.level ? 'on l' + s.level : ''; }); $('small', m).textContent = input.value ? s.label : '8 caractères minimum'; }
      input.addEventListener('input', upd); upd();
    });
  }

  // ——— Rendu principal et événements ——————————————————————————————
  function render() {
    root = document.getElementById('acc');
    if (!root) return;
    renderShell();
    bindMeters();
  }

  function bind() {
    var view = document.getElementById('view-user-profile');
    if (!view || view.dataset.accBound) return;
    view.dataset.accBound = '1';
    view.innerHTML = '<div class="acc" id="acc"></div>';
    root = document.getElementById('acc');

    view.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]');
      if (!t || !view.contains(t)) return;
      var fn = actions[t.dataset.act];
      if (fn) { e.preventDefault(); fn(t); }
    });
    view.addEventListener('submit', function (e) {
      var f = e.target.closest('form[data-form]'); if (!f) return;
      e.preventDefault();
      var fn = forms[f.dataset.form]; if (fn) fn(f);
    });
    view.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'acc-avatar-input') { onAvatarChosen(t.files && t.files[0]); t.value = ''; return; }
      if (t.dataset.actChange === 'country') { applyCountry(t.value); return; }
      if (t.dataset.actChange === 'events-toggle') { var c = ctx(); if (c) c.toggleDogEvents(t.checked); return; }
      var path = t.dataset.pref; if (!path) return;
      var v = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.type === 'int') v = parseInt(v, 10);
      if (t.dataset.type === 'pet') v = v === '' ? null : Number(v);
      var patch = {}, keys = path.split('.'), cur = patch;
      keys.forEach(function (k, i) { if (i === keys.length - 1) cur[k] = v; else { cur[k] = {}; cur = cur[k]; } });
      setPrefs(patch); refreshNavHints();
      if (path === 'notifications.push' || path === 'notifications.email') renderPanel();
    });
  }

  function show() {
    bind();
    acc.planRefreshed = false;
    // Ouverture depuis un lien e-mail ou une section demandée : on garde l'état ; sinon la liste (mobile) / le profil (bureau).
    render();
    if (configured()) {
      cs().getSession().then(function (s) {
        if (s && !acc.user) return loadUser().then(function () { render(); });
        if (!s && acc.user) { onSignedOut(); }
      });
    }
  }

  function init() {
    bind();
    if (!configured()) { updateNavAvatar(); return; }
    cs().onAuthChange(function (event) { if (event === 'SIGNED_IN') onSignedIn(); else if (event === 'SIGNED_OUT') onSignedOut(); });
    cs().onSyncEvent(function (kind) { if (kind === 'synced') refreshSyncLine(); });
    cs().getSession().then(function (s) { if (s) return loadUser(); }).then(function () { updateNavAvatar(); var inboxPage = document.getElementById('view-notifications'); if (inboxPage && !inboxPage.hidden) renderInboxPage(); handleDeepLinks(); });
    updateNavAvatar();
  }

  window.applikaAccount = { chooseCountry: chooseCountry, refreshPlan: function () { if (acc.panel === 'plan') renderPanel(); },
    show: show, render: render, renderInboxPage: renderInboxPage, openSection: function (k) { acc.panel = k; acc.mobileOpen = true; }, openSupport: openSupportDialog, init: init, updateNavAvatar: updateNavAvatar };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
