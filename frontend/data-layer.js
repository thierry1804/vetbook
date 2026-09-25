/**
 * App'lika — couche sync API (Postgres local + cookies de session).
 * Auth : email/mot de passe + Google OAuth. Photos : MinIO via /api/files.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vetbook_data';
  var VET_DIRECTORY_KEY = 'vetbook_vet_directory';
  var SESSION_KEY = 'vetbook_cloud_session';

  var cfg = window.__SUPABASE_CONFIG__;
  var configured = !!cfg;
  var apiBase = (cfg && cfg.apiBaseUrl) || '';

  var AUTO_PUSH_DELAY_MS = 4000;
  var suppressAutoPush = false;
  var autoPushTimer = null;
  var currentSession = null;
  var authListeners = [];
  var onAutoSyncEvent = null;

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeLocal(state) {
    suppressAutoPush = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    finally { suppressAutoPush = false; }
  }
  function readVetDirectory() {
    try { return JSON.parse(localStorage.getItem(VET_DIRECTORY_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeVetDirectory(dir) { localStorage.setItem(VET_DIRECTORY_KEY, JSON.stringify(dir)); }

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function toPublicSession(session) {
    return session ? { user: { id: session.userId, email: session.email, name: session.name || '', picture: session.picture || '',
      firstName: session.firstName || '', lastName: session.lastName || '', emailVerified: !!session.emailVerified } } : null;
  }

  function sessionFromApi(res) {
    return { userId: res.userId, email: res.email, name: res.name, picture: res.picture,
      firstName: res.firstName, lastName: res.lastName, emailVerified: !!res.emailVerified };
  }

  // Écouteurs de synchronisation (interface du compte) + horodatage de la dernière sauvegarde réussie.
  var syncListeners = [];
  function emitSync(kind, err) {
    if (kind === 'synced') { try { nativeSetItem('vetbook_last_sync', new Date().toISOString()); } catch (e) { /* stockage plein */ } }
    syncListeners.forEach(function (cb) { try { cb(kind, err); } catch (e) { /* écouteur défaillant */ } });
    if (onAutoSyncEvent) onAutoSyncEvent(kind, err);
  }

  function notifyAuthListeners(event) {
    var publicSession = toPublicSession(currentSession);
    authListeners.forEach(function (cb) { cb(event, publicSession); });
  }

  var nativeSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    nativeSetItem(key, value);
    if (key === STORAGE_KEY && !suppressAutoPush && configured && currentSession) {
      scheduleAutoPush();
    }
  };

  function scheduleAutoPush() {
    if (autoPushTimer) clearTimeout(autoPushTimer);
    emitSync('pending');
    autoPushTimer = setTimeout(function () {
      autoPushTimer = null;
      pushAllToCloud().then(function () {
        emitSync('synced');
      }).catch(function (err) {
        emitSync('error', err);
      });
    }, AUTO_PUSH_DELAY_MS);
  }

  function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(apiBase + path, Object.assign({ credentials: 'include' }, options, { headers: headers })).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('application/json') === -1) {
        if (!res.ok) throw new Error('Erreur serveur (' + res.status + ')');
        return res;
      }
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || ('Erreur serveur (' + res.status + ')'));
        return body;
      });
    });
  }

  function isConfigured() { return configured; }

  function applySession(res) {
    currentSession = sessionFromApi(res);
    writeSession(currentSession);
    notifyAuthListeners('SIGNED_IN');
    maybeAutoPull();
    return true;
  }

  // register({ email, password, firstName, lastName, acceptTerms }) — l'ancienne signature (email, password, name) reste acceptée.
  function register(fields, password, name) {
    if (!configured) return Promise.reject(new Error('API non configurée (config.js manquant).'));
    var body = typeof fields === 'object' && fields ? fields : { email: fields, password: password, firstName: name };
    return apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }).then(applySession);
  }

  function login(email, password) {
    if (!configured) return Promise.reject(new Error('API non configurée (config.js manquant).'));
    return apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password }),
    }).then(applySession);
  }

  function signOut() {
    return apiFetch('/api/auth/logout', { method: 'POST', body: '{}' }).catch(function () {
      return null;
    }).then(function () {
      currentSession = null;
      writeSession(null);
      notifyAuthListeners('SIGNED_OUT');
    });
  }

  function getSession() {
    return Promise.resolve(toPublicSession(currentSession));
  }

  function onAuthChange(cb) {
    authListeners.push(cb);
  }

  function refreshSessionFromCookie() {
    if (!configured) return Promise.resolve(false);
    return apiFetch('/api/auth/me', { method: 'GET' }).then(function (res) {
      currentSession = sessionFromApi(res);
      writeSession(currentSession);
      notifyAuthListeners('SIGNED_IN');
      maybeAutoPull();
      return true;
    }).catch(function (err) {
      // Session révoquée ou expirée côté serveur : l'interface repasse en mode « non connecté ».
      var wasSignedIn = !!currentSession;
      if (wasSignedIn && /401|invalide|authentifi/i.test(String(err && err.message))) notifyAuthListeners('SIGNED_OUT');
      currentSession = null;
      writeSession(null);
      return false;
    });
  }

  var GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
  var googleScriptPromise = null;

  function loadGoogleScript() {
    if (googleScriptPromise) return googleScriptPromise;
    googleScriptPromise = new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.id) { resolve(); return; }
      var script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Impossible de charger Google Sign-In.')); };
      document.head.appendChild(script);
    });
    return googleScriptPromise;
  }

  function signInWithGoogleCredential(credential) {
    return apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: credential }),
    }).then(applySession);
  }

  function subscribeToPush(subscriptionJson) {
    if (!configured) return Promise.reject(new Error('API non configurée.'));
    if (!currentSession) return Promise.reject(new Error('Connecte-toi d\'abord pour activer les notifications push.'));
    return apiFetch('/api/push/subscription', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: { p256dh: subscriptionJson.keys && subscriptionJson.keys.p256dh, auth: subscriptionJson.keys && subscriptionJson.keys.auth },
      }),
    }).then(function () { return true; });
  }

  function unsubscribeFromPush(endpoint) {
    if (!configured || !endpoint || !currentSession) return Promise.resolve(false);
    return apiFetch('/api/push/subscription', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: endpoint }),
    }).then(function () { return true; });
  }

  function getDogEventsReminderPref() {
    if (!configured || !currentSession) return Promise.resolve(true);
    return apiFetch('/api/user/dog-events-reminder', { method: 'GET' }).then(function (res) {
      return !!res.dogEventsReminder;
    });
  }

  function setDogEventsReminderPref(value) {
    if (!configured) return Promise.reject(new Error('API non configurée.'));
    if (!currentSession) return Promise.reject(new Error('Non connecté.'));
    return apiFetch('/api/user/dog-events-reminder', {
      method: 'POST',
      body: JSON.stringify({ dogEventsReminder: !!value }),
    }).then(function () { return true; });
  }

  var autoPullDone = false;
  function maybeAutoPull() {
    if (autoPullDone || !currentSession) return;
    autoPullDone = true;
    var local = readLocal();
    var isEmpty = !local || !Array.isArray(local.animals) || local.animals.length === 0;
    if (!isEmpty) return;
    emitSync('auto-pulling');
    pullAllFromCloud().then(function (found) {
      if (found) {
        emitSync('auto-pulled');
        window.setTimeout(function () { window.location.reload(); }, 400);
      }
    }).catch(function (err) {
      emitSync('error', err);
    });
  }

  function pushAllToCloud(onProgress) {
    if (!configured) return Promise.reject(new Error('API non configurée.'));
    if (!currentSession) return Promise.reject(new Error('Non connecté.'));
    var state = readLocal();
    var hasAnimals = state && Array.isArray(state.animals) && state.animals.length > 0;
    var hasOwner = !!(state && state.owner && Object.keys(state.owner).some(function (k) { return state.owner[k]; }));
    if (!hasAnimals && !hasOwner) {
      return Promise.reject(new Error('Rien à synchroniser localement.'));
    }
    if (onProgress) onProgress('Synchronisation en cours...');
    var vetDirectory = readVetDirectory();
    return apiFetch('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({ state: state, vetDirectory: vetDirectory }),
    }).then(function () { return true; });
  }

  function pullAllFromCloud() {
    if (!configured) return Promise.reject(new Error('API non configurée.'));
    if (!currentSession) return Promise.reject(new Error('Non connecté.'));
    return apiFetch('/api/sync/pull', { method: 'GET' }).then(function (res) {
      if (!res.found) return false;
      writeLocal(res.state);
      if (res.vetDirectory) writeVetDirectory(res.vetDirectory);
      return true;
    });
  }

  function uploadPhoto(petLocalId, localId, blob, meta) {
    if (!configured || !currentSession) return Promise.reject(new Error('Non connecté.'));
    var fd = new FormData();
    fd.append('file', blob, 'photo.jpg');
    fd.append('petLocalId', String(petLocalId));
    if (localId != null) fd.append('localId', String(localId));
    if (meta && meta.caption) fd.append('caption', meta.caption);
    if (meta && meta.date) fd.append('date', meta.date);
    return apiFetch('/api/files', { method: 'POST', body: fd, headers: {} });
  }

  function getPhotoUrl(serverId) {
    return apiBase + '/api/files/' + serverId;
  }

  window.cloudSync = {
    isConfigured: isConfigured,
    register: register,
    login: login,
    signInWithEmail: function () {
      return Promise.reject(new Error('Utilise login(email, password) ou register(...).'));
    },
    signOut: signOut,
    getSession: getSession,
    onAuthChange: onAuthChange,
    pushAllToCloud: pushAllToCloud,
    pullAllFromCloud: pullAllFromCloud,
    subscribeToPush: subscribeToPush,
    unsubscribeFromPush: unsubscribeFromPush,
    getDogEventsReminderPref: getDogEventsReminderPref,
    setDogEventsReminderPref: setDogEventsReminderPref,
    uploadPhoto: uploadPhoto,
    getPhotoUrl: getPhotoUrl,
    api: apiFetch,
    refresh: refreshSessionFromCookie,
    signInWithGoogleCredential: signInWithGoogleCredential,
    loadGoogleScript: loadGoogleScript,
    googleClientId: function () { return (cfg && cfg.googleClientId) || ''; },
    onSyncEvent: function (cb) { syncListeners.push(cb); },
    lastSyncAt: function () { return localStorage.getItem('vetbook_last_sync'); },
  };

  function initUI() {
    var section = document.getElementById('cloud-sync-section');
    if (!section) return;
    if (!isConfigured()) { section.hidden = true; return; }

    var signedOutEl = document.getElementById('cloud-sync-signedout');
    var signedInEl = document.getElementById('cloud-sync-signedin');
    var emailInput = document.getElementById('cloud-sync-email');
    var passwordInput = document.getElementById('cloud-sync-password');
    var signinStatus = document.getElementById('cloud-sync-signin-status');
    var syncStatus = document.getElementById('cloud-sync-status');
    var btnSignin = document.getElementById('btn-cloud-sync-signin');
    var btnRegister = document.getElementById('btn-cloud-sync-register');
    var btnSignout = document.getElementById('btn-cloud-signout');
    var btnPush = document.getElementById('btn-cloud-push');
    var btnPull = document.getElementById('btn-cloud-pull');
    var googleContainer = document.getElementById('google-signin-container');
    var googleDivider = document.getElementById('cloud-sync-divider');
    var profileAvatar = document.getElementById('user-avatar');
    var profileAvatarDefault = profileAvatar ? profileAvatar.innerHTML : '';
    var navAvatar = document.getElementById('btn-user-nav');
    var navAvatarDefault = navAvatar ? navAvatar.innerHTML : '';

    function showStatus(el, msg, isError) {
      if (!el) return;
      el.textContent = msg;
      el.hidden = !msg;
      el.style.color = isError ? 'var(--color-error)' : '';
    }

    function renderAvatar(el, defaultHtml, pictureUrl) {
      if (!el) return;
      if (pictureUrl) {
        var img = document.createElement('img');
        img.src = pictureUrl;
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        el.innerHTML = '';
        el.appendChild(img);
      } else {
        el.innerHTML = defaultHtml;
      }
    }

    function renderAuthState(session) {
      var signedIn = !!session;
      if (btnSignout) btnSignout.hidden = !signedIn;
      var accountCaption = document.getElementById('account-cloud-caption');
      if (accountCaption) accountCaption.textContent = signedIn ? 'Compte connecté · sauvegarde serveur active' : 'Connectez-vous pour synchroniser vos carnets';
      if (signedOutEl) signedOutEl.hidden = signedIn;
      if (signedInEl) signedInEl.hidden = !signedIn;
      renderAvatar(profileAvatar, profileAvatarDefault, signedIn ? session.user.picture : '');
      renderAvatar(navAvatar, navAvatarDefault, signedIn ? session.user.picture : '');
      if (signedIn) showStatus(syncStatus, 'Synchronisation automatique activée — les changements sont sauvegardés sur le serveur.', false);
    }

    getSession().then(renderAuthState);
    onAuthChange(function (event, session) {
      renderAuthState(session);
      if (event === 'SIGNED_IN') showStatus(signinStatus, '', false);
    });

    onAutoSyncEvent = function (kind, err) {
      if (kind === 'pending') showStatus(syncStatus, 'Modifications en attente de sauvegarde...', false);
      else if (kind === 'synced') showStatus(syncStatus, 'Synchronisé avec le serveur.', false);
      else if (kind === 'auto-pulling') showStatus(syncStatus, 'Données trouvées sur le serveur, restauration...', false);
      else if (kind === 'auto-pulled') showStatus(syncStatus, 'Restauré depuis le serveur. Rechargement...', false);
      else if (kind === 'error') showStatus(syncStatus, 'Erreur de synchronisation : ' + (err && err.message), true);
    };

    if (googleContainer && cfg && cfg.googleClientId) {
      loadGoogleScript().then(function () {
        window.google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: function (response) {
            showStatus(signinStatus, 'Connexion avec Google...', false);
            signInWithGoogleCredential(response.credential).catch(function (err) {
              showStatus(signinStatus, 'Erreur : ' + err.message, true);
            });
          },
        });
        window.google.accounts.id.renderButton(googleContainer, {
          theme: 'outline', size: 'large', width: 300, text: 'continue_with', locale: 'fr',
        });
        googleContainer.hidden = false;
        if (googleDivider) googleDivider.hidden = false;
      }).catch(function (err) {
        console.warn('App\'lika: chargement Google Sign-In échoué', err);
      });
    }

    function readCredentials() {
      var email = (emailInput && emailInput.value || '').trim();
      var password = (passwordInput && passwordInput.value || '');
      return { email: email, password: password };
    }

    if (btnSignin) btnSignin.addEventListener('click', function () {
      var creds = readCredentials();
      if (!creds.email || !creds.password) { showStatus(signinStatus, 'Email et mot de passe requis.', true); return; }
      btnSignin.disabled = true;
      showStatus(signinStatus, 'Connexion...', false);
      login(creds.email, creds.password).then(function () {
        showStatus(signinStatus, '', false);
      }).catch(function (err) {
        showStatus(signinStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnSignin.disabled = false; });
    });

    if (btnRegister) btnRegister.addEventListener('click', function () {
      var creds = readCredentials();
      if (!creds.email || !creds.password) { showStatus(signinStatus, 'Email et mot de passe requis.', true); return; }
      if (creds.password.length < 8) { showStatus(signinStatus, 'Mot de passe : 8 caractères minimum.', true); return; }
      btnRegister.disabled = true;
      showStatus(signinStatus, 'Création du compte...', false);
      register(creds.email, creds.password).then(function () {
        showStatus(signinStatus, '', false);
      }).catch(function (err) {
        showStatus(signinStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnRegister.disabled = false; });
    });

    if (btnSignout) btnSignout.addEventListener('click', function () {
      signOut().then(function () { renderAuthState(null); });
    });

    if (btnPush) btnPush.addEventListener('click', function () {
      btnPush.disabled = true;
      showStatus(syncStatus, 'Sauvegarde en cours...', false);
      pushAllToCloud(function (msg) { showStatus(syncStatus, msg, false); }).then(function () {
        showStatus(syncStatus, 'Sauvegardé sur le serveur.', false);
      }).catch(function (err) {
        showStatus(syncStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnPush.disabled = false; });
    });

    if (btnPull) btnPull.addEventListener('click', function () {
      if (!window.confirm('Ça va remplacer les données locales de cet appareil par celles du serveur. Continuer ?')) return;
      btnPull.disabled = true;
      showStatus(syncStatus, 'Restauration en cours...', false);
      pullAllFromCloud().then(function (found) {
        if (!found) { showStatus(syncStatus, 'Aucune donnée trouvée sur le serveur pour ce compte.', true); return; }
        showStatus(syncStatus, 'Restauré. Rechargement...', false);
        window.setTimeout(function () { window.location.reload(); }, 600);
      }).catch(function (err) {
        showStatus(syncStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnPull.disabled = false; });
    });
  }

  if (configured) {
    currentSession = readSession();
    refreshSessionFromCookie().then(function (ok) {
      if (!ok && currentSession) {
        // Cookie absent/expiré : nettoie le cache local de session.
        currentSession = null;
        writeSession(null);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
