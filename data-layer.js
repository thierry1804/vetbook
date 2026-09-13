/**
 * App'lika — couche de synchronisation cloud (API maison + Neon), Phase B.
 *
 * Remplace l'ancienne intégration Supabase (supabase-js) par des appels
 * fetch vers la petite API serverless du projet (api/*.js) : la logique
 * de mapping champs locaux <-> colonnes cloud vit maintenant côté serveur
 * (voir api/_lib/mapping.js) ; ce fichier ne fait plus que l'auth (lien
 * magique + JWT de session) et les deux appels push/pull.
 *
 * Additif et optionnel : n'intercepte pas les fonctions existantes de
 * app.js (loadState/saveState). Lit et écrit directement les mêmes clés
 * localStorage ('vetbook_data', 'vetbook_vet_directory'), puis recharge
 * la page pour laisser app.js reprendre la main normalement.
 *
 * Sync automatique :
 * - Push : localStorage.setItem est intercepté ; toute écriture de
 *   'vetbook_data' (donc tout ajout/modif/suppression fait par app.js)
 *   programme un push debouncé (répété tant que ça change, envoyé
 *   AUTO_PUSH_DELAY_MS après la dernière modification) si connecté.
 * - Pull : à la connexion (ou session déjà active au chargement), si cet
 *   appareil n'a AUCUNE donnée locale, restauration automatique depuis le
 *   cloud. Si l'appareil a déjà des données locales, jamais d'écrasement
 *   automatique — les boutons manuels restent disponibles pour ce cas.
 *
 * Les photos (album) ne sont pas encore synchronisées : elles restent
 * uniquement en IndexedDB locale.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vetbook_data';
  var VET_DIRECTORY_KEY = 'vetbook_vet_directory';
  var SESSION_KEY = 'vetbook_cloud_session';

  var cfg = window.__SUPABASE_CONFIG__;
  // Le nom de la config globale est resté __SUPABASE_CONFIG__ pour ne pas
  // devoir toucher app.js (qui y lit vapidPublicKey) ; son contenu n'a
  // plus rien de Supabase : { apiBaseUrl?, vapidPublicKey }.
  var configured = !!cfg;
  var apiBase = (cfg && cfg.apiBaseUrl) || '';

  // ——— Local storage helpers ———
  var AUTO_PUSH_DELAY_MS = 4000;
  var suppressAutoPush = false;
  var autoPushTimer = null;
  var currentSession = null; // { token, userId, email } | null
  var authListeners = [];
  var onAutoSyncEvent = null; // hook set by initUI() to reflect status in the UI

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
    return session ? { user: { id: session.userId, email: session.email, name: session.name || '', picture: session.picture || '' } } : null;
  }

  function notifyAuthListeners(event) {
    var publicSession = toPublicSession(currentSession);
    authListeners.forEach(function (cb) { cb(event, publicSession); });
  }

  // Intercepte toute écriture de 'vetbook_data' faite par app.js (saveState)
  // pour programmer une sauvegarde cloud différée. N'affecte pas les autres
  // clés ; les écritures faites par writeLocal() ci-dessus sont exclues via
  // suppressAutoPush pour ne pas repousser en boucle ce qu'on vient de tirer.
  var nativeSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    nativeSetItem(key, value);
    if (key === STORAGE_KEY && !suppressAutoPush && configured && currentSession) {
      scheduleAutoPush();
    }
  };

  function scheduleAutoPush() {
    if (autoPushTimer) clearTimeout(autoPushTimer);
    if (onAutoSyncEvent) onAutoSyncEvent('pending');
    autoPushTimer = setTimeout(function () {
      autoPushTimer = null;
      pushAllToCloud().then(function () {
        if (onAutoSyncEvent) onAutoSyncEvent('synced');
      }).catch(function (err) {
        if (onAutoSyncEvent) onAutoSyncEvent('error', err);
      });
    }, AUTO_PUSH_DELAY_MS);
  }

  // ——— Client API ———
  function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (currentSession) headers.Authorization = 'Bearer ' + currentSession.token;
    return fetch(apiBase + path, Object.assign({}, options, { headers: headers })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || ('Erreur serveur (' + res.status + ')'));
        return body;
      });
    });
  }

  // ——— Auth ———
  function isConfigured() { return configured; }

  function signInWithEmail(email) {
    if (!configured) return Promise.reject(new Error('Synchronisation cloud non configurée (config.js manquant).'));
    return apiFetch('/api/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email: email }),
    }).then(function () { return true; });
  }

  function signOut() {
    currentSession = null;
    writeSession(null);
    notifyAuthListeners('SIGNED_OUT');
    return Promise.resolve();
  }

  function getSession() {
    return Promise.resolve(toPublicSession(currentSession));
  }

  function onAuthChange(cb) {
    authListeners.push(cb);
  }

  // ——— Connexion avec Google (Google Identity Services) ———
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

  // Échange le jeton Google (credential renvoyé par le bouton GIS) contre
  // un JWT de session App'lika — même mécanique que consumeLoginTokenFromUrl,
  // le rattachement compte email <-> compte Google est fait côté serveur
  // (api/auth/google.js).
  function signInWithGoogleCredential(credential) {
    return apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: credential }),
    }).then(function (res) {
      currentSession = { token: res.token, email: res.email, userId: res.userId, name: res.name, picture: res.picture };
      writeSession(currentSession);
      notifyAuthListeners('SIGNED_IN');
      maybeAutoPull();
      return true;
    });
  }

  // Vérifie un lien magique (?login_token=...) au chargement de la page,
  // remplace l'échange de session que faisait Supabase Auth automatiquement
  // au clic sur le lien.
  function consumeLoginTokenFromUrl() {
    if (!configured) return;
    var params = new URLSearchParams(window.location.search);
    var token = params.get('login_token');
    if (!token) return;

    params.delete('login_token');
    var cleanUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);

    if (onAutoSyncEvent) onAutoSyncEvent('auto-pulling');
    apiFetch('/api/auth/verify', { method: 'POST', body: JSON.stringify({ token: token }) })
      .then(function (res) {
        currentSession = { token: res.token, email: res.email, userId: res.userId, name: res.name, picture: res.picture };
        writeSession(currentSession);
        notifyAuthListeners('SIGNED_IN');
        maybeAutoPull();
      })
      .catch(function (err) {
        if (onAutoSyncEvent) onAutoSyncEvent('error', err);
      });
  }

  // ——— Push : abonnement de cet appareil ———
  function subscribeToPush(subscriptionJson) {
    if (!configured) return Promise.reject(new Error('Synchronisation cloud non configurée.'));
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

  // ——— Préférence de compte : rappel mensuel des événements canins ———
  function getDogEventsReminderPref() {
    if (!configured || !currentSession) return Promise.resolve(true);
    return apiFetch('/api/user/dog-events-reminder', { method: 'GET' }).then(function (res) {
      return !!res.dogEventsReminder;
    });
  }

  function setDogEventsReminderPref(value) {
    if (!configured) return Promise.reject(new Error('Synchronisation cloud non configurée.'));
    if (!currentSession) return Promise.reject(new Error('Non connecté.'));
    return apiFetch('/api/user/dog-events-reminder', {
      method: 'POST',
      body: JSON.stringify({ dogEventsReminder: !!value }),
    }).then(function () { return true; });
  }

  // Restauration auto si l'appareil est vierge. Ne s'exécute qu'une fois
  // par chargement de page (autoPullDone) : au-delà, on laisse les boutons
  // manuels décider pour ne jamais écraser en silence des données locales
  // déjà présentes.
  var autoPullDone = false;
  function maybeAutoPull() {
    if (autoPullDone || !currentSession) return;
    autoPullDone = true;
    var local = readLocal();
    var isEmpty = !local || !Array.isArray(local.animals) || local.animals.length === 0;
    if (!isEmpty) return;
    if (onAutoSyncEvent) onAutoSyncEvent('auto-pulling');
    pullAllFromCloud().then(function (found) {
      if (found) {
        if (onAutoSyncEvent) onAutoSyncEvent('auto-pulled');
        window.setTimeout(function () { window.location.reload(); }, 400);
      }
    }).catch(function (err) {
      if (onAutoSyncEvent) onAutoSyncEvent('error', err);
    });
  }

  // ——— Push : local -> cloud ———
  function pushAllToCloud(onProgress) {
    if (!configured) return Promise.reject(new Error('Synchronisation cloud non configurée.'));
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

  // ——— Pull : cloud -> local (remplace l'état local) ———
  function pullAllFromCloud() {
    if (!configured) return Promise.reject(new Error('Synchronisation cloud non configurée.'));
    if (!currentSession) return Promise.reject(new Error('Non connecté.'));
    return apiFetch('/api/sync/pull', { method: 'GET' }).then(function (res) {
      if (!res.found) return false;
      writeLocal(res.state);
      if (res.vetDirectory) writeVetDirectory(res.vetDirectory);
      return true;
    });
  }

  window.cloudSync = {
    isConfigured: isConfigured,
    signInWithEmail: signInWithEmail,
    signOut: signOut,
    getSession: getSession,
    onAuthChange: onAuthChange,
    pushAllToCloud: pushAllToCloud,
    pullAllFromCloud: pullAllFromCloud,
    subscribeToPush: subscribeToPush,
    unsubscribeFromPush: unsubscribeFromPush,
    getDogEventsReminderPref: getDogEventsReminderPref,
    setDogEventsReminderPref: setDogEventsReminderPref,
  };

  // ——— UI : section "Cloud & synchronisation" du profil utilisateur ———
  function initUI() {
    var section = document.getElementById('cloud-sync-section');
    if (!section) return;
    if (!isConfigured()) { section.hidden = true; return; }

    var signedOutEl = document.getElementById('cloud-sync-signedout');
    var signedInEl = document.getElementById('cloud-sync-signedin');
    var emailInput = document.getElementById('cloud-sync-email');
    var signinStatus = document.getElementById('cloud-sync-signin-status');
    var syncStatus = document.getElementById('cloud-sync-status');
    var btnSignin = document.getElementById('btn-cloud-sync-signin');
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

    // Affiche la photo du compte connecté (Google) dans un conteneur avatar,
    // ou restaure l'icône générique par défaut si aucune photo n'est
    // disponible (compte lien magique). Toujours via un <img> créé en DOM
    // (pas d'innerHTML avec l'URL) même si celle-ci vient du JWT Google déjà
    // vérifié côté serveur.
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
      if (accountCaption) accountCaption.textContent = signedIn ? 'Compte connecté · sauvegarde cloud disponible' : 'Connectez-vous pour retrouver vos carnets sur vos appareils';
      if (signedOutEl) signedOutEl.hidden = signedIn;
      if (signedInEl) signedInEl.hidden = !signedIn;
      // Avatar principal du profil (haut de l'écran) : app.js ne touche
      // jamais #user-avatar (seulement le nom/email, dérivés du profil
      // "propriétaire" local), donc pas de conflit à le mettre à jour ici.
      renderAvatar(profileAvatar, profileAvatarDefault, signedIn ? session.user.picture : '');
      // Bouton "Mon compte" du header.
      renderAvatar(navAvatar, navAvatarDefault, signedIn ? session.user.picture : '');
      if (signedIn) showStatus(syncStatus, 'Synchronisation automatique activée — tout changement est sauvegardé dans le cloud quelques secondes après.', false);
    }

    getSession().then(renderAuthState);
    onAuthChange(function (event, session) {
      renderAuthState(session);
      if (event === 'SIGNED_IN') showStatus(signinStatus, '', false);
    });

    onAutoSyncEvent = function (kind, err) {
      if (kind === 'pending') showStatus(syncStatus, 'Modifications en attente de sauvegarde...', false);
      else if (kind === 'synced') showStatus(syncStatus, 'Synchronisé avec le cloud.', false);
      else if (kind === 'auto-pulling') showStatus(syncStatus, 'Données trouvées dans le cloud, restauration...', false);
      else if (kind === 'auto-pulled') showStatus(syncStatus, 'Restauré depuis le cloud. Rechargement...', false);
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

    if (btnSignin) btnSignin.addEventListener('click', function () {
      var email = (emailInput && emailInput.value || '').trim();
      if (!email) { showStatus(signinStatus, 'Entre ton email.', true); return; }
      btnSignin.disabled = true;
      showStatus(signinStatus, 'Envoi du lien...', false);
      signInWithEmail(email).then(function () {
        showStatus(signinStatus, 'Lien envoyé — vérifie ta boîte mail et clique dessus pour te connecter.', false);
      }).catch(function (err) {
        showStatus(signinStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnSignin.disabled = false; });
    });

    if (btnSignout) btnSignout.addEventListener('click', function () {
      signOut().then(function () { renderAuthState(null); });
    });

    if (btnPush) btnPush.addEventListener('click', function () {
      btnPush.disabled = true;
      showStatus(syncStatus, 'Sauvegarde en cours...', false);
      pushAllToCloud(function (msg) { showStatus(syncStatus, msg, false); }).then(function () {
        showStatus(syncStatus, 'Sauvegardé dans le cloud.', false);
      }).catch(function (err) {
        showStatus(syncStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnPush.disabled = false; });
    });

    if (btnPull) btnPull.addEventListener('click', function () {
      if (!window.confirm('Ça va remplacer les données locales de cet appareil par celles du cloud. Continuer ?')) return;
      btnPull.disabled = true;
      showStatus(syncStatus, 'Restauration en cours...', false);
      pullAllFromCloud().then(function (found) {
        if (!found) { showStatus(syncStatus, 'Aucune donnée trouvée dans le cloud pour ce compte.', true); return; }
        showStatus(syncStatus, 'Restauré. Rechargement...', false);
        window.setTimeout(function () { window.location.reload(); }, 600);
      }).catch(function (err) {
        showStatus(syncStatus, 'Erreur : ' + err.message, true);
      }).finally(function () { btnPull.disabled = false; });
    });
  }

  if (configured) {
    currentSession = readSession();
    consumeLoginTokenFromUrl();
    if (currentSession) {
      // Session déjà active au chargement (retour sur l'appareil) : même
      // logique de restauration auto que juste après une connexion.
      window.setTimeout(function () { notifyAuthListeners('SIGNED_IN'); maybeAutoPull(); }, 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
