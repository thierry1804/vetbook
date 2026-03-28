/**
 * VetBook — Carnet de Santé Animal
 * Application web : gestion du profil animal, vaccins, déparasitage, photos, alertes.
 * Données persistées dans localStorage.
 */

(function () {
  'use strict';

  // ——— i18n ———————————————————————————————————————————————————
  var locales = {};
  locales.fr = {
    appName: 'VetBook',
    home: 'Mes animaux',
    profile: 'Profil',
    vaccines: 'Vaccins',
    deworming: 'Déparasitage',
    photos: 'Photos',
    alerts: 'Alertes',
    history: 'Historique',
    consultations: 'Consultations',
    journal: 'Journal',
    medications: 'Médicaments',
    calendar: 'Calendrier',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search: 'Recherche',
    noData: 'Aucune donnée',
    overdue: 'En retard',
    soon: 'Bientôt',
    upToDate: 'À jour',
    today: "Aujourd'hui",
    daysAgo: 'il y a {0} jour(s)',
    daysFromNow: 'dans {0} jour(s)',
    weeksFromNow: 'dans {0} semaine(s)',
    monthsFromNow: 'dans {0} mois',
    birthday: 'Joyeux anniversaire {0} !',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ?',
    lastAnimal: 'Impossible de supprimer le dernier animal.',
    welcome: 'Bienvenue sur VetBook !',
    onboardingDesc: 'VetBook est votre carnet de santé animal numérique.',
    printTitle: 'Carnet de santé — {0}',
    shareTitle: 'Carnet de santé de {0}',
    noVaccines: 'Aucun vaccin enregistré pour {0}',
    noDewormings: 'Aucun déparasitage enregistré pour {0}',
    noPhotos: 'Aucune photo enregistrée pour {0}',
    noConsultations: 'Aucune consultation enregistrée pour {0}',
    noNotes: 'Aucune note enregistrée pour {0}',
    noMedications: 'Aucun médicament enregistré pour {0}',
    profileComplete: '{0}% complété',
    completeFiche: 'Complétez votre fiche !'
  };

  var currentLocale = 'fr';

  function t(key) {
    var str = (locales[currentLocale] && locales[currentLocale][key]) || key;
    for (var i = 1; i < arguments.length; i++) {
      str = str.replace('{' + (i - 1) + '}', arguments[i]);
    }
    return str;
  }

  // ——— Constants ——————————————————————————————————————————————
  var STORAGE_KEY = 'vetbook_data';
  var THEME_KEY = 'vetbook_theme';
  var NOTIF_CHECK_KEY = 'vetbook_notif_last_check';
  var ONBOARDING_KEY = 'vetbook_onboarding_done';

  var DEFAULT_ANIMAL = {
    id: 1,
    animal: {
      name: '',
      species: 'Canine',
      race: '',
      sex: 'Mâle',
      dob: '',
      weight: null,
      weightHistory: [],
      color: '',
      chip: '',
      sterilise: 'Non',
      notes: '',
      avatar: null,
      themeColor: ''
    },
    owner: {
      name: '',
      phone: '',
      email: '',
      clinic: '',
      address: ''
    },
    photos: [],
    vaccines: [],
    dewormings: [],
    consultations: [],
    medications: [],
    notes: [],
    hygiene: [],
    heatCycles: [],
    activities: [],
    nutrition: { meals: [], dailyPlan: { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' } },
    pedigree: { registry: 'Non inscrit', registryNumber: '', chipNumber: '', sire: { name: '', registry: '' }, dam: { name: '', registry: '' }, grandparents: { paternalGrandsire: '', paternalGranddam: '', maternalGrandsire: '', maternalGranddam: '' } },
    notifications: {
      vaccineReminder: true,
      dewormingReminder: true,
      hygieneReminder: true,
      birthdayReminder: true,
      monthlySummary: false
    }
  };

  var VET_DIRECTORY_KEY = 'vetbook_vet_directory';
  var COMMUNITY_KEY = 'vetbook_community';

  // ——— Community: default events & tips ———
  var DEFAULT_DOG_EVENTS = [
    { id: 1, title: 'Salon International de l\'Agriculture', month: 2, day: 22, description: 'Concours canins et présentation de races au SIA, Paris.', recurring: true },
    { id: 2, title: 'Exposition Canine de Paris', month: 3, day: 8, description: 'Exposition internationale organisée par la SCC.', recurring: true },
    { id: 3, title: 'Journée mondiale du chien de sauvetage', month: 4, day: 28, description: 'Célébration des chiens de recherche et sauvetage.', recurring: true },
    { id: 4, title: 'Journée mondiale des animaux de compagnie', month: 4, day: 11, description: 'Journée dédiée à nos compagnons.', recurring: true },
    { id: 5, title: 'Fête de la Nature', month: 5, day: 22, description: 'Sorties canines en pleine nature dans toute la France.', recurring: true },
    { id: 6, title: 'Game Fair', month: 6, day: 14, description: 'Grand rassemblement autour de la chasse et des chiens de travail.', recurring: true },
    { id: 7, title: 'Journée mondiale du chien', month: 8, day: 26, description: 'La journée internationale dédiée à nos meilleurs amis !', recurring: true },
    { id: 8, title: 'Septembre : mois de l\'adoption', month: 9, day: 1, description: 'Campagnes d\'adoption dans les refuges partout en France.', recurring: true },
    { id: 9, title: 'Journée mondiale des animaux', month: 10, day: 4, description: 'Sensibilisation au bien-être animal dans le monde.', recurring: true },
    { id: 10, title: 'Exposition Canine d\'Automne', month: 10, day: 19, description: 'Exposition nationale d\'automne, Paris-Villepinte.', recurring: true },
    { id: 11, title: 'Semaine Vétérinaire', month: 11, day: 18, description: 'Semaine de sensibilisation à la santé animale.', recurring: true },
    { id: 12, title: 'Journée du bénévolat animalier', month: 12, day: 5, description: 'Bénévolat dans les refuges et associations.', recurring: true },
    { id: 13, title: 'Noël des animaux', month: 12, day: 24, description: 'Collectes et dons pour les animaux des refuges.', recurring: true }
  ];

  var DEFAULT_TIPS = [
    { id: 1, title: 'Vérifiez les gencives régulièrement', content: 'Des gencives roses et humides sont signe de bonne santé. Des gencives pâles, bleues ou jaunes nécessitent une visite vétérinaire.', category: 'sante', author: 'VetBook' },
    { id: 2, title: 'Rappels de vaccins annuels', content: 'N\'oubliez pas les rappels annuels (DHPPi, Leptospirose, Rage). Consultez votre vétérinaire pour le protocole adapté.', category: 'sante', author: 'VetBook' },
    { id: 3, title: 'Évitez les aliments toxiques', content: 'Chocolat, raisins, oignons, ail, xylitol et noix de macadamia sont toxiques pour les chiens. Gardez-les hors de portée.', category: 'alimentation', author: 'VetBook' },
    { id: 4, title: 'Transition alimentaire progressive', content: 'Changez la nourriture sur 7 à 10 jours en mélangeant progressivement l\'ancien et le nouveau aliment.', category: 'alimentation', author: 'VetBook' },
    { id: 5, title: 'Eau fraîche toujours disponible', content: 'Un chien doit boire environ 50-70 ml d\'eau par kg de poids par jour. Renouvelez l\'eau régulièrement.', category: 'alimentation', author: 'VetBook' },
    { id: 6, title: 'Socialisation avant 4 mois', content: 'La période critique de socialisation est entre 3 et 14 semaines. Exposez votre chiot à différentes personnes, animaux et environnements.', category: 'education', author: 'VetBook' },
    { id: 7, title: 'Renforcement positif', content: 'Récompensez les bons comportements plutôt que de punir les mauvais. Friandises, caresses et jeu sont vos meilleurs outils.', category: 'education', author: 'VetBook' },
    { id: 8, title: 'Brossage dentaire 2-3 fois/semaine', content: 'Le tartre s\'accumule vite. Utilisez un dentifrice spécial chien (jamais de dentifrice humain) et une brosse adaptée.', category: 'hygiene', author: 'VetBook' },
    { id: 9, title: 'Coupe des griffes régulière', content: 'Coupez les griffes toutes les 2-4 semaines. Si vous entendez les griffes cliquer sur le sol, elles sont trop longues.', category: 'hygiene', author: 'VetBook' },
    { id: 10, title: 'Nettoyage des oreilles', content: 'Nettoyez les oreilles toutes les semaines, surtout pour les races à oreilles tombantes. Utilisez un produit auriculaire vétérinaire.', category: 'hygiene', author: 'VetBook' },
    { id: 11, title: 'Signes de stress à surveiller', content: 'Bâillements fréquents, léchage des babines, queue entre les pattes, oreilles plaquées : votre chien peut être stressé.', category: 'comportement', author: 'VetBook' },
    { id: 12, title: 'Exercice quotidien adapté', content: 'Un chien adulte a besoin de 30 min à 2h d\'exercice par jour selon sa race. Variez les activités : marche, jeu, nage.', category: 'comportement', author: 'VetBook' },
    { id: 13, title: 'Protection anti-parasitaire toute l\'année', content: 'Les puces et tiques sont actives même en hiver. Maintenez un traitement antiparasitaire régulier toute l\'année.', category: 'sante', author: 'VetBook' },
    { id: 14, title: 'Attention au coup de chaleur', content: 'Ne laissez jamais un chien dans une voiture fermée. Signes : halètement excessif, bave, titubation. Refroidissez progressivement.', category: 'sante', author: 'VetBook' },
    { id: 15, title: 'Enrichissement mental', content: 'Jouets distributeurs, jeux de flair, tricks : un chien mentalement stimulé est un chien équilibré et heureux.', category: 'comportement', author: 'VetBook' }
  ];

  // ——— LOF/LOMAD validation patterns ———
  var LOF_PATTERN = /^\d{1,3}\s?\d{3}\/\d{4,5}$/;
  var LOMAD_PATTERN = /^\d{6,15}$/;

  // Vaccine suggestions by species
  var VACCINE_DB = {
    Canine: [
      'Nobivac DHPPi', 'Nobivac Rabies', 'Nobivac L4', 'Nobivac KC',
      'Eurican DHPPi2-LR', 'Eurican DHPPi2-L', 'Eurican Herpes',
      'Canigen DHPPi/L', 'Canigen R', 'Vanguard Plus 5',
      'Rabisin', 'Versican Plus DHPPi/L4R'
    ],
    'Féline': [
      'Purevax RCPCh', 'Purevax RCP', 'Purevax FeLV',
      'Nobivac Tricat Trio', 'Nobivac Rabies',
      'Felocell CVR', 'Leucofeligen FeLV/RCP',
      'Rabisin', 'Versifel CVR'
    ],
    Autre: []
  };

  var state = {
    animals: [],
    nextId: 20,
    currentAnimalId: null,
    viewMode: 'home'
  };

  var uiState = {
    editVaccineId: null,
    editDewormingId: null,
    editWeightEntryId: null,
    editConsultId: null,
    editMedicationId: null,
    editNoteId: null,
    editCaptionPhotoId: null,
    editHygieneId: null,
    editHeatCycleId: null,
    editActivityId: null,
    editMealId: null,
    editVetContactId: null,
    userLat: null,
    userLng: null,
    geoSortActive: false,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth()
  };

  // ——— Helpers —————————————————————————————————————————————
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function relativeDate(isoDate) {
    if (!isoDate) return '';
    var dt = isoToLocalDate(isoDate);
    if (!dt) return '';
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = Math.round((dt - todayMid) / 864e5);
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return 'demain';
    if (diff === -1) return 'hier';
    if (diff > 0 && diff <= 7) return 'dans ' + diff + 'j';
    if (diff > 7 && diff <= 30) return 'dans ' + Math.round(diff / 7) + ' sem.';
    if (diff > 30) return 'dans ' + Math.round(diff / 30) + ' mois';
    if (diff < 0 && diff >= -30) return 'il y a ' + Math.abs(diff) + 'j';
    if (diff < -30) return 'il y a ' + Math.round(Math.abs(diff) / 30) + ' mois';
    return '';
  }

  function addDaysISO(dateStr, days) {
    if (!dateStr) return '';
    var n = parseInt(days, 10);
    if (isNaN(n)) return '';
    var d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function getStatus(nextDate) {
    if (!nextDate) return null;
    var dt = isoToLocalDate(nextDate);
    if (!dt) return null;
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = (dt - todayMid) / 864e5;
    if (diff < 0) return { cls: 'status-overdue', lbl: t('overdue') };
    if (diff <= 30) return { cls: 'status-soon', lbl: t('soon') };
    return { cls: 'status-ok', lbl: t('upToDate') };
  }

  function isoToLocalDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return null;
    var parts = isoDate.split('-').map(function (x) { return parseInt(x, 10); });
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  // ——— Toast system ————————————————————————————————————————
  function showToast(message, type, duration) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () { toast.remove(); }, 300);
    }, duration || 3500);
  }

  // ——— State management ————————————————————————————————————
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.animals = parsed.animals || [];
        state.nextId = Math.max(state.nextId, parsed.nextId || 20);
        state.currentAnimalId = parsed.currentAnimalId != null ? parsed.currentAnimalId : (state.animals[0]?.id ?? null);
      }
      if (state.animals.length === 0) {
        return false; // Signal that we need onboarding
      }
      if (!state.animals.some(function (a) { return a.id === state.currentAnimalId; })) {
        state.currentAnimalId = state.animals[0].id;
      }
      // Backward compatibility
      state.animals.forEach(function (a) {
        if (!a || !a.animal) return;
        if (!Array.isArray(a.animal.weightHistory)) a.animal.weightHistory = [];
        if (!Array.isArray(a.consultations)) a.consultations = [];
        if (!Array.isArray(a.medications)) a.medications = [];
        if (!Array.isArray(a.notes)) a.notes = [];
        if (!Array.isArray(a.hygiene)) a.hygiene = [];
        if (!Array.isArray(a.heatCycles)) a.heatCycles = [];
        if (!Array.isArray(a.activities)) a.activities = [];
        if (!a.nutrition) a.nutrition = { meals: [], dailyPlan: { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' } };
        if (!Array.isArray(a.nutrition.meals)) a.nutrition.meals = [];
        if (!a.nutrition.dailyPlan) a.nutrition.dailyPlan = { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' };
        if (!a.pedigree) a.pedigree = { registry: 'Non inscrit', registryNumber: '', chipNumber: '', sire: { name: '', registry: '' }, dam: { name: '', registry: '' }, grandparents: { paternalGrandsire: '', paternalGranddam: '', maternalGrandsire: '', maternalGranddam: '' } };
        if (!a.animal.themeColor) a.animal.themeColor = '';
        if (!a.notifications) a.notifications = {};
        if (a.notifications.hygieneReminder === undefined) a.notifications.hygieneReminder = true;
      });
      return true;
    } catch (e) {
      console.warn('VetBook: erreur lecture localStorage', e);
      return false;
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
    return state.animals.find(function (a) { return a.id === state.currentAnimalId; }) || state.animals[0];
  }

  function getUpcomingCount(data) {
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var v = (data.vaccines.filter(function (x) {
      var dt = isoToLocalDate(x.next);
      return x.next && dt && dt >= todayMid;
    })).length;
    var d = (data.dewormings.filter(function (x) {
      var dt = isoToLocalDate(x.next);
      return x.next && dt && dt >= todayMid;
    })).length;
    var h = ((data.hygiene || []).filter(function (x) {
      var dt = isoToLocalDate(x.next);
      return x.next && dt && dt >= todayMid;
    })).length;
    return v + d + h;
  }

  // ——— Photos : IndexedDB ——————————————————————————————
  var PHOTO_DB_NAME = 'vetbook_photo_db_v1';
  var PHOTO_STORE_NAME = 'photos';
  var photoDbOpenPromise = null;
  var photoUrlCache = new Map();

  function openPhotoDb() {
    if (photoDbOpenPromise) return photoDbOpenPromise;
    photoDbOpenPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponible')); return; }
      var req = indexedDB.open(PHOTO_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          db.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Erreur IndexedDB')); };
    });
    return photoDbOpenPromise;
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (res) { return res.blob(); });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('blobToDataUrl')); };
      reader.readAsDataURL(blob);
    });
  }

  function resizeImageToBlob(file, maxDim, mimeType, quality) {
    return new Promise(function (resolve, reject) {
      try {
        var objectUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            var scale = Math.min(1, maxDim / Math.max(w, h));
            var tw = Math.max(1, Math.round(w * scale));
            var th = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = tw; canvas.height = th;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, tw, th);
            canvas.toBlob(function (blob) {
              URL.revokeObjectURL(objectUrl);
              resolve(blob || file);
            }, mimeType, quality);
          } catch (err) { URL.revokeObjectURL(objectUrl); reject(err); }
        };
        img.onerror = function () { URL.revokeObjectURL(objectUrl); reject(new Error('Image invalide')); };
        img.src = objectUrl;
      } catch (err) { reject(err); }
    });
  }

  async function putPhotoBlob(photoId, blob, mimeType) {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('putPhotoBlob')); };
      tx.objectStore(PHOTO_STORE_NAME).put({ id: photoId, blob: blob, mimeType: mimeType || blob.type || '' });
    });
  }

  async function getPhotoRecord(photoId) {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readonly');
      var req = tx.objectStore(PHOTO_STORE_NAME).get(photoId);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error || new Error('getPhotoRecord')); };
    });
  }

  async function deletePhotoBlob(photoId) {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('deletePhotoBlob')); };
      tx.objectStore(PHOTO_STORE_NAME).delete(photoId);
    });
  }

  async function clearPhotoStore() {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('clearPhotoStore')); };
      tx.objectStore(PHOTO_STORE_NAME).clear();
    });
  }

  async function getPhotoObjectUrl(photoId) {
    if (photoUrlCache.has(photoId)) return photoUrlCache.get(photoId);
    var rec = await getPhotoRecord(photoId);
    if (!rec || !rec.blob) return '';
    var url = URL.createObjectURL(rec.blob);
    photoUrlCache.set(photoId, url);
    return url;
  }

  async function getPhotoDataUrl(photoId) {
    var rec = await getPhotoRecord(photoId);
    if (!rec || !rec.blob) return '';
    return blobToDataUrl(rec.blob);
  }

  async function migrateLegacyImagesToIndexedDB() {
    var needsMigration = false;
    state.animals.forEach(function (wrap) {
      var a = wrap?.animal;
      if (!a) return;
      if (typeof a.avatar === 'string' && a.avatar.startsWith('data:')) needsMigration = true;
      if (Array.isArray(wrap.photos)) {
        wrap.photos.forEach(function (p) {
          if (p && typeof p.src === 'string' && p.src.startsWith('data:')) needsMigration = true;
        });
      }
    });
    if (!needsMigration) return;

    for (var wrap of state.animals) {
      var a = wrap?.animal;
      if (!a) continue;
      if (typeof a.avatar === 'string' && a.avatar.startsWith('data:')) {
        try {
          var blob = await dataUrlToBlob(a.avatar);
          var avatarKey = state.nextId++;
          await putPhotoBlob(avatarKey, blob, blob.type);
          a.avatar = avatarKey;
        } catch (err) { console.warn('VetBook: migration avatar échouée', err); }
      }
      if (Array.isArray(wrap.photos)) {
        for (var p of wrap.photos) {
          if (!p || typeof p.src !== 'string' || !p.src.startsWith('data:')) continue;
          try {
            var blob2 = await dataUrlToBlob(p.src);
            var key = p.id != null ? p.id : (state.nextId++);
            p.id = key;
            await putPhotoBlob(key, blob2, blob2.type);
            delete p.src;
          } catch (err) { console.warn('VetBook: migration photo échouée', err); }
        }
      }
    }
    saveState();
  }

  // ——— Delete animal ————————————————————————————————————————
  async function deleteAnimal(id) {
    if (state.animals.length <= 1) {
      showToast(t('lastAnimal'), 'error');
      return;
    }
    if (!confirm('Supprimer cet animal et toutes ses données ?')) return;
    var animal = state.animals.find(function (a) { return a.id === id; });
    if (!animal) return;

    // Clean up IndexedDB photos
    if (Array.isArray(animal.photos)) {
      for (var p of animal.photos) {
        if (p && p.id != null) {
          deletePhotoBlob(p.id).catch(function () {});
        }
      }
    }
    if (animal.animal && typeof animal.animal.avatar === 'number') {
      deletePhotoBlob(animal.animal.avatar).catch(function () {});
    }

    state.animals = state.animals.filter(function (a) { return a.id !== id; });
    if (state.currentAnimalId === id) {
      state.currentAnimalId = state.animals[0]?.id ?? null;
    }
    saveState();
    showToast('Animal supprimé', 'success');
    if (state.viewMode === 'home') renderHome();
    else showHome();
  }

  // ——— Dashboard ———————————————————————————————————————
  function renderDashboard() {
    var dashEl = document.getElementById('home-dashboard');
    if (!dashEl) return;
    if (state.animals.length === 0) { dashEl.hidden = true; return; }
    dashEl.hidden = false;

    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var weekLater = new Date(todayMid);
    weekLater.setDate(weekLater.getDate() + 7);

    var overdueCount = 0;
    var upcomingCount = 0;
    var totalVaccines = 0;
    var totalPhotos = 0;

    state.animals.forEach(function (data) {
      totalVaccines += data.vaccines.length;
      totalPhotos += data.photos.length;
      data.vaccines.forEach(function (v) {
        if (!v.next) return;
        var dt = isoToLocalDate(v.next);
        if (!dt) return;
        if (dt < todayMid) overdueCount++;
        else if (dt <= weekLater) upcomingCount++;
      });
      data.dewormings.forEach(function (d) {
        if (!d.next) return;
        var dt = isoToLocalDate(d.next);
        if (!dt) return;
        if (dt < todayMid) overdueCount++;
        else if (dt <= weekLater) upcomingCount++;
      });
      (data.hygiene || []).forEach(function (h) {
        if (!h.next) return;
        var dt = isoToLocalDate(h.next);
        if (!dt) return;
        if (dt < todayMid) overdueCount++;
        else if (dt <= weekLater) upcomingCount++;
      });
    });

    document.getElementById('dash-overdue-count').textContent = overdueCount;
    document.getElementById('dash-upcoming-count').textContent = upcomingCount;
    document.getElementById('dash-animals-count').textContent = state.animals.length;
    document.getElementById('dash-vaccines-count').textContent = totalVaccines;
    document.getElementById('dash-photos-count').textContent = totalPhotos;
  }

  // ——— Home ————————————————————————————————————————————
  function renderHome() {
    var grid = document.getElementById('home-pet-grid');
    var emptyEl = document.getElementById('home-empty');
    if (!grid) return;

    renderDashboard();

    if (state.animals.length === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    grid.innerHTML = state.animals.map(function (data, idx) {
      var a = data.animal;
      var name = escapeHtml(a.name || 'Sans nom');
      var meta = escapeHtml([a.race, a.sex].filter(Boolean).join(' · ') || a.species || '—');
      var avatarHtml = a.avatar
        ? (typeof a.avatar === 'number'
            ? '<img src="" data-avatar-key="' + a.avatar + '" alt="" />'
            : '<img src="' + escapeHtml(a.avatar) + '" alt="">')
        : (a.species === 'Féline' ? '🐱' : '🐕');
      var upcoming = getUpcomingCount(data);
      var activeMeds = Array.isArray(data.medications) ? data.medications.filter(function (m) {
        return m.active !== false && (!m.endDate || isoToLocalDate(m.endDate) >= new Date());
      }) : [];
      var medBadge = activeMeds.length ? '<div class="pet-card-med-badge">💊 ' + activeMeds.length + ' en cours</div>' : '';
      return '<article class="pet-card" data-animal-id="' + data.id + '" style="animation-delay:' + (idx * 0.05) + 's">' +
        medBadge +
        '<button type="button" class="pet-card-delete" data-delete-animal="' + data.id + '" aria-label="Supprimer" title="Supprimer">🗑️</button>' +
        '<div class="pet-card-header">' +
        '<div class="pet-card-avatar">' + avatarHtml + '</div>' +
        '<div class="pet-card-info">' +
        '<div class="pet-card-name">' + name + '</div>' +
        '<div class="pet-card-meta">' + meta + '</div>' +
        '</div></div>' +
        '<div class="pet-card-stats">' +
        '<span>💉 ' + data.vaccines.length + ' vaccin(s)</span>' +
        '<span>💊 ' + data.dewormings.length + ' déparas.</span>' +
        '<span>📷 ' + data.photos.length + ' photo(s)</span>' +
        (upcoming ? '<span>🔔 ' + upcoming + ' rappel(s)</span>' : '') +
        '</div>' +
        '<div class="pet-card-actions">' +
        '<button type="button" class="btn-card btn-card-primary" data-action="carnet" data-animal-id="' + data.id + '">📋 Voir le carnet</button>' +
        '<button type="button" class="btn-card btn-card-secondary" data-action="vaccin" data-animal-id="' + data.id + '">💉 Vaccin</button>' +
        '<button type="button" class="btn-card btn-card-secondary" data-action="deworming" data-animal-id="' + data.id + '">💊 Déparas.</button>' +
        '<button type="button" class="btn-card btn-card-secondary" data-action="photos" data-animal-id="' + data.id + '">📷 Photos</button>' +
        '</div></article>';
    }).join('');

    // Delete buttons on cards
    grid.querySelectorAll('.pet-card-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = parseInt(btn.getAttribute('data-delete-animal'), 10);
        deleteAnimal(id);
      });
    });

    grid.querySelectorAll('.btn-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-animal-id'), 10);
        var action = btn.getAttribute('data-action');
        if (!state.animals.some(function (x) { return x.id === id; })) return;
        state.currentAnimalId = id;
        saveState();
        showDetail();
        if (action === 'vaccin') openModal('addVaccin');
        if (action === 'deworming') openModal('addDeworming');
        if (action === 'photos') switchTab('photos');
      });
    });

    grid.querySelectorAll('img[data-avatar-key]').forEach(function (img) {
      var key = parseInt(img.getAttribute('data-avatar-key'), 10);
      if (isNaN(key)) return;
      getPhotoObjectUrl(key).then(function (url) { if (url) img.src = url; }).catch(function () {});
    });
  }

  function showHome() {
    state.viewMode = 'home';
    var viewHome = document.getElementById('view-home');
    var viewDetail = document.getElementById('view-detail');
    var viewCommunity = document.getElementById('view-community');
    viewDetail.hidden = true;
    if (viewCommunity) viewCommunity.hidden = true;
    viewHome.hidden = false;
    viewHome.classList.remove('view-enter');
    void viewHome.offsetWidth;
    viewHome.classList.add('view-enter');
    document.getElementById('animal-select').style.display = 'none';
    document.getElementById('btn-accueil').hidden = true;
    document.getElementById('fab-container').hidden = true;
    renderHome();
  }

  function showDetail() {
    state.viewMode = 'detail';
    var viewHome = document.getElementById('view-home');
    var viewDetail = document.getElementById('view-detail');
    var viewCommunity = document.getElementById('view-community');
    viewHome.hidden = true;
    if (viewCommunity) viewCommunity.hidden = true;
    viewDetail.hidden = false;
    viewDetail.classList.remove('view-enter');
    void viewDetail.offsetWidth;
    viewDetail.classList.add('view-enter');
    document.getElementById('animal-select').style.display = '';
    document.getElementById('btn-accueil').hidden = false;
    document.getElementById('fab-container').hidden = false;
    renderAnimalSelect();
    refreshAll();
    switchTab('profil');
  }

  // ——— Profile ———————————————————————————————————————————
  function renderProfile() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal;
    var o = data.owner;

    // Apply animal theme color
    var hero = document.getElementById('animal-hero');
    if (hero && a.themeColor) {
      hero.style.setProperty('--animal-color', a.themeColor);
      hero.style.background = 'linear-gradient(135deg, ' + a.themeColor + ' 0%, var(--teal-light) 100%)';
    } else if (hero) {
      hero.style.removeProperty('--animal-color');
      hero.style.background = '';
    }

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

    var ageEl = document.getElementById('age-display');
    if (a.dob) {
      var months = Math.floor((new Date() - new Date(a.dob)) / (864e5 * 30.44));
      ageEl.textContent = months < 24 ? months + ' mois' : Math.floor(months / 12) + ' ans';
    } else {
      ageEl.textContent = '—';
    }

    var av = document.getElementById('hero-avatar');
    av.innerHTML = '';
    av.style.fontSize = '';

    if (a.avatar && typeof a.avatar === 'number') {
      av.innerHTML = '<img src="" data-avatar-key="' + a.avatar + '" alt="' + escapeHtml(a.name || 'Animal') + '">';
      getPhotoObjectUrl(a.avatar).then(function (url) {
        var img = av.querySelector('img[data-avatar-key]');
        if (img && url) img.src = url;
      }).catch(function () {});
    } else if (a.avatar && typeof a.avatar === 'string') {
      av.innerHTML = '<img src="' + escapeHtml(a.avatar) + '" alt="' + escapeHtml(a.name || 'Animal') + '">';
    } else {
      av.textContent = a.species === 'Féline' ? '🐱' : '🐕';
      av.style.fontSize = '48px';
    }

    document.getElementById('owner-name').textContent = o.name || '—';
    document.getElementById('owner-phone').textContent = o.phone || '—';
    document.getElementById('owner-email').textContent = o.email || '—';
    document.getElementById('owner-clinic').textContent = o.clinic || '—';

    // Stats with animated counters
    animateCounter(document.getElementById('stat-vax'), data.vaccines.length, 400);
    animateCounter(document.getElementById('stat-dew'), data.dewormings.length, 400);
    animateCounter(document.getElementById('stat-photos'), data.photos.length, 400);

    var upcoming = [].concat(data.vaccines.filter(function (v) { return v.next; }))
      .concat(data.dewormings.filter(function (d) { return d.next; }))
      .filter(function (e) {
        var dt = isoToLocalDate(e.next);
        if (!dt) return false;
        var today = new Date();
        var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return dt >= todayMid;
      });
    animateCounter(document.getElementById('stat-next'), upcoming.length, 400);

    // Profile completeness
    renderProfileCompleteness(data);

    // Active medications summary
    renderActiveMedsSummary(data);

    // Birthday check
    checkBirthday(data);

    // QR Code
    renderQRCode(data);
  }

  function animateCounter(el, target, duration) {
    if (!el) return;
    var start = parseInt(el.textContent, 10) || 0;
    if (start === target) { el.textContent = target; return; }
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      el.textContent = Math.round(start + (target - start) * progress);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderProfileCompleteness(data) {
    var el = document.getElementById('profile-completeness');
    var fill = document.getElementById('completeness-fill');
    var text = document.getElementById('completeness-text');
    if (!el || !data) return;

    var a = data.animal;
    var o = data.owner;
    var fields = [a.name, a.dob, a.weight, a.race, a.color, a.chip, a.sterilise !== 'Non' ? a.sterilise : '', o.name, a.avatar];
    var filled = fields.filter(function (f) { return f != null && f !== '' && f !== false; }).length;
    var pct = Math.round((filled / fields.length) * 100);

    if (pct >= 100) {
      el.hidden = true;
    } else {
      el.hidden = false;
      fill.style.width = pct + '%';
      text.textContent = pct + '% — ' + t('completeFiche');
    }
  }

  function renderActiveMedsSummary(data) {
    var el = document.getElementById('active-meds-summary');
    var list = document.getElementById('active-meds-list');
    if (!el || !list) return;
    var meds = Array.isArray(data.medications) ? data.medications.filter(function (m) {
      return m.active !== false && (!m.endDate || isoToLocalDate(m.endDate) >= new Date());
    }) : [];
    if (meds.length === 0) { el.hidden = true; return; }
    el.hidden = false;
    list.innerHTML = meds.map(function (m) {
      return '<span class="med-badge">' + escapeHtml(m.name) + (m.dosage ? ' — ' + escapeHtml(m.dosage) : '') + '</span>';
    }).join('');
  }

  function checkBirthday(data) {
    var banner = document.getElementById('birthday-banner');
    var textEl = document.getElementById('birthday-text');
    if (!banner || !data || !data.animal.dob) { if (banner) banner.hidden = true; return; }

    var today = new Date();
    var dob = isoToLocalDate(data.animal.dob);
    if (!dob) { banner.hidden = true; return; }

    if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
      var age = today.getFullYear() - dob.getFullYear();
      textEl.textContent = t('birthday', escapeHtml(data.animal.name || 'votre animal')) + ' (' + age + ' an' + (age > 1 ? 's' : '') + ')';
      banner.hidden = false;
      startConfetti();
    } else {
      banner.hidden = true;
    }
  }

  function startConfetti() {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    var particles = [];
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6eb4'];
    for (var i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 4 + 2,
        d: Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        speed: Math.random() * 2 + 1
      });
    }
    var frames = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frames / 120);
        ctx.fillRect(p.x + p.tilt, p.y, p.r, p.r * 2);
        p.y += p.speed;
        p.tilt += 0.1;
      });
      frames++;
      if (frames < 120) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
  }

  function renderQRCode(data) {
    var section = document.getElementById('qr-section');
    var canvas = document.getElementById('qr-canvas');
    if (!section || !canvas || !data) { if (section) section.hidden = true; return; }

    var a = data.animal;
    var o = data.owner;
    if (!a.name && !a.chip) { section.hidden = true; return; }
    if (typeof qrcode === 'undefined') { section.hidden = true; return; }

    section.hidden = false;
    // Plain text with all animal info
    var lines = [];
    if (a.name) lines.push('Nom: ' + a.name);
    if (a.species) lines.push('Espece: ' + a.species);
    if (a.race) lines.push('Race: ' + a.race);
    if (a.sex) lines.push('Sexe: ' + a.sex);
    if (a.dob) lines.push('Naissance: ' + fmtDate(a.dob));
    if (a.weight) lines.push('Poids: ' + a.weight + ' kg');
    if (a.color) lines.push('Couleur: ' + a.color);
    if (a.chip) lines.push('Puce: ' + a.chip);
    if (a.sterilise && a.sterilise !== 'Non') lines.push('Sterilise: ' + a.sterilise);
    if (a.notes) lines.push('Notes: ' + a.notes);
    var text = lines.join('\n');

    try {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      var modules = qr.getModuleCount();
      var cellSize = Math.max(6, Math.floor(300 / modules));
      var margin = cellSize * 4;
      var totalSize = cellSize * modules + margin * 2;
      canvas.width = totalSize;
      canvas.height = totalSize;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalSize, totalSize);
      ctx.fillStyle = '#000000';
      for (var r = 0; r < modules; r++) {
        for (var c = 0; c < modules; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
          }
        }
      }
    } catch (e) {
      console.warn('VetBook: QR generation failed', e);
      section.hidden = true;
    }
  }

  // ——— Animal select ——————————————————————————————————————
  function renderAnimalSelect() {
    var sel = document.getElementById('animal-select');
    if (!sel) return;
    sel.innerHTML = state.animals.map(function (an) {
      var name = escapeHtml(an.animal.name || 'Sans nom');
      return '<option value="' + an.id + '"' + (an.id === state.currentAnimalId ? ' selected' : '') + '>' + name + '</option>';
    }).join('');
    if (state.animals.length <= 1) sel.style.display = 'none';
    else sel.style.display = '';
  }

  function onAnimalSelectChange() {
    var sel = document.getElementById('animal-select');
    if (!sel) return;
    var id = parseInt(sel.value, 10);
    if (!isNaN(id) && state.animals.some(function (a) { return a.id === id; })) {
      state.currentAnimalId = id;
      saveState();
      refreshAll();
    }
  }

  // ——— Vaccine suggestions ——————————————————————————————
  function updateVaccineSuggestions() {
    var data = getCurrent();
    var datalist = document.getElementById('vaccine-suggestions');
    if (!datalist || !data) return;
    var species = data.animal.species || 'Canine';
    var suggestions = VACCINE_DB[species] || VACCINE_DB.Canine;
    datalist.innerHTML = suggestions.map(function (s) {
      return '<option value="' + escapeHtml(s) + '">';
    }).join('');
  }

  // ——— Modals —————————————————————————————————————————
  function openModal(name) {
    var data = getCurrent();
    if (!data && name !== 'addAnimal' && name !== 'onboarding') return;

    if (name === 'editAnimal') {
      var a = data.animal;
      var fields = ['name', 'species', 'race', 'sex', 'dob', 'weight', 'color', 'chip', 'sterilise', 'notes'];
      fields.forEach(function (f) {
        var el = document.getElementById('ea-' + f);
        if (el) el.value = a[f] != null && a[f] !== '' ? a[f] : '';
      });
      var colorEl = document.getElementById('ea-themeColor');
      if (colorEl) colorEl.value = a.themeColor || '#0f766e';
      var prev = document.getElementById('edit-avatar-preview');
      if (prev) {
        prev.innerHTML = '';
        if (a.avatar && typeof a.avatar === 'number') {
          prev.innerHTML = '<img src="" data-avatar-key="' + a.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
          getPhotoObjectUrl(a.avatar).then(function (url) {
            var img = prev.querySelector('img[data-avatar-key]');
            if (img && url) img.src = url;
          }).catch(function () {});
        } else if (a.avatar && typeof a.avatar === 'string') {
          prev.innerHTML = '<img src="' + escapeHtml(a.avatar) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
        } else {
          prev.textContent = a.species === 'Féline' ? '🐱' : '🐕';
        }
      }
    }

    if (name === 'editOwner') {
      var o = data.owner;
      ['name', 'phone', 'email', 'clinic', 'address'].forEach(function (f) {
        var el = document.getElementById('eo-' + f);
        if (el) el.value = o[f] || '';
      });
    }

    if (name === 'addVaccin') {
      document.getElementById('v-name').value = '';
      document.getElementById('v-date').value = '';
      document.getElementById('v-next').value = '';
      document.getElementById('v-frequency').value = '';
      document.getElementById('v-vet').value = '';
      updateVaccineSuggestions();
    }

    if (name === 'addDeworming') {
      document.getElementById('d-name').value = '';
      document.getElementById('d-date').value = '';
      document.getElementById('d-next').value = '';
      document.getElementById('d-frequency').value = '';
      document.getElementById('d-type').value = 'interne';
    }

    if (name === 'addWeight') {
      var todayStr = todayISO();
      var aw = data.animal || {};
      var dateEl = document.getElementById('wh-date');
      var wEl = document.getElementById('wh-weight');
      if (dateEl) dateEl.value = todayStr;
      if (wEl) wEl.value = aw.weight != null ? aw.weight : '';
    }

    if (name === 'addConsult') {
      document.getElementById('c-date').value = todayISO();
      document.getElementById('c-vet').value = '';
      document.getElementById('c-reason').value = '';
      document.getElementById('c-diagnosis').value = '';
      document.getElementById('c-treatment').value = '';
      document.getElementById('c-cost').value = '';
      document.getElementById('c-notes').value = '';
    }

    if (name === 'editConsult') {
      var cid = uiState.editConsultId;
      var c = Array.isArray(data.consultations) ? data.consultations.find(function (x) { return x.id === cid; }) : null;
      if (!c) return;
      document.getElementById('ec-id').value = String(c.id);
      document.getElementById('ec-date').value = c.date || '';
      document.getElementById('ec-vet').value = c.vet || '';
      document.getElementById('ec-reason').value = c.reason || '';
      document.getElementById('ec-diagnosis').value = c.diagnosis || '';
      document.getElementById('ec-treatment').value = c.treatment || '';
      document.getElementById('ec-cost').value = c.cost != null ? String(c.cost) : '';
      document.getElementById('ec-notes').value = c.notes || '';
    }

    if (name === 'addMedication') {
      document.getElementById('m-name').value = '';
      document.getElementById('m-dosage').value = '';
      document.getElementById('m-frequency').value = '';
      document.getElementById('m-start').value = todayISO();
      document.getElementById('m-end').value = '';
      document.getElementById('m-notes').value = '';
    }

    if (name === 'editMedication') {
      var mid = uiState.editMedicationId;
      var m = Array.isArray(data.medications) ? data.medications.find(function (x) { return x.id === mid; }) : null;
      if (!m) return;
      document.getElementById('em-id').value = String(m.id);
      document.getElementById('em-name').value = m.name || '';
      document.getElementById('em-dosage').value = m.dosage || '';
      document.getElementById('em-frequency').value = m.frequency || '';
      document.getElementById('em-start').value = m.startDate || '';
      document.getElementById('em-end').value = m.endDate || '';
      document.getElementById('em-notes').value = m.notes || '';
    }

    if (name === 'addNote') {
      document.getElementById('n-date').value = todayISO();
      document.getElementById('n-category').value = 'sante';
      document.getElementById('n-title').value = '';
      document.getElementById('n-content').value = '';
    }

    if (name === 'editNote') {
      var nid = uiState.editNoteId;
      var n = Array.isArray(data.notes) ? data.notes.find(function (x) { return x.id === nid; }) : null;
      if (!n) return;
      document.getElementById('en-id').value = String(n.id);
      document.getElementById('en-date').value = n.date || '';
      document.getElementById('en-category').value = n.category || 'autre';
      document.getElementById('en-title').value = n.title || '';
      document.getElementById('en-content').value = n.content || '';
    }

    // Hygiene modals
    if (name === 'addHygiene') {
      document.getElementById('hy-type').value = HYGIENE_TYPES[0];
      document.getElementById('hy-date').value = todayISO();
      document.getElementById('hy-next').value = '';
      document.getElementById('hy-frequency').value = '';
      document.getElementById('hy-notes').value = '';
    }
    if (name === 'editHygiene') {
      var hid = uiState.editHygieneId;
      var hEntry = Array.isArray(data.hygiene) ? data.hygiene.find(function (x) { return x.id === hid; }) : null;
      if (!hEntry) return;
      document.getElementById('ehy-type').value = hEntry.type || HYGIENE_TYPES[0];
      document.getElementById('ehy-date').value = hEntry.date || '';
      document.getElementById('ehy-next').value = hEntry.next || '';
      document.getElementById('ehy-frequency').value = hEntry.frequencyDays != null ? String(hEntry.frequencyDays) : '';
      document.getElementById('ehy-notes').value = hEntry.notes || '';
    }

    // Heat cycle modals
    if (name === 'addHeatCycle') {
      document.getElementById('hc-start').value = todayISO();
      document.getElementById('hc-end').value = '';
      document.getElementById('hc-intensity').value = 'Moyenne';
      document.getElementById('hc-notes').value = '';
    }
    if (name === 'editHeatCycle') {
      var hcid = uiState.editHeatCycleId;
      var hcEntry = Array.isArray(data.heatCycles) ? data.heatCycles.find(function (x) { return x.id === hcid; }) : null;
      if (!hcEntry) return;
      document.getElementById('ehc-start').value = hcEntry.startDate || '';
      document.getElementById('ehc-end').value = hcEntry.endDate || '';
      document.getElementById('ehc-intensity').value = hcEntry.intensity || 'Moyenne';
      document.getElementById('ehc-notes').value = hcEntry.notes || '';
    }

    // Activity modals
    if (name === 'addActivity') {
      document.getElementById('act-date').value = todayISO();
      document.getElementById('act-type').value = ACTIVITY_TYPES[0];
      document.getElementById('act-duration').value = '';
      document.getElementById('act-distance').value = '';
      document.getElementById('act-notes').value = '';
    }
    if (name === 'editActivity') {
      var aid = uiState.editActivityId;
      var aEntry = Array.isArray(data.activities) ? data.activities.find(function (x) { return x.id === aid; }) : null;
      if (!aEntry) return;
      document.getElementById('eact-date').value = aEntry.date || '';
      document.getElementById('eact-type').value = aEntry.type || ACTIVITY_TYPES[0];
      document.getElementById('eact-duration').value = aEntry.duration || '';
      document.getElementById('eact-distance').value = aEntry.distance || '';
      document.getElementById('eact-notes').value = aEntry.notes || '';
    }

    // Meal modals
    if (name === 'addMeal') {
      document.getElementById('meal-date').value = todayISO();
      document.getElementById('meal-time').value = '';
      document.getElementById('meal-type').value = MEAL_TYPES[0];
      document.getElementById('meal-food').value = '';
      document.getElementById('meal-quantity').value = '';
      document.getElementById('meal-unit').value = 'g';
      document.getElementById('meal-notes').value = '';
    }
    if (name === 'editMeal') {
      var mealId = uiState.editMealId;
      var mealEntry = data.nutrition && Array.isArray(data.nutrition.meals) ? data.nutrition.meals.find(function (x) { return x.id === mealId; }) : null;
      if (!mealEntry) return;
      document.getElementById('emeal-date').value = mealEntry.date || '';
      document.getElementById('emeal-time').value = mealEntry.time || '';
      document.getElementById('emeal-type').value = mealEntry.type || MEAL_TYPES[0];
      document.getElementById('emeal-food').value = mealEntry.food || '';
      document.getElementById('emeal-quantity').value = mealEntry.quantity || '';
      document.getElementById('emeal-unit').value = mealEntry.unit || 'g';
      document.getElementById('emeal-notes').value = mealEntry.notes || '';
    }
    if (name === 'editNutritionPlan') {
      var nPlan = data.nutrition ? data.nutrition.dailyPlan || {} : {};
      document.getElementById('np-calories').value = nPlan.targetCalories || '';
      document.getElementById('np-meals-per-day').value = nPlan.mealsPerDay || '';
      document.getElementById('np-food-brand').value = nPlan.foodBrand || '';
      document.getElementById('np-portion').value = nPlan.portionSize || '';
    }

    // Pedigree modal
    if (name === 'editPedigree') {
      var ped = data.pedigree || {};
      document.getElementById('ped-registry').value = ped.registry || 'Non inscrit';
      document.getElementById('ped-reg-number').value = ped.registryNumber || '';
      document.getElementById('ped-chip').value = ped.chipNumber || data.animal.chip || '';
      document.getElementById('ped-sire-name').value = (ped.sire && ped.sire.name) || '';
      document.getElementById('ped-sire-reg').value = (ped.sire && ped.sire.registry) || '';
      document.getElementById('ped-dam-name').value = (ped.dam && ped.dam.name) || '';
      document.getElementById('ped-dam-reg').value = (ped.dam && ped.dam.registry) || '';
      var gpd = ped.grandparents || {};
      document.getElementById('ped-gp-ps').value = gpd.paternalGrandsire || '';
      document.getElementById('ped-gp-pd').value = gpd.paternalGranddam || '';
      document.getElementById('ped-gp-ms').value = gpd.maternalGrandsire || '';
      document.getElementById('ped-gp-md').value = gpd.maternalGranddam || '';
      toggleLofVerifyControls();
    }

    // Vet contact modals
    if (name === 'addVetContact') {
      document.getElementById('vc-name').value = '';
      document.getElementById('vc-clinic').value = '';
      document.getElementById('vc-phone').value = '';
      document.getElementById('vc-email').value = '';
      document.getElementById('vc-address').value = '';
      document.getElementById('vc-lat').value = '';
      document.getElementById('vc-lng').value = '';
      document.getElementById('vc-hours').value = '';
      document.getElementById('vc-emergency').checked = false;
      document.getElementById('vc-notes').value = '';
    }
    if (name === 'editVetContact') {
      var dir = loadVetDirectory();
      var vcid = uiState.editVetContactId;
      var vcEntry = dir.entries.find(function (e) { return e.id === vcid; });
      if (!vcEntry) return;
      document.getElementById('evc-name').value = vcEntry.name || '';
      document.getElementById('evc-clinic').value = vcEntry.clinic || '';
      document.getElementById('evc-phone').value = vcEntry.phone || '';
      document.getElementById('evc-email').value = vcEntry.email || '';
      document.getElementById('evc-address').value = vcEntry.address || '';
      document.getElementById('evc-hours').value = vcEntry.hours || '';
      document.getElementById('evc-emergency').checked = !!vcEntry.emergency;
      document.getElementById('evc-lat').value = vcEntry.lat != null ? vcEntry.lat : '';
      document.getElementById('evc-lng').value = vcEntry.lng != null ? vcEntry.lng : '';
      document.getElementById('evc-notes').value = vcEntry.notes || '';
    }

    if (name === 'editCaption') {
      var photoId = uiState.editCaptionPhotoId;
      var photo = data.photos.find(function (p) { return p.id === photoId; });
      document.getElementById('cap-photo-id').value = photoId;
      document.getElementById('cap-text').value = (photo && photo.caption) || '';
    }

    if (name === 'backup') {
      var input = document.getElementById('backup-import-file');
      if (input) input.value = '';
      var fileNameEl = document.getElementById('backup-file-name');
      if (fileNameEl) fileNameEl.textContent = 'Aucun fichier sélectionné';
    }

    if (name === 'editVaccin') {
      var vid = uiState.editVaccineId;
      var v = Array.isArray(data.vaccines) ? data.vaccines.find(function (x) { return x.id === vid; }) : null;
      if (!v) return;
      document.getElementById('ev-id').value = String(v.id);
      document.getElementById('ev-name').value = v.name || '';
      document.getElementById('ev-date').value = v.date || '';
      document.getElementById('ev-next').value = v.next || '';
      document.getElementById('ev-frequency').value = v.frequencyDays != null ? String(v.frequencyDays) : '';
      document.getElementById('ev-vet').value = v.vet || '';
      updateVaccineSuggestions();
    }

    if (name === 'editDeworming') {
      var did = uiState.editDewormingId;
      var d = Array.isArray(data.dewormings) ? data.dewormings.find(function (x) { return x.id === did; }) : null;
      if (!d) return;
      document.getElementById('ed-id').value = String(d.id);
      document.getElementById('ed-name').value = d.name || '';
      document.getElementById('ed-date').value = d.date || '';
      document.getElementById('ed-next').value = d.next || '';
      document.getElementById('ed-frequency').value = d.frequencyDays != null ? String(d.frequencyDays) : '';
      document.getElementById('ed-type').value = d.type || 'interne';
    }

    if (name === 'editWeight') {
      var wid = uiState.editWeightEntryId;
      var entries = Array.isArray(data.animal?.weightHistory) ? data.animal.weightHistory : [];
      var wEntry = entries.find(function (x) { return x.id === wid; }) || null;
      if (!wEntry) return;
      document.getElementById('ew-id').value = String(wEntry.id);
      document.getElementById('ew-date').value = wEntry.date || '';
      document.getElementById('ew-weight').value = wEntry.weight != null ? String(wEntry.weight) : '';
    }

    var overlay = document.getElementById('modal-' + name);
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal(name) {
    var overlay = document.getElementById('modal-' + name);
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  // ——— Save forms ———————————————————————————————————————
  function saveAnimal() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal;
    var fields = ['name', 'species', 'race', 'sex', 'dob', 'color', 'chip', 'sterilise', 'notes'];
    fields.forEach(function (f) {
      var el = document.getElementById('ea-' + f);
      if (el) a[f] = el.value.trim();
    });
    var w = parseFloat(document.getElementById('ea-weight').value, 10);
    a.weight = isNaN(w) ? a.weight : w;
    var colorEl = document.getElementById('ea-themeColor');
    if (colorEl) a.themeColor = colorEl.value === '#0f766e' ? '' : colorEl.value;
    closeModal('editAnimal');
    saveState();
    renderProfile();
    renderAnimalSelect();
    showToast('Fiche modifiée', 'success');
  }

  function saveOwner() {
    var data = getCurrent();
    if (!data) return;
    var o = data.owner;
    ['name', 'phone', 'email', 'clinic', 'address'].forEach(function (f) {
      var el = document.getElementById('eo-' + f);
      if (el) o[f] = el.value.trim();
    });
    closeModal('editOwner');
    saveState();
    renderProfile();
    showToast('Propriétaire modifié', 'success');
  }

  // ——— Weight ————————————————————————————————————————
  function addWeightEntry() {
    var data = getCurrent();
    if (!data) return;
    if (!data.animal) data.animal = {};
    if (!Array.isArray(data.animal.weightHistory)) data.animal.weightHistory = [];

    var date = document.getElementById('wh-date')?.value;
    var w = parseFloat(document.getElementById('wh-weight')?.value, 10);

    if (!date) { showToast('Veuillez choisir une date.', 'error'); return; }
    if (isNaN(w) || w <= 0) { showToast('Veuillez saisir un poids valide (kg).', 'error'); return; }

    data.animal.weightHistory.push({ id: state.nextId++, date: date, weight: w });
    data.animal.weight = w;
    closeModal('addWeight');
    saveState();
    refreshAll();
    showToast('Pesée ajoutée', 'success');
  }

  function syncAnimalWeightFromHistory(wrap) {
    if (!wrap || !wrap.animal) return;
    var entries = Array.isArray(wrap.animal.weightHistory) ? wrap.animal.weightHistory : [];
    if (entries.length === 0) { wrap.animal.weight = null; return; }
    var latest = entries.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
    wrap.animal.weight = latest && latest.weight != null ? Number(latest.weight) : null;
  }

  function updateWeightEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editWeightEntryId;
    var entries = Array.isArray(data.animal?.weightHistory) ? data.animal.weightHistory : [];
    var entry = entries.find(function (x) { return x.id === id; }) || null;
    if (!entry) return;

    var date = document.getElementById('ew-date').value;
    var weight = parseFloat(document.getElementById('ew-weight').value, 10);
    if (!date) { showToast('Veuillez choisir une date.', 'error'); return; }
    if (isNaN(weight) || weight <= 0) { showToast('Veuillez saisir un poids valide (kg).', 'error'); return; }

    entry.date = date;
    entry.weight = weight;
    syncAnimalWeightFromHistory(data);
    closeModal('editWeight');
    uiState.editWeightEntryId = null;
    saveState();
    refreshAll();
    showToast('Pesée modifiée', 'success');
  }

  function deleteWeightEntry(entryId) {
    var data = getCurrent();
    if (!data || !data.animal || !Array.isArray(data.animal.weightHistory)) return;
    if (!confirm('Supprimer cette pesée ?')) return;
    data.animal.weightHistory = data.animal.weightHistory.filter(function (w) { return w.id !== entryId; });
    syncAnimalWeightFromHistory(data);
    saveState();
    refreshAll();
    showToast('Pesée supprimée', 'success');
  }

  // ——— Add animal ———————————————————————————————————————
  function addAnimal() {
    var name = document.getElementById('aa-name').value.trim();
    if (!name) { showToast("Veuillez saisir le nom de l'animal.", 'error'); return; }
    var newAnimal = {
      id: state.nextId++,
      animal: {
        name: name,
        species: document.getElementById('aa-species').value || 'Canine',
        race: document.getElementById('aa-race').value.trim() || '',
        sex: document.getElementById('aa-sex').value || 'Mâle',
        dob: document.getElementById('aa-dob').value || '',
        weight: parseFloat(document.getElementById('aa-weight').value, 10) || null,
        weightHistory: [], color: '', chip: '', sterilise: 'Non', notes: '', avatar: null, themeColor: ''
      },
      owner: JSON.parse(JSON.stringify((getCurrent() || {}).owner || { name: '', phone: '', email: '', clinic: '', address: '' })),
      photos: [], vaccines: [], dewormings: [], consultations: [], medications: [], notes: [],
      notifications: { vaccineReminder: true, dewormingReminder: true, birthdayReminder: true, monthlySummary: false }
    };
    state.animals.push(newAnimal);
    state.currentAnimalId = newAnimal.id;
    closeModal('addAnimal');
    document.getElementById('form-add-animal').reset();
    saveState();
    renderAnimalSelect();
    refreshAll();
    showToast('Animal ajouté', 'success');
    if (state.viewMode === 'home') showDetail();
  }

  // ——— Avatar ————————————————————————————————————————
  function handleAvatarUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    var data = getCurrent();
    if (!data) return;

    var oldKey = typeof data.animal.avatar === 'number' ? data.animal.avatar : null;
    var inputKey = state.nextId++;

    resizeImageToBlob(file, 320, 'image/jpeg', 0.85).then(function (blob) {
      return putPhotoBlob(inputKey, blob, blob.type);
    }).then(function () {
      data.animal.avatar = inputKey;
      var prev = document.getElementById('edit-avatar-preview');
      if (prev) {
        prev.innerHTML = '';
        getPhotoObjectUrl(inputKey).then(function (url) {
          if (!prev) return;
          prev.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
        }).catch(function () {});
      }
      if (oldKey != null && oldKey !== inputKey) deletePhotoBlob(oldKey).catch(function () {});
      saveState();
      renderProfile();
    }).catch(function (err) { console.warn('VetBook: avatar upload échoué', err); })
    .finally(function () { e.target.value = ''; });
  }

  // ——— Photos ————————————————————————————————————————
  function triggerPhotoUpload() { document.getElementById('photo-input').click(); }

  function handlePhotoUpload(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    processPhotoFiles(Array.from(files));
    e.target.value = '';
  }

  function processPhotoFiles(fileArr) {
    var data = getCurrent();
    if (!data) return;
    var todayStr = todayISO();

    Promise.all(fileArr.map(function (file) {
      if (!file || !file.type || !file.type.startsWith('image/')) return Promise.resolve(null);
      var key = state.nextId++;
      return resizeImageToBlob(file, 1600, 'image/jpeg', 0.85).then(function (blob) {
        return putPhotoBlob(key, blob, blob.type).then(function () {
          return { id: key, date: todayStr, caption: '' };
        });
      });
    })).then(function (results) {
      results.filter(Boolean).forEach(function (p) { data.photos.push(p); });
      saveState();
      renderGallery();
      renderProfile();
      showToast(results.filter(Boolean).length + ' photo(s) ajoutée(s)', 'success');
    }).catch(function (err) { console.warn('VetBook: upload photos échoué', err); });
  }

  function renderGallery() {
    var data = getCurrent();
    var grid = document.getElementById('gallery-grid');
    if (!data || !grid) return;

    if (data.photos.length === 0) {
      grid.innerHTML = '<div class="gallery-add" id="gallery-add-trigger" role="button" tabindex="0"><span class="gallery-add-icon">📷</span><span>Ajouter une photo</span></div>' +
        '<div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="80" height="80"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="40">📷</text></svg><p>' + t('noPhotos', escapeHtml(data.animal.name || '')) + '</p></div>';
    } else {
      var addBtn = '<div class="gallery-add" id="gallery-add-trigger" role="button" tabindex="0"><span class="gallery-add-icon">📷</span><span>Ajouter une photo</span></div>';
      var items = data.photos.map(function (p) {
        var photoId = p.id;
        var legacySrc = (p && typeof p.src === 'string') ? escapeHtml(p.src) : '';
        var captionHtml = p.caption ? '<div class="photo-caption">' + escapeHtml(p.caption) + '</div>' : '';
        return '<div class="gallery-item" data-photo-id="' + p.id + '">' +
          '<img src="' + legacySrc + '" data-photo-key="' + photoId + '" alt="Photo">' +
          '<div class="photo-date">' + fmtDate(p.date) + captionHtml + '</div>' +
          '<div class="photo-actions-overlay">' +
          '<button type="button" class="photo-action-btn caption-btn" data-caption-id="' + p.id + '" aria-label="Légende" title="Légende">✏️</button>' +
          '<button type="button" class="photo-action-btn" data-delete-photo="' + p.id + '" aria-label="Supprimer">✕</button>' +
          '</div></div>';
      }).join('');
      grid.innerHTML = addBtn + items;
    }

    grid.querySelectorAll('.gallery-item').forEach(function (el) {
      var id = parseInt(el.getAttribute('data-photo-id'), 10);
      if (isNaN(id)) return;
      var img = el.querySelector('img');
      el.addEventListener('click', function (e) {
        if (e.target.closest('.photo-actions-overlay')) return;
        openLightbox(id, img?.src || '');
      });
    });

    grid.querySelectorAll('[data-delete-photo]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deletePhoto(parseInt(btn.getAttribute('data-delete-photo'), 10));
      });
    });

    grid.querySelectorAll('[data-caption-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        uiState.editCaptionPhotoId = parseInt(btn.getAttribute('data-caption-id'), 10);
        openModal('editCaption');
      });
    });

    grid.querySelectorAll('img[data-photo-key]').forEach(function (imgEl) {
      var photoId = parseInt(imgEl.getAttribute('data-photo-key'), 10);
      if (isNaN(photoId)) return;
      getPhotoObjectUrl(photoId).then(function (url) { if (url) imgEl.src = url; }).catch(function () {});
    });

    var addTrigger = document.getElementById('gallery-add-trigger');
    if (addTrigger) addTrigger.addEventListener('click', triggerPhotoUpload);

    // Drag & drop
    setupGalleryDragDrop(grid);
  }

  function setupGalleryDragDrop(grid) {
    grid.addEventListener('dragover', function (e) { e.preventDefault(); grid.classList.add('drag-over'); });
    grid.addEventListener('dragenter', function (e) { e.preventDefault(); grid.classList.add('drag-over'); });
    grid.addEventListener('dragleave', function () { grid.classList.remove('drag-over'); });
    grid.addEventListener('drop', function (e) {
      e.preventDefault();
      grid.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        processPhotoFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  function saveCaption() {
    var data = getCurrent();
    if (!data) return;
    var photoId = parseInt(document.getElementById('cap-photo-id').value, 10);
    var caption = document.getElementById('cap-text').value.trim();
    var photo = data.photos.find(function (p) { return p.id === photoId; });
    if (photo) {
      photo.caption = caption;
      saveState();
      renderGallery();
      showToast('Légende modifiée', 'success');
    }
    closeModal('editCaption');
  }

  function deletePhoto(id) {
    if (!confirm('Supprimer cette photo ?')) return;
    var data = getCurrent();
    if (!data) return;
    data.photos = data.photos.filter(function (p) { return p.id !== id; });
    deletePhotoBlob(id).catch(function () {});
    saveState();
    renderGallery();
    renderProfile();
    showToast('Photo supprimée', 'success');
  }

  function openLightbox(photoId, fallbackSrc) {
    var data = getCurrent();
    var photo = data ? data.photos.find(function (p) { return p.id === photoId; }) : null;
    var captionEl = document.getElementById('lightbox-caption');
    if (captionEl) captionEl.textContent = (photo && photo.caption) || '';

    getPhotoObjectUrl(photoId).then(function (url) {
      document.getElementById('lightbox-img').src = url || fallbackSrc || '';
      document.getElementById('lightbox').classList.add('open');
      document.getElementById('lightbox').setAttribute('aria-hidden', 'false');
    }).catch(function () {
      document.getElementById('lightbox-img').src = fallbackSrc || '';
      document.getElementById('lightbox').classList.add('open');
      document.getElementById('lightbox').setAttribute('aria-hidden', 'false');
    });
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
  }

  // ——— Vaccines ————————————————————————————————————————
  function renderVaccines() {
    var data = getCurrent();
    var tbody = document.getElementById('vaccine-table');
    var alertsEl = document.getElementById('vaccine-alerts');
    if (!data || !tbody) return;

    var searchQ = (document.getElementById('vaccine-search')?.value || '').toLowerCase().trim();
    var statusFilter = document.getElementById('vaccine-status-filter')?.value || 'all';
    var sortBy = document.getElementById('vaccine-sort')?.value || 'dateDesc';

    var list = Array.isArray(data.vaccines) ? data.vaccines.slice() : [];

    if (searchQ) {
      list = list.filter(function (v) {
        return (v.name || '').toLowerCase().includes(searchQ) || (v.vet || '').toLowerCase().includes(searchQ) || (v.date || '').includes(searchQ);
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter(function (v) {
        var st = getStatus(v.next);
        if (!st) return false;
        if (statusFilter === 'ok') return st.cls === 'status-ok';
        if (statusFilter === 'soon') return st.cls === 'status-soon';
        if (statusFilter === 'overdue') return st.cls === 'status-overdue';
        return true;
      });
    }

    list.sort(function (a, b) {
      var nextA = a.next ? (isoToLocalDate(a.next) ? isoToLocalDate(a.next).getTime() : Infinity) : Infinity;
      var nextB = b.next ? (isoToLocalDate(b.next) ? isoToLocalDate(b.next).getTime() : Infinity) : Infinity;
      var dateA = a.date ? (isoToLocalDate(a.date) ? isoToLocalDate(a.date).getTime() : Infinity) : Infinity;
      var dateB = b.date ? (isoToLocalDate(b.date) ? isoToLocalDate(b.date).getTime() : Infinity) : Infinity;
      if (sortBy === 'nextAsc') return nextA - nextB;
      if (sortBy === 'nextDesc') return nextB - nextA;
      if (sortBy === 'dateAsc') return dateA - dateB;
      return dateB - dateA;
    });

    if (list.length === 0 && !searchQ && statusFilter === 'all') {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="60" height="60"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="36">💉</text></svg><p>' + t('noVaccines', escapeHtml(data.animal.name || '')) + '</p></div></td></tr>';
    } else {
      tbody.innerHTML = list.map(function (v) {
        var st = getStatus(v.next);
        var stHtml = st ? '<span class="status ' + st.cls + '"><span class="status-dot"></span>' + escapeHtml(st.lbl) + '</span>' : '—';
        var rel = v.next ? '<br><span class="table-muted">' + escapeHtml(relativeDate(v.next)) + '</span>' : '';
        return '<tr><td>' + fmtDate(v.date) + '</td>' +
          '<td><strong>' + escapeHtml(v.name || '') + '</strong><br><span class="table-muted">' + escapeHtml(v.vet || '') + '</span></td>' +
          '<td>' + fmtDate(v.next) + rel + '</td>' +
          '<td>' + stHtml + '</td>' +
          '<td><button type="button" class="btn-edit" data-vaccine-id="' + v.id + '">Modifier</button> <button type="button" class="btn-delete" data-vaccine-id="' + v.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce vaccin ?')) return;
        var id = parseInt(btn.getAttribute('data-vaccine-id'), 10);
        data.vaccines = data.vaccines.filter(function (v) { return v.id !== id; });
        saveState(); renderVaccines(); renderProfile();
        showToast('Vaccin supprimé', 'success');
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editVaccineId = parseInt(btn.getAttribute('data-vaccine-id'), 10);
        openModal('editVaccin');
      });
    });

    if (alertsEl) {
      var overdue = data.vaccines.filter(function (v) { return v.next && getStatus(v.next)?.cls === 'status-overdue'; });
      var soon = data.vaccines.filter(function (v) { return v.next && getStatus(v.next)?.cls === 'status-soon'; });
      var html = '';
      if (overdue.length) html += '<div class="alert-banner alert-warning"><span>⚠️</span> En retard : ' + overdue.map(function (v) { return escapeHtml(v.name); }).join(', ') + '</div>';
      if (soon.length) html += '<div class="alert-banner alert-info"><span>⏰</span> Bientôt : ' + soon.map(function (v) { return escapeHtml(v.name); }).join(', ') + '</div>';
      alertsEl.innerHTML = html;
    }
  }

  function addVaccine() {
    var name = document.getElementById('v-name').value.trim();
    var date = document.getElementById('v-date').value;
    if (!name || !date) { showToast('Nom et date du vaccin sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;

    var freqVal = document.getElementById('v-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('v-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';
    var next = computedNext || manualNext;

    data.vaccines.push({
      id: state.nextId++, date: date, name: name, next: next,
      frequencyDays: !isNaN(freqDays) && freqDays > 0 ? freqDays : '',
      vet: document.getElementById('v-vet').value.trim()
    });
    closeModal('addVaccin');
    saveState(); renderVaccines(); renderProfile();
    showToast('Vaccin ajouté', 'success');
  }

  function updateVaccineEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editVaccineId;
    var v = Array.isArray(data.vaccines) ? data.vaccines.find(function (x) { return x.id === id; }) : null;
    if (!v) return;

    var name = document.getElementById('ev-name').value.trim();
    var date = document.getElementById('ev-date').value;
    if (!name || !date) { showToast('Nom et date du vaccin sont requis.', 'error'); return; }

    var freqVal = document.getElementById('ev-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('ev-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    v.name = name; v.date = date; v.next = computedNext || manualNext;
    v.vet = document.getElementById('ev-vet').value.trim();
    v.frequencyDays = !isNaN(freqDays) && freqDays > 0 ? freqDays : '';

    closeModal('editVaccin');
    uiState.editVaccineId = null;
    saveState(); refreshAll();
    showToast('Vaccin modifié', 'success');
  }

  // ——— Dewormings ————————————————————————————————————
  function renderDewormings() {
    var data = getCurrent();
    var tbody = document.getElementById('deworming-table');
    if (!data || !tbody) return;

    var searchQ = (document.getElementById('deworming-search')?.value || '').toLowerCase().trim();
    var statusFilter = document.getElementById('deworming-status-filter')?.value || 'all';
    var sortBy = document.getElementById('deworming-sort')?.value || 'dateDesc';

    var list = Array.isArray(data.dewormings) ? data.dewormings.slice() : [];

    if (searchQ) {
      list = list.filter(function (d) {
        return (d.name || '').toLowerCase().includes(searchQ) || (d.type || '').toLowerCase().includes(searchQ) || (d.date || '').includes(searchQ);
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter(function (d) {
        var st = d.next ? getStatus(d.next) : null;
        if (!st) return false;
        if (statusFilter === 'ok') return st.cls === 'status-ok';
        if (statusFilter === 'soon') return st.cls === 'status-soon';
        if (statusFilter === 'overdue') return st.cls === 'status-overdue';
        return true;
      });
    }

    list.sort(function (a, b) {
      var nextA = a.next ? (isoToLocalDate(a.next) ? isoToLocalDate(a.next).getTime() : Infinity) : Infinity;
      var nextB = b.next ? (isoToLocalDate(b.next) ? isoToLocalDate(b.next).getTime() : Infinity) : Infinity;
      var dateA = a.date ? (isoToLocalDate(a.date) ? isoToLocalDate(a.date).getTime() : Infinity) : Infinity;
      var dateB = b.date ? (isoToLocalDate(b.date) ? isoToLocalDate(b.date).getTime() : Infinity) : Infinity;
      if (sortBy === 'nextAsc') return nextA - nextB;
      if (sortBy === 'nextDesc') return nextB - nextA;
      if (sortBy === 'dateAsc') return dateA - dateB;
      return dateB - dateA;
    });

    if (list.length === 0 && !searchQ && statusFilter === 'all') {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="60" height="60"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="36">💊</text></svg><p>' + t('noDewormings', escapeHtml(data.animal.name || '')) + '</p></div></td></tr>';
    } else {
      tbody.innerHTML = list.map(function (d) {
        var st = d.next ? getStatus(d.next) : null;
        var stHtml = st ? '<span class="status ' + st.cls + '"><span class="status-dot"></span>' + escapeHtml(st.lbl) + '</span>' : '—';
        var rel = d.next ? '<br><span class="table-muted">' + escapeHtml(relativeDate(d.next)) + '</span>' : '';
        return '<tr><td>' + fmtDate(d.date) + '</td>' +
          '<td><strong>' + escapeHtml(d.name || '') + '</strong><br><span class="table-muted">' + escapeHtml(d.type || '') + '</span></td>' +
          '<td>' + fmtDate(d.next) + rel + '</td>' +
          '<td>' + stHtml + '</td>' +
          '<td><button type="button" class="btn-edit" data-deworming-id="' + d.id + '">Modifier</button> <button type="button" class="btn-delete" data-deworming-id="' + d.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce déparasitage ?')) return;
        var id = parseInt(btn.getAttribute('data-deworming-id'), 10);
        data.dewormings = data.dewormings.filter(function (d) { return d.id !== id; });
        saveState(); renderDewormings(); renderProfile();
        showToast('Déparasitage supprimé', 'success');
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editDewormingId = parseInt(btn.getAttribute('data-deworming-id'), 10);
        openModal('editDeworming');
      });
    });
  }

  function addDeworming() {
    var name = document.getElementById('d-name').value.trim();
    var date = document.getElementById('d-date').value;
    if (!name || !date) { showToast('Traitement et date sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;

    var freqVal = document.getElementById('d-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('d-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    data.dewormings.push({
      id: state.nextId++, date: date, name: name, next: computedNext || manualNext,
      frequencyDays: !isNaN(freqDays) && freqDays > 0 ? freqDays : '',
      type: document.getElementById('d-type').value || 'interne'
    });
    closeModal('addDeworming');
    saveState(); renderDewormings(); renderProfile();
    showToast('Déparasitage ajouté', 'success');
  }

  function updateDewormingEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editDewormingId;
    var d = Array.isArray(data.dewormings) ? data.dewormings.find(function (x) { return x.id === id; }) : null;
    if (!d) return;

    var name = document.getElementById('ed-name').value.trim();
    var date = document.getElementById('ed-date').value;
    if (!name || !date) { showToast('Traitement et date sont requis.', 'error'); return; }

    var freqVal = document.getElementById('ed-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('ed-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    d.name = name; d.date = date; d.next = computedNext || manualNext;
    d.type = document.getElementById('ed-type').value || 'interne';
    d.frequencyDays = !isNaN(freqDays) && freqDays > 0 ? freqDays : '';

    closeModal('editDeworming');
    uiState.editDewormingId = null;
    saveState(); refreshAll();
    showToast('Déparasitage modifié', 'success');
  }

  // ——— Consultations ————————————————————————————————————
  function renderConsultations() {
    var data = getCurrent();
    var tbody = document.getElementById('consult-table');
    var emptyEl = document.getElementById('consult-empty');
    if (!data || !tbody) return;

    var list = Array.isArray(data.consultations) ? data.consultations.slice() : [];
    var searchQ = (document.getElementById('consult-search')?.value || '').toLowerCase().trim();

    if (searchQ) {
      list = list.filter(function (c) {
        return (c.reason || '').toLowerCase().includes(searchQ) || (c.vet || '').toLowerCase().includes(searchQ) || (c.diagnosis || '').toLowerCase().includes(searchQ);
      });
    }

    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (list.length === 0 && !searchQ) {
      tbody.innerHTML = '';
      if (emptyEl) {
        emptyEl.hidden = false;
        var emptyText = document.getElementById('consult-empty-text');
        if (emptyText) emptyText.textContent = t('noConsultations', escapeHtml(data.animal.name || ''));
      }
    } else {
      if (emptyEl) emptyEl.hidden = true;
      tbody.innerHTML = list.map(function (c) {
        return '<tr><td>' + fmtDate(c.date) + '</td>' +
          '<td><strong>' + escapeHtml(c.reason || '') + '</strong>' + (c.diagnosis ? '<br><span class="table-muted">' + escapeHtml(c.diagnosis) + '</span>' : '') + '</td>' +
          '<td>' + escapeHtml(c.vet || '—') + '</td>' +
          '<td>' + (c.cost != null && c.cost !== '' ? escapeHtml(c.cost) + ' €' : '—') + '</td>' +
          '<td><button type="button" class="btn-edit" data-consult-id="' + c.id + '">Modifier</button> <button type="button" class="btn-delete" data-consult-id="' + c.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette consultation ?')) return;
        var id = parseInt(btn.getAttribute('data-consult-id'), 10);
        data.consultations = data.consultations.filter(function (c) { return c.id !== id; });
        saveState(); renderConsultations();
        showToast('Consultation supprimée', 'success');
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editConsultId = parseInt(btn.getAttribute('data-consult-id'), 10);
        openModal('editConsult');
      });
    });
  }

  function addConsultation() {
    var date = document.getElementById('c-date').value;
    var reason = document.getElementById('c-reason').value.trim();
    if (!date || !reason) { showToast('Date et motif sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.consultations)) data.consultations = [];

    data.consultations.push({
      id: state.nextId++, date: date, vet: document.getElementById('c-vet').value.trim(),
      reason: reason, diagnosis: document.getElementById('c-diagnosis').value.trim(),
      treatment: document.getElementById('c-treatment').value.trim(),
      cost: parseFloat(document.getElementById('c-cost').value) || null,
      notes: document.getElementById('c-notes').value.trim()
    });
    closeModal('addConsult');
    saveState(); renderConsultations();
    showToast('Consultation ajoutée', 'success');
  }

  function updateConsultation() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editConsultId;
    var c = Array.isArray(data.consultations) ? data.consultations.find(function (x) { return x.id === id; }) : null;
    if (!c) return;

    var date = document.getElementById('ec-date').value;
    var reason = document.getElementById('ec-reason').value.trim();
    if (!date || !reason) { showToast('Date et motif sont requis.', 'error'); return; }

    c.date = date; c.vet = document.getElementById('ec-vet').value.trim();
    c.reason = reason; c.diagnosis = document.getElementById('ec-diagnosis').value.trim();
    c.treatment = document.getElementById('ec-treatment').value.trim();
    c.cost = parseFloat(document.getElementById('ec-cost').value) || null;
    c.notes = document.getElementById('ec-notes').value.trim();

    closeModal('editConsult');
    uiState.editConsultId = null;
    saveState(); renderConsultations();
    showToast('Consultation modifiée', 'success');
  }

  // ——— Medications ———————————————————————————————————————
  function renderMedications() {
    var data = getCurrent();
    var tbody = document.getElementById('medication-table');
    var emptyEl = document.getElementById('medication-empty');
    if (!data || !tbody) return;

    var list = Array.isArray(data.medications) ? data.medications.slice() : [];
    list.sort(function (a, b) { return new Date(b.startDate || 0) - new Date(a.startDate || 0); });

    if (list.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      var todayDt = new Date();
      tbody.innerHTML = list.map(function (m) {
        var isActive = m.active !== false && (!m.endDate || isoToLocalDate(m.endDate) >= todayDt);
        var statusHtml = isActive
          ? '<span class="status status-ok"><span class="status-dot"></span>En cours</span>'
          : '<span class="status"><span class="status-dot"></span>Terminé</span>';
        return '<tr><td><strong>' + escapeHtml(m.name || '') + '</strong></td>' +
          '<td>' + escapeHtml(m.dosage || '—') + '<br><span class="table-muted">' + escapeHtml(m.frequency || '') + '</span></td>' +
          '<td>' + fmtDate(m.startDate) + '</td>' +
          '<td>' + fmtDate(m.endDate) + '</td>' +
          '<td>' + statusHtml + '</td>' +
          '<td><button type="button" class="btn-edit" data-med-id="' + m.id + '">Modifier</button> <button type="button" class="btn-delete" data-med-id="' + m.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce médicament ?')) return;
        var id = parseInt(btn.getAttribute('data-med-id'), 10);
        data.medications = data.medications.filter(function (m) { return m.id !== id; });
        saveState(); renderMedications(); renderProfile();
        showToast('Médicament supprimé', 'success');
      });
    });

    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editMedicationId = parseInt(btn.getAttribute('data-med-id'), 10);
        openModal('editMedication');
      });
    });
  }

  function addMedication() {
    var name = document.getElementById('m-name').value.trim();
    var startDate = document.getElementById('m-start').value;
    if (!name || !startDate) { showToast('Nom et date de début sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.medications)) data.medications = [];

    data.medications.push({
      id: state.nextId++, name: name, dosage: document.getElementById('m-dosage').value.trim(),
      frequency: document.getElementById('m-frequency').value.trim(),
      startDate: startDate, endDate: document.getElementById('m-end').value || '',
      notes: document.getElementById('m-notes').value.trim(), active: true
    });
    closeModal('addMedication');
    saveState(); renderMedications(); renderProfile();
    showToast('Médicament ajouté', 'success');
  }

  function updateMedication() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editMedicationId;
    var m = Array.isArray(data.medications) ? data.medications.find(function (x) { return x.id === id; }) : null;
    if (!m) return;

    m.name = document.getElementById('em-name').value.trim();
    m.dosage = document.getElementById('em-dosage').value.trim();
    m.frequency = document.getElementById('em-frequency').value.trim();
    m.startDate = document.getElementById('em-start').value;
    m.endDate = document.getElementById('em-end').value || '';
    m.notes = document.getElementById('em-notes').value.trim();

    closeModal('editMedication');
    uiState.editMedicationId = null;
    saveState(); renderMedications(); renderProfile();
    showToast('Médicament modifié', 'success');
  }

  // ——— Journal / Notes ———————————————————————————————————
  function renderJournal() {
    var data = getCurrent();
    var container = document.getElementById('journal-cards');
    var emptyEl = document.getElementById('journal-empty');
    if (!data || !container) return;

    var catFilter = document.getElementById('journal-cat-filter')?.value || 'all';
    var list = Array.isArray(data.notes) ? data.notes.slice() : [];

    if (catFilter !== 'all') {
      list = list.filter(function (n) { return n.category === catFilter; });
    }

    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (list.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      var catLabels = { sante: 'Santé', comportement: 'Comportement', alimentation: 'Alimentation', autre: 'Autre' };
      container.innerHTML = list.map(function (n) {
        return '<div class="journal-card">' +
          '<div class="journal-card-header">' +
          '<div class="journal-card-title">' + escapeHtml(n.title || 'Sans titre') + '</div>' +
          '<span class="journal-card-cat">' + escapeHtml(catLabels[n.category] || n.category || 'Autre') + '</span>' +
          '</div>' +
          '<div class="journal-card-date">' + fmtDate(n.date) + ' · ' + escapeHtml(relativeDate(n.date)) + '</div>' +
          '<div class="journal-card-content">' + escapeHtml(n.content || '') + '</div>' +
          '<div class="journal-card-actions">' +
          '<button type="button" class="btn-edit" data-note-id="' + n.id + '">Modifier</button> ' +
          '<button type="button" class="btn-delete" data-note-id="' + n.id + '">✕</button>' +
          '</div></div>';
      }).join('');
    }

    container.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette note ?')) return;
        var id = parseInt(btn.getAttribute('data-note-id'), 10);
        data.notes = data.notes.filter(function (n) { return n.id !== id; });
        saveState(); renderJournal();
        showToast('Note supprimée', 'success');
      });
    });

    container.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editNoteId = parseInt(btn.getAttribute('data-note-id'), 10);
        openModal('editNote');
      });
    });
  }

  function addNote() {
    var date = document.getElementById('n-date').value;
    var title = document.getElementById('n-title').value.trim();
    if (!date || !title) { showToast('Date et titre sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.notes)) data.notes = [];

    data.notes.push({
      id: state.nextId++, date: date, title: title,
      content: document.getElementById('n-content').value.trim(),
      category: document.getElementById('n-category').value || 'autre'
    });
    closeModal('addNote');
    saveState(); renderJournal();
    showToast('Note ajoutée', 'success');
  }

  function updateNote() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editNoteId;
    var n = Array.isArray(data.notes) ? data.notes.find(function (x) { return x.id === id; }) : null;
    if (!n) return;

    n.date = document.getElementById('en-date').value;
    n.title = document.getElementById('en-title').value.trim();
    n.content = document.getElementById('en-content').value.trim();
    n.category = document.getElementById('en-category').value || 'autre';

    closeModal('editNote');
    uiState.editNoteId = null;
    saveState(); renderJournal();
    showToast('Note modifiée', 'success');
  }

  // ——— Hygiene ————————————————————————————————————————
  var HYGIENE_TYPES = ['Brossage dents', 'Coupe griffes', 'Bain', 'Toilettage', 'Nettoyage oreilles', 'Nettoyage yeux'];

  function renderHygiene() {
    var data = getCurrent();
    var tbody = document.getElementById('hygiene-table');
    if (!data || !tbody) return;

    var searchQ = (document.getElementById('hygiene-search')?.value || '').toLowerCase().trim();
    var statusFilter = document.getElementById('hygiene-status-filter')?.value || 'all';
    var sortBy = document.getElementById('hygiene-sort')?.value || 'dateDesc';
    var list = Array.isArray(data.hygiene) ? data.hygiene.slice() : [];

    if (searchQ) {
      list = list.filter(function (h) {
        return (h.type || '').toLowerCase().includes(searchQ) || (h.notes || '').toLowerCase().includes(searchQ) || (h.date || '').includes(searchQ);
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter(function (h) {
        var st = h.next ? getStatus(h.next) : null;
        if (!st) return false;
        if (statusFilter === 'ok') return st.cls === 'status-ok';
        if (statusFilter === 'soon') return st.cls === 'status-soon';
        if (statusFilter === 'overdue') return st.cls === 'status-overdue';
        return true;
      });
    }
    list.sort(function (a, b) {
      var nextA = a.next ? (isoToLocalDate(a.next) ? isoToLocalDate(a.next).getTime() : Infinity) : Infinity;
      var nextB = b.next ? (isoToLocalDate(b.next) ? isoToLocalDate(b.next).getTime() : Infinity) : Infinity;
      var dateA = a.date ? (isoToLocalDate(a.date) ? isoToLocalDate(a.date).getTime() : Infinity) : Infinity;
      var dateB = b.date ? (isoToLocalDate(b.date) ? isoToLocalDate(b.date).getTime() : Infinity) : Infinity;
      if (sortBy === 'nextAsc') return nextA - nextB;
      if (sortBy === 'nextDesc') return nextB - nextA;
      if (sortBy === 'dateAsc') return dateA - dateB;
      return dateB - dateA;
    });

    if (list.length === 0 && !searchQ && statusFilter === 'all') {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="60" height="60"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="36">🧼</text></svg><p>Aucun soin d\'hygiène enregistré</p></div></td></tr>';
    } else {
      tbody.innerHTML = list.map(function (h) {
        var st = h.next ? getStatus(h.next) : null;
        var stHtml = st ? '<span class="status ' + st.cls + '"><span class="status-dot"></span>' + escapeHtml(st.lbl) + '</span>' : '—';
        var rel = h.next ? '<br><span class="table-muted">' + escapeHtml(relativeDate(h.next)) + '</span>' : '';
        return '<tr><td>' + fmtDate(h.date) + '</td>' +
          '<td><strong>' + escapeHtml(h.type || '') + '</strong>' + (h.notes ? '<br><span class="table-muted">' + escapeHtml(h.notes) + '</span>' : '') + '</td>' +
          '<td>' + fmtDate(h.next) + rel + '</td>' +
          '<td>' + stHtml + '</td>' +
          '<td><button type="button" class="btn-edit" data-hygiene-id="' + h.id + '">Modifier</button> <button type="button" class="btn-delete" data-hygiene-id="' + h.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce soin ?')) return;
        var id = parseInt(btn.getAttribute('data-hygiene-id'), 10);
        data.hygiene = data.hygiene.filter(function (h) { return h.id !== id; });
        saveState(); renderHygiene(); renderProfile();
        showToast('Soin supprimé', 'success');
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editHygieneId = parseInt(btn.getAttribute('data-hygiene-id'), 10);
        openModal('editHygiene');
      });
    });
  }

  function addHygiene() {
    var type = document.getElementById('hy-type').value;
    var date = document.getElementById('hy-date').value;
    if (!type || !date) { showToast('Type et date sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.hygiene)) data.hygiene = [];

    var freqVal = document.getElementById('hy-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('hy-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    data.hygiene.push({
      id: state.nextId++, type: type, date: date, next: computedNext || manualNext,
      frequencyDays: !isNaN(freqDays) && freqDays > 0 ? freqDays : '',
      notes: document.getElementById('hy-notes').value.trim()
    });
    closeModal('addHygiene');
    saveState(); renderHygiene(); renderProfile();
    showToast('Soin ajouté', 'success');
  }

  function updateHygieneEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editHygieneId;
    var h = Array.isArray(data.hygiene) ? data.hygiene.find(function (x) { return x.id === id; }) : null;
    if (!h) return;

    var type = document.getElementById('ehy-type').value;
    var date = document.getElementById('ehy-date').value;
    if (!type || !date) { showToast('Type et date sont requis.', 'error'); return; }

    var freqVal = document.getElementById('ehy-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('ehy-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    h.type = type; h.date = date; h.next = computedNext || manualNext;
    h.frequencyDays = !isNaN(freqDays) && freqDays > 0 ? freqDays : '';
    h.notes = document.getElementById('ehy-notes').value.trim();

    closeModal('editHygiene');
    uiState.editHygieneId = null;
    saveState(); refreshAll();
    showToast('Soin modifié', 'success');
  }

  // ——— Heat Cycles ————————————————————————————————————————
  function renderHeatCycles() {
    var data = getCurrent();
    var section = document.getElementById('section-chaleurs');
    if (!data || !section) return;

    var container = document.getElementById('heat-cycles-content');
    var naMsg = document.getElementById('heat-na-message');
    if (!container || !naMsg) return;

    var isFemaleIntact = data.animal.sex === 'Femelle' && data.animal.sterilise !== 'Oui';
    container.hidden = !isFemaleIntact;
    naMsg.hidden = isFemaleIntact;
    if (!isFemaleIntact) return;

    var tbody = document.getElementById('heat-table');
    if (!tbody) return;

    var list = Array.isArray(data.heatCycles) ? data.heatCycles.slice() : [];
    list.sort(function (a, b) { return new Date(b.startDate) - new Date(a.startDate); });

    // Predictive logic
    var predictionHtml = '';
    var sorted = list.slice().sort(function (a, b) { return new Date(a.startDate) - new Date(b.startDate); });
    var avgCycle = 180;
    if (sorted.length >= 2) {
      var gaps = [];
      for (var i = 1; i < sorted.length; i++) {
        var diff = Math.round((new Date(sorted[i].startDate) - new Date(sorted[i - 1].startDate)) / 864e5);
        if (diff > 0) gaps.push(diff);
      }
      if (gaps.length > 0) avgCycle = Math.round(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length);
    }
    if (sorted.length > 0) {
      var lastStart = sorted[sorted.length - 1].startDate;
      var nextPredicted = addDaysISO(lastStart, avgCycle);
      var rel = relativeDate(nextPredicted);
      predictionHtml = '<div class="heat-prediction-banner"><span>🔮</span> Prochaines chaleurs estimées : <strong>' + fmtDate(nextPredicted) + '</strong> (' + escapeHtml(rel) + ') — cycle moyen : ' + avgCycle + ' jours</div>';
    }

    var predEl = document.getElementById('heat-prediction');
    if (predEl) predEl.innerHTML = predictionHtml;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="60" height="60"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="36">🌡️</text></svg><p>Aucune période enregistrée</p></div></td></tr>';
    } else {
      tbody.innerHTML = list.map(function (c) {
        var duration = '';
        if (c.startDate && c.endDate) {
          var days = Math.round((new Date(c.endDate) - new Date(c.startDate)) / 864e5);
          duration = days + ' jours';
        }
        return '<tr><td>' + fmtDate(c.startDate) + '</td>' +
          '<td>' + fmtDate(c.endDate) + '</td>' +
          '<td>' + escapeHtml(duration) + '</td>' +
          '<td>' + escapeHtml(c.intensity || '') + '</td>' +
          '<td>' + escapeHtml(c.notes || '') + '</td>' +
          '<td><button type="button" class="btn-edit" data-heat-id="' + c.id + '">Modifier</button> <button type="button" class="btn-delete" data-heat-id="' + c.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette période ?')) return;
        var id = parseInt(btn.getAttribute('data-heat-id'), 10);
        data.heatCycles = data.heatCycles.filter(function (c) { return c.id !== id; });
        saveState(); renderHeatCycles();
        showToast('Période supprimée', 'success');
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editHeatCycleId = parseInt(btn.getAttribute('data-heat-id'), 10);
        openModal('editHeatCycle');
      });
    });
  }

  function addHeatCycle() {
    var startDate = document.getElementById('hc-start').value;
    if (!startDate) { showToast('Date de début requise.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.heatCycles)) data.heatCycles = [];

    data.heatCycles.push({
      id: state.nextId++, startDate: startDate,
      endDate: document.getElementById('hc-end').value || '',
      intensity: document.getElementById('hc-intensity').value || 'Moyenne',
      notes: document.getElementById('hc-notes').value.trim()
    });
    closeModal('addHeatCycle');
    saveState(); renderHeatCycles();
    showToast('Période ajoutée', 'success');
  }

  function updateHeatCycleEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editHeatCycleId;
    var c = Array.isArray(data.heatCycles) ? data.heatCycles.find(function (x) { return x.id === id; }) : null;
    if (!c) return;

    var startDate = document.getElementById('ehc-start').value;
    if (!startDate) { showToast('Date de début requise.', 'error'); return; }

    c.startDate = startDate;
    c.endDate = document.getElementById('ehc-end').value || '';
    c.intensity = document.getElementById('ehc-intensity').value || 'Moyenne';
    c.notes = document.getElementById('ehc-notes').value.trim();

    closeModal('editHeatCycle');
    uiState.editHeatCycleId = null;
    saveState(); refreshAll();
    showToast('Période modifiée', 'success');
  }

  // ——— Check-up rapide ————————————————————————————————————
  var CHECKUP_QUESTIONS = [
    { key: 'appetite', label: 'Appétit', icon: '🍽️', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'energy', label: 'Énergie', icon: '⚡', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'hydration', label: 'Hydratation', icon: '💧', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'coat', label: 'Pelage', icon: '✨', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'eyes', label: 'Yeux', icon: '👁️', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'ears', label: 'Oreilles', icon: '👂', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'gums', label: 'Gencives', icon: '🦷', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'mobility', label: 'Mobilité', icon: '🦿', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'behavior', label: 'Comportement', icon: '🧠', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'weight', label: 'Poids', icon: '⚖️', levels: ['Normal', 'À surveiller', 'Préoccupant'] }
  ];

  function renderCheckup() {
    var container = document.getElementById('checkup-content');
    if (!container) return;

    var html = '<div class="checkup-intro"><h3>Évaluez rapidement l\'état de santé de votre animal</h3><p>Répondez aux 10 questions ci-dessous en choisissant le niveau qui correspond le mieux.</p></div>';
    html += '<div class="checkup-questions">';
    CHECKUP_QUESTIONS.forEach(function (q) {
      html += '<div class="checkup-question" data-key="' + q.key + '">' +
        '<div class="checkup-q-label">' + q.icon + ' ' + escapeHtml(q.label) + '</div>' +
        '<div class="checkup-levels">' +
        '<button type="button" class="checkup-level checkup-level-1" data-key="' + q.key + '" data-value="1">Normal</button>' +
        '<button type="button" class="checkup-level checkup-level-2" data-key="' + q.key + '" data-value="2">À surveiller</button>' +
        '<button type="button" class="checkup-level checkup-level-3" data-key="' + q.key + '" data-value="3">Préoccupant</button>' +
        '</div></div>';
    });
    html += '</div>';
    html += '<div class="checkup-actions"><button type="button" class="btn-primary" id="btn-checkup-submit">Calculer le score</button></div>';
    html += '<div id="checkup-result" class="checkup-result" hidden></div>';

    container.innerHTML = html;

    var answers = {};
    container.querySelectorAll('.checkup-level').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        var val = parseInt(btn.getAttribute('data-value'), 10);
        answers[key] = val;
        var siblings = btn.parentElement.querySelectorAll('.checkup-level');
        siblings.forEach(function (s) { s.classList.remove('active'); });
        btn.classList.add('active');
      });
    });

    document.getElementById('btn-checkup-submit').addEventListener('click', function () {
      var keys = CHECKUP_QUESTIONS.map(function (q) { return q.key; });
      var answered = keys.filter(function (k) { return answers[k]; });
      if (answered.length < keys.length) {
        showToast('Répondez à toutes les questions.', 'warning');
        return;
      }
      var total = keys.reduce(function (sum, k) { return sum + (answers[k] || 1); }, 0);
      var avg = total / keys.length;

      var color, label, reco;
      if (avg <= 1.3) {
        color = '#22c55e'; label = 'Bon état général'; reco = 'Votre animal semble en bonne santé. Continuez les soins réguliers et les visites de contrôle.';
      } else if (avg <= 2.0) {
        color = '#f59e0b'; label = 'À surveiller'; reco = 'Certains points méritent votre attention. Surveillez l\'évolution et consultez un vétérinaire si les symptômes persistent.';
      } else {
        color = '#ef4444'; label = 'Consultation recommandée'; reco = 'Plusieurs indicateurs sont préoccupants. Une visite chez le vétérinaire est recommandée rapidement.';
      }

      var detailHtml = keys.map(function (k) {
        var q = CHECKUP_QUESTIONS.find(function (x) { return x.key === k; });
        var v = answers[k];
        var cls = v === 1 ? 'checkup-ok' : (v === 2 ? 'checkup-warn' : 'checkup-bad');
        return '<div class="checkup-detail-row ' + cls + '">' + q.icon + ' ' + escapeHtml(q.label) + ': <strong>' + q.levels[v - 1] + '</strong></div>';
      }).join('');

      var resultEl = document.getElementById('checkup-result');
      resultEl.hidden = false;
      resultEl.innerHTML = '<div class="checkup-score-card" style="border-color:' + color + '">' +
        '<div class="checkup-score-header" style="background:' + color + '">' +
        '<div class="checkup-score-value">' + avg.toFixed(1) + ' / 3</div>' +
        '<div class="checkup-score-label">' + escapeHtml(label) + '</div></div>' +
        '<div class="checkup-score-body"><p>' + escapeHtml(reco) + '</p>' + detailHtml +
        '<button type="button" class="btn-primary" id="btn-checkup-save" style="margin-top:12px">📝 Sauvegarder dans le journal</button></div></div>';

      document.getElementById('btn-checkup-save').addEventListener('click', function () {
        var data = getCurrent();
        if (!data) return;
        if (!Array.isArray(data.notes)) data.notes = [];
        var content = 'Score: ' + avg.toFixed(1) + '/3 — ' + label + '\n' + keys.map(function (k) {
          var q = CHECKUP_QUESTIONS.find(function (x) { return x.key === k; });
          return q.label + ': ' + q.levels[answers[k] - 1];
        }).join('\n');
        data.notes.push({ id: state.nextId++, date: todayISO(), title: 'Check-up rapide — ' + label, content: content, category: 'sante' });
        saveState();
        showToast('Résultat sauvegardé dans le journal', 'success');
      });

      resultEl.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ——— Activities ————————————————————————————————————————
  var ACTIVITY_TYPES = ['Promenade', 'Course', 'Jeu', 'Natation', 'Agility', 'Autre'];

  function renderActivities() {
    var data = getCurrent();
    var tbody = document.getElementById('activity-table');
    var statsEl = document.getElementById('activity-stats');
    if (!data || !tbody) return;

    var list = Array.isArray(data.activities) ? data.activities.slice() : [];
    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    // Stats
    if (statsEl) {
      if (list.length === 0) {
        statsEl.innerHTML = '';
      } else {
        var totalDuration = list.reduce(function (s, a) { return s + (parseFloat(a.duration) || 0); }, 0);
        var totalDistance = list.reduce(function (s, a) { return s + (parseFloat(a.distance) || 0); }, 0);
        var typeCounts = {};
        list.forEach(function (a) { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
        var topType = Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; })[0] || '—';
        statsEl.innerHTML =
          '<div class="stat-card"><span class="stat-number">' + list.length + '</span><span class="stat-label">Sessions</span></div>' +
          '<div class="stat-card"><span class="stat-number">' + Math.round(totalDuration) + '</span><span class="stat-label">min totales</span></div>' +
          '<div class="stat-card"><span class="stat-number">' + totalDistance.toFixed(1) + '</span><span class="stat-label">km parcourus</span></div>' +
          '<div class="stat-card"><span class="stat-number stat-accent">' + escapeHtml(topType) + '</span><span class="stat-label">Activité favorite</span></div>';
      }
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="60" height="60"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="36">🏃</text></svg><p>Aucune activité enregistrée</p></div></td></tr>';
    } else {
      tbody.innerHTML = list.map(function (a) {
        return '<tr><td>' + fmtDate(a.date) + '</td>' +
          '<td>' + escapeHtml(a.type || '') + '</td>' +
          '<td>' + (a.duration ? a.duration + ' min' : '—') + '</td>' +
          '<td>' + (a.distance ? a.distance + ' km' : '—') + '</td>' +
          '<td>' + escapeHtml(a.notes || '') + '</td>' +
          '<td><button type="button" class="btn-edit" data-activity-id="' + a.id + '">Modifier</button> <button type="button" class="btn-delete" data-activity-id="' + a.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer cette activité ?')) return;
        var id = parseInt(btn.getAttribute('data-activity-id'), 10);
        data.activities = data.activities.filter(function (a) { return a.id !== id; });
        saveState(); renderActivities();
        showToast('Activité supprimée', 'success');
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editActivityId = parseInt(btn.getAttribute('data-activity-id'), 10);
        openModal('editActivity');
      });
    });
  }

  function addActivity() {
    var date = document.getElementById('act-date').value;
    var type = document.getElementById('act-type').value;
    if (!date || !type) { showToast('Date et type sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.activities)) data.activities = [];

    data.activities.push({
      id: state.nextId++, date: date, type: type,
      duration: document.getElementById('act-duration').value || '',
      distance: document.getElementById('act-distance').value || '',
      notes: document.getElementById('act-notes').value.trim()
    });
    closeModal('addActivity');
    saveState(); renderActivities();
    showToast('Activité ajoutée', 'success');
  }

  function updateActivityEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editActivityId;
    var a = Array.isArray(data.activities) ? data.activities.find(function (x) { return x.id === id; }) : null;
    if (!a) return;

    var date = document.getElementById('eact-date').value;
    var type = document.getElementById('eact-type').value;
    if (!date || !type) { showToast('Date et type sont requis.', 'error'); return; }

    a.date = date; a.type = type;
    a.duration = document.getElementById('eact-duration').value || '';
    a.distance = document.getElementById('eact-distance').value || '';
    a.notes = document.getElementById('eact-notes').value.trim();

    closeModal('editActivity');
    uiState.editActivityId = null;
    saveState(); refreshAll();
    showToast('Activité modifiée', 'success');
  }

  // ——— Nutrition ————————————————————————————————————————
  var MEAL_TYPES = ['Croquettes', 'Pâtée', 'BARF', 'Ration ménagère', 'Friandise'];

  function renderNutrition() {
    var data = getCurrent();
    var container = document.getElementById('nutrition-content');
    if (!data || !container) return;

    if (!data.nutrition) data.nutrition = { meals: [], dailyPlan: {} };
    var plan = data.nutrition.dailyPlan || {};
    var meals = Array.isArray(data.nutrition.meals) ? data.nutrition.meals.slice() : [];
    meals.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    // Calorie estimation
    var weight = parseFloat(data.animal.weight) || 0;
    var rer = weight > 0 ? 70 * Math.pow(weight, 0.75) : 0;
    var mer = rer * 1.6;

    // Plan card
    var planHtml = '<div class="nutrition-plan-card"><div class="card-header"><h3 class="section-title">📋 Plan nutritionnel</h3><button type="button" class="btn-icon" onclick="app.openModal(\'editNutritionPlan\')">✏️ Modifier</button></div>' +
      '<div class="info-grid">' +
      '<div><span class="info-label">Marque aliment</span><span class="info-value">' + escapeHtml(plan.foodBrand || 'Non renseigné') + '</span></div>' +
      '<div><span class="info-label">Portion</span><span class="info-value">' + escapeHtml(plan.portionSize || 'Non renseigné') + '</span></div>' +
      '<div><span class="info-label">Repas/jour</span><span class="info-value">' + escapeHtml(plan.mealsPerDay || 'Non renseigné') + '</span></div>' +
      '<div><span class="info-label">Objectif calories</span><span class="info-value">' + (plan.targetCalories || 'Auto') + '</span></div>' +
      '</div>';
    if (weight > 0) {
      planHtml += '<div class="nutrition-calorie-info">Estimation calorique : RER = <strong>' + Math.round(rer) + ' kcal</strong> · MER = <strong>' + Math.round(mer) + ' kcal/j</strong> (facteur 1.6)</div>';
    }
    planHtml += '</div>';

    // Today's summary
    var todayStr = todayISO();
    var todayMeals = meals.filter(function (m) { return m.date === todayStr; });
    var plannedPerDay = parseInt(plan.mealsPerDay, 10) || 0;
    var summaryHtml = '<div class="nutrition-summary"><h3>Aujourd\'hui : ' + todayMeals.length + (plannedPerDay ? ' / ' + plannedPerDay : '') + ' repas</h3></div>';

    // Table
    var tableHtml = '<div class="data-table"><div class="table-header"><div class="table-header-left"><h2 class="section-title">🍽️ Repas enregistrés</h2></div><button type="button" class="btn-icon" onclick="app.openModal(\'addMeal\')">+ Ajouter</button></div>' +
      '<div class="table-scroll"><table><thead><tr><th>Date</th><th>Heure</th><th>Type</th><th>Aliment</th><th>Quantité</th><th>Notes</th><th></th></tr></thead><tbody id="meal-table"></tbody></table></div></div>';

    container.innerHTML = planHtml + summaryHtml + tableHtml;

    var tbody = document.getElementById('meal-table');
    if (meals.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state-illustrated"><svg class="empty-svg" viewBox="0 0 120 120" width="60" height="60"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-size="36">🍽️</text></svg><p>Aucun repas enregistré</p></div></td></tr>';
    } else {
      tbody.innerHTML = meals.map(function (m) {
        return '<tr><td>' + fmtDate(m.date) + '</td>' +
          '<td>' + escapeHtml(m.time || '') + '</td>' +
          '<td>' + escapeHtml(m.type || '') + '</td>' +
          '<td>' + escapeHtml(m.food || '') + '</td>' +
          '<td>' + (m.quantity ? escapeHtml(m.quantity) + ' ' + escapeHtml(m.unit || '') : '—') + '</td>' +
          '<td>' + escapeHtml(m.notes || '') + '</td>' +
          '<td><button type="button" class="btn-edit" data-meal-id="' + m.id + '">Modifier</button> <button type="button" class="btn-delete" data-meal-id="' + m.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce repas ?')) return;
        var id = parseInt(btn.getAttribute('data-meal-id'), 10);
        data.nutrition.meals = data.nutrition.meals.filter(function (m) { return m.id !== id; });
        saveState(); renderNutrition();
        showToast('Repas supprimé', 'success');
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editMealId = parseInt(btn.getAttribute('data-meal-id'), 10);
        openModal('editMeal');
      });
    });
  }

  function addMeal() {
    var date = document.getElementById('meal-date').value;
    var type = document.getElementById('meal-type').value;
    if (!date || !type) { showToast('Date et type sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!data.nutrition) data.nutrition = { meals: [], dailyPlan: {} };
    if (!Array.isArray(data.nutrition.meals)) data.nutrition.meals = [];

    data.nutrition.meals.push({
      id: state.nextId++, date: date, type: type,
      time: document.getElementById('meal-time').value || '',
      food: document.getElementById('meal-food').value.trim(),
      quantity: document.getElementById('meal-quantity').value || '',
      unit: document.getElementById('meal-unit').value || 'g',
      notes: document.getElementById('meal-notes').value.trim()
    });
    closeModal('addMeal');
    saveState(); renderNutrition();
    showToast('Repas ajouté', 'success');
  }

  function updateMealEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editMealId;
    var m = data.nutrition && Array.isArray(data.nutrition.meals) ? data.nutrition.meals.find(function (x) { return x.id === id; }) : null;
    if (!m) return;

    m.date = document.getElementById('emeal-date').value;
    m.type = document.getElementById('emeal-type').value;
    m.time = document.getElementById('emeal-time').value || '';
    m.food = document.getElementById('emeal-food').value.trim();
    m.quantity = document.getElementById('emeal-quantity').value || '';
    m.unit = document.getElementById('emeal-unit').value || 'g';
    m.notes = document.getElementById('emeal-notes').value.trim();

    closeModal('editMeal');
    uiState.editMealId = null;
    saveState(); renderNutrition();
    showToast('Repas modifié', 'success');
  }

  function saveNutritionPlan() {
    var data = getCurrent();
    if (!data) return;
    if (!data.nutrition) data.nutrition = { meals: [], dailyPlan: {} };
    data.nutrition.dailyPlan = {
      targetCalories: document.getElementById('np-calories').value || '',
      mealsPerDay: document.getElementById('np-meals-per-day').value || '',
      foodBrand: document.getElementById('np-food-brand').value.trim(),
      portionSize: document.getElementById('np-portion').value.trim()
    };
    closeModal('editNutritionPlan');
    saveState(); renderNutrition();
    showToast('Plan nutritionnel enregistré', 'success');
  }

  // ——— Pedigree ————————————————————————————————————————
  function renderPedigree() {
    var data = getCurrent();
    var container = document.getElementById('pedigree-card');
    if (!data || !container) return;

    var p = data.pedigree || {};
    var name = escapeHtml(data.animal.name || 'Animal');
    var chip = p.chipNumber || data.animal.chip || '';

    var html = '<div class="card-header"><h2 class="section-title">🏆 Pedigree</h2><button type="button" class="btn-icon" onclick="app.openModal(\'editPedigree\')">✏️ Modifier</button></div>';

    if (p.registry && p.registry !== 'Non inscrit') {
      html += '<div class="pedigree-registry"><span class="badge">' + escapeHtml(p.registry) + '</span>';
      if (p.registryNumber) html += ' <span class="table-muted">N° ' + escapeHtml(p.registryNumber) + '</span>';
      if (p.verified) {
        html += ' <span class="badge badge-verified">✅ Vérifié</span>';
        if (p.verifiedDate) html += ' <span class="table-muted">le ' + escapeHtml(p.verifiedDate) + '</span>';
      }
      html += '</div>';
    }
    if (chip) {
      html += '<div class="pedigree-chip">N° Puce : <span class="chip-number">' + escapeHtml(chip) + '</span></div>';
    }

    // Tree
    var gp = p.grandparents || {};
    html += '<div class="pedigree-tree">' +
      '<div class="pedigree-generation pedigree-gp">' +
        '<div class="pedigree-node pedigree-node-gp">' + escapeHtml(gp.paternalGrandsire || '?') + '</div>' +
        '<div class="pedigree-node pedigree-node-gp">' + escapeHtml(gp.paternalGranddam || '?') + '</div>' +
        '<div class="pedigree-node pedigree-node-gp">' + escapeHtml(gp.maternalGrandsire || '?') + '</div>' +
        '<div class="pedigree-node pedigree-node-gp">' + escapeHtml(gp.maternalGranddam || '?') + '</div>' +
      '</div>' +
      '<div class="pedigree-generation pedigree-parents">' +
        '<div class="pedigree-node pedigree-node-parent">♂ ' + escapeHtml((p.sire && p.sire.name) || '?') + (p.sire && p.sire.registry ? '<br><span class="table-muted">' + escapeHtml(p.sire.registry) + '</span>' : '') + '</div>' +
        '<div class="pedigree-node pedigree-node-parent">♀ ' + escapeHtml((p.dam && p.dam.name) || '?') + (p.dam && p.dam.registry ? '<br><span class="table-muted">' + escapeHtml(p.dam.registry) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="pedigree-generation pedigree-subject">' +
        '<div class="pedigree-node pedigree-node-subject">' + name + '</div>' +
      '</div>' +
    '</div>';

    if (p.registry && p.registry !== 'Non inscrit') {
      html += '<div class="lof-disclaimer-display"><small>⚠️ La vérification est une simulation locale de format. Une vérification officielle nécessite un accès aux bases de la SCC (LOF) ou aux registres officiels (LOMAD).</small></div>';
    }

    container.innerHTML = html;
  }

  function savePedigree() {
    var data = getCurrent();
    if (!data) return;
    var registry = document.getElementById('ped-registry').value || 'Non inscrit';
    var regNumber = document.getElementById('ped-reg-number').value.trim();
    var vResult = validateRegistryNumber(registry, regNumber);
    data.pedigree = {
      registry: registry,
      registryNumber: regNumber,
      chipNumber: document.getElementById('ped-chip').value.trim(),
      sire: { name: document.getElementById('ped-sire-name').value.trim(), registry: document.getElementById('ped-sire-reg').value.trim() },
      dam: { name: document.getElementById('ped-dam-name').value.trim(), registry: document.getElementById('ped-dam-reg').value.trim() },
      grandparents: {
        paternalGrandsire: document.getElementById('ped-gp-ps').value.trim(),
        paternalGranddam: document.getElementById('ped-gp-pd').value.trim(),
        maternalGrandsire: document.getElementById('ped-gp-ms').value.trim(),
        maternalGranddam: document.getElementById('ped-gp-md').value.trim()
      },
      verified: vResult.valid,
      verifiedDate: vResult.valid ? new Date().toISOString().slice(0, 10) : null
    };
    closeModal('editPedigree');
    saveState(); renderPedigree();
    showToast('Pedigree enregistré', 'success');
  }

  // ——— Vet Directory (app-level) ————————————————————————————
  var DEFAULT_VET_ENTRIES = [
    { id: 1, name: 'Centre Antipoison Animal CAPAE-Ouest', clinic: 'CAPAE-Ouest', phone: '02 40 68 77 40', email: '', address: 'Nantes', hours: '24h/24', emergency: true, favorite: false, notes: 'Centre antipoison vétérinaire', lat: 47.2184, lng: -1.5536 },
    { id: 2, name: 'Centre Antipoison VetAgro Sup', clinic: 'VetAgro Sup', phone: '04 78 87 10 40', email: '', address: 'Lyon', hours: '24h/24', emergency: true, favorite: false, notes: 'Centre antipoison vétérinaire', lat: 45.7640, lng: 4.8357 }
  ];

  function loadVetDirectory() {
    try {
      var raw = localStorage.getItem(VET_DIRECTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { entries: DEFAULT_VET_ENTRIES.slice(), nextId: 10 };
  }

  function saveVetDirectory(dir) {
    try { localStorage.setItem(VET_DIRECTORY_KEY, JSON.stringify(dir)); } catch (e) {}
  }

  function renderVetDirectory() {
    var container = document.getElementById('vet-directory-content');
    if (!container) return;

    var dir = loadVetDirectory();
    var entries = dir.entries || [];
    var searchQ = (document.getElementById('vet-search')?.value || '').toLowerCase().trim();

    if (searchQ) {
      entries = entries.filter(function (e) {
        return (e.name || '').toLowerCase().includes(searchQ) || (e.clinic || '').toLowerCase().includes(searchQ);
      });
    }

    // Calculate distances if geolocation active
    if (uiState.geoSortActive && uiState.userLat != null) {
      entries.forEach(function (e) {
        if (e.lat != null && e.lng != null) {
          e._distance = haversineDistance(uiState.userLat, uiState.userLng, e.lat, e.lng);
        } else {
          e._distance = null;
        }
      });
    }

    // Sort: favorites first, then emergency, then by distance (if geo active), then name
    entries.sort(function (a, b) {
      if (a.favorite !== b.favorite) return b.favorite ? 1 : -1;
      if (a.emergency !== b.emergency) return b.emergency ? 1 : -1;
      if (uiState.geoSortActive) {
        var da = a._distance != null ? a._distance : 999999;
        var db = b._distance != null ? b._distance : 999999;
        if (da !== db) return da - db;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    var emergencyEntries = entries.filter(function (e) { return e.emergency; });
    var normalEntries = entries.filter(function (e) { return !e.emergency; });

    var html = '';

    // Emergency section
    if (emergencyEntries.length > 0) {
      html += '<div class="vet-emergency-section"><h3>🚨 Urgences</h3><div class="vet-cards">';
      emergencyEntries.forEach(function (e) {
        html += renderVetCard(e, dir);
      });
      html += '</div></div>';
    }

    // Normal contacts
    html += '<div class="vet-contacts-section"><div class="vet-cards">';
    if (normalEntries.length === 0 && emergencyEntries.length === 0 && !searchQ) {
      html += '<p class="empty-state">Aucun contact enregistré</p>';
    } else {
      normalEntries.forEach(function (e) {
        html += renderVetCard(e, dir);
      });
    }
    html += '</div></div>';

    container.innerHTML = html;

    // Bind events
    container.querySelectorAll('[data-vet-fav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-vet-fav'), 10);
        var entry = dir.entries.find(function (e) { return e.id === id; });
        if (entry) { entry.favorite = !entry.favorite; saveVetDirectory(dir); renderVetDirectory(); }
      });
    });
    container.querySelectorAll('[data-vet-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editVetContactId = parseInt(btn.getAttribute('data-vet-edit'), 10);
        openModal('editVetContact');
      });
    });
    container.querySelectorAll('[data-vet-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Supprimer ce contact ?')) return;
        var id = parseInt(btn.getAttribute('data-vet-delete'), 10);
        dir.entries = dir.entries.filter(function (e) { return e.id !== id; });
        saveVetDirectory(dir); renderVetDirectory();
        showToast('Contact supprimé', 'success');
      });
    });
  }

  function renderVetCard(e) {
    var distHtml = (e._distance != null) ? '<div class="vet-card-distance">📍 ' + e._distance.toFixed(1) + ' km</div>' : '';
    return '<div class="vet-card' + (e.emergency ? ' vet-card-emergency' : '') + '">' +
      '<div class="vet-card-header">' +
        '<div class="vet-card-name">' + (e.emergency ? '🚨 ' : '') + escapeHtml(e.name) + '</div>' +
        '<button type="button" class="vet-fav-btn" data-vet-fav="' + e.id + '">' + (e.favorite ? '⭐' : '☆') + '</button>' +
      '</div>' +
      (e.clinic ? '<div class="vet-card-clinic">' + escapeHtml(e.clinic) + '</div>' : '') +
      distHtml +
      (e.phone ? '<div class="vet-card-phone"><a href="tel:' + escapeHtml(e.phone) + '">📞 ' + escapeHtml(e.phone) + '</a></div>' : '') +
      (e.email ? '<div class="vet-card-email">' + escapeHtml(e.email) + '</div>' : '') +
      (e.address ? '<div class="vet-card-address">📍 ' + escapeHtml(e.address) + '</div>' : '') +
      (e.hours ? '<div class="vet-card-hours">🕐 ' + escapeHtml(e.hours) + '</div>' : '') +
      (e.notes ? '<div class="vet-card-notes table-muted">' + escapeHtml(e.notes) + '</div>' : '') +
      '<div class="vet-card-actions">' +
        '<button type="button" class="btn-edit" data-vet-edit="' + e.id + '">Modifier</button> ' +
        '<button type="button" class="btn-delete" data-vet-delete="' + e.id + '">✕</button>' +
      '</div></div>';
  }

  function addVetContact() {
    var name = document.getElementById('vc-name').value.trim();
    if (!name) { showToast('Nom requis.', 'error'); return; }
    var dir = loadVetDirectory();

    var latVal = parseFloat(document.getElementById('vc-lat').value);
    var lngVal = parseFloat(document.getElementById('vc-lng').value);
    dir.entries.push({
      id: dir.nextId++, name: name,
      clinic: document.getElementById('vc-clinic').value.trim(),
      phone: document.getElementById('vc-phone').value.trim(),
      email: document.getElementById('vc-email').value.trim(),
      address: document.getElementById('vc-address').value.trim(),
      lat: isNaN(latVal) ? null : latVal,
      lng: isNaN(lngVal) ? null : lngVal,
      hours: document.getElementById('vc-hours').value.trim(),
      emergency: document.getElementById('vc-emergency').checked,
      favorite: false,
      notes: document.getElementById('vc-notes').value.trim()
    });
    saveVetDirectory(dir);
    closeModal('addVetContact');
    renderVetDirectory();
    showToast('Contact ajouté', 'success');
  }

  function updateVetContact() {
    var dir = loadVetDirectory();
    var id = uiState.editVetContactId;
    var entry = dir.entries.find(function (e) { return e.id === id; });
    if (!entry) return;

    var name = document.getElementById('evc-name').value.trim();
    if (!name) { showToast('Nom requis.', 'error'); return; }

    var eLatVal = parseFloat(document.getElementById('evc-lat').value);
    var eLngVal = parseFloat(document.getElementById('evc-lng').value);
    entry.name = name;
    entry.clinic = document.getElementById('evc-clinic').value.trim();
    entry.phone = document.getElementById('evc-phone').value.trim();
    entry.email = document.getElementById('evc-email').value.trim();
    entry.address = document.getElementById('evc-address').value.trim();
    entry.lat = isNaN(eLatVal) ? null : eLatVal;
    entry.lng = isNaN(eLngVal) ? null : eLngVal;
    entry.hours = document.getElementById('evc-hours').value.trim();
    entry.emergency = document.getElementById('evc-emergency').checked;
    entry.notes = document.getElementById('evc-notes').value.trim();

    saveVetDirectory(dir);
    closeModal('editVetContact');
    uiState.editVetContactId = null;
    renderVetDirectory();
    showToast('Contact modifié', 'success');
  }

  // ——— Community (events & tips) ————————————————————————————

  function loadCommunity() {
    try {
      var raw = localStorage.getItem(COMMUNITY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { userTips: [], nextTipId: 100 };
  }

  function saveCommunity(data) {
    try { localStorage.setItem(COMMUNITY_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function showCommunity(panel) {
    var viewHome = document.getElementById('view-home');
    var viewDetail = document.getElementById('view-detail');
    var viewCommunity = document.getElementById('view-community');
    viewHome.hidden = true;
    viewDetail.hidden = true;
    viewCommunity.hidden = false;
    viewCommunity.classList.remove('view-enter');
    void viewCommunity.offsetWidth;
    viewCommunity.classList.add('view-enter');
    document.getElementById('animal-select').style.display = 'none';
    document.getElementById('btn-accueil').hidden = true;
    document.getElementById('fab-container').hidden = true;

    document.getElementById('community-events').hidden = (panel !== 'events');
    document.getElementById('community-tips').hidden = (panel !== 'tips');

    if (panel === 'events') renderCommunityEvents();
    if (panel === 'tips') renderCommunityTips();
  }

  function renderCommunityEvents() {
    var container = document.getElementById('community-events-list');
    var reminderBox = document.getElementById('community-next-reminder');
    if (!container) return;

    var today = new Date();
    var currentMonth = today.getMonth() + 1;
    var currentDay = today.getDate();

    var events = DEFAULT_DOG_EVENTS.slice().sort(function (a, b) {
      // Sort by upcoming: current month first, then future months, then past
      var aMonthDiff = (a.month - currentMonth + 12) % 12;
      var bMonthDiff = (b.month - currentMonth + 12) % 12;
      if (aMonthDiff !== bMonthDiff) return aMonthDiff - bMonthDiff;
      return a.day - b.day;
    });

    var monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    // Upcoming events this month
    var thisMonthEvents = events.filter(function (e) { return e.month === currentMonth; });
    var nextMonthEvents = events.filter(function (e) { return e.month === ((currentMonth % 12) + 1); });

    if (reminderBox) {
      if (thisMonthEvents.length > 0) {
        reminderBox.innerHTML = '<strong>🔔 Ce mois-ci :</strong> ' + thisMonthEvents.map(function (e) { return escapeHtml(e.title) + ' (' + e.day + ' ' + monthNames[e.month] + ')'; }).join(', ');
        reminderBox.hidden = false;
      } else if (nextMonthEvents.length > 0) {
        reminderBox.innerHTML = '<strong>🔔 Le mois prochain :</strong> ' + nextMonthEvents.map(function (e) { return escapeHtml(e.title) + ' (' + e.day + ' ' + monthNames[e.month] + ')'; }).join(', ');
        reminderBox.hidden = false;
      } else {
        reminderBox.hidden = true;
      }
    }

    var html = '<div class="community-events-grid">';
    events.forEach(function (ev) {
      var isThisMonth = ev.month === currentMonth;
      var isPast = ev.month < currentMonth || (ev.month === currentMonth && ev.day < currentDay);
      html += '<div class="community-event-card' + (isThisMonth ? ' community-event-upcoming' : '') + (isPast && !isThisMonth ? ' community-event-past' : '') + '">' +
        '<div class="community-event-date"><span class="community-event-day">' + ev.day + '</span><span class="community-event-month">' + monthNames[ev.month] + '</span></div>' +
        '<div class="community-event-info"><div class="community-event-title">' + escapeHtml(ev.title) + '</div>' +
        '<div class="community-event-desc">' + escapeHtml(ev.description) + '</div></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function renderCommunityTips() {
    var container = document.getElementById('community-tips-list');
    if (!container) return;

    var community = loadCommunity();
    var categoryFilter = (document.getElementById('tips-category-filter')?.value || 'all');
    var allTips = DEFAULT_TIPS.concat((community.userTips || []).map(function (t) { return Object.assign({}, t, { userAdded: true }); }));

    if (categoryFilter !== 'all') {
      allTips = allTips.filter(function (t) { return t.category === categoryFilter; });
    }

    var categoryLabels = { sante: 'Santé', alimentation: 'Alimentation', education: 'Éducation', hygiene: 'Hygiène', comportement: 'Comportement' };

    var html = '<div class="community-tips-grid">';
    if (allTips.length === 0) {
      html += '<p class="empty-state">Aucune astuce dans cette catégorie.</p>';
    }
    allTips.forEach(function (tip) {
      html += '<div class="community-tip-card">' +
        '<div class="community-tip-header">' +
          '<span class="community-tip-badge community-tip-badge-' + tip.category + '">' + escapeHtml(categoryLabels[tip.category] || tip.category) + '</span>' +
          '<span class="community-tip-author">' + escapeHtml(tip.author || 'Utilisateur') + '</span>' +
        '</div>' +
        '<div class="community-tip-title">' + escapeHtml(tip.title) + '</div>' +
        '<div class="community-tip-content">' + escapeHtml(tip.content) + '</div>' +
        (tip.userAdded ? '<button type="button" class="btn-delete community-tip-delete" data-tip-id="' + tip.id + '">✕ Supprimer</button>' : '') +
        '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    // Bind delete buttons
    container.querySelectorAll('.community-tip-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-tip-id'), 10);
        var c = loadCommunity();
        c.userTips = (c.userTips || []).filter(function (t) { return t.id !== id; });
        saveCommunity(c);
        renderCommunityTips();
        showToast('Astuce supprimée', 'success');
      });
    });
  }

  function addCommunityTip() {
    var title = document.getElementById('tip-title').value.trim();
    var content = document.getElementById('tip-content').value.trim();
    var category = document.getElementById('tip-category').value;
    if (!title || !content) { showToast('Titre et contenu requis.', 'error'); return; }

    var community = loadCommunity();
    community.userTips = community.userTips || [];
    community.userTips.push({ id: community.nextTipId++, title: title, content: content, category: category, author: 'Moi', date: new Date().toISOString().slice(0, 10) });
    saveCommunity(community);
    closeModal('addTip');
    renderCommunityTips();
    showToast('Astuce ajoutée !', 'success');
  }

  // ——— Geolocation (Vet Directory) ————————————————————————————

  function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  var GEO_SEARCH_RADIUS = 10000; // 10 km in meters

  function geolocateUser() {
    var statusEl = document.getElementById('geo-status');
    if (!navigator.geolocation) {
      showToast('Géolocalisation non disponible sur ce navigateur.', 'error');
      return;
    }
    if (statusEl) statusEl.textContent = 'Localisation en cours...';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        uiState.userLat = pos.coords.latitude;
        uiState.userLng = pos.coords.longitude;
        uiState.geoSortActive = true;
        if (statusEl) statusEl.textContent = 'Position trouvée ✓';
        renderVetDirectory();
        searchNearbyVets(pos.coords.latitude, pos.coords.longitude);
      },
      function (err) {
        if (statusEl) statusEl.textContent = 'Erreur : ' + err.message;
        showToast('Impossible d\'obtenir la position.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function searchNearbyVets(lat, lng) {
    var statusEl = document.getElementById('geo-status');
    var resultsContainer = document.getElementById('vet-nearby-results');
    var listEl = document.getElementById('vet-nearby-list');
    var radiusInfo = document.getElementById('geo-radius-info');
    if (!listEl || !resultsContainer) return;

    if (statusEl) statusEl.textContent = 'Recherche des cliniques...';
    if (radiusInfo) radiusInfo.textContent = '(rayon ' + (GEO_SEARCH_RADIUS / 1000) + ' km)';
    resultsContainer.hidden = false;
    listEl.innerHTML = '<p class="table-muted">Recherche en cours...</p>';

    var query = '[out:json][timeout:15];(' +
      'node["amenity"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
      'way["amenity"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
      'node["healthcare"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
      'way["healthcare"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
    ');out center body;';

    var overpassUrl = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    fetch(overpassUrl)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var elements = (data.elements || []).map(function (el) {
        var elLat = el.lat || (el.center && el.center.lat);
        var elLng = el.lon || (el.center && el.center.lon);
        var tags = el.tags || {};
        return {
          name: tags.name || tags['name:fr'] || tags['name:en'] || tags['name:mg'] || 'Clinique vétérinaire',
          phone: tags.phone || tags['contact:phone'] || '',
          address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ') || '',
          website: tags.website || tags['contact:website'] || '',
          hours: tags.opening_hours || '',
          lat: elLat,
          lng: elLng,
          distance: (elLat && elLng) ? haversineDistance(lat, lng, elLat, elLng) : null
        };
      });

      // Remove duplicates by name+address
      var seen = {};
      elements = elements.filter(function (e) {
        var key = (e.name + '|' + e.address).toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      // Sort by distance
      elements.sort(function (a, b) {
        return (a.distance || 999) - (b.distance || 999);
      });

      if (elements.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Aucune clinique vétérinaire trouvée dans un rayon de ' + (GEO_SEARCH_RADIUS / 1000) + ' km.</p>';
        if (statusEl) statusEl.textContent = '0 résultat';
        return;
      }

      if (statusEl) statusEl.textContent = elements.length + ' clinique(s) trouvée(s)';

      var html = '<div class="vet-cards">';
      elements.forEach(function (e, idx) {
        html += '<div class="vet-card vet-card-nearby">' +
          '<div class="vet-card-header"><div class="vet-card-name">' + escapeHtml(e.name) + '</div></div>' +
          (e.distance != null ? '<div class="vet-card-distance">📍 ' + e.distance.toFixed(1) + ' km</div>' : '') +
          (e.phone ? '<div class="vet-card-phone"><a href="tel:' + escapeHtml(e.phone) + '">📞 ' + escapeHtml(e.phone) + '</a></div>' : '') +
          (e.address ? '<div class="vet-card-address">📍 ' + escapeHtml(e.address) + '</div>' : '') +
          (e.hours ? '<div class="vet-card-hours">🕐 ' + escapeHtml(e.hours) + '</div>' : '') +
          (e.website ? '<div class="vet-card-website"><a href="' + escapeHtml(e.website) + '" target="_blank" rel="noopener">🌐 Site web</a></div>' : '') +
          '<div class="vet-card-actions">' +
            '<button type="button" class="btn-icon vet-add-to-dir" data-nearby-idx="' + idx + '">+ Ajouter à mon annuaire</button>' +
          '</div></div>';
      });
      html += '</div>';
      listEl.innerHTML = html;

      // Bind "add to directory" buttons
      listEl.querySelectorAll('.vet-add-to-dir').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-nearby-idx'), 10);
          var e = elements[idx];
          if (!e) return;
          var dir = loadVetDirectory();
          dir.entries.push({
            id: dir.nextId++,
            name: e.name,
            clinic: e.name,
            phone: e.phone,
            email: '',
            address: e.address,
            lat: e.lat || null,
            lng: e.lng || null,
            hours: e.hours,
            emergency: false,
            favorite: false,
            notes: 'Ajouté via recherche GPS'
          });
          saveVetDirectory(dir);
          renderVetDirectory();
          btn.textContent = '✓ Ajouté';
          btn.disabled = true;
          showToast(e.name + ' ajouté à l\'annuaire', 'success');
        });
      });
    })
    .catch(function (err) {
      console.warn('VetBook: Overpass search failed', err);
      listEl.innerHTML = '<p class="empty-state">Erreur lors de la recherche. Vérifiez votre connexion internet.</p>';
      if (statusEl) statusEl.textContent = 'Erreur de recherche';
      showToast('Recherche échouée : ' + err.message, 'error');
    });
  }

  function fillCurrentPosition(latId, lngId) {
    if (!navigator.geolocation) {
      showToast('Géolocalisation non disponible.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var latEl = document.getElementById(latId);
        var lngEl = document.getElementById(lngId);
        if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
        if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
        showToast('Position GPS récupérée', 'success');
      },
      function () { showToast('Impossible d\'obtenir la position.', 'error'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ——— LOF/LOMAD Verification ————————————————————————————

  function validateRegistryNumber(registry, number) {
    if (!number || !registry) return { valid: false, message: 'Numéro non renseigné' };
    number = number.trim();
    if (registry === 'LOF') {
      if (LOF_PATTERN.test(number)) return { valid: true, message: 'Format LOF valide ✓ (simulation)' };
      return { valid: false, message: 'Format LOF invalide. Attendu : ex. 123 456/12345' };
    }
    if (registry === 'LOMAD') {
      if (LOMAD_PATTERN.test(number)) return { valid: true, message: 'Format LOMAD valide ✓ (simulation)' };
      return { valid: false, message: 'Format LOMAD invalide. Attendu : 6 à 15 chiffres' };
    }
    return { valid: false, message: 'Registre non reconnu pour la vérification' };
  }

  function simulateVerification() {
    var registry = document.getElementById('ped-registry').value;
    var number = document.getElementById('ped-reg-number').value;
    var resultEl = document.getElementById('lof-verify-result');
    if (!resultEl) return;

    var result = validateRegistryNumber(registry, number);
    resultEl.innerHTML = '<span class="lof-badge ' + (result.valid ? 'lof-badge-valid' : 'lof-badge-invalid') + '">' +
      (result.valid ? '✅' : '❌') + ' ' + escapeHtml(result.message) + '</span>';
  }

  function toggleLofVerifyControls() {
    var registry = document.getElementById('ped-registry').value;
    var isLofLomad = (registry === 'LOF' || registry === 'LOMAD');
    var verifyGroup = document.getElementById('lof-verify-group');
    var disclaimer = document.getElementById('lof-disclaimer');
    if (verifyGroup) verifyGroup.hidden = !isLofLomad;
    if (disclaimer) disclaimer.hidden = !isLofLomad;
    var resultEl = document.getElementById('lof-verify-result');
    if (resultEl) resultEl.innerHTML = '';
  }

  // ——— Alerts & notifications ————————————————————————————
  function renderAlerts() {
    var data = getCurrent();
    var cont = document.getElementById('upcoming-alerts');
    var notifList = document.getElementById('notif-list');
    if (!data || !cont) return;

    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var rangeDays = parseInt(document.getElementById('alerts-range')?.value || '60', 10);
    var from = new Date(todayMid); from.setDate(from.getDate() - 30);
    var to = new Date(todayMid); to.setDate(to.getDate() + rangeDays);

    var events = []
      .concat((data.vaccines || []).filter(function (v) { return v.next; }).map(function (v) {
        return { type: 'vaccin', date: v.next, icon: '💉', title: 'Vaccin : ' + escapeHtml(v.name || ''), sub: v.vet ? 'Vétérinaire : ' + escapeHtml(v.vet) : '—' };
      }))
      .concat((data.dewormings || []).filter(function (d) { return d.next; }).map(function (d) {
        return { type: 'deworming', date: d.next, icon: '💊', title: 'Déparasitage : ' + escapeHtml(d.name || ''), sub: 'Type : ' + escapeHtml(d.type || '') };
      }))
      .concat((data.hygiene || []).filter(function (h) { return h.next; }).map(function (h) {
        return { type: 'hygiene', date: h.next, icon: '🧼', title: 'Hygiène : ' + escapeHtml(h.type || ''), sub: h.notes ? escapeHtml(h.notes) : '—' };
      }));

    // Heat cycle prediction
    if (data.animal.sex === 'Femelle' && data.animal.sterilise !== 'Oui') {
      var hcSorted = (data.heatCycles || []).slice().sort(function (a, b) { return new Date(a.startDate) - new Date(b.startDate); });
      if (hcSorted.length > 0) {
        var hcAvg = 180;
        if (hcSorted.length >= 2) {
          var hcGaps = [];
          for (var gi = 1; gi < hcSorted.length; gi++) {
            var gDiff = Math.round((new Date(hcSorted[gi].startDate) - new Date(hcSorted[gi - 1].startDate)) / 864e5);
            if (gDiff > 0) hcGaps.push(gDiff);
          }
          if (hcGaps.length > 0) hcAvg = Math.round(hcGaps.reduce(function (a, b) { return a + b; }, 0) / hcGaps.length);
        }
        var nextHeat = addDaysISO(hcSorted[hcSorted.length - 1].startDate, hcAvg);
        events.push({ type: 'heat', date: nextHeat, icon: '🌡️', title: 'Chaleurs prévues', sub: 'Cycle moyen : ' + hcAvg + ' jours' });
      }
    }

    var upcoming = events.map(function (e) {
      var dt = isoToLocalDate(e.date);
      if (!dt) return null;
      var diffDays = Math.round((dt - todayMid) / 864e5);
      return Object.assign({}, e, { dt: dt, diffDays: diffDays, dayKey: e.date, cls: diffDays < 0 ? 'j-overdue' : (diffDays <= 7 ? 'j-soon' : 'j-ok') });
    }).filter(Boolean).filter(function (e) { return e.dt >= from && e.dt <= to; }).sort(function (a, b) { return a.dt - b.dt; });

    if (upcoming.length === 0) {
      cont.innerHTML = '<p class="empty-state">Aucun rappel dans la période.</p>';
    } else {
      var groups = {};
      upcoming.forEach(function (e) { if (!groups[e.dayKey]) groups[e.dayKey] = []; groups[e.dayKey].push(e); });
      var dayKeys = Object.keys(groups).sort();

      cont.innerHTML = dayKeys.map(function (dayKey) {
        var dayEvents = groups[dayKey];
        var diffs = dayEvents.map(function (x) { return x.diffDays; });
        var dayClass = diffs.some(function (d) { return d < 0; }) ? 'j-overdue' : (diffs.some(function (d) { return d <= 7; }) ? 'j-soon' : 'j-ok');
        var minDiff = Math.min.apply(null, diffs);
        var headingTxt = minDiff < 0 ? 'Retard ' + Math.abs(minDiff) + ' j' : (minDiff === 0 ? "Aujourd'hui" : 'J-' + minDiff);

        var evHtml = dayEvents.map(function (e) {
          var counterTxt = e.diffDays < 0 ? 'Retard ' + Math.abs(e.diffDays) + ' j' : (e.diffDays === 0 ? "Aujourd'hui" : 'J-' + e.diffDays);
          return '<div class="agenda-event"><div class="agenda-event-left"><span class="agenda-event-icon">' + e.icon + '</span><div><div class="agenda-event-title">' + e.title + '</div><div class="agenda-event-sub">' + e.sub + '</div></div></div><div class="j-counter ' + e.cls + '">' + counterTxt + '</div></div>';
        }).join('');

        return '<div class="agenda-day"><div class="agenda-day-heading"><div><div class="agenda-day-date">' + fmtDate(dayKey) + '</div><div class="agenda-day-sub">' + dayEvents.length + ' rappel(s)</div></div><div class="j-counter ' + dayClass + '">' + headingTxt + '</div></div><div class="agenda-events">' + evHtml + '</div></div>';
      }).join('');
    }

    var n = data.notifications;
    var animalName = escapeHtml(data.animal.name || "l'animal");
    notifList.innerHTML = [
      { key: 'vaccineReminder', label: 'Rappels vaccins', desc: '30 jours avant la date de rappel' },
      { key: 'dewormingReminder', label: 'Rappels déparasitage', desc: '7 jours avant la date de rappel' },
      { key: 'hygieneReminder', label: 'Rappels hygiène', desc: '7 jours avant la date de rappel' },
      { key: 'birthdayReminder', label: 'Anniversaire de ' + animalName, desc: data.animal.dob ? 'Le ' + fmtDate(data.animal.dob) + ' chaque année' : 'Date de naissance à renseigner' },
      { key: 'monthlySummary', label: 'Résumé mensuel', desc: 'Récapitulatif de santé chaque mois' }
    ].map(function (item) {
      var isOn = n[item.key];
      return '<div class="notif-row"><div><div class="notif-label">' + item.label + '</div><div class="notif-desc">' + item.desc + '</div></div><button type="button" class="toggle' + (isOn ? ' on' : '') + '" data-notif="' + item.key + '" aria-pressed="' + isOn + '"></button></div>';
    }).join('');

    notifList.querySelectorAll('.toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = this.getAttribute('data-notif');
        data.notifications[key] = !data.notifications[key];
        this.classList.toggle('on', data.notifications[key]);
        this.setAttribute('aria-pressed', data.notifications[key]);
        // Request notification permission when enabling
        if (data.notifications[key] && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        saveState();
      });
    });
  }

  // ——— Browser Notifications ————————————————————————————
  function checkBrowserNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var lastCheck = localStorage.getItem(NOTIF_CHECK_KEY);
    var todayStr = todayISO();
    if (lastCheck === todayStr) return;
    localStorage.setItem(NOTIF_CHECK_KEY, todayStr);

    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    state.animals.forEach(function (data) {
      var n = data.notifications || {};

      if (n.vaccineReminder) {
        data.vaccines.forEach(function (v) {
          if (!v.next) return;
          var dt = isoToLocalDate(v.next);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff < 0) {
            new Notification('VetBook — Vaccin en retard', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(v.name) + ' (' + Math.abs(diff) + 'j de retard)', icon: 'icons/icon-192.png' });
          } else if (diff <= 7) {
            new Notification('VetBook — Rappel vaccin', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(v.name) + ' dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.dewormingReminder) {
        data.dewormings.forEach(function (d) {
          if (!d.next) return;
          var dt = isoToLocalDate(d.next);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff >= 0 && diff <= 7) {
            new Notification('VetBook — Rappel déparasitage', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(d.name) + ' dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.hygieneReminder) {
        (data.hygiene || []).forEach(function (h) {
          if (!h.next) return;
          var dt = isoToLocalDate(h.next);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff >= 0 && diff <= 7) {
            new Notification('VetBook — Rappel hygiène', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(h.type) + ' dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.birthdayReminder && data.animal.dob) {
        var dob = isoToLocalDate(data.animal.dob);
        if (dob && today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
          new Notification('VetBook — Anniversaire !', { body: 'Joyeux anniversaire ' + escapeHtml(data.animal.name) + ' !', icon: 'icons/icon-192.png' });
        }
      }
    });
  }

  // ——— Calendar view ————————————————————————————————————
  function renderCalendar() {
    var data = getCurrent();
    var grid = document.getElementById('calendar-grid');
    var titleEl = document.getElementById('cal-month-title');
    var detailEl = document.getElementById('calendar-day-detail');
    if (!data || !grid) return;

    var year = uiState.calendarYear;
    var month = uiState.calendarMonth;
    var monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    titleEl.textContent = monthNames[month] + ' ' + year;
    if (detailEl) detailEl.hidden = true;

    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);
    var startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
    var daysInMonth = lastDay.getDate();

    // Collect events for this month
    var eventsMap = {};
    function addEvent(isoDate, type) {
      if (!isoDate) return;
      var dt = isoToLocalDate(isoDate);
      if (!dt || dt.getFullYear() !== year || dt.getMonth() !== month) return;
      var day = dt.getDate();
      if (!eventsMap[day]) eventsMap[day] = [];
      eventsMap[day].push(type);
    }

    data.vaccines.forEach(function (v) { addEvent(v.next, 'vaccine'); addEvent(v.date, 'vaccine'); });
    data.dewormings.forEach(function (d) { addEvent(d.next, 'deworming'); addEvent(d.date, 'deworming'); });
    if (Array.isArray(data.consultations)) data.consultations.forEach(function (c) { addEvent(c.date, 'consult'); });
    (data.hygiene || []).forEach(function (h) { addEvent(h.next, 'hygiene'); addEvent(h.date, 'hygiene'); });
    (data.activities || []).forEach(function (a) { addEvent(a.date, 'activity'); });
    // Heat cycles: mark start/end dates
    if (data.animal.sex === 'Femelle' && data.animal.sterilise !== 'Oui') {
      (data.heatCycles || []).forEach(function (c) { addEvent(c.startDate, 'heat'); if (c.endDate) addEvent(c.endDate, 'heat'); });
    }

    // Birthday
    if (data.animal.dob) {
      var dob = isoToLocalDate(data.animal.dob);
      if (dob && dob.getMonth() === month) {
        var day = dob.getDate();
        if (!eventsMap[day]) eventsMap[day] = [];
        eventsMap[day].push('birthday');
      }
    }

    var dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    var html = dayNames.map(function (d) { return '<div class="cal-header">' + d + '</div>'; }).join('');

    var todayObj = new Date();
    var isCurrentMonth = todayObj.getFullYear() === year && todayObj.getMonth() === month;
    var todayDate = todayObj.getDate();

    // Empty cells before first day
    for (var i = 0; i < startDow; i++) {
      html += '<div class="cal-day cal-other"></div>';
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var isToday = isCurrentMonth && d === todayDate;
      var dayEvents = eventsMap[d] || [];
      var dotsHtml = '';
      if (dayEvents.length) {
        var unique = [];
        dayEvents.forEach(function (t) { if (unique.indexOf(t) === -1) unique.push(t); });
        dotsHtml = '<div class="cal-dots">' + unique.map(function (t) { return '<span class="cal-event-dot cal-dot-' + t + '"></span>'; }).join('') + '</div>';
      }
      html += '<div class="cal-day' + (isToday ? ' cal-today' : '') + '" data-cal-day="' + d + '">' + d + dotsHtml + '</div>';
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.cal-day[data-cal-day]').forEach(function (el) {
      el.addEventListener('click', function () {
        var day = parseInt(el.getAttribute('data-cal-day'), 10);
        showCalendarDayDetail(data, year, month, day);
      });
    });
  }

  function showCalendarDayDetail(data, year, month, day) {
    var detailEl = document.getElementById('calendar-day-detail');
    if (!detailEl) return;

    var isoDate = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    var events = [];

    data.vaccines.forEach(function (v) {
      if (v.date === isoDate) events.push({ icon: '💉', text: 'Vaccin : ' + escapeHtml(v.name) });
      if (v.next === isoDate) events.push({ icon: '💉', text: 'Rappel vaccin : ' + escapeHtml(v.name) });
    });
    data.dewormings.forEach(function (d) {
      if (d.date === isoDate) events.push({ icon: '💊', text: 'Déparasitage : ' + escapeHtml(d.name) });
      if (d.next === isoDate) events.push({ icon: '💊', text: 'Rappel déparasitage : ' + escapeHtml(d.name) });
    });
    if (Array.isArray(data.consultations)) {
      data.consultations.forEach(function (c) {
        if (c.date === isoDate) events.push({ icon: '🩺', text: 'Consultation : ' + escapeHtml(c.reason) });
      });
    }
    (data.hygiene || []).forEach(function (h) {
      if (h.date === isoDate) events.push({ icon: '🧼', text: 'Hygiène : ' + escapeHtml(h.type) });
      if (h.next === isoDate) events.push({ icon: '🧼', text: 'Rappel hygiène : ' + escapeHtml(h.type) });
    });
    (data.activities || []).forEach(function (a) {
      if (a.date === isoDate) events.push({ icon: '🏃', text: 'Activité : ' + escapeHtml(a.type) + (a.duration ? ' (' + a.duration + ' min)' : '') });
    });
    if (data.animal.sex === 'Femelle' && data.animal.sterilise !== 'Oui') {
      (data.heatCycles || []).forEach(function (c) {
        if (c.startDate === isoDate) events.push({ icon: '🌡️', text: 'Début chaleurs' });
        if (c.endDate === isoDate) events.push({ icon: '🌡️', text: 'Fin chaleurs' });
      });
    }
    if (data.animal.dob) {
      var dob = isoToLocalDate(data.animal.dob);
      if (dob && dob.getMonth() === month && dob.getDate() === day) {
        events.push({ icon: '🎂', text: 'Anniversaire de ' + escapeHtml(data.animal.name || '') });
      }
    }

    if (events.length === 0) {
      detailEl.hidden = true;
      return;
    }

    detailEl.hidden = false;
    detailEl.innerHTML = '<h3>' + fmtDate(isoDate) + '</h3>' +
      events.map(function (e) { return '<div class="cal-detail-item"><span>' + e.icon + '</span> ' + e.text + '</div>'; }).join('');
  }

  // ——— History ——————————————————————————————————————
  function renderWeightEvolution(data) {
    var container = document.getElementById('weight-evolution');
    if (!container) return;
    if (!data || !data.animal) { container.innerHTML = ''; return; }

    var entriesRaw = Array.isArray(data.animal.weightHistory) ? data.animal.weightHistory : [];
    var entries = entriesRaw.filter(function (e) { return e && e.date && e.weight != null && !isNaN(Number(e.weight)); })
      .slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    if (entries.length === 0) { container.innerHTML = ''; return; }

    var weights = entries.map(function (e) { return Number(e.weight); });
    var minW = Math.min.apply(null, weights);
    var maxW = Math.max.apply(null, weights);
    if (minW === maxW) { minW -= 0.5; maxW += 0.5; }

    var range = maxW - minW;
    var W = 360, H = 130, padL = 36, padR = 12, padT = 14, padB = 24;

    var xFor = function (i, n) {
      if (n === 1) return W / 2;
      return padL + ((W - padL - padR) * i) / (n - 1);
    };
    var yFor = function (w) { return padT + (1 - (w - minW) / range) * (H - padT - padB); };

    var n = entries.length;

    // Area fill
    var areaPoints = entries.map(function (e, i) {
      return xFor(i, n).toFixed(2) + ',' + yFor(Number(e.weight)).toFixed(2);
    });
    var areaPath = 'M' + xFor(0, n).toFixed(2) + ',' + (H - padB) + ' L' + areaPoints.join(' L') + ' L' + xFor(n - 1, n).toFixed(2) + ',' + (H - padB) + ' Z';

    var points = entries.map(function (e, i) {
      return xFor(i, n).toFixed(2) + ',' + yFor(Number(e.weight)).toFixed(2);
    }).join(' ');

    var circles = entries.map(function (e, i) {
      var x = xFor(i, n), y = yFor(Number(e.weight));
      return '<circle cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" r="4" fill="var(--teal)" stroke="var(--card-bg)" stroke-width="2" data-tooltip="' + fmtDate(e.date) + ' — ' + Number(e.weight).toFixed(1) + ' kg"></circle>';
    }).join('');

    // Grid lines
    var gridLines = '';
    var steps = 4;
    for (var i = 0; i <= steps; i++) {
      var wVal = minW + (range * i / steps);
      var yVal = yFor(wVal);
      gridLines += '<line x1="' + padL + '" y1="' + yVal.toFixed(2) + '" x2="' + (W - padR) + '" y2="' + yVal.toFixed(2) + '" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4 4"/>';
      gridLines += '<text x="' + (padL - 4) + '" y="' + (yVal + 4).toFixed(2) + '" fill="var(--text-muted)" font-size="9" text-anchor="end">' + wVal.toFixed(1) + '</text>';
    }

    var first = Number(entries[0].weight);
    var last = Number(entries[entries.length - 1].weight);
    var delta = last - first;
    var deltaTxt = (delta >= 0 ? '+' : '') + delta.toFixed(1).replace(/\.0$/, '') + ' kg';
    var lastTxt = last.toFixed(1).replace(/\.0$/, '');

    // Trend
    var trendHtml = '';
    if (entries.length > 2) {
      trendHtml = ' · Tendance : ' + (delta > 0 ? '📈 hausse' : (delta < 0 ? '📉 baisse' : '→ stable'));
    }

    var listEntries = entries.slice(-6).reverse();
    var list = listEntries.map(function (e) {
      var wTxt = Number(e.weight).toFixed(1).replace(/\.0$/, '');
      return '<div class="weight-evolution-item" data-weight-entry-id="' + e.id + '"><div class="left">' + fmtDate(e.date) + '</div><div class="right-wrap"><div class="right">' + wTxt + ' kg</div><div class="weight-actions"><button type="button" class="btn-edit" data-action="edit-weight" data-weight-entry-id="' + e.id + '">Modifier</button> <button type="button" class="btn-delete" data-action="delete-weight" data-weight-entry-id="' + e.id + '">✕</button></div></div></div>';
    }).join('');

    container.innerHTML =
      '<div style="position:relative">' +
      '<svg class="weight-evolution-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      gridLines +
      '<path d="' + areaPath + '" fill="var(--teal)" opacity="0.1"/>' +
      '<polyline fill="none" stroke="var(--teal-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="' + points + '"/>' +
      circles +
      '</svg></div>' +
      '<div class="weight-evolution-meta">Dernière: ' + lastTxt + ' kg · Variation: ' + deltaTxt + trendHtml + '</div>' +
      '<div class="weight-evolution-list">' + list + '</div>';

    container.querySelectorAll('[data-action="edit-weight"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editWeightEntryId = parseInt(btn.getAttribute('data-weight-entry-id'), 10);
        openModal('editWeight');
      });
    });
    container.querySelectorAll('[data-action="delete-weight"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteWeightEntry(parseInt(btn.getAttribute('data-weight-entry-id'), 10));
      });
    });

    // SVG tooltips
    container.querySelectorAll('circle[data-tooltip]').forEach(function (circle) {
      circle.style.cursor = 'pointer';
      circle.addEventListener('mouseenter', function (e) {
        var tooltip = document.createElement('div');
        tooltip.className = 'weight-tooltip';
        tooltip.textContent = circle.getAttribute('data-tooltip');
        tooltip.style.left = e.pageX + 'px';
        tooltip.style.top = (e.pageY - 30) + 'px';
        tooltip.id = 'weight-tip';
        document.body.appendChild(tooltip);
      });
      circle.addEventListener('mouseleave', function () {
        var tip = document.getElementById('weight-tip');
        if (tip) tip.remove();
      });
    });
  }

  function renderHistory() {
    var data = getCurrent();
    var timeline = document.getElementById('history-timeline');
    if (!data || !timeline) return;

    var historyType = document.getElementById('history-type-filter')?.value || 'all';
    var weightContainer = document.getElementById('weight-evolution');
    if (weightContainer) weightContainer.hidden = !(historyType === 'all' || historyType === 'weight');
    if (weightContainer && !weightContainer.hidden) renderWeightEvolution(data);

    var all = []
      .concat((historyType === 'all' || historyType === 'vaccins') ? data.vaccines.map(function (v) {
        return { date: v.date, title: escapeHtml(v.name), sub: 'Vaccin · ' + escapeHtml(v.vet || ''), icon: '💉' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'deworming') ? data.dewormings.map(function (d) {
        return { date: d.date, title: escapeHtml(d.name), sub: 'Déparasitage ' + escapeHtml(d.type), icon: '💊' };
      }) : [])
      .concat(((historyType === 'all' || historyType === 'weight') && data.animal && Array.isArray(data.animal.weightHistory)) ? data.animal.weightHistory.map(function (w) {
        return { date: w.date, title: (w.weight != null ? w.weight : '') + ' kg', sub: 'Pesée', icon: '⚖️' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'consultations') ? (Array.isArray(data.consultations) ? data.consultations : []).map(function (c) {
        return { date: c.date, title: escapeHtml(c.reason || ''), sub: 'Consultation · ' + escapeHtml(c.vet || ''), icon: '🩺' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'journal') ? (Array.isArray(data.notes) ? data.notes : []).map(function (n) {
        return { date: n.date, title: escapeHtml(n.title || ''), sub: 'Note · ' + escapeHtml(n.category || ''), icon: '📝' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'hygiene') ? (data.hygiene || []).map(function (h) {
        return { date: h.date, title: escapeHtml(h.type || ''), sub: 'Hygiène', icon: '🧼' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'activities') ? (data.activities || []).map(function (a) {
        return { date: a.date, title: escapeHtml(a.type || ''), sub: 'Activité' + (a.duration ? ' · ' + a.duration + ' min' : ''), icon: '🏃' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'nutrition') ? (data.nutrition && data.nutrition.meals || []).map(function (m) {
        return { date: m.date, title: escapeHtml(m.type || '') + (m.food ? ' — ' + escapeHtml(m.food) : ''), sub: 'Repas', icon: '🍽️' };
      }) : [])
      .concat((historyType === 'all' || historyType === 'chaleurs') ? (data.heatCycles || []).map(function (c) {
        return { date: c.startDate, title: 'Chaleurs — ' + escapeHtml(c.intensity || ''), sub: 'Reproduction', icon: '🌡️' };
      }) : [])
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    timeline.innerHTML = all.map(function (e, idx) {
      var rel = relativeDate(e.date);
      var relHtml = rel ? '<span class="timeline-relative">' + escapeHtml(rel) + '</span>' : '';
      return '<div class="timeline-item" style="animation-delay:' + (idx * 0.03) + 's"><div class="timeline-dot"></div><div class="timeline-date">' + fmtDate(e.date) + relHtml + '</div><div class="timeline-content"><div class="timeline-title">' + e.icon + ' ' + e.title + '</div><div class="timeline-sub">' + e.sub + '</div></div></div>';
    }).join('');
  }

  // ——— Tabs ————————————————————————————————————————
  function switchTab(tabName) {
    document.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); s.hidden = true; });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });

    var section = document.getElementById('section-' + tabName);
    var tab = document.querySelector('.tab[data-tab="' + tabName + '"]');
    if (section) { section.classList.add('active'); section.hidden = false; }
    if (tab) { tab.classList.add('active'); tab.setAttribute('aria-selected', 'true'); tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }

    if (tabName === 'vaccins') renderVaccines();
    if (tabName === 'deworming') renderDewormings();
    if (tabName === 'hygiene') renderHygiene();
    if (tabName === 'alertes') renderAlerts();
    if (tabName === 'historique') renderHistory();
    if (tabName === 'photos') renderGallery();
    if (tabName === 'consultations') renderConsultations();
    if (tabName === 'medications') renderMedications();
    if (tabName === 'nutrition') renderNutrition();
    if (tabName === 'activites') renderActivities();
    if (tabName === 'chaleurs') renderHeatCycles();
    if (tabName === 'journal') renderJournal();
    if (tabName === 'checkup') renderCheckup();
    if (tabName === 'calendrier') renderCalendar();
    if (tabName === 'annuaire') renderVetDirectory();

    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function refreshAll() {
    renderProfile();
    renderAnimalSelect();
    renderVaccines();
    renderDewormings();
    renderHygiene();
    renderAlerts();
    renderHistory();
    renderGallery();
    renderConsultations();
    renderMedications();
    renderNutrition();
    renderActivities();
    renderHeatCycles();
    renderJournal();
    renderCalendar();
    renderPedigree();
    renderVetDirectory();
  }

  // ——— Print / Share ————————————————————————————————————
  function printAnimalRecord() {
    // Show all sections for print
    document.querySelectorAll('.section').forEach(function (s) { s.hidden = false; s.classList.add('active'); });
    window.print();
    // Restore after print
    setTimeout(function () {
      var activeTab = document.querySelector('.tab.active');
      var tabName = activeTab ? activeTab.getAttribute('data-tab') : 'profil';
      switchTab(tabName);
    }, 500);
  }

  function shareRecord() {
    var data = getCurrent();
    if (!data) return;
    var animalName = data.animal.name || 'Animal';

    if (navigator.share) {
      var summary = animalName + '\n' +
        'Espèce: ' + (data.animal.species || '—') + '\n' +
        'Race: ' + (data.animal.race || '—') + '\n' +
        'Vaccins: ' + data.vaccines.length + '\n' +
        'Déparasitages: ' + data.dewormings.length;
      navigator.share({
        title: 'Carnet de santé — ' + animalName,
        text: summary
      }).catch(function () {});
    } else {
      // Fallback: copy summary to clipboard
      var text = animalName + ' — ' + data.vaccines.length + ' vaccins, ' + data.dewormings.length + ' déparasitages';
      navigator.clipboard.writeText(text).then(function () {
        showToast('Résumé copié dans le presse-papiers', 'info');
      }).catch(function () {
        showToast('Partage non disponible', 'warning');
      });
    }
  }

  // ——— Dark mode ————————————————————————————————————————
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = saved ? saved === 'dark' : prefersDark;
    applyTheme(dark);
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = dark ? '🌙' : '☀️';
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current !== 'dark');
  }

  // ——— FAB ——————————————————————————————————————————
  function setupFAB() {
    var fabBtn = document.getElementById('fab-btn');
    var fabMenu = document.getElementById('fab-menu');
    if (!fabBtn || !fabMenu) return;

    fabBtn.addEventListener('click', function () {
      var isOpen = !fabMenu.hidden;
      fabMenu.hidden = isOpen;
      fabBtn.classList.toggle('fab-open', !isOpen);
    });

    fabMenu.querySelectorAll('.fab-action').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-fab');
        fabMenu.hidden = true;
        fabBtn.classList.remove('fab-open');
        if (action === 'vaccin') openModal('addVaccin');
        if (action === 'deworming') openModal('addDeworming');
        if (action === 'hygiene') openModal('addHygiene');
        if (action === 'photo') triggerPhotoUpload();
        if (action === 'weight') openModal('addWeight');
        if (action === 'consult') openModal('addConsult');
        if (action === 'meal') openModal('addMeal');
        if (action === 'activity') openModal('addActivity');
        if (action === 'note') openModal('addNote');
      });
    });

    // Close FAB on outside click
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.fab-container') && !fabMenu.hidden) {
        fabMenu.hidden = true;
        fabBtn.classList.remove('fab-open');
      }
    });
  }

  // ——— Quick date buttons ————————————————————————————————
  function setupQuickDateButtons() {
    document.querySelectorAll('.quick-date-btns').forEach(function (container) {
      var targetId = container.getAttribute('data-target');
      var sourceId = container.getAttribute('data-source');
      container.querySelectorAll('.btn-quick-date').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var days = parseInt(btn.getAttribute('data-days'), 10);
          var sourceEl = document.getElementById(sourceId);
          var targetEl = document.getElementById(targetId);
          if (!targetEl) return;
          if (days === 0) {
            targetEl.value = todayISO();
          } else {
            var base = (sourceEl && sourceEl.value) || todayISO();
            targetEl.value = addDaysISO(base, days);
          }
        });
      });
    });
  }

  // ——— Sortable table headers ————————————————————————————
  function setupSortableHeaders() {
    document.querySelectorAll('.sortable-th').forEach(function (th) {
      th.addEventListener('click', function () {
        var section = th.closest('.section');
        if (!section) return;
        var key = th.getAttribute('data-sort-key');
        var sortSelect;
        if (section.id === 'section-vaccins') sortSelect = document.getElementById('vaccine-sort');
        if (section.id === 'section-deworming') sortSelect = document.getElementById('deworming-sort');
        if (!sortSelect) return;

        var current = sortSelect.value;
        if (key === 'date') {
          sortSelect.value = current === 'dateDesc' ? 'dateAsc' : 'dateDesc';
        } else if (key === 'next') {
          sortSelect.value = current === 'nextAsc' ? 'nextDesc' : 'nextAsc';
        }
        sortSelect.dispatchEvent(new Event('change'));
      });
    });
  }

  // ——— Swipe on table rows (mobile) ————————————————————
  function setupSwipe() {
    // Simplified touch swipe for mobile
    var startX = 0;
    var threshold = 60;

    document.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      var endX = e.changedTouches[0].clientX;
      var diff = startX - endX;
      if (Math.abs(diff) < threshold) return;
      var row = e.target.closest('tr');
      if (!row || !row.closest('tbody')) return;

      var actions = row.querySelector('.swipe-actions');
      if (!actions) {
        // Create swipe actions
        var editBtn = row.querySelector('.btn-edit');
        var deleteBtn = row.querySelector('.btn-delete');
        if (!editBtn && !deleteBtn) return;

        var swipeDiv = document.createElement('div');
        swipeDiv.className = 'swipe-actions';
        if (editBtn) {
          var sb = document.createElement('button');
          sb.className = 'swipe-btn swipe-btn-edit';
          sb.textContent = 'Modifier';
          sb.addEventListener('click', function () { editBtn.click(); swipeDiv.classList.remove('visible'); });
          swipeDiv.appendChild(sb);
        }
        if (deleteBtn) {
          var db = document.createElement('button');
          db.className = 'swipe-btn swipe-btn-delete';
          db.textContent = 'Supprimer';
          db.addEventListener('click', function () { deleteBtn.click(); swipeDiv.classList.remove('visible'); });
          swipeDiv.appendChild(db);
        }
        row.style.position = 'relative';
        row.style.overflow = 'hidden';
        row.appendChild(swipeDiv);
        actions = swipeDiv;
      }

      if (diff > threshold) {
        // Swipe left -> show
        actions.classList.add('visible');
      } else {
        // Swipe right -> hide
        actions.classList.remove('visible');
      }
    }, { passive: true });
  }

  // ——— Onboarding ————————————————————————————————————
  function showOnboarding() {
    openModal('onboarding');

    document.getElementById('onboarding-next-1').addEventListener('click', function () {
      document.getElementById('onboarding-step-1').hidden = true;
      document.getElementById('onboarding-step-2').hidden = false;
    });

    document.getElementById('onboarding-back-2').addEventListener('click', function () {
      document.getElementById('onboarding-step-2').hidden = true;
      document.getElementById('onboarding-step-1').hidden = false;
    });

    document.getElementById('form-onboarding-animal').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('ob-name').value.trim();
      if (!name) return;

      var newAnimal = JSON.parse(JSON.stringify(DEFAULT_ANIMAL));
      newAnimal.id = state.nextId++;
      newAnimal.animal.name = name;
      newAnimal.animal.species = document.getElementById('ob-species').value || 'Canine';
      newAnimal.animal.dob = document.getElementById('ob-dob').value || '';

      state.animals.push(newAnimal);
      state.currentAnimalId = newAnimal.id;
      saveState();

      document.getElementById('onboarding-step-2').hidden = true;
      document.getElementById('onboarding-step-3').hidden = false;
    });

    document.getElementById('onboarding-skip').addEventListener('click', function () {
      finishOnboarding();
    });

    document.getElementById('onboarding-enable-notif').addEventListener('click', function () {
      if ('Notification' in window) {
        Notification.requestPermission();
      }
      finishOnboarding();
    });
  }

  function finishOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'done');
    closeModal('onboarding');
    showHome();
  }

  // ——— PWA ————————————————————————————————————————
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {
      if (reg.installing) console.log('VetBook: SW en cours d\'installation');
      else if (reg.waiting) console.log('VetBook: SW en attente');
      else if (reg.active) console.log('VetBook: SW actif');
    }).catch(function (err) { console.warn('VetBook: SW non enregistré', err); });
  }

  // ——— Export / Import ——————————————————————————————————
  function downloadText(filename, text, mimeType) {
    var blob = new Blob([text], { type: mimeType || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
  }

  async function exportBackupJson() {
    var exportState = { version: 2, nextId: state.nextId, currentAnimalId: state.currentAnimalId, animals: [] };

    for (var wrap of state.animals) {
      var a = wrap?.animal;
      var photos = Array.isArray(wrap.photos) ? wrap.photos : [];
      var exportedPhotos = [];
      for (var p of photos) {
        var out = Object.assign({}, p);
        if (out && out.id != null) {
          try { out.src = await getPhotoDataUrl(out.id); } catch (err) { out.src = ''; }
        }
        exportedPhotos.push(out);
      }
      var avatar = a && typeof a.avatar === 'number' ? await getPhotoDataUrl(a.avatar).catch(function () { return ''; }) : a?.avatar;
      exportState.animals.push(Object.assign({}, wrap, { photos: exportedPhotos, animal: Object.assign({}, a, { avatar: avatar }) }));
    }

    // Include vet directory & community
    exportState.vetDirectory = loadVetDirectory();
    exportState.community = loadCommunity();

    downloadText('vetbook-backup.json', JSON.stringify(exportState), 'application/json');
    showToast('Sauvegarde téléchargée', 'success');
  }

  async function importBackupJson(file) {
    if (!file) return;
    var text = await file.text();
    var parsed = JSON.parse(text || '{}');
    if (!parsed || !Array.isArray(parsed.animals)) throw new Error('JSON invalide');

    state.animals = parsed.animals || [];
    state.nextId = parsed.nextId != null ? parsed.nextId : 20;
    state.currentAnimalId = parsed.currentAnimalId != null ? parsed.currentAnimalId : (state.animals[0]?.id ?? null);

    // Backward compat
    state.animals.forEach(function (a) {
      if (!a) return;
      if (!Array.isArray(a.consultations)) a.consultations = [];
      if (!Array.isArray(a.medications)) a.medications = [];
      if (!Array.isArray(a.notes)) a.notes = [];
      if (!Array.isArray(a.hygiene)) a.hygiene = [];
      if (!Array.isArray(a.heatCycles)) a.heatCycles = [];
      if (!Array.isArray(a.activities)) a.activities = [];
      if (!a.nutrition) a.nutrition = { meals: [], dailyPlan: {} };
      if (!a.pedigree) a.pedigree = {};
      if (a.animal && !a.animal.themeColor) a.animal.themeColor = '';
      if (!a.notifications) a.notifications = {};
      if (a.notifications.hygieneReminder === undefined) a.notifications.hygieneReminder = true;
    });

    // Restore vet directory & community if present
    if (parsed.vetDirectory) {
      saveVetDirectory(parsed.vetDirectory);
    }
    if (parsed.community) {
      saveCommunity(parsed.community);
    }

    try { await clearPhotoStore(); } catch (e) { console.warn('VetBook: clearPhotoStore échoué', e); }
    await migrateLegacyImagesToIndexedDB();
    saveState();
    closeModal('backup');
    showToast('Données importées', 'success');
    if (state.viewMode === 'home') showHome(); else showDetail();
    refreshAll();
  }

  // ——— ICS export ——————————————————————————————————————
  function escapeIcsText(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function formatIcsStampUTC() {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function icsDateFromISO(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '';
    var m = isoDate.split('-');
    if (m.length !== 3) return '';
    return m[0] + m[1] + m[2];
  }

  async function exportUpcomingRemindersIcs() {
    var wrap = getCurrent();
    if (!wrap) throw new Error('Aucun animal');

    var rangeDays = parseInt(document.getElementById('alerts-range')?.value || '60', 10);
    var today = new Date();
    var from = new Date(today); from.setDate(from.getDate() - 30);
    var to = new Date(today); to.setDate(to.getDate() + rangeDays);

    var events = [];
    (wrap.vaccines || []).forEach(function (v) {
      if (!v.next) return;
      var dt = isoToLocalDate(v.next);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-vaccine-' + v.id, summary: 'Vaccin : ' + (v.name || ''), desc: v.vet ? 'Vétérinaire : ' + v.vet : '', isoDate: v.next });
    });
    (wrap.dewormings || []).forEach(function (d) {
      if (!d.next) return;
      var dt = isoToLocalDate(d.next);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-deworm-' + d.id, summary: 'Déparasitage : ' + (d.name || ''), desc: 'Type : ' + (d.type || ''), isoDate: d.next });
    });

    (wrap.hygiene || []).forEach(function (h) {
      if (!h.next) return;
      var dt = isoToLocalDate(h.next);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-hygiene-' + h.id, summary: 'Hygiène : ' + (h.type || ''), desc: h.notes || '', isoDate: h.next });
    });

    var dob = wrap?.animal?.dob;
    if (wrap?.notifications?.birthdayReminder && dob) {
      var dobParts = dob.split('-');
      if (dobParts.length === 3) {
        var month = parseInt(dobParts[1], 10);
        var day = parseInt(dobParts[2], 10);
        for (var y = from.getFullYear() - 1; y <= to.getFullYear() + 1; y++) {
          var dt = new Date(y, month - 1, day);
          if (dt < from || dt > to) continue;
          events.push({ uid: 'vetbook-birthday-' + y, summary: 'Anniversaire de ' + (wrap.animal.name || "l'animal"), desc: '', isoDate: y + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') });
        }
      }
    }

    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VetBook//FR', 'CALSCALE:GREGORIAN'];
    var stamp = formatIcsStampUTC();
    events.forEach(function (e) {
      var dt = icsDateFromISO(e.isoDate);
      if (!dt) return;
      lines.push('BEGIN:VEVENT', 'UID:' + e.uid, 'DTSTAMP:' + stamp, 'SUMMARY:' + escapeIcsText(e.summary));
      if (e.desc) lines.push('DESCRIPTION:' + escapeIcsText(e.desc));
      lines.push('DTSTART;VALUE=DATE:' + dt, 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    downloadText('vetbook-rappels.ics', lines.join('\r\n'), 'text/calendar');
    showToast('Calendrier exporté', 'success');
  }

  // ——— Init ————————————————————————————————————————————
  async function init() {
    initTheme();
    var hasData = loadState();

    try {
      await openPhotoDb();
      await migrateLegacyImagesToIndexedDB();
    } catch (e) { console.warn('VetBook: IndexedDB indisponible', e); }

    // Onboarding
    if (!hasData && !localStorage.getItem(ONBOARDING_KEY)) {
      showOnboarding();
    } else {
      if (!hasData) {
        // No onboarding but no data either — create default empty
        var def = JSON.parse(JSON.stringify(DEFAULT_ANIMAL));
        def.id = state.nextId++;
        state.animals = [def];
        state.currentAnimalId = def.id;
        saveState();
      }
      showHome();
    }

    registerSW();

    // Check browser notifications
    checkBrowserNotifications();

    // Bindings
    document.getElementById('logo-home').addEventListener('click', function (e) { e.preventDefault(); showHome(); });
    document.getElementById('btn-accueil').addEventListener('click', showHome);
    var btnAddHome = document.getElementById('btn-add-animal-home');
    if (btnAddHome) btnAddHome.addEventListener('click', function () { openModal('addAnimal'); });
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(this.getAttribute('data-tab')); });
    });

    document.getElementById('animal-select').addEventListener('change', onAnimalSelectChange);
    document.getElementById('btn-add-animal').addEventListener('click', function () { openModal('addAnimal'); });
    document.getElementById('btn-backup').addEventListener('click', function () { openModal('backup'); });
    document.getElementById('btn-add-photo').addEventListener('click', triggerPhotoUpload);

    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
    document.getElementById('btn-avatar-upload').addEventListener('click', function () { document.getElementById('avatar-input').click(); });
    document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);

    // Profile buttons
    document.getElementById('btn-delete-animal').addEventListener('click', function () {
      var data = getCurrent();
      if (data) deleteAnimal(data.id);
    });
    document.getElementById('btn-print-record').addEventListener('click', printAnimalRecord);
    document.getElementById('btn-share-record').addEventListener('click', shareRecord);

    var birthdayDismiss = document.getElementById('birthday-dismiss');
    if (birthdayDismiss) birthdayDismiss.addEventListener('click', function () {
      document.getElementById('birthday-banner').hidden = true;
    });

    // Forms
    document.getElementById('form-edit-animal').addEventListener('submit', function (e) { e.preventDefault(); saveAnimal(); });
    document.getElementById('form-edit-owner').addEventListener('submit', function (e) { e.preventDefault(); saveOwner(); });

    var formEditVaccin = document.getElementById('form-edit-vaccin');
    if (formEditVaccin) formEditVaccin.addEventListener('submit', function (e) { e.preventDefault(); updateVaccineEntry(); });
    var formEditDeworming = document.getElementById('form-edit-deworming');
    if (formEditDeworming) formEditDeworming.addEventListener('submit', function (e) { e.preventDefault(); updateDewormingEntry(); });
    var formEditWeight = document.getElementById('form-edit-weight');
    if (formEditWeight) formEditWeight.addEventListener('submit', function (e) { e.preventDefault(); updateWeightEntry(); });

    document.getElementById('form-add-vaccin').addEventListener('submit', function (e) { e.preventDefault(); addVaccine(); });
    document.getElementById('form-add-deworming').addEventListener('submit', function (e) { e.preventDefault(); addDeworming(); });
    document.getElementById('form-add-animal').addEventListener('submit', function (e) { e.preventDefault(); addAnimal(); });

    var formAddWeight = document.getElementById('form-add-weight');
    if (formAddWeight) formAddWeight.addEventListener('submit', function (e) { e.preventDefault(); addWeightEntry(); });

    document.getElementById('form-add-consult').addEventListener('submit', function (e) { e.preventDefault(); addConsultation(); });
    document.getElementById('form-edit-consult').addEventListener('submit', function (e) { e.preventDefault(); updateConsultation(); });
    document.getElementById('form-add-medication').addEventListener('submit', function (e) { e.preventDefault(); addMedication(); });
    document.getElementById('form-edit-medication').addEventListener('submit', function (e) { e.preventDefault(); updateMedication(); });
    document.getElementById('form-add-note').addEventListener('submit', function (e) { e.preventDefault(); addNote(); });
    document.getElementById('form-edit-note').addEventListener('submit', function (e) { e.preventDefault(); updateNote(); });
    document.getElementById('form-edit-caption').addEventListener('submit', function (e) { e.preventDefault(); saveCaption(); });

    // New feature forms
    document.getElementById('form-add-hygiene').addEventListener('submit', function (e) { e.preventDefault(); addHygiene(); });
    document.getElementById('form-edit-hygiene').addEventListener('submit', function (e) { e.preventDefault(); updateHygieneEntry(); });
    document.getElementById('form-add-heat-cycle').addEventListener('submit', function (e) { e.preventDefault(); addHeatCycle(); });
    document.getElementById('form-edit-heat-cycle').addEventListener('submit', function (e) { e.preventDefault(); updateHeatCycleEntry(); });
    document.getElementById('form-add-activity').addEventListener('submit', function (e) { e.preventDefault(); addActivity(); });
    document.getElementById('form-edit-activity').addEventListener('submit', function (e) { e.preventDefault(); updateActivityEntry(); });
    document.getElementById('form-add-meal').addEventListener('submit', function (e) { e.preventDefault(); addMeal(); });
    document.getElementById('form-edit-meal').addEventListener('submit', function (e) { e.preventDefault(); updateMealEntry(); });
    document.getElementById('form-edit-nutrition-plan').addEventListener('submit', function (e) { e.preventDefault(); saveNutritionPlan(); });
    document.getElementById('form-edit-pedigree').addEventListener('submit', function (e) { e.preventDefault(); savePedigree(); });
    document.getElementById('form-add-vet-contact').addEventListener('submit', function (e) { e.preventDefault(); addVetContact(); });
    document.getElementById('form-edit-vet-contact').addEventListener('submit', function (e) { e.preventDefault(); updateVetContact(); });
    document.getElementById('form-add-tip').addEventListener('submit', function (e) { e.preventDefault(); addCommunityTip(); });

    // Filters & sorts
    ['vaccine-search', 'vaccine-status-filter', 'vaccine-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { renderVaccines(); });
      el.addEventListener('change', function () { renderVaccines(); });
    });

    ['deworming-search', 'deworming-status-filter', 'deworming-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { renderDewormings(); });
      el.addEventListener('change', function () { renderDewormings(); });
    });

    ['hygiene-search', 'hygiene-status-filter', 'hygiene-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { renderHygiene(); });
      el.addEventListener('change', function () { renderHygiene(); });
    });

    var vetSearch = document.getElementById('vet-search');
    if (vetSearch) vetSearch.addEventListener('input', function () { renderVetDirectory(); });

    var consultSearch = document.getElementById('consult-search');
    if (consultSearch) {
      consultSearch.addEventListener('input', function () { renderConsultations(); });
    }

    var journalFilter = document.getElementById('journal-cat-filter');
    if (journalFilter) journalFilter.addEventListener('change', renderJournal);

    var alertsRange = document.getElementById('alerts-range');
    if (alertsRange) alertsRange.addEventListener('change', renderAlerts);

    var historyFilter = document.getElementById('history-type-filter');
    if (historyFilter) historyFilter.addEventListener('change', renderHistory);

    // Calendar nav
    var calPrev = document.getElementById('cal-prev');
    var calNext = document.getElementById('cal-next');
    if (calPrev) calPrev.addEventListener('click', function () {
      uiState.calendarMonth--;
      if (uiState.calendarMonth < 0) { uiState.calendarMonth = 11; uiState.calendarYear--; }
      renderCalendar();
    });
    if (calNext) calNext.addEventListener('click', function () {
      uiState.calendarMonth++;
      if (uiState.calendarMonth > 11) { uiState.calendarMonth = 0; uiState.calendarYear++; }
      renderCalendar();
    });

    var btnExportIcs = document.getElementById('btn-export-ics');
    if (btnExportIcs) btnExportIcs.addEventListener('click', function () {
      exportUpcomingRemindersIcs().catch(function (err) {
        console.warn('VetBook: export ICS échoué', err);
        showToast('Erreur export calendrier.', 'error');
      });
    });

    var btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) btnExportJson.addEventListener('click', function () {
      exportBackupJson().catch(function (err) {
        console.warn('VetBook: export JSON échoué', err);
        showToast('Erreur export JSON.', 'error');
      });
    });

    var pickBackupFileBtn = document.getElementById('btn-pick-backup-file');
    var backupImportFile = document.getElementById('backup-import-file');
    var backupFileName = document.getElementById('backup-file-name');
    var btnImportReplace = document.getElementById('btn-import-replace');

    if (pickBackupFileBtn && backupImportFile) {
      pickBackupFileBtn.addEventListener('click', function () { backupImportFile.click(); });
      backupImportFile.addEventListener('change', function () {
        if (backupFileName) backupFileName.textContent = (backupImportFile.files && backupImportFile.files[0]) ? backupImportFile.files[0].name : 'Aucun fichier sélectionné';
      });
    }

    if (btnImportReplace && backupImportFile) {
      btnImportReplace.addEventListener('click', function () {
        var file = backupImportFile.files && backupImportFile.files[0] ? backupImportFile.files[0] : null;
        if (!file) { showToast('Choisis un fichier JSON.', 'warning'); return; }
        importBackupJson(file).catch(function (err) {
          console.warn('VetBook: import JSON échoué', err);
          showToast("Erreur d'importation.", 'error');
        });
      });
    }

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(this.getAttribute('data-close')); });
    });

    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) {
          this.classList.remove('open');
          this.setAttribute('aria-hidden', 'true');
        }
      });
    });

    document.getElementById('lightbox').addEventListener('click', function (e) { if (e.target === this) closeLightbox(); });
    document.getElementById('lightbox-close').addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('open')) { closeLightbox(); return; }
      var openOverlay = document.querySelector('.modal-overlay.open');
      if (!openOverlay) return;
      var id = openOverlay.getAttribute('id') || '';
      if (!id.startsWith('modal-')) return;
      closeModal(id.slice('modal-'.length));
    });

    // Community buttons
    document.getElementById('btn-show-events').addEventListener('click', function () { showCommunity('events'); });
    document.getElementById('btn-show-tips').addEventListener('click', function () { showCommunity('tips'); });
    document.getElementById('btn-community-back').addEventListener('click', function () { showHome(); });
    document.getElementById('btn-add-tip').addEventListener('click', function () { openModal('addTip'); });
    document.getElementById('tips-category-filter').addEventListener('change', function () { renderCommunityTips(); });

    // Geolocation
    document.getElementById('btn-geolocate-vets').addEventListener('click', function () { geolocateUser(); });
    document.getElementById('btn-geocode-vc').addEventListener('click', function () { fillCurrentPosition('vc-lat', 'vc-lng'); });
    document.getElementById('btn-geocode-evc').addEventListener('click', function () { fillCurrentPosition('evc-lat', 'evc-lng'); });

    // LOF/LOMAD verify
    document.getElementById('btn-verify-lof').addEventListener('click', function () { simulateVerification(); });
    document.getElementById('ped-registry').addEventListener('change', function () { toggleLofVerifyControls(); });

    // Setup features
    setupFAB();
    setupQuickDateButtons();
    setupSortableHeaders();
    setupSwipe();
  }

  window.app = {
    openModal: openModal,
    closeModal: closeModal,
    switchTab: switchTab,
    showCommunity: showCommunity
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init().catch(console.error); });
  } else {
    init().catch(console.error);
  }
})();
