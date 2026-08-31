/**
 * VetBook — couche de synchronisation cloud (Supabase), Phase B.
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

  var cfg = window.__SUPABASE_CONFIG__;
  var client = (cfg && cfg.url && cfg.anonKey && window.supabaseSdk)
    ? window.supabaseSdk.createClient(cfg.url, cfg.anonKey)
    : null;

  // ——— Mapping local (camelCase) <-> colonnes cloud (snake_case) ———
  // [clé locale, colonne cloud]
  var ANIMAL_FIELDS = [
    ['name', 'name'], ['species', 'species'], ['race', 'race'], ['sex', 'sex'],
    ['dob', 'dob'], ['weight', 'weight'], ['color', 'color'], ['chip', 'chip'],
    ['sterilise', 'sterilise'], ['notes', 'notes'], ['height', 'height'],
    ['themeColor', 'theme_color'], ['avatar', 'avatar'],
  ];
  var OWNER_FIELDS = [['name', 'name'], ['phone', 'phone'], ['email', 'email'], ['clinic', 'clinic'], ['address', 'address']];
  var PEDIGREE_FIELDS = [
    ['registry', 'registry'], ['registryNumber', 'registry_number'], ['chipNumber', 'chip_number'],
  ];
  var NUTRITION_PLAN_FIELDS = [['targetCalories', 'target_calories'], ['mealsPerDay', 'meals_per_day'], ['foodBrand', 'food_brand'], ['portionSize', 'portion_size']];
  var NOTIF_FIELDS = [
    ['vaccineReminder', 'vaccine_reminder'], ['dewormingReminder', 'deworming_reminder'],
    ['hygieneReminder', 'hygiene_reminder'], ['birthdayReminder', 'birthday_reminder'], ['monthlySummary', 'monthly_summary'],
  ];

  // [clé du tableau local sur le wrapper animal, table cloud, colonnes]
  var CHILD_ARRAYS = [
    ['vaccines', 'vaccinations', [['date', 'date'], ['name', 'name'], ['next', 'next'], ['frequencyDays', 'frequency_days'], ['vet', 'vet']]],
    ['dewormings', 'dewormings', [['date', 'date'], ['name', 'name'], ['next', 'next'], ['frequencyDays', 'frequency_days'], ['type', 'type']]],
    ['consultations', 'consultations', [['date', 'date'], ['vet', 'vet'], ['reason', 'reason'], ['diagnosis', 'diagnosis'], ['treatment', 'treatment'], ['cost', 'cost'], ['notes', 'notes']]],
    ['medications', 'medications', [['name', 'name'], ['dosage', 'dosage'], ['frequency', 'frequency'], ['startDate', 'start_date'], ['endDate', 'end_date'], ['notes', 'notes'], ['active', 'active']]],
    ['hygiene', 'hygiene_events', [['type', 'type'], ['date', 'date'], ['next', 'next'], ['frequencyDays', 'frequency_days'], ['notes', 'notes']]],
    ['activities', 'activities', [['date', 'date'], ['type', 'type'], ['duration', 'duration'], ['distance', 'distance'], ['notes', 'notes']]],
    ['heatCycles', 'heat_cycles', [['startDate', 'start_date'], ['endDate', 'end_date'], ['intensity', 'intensity'], ['notes', 'notes']]],
    ['notes', 'journal_notes', [['date', 'date'], ['title', 'title'], ['content', 'content'], ['category', 'category']]],
  ];
  var VET_CONTACT_FIELDS = [
    ['name', 'name'], ['clinic', 'clinic'], ['phone', 'phone'], ['email', 'email'], ['address', 'address'],
    ['lat', 'lat'], ['lng', 'lng'], ['hours', 'hours'], ['emergency', 'emergency'], ['favorite', 'favorite'], ['notes', 'notes'],
  ];

  function toRow(obj, fields, extra) {
    var row = Object.assign({}, extra);
    fields.forEach(function (pair) {
      var v = obj[pair[0]];
      row[pair[1]] = (v === '' || v === undefined) ? null : v;
    });
    return row;
  }

  function fromRow(row, fields, idAsLocalId) {
    var obj = {};
    fields.forEach(function (pair) { obj[pair[0]] = row[pair[1]] == null ? '' : row[pair[1]]; });
    if (idAsLocalId) obj.id = row.local_id;
    return obj;
  }

  // ——— Local storage helpers ———
  var AUTO_PUSH_DELAY_MS = 4000;
  var suppressAutoPush = false;
  var autoPushTimer = null;
  var currentSession = null;
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

  // Intercepte toute écriture de 'vetbook_data' faite par app.js (saveState)
  // pour programmer une sauvegarde cloud différée. N'affecte pas les autres
  // clés ; les écritures faites par writeLocal() ci-dessus sont exclues via
  // suppressAutoPush pour ne pas repousser en boucle ce qu'on vient de tirer.
  var nativeSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    nativeSetItem(key, value);
    if (key === STORAGE_KEY && !suppressAutoPush && client && currentSession) {
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

  // ——— Auth ———
  function isConfigured() { return !!client; }

  function signInWithEmail(email) {
    if (!client) return Promise.reject(new Error('Supabase non configuré (config.js manquant).'));
    return client.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  function signOut() { return client ? client.auth.signOut() : Promise.resolve(); }

  function getSession() {
    if (!client) return Promise.resolve(null);
    return client.auth.getSession().then(function (res) { return res.data.session || null; });
  }

  function onAuthChange(cb) {
    if (!client) return;
    client.auth.onAuthStateChange(function (event, session) { cb(event, session); });
  }

  // Suivi interne de la session + pull auto si l'appareil est vierge.
  // Ne s'exécute qu'une fois par chargement de page (autoPullDone) : au-delà,
  // on laisse les boutons manuels décider pour ne jamais écraser en silence
  // des données locales déjà présentes.
  var autoPullDone = false;
  if (client) {
    client.auth.onAuthStateChange(function (event, session) {
      currentSession = session;
      if (session && !autoPullDone) {
        autoPullDone = true;
        var local = readLocal();
        var isEmpty = !local || !Array.isArray(local.animals) || local.animals.length === 0;
        if (isEmpty) {
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
      }
    });
  }

  // ——— Push : local -> cloud ———
  function pushAllToCloud(onProgress) {
    if (!client) return Promise.reject(new Error('Supabase non configuré.'));
    var state = readLocal();
    if (!state || !Array.isArray(state.animals) || state.animals.length === 0) {
      return Promise.reject(new Error('Rien à synchroniser localement.'));
    }
    var report = function (msg) { if (onProgress) onProgress(msg); };

    return getSession().then(function (session) {
      if (!session) throw new Error('Non connecté.');
      var userId = session.user.id;

      var ownerSource = (state.animals[0] && state.animals[0].owner) || {};
      var ownerRow = toRow(ownerSource, OWNER_FIELDS, { user_id: userId });
      var chain = client.from('owners').upsert(ownerRow, { onConflict: 'user_id' });

      state.animals.forEach(function (wrapper) {
        chain = chain.then(function () {
          report('Animal : ' + (wrapper.animal && wrapper.animal.name));
          var petRow = toRow(wrapper.animal || {}, ANIMAL_FIELDS, { user_id: userId, local_id: wrapper.id });
          return client.from('pets').upsert(petRow, { onConflict: 'user_id,local_id' }).select('id').single();
        }).then(function (res) {
          if (res.error) throw res.error;
          var petId = res.data.id;
          var subChain = Promise.resolve();

          CHILD_ARRAYS.forEach(function (spec) {
            var localKey = spec[0], table = spec[1], fields = spec[2];
            var items = Array.isArray(wrapper[localKey]) ? wrapper[localKey] : [];
            if (items.length === 0) return;
            var rows = items.map(function (item) {
              return toRow(item, fields, { pet_id: petId, user_id: userId, local_id: item.id });
            });
            subChain = subChain.then(function () {
              return client.from(table).upsert(rows, { onConflict: 'pet_id,local_id' });
            }).then(function (res2) { if (res2.error) throw res2.error; });
          });

          var weightHistory = (wrapper.animal && Array.isArray(wrapper.animal.weightHistory)) ? wrapper.animal.weightHistory : [];
          if (weightHistory.length) {
            var whRows = weightHistory.map(function (w) {
              return { pet_id: petId, user_id: userId, local_id: w.id, date: w.date, weight: w.weight };
            });
            subChain = subChain.then(function () { return client.from('weight_history').upsert(whRows, { onConflict: 'pet_id,local_id' }); })
              .then(function (res2) { if (res2.error) throw res2.error; });
          }

          var meals = (wrapper.nutrition && Array.isArray(wrapper.nutrition.meals)) ? wrapper.nutrition.meals : [];
          if (meals.length) {
            var mealRows = meals.map(function (m) {
              return toRow(m, [['date', 'date'], ['type', 'type'], ['time', 'time'], ['food', 'food'], ['quantity', 'quantity'], ['unit', 'unit']], { pet_id: petId, user_id: userId, local_id: m.id });
            });
            subChain = subChain.then(function () { return client.from('nutrition_meals').upsert(mealRows, { onConflict: 'pet_id,local_id' }); })
              .then(function (res2) { if (res2.error) throw res2.error; });
          }

          if (wrapper.nutrition && wrapper.nutrition.dailyPlan) {
            var planRow = toRow(wrapper.nutrition.dailyPlan, NUTRITION_PLAN_FIELDS, { pet_id: petId, user_id: userId });
            subChain = subChain.then(function () { return client.from('nutrition_daily_plan').upsert(planRow, { onConflict: 'pet_id' }); })
              .then(function (res2) { if (res2.error) throw res2.error; });
          }

          if (wrapper.pedigree) {
            var ped = wrapper.pedigree;
            var pedRow = toRow(ped, PEDIGREE_FIELDS, {
              pet_id: petId, user_id: userId,
              sire_name: ped.sire && ped.sire.name, sire_registry: ped.sire && ped.sire.registry,
              dam_name: ped.dam && ped.dam.name, dam_registry: ped.dam && ped.dam.registry,
              paternal_grandsire: ped.grandparents && ped.grandparents.paternalGrandsire,
              paternal_granddam: ped.grandparents && ped.grandparents.paternalGranddam,
              maternal_grandsire: ped.grandparents && ped.grandparents.maternalGrandsire,
              maternal_granddam: ped.grandparents && ped.grandparents.maternalGranddam,
            });
            subChain = subChain.then(function () { return client.from('pedigree').upsert(pedRow, { onConflict: 'pet_id' }); })
              .then(function (res2) { if (res2.error) throw res2.error; });
          }

          if (wrapper.notifications) {
            var notifRow = toRow(wrapper.notifications, NOTIF_FIELDS, { pet_id: petId, user_id: userId });
            subChain = subChain.then(function () { return client.from('notification_prefs').upsert(notifRow, { onConflict: 'pet_id' }); })
              .then(function (res2) { if (res2.error) throw res2.error; });
          }

          return subChain;
        });
      });

      var dir = readVetDirectory();
      if (dir && Array.isArray(dir.entries) && dir.entries.length) {
        chain = chain.then(function () {
          report('Carnet vétérinaires');
          var rows = dir.entries.map(function (e) {
            return toRow(e, VET_CONTACT_FIELDS, { user_id: userId, local_id: e.id });
          });
          return client.from('vet_contacts').upsert(rows, { onConflict: 'user_id,local_id' });
        }).then(function (res2) { if (res2.error) throw res2.error; });
      }

      return chain;
    });
  }

  // ——— Pull : cloud -> local (remplace l'état local) ———
  function pullAllFromCloud() {
    if (!client) return Promise.reject(new Error('Supabase non configuré.'));
    return getSession().then(function (session) {
      if (!session) throw new Error('Non connecté.');
      var userId = session.user.id;

      return Promise.all([
        client.from('pets').select('*').order('created_at', { ascending: true }),
        client.from('owners').select('*').eq('user_id', userId).maybeSingle(),
        client.from('vet_contacts').select('*').eq('user_id', userId),
      ]).then(function (results) {
        var petsRes = results[0], ownerRes = results[1], vetsRes = results[2];
        if (petsRes.error) throw petsRes.error;
        if (ownerRes.error) throw ownerRes.error;
        if (vetsRes.error) throw vetsRes.error;

        var pets = petsRes.data || [];
        if (pets.length === 0) return null; // rien dans le cloud

        var ownerObj = ownerRes.data ? fromRow(ownerRes.data, OWNER_FIELDS) : { name: '', phone: '', email: '', clinic: '', address: '' };

        return Promise.all(pets.map(function (pet) {
          var petId = pet.id;
          var childQueries = CHILD_ARRAYS.map(function (spec) {
            return client.from(spec[1]).select('*').eq('pet_id', petId).order('local_id', { ascending: true });
          });
          childQueries.push(client.from('weight_history').select('*').eq('pet_id', petId).order('local_id', { ascending: true }));
          childQueries.push(client.from('nutrition_meals').select('*').eq('pet_id', petId).order('local_id', { ascending: true }));
          childQueries.push(client.from('nutrition_daily_plan').select('*').eq('pet_id', petId).maybeSingle());
          childQueries.push(client.from('pedigree').select('*').eq('pet_id', petId).maybeSingle());
          childQueries.push(client.from('notification_prefs').select('*').eq('pet_id', petId).maybeSingle());

          return Promise.all(childQueries).then(function (results2) {
            results2.forEach(function (r) { if (r.error) throw r.error; });

            var wrapper = { id: pet.local_id, owner: ownerObj, photos: [] };
            wrapper.animal = fromRow(pet, ANIMAL_FIELDS);
            wrapper.animal.weightHistory = (results2[CHILD_ARRAYS.length].data || []).map(function (w) {
              return { id: w.local_id, date: w.date, weight: w.weight };
            });

            CHILD_ARRAYS.forEach(function (spec, i) {
              var localKey = spec[0], fields = spec[2];
              wrapper[localKey] = (results2[i].data || []).map(function (row) { return fromRow(row, fields, true); });
            });

            var mealsData = results2[CHILD_ARRAYS.length + 1].data || [];
            var planData = results2[CHILD_ARRAYS.length + 2].data;
            wrapper.nutrition = {
              meals: mealsData.map(function (m) { return fromRow(m, [['date', 'date'], ['type', 'type'], ['time', 'time'], ['food', 'food'], ['quantity', 'quantity'], ['unit', 'unit']], true); }),
              dailyPlan: planData ? fromRow(planData, NUTRITION_PLAN_FIELDS) : { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' },
            };

            var pedData = results2[CHILD_ARRAYS.length + 3].data;
            wrapper.pedigree = pedData ? {
              registry: pedData.registry || 'Non inscrit', registryNumber: pedData.registry_number || '', chipNumber: pedData.chip_number || '',
              sire: { name: pedData.sire_name || '', registry: pedData.sire_registry || '' },
              dam: { name: pedData.dam_name || '', registry: pedData.dam_registry || '' },
              grandparents: {
                paternalGrandsire: pedData.paternal_grandsire || '', paternalGranddam: pedData.paternal_granddam || '',
                maternalGrandsire: pedData.maternal_grandsire || '', maternalGranddam: pedData.maternal_granddam || '',
              },
            } : null;

            var notifData = results2[CHILD_ARRAYS.length + 4].data;
            wrapper.notifications = notifData ? fromRow(notifData, NOTIF_FIELDS) : {};

            return wrapper;
          });
        })).then(function (wrappers) {
          var maxId = 20;
          wrappers.forEach(function (w) {
            maxId = Math.max(maxId, w.id || 0);
            CHILD_ARRAYS.forEach(function (spec) { (w[spec[0]] || []).forEach(function (it) { maxId = Math.max(maxId, it.id || 0); }); });
            (w.animal.weightHistory || []).forEach(function (it) { maxId = Math.max(maxId, it.id || 0); });
            (w.nutrition.meals || []).forEach(function (it) { maxId = Math.max(maxId, it.id || 0); });
          });

          var newState = { animals: wrappers, nextId: maxId + 1, currentAnimalId: wrappers[0] ? wrappers[0].id : null };
          writeLocal(newState);

          var vets = vetsRes.data || [];
          if (vets.length) {
            var dirMaxId = 10;
            var entries = vets.map(function (row) {
              var e = fromRow(row, VET_CONTACT_FIELDS, true);
              dirMaxId = Math.max(dirMaxId, e.id || 0);
              return e;
            });
            writeVetDirectory({ entries: entries, nextId: dirMaxId + 1 });
          }

          return true;
        });
      });
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
    var emailDisplay = document.getElementById('cloud-sync-email-display');
    var syncStatus = document.getElementById('cloud-sync-status');
    var btnSignin = document.getElementById('btn-cloud-sync-signin');
    var btnSignout = document.getElementById('btn-cloud-signout');
    var btnPush = document.getElementById('btn-cloud-push');
    var btnPull = document.getElementById('btn-cloud-pull');

    function showStatus(el, msg, isError) {
      if (!el) return;
      el.textContent = msg;
      el.hidden = !msg;
      el.style.color = isError ? 'var(--color-error)' : '';
    }

    function renderAuthState(session) {
      var signedIn = !!session;
      if (signedOutEl) signedOutEl.hidden = signedIn;
      if (signedInEl) signedInEl.hidden = !signedIn;
      if (signedIn && emailDisplay) emailDisplay.textContent = session.user.email || '';
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
